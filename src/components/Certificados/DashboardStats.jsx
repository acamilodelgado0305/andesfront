import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, WalletOutlined,
  HistoryOutlined, BankOutlined, SettingOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import useCurrency, { useAmount } from '../../hooks/useCurrency';
import { useTheme } from '../../ThemeContext';

// Catálogo de tarjetas del panel. Vive aquí (y se exporta) para que el modal de
// configuración ofrezca exactamente las mismas y con los mismos rótulos: si se
// agrega una tarjeta, aparece sola en la pantalla de "qué mostrar".
export const TARJETAS = [
  { key: 'saldo_anterior', label: 'Saldo anterior', desc: 'Lo que quedó de meses anteriores' },
  { key: 'ingresos',       label: 'Ingresos',       desc: 'Total que entró en el periodo' },
  { key: 'gastos',         label: 'Gastos',         desc: 'Total que salió en el periodo' },
  { key: 'balance',        label: 'Balance neto',   desc: 'Ingresos menos gastos del periodo' },
  { key: 'saldo_final',    label: 'Saldo final',    desc: 'Saldo anterior más el balance del periodo' },
];

// Las tarjetas entran en UNA fila desde 1024px, así que el espacio por tarjeta
// es angosto (~200px). Por eso: cifras sin el código de moneda (useAmount →
// "131.357.056,00"), tipografía chica y una sola línea de pie. El monto completo
// con código queda en el `title` del elemento, para verlo al pasar el mouse.
//
// Tailwind necesita las clases literales en el código para generarlas, así que
// el número de columnas sale de este mapa y no de un template string armado.
const COLS_LG = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

/**
 * @param saldoAnterior  lo que viene arrastrado de periodos anteriores (del backend).
 *                       Si es null todavía no cargó: las tarjetas de saldo no se pintan.
 * @param ocultas        claves de TARJETAS que el negocio decidió no ver.
 */
