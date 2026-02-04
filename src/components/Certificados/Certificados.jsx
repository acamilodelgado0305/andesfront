import React, { useState, useEffect, useContext,useMemo } from 'react';
import { Card, Tabs, Typography, Button, message, Spin } from 'antd';
import { DollarOutlined, AuditOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/es';

import { AuthContext } from '../../AuthContext';

// Importamos SOLO las funciones de lectura para la tabla principal
import { getAllIngresos, getAllEgresos } from '../../services/controlapos/posService';

// Importamos los Drawers "Inteligentes"
import IngresoDrawer from './components/IngresoDrawer';
import EgresoDrawer from './components/EgresoDrawer';

import DashboardStats from './DashboardStats';
import TransactionTable from './TransactionTable';

const { Title } = Typography;
const { TabPane } = Tabs;

moment.locale('es');

function Certificados() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [rawDataIngresos, setRawDataIngresos] = useState([]);
  const [rawDataEgresos, setRawDataEgresos] = useState([]);
  const [dateRange, setDateRange] = useState([
    moment().startOf('month'),
    moment().endOf('month')
  ]);

  const [drawerState, setDrawerState] = useState({
    ingreso: false,
    egreso: false,
    editingRecord: null,
  });

  const [filters, setFilters] = useState({
    payment: null,
    product: null,
  });

  // --- CARGA DE DATOS (REFRESH) ---
  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ingresosData, egresosData] = await Promise.all([
        getAllIngresos(),
        getAllEgresos()
      ]);

      const safeIngresos = Array.isArray(ingresosData) ? ingresosData : (ingresosData.data || []);
      const safeEgresos = Array.isArray(egresosData) ? egresosData : (egresosData.data || []);

      setRawDataIngresos(safeIngresos);
      setRawDataEgresos(safeEgresos);
    } catch (error) {
      console.error(error);
      message.error("Error actualizando la tabla de transacciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // --- FILTRADO POR USUARIO (Opcional según tu lógica de negocio) ---
  const myIngresos = useMemo(() => {
    if (!user?.name || !Array.isArray(rawDataIngresos)) return [];
    return rawDataIngresos; // Si quieres ver TODOS, deja esto así. Si solo los del usuario, agrega el filtro.
  }, [rawDataIngresos, user]);

  const myEgresos = useMemo(() => {
    if (!user?.name || !Array.isArray(rawDataEgresos)) return [];
    return rawDataEgresos;
  }, [rawDataEgresos, user]);

  // --- MANEJO DE DRAWERS ---
  const openDrawer = (type, record = null) => {
    setDrawerState({ ...drawerState, [type]: true, editingRecord: record });
  };

  const closeDrawers = () => {
    setDrawerState({ ingreso: false, egreso: false, editingRecord: null });
  };

  // --- MANEJO DE ÉXITO (CLAVE PARA ACTUALIZAR TABLA) ---
  const handleSuccess = () => {
    // 1. Cerramos el drawer
    closeDrawers();
    // 2. Recargamos los datos inmediatamente
    fetchTransactions();
  };

  if (!user) return <div className="p-10 flex justify-center"><Spin size="large" /></div>;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <Title level={4} style={{ margin: 0, color: '#155153' }}>Panel Financiero</Title>
            <div className="flex items-center gap-2 text-gray-500 text-sm"><UserOutlined /> {user.name}</div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchTransactions} loading={loading} shape="circle" />
        </div>
      </div>

      <DashboardStats ingresos={myIngresos} egresos={myEgresos} dateRange={dateRange} filters={filters} />
      <div className="h-6" />

      {/* Tablas */}
      <Card className="shadow-md rounded-xl border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
        <Tabs defaultActiveKey="ingresos" size="large" tabBarStyle={{ padding: '0 24px', backgroundColor: '#fff', marginBottom: 0 }}>
          
          <TabPane tab={<span><DollarOutlined /> Ventas</span>} key="ingresos">
            <div className="p-4">
              <TransactionTable
                type="ingresos"
                data={myIngresos}
                loading={loading}
                onRefresh={fetchTransactions} // Para borrar
                onEdit={(r) => openDrawer('ingreso', r)}
                onCreate={() => openDrawer('ingreso')}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                userName={user.name}
                onFiltersChange={setFilters}
              />
            </div>
          </TabPane>

          <TabPane tab={<span><AuditOutlined /> Gastos</span>} key="egresos">
            <div className="p-4">
              <TransactionTable
                type="egresos"
                data={myEgresos}
                loading={loading}
                onRefresh={fetchTransactions} // Para borrar
                onEdit={(r) => openDrawer('egreso', r)}
                onCreate={() => openDrawer('egreso')}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                userName={user.name}
                onFiltersChange={setFilters}
              />
            </div>
          </TabPane>

        </Tabs>
      </Card>

      {/* DRAWERS: Se les pasa handleSuccess en lugar de onSubmit */}
      
      <IngresoDrawer
        open={drawerState.ingreso}
        onClose={closeDrawers}
        initialValues={drawerState.editingRecord}
        onSuccess={handleSuccess} // <--- ESTO ACTUALIZA LA TABLA
        userName={user.name}
      />

      <EgresoDrawer
        open={drawerState.egreso}
        onClose={closeDrawers}
        initialValues={drawerState.editingRecord}
        onSuccess={handleSuccess} // <--- ESTO ACTUALIZA LA TABLA
        userName={user.name}
      />
    </div>
  );
}

export default Certificados;
