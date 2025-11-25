import React, { useState, useEffect } from 'react';
import CertificadosTable from './CertificadosTable';
import { Button, Input, Drawer, Form, Select, message, Spin, Card, Divider, Tag, Typography, DatePicker, Tabs } from 'antd';
import { PlusOutlined, ReloadOutlined, FileProtectOutlined } from '@ant-design/icons';
import axios from 'axios';
import IngresoDrawer from './components/Ingresodrawer';
import EgresoDrawer from './components/EgresoDrawer';

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
  const [isIngresoDrawerOpen, setIsIngresoDrawerOpen] = useState(false);
  const [isEgresoDrawerOpen, setIsEgresoDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingEgresoRecord, setEditingEgresoRecord] = useState(null);

  const [certificados, setCertificados] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [filteredCertificados, setFilteredCertificados] = useState([]);
  const [filteredEgresos, setFilteredEgresos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('ventas');
  const [form] = Form.useForm();
  const [egresoForm] = Form.useForm();



  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log('No se encontró userId en localStorage');
          return;
        }
        const response = await axios.get(
          `https://clasit-backend-api-570877385695.us-central1.run.app/api/users/${userId}`
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

  const handleShowCreateDrawer = () => {
    setEditingRecord(null);
    setIsIngresoDrawerOpen(true);
  };

  const handleShowEditDrawer = (record) => {
    setEditingRecord(record);
    setIsIngresoDrawerOpen(true);
  };

  const handleCloseIngresoDrawer = () => {
    setIsIngresoDrawerOpen(false);
    setEditingRecord(null);
  };

  const handleShowCreateEgresoDrawer = () => {
    setEditingEgresoRecord(null);
    setIsEgresoDrawerOpen(true);
  };

  const handleShowEditEgresoDrawer = (record) => {
    setEditingEgresoRecord(record);
    setIsEgresoDrawerOpen(true);
  };

  const handleCloseEgresoDrawer = () => {
    setIsEgresoDrawerOpen(false);
    setEditingEgresoRecord(null);
  };



  const handleIngresoSubmit = async (values) => {
    setLoading(true);
    try {
      const dataToSubmit = {
        ...values,
        vendedor: userName || values.vendedor,
        valor: parseFloat(values.valor),
      };

      let response;
      if (editingRecord) {
        console.log(`Actualizando registro ID: ${editingRecord._id}`);
        response = await fetch(`https://backendcoalianza.vercel.app/api/v1/clients/${editingRecord._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSubmit),
        });
        if (!response.ok) throw new Error('Error al actualizar la venta');
        message.success('Venta actualizada correctamente');
      } else {
        console.log('Creando nuevo registro');
        response = await fetch('https://backendcoalianza.vercel.app/api/v1/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSubmit),
        });
        if (!response.ok) throw new Error('Error al registrar la venta');
        message.success('Venta registrada correctamente');
      }

      handleCloseIngresoDrawer();
      fetchCertificados();
    } catch (error) {
      console.error('Error:', error);
      message.error(editingRecord ? 'Error al actualizar la venta' : 'Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleEgresoSubmit = async (values) => {
    setLoading(true);
    try {
      const dataToSubmit = {
        ...values,
        valor: parseFloat(values.valor),
        vendedor: userName || values.vendedor,
        fecha: values.fecha,
      };

      let response;
      if (editingEgresoRecord) {
        response = await fetch(`https://backendcoalianza.vercel.app/api/v1/egresos/${editingEgresoRecord._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSubmit),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al actualizar el egreso');
        }
        message.success('Egreso actualizado correctamente');
      } else {
        response = await fetch('https://backendcoalianza.vercel.app/api/v1/egresos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSubmit),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al registrar el egreso');
        }
        message.success('Egreso registrado correctamente');
      }

      handleCloseEgresoDrawer();
      fetchEgresos();
    } catch (error) {
      console.error('Error en el envío del egreso:', error);
      message.error(error.message || (editingEgresoRecord ? 'Error al actualizar el egreso' : 'Error al registrar el egreso'));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div >
      <Card className="shadow-md rounded-lg overflow-hidden" bordered={false}>
        {/* Header Section - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div className="flex items-center">
            <FileProtectOutlined className="text-green-900 text-xl sm:text-2xl mr-2 sm:mr-3" />
            <Title level={3} className="m-0 text-gray-800 text-base sm:text-lg md:text-xl">
              Gestión de Movimientos
            </Title>
          </div>

          {/* Buttons - Responsive wrapping */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchCertificados();
                fetchEgresos();
              }}
              loading={loading}
              size="small"
              className="border border-gray-300 hover:border-green-500 hover:text-green-500 flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleShowCreateDrawer}
              loading={loading}
              size="small"
              className="bg-[#155153] hover:bg-green-700 border-0 flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Nueva </span>Venta
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleShowCreateEgresoDrawer}
              loading={loading}
              size="small"
              className="bg-red-600 hover:bg-red-700 border-0 flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Nuevo </span>Egreso
            </Button>
          </div>
        </div>

        <Divider className="my-2 sm:my-3" />

        {/* Info Section - Responsive */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Text className="text-gray-500 text-xs sm:text-sm">
            <span className="hidden md:inline">Sistema de administración de movimientos. </span>
            Registre y gestione ventas y egresos.
          </Text>
          {userName && (
            <Tag color="green" className="text-xs sm:text-sm">
              Usuario: {userName}
            </Tag>
          )}
        </div>

        {/* Tabs - Responsive */}
        <Tabs activeKey={activeTab} onChange={handleTabChange} size="small">
          <TabPane tab="Ingresos" key="ventas" />
          <TabPane tab="Egresos" key="egresos" />
        </Tabs>

        {/* Table Container - Responsive with horizontal scroll */}
        <div className="bg-white rounded-lg overflow-x-auto">
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
              onEdit={activeTab === 'ventas' ? handleShowEditDrawer : handleShowEditEgresoDrawer}
            />
          )}
        </div>
      </Card>

      {/* Drawer for Ventas - Full width on mobile */}
      <IngresoDrawer
        open={isIngresoDrawerOpen}
        onClose={handleCloseIngresoDrawer}
        onSubmit={handleIngresoSubmit}
        loading={loading}
        userName={userName}
        initialValues={editingRecord}
        width={window.innerWidth < 768 ? '100%' : 720}
      />

      {/* Drawer for Egresos - Full width on mobile */}
      <EgresoDrawer
        open={isEgresoDrawerOpen}
        onClose={handleCloseEgresoDrawer}
        onSubmit={handleEgresoSubmit}
        loading={loading}
        userName={userName}
        initialValues={editingEgresoRecord}
        width={window.innerWidth < 768 ? '100%' : 720}
      />
    </div>
  );
}

export default Certificados;