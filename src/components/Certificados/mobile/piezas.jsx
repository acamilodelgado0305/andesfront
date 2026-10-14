import React from 'react';
import { Spin } from 'antd';

// Piezas visuales de la vista móvil de Movimientos (estilo MonAi): neutras, se
// leen igual en claro y en oscuro. El único color es el signo de cada monto.

export const COLOR_SIGNO = { gasto: '#ef5350', ingreso: '#43a047' };

// Acción principal (micrófono / +): el coral del logo de Rapictrl.
export const CORAL = '#f0565c';

/** Círculo con − (gasto) o + (ingreso). */
export const PuntoSigno = ({ tipo, size = 18 }) => (
  <span
    aria-hidden
    style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: COLOR_SIGNO[tipo], color: '#fff',
      fontSize: Math.round(size * 0.8), fontWeight: 800, lineHeight: 1,
    }}
  >
    {tipo === 'gasto' ? '−' : '+'}
  </span>
);

/** Opción para elegir (cuenta, fecha, periodo…): neutra; la elegida, invertida. */
export const ChipOpcion = ({ activo, onClick, children, style, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={activo}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0,
      minHeight: 40, padding: '0 16px', borderRadius: 20, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 14, fontWeight: activo ? 700 : 500, border: 'none', whiteSpace: 'nowrap',
      background: activo ? 'var(--qc-text)' : 'var(--qc-relleno)',
      color: activo ? 'var(--qc-bg)' : 'var(--qc-text)',
      opacity: disabled ? 0.5 : 1,
      transition: 'background .12s, color .12s',
      ...style,
    }}
  >
    {children}
  </button>
);

/** Botón principal invertido (negro en claro, crema en oscuro). */
export const BotonPrincipal = ({ onClick, cargando, children, style }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={cargando}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      border: 'none', cursor: cargando ? 'progress' : 'pointer', fontWeight: 700,
      background: 'var(--qc-text)', color: 'var(--qc-bg)', opacity: cargando ? 0.75 : 1,
      ...style,
    }}
  >
    {cargando && <Spin size="small" />}
    {children}
  </button>
);
