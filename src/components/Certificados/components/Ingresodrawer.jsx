// src/components/IngresoDrawer.js

import React from 'react';
import { Drawer, Form, Button, Input, Select, Typography, message, Collapse, Row, Col, Statistic, Space, Dropdown, Menu } from 'antd';
import {
    FileDoneOutlined,
    UserOutlined,
    ShoppingOutlined,
    WalletOutlined,
    EditOutlined,
    DownOutlined,
    FilePdfOutlined
} from '@ant-design/icons';
import { cuentaOptions } from '../options';
import jsPDF from 'jspdf';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// (La función generarFacturaPDF no necesita cambios)
const generarFacturaPDF = (values) => {
    // ... tu función de generar PDF
};

const tipoDocumentoOptions = [
    { value: 'C.C', label: 'C.C' },
    { value: 'T.I', label: 'T.I' },
    { value: 'Pasaporte', label: 'Pasaporte' },
    { value: 'C.E', label: 'C.E' },
    { value: 'PPT', label: 'PPT' },
];

const IngresoDrawer = ({ open, onClose, onSubmit, loading, userName, initialValues }) => {
    const [form] = Form.useForm();
    const [inventario, setInventario] = React.useState([]);
    const [loadingInventario, setLoadingInventario] = React.useState(false);
    const [clientePanelActivo, setClientePanelActivo] = React.useState([]);
    
    const valorTotal = Form.useWatch('valor', form) || 0;

    React.useEffect(() => {
        // --- LÓGICA DE INVENTARIO REINTEGRADA ---
        const fetchUserInventario = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                message.error("No se pudo obtener el ID de usuario.");
                return;
            }
            setLoadingInventario(true);
            try {
                const apiUrl = `${import.meta.env.VITE_API_BACKEND}/inventario/user/${userId}`;
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    setInventario(data);
                } else {
                    const errorData = await response.json();
                    message.error(`Error al cargar productos: ${errorData.error || response.statusText}`);
                }
            } catch (err) {
                message.error("Error de conexión al cargar los productos.");
            } finally {
                setLoadingInventario(false);
            }
        };

        if (open) {
            form.resetFields();
            form.setFieldsValue({ vendedor: userName, tipoDeDocumento: 'C.C', valor: 0 });
            setClientePanelActivo([]);
            fetchUserInventario(); // Se llama a la función para cargar el inventario
        }
    }, [open, userName, form]);

    React.useEffect(() => {
        if (open && initialValues) {
            const tieneCliente = initialValues.nombre && initialValues.nombre !== 'Cliente';
            setClientePanelActivo(tieneCliente ? ['1'] : []);
            form.setFieldsValue({
                ...initialValues,
                nombreCompleto: `${initialValues.nombre || ''} ${initialValues.apellido || ''}`.trim(),
                tipoDeDocumento: initialValues.tipoDeDocumento || 'C.C',
            });
        }
    }, [open, initialValues, form]);

    // --- NUEVA FUNCIÓN CENTRALIZADA PARA GUARDAR ---
    const handleSave = async (generatePdf = false) => {
        try {
            const values = await form.validateFields();
            let dataToSend = { ...values };
            const esVentaConCliente = clientePanelActivo.includes('1');

            if (esVentaConCliente) {
                const nombreCompleto = (values.nombreCompleto || '').trim();
                const partesNombre = nombreCompleto.split(' ').filter(p => p);
                dataToSend.nombre = partesNombre.length > 0 ? partesNombre.shift() : '';
                dataToSend.apellido = partesNombre.length > 0 ? partesNombre.join(' ') : '.';
            } else {
                dataToSend = { ...dataToSend, nombre: 'Cliente', apellido: 'General', numeroDeDocumento: '0', tipoDeDocumento: 'N/A' };
            }
            delete dataToSend.nombreCompleto;
            
            await onSubmit(dataToSend); // Llama a la prop onSubmit del padre

            if (generatePdf && !loading) {
                generarFacturaPDF(dataToSend);
            }

        } catch (errorInfo) {
            console.log('Fallo la validación:', errorInfo);
            message.error('Por favor, completa todos los campos requeridos.');
        }
    };

    const handleValuesChange = (changedValues, allValues) => {
        if (changedValues.tipo !== undefined) {
            const total = allValues.tipo.reduce((sum, itemName) => {
                const item = inventario.find(invItem => invItem.nombre === itemName);
                return sum + (item ? parseFloat(item.monto) : 0);
            }, 0);
            form.setFieldsValue({ valor: total });
        }
    };
    
    const inventarioOptions = inventario.map(item => ({
        label: `${item.nombre} - ($${parseFloat(item.monto).toLocaleString('es-CO')})`,
        value: item.nombre,
    }));
    
    // --- MENÚ PARA EL BOTÓN DIVIDIDO ---
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
            placement="right" width={520} onClose={onClose} open={open}
            bodyStyle={{ background: '#f5f5f5', padding: 0 }}
            headerStyle={{ borderBottom: '1px solid #e8e8e8' }}
            footer={
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onClose} style={{ marginRight: 8 }}>Cancelar</Button>
                    {/* --- BOTÓN DIVIDIDO PROFESIONAL --- */}
                    <Dropdown.Button 
                        type="primary" 
                        loading={loading} 
                        onClick={() => handleSave(false)} // Acción principal
                        overlay={menu} // Acciones secundarias
                        icon={<DownOutlined />}
                    >
                        {initialValues ? 'Guardar Cambios' : 'Guardar Venta'}
                    </Dropdown.Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
                <div style={{ padding: '24px' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        
                        {/* PASO 1, 2 Y 3 (sin cambios en la estructura visual) */}
                        <div className="form-section-card">
                             <Title level={5}><ShoppingOutlined /> Paso 1: Selecciona los Productos</Title>
                             <Form.Item name="tipo" rules={[{ required: true, message: 'Seleccione al menos un producto' }]}>
                                 <Select
                                     mode="multiple" size="large"
                                     placeholder={loadingInventario ? "Cargando..." : "Buscar y seleccionar..."}
                                     options={inventarioOptions} loading={loadingInventario}
                                     disabled={loadingInventario} showSearch
                                     filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                 />
                             </Form.Item>
                        </div>
                        <div className="form-section-card">
                             <Title level={5}><WalletOutlined /> Paso 2: Registra el Pago</Title>
                             <Row align="middle" justify="space-between">
                                <Col>
                                     <Form.Item label="Cuenta de Destino" name="cuenta" rules={[{ required: true, message: 'Seleccione una cuenta' }]}>
                                         <Select size="large" placeholder="¿Dónde se recibió?" options={cuentaOptions} style={{width: 200}}/>
                                     </Form.Item>
                                </Col>
                                <Col>
                                      <Statistic title="VALOR TOTAL" value={valorTotal} prefix="$" precision={0} />
                                </Col>
                             </Row>
                        </div>
                        <Collapse ghost activeKey={clientePanelActivo} onChange={(keys) => setClientePanelActivo(keys)}>
                            <Panel header={<Title level={5}><UserOutlined /> Paso 3: Asignar a un Cliente (Opcional)</Title>} key="1">
                                <Space direction="vertical" style={{width: '100%'}}>
                                    <Form.Item name="nombreCompleto" label="Nombre Completo" rules={[{ required: clientePanelActivo.includes('1'), message: 'Ingrese el nombre' }]}>
                                        <Input size="large" placeholder="Ej: Valentina Restrepo"/>
                                    </Form.Item>
                                    <Row gutter={8}>
                                        <Col span={8}>
                                            <Form.Item name="tipoDeDocumento" label="Tipo Doc." rules={[{ required: clientePanelActivo.includes('1'), message: 'Requerido' }]}>
                                                <Select size="large" options={tipoDocumentoOptions} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={16}>
                                            <Form.Item name="numeroDeDocumento" label="Número de Documento" rules={[{ required: clientePanelActivo.includes('1'), message: 'Ingrese el documento' }]}>
                                                <Input size="large" placeholder="Ej: 1020304050" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Space>
                            </Panel>
                        </Collapse>

                    </Space>
                </div>
                <Form.Item name="vendedor" hidden><Input /></Form.Item>
                <Form.Item name="valor" hidden><Input /></Form.Item>
            </Form>
        </Drawer>
    );
};

const styles = `
.form-section-card {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 24px;
}
`;
const styleSheet = document.getElementById("custom-drawer-styles");
if (!styleSheet) {
    const newStyleSheet = document.createElement("style");
    newStyleSheet.id = "custom-drawer-styles";
    newStyleSheet.innerText = styles;
    document.head.appendChild(newStyleSheet);
}

export default IngresoDrawer;