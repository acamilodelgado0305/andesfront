// src/components/EgresoDrawer.js

import React from 'react';
import { Drawer, Form, Button, Input, Select, DatePicker, Typography, Space, Row, Col, Dropdown, Menu } from 'antd';
import {
    EditOutlined,
    FileProtectOutlined,
    DownOutlined,
    FilePdfOutlined,
    CalendarOutlined,
    DollarCircleOutlined
} from '@ant-design/icons';
import { cuentaOptions } from '../options';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// --- FUNCIÓN PARA GENERAR EL COMPROBANTE DE EGRESO ---
const generarComprobantePDF = (values) => {
    const doc = new jsPDF();
    const fecha = dayjs(values.fecha).format('DD/MM/YYYY');

    doc.setFontSize(18);
    doc.text('Comprobante de Egreso', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 105, 28, { align: 'center' });
    doc.text(`Registrado por: ${values.vendedor || 'N/A'}`, 105, 34, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    doc.setFontSize(12);
    doc.text('Detalles del Egreso', 20, 50);
    doc.setFontSize(10);
    doc.text(`Cuenta de Origen: ${values.cuenta}`, 20, 58);
    doc.text('Descripción:', 20, 68);
    // Usamos splitTextToSize para manejar descripciones largas
    const descripcionLines = doc.splitTextToSize(values.descripcion, 170);
    doc.text(descripcionLines, 20, 74);
    
    const finalY = 74 + (descripcionLines.length * 5); // Calculamos la posición después de la descripción
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor: $${parseFloat(values.valor).toLocaleString('es-CO')}`, 105, finalY + 15, { align: 'center' });
    
    const fileName = `Comprobante_Egreso_${dayjs(values.fecha).format('YYYY-MM-DD')}.pdf`;
    doc.save(fileName);
    message.success('Comprobante generado en PDF.');
};


const EgresoDrawer = ({ open, onClose, onSubmit, loading, userName, initialValues }) => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        if (open) {
            if (initialValues) {
                form.setFieldsValue({
                    ...initialValues,
                    fecha: initialValues.fecha ? dayjs(initialValues.fecha) : null,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    vendedor: userName,
                    fecha: dayjs(), // Fecha actual por defecto al crear
                });
            }
        }
    }, [open, initialValues, form, userName]);

    const handleSave = async (generatePdf = false) => {
        try {
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : null,
            };
            
            await onSubmit(formattedValues);

            if (generatePdf && !loading) {
                generarComprobantePDF(formattedValues);
            }

        } catch (errorInfo) {
            console.log('Fallo la validación:', errorInfo);
            message.error('Por favor, completa todos los campos requeridos.');
        }
    };
    
    const menu = (
        <Menu onClick={() => handleSave(true)}>
            <Menu.Item key="1" icon={<FilePdfOutlined />}>
                Guardar y Generar Comprobante
            </Menu.Item>
        </Menu>
    );

    return (
        <Drawer
            title={
                <Space>
                    {initialValues ? <EditOutlined /> : <FileProtectOutlined />}
                    <Text strong>{initialValues ? 'Editar Egreso' : 'Registrar Nuevo Egreso'}</Text>
                </Space>
            }
            placement="right" width={520} onClose={onClose} open={open}
            bodyStyle={{ background: '#f5f5f5', padding: 0 }}
            headerStyle={{ borderBottom: '1px solid #f0f0f0' }}
            footer={
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onClose} style={{ marginRight: 8 }}>
                        Cancelar
                    </Button>
                    <Dropdown.Button
                        danger // Mantiene el estilo rojo para el botón de egreso
                        type="primary"
                        loading={loading}
                        onClick={() => handleSave(false)}
                        overlay={menu}
                        icon={<DownOutlined />}
                    >
                        {initialValues ? 'Guardar Cambios' : 'Guardar Egreso'}
                    </Dropdown.Button>
                </div>
            }
        >
            <Form form={form} layout="vertical">
                <div style={{ padding: '24px' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        
                        {/* --- PASO 1: DETALLES --- */}
                        <div className="form-section-card">
                            <Title level={5}><CalendarOutlined /> Paso 1: Detalla el Egreso</Title>
                            <Form.Item name="descripcion" label="Descripción del Egreso" rules={[{ required: true, message: 'La descripción es requerida' }]}>
                                <Input.TextArea placeholder="Ej: Pago de arriendo, compra de papelería..." rows={3} />
                            </Form.Item>
                            <Form.Item name="fecha" label="Fecha del Egreso" rules={[{ required: true, message: 'Seleccione la fecha' }]}>
                                <DatePicker format="DD / MMMM / YYYY" style={{ width: '100%' }} disabledDate={(current) => current && current > dayjs().endOf('day')} />
                            </Form.Item>
                        </div>

                        {/* --- PASO 2: MONTO --- */}
                        <div className="form-section-card">
                            <Title level={5}><DollarCircleOutlined /> Paso 2: Registra el Monto</Title>
                            <Row gutter={16} align="bottom">
                                <Col span={12}>
                                    <Form.Item name="valor" label="Valor del Egreso" rules={[{ required: true, message: 'Ingrese el valor' }]}>
                                        <Input type="number" size="large" placeholder="0" prefix="$" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="cuenta" label="Cuenta de Origen" rules={[{ required: true, message: 'Seleccione una cuenta' }]}>
                                        <Select placeholder="¿De dónde salió?" options={cuentaOptions} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>
                    
                    </Space>
                </div>
                <Form.Item name="vendedor" hidden><Input /></Form.Item>
            </Form>
        </Drawer>
    );
};

// Asegúrate de que este estilo esté disponible, ya sea aquí o en un archivo CSS global.
// No es necesario duplicarlo si ya lo tienes del IngresoDrawer.
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

export default EgresoDrawer;