const DashboardStats = ({
  ingresos, egresos,
  saldoAnterior = null, fechaCorte = null,
  ocultas = [], onConfigurarSaldo,
}) => {
  const fmt = useCurrency();   // "COP 131.357.056,00" — solo para tooltips
  const monto = useAmount();   // "131.357.056,00"     — para las cifras visibles
  const { isDark } = useTheme();

  // Tonos semánticos por tema. En oscuro: fondo con tinte translúcido y texto
  // claro/brillante (legible); en claro: pasteles suaves y texto oscuro.
  const tones = {
    green: {
      bg: isDark ? 'rgba(34,197,94,0.13)' : '#f0fdf4',
      title: isDark ? '#86efac' : '#15803d',
      value: isDark ? '#4ade80' : '#3f8600',
    },
    red: {
      bg: isDark ? 'rgba(239,68,68,0.13)' : '#fef2f2',
      title: isDark ? '#fca5a5' : '#b91c1c',
      value: isDark ? '#f87171' : '#cf1322',
    },
    blue: {
      bg: isDark ? 'rgba(59,130,246,0.14)' : '#eff6ff',
      title: isDark ? '#93c5fd' : '#1d4ed8',
      value: isDark ? '#60a5fa' : '#096dd9',
    },
    slate: {
      bg: isDark ? 'rgba(148,163,184,0.13)' : '#f8fafc',
      title: isDark ? '#cbd5e1' : '#475569',
      value: isDark ? '#e2e8f0' : '#334155',
    },
    violet: {
      bg: isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff',
      title: isDark ? '#c4b5fd' : '#6d28d9',
      value: isDark ? '#a78bfa' : '#5b21b6',
    },
  };
  const mutedColor = isDark ? '#a8a59e' : '#6b7280';

  const stats = useMemo(() => {
    const totalIngresos = (ingresos || []).reduce(
      (acc, curr) => acc + Number(curr.valor || 0), 0
    );
    const totalEgresos = (egresos || []).reduce(
      (acc, curr) => acc + Number(curr.valor || 0), 0
    );
    const balance = totalIngresos - totalEgresos;
    const margen  = totalIngresos > 0
      ? ((balance / totalIngresos) * 100).toFixed(1)
      : 0;

    return { totalIngresos, totalEgresos, balance, margen, countVentas: (ingresos || []).length };
  }, [ingresos, egresos]);

  const haySaldo = saldoAnterior !== null && saldoAnterior !== undefined;
  // Saldo final = lo que venía arrastrado + lo que se movió en este periodo.
  const saldoFinal = haySaldo ? saldoAnterior + stats.balance : null;

  // Definición de cada tarjeta. Las de saldo solo existen si el backend ya
  // respondió; el resto siempre. Después se filtran por las que el negocio ocultó.
  const definiciones = {
    saldo_anterior: haySaldo && {
      tone: tones.slate,
      icon: <HistoryOutlined />,
      label: 'Saldo anterior',
      info: 'Lo que quedó de los periodos anteriores: el saldo inicial del negocio más todos los ingresos menos los gastos registrados antes de este rango.',
      valor: saldoAnterior,
      negativo: saldoAnterior < 0,
      pie: fechaCorte ? `Desde ${moment(fechaCorte).format('DD/MM/YYYY')}` : 'De meses anteriores',
      accion: onConfigurarSaldo,
    },
    ingresos: {
      tone: tones.green,
      icon: <ArrowUpOutlined />,
      label: 'Ingresos',
      valor: stats.totalIngresos,
      pie: `${stats.countVentas} transacciones`,
    },
    gastos: {
      tone: tones.red,
      icon: <ArrowDownOutlined />,
      label: 'Gastos',
      valor: stats.totalEgresos,
      pie: 'Del periodo',
    },
    balance: {
      tone: tones.blue,
      icon: <WalletOutlined />,
      label: 'Balance neto',
      valor: stats.balance,
      negativo: stats.balance < 0,
      pie: `Margen ${stats.margen}%`,
    },
    saldo_final: haySaldo && {
      tone: tones.violet,
      icon: <BankOutlined />,
      label: 'Saldo final',
      info: 'Saldo anterior más el balance de este periodo. Es la plata con la que arranca el periodo siguiente.',
      valor: saldoFinal,
      negativo: saldoFinal < 0,
      pie: `${stats.balance >= 0 ? '+' : '−'} ${monto(Math.abs(stats.balance))} este periodo`,
      destacada: true,
    },
  };

  const visibles = TARJETAS
    .filter(({ key }) => !ocultas.includes(key) && definiciones[key])
    .map(({ key }) => ({ key, ...definiciones[key] }));

  // Si el negocio ocultó todas, no se deja un hueco: no se renderiza nada.
  if (visibles.length === 0) return null;

  // Con una sola tarjeta no tiene sentido partir en dos columnas en tablet.
  const clasesGrid = visibles.length === 1
    ? 'grid grid-cols-1 gap-2.5'
    : `grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${COLS_LG[visibles.length]}`;

  return (
    <div className={clasesGrid}>
      {visibles.map(({ key, tone, icon, label, info, valor, negativo, pie, accion, destacada }) => (
        <div
          key={key}
          style={{
            background: tone.bg,
            borderRadius: 10,
            padding: '10px 12px',
            minWidth: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            outline: destacada
              ? `1px solid ${isDark ? 'rgba(167,139,250,0.35)' : '#ddd6fe'}`
              : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <span style={{ color: tone.title, fontSize: 11, flexShrink: 0 }}>{icon}</span>
            <span
              style={{
                color: tone.title, fontSize: 11, fontWeight: 600, letterSpacing: 0.1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {label}
            </span>
            {info && (
              <Tooltip title={info}>
                <InfoCircleOutlined style={{ fontSize: 10, color: tone.title, opacity: 0.7, flexShrink: 0 }} />
              </Tooltip>
            )}
            {accion && (
              <Tooltip title="Configurar panel financiero">
                <button
                  onClick={accion}
                  style={{
                    marginLeft: 'auto', flexShrink: 0, background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', color: tone.title, fontSize: 11, lineHeight: 1,
                  }}
                >
                  <SettingOutlined />
                </button>
              </Tooltip>
            )}
          </div>

          <div
            title={fmt(valor)}
            style={{
              color: negativo ? tones.red.value : tone.value,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.25,
              marginTop: 3,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {monto(valor)}
          </div>

          <div
            style={{
              fontSize: 10.5, color: mutedColor, marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {pie}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
