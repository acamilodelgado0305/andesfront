import React from 'react';
import { Spin } from 'antd';
import { CloseOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { MOBILE_NAV_HEIGHT } from '../../Sidebar/MobileBottomNav';

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

// ── Piezas compartidas por Movimientos, Pedidos e Inventario ──────────────

export const Circulo = ({ children, size = 46, fondo = 'var(--qc-relleno)', color = 'var(--qc-text)' }) => (
  <span style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: fondo, color, fontSize: size * 0.42, fontWeight: 700, lineHeight: 1,
  }}>
    {children}
  </span>
);

export const BotonCircular = ({ onClick, label, children, activo = false, size = 44 }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    style={{
      width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
      border: `1px solid ${activo ? 'var(--qc-text)' : 'var(--qc-border)'}`,
      background: activo ? 'var(--qc-relleno-fuerte)' : 'var(--qc-surface)',
      color: 'var(--qc-text)',
    }}
  >
    {children}
  </button>
);

// Fila de opción de las hojas. Es un div con rol de botón para poder llevar
// un interruptor a la derecha (un <button> no puede ir dentro de otro).
export const OpcionMenu = ({ icon, titulo, detalle, onClick, extra = null }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
    className="qc-mov-fila"
    style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 4px',
      textAlign: 'left', cursor: 'pointer', borderRadius: 12,
    }}
  >
    <Circulo size={40}><span style={{ fontSize: 17 }}>{icon}</span></Circulo>
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>{titulo}</span>
      {detalle && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{detalle}</span>}
    </span>
    {extra}
  </div>
);

export const ChipFiltro = ({ children, onQuitar }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 6px 0 12px',
    borderRadius: 16, fontSize: 13, fontWeight: 600, flexShrink: 0,
    background: 'var(--qc-relleno-fuerte)', color: 'var(--qc-text)',
  }}>
    {children}
    <button
      type="button"
      onClick={onQuitar}
      aria-label="Quitar filtro"
      style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 3, display: 'flex' }}
    >
      <CloseOutlined style={{ fontSize: 11 }} />
    </button>
  </span>
);

export const Seccion = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 0 8px' }}>
    {children}
  </div>
);

/** Monto (o precio) en pastilla, como en la lista de Movimientos. */
export const PastillaMonto = ({ children, signo = null, apagado = false, style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
    padding: signo ? '6px 11px 6px 6px' : '6px 12px', borderRadius: 18, background: 'var(--qc-relleno)',
    fontSize: 14.5, fontWeight: 700, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    opacity: apagado ? 0.45 : 1, textDecoration: apagado ? 'line-through' : 'none',
    ...style,
  }}>
    {signo && <PuntoSigno tipo={signo} size={18} />}
    {children}
  </span>
);

/**
 * Cápsula con dos o más totales que además filtran la vista (tocar de nuevo
 * = ver todo), como Gastos | Ingresos en Movimientos.
 * opciones: [{ valor, contenido, label }]
 */
export const PildorasFiltro = ({ opciones, activo, onCambiar }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: `repeat(${opciones.length}, 1fr)`, gap: 4, padding: 4,
    borderRadius: 30, border: '1px solid var(--qc-border)', background: 'var(--qc-surface)',
  }}>
    {opciones.map((o) => {
      const esActivo = activo === o.valor;
      return (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(esActivo ? null : o.valor)}
          aria-pressed={esActivo}
          aria-label={o.label}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0,
            height: 50, padding: '0 8px', borderRadius: 26, border: 'none', cursor: 'pointer',
            background: esActivo ? 'var(--qc-relleno-fuerte)' : 'transparent',
            color: 'var(--qc-text)', fontSize: 15.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          }}
        >
          {o.contenido}
        </button>
      );
    })}
  </div>
);

/**
 * Barras verticales deslizables (tocar = filtrar), como las etiquetas de
 * Movimientos. datos: [{ clave, nombre, valor, texto, icono, color }]
 */
