import React, { useState, useEffect } from 'react';
import CertificadosTable from './CertificadosTable';
import { Button, Input, Drawer, Form, Select, message, Spin, Card, Divider, Tag, Typography, DatePicker, Tabs } from 'antd';
import { PlusOutlined, ReloadOutlined, FileProtectOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Formateador para pesos colombianos
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function Certificados() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEgresoDrawerOpen, setIsEgresoDrawerOpen] = useState(false);
  const [certificados, setCertificados] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [filteredCertificados, setFilteredCertificados] = useState([]);
  const [filteredEgresos, setFilteredEgresos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('ventas');
  const [form] = Form.useForm();
  const [egresoForm] = Form.useForm();

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
          `https://clasit-backend-api-570877385695.us-central1.run.app/auth/users/${userId}`
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
      fetchEgresos();
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

  const fetchEgresos = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://backendcoalianza.vercel.app/api/v1/egresos');
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      setEgresos(data);
      const userEgresos = data.filter((egreso) => egreso.vendedor === userName);
      setFilteredEgresos(userEgresos);
    } catch (error) {
      console.error('Error al cargar los egresos:', error);
      message.error(`Error: ${error.message || 'Error al cargar los egresos'}`);
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
        valor: parseFloat(values.valor),
      };
      const response = await fetch('https://backendcoalianza.vercel.app/api/v1/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) throw new Error('Error al registrar la venta');
      message.success('Venta registrada correctamente');
      closeDrawer();
      fetchCertificados();
    } catch (error) {
      console.error('Error:', error);
      message.error('Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleEgresoSubmit = async (values) => {
    try {
      setLoading(true);
      const dataToSubmit = {
        ...values,
        valor: parseFloat(values.valor),
        vendedor: userName || values.vendedor,
        fecha: values.fecha.format('YYYY-MM-DD'),
      };
      const response = await fetch('https://backendcoalianza.vercel.app/api/v1/egresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) throw new Error('Error al registrar el egreso');
      message.success('Egreso registrado correctamente');
      setIsEgresoDrawerOpen(false);
      egresoForm.resetFields();
      fetchEgresos();
    } catch (error) {
      console.error('Error:', error);
      message.error('Error al registrar el egreso');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <Card className="shadow-md rounded-lg overflow-hidden" bordered={false}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <FileProtectOutlined className="text-green-900 text-2xl mr-3" />
            <Title level={3} className="m-0 text-gray-800">Gestión de Movimientos</Title>
          </div>
          <div className="flex gap-3">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchCertificados();
                fetchEgresos();
              }}
              loading={loading}
              className="border border-gray-300 hover:border-green-500 hover:text-green-500"
            >
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showDrawer}
              loading={loading}
              className="bg-{#155153} hover:bg-green-700 border-0"
            >
              Nueva Venta
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsEgresoDrawerOpen(true)}
              loading={loading}
              className="bg-red-600 hover:bg-red-700 border-0"
            >
              Nuevo Egreso
            </Button>
          </div>
        </div>

        <Divider className="my-3" />

        <div className="mb-4 flex justify-between items-center">
          <Text className="text-gray-500">
            Sistema de administración de movimientos. Registre y gestione ventas y egresos.
          </Text>
          {userName && (
            <Tag color="green" className="text-sm">
              Usuario: {userName}
            </Tag>
          )}
        </div>

        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="Ingresos" key="ventas" />
          <TabPane tab="Egresos" key="egresos" />
        </Tabs>

        <div className="bg-white rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" tip="Cargando datos..." />
            </div>
          ) : (
            <CertificadosTable
              data={activeTab === 'ventas' ? filteredCertificados : filteredEgresos}
              allVentas={filteredCertificados}
              allEgresos={filteredEgresos}
              loading={loading}
              onRefresh={activeTab === 'ventas' ? fetchCertificados : fetchEgresos}
              userName={userName}
              type={activeTab}
            />
          )}
        </div>
      </Card>

      {/* Drawer for Ventas */}
      <Drawer
        title={
          <div className="flex items-center">
            <FileProtectOutlined className="text-{#155153} mr-2" />
            <span>Registrar Nueva Venta</span>
          </div>
        }
         placement="top"
          classNames={{ 
          wrapper: '!w-[500px] !right-0 !left-auto !h-[calc(100%-0px)] top-16 !rounded-tl-lg !rounded-tr-lg !border-0 !shadow-lg',
        }}
      
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
              className="bg-{#155153} hover:bg-green-700 border-0"
            >
              Guardar Venta
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
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <Text className="text-green-700 text-sm">
              Complete todos los campos para registrar una nueva venta. Los campos marcados con (*) son obligatorios.
            </Text>
          </div>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
          >
            <Input
              placeholder="Ingrese el nombre"
              className="hover:border-green-500 focus:border-green-500"
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
              className="hover:border-green-500 focus:border-green-500"
            />
          </Form.Item>
          <Form.Item
            name="numeroDeDocumento"
            label="Número de Documento"
            rules={[{ required: true, message: 'Por favor ingrese el número de documento' }]}
          >
            <Input
              placeholder="Ingrese el número de documento"
              className="hover:border-green-500 focus:border-green-500"
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
              className="w-full hover:border-green-500 focus:border-green-500"
              tagRender={(props) => (
                <Tag
                  color="green"
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
              className="hover:border-green-500 focus:border-green-500"
              prefix={<span className="text-gray-400">$</span>}
              formatter={(value) => (value ? currencyFormatter.format(value) : '')}
              parser={(value) => value.replace(/[^\d.]/g, '')}
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
              className="w-full hover:border-green-500 focus:border-green-500"
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Drawer for Egresos */}
      <Drawer
        title={
          <div className="flex items-center">
            <FileProtectOutlined className="text-red-500 mr-2" />
            <span>Registrar Nuevo Egreso</span>
          </div>
        }
        width={420}
         placement="top"
          classNames={{ 
          wrapper: '!w-[500px] !right-0 !left-auto !h-[calc(100%-0px)] top-16 !rounded-tl-lg !rounded-tr-lg !border-0 !shadow-lg',
        }}
        onClose={() => {
          setIsEgresoDrawerOpen(false);
          egresoForm.resetFields();
        }}
        open={isEgresoDrawerOpen}
        bodyStyle={{ paddingBottom: 80 }}
        headerStyle={{ borderBottom: '1px solid #f0f0f0' }}
        footer={
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setIsEgresoDrawerOpen(false);
                egresoForm.resetFields();
              }}
              className="mr-3 border border-gray-300"
              style={{ marginRight: 8 }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={() => egresoForm.submit()}
              className="bg-red-600 hover:bg-red-700 border-0"
            >
              Guardar Egreso
            </Button>
          </div>
        }
      >
        <Form
          form={egresoForm}
          layout="vertical"
          onFinish={handleEgresoSubmit}
          className="px-1"
        >
          <div className="bg-red-50 p-4 rounded-lg mb-6">
            <Text className="text-red-700 text-sm">
              Complete todos los campos para registrar un nuevo egreso. Los campos marcados con (*) son obligatorios.
            </Text>
          </div>
          <Form.Item
            name="fecha"
            label="Fecha"
            rules={[{ required: true, message: 'Por favor seleccione la fecha' }]}
          >
            <DatePicker
              format="YYYY-MM-DD"
              placeholder="Seleccione la fecha"
              className="w-full hover:border-red-500 focus:border-red-500"
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
              className="hover:border-red-500 focus:border-red-500"
              prefix={<span className="text-gray-400">$</span>}
              formatter={(value) => (value ? currencyFormatter.format(value) : '')}
              parser={(value) => value.replace(/[^\d.]/g, '')}
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
              className="w-full hover:border-red-500 focus:border-red-500"
            />
          </Form.Item>
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true, message: 'Por favor ingrese una descripción' }]}
          >
            <Input.TextArea
              placeholder="Ingrese la descripción del egreso"
              rows={4}
              className="hover:border-red-500 focus:border-red-500"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

export default Certificados;