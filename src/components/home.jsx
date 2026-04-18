import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Spin } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  EllipsisOutlined,
  HomeOutlined,
  SwapOutlined,
  InboxOutlined,
  ContactsOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  ReadOutlined,
  TrophyOutlined,
  BarChartOutlined,
  FileDoneOutlined,
  ToolOutlined,
  CrownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext';
import { getAllIngresos, getAllEgresos } from '../services/controlapos/posService';
import { formatCurrency } from '../utils/currency';
import useIsMobile from '../hooks/useIsMobile';

const { Title } = Typography;

// formatCOP se mantiene como alias local que usa el país del usuario
// Se reemplaza inline más abajo usando user.country

const getRangeFor = (period) => {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
};

const PERIOD_LABELS = { today: 'Hoy', month: 'Este mes' };

// Detecta planes educativos (replicado de root.jsx para mantener consistencia
// sin forzar un import cruzado; si cambia allá, hay que tocar ambos).
const isEducationalPlanUser = (u) => {
  if (!u || u.role !== 'user') return false;
  const text = [u.plan_name, u.plan, u.plan_type, u.planType, u.app, u.scope]
    .filter(Boolean).join(' ').toLowerCase();
  return text.includes('educa');
};

// Lista plana de accesos según módulos y rol. Se usa para las cards de "Accesos rápidos".
const buildQuickAccess = (user) => {
  if (!user) return [];
  const mods = user.modules || [];
  const hasPOS  = user.role === 'superadmin' || mods.includes('POS');
  const hasACAD = user.role === 'superadmin' || mods.includes('ACADEMICO') || isEducationalPlanUser(user);
  const hasGEN  = user.role === 'superadmin' || mods.includes('GENERACION');
  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin      = ['admin', 'superadmin'].includes(user.role);
  const isDocente    = user.role === 'docente';

  const items = [];

  if (hasPOS) {
    items.push(
      { key: '/inicio/certificados', icon: <SwapOutlined />,         label: 'Movimientos', hint: 'Ingresos y gastos',       tone: 'blue' },
      { key: '/inicio/inventario',   icon: <InboxOutlined />,        label: 'Inventario',  hint: 'Productos y existencias', tone: 'cyan' },
      { key: '/inicio/personas',     icon: <ContactsOutlined />,     label: 'Contactos',   hint: 'Clientes y proveedores',  tone: 'amber' },
      { key: '/inicio/pedidos',      icon: <ShoppingCartOutlined />, label: 'Pedidos',     hint: 'Ventas y pedidos',        tone: 'green' },
    );
  }

  if (hasACAD) {
    const userAllowed = ['/inicio/students', '/inicio/calificaciones'];
    let acad = [
      { key: '/inicio/students',       icon: <TeamOutlined />,       label: 'Estudiantes',   hint: 'Matrícula y fichas',      tone: 'purple' },
      { key: '/inicio/docentes',       icon: <UserSwitchOutlined />, label: 'Docentes',      hint: 'Equipo académico',        tone: 'purple' },
      { key: '/inicio/programas',      icon: <ReadOutlined />,       label: 'Programas',     hint: 'Cursos y planes',         tone: 'purple' },
      { key: '/inicio/evaluaciones',   icon: <TrophyOutlined />,     label: 'Evaluaciones',  hint: 'Exámenes y pruebas',      tone: 'purple' },
      { key: '/inicio/calificaciones', icon: <BarChartOutlined />,   label: 'Calificaciones', hint: 'Notas y reportes',       tone: 'purple' },
    ];
    if (user.role === 'user' || isDocente) {
      acad = acad.filter(i => userAllowed.includes(i.key));
    }
    items.push(...acad);
  }

  if (hasGEN) {
    items.push({ key: '/inicio/generacion', icon: <FileDoneOutlined />, label: 'Generación', hint: 'Documentos', tone: 'rose' });
  }

  if (isAdmin) {
    items.push({ key: '/inicio/usuarios-negocio', icon: <ToolOutlined />, label: 'Administración', hint: 'Usuarios del negocio', tone: 'slate' });
  }

  if (isSuperAdmin) {
    items.push({ key: '/inicio/adminclients', icon: <CrownOutlined />, label: 'Configurador', hint: 'Clientes y planes', tone: 'slate' });
  }

  return items;
};

// Paleta para los iconos según `tone`
const TONE_STYLES = {
  blue:   { bg: '#eff6ff', fg: '#1d4ed8' },
  cyan:   { bg: '#ecfeff', fg: '#0891b2' },
  amber:  { bg: '#fffbeb', fg: '#d97706' },
  green:  { bg: '#ecfdf5', fg: '#059669' },
  purple: { bg: '#f5f3ff', fg: '#7c3aed' },
  rose:   { bg: '#fff1f2', fg: '#e11d48' },
  slate:  { bg: '#f1f5f9', fg: '#475569' },
};

