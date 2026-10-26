// src/components/tareas/piezasTareas.jsx
// Piezas visuales de Tareas. Todo con variables de tema (--qc-*): se ve igual
// de bien en claro y en oscuro. El color lo ponen el proyecto y las etiquetas.
import React from 'react';
import { Tooltip } from 'antd';
import {
  CheckOutlined, ClockCircleOutlined, AlignLeftOutlined, CheckSquareOutlined,
  PaperClipOutlined, MessageOutlined, RetweetOutlined, BellOutlined,
} from '@ant-design/icons';
import { COLOR_VENCE, estadoVence, textoSobre, textoVence, tinte } from './utilsTareas';
import { describirRepeticion } from './repeticion';

/** Pastilla de etiqueta. `compacta` = barrita de color sin texto (como Trello). */
export const EtiquetaPill = ({ etiqueta, compacta = false, onClick, activa, style }) => {
  if (!etiqueta) return null;
  if (compacta) {
    return (
      <Tooltip title={etiqueta.nombre || undefined}>
        <span style={{ display: 'inline-block', width: 34, height: 7, borderRadius: 4, background: etiqueta.color, ...style }} />
      </Tooltip>
    );
  }
  return (
    <span
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%',
        height: 22, padding: '0 9px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        background: etiqueta.color, color: textoSobre(etiqueta.color),
        cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        outline: activa ? '2px solid var(--qc-text)' : 'none', outlineOffset: 1,
        ...style,
      }}
    >
      {etiqueta.nombre || ' '}
    </span>
  );
};

/** Fecha de vencimiento con color según qué tan cerca está. */
export const ChipVence = ({ tarjeta, grande = false, onClick }) => {
  const estado = estadoVence(tarjeta);
  if (!estado) return null;
  const { color, fondo } = COLOR_VENCE[estado];
  return (
    <span
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      title={estado === 'vencida' ? 'Vencida' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, height: grande ? 30 : 22,
        padding: grande ? '0 12px' : '0 7px', borderRadius: 6, fontSize: grande ? 13.5 : 12, fontWeight: 600,
        background: fondo, color, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {estado === 'completada' ? <CheckOutlined /> : <ClockCircleOutlined />}
      {textoVence(tarjeta, { largo: grande })}
    </span>
  );
};

/** Círculo para completar (el check de Trello/Todoist). */
export const MarcaCompletar = ({ hecha, onCambiar, size = 18, color = '#16a34a', titulo }) => (
  <button
    type="button"
    aria-pressed={hecha}
    aria-label={titulo || (hecha ? 'Marcar como pendiente' : 'Marcar como hecha')}
    title={titulo || (hecha ? 'Marcar como pendiente' : 'Marcar como hecha')}
    onMouseDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => { e.stopPropagation(); onCambiar?.(!hecha); }}
    style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: hecha ? 'none' : '1.8px solid var(--qc-text-muted)',
      background: hecha ? color : 'transparent', color: '#fff', fontSize: size * 0.6,
      transition: 'background .15s, transform .15s',
    }}
  >
    {hecha && <CheckOutlined />}
  </button>
);

/** Ícono del proyecto: emoji sobre su color. */
export const IconoProyecto = ({ tablero, size = 34 }) => (
  <span style={{
    width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: tinte(tablero?.color, 0.16), color: tablero?.color, fontSize: size * 0.52, lineHeight: 1,
  }}>
    {tablero?.icono || (tablero?.nombre || '?').trim().charAt(0).toUpperCase()}
  </span>
);

/** Barra de avance (subtareas, proyecto). */
export const BarraProgreso = ({ valor, total, color = '#16a34a', alto = 6 }) => {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div style={{ height: alto, borderRadius: alto, background: 'var(--qc-relleno-fuerte)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : color, transition: 'width .25s' }} />
    </div>
  );
};

const Insignia = ({ icon, children, color = 'var(--qc-text-muted)', fondo, title }) => (
  <span title={title} style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: fondo ? '0 7px' : 0,
    borderRadius: 6, fontSize: 12, fontWeight: 600, color, background: fondo,
  }}>
    {icon}{children}
  </span>
);

