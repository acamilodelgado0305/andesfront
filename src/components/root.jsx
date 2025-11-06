import React, { useState, useContext, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, message, Typography, Dropdown, ConfigProvider, Spin } from 'antd';
import { DashboardOutlined, TeamOutlined, ReadOutlined,IdcardOutlined , BookOutlined, FileTextOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, SettingOutlined, UserOutlined, BankOutlined, PaperClipOutlined, BuildOutlined  } from '@ant-design/icons';
import { AuthContext } from '../AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const API_URL = import.meta.env.VITE_API_BACKEND;
const API_AUTH = import.meta.env.VITE_API_AUTH;

const PRIMARY_COLOR = '#155153';

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
        { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias', path: '/inicio/materias' },
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
        { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias', path: '/inicio/materias' },
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
  // =============================================================================
  // PARTE 2: LÓGICA DEL SIDER DINÁMICO
  // =============================================================================
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(true); // Inicia colapsado por defecto
  const timerRef = useRef(null); // Ref para el temporizador
  
  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current); // Cancela cualquier colapso pendiente
    }
    setIsSiderCollapsed(false); // Expande el menú
  };

  const handleMouseLeave = () => {
    // Inicia un temporizador para colapsar el menú después de 1 segundo
    timerRef.current = setTimeout(() => {
      setIsSiderCollapsed(true);
    }, 1000); // 1000 ms = 1 segundo de retardo
  };

  useEffect(() => {
    // Limpieza: Asegura que el temporizador se elimine si el componente se desmonta
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // (El resto de tus estados y hooks permanecen igual)
  const [userProfile, setUserProfile] = useState({ name: '', role: '', app: 'feva' });
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState({ endDate: null, amountPaid: null });
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  
  // (Tu useEffect para fetchUserProfile y la lógica de showExpirationWarning permanecen sin cambios...)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const response = await axios.get(`${API_AUTH}/users/${userId}`);
        if (response.data) {
          setUserProfile({
            name: response.data.name || 'Usuario',
            role: response.data.role || '',
            app: response.data.app || 'feva',
          });
        }
        const subscriptionResponse = await axios.get(`${API_URL}/subscriptions/expiration/${userId}`);
        if (subscriptionResponse.data) {
          setSubscriptionData({
            endDate: subscriptionResponse.data.end_date,
            amountPaid: subscriptionResponse.data.amount_paid
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        message.error('No se pudieron cargar los datos del usuario');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

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
            ⚠️ **Atención:** Tu plan está próximo a vencer. Vence en <strong>{daysLeft} día(s)</strong>. Monto a cancelar: <strong>{formattedAmount}</strong>.
          </p>
          <Button type="primary" danger href="https://linkdepagospse.rappipay.co/U7pafq" target="_blank" rel="noopener noreferrer">
            Renovar mi Plan Ahora
          </Button>
        </div>
      );
    }
    return null;
  };

  const getMenuItems = () => {
    if (userProfile.role === 'docente') return MENU_CONFIG.docente;
    if (!userProfile.app || userProfile.app === '') return MENU_CONFIG.feva;
    return MENU_CONFIG[userProfile.app] || MENU_CONFIG.feva;
  };

  const menuItems = getMenuItems().map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
    children: item.children?.map((child) => ({
      key: child.path, // Usar el path como key es más robusto para la selección
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
    ]}/>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spin size="large" /></div>;
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
            
            // SOLUCIÓN DEFINITIVA: Esta regla es más específica.
            // Apunta directamente al SPAN dentro del título del submenú seleccionado.
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
        <Sider
          // ... (props del Sider sin cambios)
          collapsible
          collapsed={isSiderCollapsed}
          trigger={null}
          width={240}
          style={{ boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)', borderRight: '1px solid #f0f0f0', transition: 'width 0.2s' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
            {/* ... Contenido del Sider sin cambios ... */}
            <div className="flex items-center justify-start h-16 p-4">
              <Link to="/inicio" className="flex items-start gap-2">
                {!isSiderCollapsed && <Title level={4} className="!m-0 whitespace-nowrap" style={{ color: PRIMARY_COLOR }}>Controla</Title>}
              </Link>
            </div>
            <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} style={{ borderRight: 'none' }} />
        </Sider>
        <Layout className="site-layout">
          {/* ... Header y Content sin cambios ... */}
          <Header style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
            <div></div>
            <Dropdown overlay={profileMenu} trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar style={{ backgroundColor: PRIMARY_COLOR }}>{userProfile.name.charAt(0).toUpperCase()}</Avatar>
                <span className="font-semibold hidden md:inline">{userProfile.name}</span>
              </div>
            </Dropdown>
          </Header>
          <Content style={{ overflow: 'initial' }}>
            <div style={{ minHeight: 360, background: '#fff' }}>
                <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default RootLayout;
