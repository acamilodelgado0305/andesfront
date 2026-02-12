import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Card, Typography, Button, Tag } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ReadOutlined,
  IdcardOutlined,
  BookOutlined,
  FileTextOutlined,
  SettingOutlined,
  BankOutlined,
  PaperClipOutlined,
  BuildOutlined,
  ShopOutlined,
  AppstoreOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext';

const { Title } = Typography;

const MENU_MASTER = [
  {
    key: '/inicio/dashboard',
    icon: <DashboardOutlined />,
    label: 'Panel de Control',
    path: '/inicio/dashboard'
  },
  {
    key: '/gestion-comercial',
    icon: <ShopOutlined />,
    label: 'Gestion Comercial (POS)',
    requiredModule: 'POS',
    children: [
      { key: '/inicio/certificados', icon: <BankOutlined />, label: 'Movimientos / Caja', path: '/inicio/certificados' },
      { key: '/inicio/inventario', icon: <BuildOutlined />, label: 'Inventario', path: '/inicio/inventario' },
      { key: '/inicio/personas', icon: <UsergroupAddOutlined />, label: 'Directorio Personas', path: '/inicio/personas' },
      { key: '/inicio/pedidos', icon: <UsergroupAddOutlined />, label: 'Pedidos', path: '/inicio/pedidos' },
    ]
  },
  {
    key: '/academic-management',
    icon: <ReadOutlined />,
    label: 'Gestion Academica',
    requiredModule: 'ACADEMICO',
    children: [
      { key: '/inicio/students', icon: <TeamOutlined />, label: 'Estudiantes', path: '/inicio/students' },
      { key: '/inicio/docentes', icon: <IdcardOutlined />, label: 'Docentes', path: '/inicio/docentes' },
      { key: '/inicio/programas', icon: <IdcardOutlined />, label: 'Programas', path: '/inicio/programas' },
      { key: '/inicio/materias', icon: <BookOutlined />, label: 'Materias', path: '/inicio/materias' },
      { key: '/inicio/evaluaciones', icon: <BookOutlined />, label: 'Evaluaciones', path: '/inicio/evaluaciones' },
      { key: '/inicio/calificaciones', icon: <FileTextOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
    ],
  },
  {
    key: '/otros-utilidades',
    icon: <AppstoreOutlined />,
    label: 'Otros / Utilidades',
    requiredModule: 'GENERACION',
    children: [
      { key: '/inicio/generacion', icon: <PaperClipOutlined />, label: 'Generacion Documentos', path: '/inicio/generacion' },
    ]
  },
  {
    key: '/admin-sistema',
    icon: <SettingOutlined />,
    label: 'Administracion',
    requiredModule: 'ADMIN',
    children: [
      { key: '/inicio/adminclients', icon: <SettingOutlined />, label: 'Configuracion Global', path: '/inicio/adminclients' },
    ]
  }
];

const EDUCATIONAL_MENU_CHILD_PATHS = ['/inicio/students', '/inicio/calificaciones'];

const isEducationalPlanUser = (currentUser) => {
  if (!currentUser || currentUser.role !== 'user') return false;
  const planText = [
    currentUser.plan_name,
    currentUser.plan,
    currentUser.plan_type,
    currentUser.planType,
    currentUser.app,
    currentUser.scope,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return planText.includes('educa');
};

const buildEducationalMenu = () => {
  const academicMenu = MENU_MASTER.find(m => m.key === '/academic-management');
  if (!academicMenu) return [];
  const filteredChildren = (academicMenu.children || []).filter(child =>
    EDUCATIONAL_MENU_CHILD_PATHS.includes(child.path)
  );
  if (!filteredChildren.length) return [];
  return [{ ...academicMenu, children: filteredChildren }];
};

const Home = () => {
  const [greeting, setGreeting] = useState('');
  const { user, loading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Buenos dias');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  const menuItems = useMemo(() => {
    if (!user) return [];

    if (isEducationalPlanUser(user)) {
      return buildEducationalMenu();
    }

    if (user.role === 'superadmin') {
      return MENU_MASTER;
    }

    if (user.role === 'docente' && (!user.modules || user.modules.length === 0)) {
      const academicMenu = MENU_MASTER.find(m => m.key === '/academic-management');
      const dashboard = MENU_MASTER.find(m => m.key === '/inicio/dashboard');
      return [dashboard, academicMenu].filter(Boolean);
    }

    const userModules = user.modules || [];
    return MENU_MASTER.filter(item => {
      if (!item.requiredModule) return true;
      return userModules.includes(item.requiredModule);
    });
  }, [user]);

  const flattenedItems = useMemo(() => {
    const items = [];
    menuItems.forEach((item) => {
      if (item.path) {
        items.push({
          key: item.path,
          label: item.label,
          icon: item.icon || <DashboardOutlined />,
          description: `Acceso a ${item.label.toLowerCase()}.`,
        });
      }
      if (item.children?.length) {
        item.children.forEach((child) => {
          items.push({
            key: child.path,
            label: child.label,
            icon: child.icon || <DashboardOutlined />,
            description: `Gestiona ${child.label.toLowerCase()}.`,
          });
        });
      }
    });
    return items;
  }, [menuItems]);

  const groupedItems = useMemo(() => {
    const groups = [];
    const generalItems = [];

    menuItems.forEach((item) => {
      if (item.path) {
        generalItems.push(item);
      }
      if (item.children?.length) {
        groups.push({ title: item.label, items: item.children });
      }
    });

    if (generalItems.length) {
      groups.unshift({ title: 'General', items: generalItems });
    }

    return groups;
  }, [menuItems]);

  const quickActions = useMemo(() => flattenedItems.slice(0, 6), [flattenedItems]);
  const isLoading = authLoading || !user;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Title level={2} className="!mb-1 text-slate-800">
                {greeting}, {user?.name || 'Usuario'}!
              </Title>
              <p className="text-slate-500">
                Panel principal con tu trabajo, accesos rapidos y estado general.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tag color="blue">Panel de control</Tag>
              <Tag color="green">Actualizado</Tag>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="text-center text-slate-500">Cargando opciones...</div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <Title level={4} className="!mb-1 text-slate-800">
                    Accesos rapidos
                  </Title>
                  <p className="text-sm text-slate-500">Tus funcionalidades clave, a un clic.</p>
                </div>
                <Button type="primary" className="bg-slate-900" size="middle">
                  Ver todo
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((item) => (
                  <Link key={item.key} to={item.key} className="group">
                    <div className="h-full rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-lg bg-white p-2 text-xl text-emerald-600 shadow-sm">
                          {item.icon}
                        </div>
                        <div className="text-base font-semibold text-slate-800 group-hover:text-slate-900">
                          {item.label}
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{item.description}</p>
                      <span className="mt-3 inline-block text-sm font-medium text-slate-700">
                        Ir ahora
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" id="todas-opciones">
              <div className="mb-4">
                <Title level={4} className="!mb-1 text-slate-800">
                  Todas las opciones
                </Title>
                <p className="text-sm text-slate-500">Mismo listado que el menu lateral de tu plan.</p>
              </div>
              <div className="space-y-6">
                {groupedItems.map((group) => (
                  <div key={group.title}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {group.title}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item) => (
                        <Link key={item.path} to={item.path} className="group">
                          <div className="h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
                            <div className="mb-2 flex items-center gap-3">
                              <div className="rounded-lg bg-slate-50 p-2 text-lg text-slate-700">
                                {item.icon}
                              </div>
                              <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                                {item.label}
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">Ir ahora</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 shadow-sm" bodyStyle={{ padding: 20 }}>
                <Title level={5} className="!mb-2 text-slate-800">
                  Tu trabajo
                </Title>
                <p className="text-sm text-slate-500">
                  Visualiza y organiza tus tareas por prioridad. Proximamente veras aqui
                  tus items y filtros rapidos.
                </p>
                <div className="mt-4 flex gap-2">
                  <Tag color="gold">Prioridad alta</Tag>
                  <Tag color="blue">Hoy</Tag>
                  <Tag color="green">Esta semana</Tag>
                </div>
              </Card>
              <Card className="border-0 shadow-sm" bodyStyle={{ padding: 20 }}>
                <Title level={5} className="!mb-2 text-slate-800">
                  Actividad reciente
                </Title>
                <p className="text-sm text-slate-500">
                  Aqui se mostraran los ultimos cambios, accesos y movimientos del sistema.
                </p>
                <Button type="link" className="mt-2 p-0 text-slate-700">
                  Ver historial
                </Button>
              </Card>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default Home;
