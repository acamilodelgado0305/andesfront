import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Spin } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  EllipsisOutlined,
  ReloadOutlined,
  RightOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { getAllIngresos, getAllEgresos, getIngresosDiarios, getIngresosMensuales } from '../services/controlapos/posService';
import { formatCurrency } from '../utils/currency';
import useIsMobile from '../hooks/useIsMobile';
import { resolvePrefs, applySidebarPrefs } from '../services/sidebar/sidebarService';
import { buildNavSections, NAV_META, HOME_EXCLUDED_PATHS } from '../services/nav/navSections';

const { Title } = Typography;

// formatCOP se mantiene como alias local que usa el país del usuario
// Se reemplaza inline más abajo usando user.country

// Bordes exactos del periodo en hora local del navegador. El ultimo segundo
// incluye sus milisegundos (999) para no dejar afuera registros de las 23:59:59.
const getRangeFor = (period) => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), tzOffset };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString(), tzOffset };
};

const PERIOD_LABELS = { today: 'Hoy', month: 'Este mes' };

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
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

  // Paleta para las superficies con estilo inline (no cubiertas por Tailwind).
  const card = {
    bg: isDark ? '#30302e' : '#fff',
    border: isDark ? '#403e3a' : '#e5e7eb',
    borderHover: isDark ? '#56544e' : '#cbd5e1',
    title: isDark ? '#faf9f5' : '#0f172a',
    muted: isDark ? '#a8a59e' : '#94a3b8',
  };
  const [period, setPeriod] = useState('today');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [financials, setFinancials] = useState({ ingresos: 0, gastos: 0, txCount: 0, loading: true });
  const [dailyData, setDailyData] = useState([]);
  const [annualData, setAnnualData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartView, setChartView] = useState('diario');
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);

  // Los accesos del inicio son EL MISMO menú del sidebar: mismas opciones y
  // mismo orden (incluido lo que el usuario reordenó u ocultó). Salen de la
  // misma función, así que no pueden volver a desincronizarse.
  const quickAccess = useMemo(() => {
    const secciones = applySidebarPrefs(buildNavSections(user), resolvePrefs(user));
    return secciones
      .flatMap(sec => sec.items || [])
      .filter(item => !HOME_EXCLUDED_PATHS.includes(item.path))
      .map(item => ({ ...item, ...(NAV_META[item.path] || {}) }));
  }, [user]);

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
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setRefreshKey(k => k + 1);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!user) return;
    const { start, end, tzOffset } = getRangeFor(period);
    setFinancials(f => ({ ...f, loading: true }));
    Promise.all([
      getAllIngresos({ fecha_inicio: start, fecha_fin: end, tz_offset: tzOffset, limit: 5000 }).catch(() => []),
      getAllEgresos({ fecha_inicio: start, fecha_fin: end, tz_offset: tzOffset }).catch(() => []),
    ]).then(([ingData, egData]) => {
      const ingresos = (Array.isArray(ingData) ? ingData : (ingData?.data || []))
        .reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
      const gastos = (Array.isArray(egData) ? egData : (egData?.data || []))
        .reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
      const txCount = (Array.isArray(ingData) ? ingData : (ingData?.data || [])).length;
      setFinancials({ ingresos, gastos, txCount, loading: false });
    });
  }, [user, period, refreshKey]);

  useEffect(() => {
    if (!user) return;
    const now       = new Date();
    const utcOffset = -(now.getTimezoneOffset() / 60); // -5 para Colombia UTC-5
    setChartLoading(true);
    getIngresosDiarios({ year: now.getFullYear(), month: now.getMonth() + 1, hoy: now.getDate(), utcOffset })
      .catch(() => ({ data: [] }))
      .then(({ data }) => { setDailyData(data || []); setChartLoading(false); });
  }, [user, refreshKey]);

  useEffect(() => {
    if (!user) return;
    const now       = new Date();
    const utcOffset = -(now.getTimezoneOffset() / 60);
    setChartLoading(true);
    getIngresosMensuales({ year: chartYear, mes_actual: now.getMonth() + 1, utcOffset })
      .catch(() => ({ data: [] }))
      .then(({ data }) => { setAnnualData(data || []); setChartLoading(false); });
  }, [user, chartYear, refreshKey]);

  const formatCompact = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v;
  };

  // Accesos a los módulos. Se declara aparte porque su POSICIÓN cambia según
  // el dispositivo: en escritorio el sidebar siempre está a la vista, así que
  // pueden ir al final; en móvil el menú vive detrás de un botón y estas
  // tarjetas son la forma real de entrar a las herramientas → van primero.
  const seccionAccesosRapidos = quickAccess.length > 0 && (
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
                    to={item.path}
                    style={{
                      background: card.bg,
                      border: `1px solid ${card.border}`,
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
                      e.currentTarget.style.borderColor = card.borderHover;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = card.border;
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
                      <div style={{ fontWeight: 600, fontSize: 14, color: card.title, marginBottom: 2 }}>
                        {item.label}
                      </div>
                      {item.hint && (
                        <div style={{ fontSize: 12, color: card.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.hint}
                        </div>
                      )}
                    </div>
                    {!isMobile && <RightOutlined style={{ color: '#cbd5e1', fontSize: 11 }} />}
                  </Link>
                );
              })}
            </div>
          </section>
  );

  return (
    <main className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-5 md:space-y-8">

        {/* SALUDO */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#403e3a] bg-white/60 dark:bg-[#30302e]/70 p-6 shadow-sm">
          <Title level={2} className="!mb-1 text-slate-800 dark:!text-[#faf9f5]">
            {greeting}, {user?.name || 'Usuario'}!
          </Title>
          <p className="text-slate-500 dark:text-[#a8a59e]">
            Aquí tienes un resumen de tu negocio.
          </p>
        </section>

        {/* En móvil, las herramientas antes que las cifras: al entrar se veía
            solo el resumen del día y había que bajar toda la gráfica para
            encontrar un acceso a los módulos. */}
        {isMobile && seccionAccesosRapidos}

        {/* RESUMEN FINANCIERO */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#403e3a] bg-white/70 dark:bg-[#30302e]/70 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#403e3a]">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Resumen financiero</p>
              <p className="text-sm font-medium text-slate-700 dark:text-[#c9c6bd]">{PERIOD_LABELS[period]}</p>
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

        {/* GRÁFICA INGRESOS */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#403e3a] bg-white/70 dark:bg-[#30302e]/70 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Ingresos</p>
              <p className="text-sm font-medium text-slate-700">
                {chartView === 'diario' ? 'Evolución diaria del mes' : `Evolución mensual ${chartYear}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Actualizar"
              >
                <ReloadOutlined style={{ fontSize: 13 }} />
              </button>
              {chartView === 'anual' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartYear(y => y - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-base leading-none"
                  >‹</button>
                  <span className="text-sm font-semibold text-slate-700 w-11 text-center tabular-nums">{chartYear}</span>
                  <button
                    onClick={() => setChartYear(y => Math.min(y + 1, new Date().getFullYear()))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-base leading-none disabled:opacity-30"
                    disabled={chartYear >= new Date().getFullYear()}
                  >›</button>
                </div>
              )}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {[['diario', 'Mes'], ['anual', 'Año']].map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      chartView === v
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-4" style={{ height: 200 }}>
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spin size="small" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartView === 'diario' ? dailyData : annualData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey={chartView === 'diario' ? 'dia' : 'mes'}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompact}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value, user?.country), 'Ingresos']}
                    labelFormatter={(label) => chartView === 'diario' ? `Día ${label}` : label}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingreso"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ACCESOS RÁPIDOS — en escritorio, tras la gráfica; en móvil van arriba */}
        {!isMobile && seccionAccesosRapidos}

        {/* BANNER PERIODO DE PRUEBA */}
        {user?.is_trial && (() => {
          // Día calendario (sin zona horaria), igual que root.jsx: el último día cuenta como 0.
          const finPrueba = new Date(`${String(user.trial_ends_at).slice(0, 10)}T00:00:00`);
          const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
          const daysLeft = Math.max(0, Math.round((finPrueba - hoy) / (1000 * 60 * 60 * 24)));
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
