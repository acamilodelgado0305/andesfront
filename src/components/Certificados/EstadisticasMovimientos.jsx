import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Card, Row, Col, Statistic, Spin, Empty, Segmented } from 'antd';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import {
  ArrowUpOutlined, ArrowDownOutlined, TrophyOutlined,
  RiseOutlined, LeftOutlined, RightOutlined, CalendarOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/es';

import { AuthContext } from '../../AuthContext';
import { useTheme } from '../../ThemeContext';
import useCurrency from '../../hooks/useCurrency';
import { getAllIngresos, getAllEgresos } from '../../services/controlapos/posService';

moment.locale('es');

// Días de la semana empezando en Lunes (moment: 0=Dom … 6=Sáb)
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };

// Compacta valores para los ejes: 1.2M / 350K / 900
const formatCompact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
};

const EstadisticasMovimientos = () => {
  const { user } = useContext(AuthContext);
  const { isDark } = useTheme();
  const fmt = useCurrency();

  // Mes seleccionado (por defecto: mes actual). Se navega con las flechas.
  const [mes, setMes] = useState(() => moment().startOf('month'));
  const [metric, setMetric] = useState('ambos'); // ingreso | egreso | ambos
  const [loading, setLoading] = useState(true);
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);

  // Colores dependientes del tema (recharts no hereda dark mode)
  const gridStroke = isDark ? '#403e3a' : '#f1f5f9';
  const axisTick   = isDark ? '#a8a59e' : '#94a3b8';
  const tooltipBg  = isDark ? '#30302e' : '#ffffff';
  const tooltipBd  = isDark ? '#403e3a' : '#e2e8f0';

  const esMesActual = mes.isSame(moment(), 'month');

  // --- Carga de datos del mes seleccionado ---
  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      const inicio = mes.clone().startOf('month').startOf('day').toISOString();
      const fin    = mes.clone().endOf('month').endOf('day').toISOString();
      try {
        const [ing, egr] = await Promise.all([
          getAllIngresos({ fecha_inicio: inicio, fecha_fin: fin, limit: 5000 }).catch(() => []),
          getAllEgresos({ fecha_inicio: inicio, fecha_fin: fin }).catch(() => []),
        ]);
        if (cancelado) return;
        setIngresos(Array.isArray(ing) ? ing : (ing?.data || []));
        setEgresos(Array.isArray(egr) ? egr : (egr?.data || []));
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [user, mes]);

  // --- Agregaciones ---
  const stats = useMemo(() => {
    const dias = mes.daysInMonth();
    // Serie diaria: un punto por día del mes
    const diaria = Array.from({ length: dias }, (_, i) => ({
      dia: i + 1,
      ingreso: 0,
      egreso: 0,
      ventas: 0,
    }));
    // Serie por día de la semana
    const semana = WEEKDAY_ORDER.map((wd) => ({
      wd,
      dia: WEEKDAY_LABELS[wd],
      ingreso: 0,
      egreso: 0,
    }));
    const idxSemana = Object.fromEntries(WEEKDAY_ORDER.map((wd, i) => [wd, i]));

    let totalIngresos = 0;
    let totalEgresos = 0;

    (ingresos || []).forEach((it) => {
      const d = moment(it.createdAt || it.fecha);
      if (!d.isValid()) return;
      const valor = Number(it.valor || 0);
      const idx = d.date() - 1;
      if (diaria[idx]) { diaria[idx].ingreso += valor; diaria[idx].ventas += 1; }
      semana[idxSemana[d.day()]].ingreso += valor;
      totalIngresos += valor;
    });

    (egresos || []).forEach((it) => {
      const d = moment(it.fecha || it.createdAt);
      if (!d.isValid()) return;
      const valor = Number(it.valor || 0);
      const idx = d.date() - 1;
      if (diaria[idx]) diaria[idx].egreso += valor;
      semana[idxSemana[d.day()]].egreso += valor;
      totalEgresos += valor;
    });

    // Día más vendido (por ingresos)
    let mejorDia = null;
    diaria.forEach((p) => {
      if (p.ingreso > 0 && (!mejorDia || p.ingreso > mejorDia.ingreso)) mejorDia = p;
    });

    // Mejor día de la semana (por ingresos)
    let mejorWd = null;
    semana.forEach((p) => {
      if (p.ingreso > 0 && (!mejorWd || p.ingreso > mejorWd.ingreso)) mejorWd = p;
    });

    // Promedio diario: solo sobre días con actividad hasta hoy si es el mes actual
    const diasTranscurridos = esMesActual ? moment().date() : dias;
    const promedioDiario = diasTranscurridos > 0 ? totalIngresos / diasTranscurridos : 0;

    const balance = totalIngresos - totalEgresos;
    const totalVentas = diaria.reduce((a, p) => a + p.ventas, 0);

    return {
      diaria, semana, totalIngresos, totalEgresos, balance,
      mejorDia, mejorWd, promedioDiario, totalVentas,
    };
  }, [ingresos, egresos, mes, esMesActual]);

  const hayDatos = stats.totalIngresos > 0 || stats.totalEgresos > 0;

  const irMesAnterior = () => setMes((m) => m.clone().subtract(1, 'month'));
  const irMesSiguiente = () => { if (!esMesActual) setMes((m) => m.clone().add(1, 'month')); };

  // Tonos de tarjetas KPI (mismo criterio que DashboardStats)
  const tones = {
    green: { bg: isDark ? 'rgba(34,197,94,0.13)' : '#f0fdf4', title: isDark ? '#86efac' : '#15803d', value: isDark ? '#4ade80' : '#3f8600' },
    red:   { bg: isDark ? 'rgba(239,68,68,0.13)' : '#fef2f2', title: isDark ? '#fca5a5' : '#b91c1c', value: isDark ? '#f87171' : '#cf1322' },
    blue:  { bg: isDark ? 'rgba(59,130,246,0.14)' : '#eff6ff', title: isDark ? '#93c5fd' : '#1d4ed8', value: isDark ? '#60a5fa' : '#096dd9' },
    amber: { bg: isDark ? 'rgba(245,158,11,0.14)' : '#fffbeb', title: isDark ? '#fcd34d' : '#b45309', value: isDark ? '#fbbf24' : '#d97706' },
  };

  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${tooltipBd}`,
    background: tooltipBg,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    fontSize: 12,
    color: isDark ? '#faf9f5' : '#0f172a',
  };

  return (
    <div className="p-4">
      {/* ── Barra de control: navegación de mes + métrica ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={irMesAnterior}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-[#403e3a] text-slate-500 dark:text-[#a8a59e] hover:bg-slate-100 dark:hover:bg-[#3a3a38] transition-colors"
            title="Mes anterior"
          >
            <LeftOutlined />
          </button>
          <div className="flex items-center gap-2 px-3 min-w-[190px] justify-center">
            <CalendarOutlined style={{ color: '#155153' }} />
            <span className="text-base font-semibold capitalize text-slate-700 dark:text-[#faf9f5] tabular-nums">
              {mes.format('MMMM YYYY')}
            </span>
          </div>
          <button
            onClick={irMesSiguiente}
            disabled={esMesActual}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-[#403e3a] text-slate-500 dark:text-[#a8a59e] hover:bg-slate-100 dark:hover:bg-[#3a3a38] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mes siguiente"
          >
            <RightOutlined />
          </button>
        </div>

        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { label: 'Ambos', value: 'ambos' },
            { label: 'Ingresos', value: 'ingreso' },
            { label: 'Gastos', value: 'egreso' },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Spin size="large" /></div>
      ) : !hayDatos ? (
        <Empty
          description={`Sin movimientos en ${mes.format('MMMM YYYY')}`}
          className="py-20"
        />
      ) : (
        <>
          {/* ── KPIs ── */}
          <Row gutter={[16, 16]} className="mb-2">
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.green.bg }}>
                <Statistic
                  title={<span style={{ color: tones.green.title, fontWeight: 600 }}>Ingresos del mes</span>}
                  value={stats.totalIngresos}
                  formatter={fmt}
                  valueStyle={{ color: tones.green.value, fontWeight: 'bold' }}
                  prefix={<ArrowUpOutlined />}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-[#a8a59e]">{stats.totalVentas} transacciones</div>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.red.bg }}>
                <Statistic
                  title={<span style={{ color: tones.red.title, fontWeight: 600 }}>Gastos del mes</span>}
                  value={stats.totalEgresos}
                  formatter={fmt}
                  valueStyle={{ color: tones.red.value, fontWeight: 'bold' }}
                  prefix={<ArrowDownOutlined />}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-[#a8a59e]">Balance {fmt(stats.balance)}</div>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.amber.bg }}>
                <Statistic
                  title={<span style={{ color: tones.amber.title, fontWeight: 600 }}>Día más vendido</span>}
                  value={stats.mejorDia ? stats.mejorDia.ingreso : 0}
                  formatter={fmt}
                  valueStyle={{ color: tones.amber.value, fontWeight: 'bold' }}
                  prefix={<TrophyOutlined />}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-[#a8a59e] capitalize">
                  {stats.mejorDia
                    ? mes.clone().date(stats.mejorDia.dia).format('dddd D [de] MMMM')
                    : 'Sin ventas'}
                </div>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.blue.bg }}>
                <Statistic
                  title={<span style={{ color: tones.blue.title, fontWeight: 600 }}>Promedio diario</span>}
                  value={stats.promedioDiario}
                  formatter={fmt}
                  valueStyle={{ color: tones.blue.value, fontWeight: 'bold' }}
                  prefix={<RiseOutlined />}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-[#a8a59e]">
                  {stats.mejorWd ? `Mejor: ${stats.mejorWd.dia} (${fmt(stats.mejorWd.ingreso)})` : 'Ingreso por día'}
                </div>
              </Card>
            </Col>
          </Row>

          {/* ── Gráfica: fluctuación diaria del mes ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#403e3a] bg-white/70 dark:bg-[#30302e]/70 shadow-sm overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#403e3a]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Fluctuación diaria</p>
              <p className="text-sm font-medium text-slate-700 dark:text-[#faf9f5] capitalize">
                Movimiento día a día · {mes.format('MMMM YYYY')}
              </p>
            </div>
            <div className="px-2 sm:px-5 pb-5 pt-4" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.diaria} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={48} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(label) => mes.clone().date(label).format('dddd D [de] MMMM')}
                    formatter={(value, name) => [fmt(value), name === 'ingreso' ? 'Ingresos' : 'Gastos']}
                  />
                  <Legend
                    formatter={(v) => (v === 'ingreso' ? 'Ingresos' : 'Gastos')}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  {(metric === 'ambos' || metric === 'ingreso') && (
                    <Line type="monotone" dataKey="ingreso" stroke="#10b981" strokeWidth={2}
                      dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  )}
                  {(metric === 'ambos' || metric === 'egreso') && (
                    <Line type="monotone" dataKey="egreso" stroke="#ef4444" strokeWidth={2}
                      dot={{ r: 2, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Gráfica: ventas por día de la semana ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#403e3a] bg-white/70 dark:bg-[#30302e]/70 shadow-sm overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#403e3a]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Por día de la semana</p>
              <p className="text-sm font-medium text-slate-700 dark:text-[#faf9f5]">
                ¿Qué día se vende más?
              </p>
            </div>
            <div className="px-2 sm:px-5 pb-5 pt-4" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.semana} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 12, fill: axisTick }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisTick }} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={48} />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [fmt(value), name === 'ingreso' ? 'Ingresos' : 'Gastos']}
                  />
                  <Legend formatter={(v) => (v === 'ingreso' ? 'Ingresos' : 'Gastos')} wrapperStyle={{ fontSize: 12 }} />
                  {(metric === 'ambos' || metric === 'ingreso') && (
                    <Bar dataKey="ingreso" radius={[6, 6, 0, 0]} maxBarSize={46}>
                      {stats.semana.map((p) => (
                        <Cell key={p.wd}
                          fill={stats.mejorWd && p.wd === stats.mejorWd.wd ? '#10b981' : (isDark ? '#2f6b52' : '#a7f3d0')} />
                      ))}
                    </Bar>
                  )}
                  {(metric === 'ambos' || metric === 'egreso') && (
                    <Bar dataKey="egreso" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={46} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EstadisticasMovimientos;
