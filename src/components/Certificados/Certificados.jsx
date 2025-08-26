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

  const handleShowCreateDrawer = () => {
    setEditingRecord(null); // Nos aseguramos que no haya ningún registro de edición
    setIsIngresoDrawerOpen(true);
  };

  // --- NUEVO: Función para abrir el drawer en modo EDICIÓN ---
  const handleShowEditDrawer = (record) => {
    setEditingRecord(record); // Guardamos el registro a editar
    setIsIngresoDrawerOpen(true);
  };

  const handleCloseIngresoDrawer = () => {
    setIsIngresoDrawerOpen(false);
    setEditingRecord(null); // Limpiamos el registro al cerrar
  };

    const handleShowCreateEgresoDrawer = () => {
    setEditingEgresoRecord(null); // Limpiamos el estado de edición
    setIsEgresoDrawerOpen(true);
  };

  const handleShowEditEgresoDrawer = (record) => {
    setEditingEgresoRecord(record); // Guardamos el egreso a editar
    setIsEgresoDrawerOpen(true);
  };

  const handleCloseEgresoDrawer = () => {
    setIsEgresoDrawerOpen(false);
    setEditingEgresoRecord(null); // Limpiamos el estado al cerrar
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
        // --- LÓGICA DE ACTUALIZACIÓN (PUT) ---
        console.log(`Actualizando registro ID: ${editingRecord._id}`);
        response = await fetch(`https://backendcoalianza.vercel.app/api/v1/clients/${editingRecord._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSubmit),
        });
        if (!response.ok) throw new Error('Error al actualizar la venta');
        message.success('Venta actualizada correctamente');
      } else {
        // --- LÓGICA DE CREACIÓN (POST) ---
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
        // --- LÓGICA DE ACTUALIZACIÓN (PUT) PARA EGRESOS ---
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
        // --- LÓGICA DE CREACIÓN (POST) PARA EGRESOS ---
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
              onClick={handleShowCreateDrawer} // --- MODIFICADO ---
              loading={loading}
              className="bg-[#155153] hover:bg-green-700 border-0"
            >
              Nueva Venta
            </Button>
           <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleShowCreateEgresoDrawer} // --- MODIFICADO ---
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
             onEdit={activeTab === 'ventas' ? handleShowEditDrawer : handleShowEditEgresoDrawer}
            />
          )}
        </div>
      </Card>

      {/* Drawer for Ventas */}
       <IngresoDrawer
        open={isIngresoDrawerOpen}
        onClose={handleCloseIngresoDrawer} // --- MODIFICADO ---
        onSubmit={handleIngresoSubmit} // --- MODIFICADO ---
        loading={loading}
        userName={userName}
        initialValues={editingRecord} // --- NUEVO: Pasamos los datos del registro a editar ---
      />

      <EgresoDrawer
       open={isEgresoDrawerOpen}
        onClose={handleCloseEgresoDrawer} // Usamos la nueva función de cierre
        onSubmit={handleEgresoSubmit}    // La función de submit ahora es más potente
        loading={loading}
        userName={userName} // Pasamos el userName por si es necesario
        initialValues={editingEgresoRecord} 
      />

      {/* Drawer for Egresos */}

    </div>
  );
}

export default Certificados;