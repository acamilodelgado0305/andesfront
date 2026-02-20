import React, { useState, useContext, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Typography, Dropdown, ConfigProvider, Spin, Modal, List, message } from 'antd';
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
const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
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
    label: 'Administración Global',
    requiredRole: ['superadmin'], // <--- Solo superadmin
    children: [
      { key: '/inicio/adminclients', icon: <SettingOutlined />, label: 'Configurador General', path: '/inicio/adminclients' },
    ]
  },

  // --- 6. CONFIGURACIÓN DEL NEGOCIO ---
  {
    key: '/configuracion-negocio',
    icon: <SettingOutlined />,
    label: 'Configuración',
    requiredRole: ['admin', 'superadmin'], // <--- Solo admin del negocio
    children: [
      { key: '/inicio/usuarios-negocio', icon: <TeamOutlined />, label: 'Usuarios y Accesos', path: '/inicio/usuarios-negocio' },
    ]
  }
];

// =========================================================
// 🔒 RESTRICCIONES POR ROL para hijos de cada módulo
// =========================================================
// Define qué hijos puede ver cada rol dentro de un módulo.
// Si un rol NO está listado aquí, verá TODOS los hijos (sin restricción).
// Si un rol está listado, solo verá los paths indicados.
const ROLE_CHILD_RESTRICTIONS = {
  ACADEMICO: {
    user: ['/inicio/students', '/inicio/calificaciones'],
    // docente: ['/inicio/students', '/inicio/calificaciones', '/inicio/evaluaciones'],
  },
  // Puedes agregar restricciones para otros módulos:
  // POS: {
  //   user: ['/inicio/certificados'],
  // },
};

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
  const allowedPaths = ROLE_CHILD_RESTRICTIONS.ACADEMICO?.user || [];
  const filteredChildren = (academicMenu.children || []).filter(child =>
    allowedPaths.includes(child.path)
  );
  if (!filteredChildren.length) return [];
  return [{ ...academicMenu, children: filteredChildren }];
};

/**
 * Filtra los hijos de un item de menú según el rol del usuario
 * y las restricciones definidas en ROLE_CHILD_RESTRICTIONS.
 */
const applyChildRestrictions = (menuItem, userRole) => {
  if (!menuItem.children || !menuItem.requiredModule) return menuItem;

  const moduleRestrictions = ROLE_CHILD_RESTRICTIONS[menuItem.requiredModule];
  if (!moduleRestrictions) return menuItem; // No hay restricciones para este módulo

  const allowedPaths = moduleRestrictions[userRole];
  if (!allowedPaths) return menuItem; // Este rol no tiene restricciones, ve todo

  // Filtrar los hijos según las rutas permitidas
  const filteredChildren = menuItem.children.filter(child =>
    allowedPaths.includes(child.path)
  );

  // Si no quedan hijos después del filtro, ocultar el grupo completo
  if (!filteredChildren.length) return null;

  return { ...menuItem, children: filteredChildren };
};

