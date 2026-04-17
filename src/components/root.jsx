import React, { useState, useContext, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Button, Avatar, Typography, Dropdown, ConfigProvider, Spin, Modal, message, Form, Input, Select, Tag, Divider, Switch } from 'antd';
import {
  HomeOutlined,
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
  ShopOutlined,
  AppstoreOutlined,
  UsergroupAddOutlined,
  PlusOutlined,
  SwapOutlined,
  InboxOutlined,
  ContactsOutlined,
  ShoppingCartOutlined,
  UserSwitchOutlined,
  TrophyOutlined,
  BarChartOutlined,
  FileDoneOutlined,
  ToolOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';
import OnboardingWizard from './Onboarding/OnboardingWizard';

const { Title } = Typography;

const API_URL = import.meta.env.VITE_API_BACKEND;
const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY_COLOR = '#1d4ed8';
const PRIMARY_DARK  = '#0a1f3d';

// =========================================================
// 📋 MENÚ MAESTRO (Definición única de toda la app)
// =========================================================
// 'requiredModule': Debe coincidir con lo que envía tu Backend en user.modules
// Si no tiene 'requiredModule', es público para cualquier usuario logueado.

const MENU_MASTER = [
  // --- 1. GENERAL (Todos lo ven) ---
  {
    key: '/inicio/dashboard',
    icon: <HomeOutlined />,
    label: 'Inicio',
    path: '/inicio/dashboard'
  },

  // --- 2. GESTIÓN COMERCIAL (POS, Inventario, Caja) ---
  {
    key: '/gestion-comercial',
    icon: <ShopOutlined />,
    label: 'Gestión Comercial (POS)',
    requiredModule: 'POS', // <--- Módulo requerido
    children: [
      { key: '/inicio/certificados', icon: <SwapOutlined />,      label: 'Movimientos',  path: '/inicio/certificados' },
      { key: '/inicio/inventario',   icon: <InboxOutlined />,     label: 'Inventario',   path: '/inicio/inventario' },
      { key: '/inicio/personas',     icon: <ContactsOutlined />,  label: 'Contactos',    path: '/inicio/personas' },
      { key: '/inicio/pedidos',      icon: <ShoppingCartOutlined />, label: 'Pedidos',   path: '/inicio/pedidos' },
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
      { key: '/inicio/docentes', icon: <UserSwitchOutlined />, label: 'Docentes', path: '/inicio/docentes' },
      { key: '/inicio/programas', icon: <ReadOutlined />, label: 'Programas', path: '/inicio/programas' },
      { key: '/inicio/evaluaciones', icon: <TrophyOutlined />, label: 'Evaluaciones', path: '/inicio/evaluaciones' },
      { key: '/inicio/calificaciones', icon: <BarChartOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
    ],
  },

  // --- 4. UTILIDADES / GENERACIÓN ---
  {
    key: '/otros-utilidades',
    icon: <AppstoreOutlined />,
    label: 'Otros / Utilidades',
    requiredModule: 'GENERACION', // <--- Módulo requerido
    children: [
      { key: '/inicio/generacion', icon: <FileDoneOutlined />, label: 'Generación Documentos', path: '/inicio/generacion' },
    ]
  },

  // --- 5. ADMINISTRACIÓN DEL SISTEMA ---
  {
    key: '/admin-sistema',
    icon: <SettingOutlined />,
    label: 'Administración Global',
    requiredRole: ['superadmin'], // <--- Solo superadmin
    children: [
      { key: '/inicio/adminclients', icon: <CrownOutlined />, label: 'Configurador General', path: '/inicio/adminclients' },
    ]
  },

  // --- 6. CONFIGURACIÓN DEL NEGOCIO ---
  {
    key: '/configuracion-negocio',
    icon: <SettingOutlined />,
    label: 'Configuración',
    requiredRole: ['admin', 'superadmin'], // <--- Solo admin del negocio
    children: [
      { key: '/inicio/usuarios-negocio', icon: <ToolOutlined />, label: 'Administración', path: '/inicio/usuarios-negocio' },
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

// =========================================================
// 🎁 TRIAL BANNER — Se muestra cuando el usuario tiene prueba activa
// =========================================================
const TrialBanner = ({ user, navigate }) => {
  if (!user?.is_trial) return null;

  const today = dayjs().startOf('day');
  const trialEnd = dayjs(user.trial_ends_at).startOf('day');
  const daysLeft = trialEnd.diff(today, 'day');

  if (daysLeft < 0) return null;

  const totalDays = 14;
  const daysUsed = Math.max(0, totalDays - daysLeft);
  const progressPercent = Math.round((daysUsed / totalDays) * 100);
  const isUrgent = daysLeft <= 3;

  return (
    <div
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
          : 'linear-gradient(135deg, #030d1f 0%, #1d4ed8 100%)',
        color: 'white',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 997,
        borderBottom: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      {/* Left: message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{isUrgent ? '⚠️' : '🎉'}</span>
        <div style={{ lineHeight: 1.3 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {isUrgent ? '¡Tu prueba gratuita está por terminar!' : 'Estás disfrutando de tu prueba gratuita'}
          </span>
          <span style={{ opacity: 0.85, fontSize: 12, marginLeft: 6 }}>
            Quedan <strong>{daysLeft} día{daysLeft !== 1 ? 's' : ''}</strong>
          </span>
        </div>
      </div>

      {/* Right: progress + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: '0.5px' }}>
            {daysUsed} / {totalDays} días usados
          </span>
          <div
            style={{
              width: 130,
              height: 5,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: isUrgent ? '#fca5a5' : '#6ee7b7',
                borderRadius: 3,
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
        <button
          onClick={() => navigate('/precios')}
          style={{
            backgroundColor: 'white',
            color: isUrgent ? '#b91c1c' : '#1d4ed8',
            border: 'none',
            borderRadius: 6,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          Ver planes
        </button>
      </div>
    </div>
  );
};

const RootLayout = () => {
  // 1. OBTENER USUARIO DEL CONTEXTO
  const { user, login, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isSiderCollapsed, setIsSiderCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const timerRef = useRef(null);

  // Onboarding wizard: se muestra automáticamente si el user está en trial y
  // aún no completó el onboarding. Se puede cerrar ("Más tarde") para volver
  // a mostrarse en el próximo login.
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!authLoading && user) {
      const shouldShow = user.is_trial && !user.onboarding_completed_at;
      setShowOnboarding(shouldShow);
    }
  }, [user, authLoading]);

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
  // 🚀 3. MENÚ PLANO POR SECCIONES
  // =========================================================
  // Devuelve array de secciones: [{ sectionLabel, sectionColor, items: [{key, icon, label, path}] }]
  const getNavSections = () => {
    if (!user) return [];

    const userModules = user.modules || [];
    const hasPOS      = user.role === 'superadmin' || userModules.includes('POS');
    const hasACAD     = user.role === 'superadmin' || userModules.includes('ACADEMICO') || isEducationalPlanUser(user);
    const hasGEN      = user.role === 'superadmin' || userModules.includes('GENERACION');
    const isSuperAdmin = user.role === 'superadmin';
    const isAdmin      = ['admin', 'superadmin'].includes(user.role);
    const isDocente    = user.role === 'docente';
    const hasBoth      = hasPOS && hasACAD;

    const sections = [];

    // — General —
    sections.push({
      sectionLabel: null,
      items: [{ key: '/inicio/dashboard', icon: <HomeOutlined />, label: 'Inicio', path: '/inicio/dashboard' }],
    });

    // — Gestión Empresarial —
    if (hasPOS) {
      sections.push({
        sectionLabel: hasBoth ? 'Gestión Empresarial' : null,
        sectionColor: '#1d4ed8',
        items: [
          { key: '/inicio/certificados', icon: <SwapOutlined />,       label: 'Movimientos',  path: '/inicio/certificados' },
          { key: '/inicio/inventario',   icon: <InboxOutlined />,      label: 'Inventario',          path: '/inicio/inventario' },
          { key: '/inicio/personas',     icon: <ContactsOutlined />,   label: 'Contactos', path: '/inicio/personas' },
          { key: '/inicio/pedidos',      icon: <ShoppingCartOutlined />, label: 'Pedidos',             path: '/inicio/pedidos' },
        ],
      });
    }

    // — Gestión Académica —
    if (hasACAD) {
      let acadItems = [
        { key: '/inicio/students',       icon: <TeamOutlined />,     label: 'Estudiantes',   path: '/inicio/students' },
        { key: '/inicio/docentes',       icon: <UserSwitchOutlined />, label: 'Docentes',      path: '/inicio/docentes' },
        { key: '/inicio/programas',      icon: <ReadOutlined />,       label: 'Programas',     path: '/inicio/programas' },
        { key: '/inicio/evaluaciones',   icon: <TrophyOutlined />,     label: 'Evaluaciones',  path: '/inicio/evaluaciones' },
        { key: '/inicio/calificaciones', icon: <BarChartOutlined />, label: 'Calificaciones', path: '/inicio/calificaciones' },
      ];
      // Restricción para rol 'user' educativo o docente
      if (user.role === 'user' || isDocente) {
        const allowed = ROLE_CHILD_RESTRICTIONS.ACADEMICO?.user || [];
        acadItems = acadItems.filter(i => allowed.includes(i.path));
      }
      sections.push({
        sectionLabel: hasBoth ? 'Gestión Académica' : null,
        sectionColor: '#7c3aed',
        items: acadItems,
      });
    }

    // — Utilidades —
    if (hasGEN) {
      sections.push({
        sectionLabel: null,
        items: [
          { key: '/inicio/generacion', icon: <FileDoneOutlined />, label: 'Generación Documentos', path: '/inicio/generacion' },
        ],
      });
    }

    // — Configuración del negocio —
    if (isAdmin) {
      sections.push({
        sectionLabel: null,
        items: [
          { key: '/inicio/usuarios-negocio', icon: <ToolOutlined />, label: 'Administración', path: '/inicio/usuarios-negocio' },
        ],
      });
    }

    // — Administración Global —
    if (isSuperAdmin) {
      sections.push({
        sectionLabel: null,
        items: [
          { key: '/inicio/adminclients', icon: <CrownOutlined />, label: 'Configurador General', path: '/inicio/adminclients' },
        ],
      });
    }

    return sections;
  };

  const navSections = getNavSections();

  // --- 4. DROPDOWN DE NEGOCIOS ---
  const [switchingBusiness, setSwitchingBusiness] = useState(false);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [createBusinessLoading, setCreateBusinessLoading] = useState(false);
  const [publicPlans, setPublicPlans] = useState([]);
  const [useCurrentUser, setUseCurrentUser] = useState(true);
  const [createBusinessForm] = Form.useForm();

  const MODULE_COLORS = { POS: 'green', ACADEMICO: 'blue', INVENTARIO: 'cyan', GENERACION: 'magenta', ADMIN: 'red' };

  const openCreateBusiness = async () => {
    if (publicPlans.length === 0) {
      try {
        const { data } = await axios.get(`${API_AUTH_URL}/api/admin/plans`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        setPublicPlans(data);
      } catch (e) {
        message.error('No se pudieron cargar los planes.');
        return;
      }
    }
    setUseCurrentUser(true);
    createBusinessForm.resetFields();
    setIsCreateBusinessOpen(true);
  };

  const handleCreateBusiness = async (values) => {
    setCreateBusinessLoading(true);
    try {
      const { data: created } = await axios.post(
        `${API_AUTH_URL}/api/admin/businesses`,
        {
          businessName: values.businessName,
          planId: values.planId,
          useCurrentUser,
          adminName: useCurrentUser ? undefined : values.adminName,
          adminEmail: useCurrentUser ? undefined : values.adminEmail,
          adminPassword: useCurrentUser ? undefined : values.adminPassword,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );

      message.success(`Negocio "${values.businessName}" creado. Cambiando contexto...`);
      setIsCreateBusinessOpen(false);
      createBusinessForm.resetFields();

      // Cambiar al nuevo negocio para renovar el token (incluye el negocio en la lista)
      const { switchBusiness } = await import('../services/auth/authService');
      const response = await switchBusiness(created.business.id);
      if (response.token) {
        login(response.token, response.user);
        window.location.replace('/inicio');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al crear el negocio.';
      message.error(errorMsg);
      setCreateBusinessLoading(false);
    }
  };

  const handleBusinessSelect = async (business) => {
    if (user.bid === business.id || switchingBusiness) return;

    setSwitchingBusiness(true);
    try {
      const { switchBusiness } = await import('../services/auth/authService');
      const response = await switchBusiness(business.id);

      if (response.token) {
        login(response.token, response.user);
        message.success(`Cambiado a ${business.name}`);
        // Forzar recarga completa para limpiar todo el estado cacheado
        window.location.replace('/inicio');
      }
    } catch (error) {
      console.error("Error cambiando negocio", error);
      message.error("Error al cambiar de negocio.");
      setSwitchingBusiness(false);
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
        {switchingBusiness && (
          <div className="flex items-center justify-center py-4 gap-2 text-gray-500 text-xs">
            <Spin size="small" /> Cambiando negocio...
          </div>
        )}
        {!switchingBusiness && availableBusinesses.map((business) => (
          <div
            key={business.id}
            onClick={() => handleBusinessSelect(business)}
            className={`flex items-center gap-3 p-2.5 mb-1 rounded-md cursor-pointer transition-all duration-200 group
              ${user.bid === business.id
                ? 'bg-[#1d4ed8]/5 border border-[#1d4ed8]/10'
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
              <span className={`text-sm font-bold truncate leading-tight ${user.bid === business.id ? 'text-[#1d4ed8]' : 'text-gray-700'}`}>
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
      {user?.role === 'superadmin' && (
        <div className="px-2 pt-2 pb-1 border-t border-gray-100 mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); openCreateBusiness(); }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold text-[#1d4ed8] border border-dashed border-[#1d4ed8]/40 hover:bg-[#1d4ed8]/5 transition-colors"
          >
            <PlusOutlined /> Crear Nuevo Negocio
          </button>
        </div>
      )}
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

  // Menú de perfil para el avatar (modo colapsado)
  const collapsedProfileMenu = (
    <Menu items={[
      { key: '1', icon: <SettingOutlined />, label: <Link to="/inicio/configuracion">Configuración</Link> },
      { type: 'divider' },
      { key: '2', icon: <LogoutOutlined />, label: 'Cerrar Sesión', onClick: logout, danger: true },
    ]} />
  );

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: PRIMARY_COLOR },
        components: {
          Menu: {
            itemHoverBg: '#dbeafe',
            itemSelectedBg: PRIMARY_COLOR,
            itemSelectedColor: '#ffffff',
          },
          Layout: {
            siderBg: '#ffffff',
          },
        },
      }}
    >
      {/* Layout raíz: sidebar fijo encima, contenido ocupa todo el ancho */}
      <div style={{ minHeight: '100vh', backgroundImage: 'linear-gradient(to bottom, #fff1eb 0%, #dff0fb 100%)', backgroundAttachment: 'fixed' }}>

        {/* ── Backdrop ── */}
        {(!isSiderCollapsed || (isMobile && mobileDrawerOpen)) && (
          <div
            onClick={() => { setIsSiderCollapsed(true); setMobileDrawerOpen(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'transparent' }}
          />
        )}

        {/* ── Botón hamburger (móvil) ── */}
        {isMobile && (
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            style={{
              position: 'fixed', top: 12, left: 12, zIndex: 1002,
              width: 36, height: 36, borderRadius: 8, border: 'none',
              backgroundColor: '#fff', color: '#374151', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(0,0,0,0.15)', fontSize: 15,
            }}
          >
            {mobileDrawerOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </button>
        )}

        {/* ===== SIDEBAR ===== */}
        {(() => {
          const expanded = !isSiderCollapsed || (isMobile && mobileDrawerOpen);
          const W_EXP  = 232;
          const W_COL  = 56;
          const siderW = isMobile ? (mobileDrawerOpen ? W_EXP : 0) : (expanded ? W_EXP : W_COL);

          const collapsed = !expanded;

          return (
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: siderW,
                zIndex: 1000,
                overflow: 'hidden',
                transition: 'width 0.22s ease',
                backgroundColor: '#fff',
                borderRight: '1px solid #e9eaec',
                boxShadow: expanded ? '2px 0 16px rgba(0,0,0,0.08)' : 'none',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* ── Logo ── */}
              <div style={{
                height: 52, display: 'flex', alignItems: 'center',
                padding: collapsed ? '0 12px' : '0 16px',
                borderBottom: '1px solid #e9eaec', flexShrink: 0,
                justifyContent: collapsed ? 'center' : 'flex-start', gap: 8,
              }}>
                <Link to="/inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/images/logo.png" alt="Rapictrl" style={{ height: 28, width: 28, objectFit: 'contain', flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                      Rapictrl
                    </span>
                  )}
                </Link>
              </div>

              {/* ── Nav ── */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0' }}>
                {navSections.map((section, si) => (
                  <div key={si}>
                    {/* Etiqueta de sección (solo expandido, solo si tiene label) */}
                    {section.sectionLabel && !collapsed && (
                      <div style={{ padding: '12px 16px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          {section.sectionLabel}
                        </span>
                        <div style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
                      </div>
                    )}
                    {/* Divisor sutil en colapsado entre secciones con label */}
                    {section.sectionLabel && collapsed && si > 0 && (
                      <div style={{ margin: '4px 10px', height: 1, backgroundColor: '#f0f0f0' }} />
                    )}

                    {section.items.map(item => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.key}
                          to={item.path}
                          onClick={() => { isMobile && setMobileDrawerOpen(false); }}
                          style={{ textDecoration: 'none', display: 'block', padding: '1px 6px' }}
                        >
                          <div
                            title={collapsed ? item.label : undefined}
                            style={{
                              display: 'flex', alignItems: 'center',
                              gap: 10,
                              padding: collapsed ? '7px 0' : '7px 10px',
                              justifyContent: collapsed ? 'center' : 'flex-start',
                              borderRadius: 7,
                              backgroundColor: isActive ? '#eff6ff' : 'transparent',
                              color: isActive ? '#1d4ed8' : '#4b5563',
                              fontWeight: isActive ? 600 : 400,
                              fontSize: 13,
                              cursor: 'pointer',
                              transition: 'background 0.12s, color 0.12s',
                            }}
                            className={!isActive ? 'hover:bg-gray-100 hover:!text-gray-900' : ''}
                          >
                            <span style={{ fontSize: 14, flexShrink: 0, color: isActive ? '#1d4ed8' : '#6b7280' }}>
                              {item.icon}
                            </span>
                            {!collapsed && (
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.label}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* ── Footer: usuario ── */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #e9eaec' }}>
                <Dropdown overlay={collapsedProfileMenu} trigger={['click']} placement="topRight">
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 0' : '10px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                    className="hover:bg-gray-50"
                  >
                    <Avatar
                      size={30}
                      style={{ backgroundColor: '#e5e7eb', color: '#374151', fontSize: 13, fontWeight: 700, flexShrink: 0 }}
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                    {!collapsed && (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.name || 'Usuario'}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>
                            {user.role}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); logout(); }}
                          title="Cerrar sesión"
                          style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: '#9ca3af', border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                          className="hover:bg-red-50 hover:!text-red-500"
                        >
                          <LogoutOutlined style={{ fontSize: 13 }} />
                        </button>
                      </>
                    )}
                  </div>
                </Dropdown>
              </div>
            </div>
          );
        })()}

        {/* ===== ÁREA PRINCIPAL ===== */}
        <div style={{ marginLeft: isMobile ? 0 : 56, minHeight: '100vh', transition: 'margin-left 0.22s ease' }}>

          {/* ── HEADER TRANSPARENTE ── */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 990,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e9eaec',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: isMobile ? '0 16px 0 56px' : '0 24px',
            height: 52,
            gap: 12,
          }}>

            {/* Izquierda: selector de negocio */}
            <Dropdown overlay={businessMenu} trigger={['click']} placement="bottomLeft">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', padding: '4px 10px 4px 6px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.07)',
                backgroundColor: 'rgba(255,255,255,0.5)',
                transition: 'background 0.15s',
                maxWidth: 220,
              }}
                className="hover:bg-white/80"
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  backgroundColor: '#1d4ed8', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontSize: 12,
                }}>
                  <ShopOutlined />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>Negocio</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentBusinessName}
                  </div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: 9, flexShrink: 0 }}>▾</span>
              </div>
            </Dropdown>

            {/* Derecha: perfil */}
            <Dropdown overlay={collapsedProfileMenu} trigger={['click']} placement="bottomRight">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
                transition: 'background 0.15s', flexShrink: 0,
              }}
                className="hover:bg-white/60"
              >
                <Avatar
                  size={28}
                  style={{ backgroundColor: '#e5e7eb', color: '#374151', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{user.name || 'Usuario'}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>{user.role}</div>
                </div>
              </div>
            </Dropdown>
          </div>

          <TrialBanner user={user} navigate={navigate} />

          <div style={{ padding: isMobile ? '16px' : '24px' }}>
            {showExpirationWarning()}
            <Outlet />
          </div>
        </div>

      </div>

      {/* MODAL: CREAR NEGOCIO (superadmin) */}
      <Modal
        title={<span className="flex items-center gap-2"><ShopOutlined /> Crear Nuevo Negocio</span>}
        open={isCreateBusinessOpen}
        onCancel={() => { setIsCreateBusinessOpen(false); createBusinessForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={520}
        style={{ top: 20 }}
      >
        <Form form={createBusinessForm} layout="vertical" onFinish={handleCreateBusiness}>
          <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">Datos del Negocio</Divider>
          <Form.Item name="businessName" label="Nombre del Negocio" rules={[{ required: true, message: 'Ingresa el nombre del negocio' }]}>
            <Input placeholder="Ej: Colegio Los Andes" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">Administrador</Divider>

          {/* Toggle: mi usuario o usuario nuevo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 12px', background: useCurrentUser ? '#eff6ff' : '#fafafa', borderRadius: 8, border: '1px solid', borderColor: useCurrentUser ? '#1d4ed8' + '33' : '#e5e7eb' }}>
            <Switch
              checked={useCurrentUser}
              onChange={(val) => {
                setUseCurrentUser(val);
                createBusinessForm.resetFields(['adminName', 'adminEmail', 'adminPassword']);
              }}
              style={{ backgroundColor: useCurrentUser ? PRIMARY_COLOR : undefined }}
            />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: useCurrentUser ? PRIMARY_COLOR : '#374151' }}>
                {useCurrentUser ? `Usar mi usuario (${user?.name})` : 'Crear nuevo usuario admin'}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {useCurrentUser ? 'Este negocio quedará asociado a tu cuenta' : 'Se creará un usuario administrador independiente'}
              </div>
            </div>
          </div>

          {/* Campos solo si crea usuario nuevo */}
          {!useCurrentUser && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Form.Item name="adminName" label="Nombre Completo" rules={[{ required: true, message: 'Requerido' }]}>
                  <Input placeholder="Ej: Carlos Gómez" />
                </Form.Item>
                <Form.Item
                  name="adminEmail"
                  label="Correo Electrónico"
                  rules={[{ required: true, message: 'Requerido' }, { type: 'email', message: 'Correo inválido' }]}
                >
                  <Input placeholder="admin@negocio.com" />
                </Form.Item>
              </div>
              <Form.Item
                name="adminPassword"
                label="Contraseña"
                rules={[{ required: true, message: 'Requerido' }, { min: 6, message: 'Mínimo 6 caracteres' }]}
              >
                <Input.Password placeholder="Mínimo 6 caracteres" />
              </Form.Item>
            </>
          )}

          <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">Plan Inicial</Divider>
          <Form.Item name="planId" label="Plan" rules={[{ required: true, message: 'Selecciona un plan' }]}>
            <Select placeholder="Elige un plan..." optionLabelProp="label" dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}>
              {publicPlans.map(plan => (
                <Select.Option key={plan.id} value={plan.id} label={plan.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                    <span style={{ fontWeight: 600 }}>{plan.name}</span>
                    <span style={{ color: '#1d4ed8', fontSize: 12 }}>${plan.price} / {plan.duration_months} mes(es)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingBottom: 4 }}>
                    {plan.modules?.map(m => <Tag key={m} color={MODULE_COLORS[m]} style={{ fontSize: 10, lineHeight: '16px' }}>{m}</Tag>)}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => { setIsCreateBusinessOpen(false); createBusinessForm.resetFields(); }}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={createBusinessLoading} icon={<PlusOutlined />} style={{ backgroundColor: PRIMARY_COLOR }}>
              Crear Negocio
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Wizard de Onboarding ── */}
      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </ConfigProvider>
  );
};

export default RootLayout;
