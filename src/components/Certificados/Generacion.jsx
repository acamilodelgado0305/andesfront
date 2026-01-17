import React, { useState } from 'react';
import { Form, Input, Select, Button, notification, Upload, Card } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';

const { Option } = Select;

// Estilos inspirados en la interfaz de Microsoft (Fluent UI)
const headerStyle = {
    marginBottom: '28px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e1e1e1',
    color: '#005A9E', // Azul corporativo
    fontSize: '22px',
    fontWeight: '600',
};

const buttonStyle = {
    width: '100%',
    backgroundColor: '#0078D4', // Azul primario de Microsoft
    borderColor: '#0078D4',
};

function Generacion() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [fotoFile, setFotoFile] = useState(null);

    const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND;

    const handleBeforeUpload = (file) => {
        setFotoFile(file);
        return false;
    };

    const onFinish = async (values) => {
        setLoading(true);
        // 1. DESESTRUCTURAMOS EL NUEVO CAMPO 'intensidadHoraria'
        const { nombre, numeroDocumento, tipoDocumento, intensidadHoraria } = values;

        notification.info({
            message: 'Procesando Solicitud',
            description: 'Generando Certificado y Carnet...',
            duration: 0,
            key: 'generatingDocs'
        });

        try {
            // =================================================================
            // 2. Payload para el CERTIFICADO (JSON) - AQUÍ AGREGAMOS EL DATO
            // =================================================================
            const certPayload = JSON.stringify({
                nombre,
                numeroDocumento,
                tipoDocumento,
                intensidadHoraria // <--- Nuevo dato enviado al backend
            });

            const certPromise = fetch(`${API_BACKEND_URL}/api/generar-certificado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: certPayload,
            });

            // 3. Payload para el CARNET (FormData)
            // El carnet no usa intensidad horaria, lo dejamos igual
            const carnetPayload = new FormData();
            carnetPayload.append('nombre', nombre);
            carnetPayload.append('numeroDocumento', numeroDocumento);
            carnetPayload.append('tipoDocumento', tipoDocumento);
            carnetPayload.append('intensidadHoraria', intensidadHoraria);

            if (fotoFile) {
                carnetPayload.append('foto', fotoFile);
            }

            const carnetPromise = fetch(`${API_BACKEND_URL}/api/generar-carnet`, {
                method: 'POST',
                body: carnetPayload,
            });

            const [certResponse, carnetResponse] = await Promise.all([certPromise, carnetPromise]);

            let allSuccess = true;
            let downloadedDocuments = [];

            // Procesar respuesta del Certificado
            if (certResponse.ok) {
                const certBlob = await certResponse.blob();
                const certFileName = `Certificado_${nombre.replace(/\s/g, '_')}.pdf`;
                const certUrl = window.URL.createObjectURL(certBlob);
                const link = document.createElement('a');
                link.href = certUrl;
                link.setAttribute('download', certFileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(certUrl);
                downloadedDocuments.push("Certificado");
            } else {
                allSuccess = false;
                const errorData = await certResponse.json();
                notification.error({ message: 'Error Certificado', description: errorData.error });
            }

            // Procesar respuesta del Carnet
            if (carnetResponse.ok) {
                const carnetBlob = await carnetResponse.blob();
                const carnetFileName = `Carnet_${nombre.replace(/\s/g, '_')}.pdf`;
                const carnetUrl = window.URL.createObjectURL(carnetBlob);
                const link = document.createElement('a');
                link.href = carnetUrl;
                link.setAttribute('download', carnetFileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(carnetUrl);
                downloadedDocuments.push("Carnet");
            } else {
                allSuccess = false;
                const errorData = await carnetResponse.json();
                notification.error({ message: 'Error Carnet', description: errorData.error });
            }

            notification.destroy('generatingDocs');

            if (allSuccess) {
                notification.success({
                    message: 'Éxito',
                    description: `Se han generado y descargado: ${downloadedDocuments.join(' y ')}.`,
                });
                form.resetFields();
                setFotoFile(null);
            }

        } catch (error) {
            notification.destroy('generatingDocs');
            notification.error({ message: 'Error de Conexión', description: 'No se pudo conectar con el servidor.' });
            console.error('Error general:', error);
        } finally {
            setLoading(false);
        }
    };

    const normFile = (e) => (Array.isArray(e) ? e : e && e.fileList);

    return (
        <div className='bg-gray-50 min-h-screen p-6'>
            <Card>
                <h2 style={headerStyle}>Generador de Documentos</h2>
                <Form form={form} layout="vertical" onFinish={onFinish}>

                    <Form.Item label="Nombre Completo" name="nombre" rules={[{ required: true, message: 'Por favor, ingresa el nombre.' }]}>
                        <Input placeholder="Ej: Ana Sofía Rincón" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item style={{ flex: 1 }} label="Tipo de Documento" name="tipoDocumento" initialValue="C.C" rules={[{ required: true, message: 'Por favor, selecciona el tipo.' }]}>
                            <Select>
                                <Option value="C.C">C.C. (Cédula de Ciudadanía)</Option>
                                <Option value="T.I">T.I. (Tarjeta de Identidad)</Option>
                                <Option value="Pasaporte">Pasaporte</Option>
                                <Option value="C.E">C.E. (Cédula de Extranjería)</Option>
                                <Option value="PPT">PPT (Permiso por Protección Temporal)</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item style={{ flex: 1 }} label="Número de Documento" name="numeroDocumento" rules={[{ required: true, message: 'Por favor, ingresa el documento.' }]}>
                            <Input placeholder="Ej: 1098765432" />
                        </Form.Item>
                    </div>

                    {/* ================================================================= */}
                    {/* NUEVO CAMPO: Intensidad Horaria */}
                    {/* ================================================================= */}
                    <Form.Item
                        label="Intensidad Horaria"
                        name="intensidadHoraria"
                        rules={[{ required: true, message: 'Por favor, ingresa la intensidad horaria.' }]}
                    >
                        <Input placeholder="Ej: 120 Horas Académicas" />
                    </Form.Item>


                    <Form.Item label="Fotografía para el Carnet (Opcional)" name="foto" valuePropName="fileList" getValueFromEvent={normFile}>
                        <ImgCrop
                            rotationSlider
                            aspect={3 / 4}
                            modalTitle="Editar Fotografía"
                            modalOk="Aceptar"
                            modalCancel="Cancelar"
                        >
                            <Upload
                                beforeUpload={handleBeforeUpload}
                                onRemove={() => setFotoFile(null)}
                                maxCount={1}
                                listType="picture"
                                accept="image/png, image/jpeg"
                            >
                                <Button icon={<UploadOutlined />}>Seleccionar Archivo</Button>
                            </Upload>
                        </ImgCrop>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} icon={<DownloadOutlined />} style={buttonStyle}>
                            {loading ? 'Generando...' : 'Generar Documentos'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

export default Generacion;