const Home = () => {
  const [greeting, setGreeting] = useState('');
  const { user } = useContext(AuthContext);
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState('today');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [financials, setFinancials] = useState({ ingresos: 0, gastos: 0, txCount: 0, loading: true });

  const quickAccess = useMemo(() => buildQuickAccess(user), [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Buenos días');
    else if (hour >= 12 && hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const { start, end } = getRangeFor(period);
    setFinancials(f => ({ ...f, loading: true }));
    Promise.all([
      getAllIngresos({ fecha_inicio: start, fecha_fin: end, limit: 5000 }).catch(() => []),
      getAllEgresos({ fecha_inicio: start, fecha_fin: end }).catch(() => []),
    ]).then(([ingData, egData]) => {
      const ingresos = (Array.isArray(ingData) ? ingData : (ingData?.data || []))
        .reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
      const gastos = (Array.isArray(egData) ? egData : (egData?.data || []))
        .reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
      const txCount = (Array.isArray(ingData) ? ingData : (ingData?.data || [])).length;
      setFinancials({ ingresos, gastos, txCount, loading: false });
    });
  }, [user, period]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* SALUDO */}
        <section className="rounded-2xl border border-slate-200 bg-white/60 p-6 shadow-sm">
          <Title level={2} className="!mb-1 text-slate-800">
            {greeting}, {user?.name || 'Usuario'}!
          </Title>
          <p className="text-slate-500">
            Aquí tienes un resumen de tu negocio.
          </p>
        </section>

        {/* RESUMEN FINANCIERO */}
        <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Resumen financiero</p>
              <p className="text-sm font-medium text-slate-700">{PERIOD_LABELS[period]}</p>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <EllipsisOutlined style={{ fontSize: 18 }} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36">
                  {['today', 'month'].map(p => (
                    <button
                      key={p}
                      onClick={() => { setPeriod(p); setMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${period === p ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1 divide-y' : 'grid-cols-3 divide-x'} divide-slate-100`}>
            {/* Ingresos */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 text-xs">
                  <ArrowUpOutlined />
                </div>
                <span className="text-xs text-slate-500 font-medium">Ingresos</span>
              </div>
              {financials.loading ? <Spin size="small" /> : (
                <>
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(financials.ingresos, user?.country)}</div>
                  <div className="text-xs text-slate-400 mt-1">{financials.txCount} transacciones</div>
                </>
              )}
            </div>

            {/* Gastos */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 text-xs">
                  <ArrowDownOutlined />
                </div>
                <span className="text-xs text-slate-500 font-medium">Gastos</span>
              </div>
              {financials.loading ? <Spin size="small" /> : (
                <>
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(financials.gastos, user?.country)}</div>
                  <div className="text-xs text-slate-400 mt-1">gastos registrados</div>
                </>
              )}
            </div>

            {/* Saldo */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 text-xs">
                  <WalletOutlined />
                </div>
                <span className="text-xs text-slate-500 font-medium">Saldo</span>
              </div>
              {financials.loading ? <Spin size="small" /> : (() => {
                const saldo = financials.ingresos - financials.gastos;
                return (
                  <>
                    <div className={`text-xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(saldo, user?.country)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {saldo >= 0 ? 'Positivo' : 'Negativo'}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        {/* ACCESOS RÁPIDOS */}
        {quickAccess.length > 0 && (
          <section>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                Accesos rápidos
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Las opciones de tu plan.
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: isMobile ? 10 : 12,
            }}>
              {quickAccess.map((item) => {
                const tone = TONE_STYLES[item.tone] || TONE_STYLES.slate;
                return (
                  <Link
                    key={item.key}
                    to={item.key}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 14,
                      padding: isMobile ? '12px 10px' : 16,
                      display: 'flex',
                      alignItems: 'center',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 8 : 12,
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      textAlign: isMobile ? 'center' : 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: tone.bg, color: tone.fg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.hint}
                      </div>
                    </div>
                    {!isMobile && <RightOutlined style={{ color: '#cbd5e1', fontSize: 11 }} />}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* BANNER PERIODO DE PRUEBA */}
        {user?.is_trial && (() => {
          const daysLeft = Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)));
          return (
            <div style={{
              background: 'linear-gradient(135deg, #030d1f 0%, #0a1f3d 60%, #1d4ed8 100%)',
              borderRadius: 16,
              padding: isMobile ? '20px 18px' : '28px 32px',
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 16 : 24,
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: 'wrap',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', right: -40, top: -40,
                width: 200, height: 200, borderRadius: '50%',
                background: 'rgba(29,78,216,0.25)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', right: 80, bottom: -60,
                width: 150, height: 150, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 20, padding: '3px 12px',
                  fontSize: 11, fontWeight: 700, color: '#93c5fd',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 12,
                }}>
                  <span>⚡</span> Oferta exclusiva · {daysLeft} días restantes
                </div>

                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3 }}>
                  Activa tu plan y obtén un{' '}
                  <span style={{ color: '#60a5fa' }}>50% de descuento</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
                  Sabemos que conocernos lleva tiempo. Disfruta de un descuento especial
                  y descubre todo nuestro potencial antes de que termine tu prueba gratuita.
                </p>
              </div>

              <Link to="/precios" style={{ textDecoration: 'none', position: 'relative', zIndex: 1, flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
                <button
                  style={{
                    backgroundColor: '#fff',
                    color: '#0a1f3d',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 28px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    whiteSpace: 'nowrap',
                    width: isMobile ? '100%' : 'auto',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)'; }}
                >
                  Ver planes →
                </button>
              </Link>
            </div>
          );
        })()}

      </div>
    </main>
  );
};

export default Home;
