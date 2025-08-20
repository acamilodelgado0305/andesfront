import React, { useState, useContext, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, message, Typography, Dropdown, ConfigProvider, Spin } from 'antd';
import { DashboardOutlined, TeamOutlined, ReadOutlined, BookOutlined, FileTextOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, SettingOutlined, UserOutlined, BankOutlined, PaperClipOutlined, BuildOutlined  } from '@ant-design/icons';
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
    { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
    {
      key: '/academic-management',
      icon: <ReadOutlined />,
      label: 'Gestión Académica',
      children: [
        { key: '/inicio/programas', icon: <BookOutlined />, label: 'Programas Académicos', path: '/inicio/programas' },
        { key: '/inicio/materias', icon: <BookOutlined />, label: 'Asignaturas', path: '/inicio/materias' },
      ],
    },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
     { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
    { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
  ],
  certificaciones: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
    { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
    { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación de Documentos', path: '/inicio/generacion' },
     
  ],
  all: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
    { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación de Documentos', path: '/inicio/generacion' },
    { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
    {
      key: '/academic-management',
      icon: <ReadOutlined />,
      label: 'Gestión Académica',
      children: [
        { key: '/inicio/programas', icon: <BookOutlined />, label: 'Programas Académicos', path: '/inicio/programas' },
        { key: '/inicio/materias', icon: <BookOutlined />, label: 'Asignaturas', path: '/inicio/materias' },
      ],
    },
    { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
    { key: '/inicio/adminclients', icon: <SettingOutlined />, label: 'Administración', path: '/inicio/adminclients' },
  ],
  docente: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
  ],
};

const RootLayout = () => {
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: '', role: '', app: 'feva' });
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState({ endDate: null, amountPaid: null });
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

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

        // Dentro de useEffect -> fetchUserProfile
        const subscriptionResponse = await axios.get(`${API_URL}/subscriptions/expiration/${userId}`);
        if (subscriptionResponse.data) {
          // Transformamos los datos de snake_case a camelCase aquí
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
    // Usamos las propiedades camelCase que ya corregimos en el estado
    if (!subscriptionData.endDate) return null;

    // Creamos objetos dayjs para hoy y la fecha de vencimiento,
    // ajustados al inicio del día para un cálculo más intuitivo.
    const today = dayjs().startOf('day');
    const expirationDate = dayjs(subscriptionData.endDate).startOf('day');

    const daysLeft = expirationDate.diff(today, 'day');

    // La condición sigue siendo la misma: mostrar si quedan 30 días o menos.
    const isNearExpiration = daysLeft <= 5 && daysLeft >= 0;

    if (isNearExpiration) {
      const formattedAmount = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(subscriptionData.amountPaid);

      return (
        <div style={{ padding: '16px', background: '#fff1f0', border: '1px solid #ffa39e', margin: '16px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            ⚠️ **Atención:** Tu plan está próximo a vencer. Renueva para continuar sin interrupciones. <br />
            Vence en <strong>{daysLeft} día(s)</strong> (el {dayjs(subscriptionData.endDate).format('DD/MM/YYYY')}). Monto a cancelar: <strong>{formattedAmount}</strong>.
          </p>
          <Button
            type="primary"
            danger
            href="https://linkdepagospse.rappipay.co/U7pafq"
            target="_blank" // <-- Abre el enlace en una nueva pestaña
            rel="noopener noreferrer" // <-- Buena práctica de seguridad para enlaces externos
          >
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

  const toggleSider = () => setIsSiderCollapsed((prev) => !prev);

  const menuItems = getMenuItems().map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
    children: item.children?.map((child) => ({
      key: child.key,
      icon: child.icon,
      label: <Link to={child.path}>{child.label}</Link>,
    })),
  }));

  const profileMenu = (
    <Menu
      items={[
        { key: '1', icon: <UserOutlined />, label: <Link to="/inicio/perfil">Mi Perfil</Link> },
        { key: '2', icon: <SettingOutlined />, label: <Link to="/inicio/configuracion">Configuración</Link> },
        { type: 'divider' },
        { key: '3', icon: <LogoutOutlined />, label: 'Cerrar Sesión', onClick: logout, danger: true },
      ]}
    />
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spin size="large" /></div>;
  }

  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: PRIMARY_COLOR }, components: { Menu: { itemHoverBg: '#e6f4f4', itemSelectedBg: PRIMARY_COLOR, itemSelectedColor: '#ffffff' }, Layout: { headerBg: '#ffffff', siderBg: '#ffffff' } } }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={isSiderCollapsed} onCollapse={(value) => setIsSiderCollapsed(value)} trigger={null} width={240} breakpoint="lg" style={{ boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)', borderRight: '1px solid #f0f0f0' }}>
          <div className="flex items-center justify-start h-16 p-4">
            <Link to="/inicio" className="flex items-start gap-2">
              {!isSiderCollapsed && <Title level={4} className="!m-0 whitespace-nowrap" style={{ color: PRIMARY_COLOR }}>Controla</Title>}
            </Link>
          </div>
          <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} style={{ borderRight: 'none' }} />
        </Sider>
        <Layout className="site-layout">
          <Header style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
            <Button type="text" icon={isSiderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggleSider} style={{ fontSize: '18px' }} />
            <Dropdown overlay={profileMenu} trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar style={{ backgroundColor: PRIMARY_COLOR }}>{userProfile.name.charAt(0).toUpperCase()}</Avatar>
                <span className="font-semibold hidden md:inline">{userProfile.name}</span>
              </div>
            </Dropdown>
          </Header>
          <Content style={{ overflow: 'initial' }}>
            <div style={{ minHeight: 360, background: '#fff' }}>
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