/** Fila de insignias de una tarjeta: fecha, 🔁, descripción, subtareas, adjuntos, comentarios. */
export const InsigniasTarjeta = ({ tarjeta }) => {
  const t = tarjeta;
  const subCompletas = t.subtareas_total > 0 && t.subtareas_hechas === t.subtareas_total;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <ChipVence tarjeta={t} />
      {t.repeticion && <Insignia icon={<RetweetOutlined />} title={describirRepeticion(t.repeticion)} />}
      {t.vence_at && t.recordatorio_min != null && !t.completada && <Insignia icon={<BellOutlined />} title="Con aviso al celular" />}
      {t.descripcion && <Insignia icon={<AlignLeftOutlined />} title="Tiene descripción" />}
      {t.subtareas_total > 0 && (
        <Insignia
          icon={<CheckSquareOutlined />}
          color={subCompletas ? '#fff' : 'var(--qc-text-muted)'}
          fondo={subCompletas ? '#16a34a' : undefined}
          title="Subtareas"
        >
          {t.subtareas_hechas}/{t.subtareas_total}
        </Insignia>
      )}
      {t.adjuntos > 0 && <Insignia icon={<PaperClipOutlined />} title="Adjuntos">{t.adjuntos}</Insignia>}
      {t.comentarios > 0 && <Insignia icon={<MessageOutlined />} title="Comentarios">{t.comentarios}</Insignia>}
    </div>
  );
};

// ── Texto con formato sencillo (lo que se usaba en las descripciones de Trello)
// **negrita**, _cursiva_, listas con - o 1., enlaces sueltos y saltos de línea.
// Se arma con elementos de React: nunca se inyecta HTML.
const enLinea = (texto, clave) => {
  const partes = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|_[^_\s][^_]*_|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+)/g;
  let ultimo = 0;
  let m;
  let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const tok = m[0];
    const k = `${clave}-${i += 1}`;
    if (tok.startsWith('http')) {
      partes.push(<a key={k} href={tok} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--qc-azul)', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>{tok}</a>);
    } else if (tok.startsWith('**') || tok.startsWith('__')) {
      partes.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    } else {
      partes.push(<em key={k}>{tok.slice(1, -1)}</em>);
    }
    ultimo = m.index + tok.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
};

export const TextoFormato = ({ texto, style }) => {
  if (!texto) return null;
  const bloques = [];
  let lista = null;
  texto.split(/\r?\n/).forEach((linea, n) => {
    const item = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/.exec(linea);
    if (item) {
      const tipo = item[1] ? 'ol' : 'ul';
      if (!lista || lista.tipo !== tipo) { lista = { tipo, items: [] }; bloques.push(lista); }
      lista.items.push(enLinea(item[2], `l${n}`));
      return;
    }
    lista = null;
    bloques.push({ tipo: linea.trim() ? 'p' : 'br', contenido: enLinea(linea, `p${n}`) });
  });
  return (
    <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--qc-text)', overflowWrap: 'anywhere', ...style }}>
      {bloques.map((b, i) => {
        if (b.tipo === 'ul' || b.tipo === 'ol') {
          const Lista = b.tipo;
          return <Lista key={i} style={{ margin: '2px 0 6px', paddingLeft: 22 }}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</Lista>;
        }
        if (b.tipo === 'br') return <div key={i} style={{ height: 8 }} />;
        return <div key={i}>{b.contenido}</div>;
      })}
    </div>
  );
};

/** Botón de texto discreto (para "+ Añadir tarjeta", acciones de lista…). */
export const BotonSuave = ({ children, onClick, icon, style, title, peligro = false, activo = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
      background: activo ? 'var(--qc-relleno-fuerte)' : 'transparent', color: peligro ? '#dc2626' : 'var(--qc-text-muted)',
      fontSize: 13.5, fontWeight: 600, padding: '7px 10px', borderRadius: 8, textAlign: 'left',
      ...style,
    }}
    onMouseEnter={(e) => { if (!activo) e.currentTarget.style.background = 'var(--qc-relleno)'; }}
    onMouseLeave={(e) => { if (!activo) e.currentTarget.style.background = 'transparent'; }}
  >
    {icon}{children}
  </button>
);
