import React, { useState } from 'react';
import { Form, Input, Select, Button, notification, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Option } = Select;

function Generacion() {
    // Estado para manejar el estado de carga (loading)
    const [loading, setLoading] = useState(false);
    // Hook de Ant Design para el formulario
    const [form] = Form.useForm();

    // Obtener la URL del backend desde las variables de entorno de Vite
    const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND;

    // Función que se ejecuta al enviar el formulario
    const onFinish = async (values) => {
        setLoading(true); // Activar el estado de carga

        const { nombre, numeroDocumento, tipoDocumento } = values;

        // Mostrar notificación de procesamiento
        notification.info({
            message: 'Procesando Solicitud',
            description: 'Generando Certificado y Carnet...',
            duration: 0, // La notificación permanece hasta que se cierre manualmente
            key: 'generatingDocs'
        });

        try {
            // Iniciar ambas solicitudes simultáneamente
            // Los payloads son idénticos como lo has especificado
            const [certResponse, carnetResponse] = await Promise.all([
                fetch(`${API_BACKEND_URL}/generar-certificado`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, numeroDocumento, tipoDocumento }),
                }),
                fetch(`${API_BACKEND_URL}/generar-carnet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, numeroDocumento, tipoDocumento }),
                }),
            ]);

            let allSuccess = true;
            let downloadedDocuments = []; // Para almacenar los nombres de los documentos descargados

            // --- Procesar respuesta del Certificado ---
            if (!certResponse.ok) {
                const errorData = await certResponse.json();
                notification.error({
                    message: 'Error Certificado',
                    description: errorData.error || 'Error desconocido al generar el certificado.',
                });
                allSuccess = false;
            } else {
                const certBlob = await certResponse.blob();
                const certFileName = `Certificado_${nombre.replace(/\s/g, '_')}_${numeroDocumento}.pdf`;
                const certUrl = window.URL.createObjectURL(certBlob);
                const certLink = document.createElement('a');
                certLink.href = certUrl;
                certLink.setAttribute('download', certFileName);
                document.body.appendChild(certLink);
                certLink.click();
                document.body.removeChild(certLink);
                window.URL.revokeObjectURL(certUrl); // Libera la URL del objeto
                downloadedDocuments.push("Certificado");
            }

            // --- Procesar respuesta del Carnet ---
            if (!carnetResponse.ok) {
                const errorData = await carnetResponse.json();
                notification.error({
                    message: 'Error Carnet',
                    description: errorData.error || 'Error desconocido al generar el carnet.',
                });
                allSuccess = false;
            } else {
                const carnetBlob = await carnetResponse.blob();
                const carnetFileName = `Carnet_${nombre.replace(/\s/g, '_')}_${numeroDocumento}.pdf`;
                const carnetUrl = window.URL.createObjectURL(carnetBlob);
                const carnetLink = document.createElement('a');
                carnetLink.href = carnetUrl;
                carnetLink.setAttribute('download', carnetFileName);
                document.body.appendChild(carnetLink);
                carnetLink.click();
                document.body.removeChild(carnetLink);
                window.URL.revokeObjectURL(carnetUrl); // Libera la URL del objeto
                downloadedDocuments.push("Carnet");
            }

            notification.destroy('generatingDocs'); // Cerrar la notificación de "Procesando"

            if (allSuccess) {
                notification.success({
                    message: 'Éxito',
                    description: `Se han generado y descargado exitosamente: ${downloadedDocuments.join(' y ')}.`,
                });
                form.resetFields(); // Limpiar el formulario después de la generación exitosa
            } else {
                notification.error({
                    message: 'Generación Incompleta',
                    description: `Hubo problemas al generar algunos documentos. Se descargaron: ${downloadedDocuments.length > 0 ? downloadedDocuments.join(' y ') : 'ninguno'}. Revisa los detalles de los errores.`,
                });
            }

        } catch (error) {
            console.error('Error general al generar documentos:', error);
            notification.destroy('generatingDocs'); // Asegúrate de cerrar la notificación de "Procesando"
            notification.error({
                message: 'Error de Conexión',
                description: error.message || 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
            });
        } finally {
            setLoading(false); // Desactivar el estado de carga
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '50px auto', border: '1px solid #e8e8e8', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Generar Certificado y Carnet</h2>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    tipoDocumento: 'C.C', // Valor por defecto para tipo de documento
                }}
            >
                {/* Se eliminó el Select para elegir tipo de documento a generar */}
                
                <Form.Item
                    label="Nombre Completo"
                    name="nombre"
                    rules={[{ required: true, message: 'Por favor, ingresa el nombre completo.' }]}
                >
                    <Input placeholder="Ej: Andres Camilo Delgado Gamboa" />
                </Form.Item>

                <Form.Item
                    label="Número de Documento"
                    name="numeroDocumento"
                    rules={[{ required: true, message: 'Por favor, ingresa el número de documento.' }]}
                >
                    <Input placeholder="Ej: 123456789" />
                </Form.Item>

                <Form.Item
                    label="Tipo de Documento"
                    name="tipoDocumento"
                    rules={[{ required: true, message: 'Por favor, selecciona el tipo de documento.' }]}
                >
                    <Select placeholder="Selecciona el tipo de documento">
                        <Option value="C.C">C.C. (Cédula de Ciudadanía)</Option>
                        <Option value="T.I">T.I. (Tarjeta de Identidad)</Option>
                        <Option value="Pasaporte">Pasaporte</Option>
                        <Option value="C.E">C.E. (Cédula de Extranjería)</Option>
                    </Select>
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<DownloadOutlined />}
                        style={{ width: '100%', marginTop: '20px', backgroundColor: '#007bff', borderColor: '#007bff' }}
                    >
                        {loading ? 'Generando Documentos...' : 'Generar Certificado y Carnet'}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default Generacion;