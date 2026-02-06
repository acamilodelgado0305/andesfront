import React, { useState, useContext, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Typography, Dropdown, ConfigProvider, Spin } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ReadOutlined,
  IdcardOutlined,
  BookOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  BankOutlined,
  PaperClipOutlined,
  BuildOutlined,
  ShopOutlined,      // Icono POS
  AppstoreOutlined,  // Icono Otros
  UsergroupAddOutlined // Icono Personas
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const API_URL = import.meta.env.VITE_API_BACKEND;
const PRIMARY_COLOR = '#155153';

// =========================================================
// 📋 MENÚ MAESTRO (Definición única de toda la app)
// =========================================================
// 'requiredModule': Debe coincidir con lo que envía tu Backend en user.modules
// Si no tiene 'requiredModule', es público para cualquier usuario logueado.

const MENU_MASTER = [
  // --- 1. GENERAL (Todos lo ven) ---
  {
    key: '/inicio/dashboard',
    icon: <DashboardOutlined />,
    label: 'Panel de Control',
    path: '/inicio/dashboard'
  },

  // --- 2. GESTIÓN COMERCIAL (POS, Inventario, Caja) ---
  {
    key: '/gestion-comercial',
    icon: <ShopOutlined />,
    label: 'Gestión Comercial (POS)',
    requiredModule: 'POS', // <--- Módulo requerido
    children: [
      { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos / Caja', path: '/inicio/certificados' },
      { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
      { key: '/inicio/personas', icon: <UsergroupAddOutlined />, label: 'Directorio Personas', path: '/inicio/personas' },
      { key: '/inicio/pedidos', icon: <UsergroupAddOutlined />, label: 'Pedidos', path: '/inicio/pedidos' },
    ]
  },

  // --- 3. GESTIÓN ACADÉMICA ---
  {
    key: '/academic-management',
    icon: <ReadOutlined />,
    label: 'Gestión Académica',
    requiredModule: 'ACADEMICO', // <--- Módulo requerido
    children: [
      { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
      { key: '/inicio/docentes', icon: <IdcardOutlined />, label: 'Docentes', path: '/inicio/docentes' },
      { key: '/inicio/programas', icon: <IdcardOutlined />, label: 'Programas', path: '/inicio/programas' },
      { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias', path: '/inicio/materias' },
      { key: '/inicio/evaluaciones', icon: <BookOutlined />, label: 'Evaluaciones', path: '/inicio/evaluaciones' },
      { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
    ],
  },

  // --- 4. UTILIDADES / GENERACIÓN ---
  {
    key: '/otros-utilidades',
    icon: <AppstoreOutlined />,
    label: 'Otros / Utilidades',
    requiredModule: 'GENERACION', // <--- Módulo requerido
    children: [
      { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación Documentos', path: '/inicio/generacion' },
    ]
  },

  // --- 5. ADMINISTRACIÓN DEL SISTEMA ---
  {
    key: '/admin-sistema',
    icon: <SettingOutlined />,
    label: 'Administración',
    requiredModule: 'ADMIN', // <--- Módulo requerido
    children: [
      { key: '/inicio/adminclients', icon: <SettingOutlined />, label: 'Configuración Global', path: '/inicio/adminclients' },
    ]
  }
];

const RootLayout = () => {
  // 1. OBTENER USUARIO DEL CONTEXTO
  const { user, logout, loading: authLoading, login } = useContext(AuthContext);

  const [isSiderCollapsed, setIsSiderCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const timerRef = useRef(null);

  const [subscriptionData, setSubscriptionData] = useState({ endDate: null, amountPaid: null });
  const [switchingOrgId, setSwitchingOrgId] = useState(null);
  const location = useLocation();

  // --- LÓGICA RESPONSIVE ---
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSiderCollapsed(true);
        setMobileDrawerOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- LÓGICA SIDER HOVER ---
  const handleMouseEnter = () => {
    if (isMobile) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSiderCollapsed(false);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    timerRef.current = setTimeout(() => setIsSiderCollapsed(true), 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // --- 2. CARGAR SUSCRIPCIÓN ---
  useEffect(() => {
    const fetchSubscription = async () => {
      if (user && user.id) {
        try {
          const response = await axios.get(`${API_URL}/api/subscriptions/expiration/${user.id}`);
          if (response.data) {
            setSubscriptionData({
              endDate: response.data.end_date,
              amountPaid: response.data.amount_paid
            });
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      }
    };

    if (!authLoading && user) {
      fetchSubscription();
    }
  }, [user, authLoading]);

  const showExpirationWarning = () => {
    if (!subscriptionData.endDate) return null;
    const today = dayjs().startOf('day');
    const expirationDate = dayjs(subscriptionData.endDate).startOf('day');
    const daysLeft = expirationDate.diff(today, 'day');
    const isNearExpiration = daysLeft <= 5 && daysLeft >= 0;

    if (isNearExpiration) {
      const formattedAmount = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subscriptionData.amountPaid);
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="m-0">
            ⚠️ <strong>Atención:</strong> Tu plan vence en <strong>{daysLeft} día(s)</strong>. Monto a cancelar: <strong>{formattedAmount}</strong>.
          </p>
          <Button type="link" danger href="https://linkdepagospse.rappipay.co/U7pafq" target="_blank" rel="noopener noreferrer" style={{ paddingLeft: 0 }}>
            Renovar mi Plan Ahora
          </Button>
        </div>
      );
    }
    return null;
  };

  // =========================================================
  // 🚀 3. FILTRADO DINÁMICO DEL MENÚ (CORE LOGIC)
  // =========================================================
  const getDynamicMenuItems = () => {
    if (!user) return [];

    // A. Si es SuperAdmin, devuelve TODO el menú maestro
    if (user.role === 'superadmin') {
      return mapMenuToAntd(MENU_MASTER);
    }

    // B. Si es 'Docente' (Legacy), podemos devolver un subconjunto específico 
    // O mejor, asegurarnos de que el backend le envíe ['ACADEMICO'] en user.modules
    // Para compatibilidad total, si no tiene modules pero es docente:
    if (user.role === 'docente' && (!user.modules || user.modules.length === 0)) {
      // Filtramos manualmente solo la parte académica
      const academicMenu = MENU_MASTER.find(m => m.key === '/academic-management');
      const dashboard = MENU_MASTER.find(m => m.key === '/inicio/dashboard');
      return mapMenuToAntd([dashboard, academicMenu].filter(Boolean));
    }

    // C. Filtrado Estándar basado en Módulos (ABAC)
    const userModules = user.modules || []; // Array ej: ['POS', 'INVENTARIO']

    const filteredMenu = MENU_MASTER.filter(item => {
      // 1. Si no requiere módulo, es público (ej: Dashboard)
      if (!item.requiredModule) return true;

      // 2. Si requiere módulo, verificamos si el usuario lo tiene
      return userModules.includes(item.requiredModule);
    });

    return mapMenuToAntd(filteredMenu);
  };

  // Helper para convertir nuestra estructura al formato de Ant Design
  const mapMenuToAntd = (items) => {
    return items.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
      children: item.children?.map((child) => ({
        key: child.path,
        icon: child.icon,
        label: <Link to={child.path}>{child.label}</Link>,
      })),
    }));
  };

  const menuItems = getDynamicMenuItems();

  // --- MENÚ DE PERFIL ---
  const profileMenu = (
    <Menu items={[
      { key: '1', icon: <UserOutlined />, label: <Link to="/inicio/perfil">Mi Perfil</Link> },
      { key: '2', icon: <SettingOutlined />, label: <Link to="/inicio/configuracion">Configuración</Link> },
      { type: 'divider' },
      { key: '3', icon: <LogoutOutlined />, label: 'Cerrar Sesión', onClick: logout, danger: true },
    ]} />
  );

  const handleSwitchOrganization = async (organizationId) => {
    if (!organizationId || user?.organization?.id === organizationId) return;
    try {
      setSwitchingOrgId(organizationId);
      const authToken = localStorage.getItem('authToken');
      const { data } = await axios.post(
        `${API_URL}/api/organizations/switch`,
        { organization_id: organizationId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (data?.token) {
        // Reusa la lógica de AuthContext para refrescar sesión y user
        login(data.token, data.user);
      }
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setSwitchingOrgId(null);
    }
  };

  const organizationMenu = (
    <Menu
      items={(user?.organizations || []).map((org) => ({
        key: String(org.id),
        label: (
          <div className="flex flex-col">
            <span className="font-medium">{org.name}</span>
            {org.nit && <span className="text-xs text-gray-500">{org.nit}</span>}
          </div>
        ),
        onClick: () => handleSwitchOrganization(org.id),
      }))}
    />
  );

  // --- RENDER ---

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><Spin size="large" tip="Cargando sesión..." /></div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen">No hay sesión activa.</div>;
  }

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: PRIMARY_COLOR },
        components: {
          Menu: {
            itemHoverBg: '#e6f4f4',
            itemSelectedBg: PRIMARY_COLOR,
            itemSelectedColor: '#000000',
            // Estilo para submenús activos
            '.ant-menu-submenu-selected > .ant-menu-submenu-title > .ant-menu-title-content': {
              color: PRIMARY_COLOR,
              fontWeight: 'bold'
            },
          },
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#ffffff',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* Backdrop Móvil */}
        {isMobile && mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 999, transition: 'opacity 0.3s' }}
          />
        )}

        <Sider
          collapsible
          collapsed={isMobile ? false : isSiderCollapsed}
          trigger={null}
          width={260}
          breakpoint="md"
          collapsedWidth={isMobile ? 0 : 80}
          style={{
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
            borderRight: '1px solid #f0f0f0',
            position: isMobile ? 'fixed' : 'relative',
            left: isMobile ? (mobileDrawerOpen ? 0 : -260) : 'auto',
            zIndex: 1000,
            height: '100vh',
            overflow: 'auto',
            transition: 'all 0.3s',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* LOGO */}
          <div className="flex items-center justify-start h-16 p-4 border-b border-gray-100">
            <Link to="/inicio" className="flex items-start gap-2">
              {(!isSiderCollapsed || isMobile) ? (
                <Title level={4} className="!m-0 whitespace-nowrap" style={{ color: PRIMARY_COLOR }}>
                  Controla
                </Title>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#155153] flex items-center justify-center text-white font-bold">
                  C
                </div>
              )}
            </Link>
          </div>

          {/* MENÚ DINÁMICO */}
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            // Abrir automáticamente los grupos principales si no está colapsado
            defaultOpenKeys={!isSiderCollapsed ? ['/gestion-comercial', '/academic-management'] : []}
            items={menuItems.map(item => ({
              ...item,
              onClick: isMobile ? () => setMobileDrawerOpen(false) : undefined,
              children: item.children?.map(child => ({
                ...child,
                onClick: isMobile ? () => setMobileDrawerOpen(false) : undefined,
              }))
            }))}
            style={{ borderRight: 'none', paddingTop: '10px' }}
          />
        </Sider>

        <Layout className="site-layout">
          <Header style={{ padding: isMobile ? '0 16px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 998, backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Button
                type="text"
                icon={isMobile
                  ? (mobileDrawerOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />)
                  : (isSiderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
                }
                onClick={() => isMobile ? setMobileDrawerOpen(!mobileDrawerOpen) : setIsSiderCollapsed(!isSiderCollapsed)}
                style={{ fontSize: '18px', width: 48, height: 48 }}
              />

              {user?.organization?.name && (
                <Dropdown overlay={organizationMenu} trigger={['click']}>
                  <Button type="text" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BankOutlined />
                    <span className="text-sm font-semibold text-gray-800">
                      {switchingOrgId ? 'Cambiando...' : user.organization.name}
                    </span>
                  </Button>
                </Dropdown>
              )}
            </div>

            <Dropdown overlay={profileMenu} trigger={['click']}>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                <Avatar style={{ backgroundColor: PRIMARY_COLOR }} size="large">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-semibold hidden md:inline text-sm text-gray-800">
                    {user.name || 'Usuario'}
                  </span>
                  <div className="flex gap-1 items-center">
                    <span className="hidden md:inline text-xs text-gray-500 capitalize">
                      {user.role}
                    </span>
                    {user.modules && user.modules.length > 0 && user.role !== 'superadmin' && (
                      <span className="hidden md:inline text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                        {user.modules.includes('POS') ? 'POS' : 'Edu'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Dropdown>
          </Header>

          <Content style={{ overflow: 'initial', padding: isMobile ? '16px' : '24px' }}>
            <div style={{ minHeight: 360 }}>
              {showExpirationWarning()}
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default RootLayout;
