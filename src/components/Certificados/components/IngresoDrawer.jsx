import React, { useState, useEffect } from 'react';
import { 
    Drawer, Form, Button, Input, Select, Typography, message, 
    Collapse, Row, Col, Statistic, Space, Dropdown, Menu 
} from 'antd';
import {
    FileDoneOutlined, UserOutlined, ShoppingOutlined, WalletOutlined,
    EditOutlined, DownOutlined, FilePdfOutlined, SaveOutlined
} from '@ant-design/icons';

import { cuentaOptions } from '../options';

// Importamos los servicios
import { createIngreso, updateIngreso } from '../../../services/controlapos/posService'; 
import { getInventario } from '../../../services/inventario/inventarioService'; 

const { Title, Text } = Typography;
const { Panel } = Collapse;

const tipoDocumentoOptions = [
    { value: 'C.C', label: 'C.C' },
    { value: 'T.I', label: 'T.I' },
    { value: 'Pasaporte', label: 'Pasaporte' },
    { value: 'C.E', label: 'C.E' },
    { value: 'PPT', label: 'PPT' },
];

const IngresoDrawer = ({ open, onClose, onSuccess, userName, initialValues }) => {
    const [form] = Form.useForm();
    const [inventario, setInventario] = useState([]);
    const [loadingInventario, setLoadingInventario] = useState(false);
    const [saving, setSaving] = useState(false);
    const [clientePanelActivo, setClientePanelActivo] = useState([]);
    
    // Observar el valor para mostrarlo en el Statistic
    const valorTotal = Form.useWatch('valor', form) || 0;

    // --- CARGAR INVENTARIO USANDO EL SERVICIO (Sin userId) ---
    useEffect(() => {
        const loadInventario = async () => {
            setLoadingInventario(true);
            try {
                // Ya no enviamos userId, el token se encarga en el backend
                const data = await getInventario();
                setInventario(data);
            } catch (error) {
                console.error("Error cargando inventario:", error);
                message.error("No se pudo cargar la lista de productos.");
            } finally {
                setLoadingInventario(false);
            }
        };

        if (open) {
            loadInventario();
            
            // Si es un registro nuevo, reseteamos el formulario
            if (!initialValues) {
                form.resetFields();
                form.setFieldsValue({ vendedor: userName, tipoDeDocumento: 'C.C', valor: 0 });
                setClientePanelActivo([]);
            }
        }
    }, [open, userName, form, initialValues]);

    // Cargar datos si es edición
    useEffect(() => {
        if (open && initialValues) {
            const tieneCliente = initialValues.nombre && initialValues.nombre !== 'Cliente';
            setClientePanelActivo(tieneCliente ? ['1'] : []);
            
            let tipoValue = initialValues.producto;
            // Manejo seguro para convertir string a array si es necesario
            if (typeof initialValues.producto === 'string' && initialValues.producto.includes(',')) {
                tipoValue = initialValues.producto.split(',').map(s => s.trim());
            } else if (typeof initialValues.producto === 'string') {
                 // Si es un solo producto en string, lo convertimos a array para el Select multiple
                 tipoValue = [initialValues.producto];
            }

            form.setFieldsValue({
                ...initialValues,
                tipo: tipoValue, 
                nombreCompleto: `${initialValues.nombre || ''} ${initialValues.apellido || ''}`.trim(),
                tipoDeDocumento: initialValues.tipoDeDocumento || 'C.C',
            });
        }
    }, [open, initialValues, form]);

    // Lógica para guardar (Crear o Editar)
    const handleSave = async (generatePdf = false) => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            let dataToSend = { ...values };
            const esVentaConCliente = clientePanelActivo.includes('1');

            if (esVentaConCliente) {
                const nombreCompleto = (values.nombreCompleto || '').trim();
                const partesNombre = nombreCompleto.split(' ').filter(p => p);
                
                if (partesNombre.length > 1) {
                    dataToSend.nombre = partesNombre.slice(0, -1).join(' '); 
                    dataToSend.apellido = partesNombre[partesNombre.length - 1]; 
                } else {
                    dataToSend.nombre = partesNombre[0] || 'Cliente';
                    dataToSend.apellido = '.'; 
                }
            } else {
                // Valores por defecto si no hay cliente específico
                dataToSend.nombre = 'Cliente';
                dataToSend.apellido = 'General';
                dataToSend.numeroDeDocumento = '0';
                dataToSend.tipoDeDocumento = 'N/A';
            }
            
            delete dataToSend.nombreCompleto;

            let response;
            if (initialValues && initialValues._id) {
                response = await updateIngreso(initialValues._id, dataToSend);
                message.success('Venta actualizada correctamente');
            } else {
                response = await createIngreso(dataToSend);
                message.success('Venta registrada exitosamente');
            }

            if (generatePdf) {
                message.info("Generando factura PDF...");
                // Aquí llamarías a tu función generarFacturaPDF(response || dataToSend);
            }

            if (onSuccess) onSuccess(); 
            onClose();

        } catch (error) {
            console.error(error);
            if (error.response?.data?.message) {
                message.error(`Error: ${error.response.data.message}`);
            } else if (!error.errorFields) { // Si no es error de validación del form
                message.error("Ocurrió un error inesperado.");
            }
        } finally {
            setSaving(false);
        }
    };

    // Cálculo automático del precio
    const handleValuesChange = (changedValues, allValues) => {
        if (changedValues.tipo !== undefined) {
            const selectedItems = Array.isArray(allValues.tipo) ? allValues.tipo : [allValues.tipo];
            
            const total = selectedItems.reduce((sum, itemName) => {
                const item = inventario.find(invItem => invItem.nombre === itemName);
                return sum + (item ? parseFloat(item.monto || 0) : 0);
            }, 0);
            
            form.setFieldsValue({ valor: total });
        }
    };
    
    // Mapeo para el Select de Ant Design
