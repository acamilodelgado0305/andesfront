// src/services/nav/navSections.jsx
// FUENTE ÚNICA del menú de la app.
//
// Antes esta definición estaba duplicada: una copia en `root.jsx` para el
// sidebar y otra en `home.jsx` para las tarjetas del inicio. Se salieron de
// sintonía (al inicio le faltaban Facturas, CRM y Cuentas por Pagar, y no
// respetaba `modulos_ocultos`). Ahora las dos pantallas leen de aquí, así que
// agregar un módulo en un solo sitio lo hace aparecer en ambas.
//
// Lo que sale de aquí es el menú POR DEFECTO: el orden y la visibilidad que
// eligió el usuario se aplican después con `applySidebarPrefs` (sidebarService).
import React from 'react';
import {
  HomeOutlined,
  SwapOutlined,
  FileDoneOutlined,
  BankOutlined,
  ContactsOutlined,
  UsergroupAddOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  ReadOutlined,
  BarChartOutlined,
  ToolOutlined,
  CrownOutlined,
} from '@ant-design/icons';

// =========================================================
// 🔒 RESTRICCIONES POR ROL para hijos de cada módulo
// =========================================================
// Define qué hijos puede ver cada rol dentro de un módulo.
// Si un rol NO está listado aquí, verá TODOS los hijos (sin restricción).
// Si un rol está listado, solo verá los paths indicados.
export const ROLE_CHILD_RESTRICTIONS = {
  ACADEMICO: {
    user: ['/inicio/students', '/inicio/calificaciones'],
    // docente: ['/inicio/students', '/inicio/calificaciones', '/inicio/evaluaciones'],
  },
  // Puedes agregar restricciones para otros módulos:
  // POS: {
  //   user: ['/inicio/certificados'],
  // },
};

