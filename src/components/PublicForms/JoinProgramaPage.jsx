import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Typography, Alert, Spin, Result } from 'antd';
import { UserAddOutlined, BookOutlined, IdcardOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getJoinInfo, joinPrograma } from '../../services/auth/studentAuthService';

const { Title, Text, Paragraph } = Typography;

export default function JoinProgramaPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [programa, setPrograma] = useState(null);
  const [infoError, setInfoError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const data = await getJoinInfo(token);
        setPrograma(data.programa || data);
      } catch (err) {
        setInfoError(
          err.response?.data?.message || err.response?.data?.error ||
          'Este enlace de inscripción no es válido o ya no está activo.'
        );
      } finally {
        setLoadingInfo(false);
      }
    };
    loadInfo();
  }, [token]);

  const handleSubmit = async (values) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await joinPrograma(token, {
        numero_documento: values.numero_documento,
        tipoDocumento: values.tipoDocumento,
        nombre: values.nombre,
        apellido: values.apellido,
        email: values.email,
      });
      navigate('/Reporte', { replace: true });
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'No se pudo completar la inscripción.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#262624] px-4 py-10">
      <Card
        className="w-full max-w-md rounded-2xl shadow-md dark:bg-[#30302e] dark:border-[#403e3a]"
        bodyStyle={{ padding: 32 }}
      >
        {loadingInfo ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spin size="large" />
            <Text type="secondary">Cargando información del programa...</Text>
          </div>
        ) : infoError ? (
          <Result
            status="error"
            title="Enlace no disponible"
            subTitle={infoError}
          />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <BookOutlined className="text-purple-600 dark:text-purple-300 text-xl" />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }} className="dark:!text-[#faf9f5]">
                  Únete a {programa?.nombre || 'este programa'}
                </Title>
                <Text type="secondary" className="text-sm">
                  Completa tus datos para inscribirte
                </Text>
              </div>
            </div>

            <Paragraph type="secondary" className="text-sm mt-3 mb-4">
              Si ya tienes una cuenta con este número de documento, solo quedarás
              inscrito en el programa. Si es tu primera vez, se creará tu cuenta
              de estudiante.
            </Paragraph>

            {submitError && (
              <Alert type="error" message={submitError} showIcon className="mb-4" />
            )}

            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                name="tipoDocumento"
                label="Tipo de documento"
                initialValue="CC"
                rules={[{ required: true, message: 'Selecciona el tipo de documento' }]}
              >
                <Select
                  options={[
                    { value: 'CC', label: 'Cédula de ciudadanía' },
                    { value: 'TI', label: 'Tarjeta de identidad' },
                    { value: 'CE', label: 'Cédula de extranjería' },
                    { value: 'PA', label: 'Pasaporte' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="numero_documento"
                label="Número de documento"
                rules={[{ required: true, message: 'El número de documento es obligatorio' }]}
              >
                <Input prefix={<IdcardOutlined />} placeholder="Ej. 1020304050" />
              </Form.Item>

              <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
                <Input placeholder="Nombre" />
              </Form.Item>

              <Form.Item name="apellido" label="Apellido" rules={[{ required: true, message: 'Ingresa tu apellido' }]}>
                <Input placeholder="Apellido" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Correo electrónico"
                rules={[
                  { required: true, message: 'Ingresa tu correo' },
                  { type: 'email', message: 'Correo inválido' },
                ]}
              >
                <Input placeholder="correo@ejemplo.com" />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                icon={<UserAddOutlined />}
                loading={submitting}
                block
                size="large"
              >
                Unirme al programa
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
