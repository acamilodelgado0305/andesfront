import React, { useState, useContext } from 'react'; // Asegúrate de importar useContext
import { Outlet, Link, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Button } from 'antd';
import {
  BarChartOutlined,
  UserOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Logo from "../../images/logo.png";
import { AuthContext } from "../AuthContext";

const { Header, Sider, Content } = Layout;

const Root = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useContext(AuthContext);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout(); // Llama a la función logout del contexto
  };

  const menuItems = [
    { key: '/inicio/dashboard', icon: <BarChartOutlined />, label: 'Dashboard' },
    { key: '/inicio/students', icon: <UserOutlined />, label: 'Estudiantes' },
    { key: '/inicio/programas', icon: <BookOutlined />, label: 'Programas' },
    { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias' }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}
        breakpoint="lg" collapsedWidth="80"
        onBreakpoint={(broken) => {
          if (broken) {
            setCollapsed(true);
          }
        }}>
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
      </Sider>
      <Layout>
        <Header className="bg-white p-0 flex justify-between items-center">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            className="text-xl w-16 h-16"
          />
          <div className="flex items-center mr-4">
            <Avatar src={Logo} className="mr-2" />
            <span className="mr-4">IFEVA</span>
            <Button type="link" icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Header>
        <Content className="m-2 p-2 bg-white rounded-lg overflow-y-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default Root;