export const isEducationalPlanUser = (currentUser) => {
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

// =========================================================
// 🚀 MENÚ PLANO POR SECCIONES
// =========================================================
// Devuelve array de secciones: [{ sectionLabel, sectionColor, items: [{key, icon, label, path}] }]
export const buildNavSections = (user) => {
  if (!user) return [];

  const userModules = user.modules || [];
  const hasPOS      = user.role === 'superadmin' || userModules.includes('POS');
  const hasACAD     = user.role === 'superadmin' || userModules.includes('ACADEMICO') || isEducationalPlanUser(user);
  const hasGEN      = user.role === 'superadmin' || userModules.includes('GENERACION');
  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin      = ['admin', 'superadmin'].includes(user.role);
  const isDocente    = user.role === 'docente';
  const hasBoth      = hasPOS && hasACAD;

  // Docente: experiencia acotada — solo sus programas (el perfil se abre desde
  // el dropdown del header). No hereda POS/Configuración aunque el negocio
  // tenga esos módulos en la suscripción.
  if (isDocente) {
    return [
      {
        sectionLabel: null,
        items: [
          { key: '/inicio/mis-programas', icon: <ReadOutlined />, label: 'Mis Programas', path: '/inicio/mis-programas' },
        ],
      },
    ];
  }

  const sections = [];

  // — General —
  sections.push({
    sectionLabel: null,
    items: [{ key: '/inicio/dashboard', icon: <HomeOutlined />, label: 'Inicio', path: '/inicio/dashboard' }],
  });

  // — Gestión Empresarial —
  if (hasPOS) {
    // Los módulos ocultos se aplican solo a roles no-superadmin
    const hiddenPOS = isSuperAdmin ? [] : (user.modulos_ocultos || []);

    const allPosItems = [
      { key: '/inicio/certificados',     navKey: 'movimientos', icon: <SwapOutlined />,         label: 'Movimientos',  path: '/inicio/certificados' },
      { key: '/inicio/documentos-venta', navKey: 'facturas',    icon: <FileDoneOutlined />,     label: 'Facturas',     path: '/inicio/documentos-venta' },
      // Por Pagar y Por Cobrar viven en la misma vista, con pestañas.
      { key: '/inicio/cuentas',          navKey: 'cuentas',     icon: <BankOutlined />,         label: 'Cuentas',      path: '/inicio/cuentas' },
      { key: '/inicio/personas',         navKey: 'contactos',   icon: <ContactsOutlined />,     label: 'Contactos',    path: '/inicio/personas' },
      { key: '/inicio/crm',              navKey: 'crm',         icon: <UsergroupAddOutlined />, label: 'CRM',          path: '/inicio/crm' },
      { key: '/inicio/inventario',       navKey: 'inventario',  icon: <InboxOutlined />,        label: 'Inventario',   path: '/inicio/inventario' },
      { key: '/inicio/pedidos',          navKey: 'pedidos',     icon: <ShoppingCartOutlined />, label: 'Pedidos',      path: '/inicio/pedidos' },
    ];

    const visiblePosItems = allPosItems.filter(item => !hiddenPOS.includes(item.navKey));

    if (visiblePosItems.length > 0) {
      sections.push({
        sectionLabel: hasBoth ? 'Gestión Empresarial' : null,
        sectionColor: '#1d4ed8',
        items: visiblePosItems,
      });
    }
  }

  // — Gestión Académica —
  if (hasACAD) {
    let acadItems = [
      { key: '/inicio/students',       icon: <TeamOutlined />,       label: 'Estudiantes',   path: '/inicio/students' },
      { key: '/inicio/docentes',       icon: <UserSwitchOutlined />, label: 'Docentes',      path: '/inicio/docentes' },
      { key: '/inicio/programas',      icon: <ReadOutlined />,       label: 'Programas',     path: '/inicio/programas' },
      { key: '/inicio/calificaciones', icon: <BarChartOutlined />,   label: 'Calificaciones', path: '/inicio/calificaciones' },
    ];

    // Movimientos: visible solo para admin/superadmin en plan educativo (sin módulo POS separado)
    if (isAdmin && !hasPOS) {
      acadItems = [
        { key: '/inicio/certificados', icon: <SwapOutlined />, label: 'Movimientos', path: '/inicio/certificados' },
        ...acadItems,
      ];
    }

    // Restricción para rol 'user' educativo (los docentes salen antes con su
    // propia sección acotada).
    if (user.role === 'user') {
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

// =========================================================
// 🏠 METADATOS PARA LAS TARJETAS DEL INICIO
// =========================================================
// Solo presentación: la descripción y el color de cada tarjeta. Un módulo sin
// entrada aquí igual aparece en el inicio (color neutro, sin descripción), así
// que nunca se queda fuera por olvidar registrarlo.
export const NAV_META = {
  '/inicio/certificados':      { hint: 'Ingresos y gastos',        tone: 'blue' },
  '/inicio/documentos-venta':  { hint: 'Facturas y cotizaciones',  tone: 'blue' },
  '/inicio/cuentas':           { hint: 'Por pagar y por cobrar',   tone: 'rose' },
  '/inicio/personas':          { hint: 'Clientes y proveedores',   tone: 'amber' },
  '/inicio/crm':               { hint: 'Prospectos y seguimiento', tone: 'amber' },
  '/inicio/inventario':        { hint: 'Productos y existencias',  tone: 'cyan' },
  '/inicio/pedidos':           { hint: 'Ventas y pedidos',         tone: 'green' },
  '/inicio/students':          { hint: 'Matrícula y fichas',       tone: 'purple' },
  '/inicio/docentes':          { hint: 'Equipo académico',         tone: 'purple' },
  '/inicio/programas':         { hint: 'Cursos y planes',          tone: 'purple' },
  '/inicio/mis-programas':     { hint: 'Tus programas asignados',  tone: 'purple' },
  '/inicio/calificaciones':    { hint: 'Notas y reportes',         tone: 'purple' },
  '/inicio/generacion':        { hint: 'Documentos',               tone: 'rose' },
  '/inicio/usuarios-negocio':  { hint: 'Usuarios del negocio',     tone: 'slate' },
  '/inicio/adminclients':      { hint: 'Clientes y planes',        tone: 'slate' },
};

// El inicio no se enlaza a sí mismo desde sus propias tarjetas.
export const HOME_EXCLUDED_PATHS = ['/inicio/dashboard'];
