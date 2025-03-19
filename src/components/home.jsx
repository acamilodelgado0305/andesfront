import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Typography, Button } from 'antd';
import {
  BarChartOutlined,
  UserOutlined,
  BookOutlined,
  FileProtectOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

const Home = () => {
  const [greeting, setGreeting] = useState('');
  const [userApp, setUserApp] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [loading, setLoading] = useState(true);

  // Configuración de accesos directos según el tipo de app (igual que en Root)
  const menuConfig = {
    feva: [
      { key: '/inicio/dashboard', icon: <BarChartOutlined className="text-purple-500" />, label: 'Tu trabajo', description: 'Revisa tus estadísticas y progreso' },
      { key: '/inicio/students', icon: <UserOutlined className="text-purple-500" />, label: 'Estudiantes', description: 'Gestiona la información de los estudiantes' },
      { key: '/inicio/programas', icon: <BookOutlined className="text-purple-500" />, label: 'Programas', description: 'Administra los programas académicos' },
      { key: '/inicio/materias', icon: <BookOutlined className="text-purple-500" />, label: 'Materias', description: 'Configura las materias disponibles' },
    ],
    certificaciones: [
      { key: '/inicio/dashboard', icon: <BarChartOutlined className="text-purple-500" />, label: 'Tu trabajo', description: 'Revisa tus estadísticas y progreso' },
      { key: '/inicio/certificados', icon: <FileProtectOutlined className="text-purple-500" />, label: 'Certificados', description: 'Gestiona los certificados emitidos' },
    ],
    all: [
      { key: '/inicio/dashboard', icon: <BarChartOutlined className="text-purple-500" />, label: 'Tu trabajo', description: 'Revisa tus estadísticas y progreso' },
      { key: '/inicio/students', icon: <UserOutlined className="text-purple-500" />, label: 'Estudiantes', description: 'Gestiona la información de los estudiantes' },
      { key: '/inicio/programas', icon: <BookOutlined className="text-purple-500" />, label: 'Programas', description: 'Administra los programas académicos' },
      { key: '/inicio/materias', icon: <BookOutlined className="text-purple-500" />, label: 'Materias', description: 'Configura las materias disponibles' },
      { key: '/inicio/certificados', icon: <FileProtectOutlined className="text-purple-500" />, label: 'Certificados', description: 'Gestiona los certificados emitidos' },
      { key: '/inicio/admin', icon: <SettingOutlined className="text-purple-500" />, label: 'Administración', description: 'Configura el sistema' },
    ],
  };

  // Determinar el saludo según la hora
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Buenos días');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  // Obtener datos del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setUserApp('feva'); // Valor por defecto
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `https://back.app.validaciondebachillerato.com.co/auth/users/${userId}`
        );

        if (response.data && response.data.app) {
          setUserApp(response.data.app);
        } else {
          setUserApp('feva');
        }

        if (response.data && response.data.name) {
          setCoordinatorName(response.data.name);
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
        setUserApp('feva');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const getMenuItems = () => {
    if (!userApp || userApp === '') {
      return menuConfig.feva;
    }
    return menuConfig[userApp] || menuConfig.feva;
  };

  const menuItems = getMenuItems();

  return (
    <main className="p-4 md:p-8 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Title level={2} className="text-blue-700 mb-8">
          {greeting}, {coordinatorName || 'Usuario'}!
        </Title>

        {loading ? (
          <div className="text-center text-blue-500">Cargando opciones...</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <Card
                key={item.key}
                hoverable
                className="shadow-md border-0"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl text-purple-500">{item.icon}</div>
                  <div>
                    <Link to={item.key}>
                      <Title level={4} className="text-blue-700 mb-1 hover:text-purple-500">
                        {item.label}
                      </Title>
                    </Link>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
                <Button
                  type="link"
                  className="mt-4 text-blue-500 hover:text-purple-500 p-0"
                >
                  <Link to={item.key}>Ir ahora</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Home;