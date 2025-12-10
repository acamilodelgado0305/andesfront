import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Card, Tabs, Typography, Button, message, Spin } from 'antd';
import {
  DollarOutlined,
  AuditOutlined,
  ReloadOutlined,
  UserOutlined
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/es';

import { AuthContext } from '../../AuthContext';
import {
  getAllIngresos,
  getAllEgresos,
  createIngreso,
  updateIngreso,
  createEgreso,
  updateEgreso
} from '../../services/controlapos/posService';

import IngresoDrawer from './components/IngresoDrawer';

import DashboardStats from './DashboardStats';
import TransactionTable from './TransactionTable';
import EgresoDrawer from './components/EgresoDrawer';


const { Title } = Typography;
const { TabPane } = Tabs;

moment.locale('es');

function Certificados() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [rawDataIngresos, setRawDataIngresos] = useState([]);
  const [rawDataEgresos, setRawDataEgresos] = useState([]);

  const [selectedDate, setSelectedDate] = useState(moment());

  const [drawerState, setDrawerState] = useState({
    ingreso: false,
    egreso: false,
    editingRecord: null,
  });

  // arriba de todo
  const [filters, setFilters] = useState({
    payment: null,
    product: null,
    day: null,
  });


  // RANGO DE FECHAS DEL MES SELECCIONADO
  const dateRange = useMemo(() => {
    const start = selectedDate.clone().startOf('month');
    const end = selectedDate.clone().endOf('month');
    return [start, end];
  }, [selectedDate]);

  // NAVEGACIÓN DE AÑO / MES (estado centralizado aquí)
  const handleYearChange = (year) => {
    const newDate = selectedDate.clone().year(year);
    setSelectedDate(newDate);
  };

  const handleMonthChange = (direction) => {
    const newDate = direction === 'next'
      ? selectedDate.clone().add(1, 'month')
      : selectedDate.clone().subtract(1, 'month');
    setSelectedDate(newDate);
  };

  const handleCurrentMonthClick = () => {
    setSelectedDate(moment());
  };

  // Cargar datos
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
      message.error("Error conectando con el servidor contable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // Filtrar por usuario (luego puedes quitar el || true)
  const myIngresos = useMemo(() => {
    if (!user?.name || !Array.isArray(rawDataIngresos)) return [];
    return rawDataIngresos.filter(item => {
      const isOwner = item.vendedor?.toLowerCase() === user.name.toLowerCase();
      return isOwner || true;
    });
  }, [rawDataIngresos, user]);

  const myEgresos = useMemo(() => {
    if (!user?.name || !Array.isArray(rawDataEgresos)) return [];
    return rawDataEgresos.filter(item => {
      const isOwner = item.vendedor?.toLowerCase() === user.name.toLowerCase();
      return isOwner || true;
    });
  }, [rawDataEgresos, user]);

  // CRUD Drawers
  const handleIngresoSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values, vendedor: user.name };
      if (drawerState.editingRecord) {
        await updateIngreso(drawerState.editingRecord._id, payload);
        message.success("Venta actualizada");
      } else {
        await createIngreso(payload);
        message.success("Venta creada");
      }
      closeDrawers();
      fetchTransactions();
    } catch (error) {
      message.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleEgresoSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values, vendedor: user.name };
      if (drawerState.editingRecord) {
        await updateEgreso(drawerState.editingRecord._id, payload);
        message.success("Egreso actualizado");
      } else {
        await createEgreso(payload);
        message.success("Egreso creado");
      }
      closeDrawers();
      fetchTransactions();
    } catch (error) {
      message.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = (type, record = null) =>
    setDrawerState({ ...drawerState, [type]: true, editingRecord: record });

  const closeDrawers = () =>
    setDrawerState({ ingreso: false, egreso: false, editingRecord: null });

  if (!user) {
    return (
      <div className="p-10 flex justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Lista de años (puedes ajustarla)
  const yearsList = [];
  for (let i = 2024; i <= 2030; i++) {
    yearsList.push(i);
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* Encabezado simple */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <Title level={4} style={{ margin: 0, color: '#155153' }}>
              Panel Financiero
            </Title>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <UserOutlined /> {user.name}
            </div>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTransactions}
            loading={loading}
            shape="circle"
          />
        </div>
      </div>

      {/* Stats con rango de fechas (mes/año seleccionados) */}
      <DashboardStats
        ingresos={myIngresos}
        egresos={myEgresos}
        dateRange={dateRange}
        filters={filters}   // <- nuevo
      />


      <div className="h-6" />

      {/* Tablas */}
     <Card
        className="shadow-md rounded-xl border-0 overflow-hidden"
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          defaultActiveKey="ingresos"
          size="large"
          tabBarStyle={{ padding: '0 24px', backgroundColor: '#fff', marginBottom: 0 }}
        >
          {/* TAB VENTAS (INGRESOS) */}
          <TabPane tab={<span><DollarOutlined /> Ventas</span>} key="ingresos">
            <div className="p-4">
              <TransactionTable
                type="ingresos"
                data={myIngresos}
                loading={loading}
                onRefresh={fetchTransactions}
                onEdit={(r) => openDrawer('ingreso', r)}
                onCreate={() => openDrawer('ingreso')}
                dateRange={dateRange}
                userName={user.name}
                selectedDate={selectedDate}
                onMonthChange={handleMonthChange}
                onYearChange={handleYearChange}
                onCurrentMonthClick={handleCurrentMonthClick}
                yearsList={yearsList}
                onFiltersChange={setFilters}   // 🔹 IMPORTANTE: aquí también
              />
            </div>
          </TabPane>

          {/* TAB GASTOS (EGRESOS) */}
          <TabPane tab={<span><AuditOutlined /> Gastos</span>} key="egresos">
            <div className="p-4">
              <TransactionTable
                type="egresos"                  // 🔹 debe ser egresos
                data={myEgresos}                // 🔹 usar mis egresos
                loading={loading}
                onRefresh={fetchTransactions}
                onEdit={(r) => openDrawer('egreso', r)}   // 🔹 drawer de egreso
                onCreate={() => openDrawer('egreso')}
                dateRange={dateRange}
                userName={user.name}
                selectedDate={selectedDate}
                onMonthChange={handleMonthChange}
                onYearChange={handleYearChange}
                onCurrentMonthClick={handleCurrentMonthClick}
                yearsList={yearsList}
                onFiltersChange={setFilters}   // 🔹 comparte filtros
              />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <IngresoDrawer
        open={drawerState.ingreso}
        onClose={closeDrawers}
        initialValues={drawerState.editingRecord}
        onSubmit={handleIngresoSubmit}
        loading={loading}
        userName={user.name}
      />

      <EgresoDrawer
        open={drawerState.egreso}
        onClose={closeDrawers}
        initialValues={drawerState.editingRecord}
        onSubmit={handleEgresoSubmit}
        loading={loading}
        userName={user.name}
      />
    </div>
  );
}

export default Certificados;