const RootLayout = () => {
  // 1. OBTENER USUARIO DEL CONTEXTO
  const { user, login, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isSiderCollapsed, setIsSiderCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const timerRef = useRef(null);

  const [subscriptionData, setSubscriptionData] = useState({ endDate: null, amountPaid: null });
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
          const response = await axios.get(`${API_AUTH_URL}/api/subscriptions/expiration/${user.id}`);
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

    if (isEducationalPlanUser(user)) {
      return mapMenuToAntd(buildEducationalMenu());
    }

    // A. Si es SuperAdmin, devuelve TODO el menú maestro (sin restricciones de hijos),
    // pero respetando roles explícitos (ej. superadmin-only)
    if (user.role === 'superadmin') {
      const superAdminMenu = MENU_MASTER.filter(item => {
        if (item.requiredRole && !item.requiredRole.includes(user.role)) return false;
        return true;
      });
      return mapMenuToAntd(superAdminMenu);
    }

    // B. Si es 'Docente' (Legacy), podemos devolver un subconjunto específico
    // Para compatibilidad total, si no tiene modules pero es docente:
    if (user.role === 'docente' && (!user.modules || user.modules.length === 0)) {
      const academicMenu = MENU_MASTER.find(m => m.key === '/academic-management');
      const dashboard = MENU_MASTER.find(m => m.key === '/inicio/dashboard');
      const restrictedAcademic = academicMenu ? applyChildRestrictions(academicMenu, user.role) : null;
      return mapMenuToAntd([dashboard, restrictedAcademic].filter(Boolean));
    }

    // C. Filtrado Estándar basado en Módulos (ABAC) + restricciones por rol
    const userModules = user.modules || [];

    const filteredMenu = MENU_MASTER
      .filter(item => {
        // 0. Filtrado por rol específico si está definido en el item (ej: Configuración de Usuarios)
        if (item.requiredRole && !item.requiredRole.includes(user.role)) return false;

        // 1. Si no requiere módulo, pasa (salvo que ya haya fallado el rol)
        if (!item.requiredModule) return true;
        // 2. Si requiere módulo, verificamos si el usuario lo tiene
        return userModules.includes(item.requiredModule);
      })
      // 3. Aplicar restricciones de hijos según el rol del usuario
      .map(item => applyChildRestrictions(item, user.role))
      .filter(Boolean); // Eliminar items que quedaron null (sin hijos tras filtrar)

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

  // --- 4. DROPDOWN DE NEGOCIOS ---
  const handleBusinessSelect = async (business) => {
    if (user.bid === business.id) return;

    try {
      const { switchBusiness } = await import('../services/auth/authService');
      const response = await switchBusiness(business.id);

      if (response.token) {
        login(response.token, response.user);
        message.success(`Cambiado a ${business.name}`);
        navigate('/inicio');
      }
    } catch (error) {
      console.error("Error cambiando negocio", error);
      message.error("Error al cambiar de negocio.");
    }
  };

  const currentBusinessName = user?.business_name || 'Mi Negocio';
  const availableBusinesses = user?.businesses || [];

  const businessMenu = (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 py-2 mt-2">
      <div className="px-4 py-2 border-b border-gray-100 mb-1 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mis Negocios</span>
        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{availableBusinesses.length}</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto px-2">
        {availableBusinesses.map((business) => (
          <div
            key={business.id}
            onClick={() => handleBusinessSelect(business)}
            className={`flex items-center gap-3 p-2.5 mb-1 rounded-md cursor-pointer transition-all duration-200 group
              ${user.bid === business.id
                ? 'bg-[#155153]/5 border border-[#155153]/10'
                : 'hover:bg-gray-50 border border-transparent'}
            `}
          >
            <Avatar
              shape="square"
              size={40}
              icon={<ShopOutlined />}
              style={user.bid === business.id ? { backgroundColor: PRIMARY_COLOR } : {}}
              className={`rounded-md flex-shrink-0 transition-colors shadow-sm ${user.bid === business.id ? '' : 'bg-gray-200 group-hover:bg-gray-300'}`}
            />
            <div className="flex flex-col min-w-0">
              <span className={`text-sm font-bold truncate leading-tight ${user.bid === business.id ? 'text-[#155153]' : 'text-gray-700'}`}>
                {business.name}
              </span>
              <span className="text-[11px] text-gray-500 capitalize mt-0.5">
                {business.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
            {user.bid === business.id && (
              <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }}></div>
            )}
          </div>
        ))}
        {availableBusinesses.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs">Sin negocios disponibles</div>
        )}
      </div>
    </div>
  );

  // --- RENDER ---

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><Spin size="large" tip="Cargando sesión..." /></div>;
  }

  if (!authLoading && !user) {
    navigate('/login', { replace: true });
    return null;
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

              {/* SELECTOR DE NEGOCIO */}
              <Dropdown overlay={businessMenu} trigger={['click']} placement="bottomLeft">
                <div
                  className="hidden md:flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-md transition-all border border-transparent hover:border-gray-200"
                >
                  <Avatar shape="square" size="small" icon={<ShopOutlined />} style={{ backgroundColor: '#e6f4f4', color: PRIMARY_COLOR }} className="rounded-md" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Negocio</span>
                    <span className="text-sm font-bold text-gray-700 truncate max-w-[150px]">{currentBusinessName}</span>
                  </div>
                  {availableBusinesses.length > 1 && (
                    <span className="text-[10px] text-gray-400">▼</span>
                  )}
                </div>
              </Dropdown>
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
