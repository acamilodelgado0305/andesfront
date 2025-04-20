import React, { useState, useEffect } from 'react';
import CertificadosTable from './CertificadosTable';
import { Button, Input, Drawer, Form, Select, message, Spin, Card, Divider, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, FileProtectOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

// Formateador para pesos colombianos
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function Certificados() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [certificados, setCertificados] = useState([]);
  const [filteredCertificados, setFilteredCertificados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [form] = Form.useForm();

  const tipoOptions = [
    { label: 'Manipulación de alimentos', value: 'Manipulación de alimentos' },
    { label: 'Aseo Hospitalario', value: 'Aseo Hospitalario' },
  ];

  const cuentaOptions = [
    { label: 'Nequi', value: 'Nequi' },
    { label: 'Daviplata', value: 'Daviplata' },
    { label: 'Bancolombia', value: 'Bancolombia' },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log('No se encontró userId en localStorage');
          return;
        }
        const response = await axios.get(
          `https://back.app.validaciondebachillerato.com.co/auth/users/${userId}`
        );
        setUserName(response.data.name || '');
      } catch (err) {
        console.error('Error al obtener datos del usuario:', err);
        message.error('Error al cargar datos del usuario');
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (userName) {
      fetchCertificados();
    }
  }, [userName]);

  useEffect(() => {
    if (userName && form) {
      form.setFieldsValue({ vendedor: userName });
    }
  }, [userName, form]);

  const fetchCertificados = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://backendcoalianza.vercel.app/api/v1/clients');
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      setCertificados(data);
      const userCertificados = data.filter((cert) => cert.vendedor === userName);
      setFilteredCertificados(userCertificados);
    } catch (error) {
      console.error('Error al cargar los certificados:', error);
      message.error(`Error: ${error.message || 'Error al cargar los certificados'}`);
    } finally {
      setLoading(false);
    }
  };

  const showDrawer = () => {
    form.setFieldsValue({ vendedor: userName });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const dataToSubmit = {
        ...values,
        vendedor: userName || values.vendedor,
        valor: parseFloat(values.valor), // Convertir valor a número
      };
      const response = await fetch('https://backendcoalianza.vercel.app/api/v1/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) throw new Error('Error al registrar el certificado');
      message.success('Certificado registrado correctamente');
      closeDrawer();
      fetchCertificados();
    } catch (error) {
      console.error('Error:', error);
      message.error('Error al registrar el certificado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <Card className="shadow-md rounded-lg overflow-hidden" bordered={false}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <FileProtectOutlined className="text-blue-500 text-2xl mr-3" />
            <Title level={3} className="m-0 text-gray-800">Gestión de Certificados</Title>
          </div>
          <div className="flex gap-3">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchCertificados}
              loading={loading}
              className="border border-gray-300 hover:border-blue-500 hover:text-blue-500"
            >
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showDrawer}
              loading={loading}
              className="bg-blue-600 hover:bg-blue-700 border-0"
            >
              Nuevo Certificado
            </Button>
          </div>
        </div>

        <Divider className="my-3" />

        <div className="mb-4 flex justify-between items-center">
          <Text className="text-gray-500">
            Sistema de administración de certificados. Registre y gestione todos los certificados emitidos.
          </Text>
          {userName && (
            <Tag color="blue" className="text-sm">
              Usuario: {userName}
            </Tag>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {tipoOptions.map((tipo) => (
            <Card
              key={tipo.value}
              size="small"
              className="bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <Text className="text-gray-700">{tipo.label}</Text>
                <Tag color="blue">
                  {filteredCertificados.filter((cert) => cert.tipo?.includes(tipo.value)).length || 0}
                </Tag>
              </div>
            </Card>
          ))}
          <Card
            size="small"
            className="bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center">
              <Text className="text-gray-700">Total Certificados</Text>
              <Tag color="purple">{filteredCertificados.length}</Tag>
            </div>
          </Card>
        </div>

        <div className="bg-white rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" tip="Cargando certificados..." />
            </div>
          ) : (
            <CertificadosTable
              data={filteredCertificados}
              loading={loading}
              onRefresh={fetchCertificados}
              userName={userName}
            />
          )}
        </div>
      </Card>

      <Drawer
        title={
          <div className="flex items-center">
            <FileProtectOutlined className="text-blue-500 mr-2" />
            <span>Registrar Nuevo Certificado</span>
          </div>
        }
        width={420}
        onClose={closeDrawer}
        open={isDrawerOpen}
        bodyStyle={{ paddingBottom: 80 }}
        headerStyle={{ borderBottom: '1px solid #f0f0f0' }}
        footer={
          <div className="flex justify-end">
            <Button onClick={closeDrawer} className="mr-3 border border-gray-300" style={{ marginRight: 8 }}>
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={() => form.submit()}
              className="bg-blue-600 hover:bg-blue-700 border-0"
            >
              Guardar Certificado
            </Button>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="px-1"
          initialValues={{ vendedor: userName }}
        >
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <Text className="text-blue-700 text-sm">
              Complete todos los campos para registrar un nuevo certificado. Los campos marcados con (*) son obligatorios.
            </Text>
          </div>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
          >
            <Input
              placeholder="Ingrese el nombre"
              className="hover:border-blue-500 focus:border-blue-500"
              prefix={<span className="text-gray-400">👤</span>}
            />
          </Form.Item>
          <Form.Item
            name="apellido"
            label="Apellido"
            rules={[{ required: true, message: 'Por favor ingrese el apellido' }]}
          >
            <Input
              placeholder="Ingrese el apellido"
              className="hover:border-blue-500 focus:border-blue-500"
            />
          </Form.Item>
          <Form.Item
            name="numeroDeDocumento"
            label="Número de Documento"
            rules={[{ required: true, message: 'Por favor ingrese el número de documento' }]}
          >
            <Input
              placeholder="Ingrese el número de documento"
              className="hover:border-blue-500 focus:border-blue-500"
              prefix={<span className="text-gray-400">🆔</span>}
            />
          </Form.Item>
          <Form.Item name="vendedor" label="Vendedor" hidden={true}>
            <Input disabled />
          </Form.Item>
          <Divider className="my-4" />
          <Form.Item
            name="tipo"
            label="Tipo de Certificado"
            rules={[{ required: true, message: 'Por favor seleccione al menos un tipo de certificado' }]}
          >
            <Select
              mode="multiple"
              placeholder="Seleccione el tipo de certificado"
              options={tipoOptions}
              className="w-full hover:border-blue-500 focus:border-blue-500"
              tagRender={(props) => (
                <Tag
                  color="blue"
                  closable={props.closable}
                  onClose={props.onClose}
                  style={{ marginRight: 3 }}
                >
                  {props.label}
                </Tag>
              )}
            />
          </Form.Item>
          <Form.Item
            name="valor"
            label="Valor"
            rules={[
              { required: true, message: 'Por favor ingrese el valor' },
              {
                validator: (_, value) =>
                  value && parseFloat(value) >= 0
                    ? Promise.resolve()
                    : Promise.reject('El valor debe ser un número positivo'),
              },
            ]}
          >
            <Input
              placeholder="Ingrese el valor"
              type="number"
              step="0.01"
              className="hover:border-blue-500 focus:border-blue-500"
              prefix={<span className="text-gray-400">$</span>}
              formatter={(value) => (value ? currencyFormatter.format(value) : '')}
              parser={(value) => value.replace(/[^\d.]/g, '')} // Remueve caracteres no numéricos
            />
          </Form.Item>
          <Form.Item
            name="cuenta"
            label="Cuenta"
            rules={[{ required: true, message: 'Por favor seleccione una cuenta' }]}
          >
            <Select
              placeholder="Seleccione una cuenta"
              options={cuentaOptions}
              className="w-full hover:border-blue-500 focus:border-blue-500"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

export default Certificados;