import React, { useState, useContext, useEffect } from 'react';
import { Outlet, Link, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Button, message } from 'antd';
import {
  BarChartOutlined,
  UserOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  FileProtectOutlined
} from '@ant-design/icons';
import loginimage from "../../images/sixNyx.jpg";
import { AuthContext } from "../AuthContext";
import axios from 'axios';

const { Header, Sider, Content } = Layout;

const Root = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const [userApp, setUserApp] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
       
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `https://back.app.validaciondebachillerato.com.co/auth/users/${userId}`
        );
        
      
        
        // Asegurarse de que los datos existen y tienen el formato esperado
        if (response.data && response.data.app) {
          setUserApp(response.data.app);
          
        } else {
          console.warn("La respuesta no contiene app:", response.data);
          // Establecer un valor predeterminado si no hay app
          setUserApp('feva');
        }
        
        if (response.data && response.data.name) {
          setCoordinatorName(response.data.name);
        }
        
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
        message.error("Error al cargar datos del usuario");
        // Establecer un valor predeterminado en caso de error
        setUserApp('feva');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Configuración de menús según el tipo de aplicación
  const menuConfig = {
    feva: [
      { key: '/inicio/dashboard', icon: <BarChartOutlined />, label: 'Tu trabajo' },
      { key: '/inicio/students', icon: <UserOutlined />, label: 'Estudiantes' },
      { key: '/inicio/programas', icon: <BookOutlined />, label: 'Programas' },
      { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias' },
      { key: '/inicio/calificaciones', icon: <FileProtectOutlined />, label: 'Calificaciones' },
    ],
    certificaciones: [
      { key: '/inicio/dashboard', icon: <BarChartOutlined />, label: 'Tu trabajo' },
      { key: '/inicio/certificados', icon: <FileProtectOutlined />, label: 'Certificados' }
    ],
    all: [
      { key: '/inicio/dashboard', icon: <BarChartOutlined />, label: 'Tu trabajo' },
      { key: '/inicio/students', icon: <UserOutlined />, label: 'Estudiantes' },
      { key: '/inicio/programas', icon: <BookOutlined />, label: 'Programas' },
      { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias' },
      { key: '/inicio/calificaciones', icon: <FileProtectOutlined />, label: 'Calificaciones' },
      { key: '/inicio/certificados', icon: <FileProtectOutlined />, label: 'Certificados' },
      { key: '/inicio/admin', icon: <SettingOutlined />, label: 'Administración' },
    ]
  };

  // Determinar qué menú mostrar según el userApp
  const getMenuItems = () => {
   
    
    // Si no hay userApp, mostrar un menú por defecto
    if (!userApp || userApp === '') {
      
      return menuConfig.feva;
    }
    
    // Si el tipo de app existe en menuConfig, usar ese menú
    if (menuConfig[userApp]) {
     
      return menuConfig[userApp];
    } 
    
    // Si no hay coincidencia, usar menú por defecto
    
    return menuConfig.feva;
  };

  const menuItems = getMenuItems();
 

  const toggleSidebar = () => setCollapsed(prev => !prev);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth="80"
        className="bg-gradient-to-b from-purple-600 to-blue-500"
      >
        <div className="flex items-center justify-center h-16">
          <Avatar src={loginimage} size={collapsed ? 32 : 48} />
          {!collapsed && <h1 className="text-white text-xl ml-2">SixNyx</h1>}
        </div>
        
        {loading ? (
          <div className="text-center text-white p-4">Cargando...</div>
        ) : (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems.map(item => ({
              key: item.key,
              icon: item.icon,
              label: <Link to={item.key}>{item.label}</Link>,
            }))}
          />
        )}
      </Sider>

      <Layout>
        <Header className="bg-white border-b border-gray-300 p-0 flex justify-between items-center">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            className="text-purple-700 text-xl w-16 h-16"
          />
          
          <div className="flex items-center mr-4 space-x-4">
            <Avatar src={loginimage} className="bg-purple-100" icon={<UserOutlined />} />
            <span className="text-purple-700 font-medium">{coordinatorName || 'Usuario'}</span>
            <Button 
              type="link" 
              icon={<LogoutOutlined className="text-red-500" />} 
              onClick={logout}
              className="text-red-500"
            >
              Cerrar sesión
            </Button>
          </div>
        </Header>

        <Content className="m-2 p-4 bg-white rounded-lg overflow-y-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default Root;