// Busca esta parte en tu código y reemplázala:

// Verificamos si inventario es un array antes de hacer map
const listaInventario = Array.isArray(inventario) ? inventario : [];

const inventarioOptions = listaInventario.map(item => ({
    label: `${item.nombre} - ($${parseFloat(item.monto || 0).toLocaleString('es-CO')})`,
    value: item.nombre,
}));
    
    const menu = (
        <Menu onClick={() => handleSave(true)}>
            <Menu.Item key="1" icon={<FilePdfOutlined />}>
                Guardar y Generar Factura
            </Menu.Item>
        </Menu>
    );

    return (
        <Drawer
            title={
                <Space>
                    {initialValues ? <EditOutlined /> : <FileDoneOutlined />}
                    <Text strong>{initialValues ? 'Editar Ingreso' : 'Registrar Nueva Venta'}</Text>
                </Space>
            }
            placement="right" 
            width={520} 
            onClose={onClose} 
            open={open}
            styles={{ body: { background: '#f5f5f5', padding: 0 } }}
            footer={
                <div style={{ textAlign: 'right', padding: '10px 0' }}>
                    <Button onClick={onClose} style={{ marginRight: 8 }} disabled={saving}>
                        Cancelar
                    </Button>
                    <Dropdown.Button 
                        type="primary" 
                        loading={saving} 
                        onClick={() => handleSave(false)} 
                        overlay={menu}
                        icon={<DownOutlined />}
                    >
                        <SaveOutlined /> {initialValues ? 'Actualizar' : 'Guardar Venta'}
                    </Dropdown.Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
                <div style={{ padding: '24px' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        
                        {/* SECCIÓN 1: PRODUCTOS */}
                        <div className="form-section-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                             <Title level={5}><ShoppingOutlined /> Paso 1: Selecciona los Productos</Title>
                             <Form.Item 
                                name="tipo" 
                                rules={[{ required: true, message: 'Seleccione al menos un producto' }]}
                             >
                                 <Select
                                     mode="multiple" 
                                     size="large"
                                     placeholder={loadingInventario ? "Cargando inventario..." : "Buscar productos..."}
                                     options={inventarioOptions} 
                                     loading={loadingInventario}
                                     disabled={loadingInventario} 
                                     showSearch
                                     filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                     style={{ width: '100%' }}
                                 />
                             </Form.Item>
                        </div>

                        {/* SECCIÓN 2: PAGO */}
                        <div className="form-section-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                             <Title level={5}><WalletOutlined /> Paso 2: Detalles del Pago</Title>
                             <Row gutter={16} align="middle">
                                <Col span={12}>
                                     <Form.Item 
                                        label="Cuenta de Destino" 
                                        name="cuenta" 
                                        rules={[{ required: true, message: 'Requerido' }]}
                                     >
                                         <Select size="large" placeholder="Ej: Nequi" options={cuentaOptions} />
                                     </Form.Item>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                     <Statistic 
                                        title="Total a Pagar" 
                                        value={valorTotal} 
                                        prefix="$" 
                                        groupSeparator="."
                                        precision={0} 
                                        valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                                     />
                                     <Form.Item name="valor" hidden><Input /></Form.Item>
                                </Col>
                             </Row>
                        </div>

                        {/* SECCIÓN 3: CLIENTE */}
                        <Collapse 
                            ghost 
                            activeKey={clientePanelActivo} 
                            onChange={(keys) => setClientePanelActivo(keys)}
                        >
                            <Panel header={<Title level={5} style={{ margin: 0 }}><UserOutlined /> Paso 3: Cliente (Opcional)</Title>} key="1">
                                <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
                                    <Form.Item 
                                        name="nombreCompleto" 
                                        label="Nombre del Cliente" 
                                        rules={[{ required: clientePanelActivo.includes('1'), message: 'Ingrese el nombre' }]}
                                    >
                                        <Input size="large" placeholder="Nombre y Apellido"/>
                                    </Form.Item>
                                    <Row gutter={12}>
                                        <Col span={8}>
                                            <Form.Item 
                                                name="tipoDeDocumento" 
                                                label="Tipo" 
                                                initialValue="C.C"
                                            >
                                                <Select size="large" options={tipoDocumentoOptions} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={16}>
                                            <Form.Item 
                                                name="numeroDeDocumento" 
                                                label="Documento" 
                                                rules={[{ required: clientePanelActivo.includes('1'), message: 'Falta el documento' }]}
                                            >
                                                <Input size="large" placeholder="Número de identidad" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="customer_email" label="Email (Opcional)">
                                        <Input size="large" placeholder="correo@ejemplo.com" />
                                    </Form.Item>
                                </div>
                            </Panel>
                        </Collapse>

                    </Space>
                </div>
                <Form.Item name="vendedor" hidden><Input /></Form.Item>
            </Form>
        </Drawer>
    );
};

export default IngresoDrawer;