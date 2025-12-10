import React, { useEffect, useState } from 'react';
import { 
    Drawer, Form, Button, Input, Select, DatePicker, Typography, 
    Space, Row, Col, Dropdown, Menu, message 
} from 'antd';
import {
    EditOutlined,
    FileProtectOutlined,
    DownOutlined,
    FilePdfOutlined,
    CalendarOutlined,
    DollarCircleOutlined,
    SaveOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import jsPDF from 'jspdf'; 

// Importa tus opciones
import { cuentaOptions } from '../options'; 

// IMPORTANTE: Importamos los servicios directamente aquí
import { createEgreso, updateEgreso } from '../../../services/controlapos/posService';

const { Title, Text } = Typography;

// --- FUNCIÓN GENERAR PDF (Igual que tenías) ---
const generarComprobantePDF = (values) => {
    const doc = new jsPDF();
    const fecha = dayjs(values.fecha).format('DD/MM/YYYY');
    doc.setFontSize(18);
    doc.text('Comprobante de Egreso', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 105, 28, { align: 'center' });
    doc.text(`Registrado por: ${values.vendedor || 'Usuario'}`, 105, 34, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);
    doc.setFontSize(12);
    doc.text('Detalles del Egreso', 20, 50);
    doc.setFontSize(10);
    doc.text(`Cuenta de Origen: ${values.cuenta}`, 20, 58);
    doc.text('Descripción:', 20, 68);
    const descripcionLines = doc.splitTextToSize(values.descripcion || '', 170);
    doc.text(descripcionLines, 20, 74);
    const finalY = 74 + (descripcionLines.length * 5); 
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const valorFormateado = parseFloat(values.valor).toLocaleString('es-CO');
    doc.text(`Valor Total: $${valorFormateado}`, 105, finalY + 15, { align: 'center' });
    const fileName = `Egreso_${dayjs(values.fecha).format('YYYY-MM-DD')}.pdf`;
    doc.save(fileName);
};

const EgresoDrawer = ({ open, onClose, onSuccess, userName, initialValues }) => {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialValues) {
                form.setFieldsValue({
                    ...initialValues,
                    fecha: initialValues.fecha ? dayjs(initialValues.fecha) : dayjs(),
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    vendedor: userName,
                    fecha: dayjs(), 
                    cuenta: 'Nequi'
                });
            }
        }
    }, [open, initialValues, form, userName]);

    const handleSave = async (generatePdf = false) => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            // Preparar datos para el backend
            const dataToSend = {
                ...values,
                fecha: values.fecha ? values.fecha.toISOString() : new Date().toISOString(),
                valor: parseFloat(values.valor)
            };
            
            if (initialValues && initialValues._id) {
                // Actualizar
                await updateEgreso(initialValues._id, dataToSend);
                message.success('Egreso actualizado correctamente');
            } else {
                // Crear
                await createEgreso(dataToSend);
                message.success('Egreso registrado exitosamente');
            }

            if (generatePdf) {
                generarComprobantePDF(dataToSend);
            }
            
            // ¡ESTA LÍNEA ES LA CLAVE!
            // Notifica al padre (Certificados.js) que recargue la tabla
            if (onSuccess) onSuccess(); 
            
            onClose();
        } catch (error) {
            console.error('Error:', error);
            if (!error.errorFields) { 
                message.error('Error al guardar el egreso.');
            }
        } finally {
            setSaving(false);
        }
    };
    
    const menu = (
        <Menu onClick={() => handleSave(true)}>
            <Menu.Item key="1" icon={<FilePdfOutlined />}>
                Guardar y Descargar PDF
            </Menu.Item>
        </Menu>
    );

    return (
        <Drawer
            title={
                <Space>
                    {initialValues ? <EditOutlined /> : <FileProtectOutlined />}
                    <Text strong>{initialValues ? 'Editar Egreso' : 'Registrar Nuevo Gasto'}</Text>
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
                        danger 
                        loading={saving} 
                        onClick={() => handleSave(false)} 
                        overlay={menu}
                        icon={<DownOutlined />}
                    >
                        <SaveOutlined /> {initialValues ? 'Actualizar' : 'Guardar Gasto'}
                    </Dropdown.Button>
                </div>
            }
        >
            <Form form={form} layout="vertical">
                <div style={{ padding: '24px' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                            <Title level={5}><CalendarOutlined /> Paso 1: Detalles del Gasto</Title>
                            <Form.Item name="descripcion" label="Descripción / Motivo" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input.TextArea rows={3} placeholder="Ej: Pago de servicios..." />
                            </Form.Item>
                            <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(c) => c && c > dayjs().endOf('day')} />
                            </Form.Item>
                        </div>
                        <div style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                            <Title level={5}><DollarCircleOutlined /> Paso 2: Monto</Title>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="valor" label="Valor ($)" rules={[{ required: true }]}>
                                        <Input type="number" prefix="$" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="cuenta" label="Cuenta de Salida" rules={[{ required: true }]}>
                                        <Select options={cuentaOptions} />
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

export default EgresoDrawer;