export const Barras = ({ datos, activo, onTocar, escritorio = false }) => {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((s, d) => s + d.valor, 0);
  return (
    <div
      className="qc-sin-scrollbar"
      style={{
        display: 'flex', alignItems: 'flex-end', gap: 10, overflowX: 'auto',
        margin: escritorio ? '18px 0 0' : '18px -16px 0', padding: escritorio ? '0 0 4px' : '0 16px 4px',
      }}
    >
      {datos.map((d) => {
        const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
        const alto = 74 + Math.round((d.valor / max) * 116);
        const esActivo = activo != null && String(activo) === String(d.clave);
        return (
          <button
            key={d.clave}
            type="button"
            onClick={() => onTocar(d)}
            aria-pressed={esActivo}
            title={d.nombre}
            style={{
              flexShrink: 0, width: escritorio ? 112 : 88, height: alto, borderRadius: 24, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              gap: 1, padding: '0 6px 12px',
              border: esActivo ? '2px solid var(--qc-text)' : '2px solid transparent',
              background: d.color ? `${d.color}2b` : 'var(--qc-relleno)',
              color: 'var(--qc-text)',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 700 }}>{d.icono}</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{d.texto}</span>
            <span style={{ fontSize: 12, color: 'var(--qc-text-muted)', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {alto > 120 ? d.nombre : `${pct}%`}
            </span>
            {alto > 120 && <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{pct}%</span>}
          </button>
        );
      })}
    </div>
  );
};

/** Inicial (o emoji) de un nombre para los círculos de la lista. */
export const inicialDe = (nombre = '') => {
  const t = String(nombre).trim();
  const emoji = t.match(/^\p{Extended_Pictographic}/u);
  return emoji ? emoji[0] : (t.charAt(0).toUpperCase() || '?');
};

/** Cantidad con − y + (y el número editable en medio). */
export const Stepper = ({ valor, onCambiar, min = 1, max = 9999, size = 34 }) => {
  const poner = (n) => onCambiar(Math.max(min, Math.min(max, Math.round(Number(n) || min))));
  const boton = (texto, delta, label) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => poner(valor + delta)}
      disabled={delta < 0 ? valor <= min : valor >= max}
      style={{
        width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        background: 'var(--qc-relleno)', color: 'var(--qc-text)', fontSize: 18, fontWeight: 700, lineHeight: 1,
        opacity: (delta < 0 ? valor <= min : valor >= max) ? 0.35 : 1,
      }}
    >
      {texto}
    </button>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {boton('−', -1, 'Uno menos')}
      <input
        value={valor}
        inputMode="numeric"
        aria-label="Cantidad"
        onChange={(e) => poner(e.target.value.replace(/\D/g, '') || min)}
        onFocus={(e) => e.target.select()}
        style={{
          width: 42, height: size, textAlign: 'center', border: 'none', outline: 'none', borderRadius: 10,
          background: 'transparent', color: 'var(--qc-text)', fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        }}
      />
      {boton('+', 1, 'Uno más')}
    </span>
  );
};

// ── Marco de las vistas tipo app (celular y computador) ─────────────────

export const ALTO_BOTONES = 64;
// Alto de lo fijo de abajo en el celular (barra de navegación + botones flotantes).
export const ALTO_ABAJO = `calc(${MOBILE_NAV_HEIGHT + ALTO_BOTONES + 34}px + env(safe-area-inset-bottom, 0px))`;

/** Fondo liso de borde a borde (sin el degradado del resto de la app). */
export const FondoApp = ({ escritorio, children }) => (escritorio ? (
  <div style={{ margin: '-24px', padding: '20px 32px 48px', background: 'var(--qc-bg)', minHeight: 'calc(100vh - 52px)' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>{children}</div>
  </div>
) : (
  <div style={{
    margin: '-16px -16px -28px', padding: '14px 16px 0', paddingBottom: ALTO_ABAJO,
    background: 'var(--qc-bg)', minHeight: 'calc(100vh - 52px)',
  }}>
    {children}
  </div>
));

/** Celular: buscar abajo a la izquierda y la acción principal (coral) a la derecha. */
export const BotonesFlotantes = ({ onBuscar, buscando = false, onPrincipal, labelPrincipal, iconoPrincipal = <PlusOutlined /> }) => (
  <div style={{
    position: 'fixed', left: 16, right: 16, zIndex: 995, pointerEvents: 'none',
    bottom: `calc(${MOBILE_NAV_HEIGHT + 12}px + env(safe-area-inset-bottom, 0px))`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    <div style={{
      pointerEvents: 'auto', display: 'flex', alignItems: 'center', padding: 5,
      borderRadius: 32, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    }}>
      <button
        type="button"
        aria-label="Buscar"
        onClick={onBuscar}
        style={{
          width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
          background: buscando ? 'var(--qc-relleno-fuerte)' : 'transparent', color: 'var(--qc-text)',
        }}
      >
        <SearchOutlined />
      </button>
    </div>
    <button
      type="button"
      aria-label={labelPrincipal}
      onClick={onPrincipal}
      style={{
        pointerEvents: 'auto', width: ALTO_BOTONES, height: ALTO_BOTONES, borderRadius: '50%',
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, background: CORAL, color: '#fff', boxShadow: '0 8px 22px rgba(240,86,92,0.45)',
      }}
    >
      {iconoPrincipal}
    </button>
  </div>
);

/** Título de pantalla (computador y celular). */
export const TituloPantalla = ({ children, escritorio }) => (
  <h1 style={{ margin: 0, fontSize: escritorio ? 22 : 21, fontWeight: 800, color: 'var(--qc-text)', letterSpacing: -0.3 }}>
    {children}
  </h1>
);

/** Número grande del encabezado ("12.450.000 COP"). */
export const NumeroGrande = ({ valor, codigo, escritorio, centrado = !escritorio }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: centrado ? 'center' : 'flex-start', gap: 10, minWidth: 0 }}>
    <span style={{
      fontSize: escritorio ? 56 : 46, fontWeight: 800, letterSpacing: escritorio ? -2 : -1.5, lineHeight: 1.08,
      color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {valor}
    </span>
    {codigo && (
      <span style={{ fontSize: escritorio ? 22 : 20, fontWeight: 500, color: 'var(--qc-text-muted)', alignSelf: 'flex-end', paddingBottom: escritorio ? 8 : 6 }}>
        {codigo}
      </span>
    )}
  </div>
);
