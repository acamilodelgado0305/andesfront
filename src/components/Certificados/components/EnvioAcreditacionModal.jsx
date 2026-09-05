import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Typography, Alert } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Confirmación antes de mandar por correo el diploma + certificado.
 *
 * La plantilla de manipulación de alimentos no necesita nada de esto: trae el
 * curso impreso y no lleva fechas. La de acreditación sí — imprime el curso, las
 * horas, el periodo y la fecha de expedición — y esos datos no viven en la
 * venta, así que se confirman aquí (los mismos campos que pide Generación de
 * Documentos) con valores ya sugeridos.
 *
 * @param {Object} props
 * @param {Object|null} props.envio - { cliente, curso, intensidadHoraria, periodo } o null para cerrarlo
 * @param {Function} props.onCancel
 * @param {Function} props.onConfirm - recibe { curso, intensidadHoraria, periodo, fechaExpedicion }
 */
const EnvioAcreditacionModal = ({ envio, onCancel, onConfirm }) => {
    const [form] = Form.useForm();

    // Cada venta abre el modal con sus propios valores; sin este reset el
    // formulario conservaría los de la venta anterior.
    useEffect(() => {
        if (!envio) return;
        form.setFieldsValue({
            curso: envio.curso,
            intensidadHoraria: envio.intensidadHoraria,
            periodo: envio.periodo,
            // Se expide el día de la venta; el periodo cerró la víspera.
            fechaExpedicion: envio.fechaExpedicion || envio.periodo?.[1],
        });
    }, [envio, form]);

    const handleOk = async () => {
        const valores = await form.validateFields();
        onConfirm(valores);
    };

    return (
        <Modal
            open={!!envio}
            title={<span><MailOutlined /> Enviar diploma y certificado</span>}
            okText="Enviar por correo"
            cancelText="Cancelar"
            onOk={handleOk}
            onCancel={onCancel}
            destroyOnClose
        >
            {envio && (
                <>
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={<span>Se enviará a <Text strong>{envio.cliente.email}</Text></span>}
                        description={`${envio.cliente.nombre} · ${envio.cliente.tipoDocumento} ${envio.cliente.numeroDocumento}`}
                    />

                    <Form form={form} layout="vertical">
                        <Form.Item
                            label="Curso"
                            name="curso"
                            rules={[{ required: true, message: 'El curso se imprime en el diploma.' }]}
                            extra="Tal cual saldrá impreso en el diploma y el certificado."
                        >
                            <Input placeholder="Ej: Auxiliar de Bodega" />
                        </Form.Item>

                        <Form.Item
                            label="Intensidad horaria"
                            name="intensidadHoraria"
                            rules={[{ required: true, message: 'Indica las horas del curso.' }]}
                            extra="Solo el número: la plantilla ya trae impresa la palabra «horas»."
                        >
                            <Input placeholder="Ej: 40" />
                        </Form.Item>

                        <Form.Item
                            label="Periodo del curso (inicio y fin)"
                            name="periodo"
                            rules={[{ required: true, message: 'Indica cuándo inició y finalizó el curso.' }]}
                        >
                            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item
                            label="Fecha de expedición"
                            name="fechaExpedicion"
                            rules={[{ required: true, message: 'Indica la fecha de expedición.' }]}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </Form>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        El folio de registro se asigna automáticamente al enviar.
                    </Text>
                </>
            )}
        </Modal>
    );
};

export default EnvioAcreditacionModal;
