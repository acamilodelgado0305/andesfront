import React, { useState, useContext, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, message, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ReadOutlined,
  BookOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  BankOutlined,
  PaperClipOutlined 
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext';
import axios from 'axios';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Configuración de menús por rol y aplicación
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
    { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
  ],
  certificaciones: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
    { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación de Documentos', path: '/inicio/generacion' },
  ],
  all: [
    { key: '/inicio/dashboard', icon: <DashboardOutlined />, label: 'Panel de Control', path: '/inicio/dashboard' },
    { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
    { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
      { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generación de Documentos', path: '/inicio/generacion' },
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
    
    { key: '/inicio/admin', icon: <SettingOutlined />, label: 'Administración', path: '/inicio/admin' },
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
  const location = useLocation();
  const { logout } = useContext(AuthContext);

  // Fetch user data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const response = await axios.get(
          `https://clasit-backend-api-570877385695.us-central1.run.app/auth/users/${userId}`
        );

        if (response.data) {
          setUserProfile({
            name: response.data.name || 'Usuario',
            role: response.data.role || '',
            app: response.data.app || 'feva',
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

  // Determinar los ítems del menú según el rol y la aplicación
  const getMenuItems = () => {
    // Si el usuario es docente, mostrar solo el menú de docente
    if (userProfile.role === 'docente') {
      return MENU_CONFIG.docente;
    }

    // Si no hay userApp o es vacío, mostrar menú por defecto
    if (!userProfile.app || userProfile.app === '') {
      return MENU_CONFIG.feva;
    }

    // Si el tipo de app existe en MENU_CONFIG, usar ese menú
    if (MENU_CONFIG[userProfile.app]) {
      return MENU_CONFIG[userProfile.app];
    }

    // Si no hay coincidencia, usar menú por defecto
    return MENU_CONFIG.feva;
  };

  // Toggle del sidebar
  const toggleSider = () => setIsSiderCollapsed((prev) => !prev);

  // Generar ítems del menú para Ant Design
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

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        width={260}
        collapsible
        collapsed={isSiderCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={80}
        style={{ background: '#fff', boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="p-4 flex items-center justify-between h-16 border-b">
          {!isSiderCollapsed && (
            <Text strong style={{ fontSize: 20, color: '#1a73e8' }}>
              Classuite
            </Text>
          )}
          {isSiderCollapsed && (
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1a73e8' }} />
          )}
        </div>

        {isLoading ? (
          <div className="text-center p-4">
            <Text>Cargando...</Text>
          </div>
        ) : (
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ borderRight: 'none' }}
          />
        )}
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={isSiderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSider}
            style={{ fontSize: 18, width: 64, height: 64, color: '#1a73e8' }}
          />

          <div className="flex items-center space-x-4">
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1a73e8' }} />
            <Text strong style={{ color: '#1a73e8' }}>
              {userProfile.name}
            </Text>
            <Button
              type="link"
              icon={<LogoutOutlined style={{ color: '#ff4d4f' }} />}
              onClick={logout}
              style={{ color: '#ff4d4f' }}
            >
              Cerrar Sesión
            </Button>
          </div>
        </Header>

        <Content
          style={{
            margin: '16px',
            padding: '24px',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default RootLayout;