import React, { useState, useEffect, useContext,useMemo } from 'react';
import { Card, Tabs, Typography, Button, message, Spin } from 'antd';
import { ReloadOutlined, UserOutlined, PlusOutlined, MinusOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/es';
import axios from 'axios';

import { AuthContext } from '../../AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

// Importamos SOLO las funciones de lectura para la tabla principal
import { getAllIngresos, getAllEgresos } from '../../services/controlapos/posService';
import { getInventario } from '../../services/inventario/inventarioService';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

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
  const isMobile = useIsMobile();
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
    vendedor: null,
  });

  const [inventario, setInventario] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  // --- CARGA DE DATOS (REFRESH) ---
  // Siempre recibe el rango activo para filtrar en el backend (no solo en cliente)
  const fetchTransactions = async (range = dateRange) => {
    if (!user) return;
    setLoading(true);
    try {
      const [ingresosData, egresosData] = await Promise.all([
        getAllIngresos({
          fecha_inicio: range[0].clone().startOf('day').toISOString(),
          fecha_fin:    range[1].clone().endOf('day').toISOString(),
          limit: 5000,
        }),
        getAllEgresos({
          fecha_inicio: range[0].clone().startOf('day').toISOString(),
          fecha_fin:    range[1].clone().endOf('day').toISOString(),
        }),
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

  // Cuando el usuario cambia el rango de fechas → refetch inmediato con nuevo rango
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    fetchTransactions(newRange);
  };

  useEffect(() => {
    fetchTransactions();
    fetchInventario();
    fetchVendedores();
  }, [user]);

  const fetchInventario = async () => {
    try {
      const data = await getInventario();
      const items = Array.isArray(data) ? data : (data?.data || []);
      setInventario(items);
    } catch (e) {
      console.error('Error cargando inventario', e);
    }
  };

  const fetchVendedores = async () => {
    try {
      const { data } = await axios.get(`${API_AUTH_URL}/api/businesses/my/users`, getAuthHeaders());
      setVendedores(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando vendedores', e);
    }
  };

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
    closeDrawers();
    fetchTransactions(dateRange); // recarga respetando el rango activo
  };

  if (!user) return <div className="p-10 flex justify-center"><Spin size="large" /></div>;

  return (
    <div className="p-4 md:p-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <Title level={4} style={{ margin: 0, color: '#155153' }}>Panel Financiero</Title>
            <div className="flex items-center gap-2 text-gray-500 text-sm"><UserOutlined /> {user.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={() => openDrawer('ingreso')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '10px 20px',
                flex: isMobile ? 1 : 'none',
                background: '#166534',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <PlusOutlined style={{ fontSize: 11 }} />
              Ingreso
            </button>

            <button
              onClick={() => openDrawer('egreso')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '10px 20px',
                flex: isMobile ? 1 : 'none',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <MinusOutlined style={{ fontSize: 11 }} />
              Gasto
            </button>

            <Button icon={<ReloadOutlined />} onClick={() => fetchTransactions(dateRange)} loading={loading} shape="circle" />
          </div>
        </div>
      </div>

      {/* Tabla + Stats integrados */}
      <Card className="shadow-md rounded-xl border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
        <Tabs defaultActiveKey="ingresos" size={isMobile ? 'middle' : 'large'} tabBarStyle={{ padding: isMobile ? '0 12px' : '0 24px', backgroundColor: '#fff', marginBottom: 0 }}>

          <TabPane tab={<span style={{ fontWeight: 600 }}><ArrowUpOutlined style={{ color: '#16a34a' }} /> Ingresos</span>} key="ingresos">
            <div className="p-4">
              <div className="mb-4">
                <DashboardStats ingresos={myIngresos} egresos={myEgresos} dateRange={dateRange} filters={filters} />
              </div>
              <TransactionTable
                type="ingresos"
                data={myIngresos}
                loading={loading}
                onRefresh={fetchTransactions}
                onEdit={(r) => openDrawer('ingreso', r)}
                onCreate={() => openDrawer('ingreso')}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                userName={user.name}
                onFiltersChange={setFilters}
                inventario={inventario}
                vendedores={vendedores}
              />
            </div>
          </TabPane>

          <TabPane tab={<span style={{ fontWeight: 600 }}><ArrowDownOutlined style={{ color: '#dc2626' }} /> Gastos</span>} key="egresos">
            <div className="p-4">
              <div className="mb-4">
                <DashboardStats ingresos={myIngresos} egresos={myEgresos} dateRange={dateRange} filters={filters} />
              </div>
              <TransactionTable
                type="egresos"
                data={myEgresos}
                loading={loading}
                onRefresh={fetchTransactions}
                onEdit={(r) => openDrawer('egreso', r)}
                onCreate={() => openDrawer('egreso')}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                userName={user.name}
                onFiltersChange={setFilters}
                inventario={inventario}
                vendedores={vendedores}
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
