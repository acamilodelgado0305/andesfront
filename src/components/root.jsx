import React, { useState, useContext, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, message, Typography, Dropdown, ConfigProvider, Spin } from 'antd';
import { 
  DashboardOutlined, TeamOutlined, ReadOutlined, IdcardOutlined, 
  BookOutlined, FileTextOutlined, MenuFoldOutlined, MenuUnfoldOutlined, 
  LogoutOutlined, SettingOutlined, UserOutlined, BankOutlined, 
  PaperClipOutlined, BuildOutlined 
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext'; // <--- Importamos el contexto
import axios from 'axios';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const API_URL = import.meta.env.VITE_API_BACKEND;
const PRIMARY_COLOR = '#155153';

// Configuración de Menús (Sin cambios)
const MENU_CONFIG = {
  feva: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    {
      key: '/academic-management',
      icon: <ReadOutlined />,
      label: 'Gestión Académica',
      children: [
        { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
        { key: '/inicio/docentes', icon: <IdcardOutlined />, label: 'Docentes', path: '/inicio/docentes' },
        { key: '/inicio/programas', icon: <IdcardOutlined />, label: 'Programas', path: '/inicio/programas' },
        { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias', path: '/inicio/materias' },
        { key: '/inicio/evaluaciones', icon: <BookOutlined />, label: 'Evaluaciones', path: '/inicio/evaluaciones' },
        { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
      ],
    },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
    { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
  ],
  certificaciones: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
    { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
    { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación de Documentos', path: '/inicio/generacion' },
  ],
  all: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    {
      key: '/academic-management',
      icon: <ReadOutlined />,
      label: 'Gestión Académica',
      children: [
        { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
        { key: '/inicio/docentes', icon: <IdcardOutlined />, label: 'Docentes', path: '/inicio/docentes' },
        { key: '/inicio/programas', icon: <IdcardOutlined />, label: 'Programas', path: '/inicio/programas' },
        { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias', path: '/inicio/materias' },
        { key: '/inicio/evaluaciones', icon: <BookOutlined />, label: 'Evaluaciones', path: '/inicio/evaluaciones' },
        { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
      ],
    },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
    { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación de Documentos', path: '/inicio/generacion' },
    { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
    { key: '/inicio/adminclients', icon: <SettingOutlined />, label: 'Administración', path: '/inicio/adminclients' },
  ],
  docente: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
  ],
};

const RootLayout = () => {
  // 1. OBTENER USUARIO DEL CONTEXTO (Fuente de la verdad)
  const { user, logout, loading: authLoading } = useContext(AuthContext);
  
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const timerRef = useRef(null);

  const [subscriptionData, setSubscriptionData] = useState({ endDate: null, amountPaid: null });
  const location = useLocation();

  // Detectar móvil
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

  // Lógica del Sider Hover
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

  // 2. CARGAR SUSCRIPCIÓN (Usando el ID real del contexto)
  useEffect(() => {
    const fetchSubscription = async () => {
      // Solo ejecutamos si el usuario ya cargó en el contexto
      if (user && user.id) {
        try {
          // Usamos user.id (o user.bid si es el ID de negocio) según tu token
          const response = await axios.get(`${API_URL}/api/subscriptions/expiration/${user.id}`);
          if (response.data) {
            setSubscriptionData({
              endDate: response.data.end_date,
              amountPaid: response.data.amount_paid
            });
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
          // No bloqueamos la UI si falla la suscripción
        }
      }
    };

    if (!authLoading) {
      fetchSubscription();
    }
  }, [user, authLoading]);

  // Alerta de expiración
  const showExpirationWarning = () => {
    if (!subscriptionData.endDate) return null;
    const today = dayjs().startOf('day');
    const expirationDate = dayjs(subscriptionData.endDate).startOf('day');
    const daysLeft = expirationDate.diff(today, 'day');
    const isNearExpiration = daysLeft <= 5 && daysLeft >= 0;

    if (isNearExpiration) {
      const formattedAmount = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subscriptionData.amountPaid);
      return (
        <div style={{ padding: '16px', background: '#fff1f0', border: '1px solid #ffa39e', margin: '16px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            ⚠️ <strong>Atención:</strong> Tu plan vence en <strong>{daysLeft} día(s)</strong>. Monto a cancelar: <strong>{formattedAmount}</strong>.
          </p>
          <Button type="primary" danger href="https://linkdepagospse.rappipay.co/U7pafq" target="_blank" rel="noopener noreferrer">
            Renovar mi Plan Ahora
          </Button>
        </div>
      );
    }
    return null;
  };

  // 3. DETERMINAR MENÚ SEGÚN EL ROL DEL CONTEXTO
  const getMenuItems = () => {
    if (!user) return []; // Si no hay usuario, menú vacío
    
    // Usamos user.role y user.app (si existe en el token, sino default 'feva')
    const role = user.role || 'guest';
    const app = user.app || 'feva'; 

    if (role === 'docente') return MENU_CONFIG.docente;
    return MENU_CONFIG[app] || MENU_CONFIG.feva;
  };

  const menuItems = getMenuItems().map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
    children: item.children?.map((child) => ({
      key: child.path,
      icon: child.icon,
      label: <Link to={child.path}>{child.label}</Link>,
    })),
  }));

  const profileMenu = (
    <Menu items={[
      { key: '1', icon: <UserOutlined />, label: <Link to="/inicio/perfil">Mi Perfil</Link> },
      { key: '2', icon: <SettingOutlined />, label: <Link to="/inicio/configuracion">Configuración</Link> },
      { type: 'divider' },
      { key: '3', icon: <LogoutOutlined />, label: 'Cerrar Sesión', onClick: logout, danger: true },
    ]} />
  );

  // Si el AuthContext está cargando, mostramos spinner global
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><Spin size="large" tip="Cargando sesión..." /></div>;
  }

  // Si terminó de cargar pero no hay usuario (caso raro si hay rutas protegidas), manejamos null
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
            '.ant-menu-submenu-selected > .ant-menu-submenu-title > .ant-menu-title-content': {
              color: PRIMARY_COLOR,
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
        {/* Backdrop para móvil */}
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
          width={240}
          breakpoint="md"
          collapsedWidth={isMobile ? 0 : 80}
          style={{
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
            borderRight: '1px solid #f0f0f0',
            position: isMobile ? 'fixed' : 'relative',
            left: isMobile ? (mobileDrawerOpen ? 0 : -240) : 'auto',
            zIndex: 1000,
            height: '100vh',
            overflow: 'auto',
            transition: 'all 0.3s',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center justify-start h-16 p-4">
            <Link to="/inicio" className="flex items-start gap-2">
              {(!isSiderCollapsed || isMobile) && <Title level={4} className="!m-0 whitespace-nowrap" style={{ color: PRIMARY_COLOR }}>Controla</Title>}
            </Link>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems.map(item => ({
                ...item,
                onClick: isMobile ? () => setMobileDrawerOpen(false) : undefined,
                children: item.children?.map(child => ({
                    ...child,
                    onClick: isMobile ? () => setMobileDrawerOpen(false) : undefined,
                }))
            }))}
            style={{ borderRight: 'none' }}
          />
        </Sider>

        <Layout className="site-layout">
          <Header style={{ padding: isMobile ? '0 16px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 998, backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {isMobile && (
                <Button
                  type="text"
                  icon={mobileDrawerOpen ? <MenuFoldOutlined style={{ fontSize: '20px' }} /> : <MenuUnfoldOutlined style={{ fontSize: '20px' }} />}
                  onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                  style={{ fontSize: '16px', width: 40, height: 40 }}
                />
              )}
            </div>
            
            {/* 4. INDICADOR DE USUARIO LOGUEADO (Desde AuthContext) */}
            <Dropdown overlay={profileMenu} trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                <Avatar style={{ backgroundColor: PRIMARY_COLOR }}>
                   {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <div className="flex flex-col items-start leading-tight">
                    <span className="font-semibold hidden md:inline text-sm text-gray-800">
                        {user.name || 'Usuario'}
                    </span>
                    <span className="hidden md:inline text-xs text-gray-500 capitalize">
                        {user.role || 'Rol'}
                    </span>
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