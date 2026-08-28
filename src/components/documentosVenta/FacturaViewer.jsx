import React, { useRef, useState, useEffect, useContext } from 'react';
import { Modal, Button, Space, Tooltip, message } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';
import useCurrency, { useAmount } from '../../hooks/useCurrency';
import { formatFechaDia } from '../../utils/fechas';
import { AuthContext } from '../../AuthContext';
import { useTheme } from '../../ThemeContext';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } });

// Logo del negocio: el endpoint devuelve la columna snake_case, pero el público usa camelCase
const getBizLogo = (biz) => biz?.profile_picture_url || biz?.profilePictureUrl || null;

const parseItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const parseAbonos = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) || []; } catch { return []; }
};

// A4 a 96dpi = 794 x 1123 px. Se deja un pelo por debajo para no desbordar a 2ª página.
const SHEET_W = 794;
const SHEET_H = 1120;

/* ─────────────────────────────────────────────────────────────────────────────
 * Los tres diseños comparten la misma maqueta (plantilla "Factura" estilo
 * Microsoft Invoicing): cenefa superior con arte geométrico + tarjeta blanca del
 * negocio, bandera con el tipo de documento, bloques PARA / EMITIDO POR,
 * INSTRUCCIONES, tabla con cabecera sólida y renglones reglados, totales
 * escalonados a la derecha y pie con dirección / teléfono / correo.
 * Lo que cambia entre diseños es la paleta, la tipografía y los remates.
 * ────────────────────────────────────────────────────────────────────────────*/
const THEMES = {
  corporativa: {
    label: 'Corporativa',
    font: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    titleFont: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    band: 'linear-gradient(115deg, #142c54 0%, #1f4e88 55%, #2e75b6 100%)',
    ink: '#1f3864',
    accent: '#2e75b6',
    tint: '#eaf1f9',
    rule: '#b9cde4',
    hair: '#e3ebf4',
    radius: 0,
    flag: 'notch',
    zebra: false,
  },
  moderna: {
    label: 'Moderna',
    font: '"Segoe UI", Inter, Arial, sans-serif',
    titleFont: '"Segoe UI", Inter, Arial, sans-serif',
    band: 'linear-gradient(115deg, #4338ca 0%, #4f46e5 45%, #0ea5e9 100%)',
    ink: '#312e81',
    accent: '#4f46e5',
    tint: '#eef2ff',
    rule: '#c7d2fe',
    hair: '#e8ebff',
    radius: 12,
    flag: 'pill',
    zebra: true,
  },
  ejecutiva: {
    label: 'Ejecutiva',
    font: '"Segoe UI", Arial, sans-serif',
    titleFont: 'Georgia, "Times New Roman", serif',
    band: 'linear-gradient(115deg, #0b0f19 0%, #1f2937 55%, #374151 100%)',
    ink: '#111827',
    accent: '#b08d57',
    tint: '#faf6ef',
    rule: '#e0d5c2',
    hair: '#ece6dc',
    radius: 2,
    flag: 'plate',
    zebra: false,
  },
};

const DESIGNS = Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }));

const ESTADO_STYLE = {
  PAGADA:  { bg: '#dcfce7', fg: '#166534' },
  ABONO:   { bg: '#ffedd5', fg: '#c2410c' },
  ANULADA: { bg: '#fee2e2', fg: '#b91c1c' },
  EMITIDA: { bg: '#dbeafe', fg: '#1d4ed8' },
};
const estadoStyle = (e) => ESTADO_STYLE[e] || { bg: '#f1f5f9', fg: '#475569' };

// ─── Piezas comunes ───────────────────────────────────────────────────────────
const Rule = ({ t, strong, style }) => (
  <div style={{ height: strong ? 2 : 1, background: strong ? t.accent : t.rule, ...style }} />
);

const Label = ({ t, children, style }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, letterSpacing: 1.4, color: t.accent,
    textTransform: 'uppercase', ...style,
  }}>{children}</div>
);

const Line = ({ children, muted = true, size = 10.5 }) => (
  <div style={{ fontSize: size, color: muted ? '#5b6470' : '#1f2937', lineHeight: 1.65 }}>{children}</div>
);

// Iconos del pie (SVG inline: html2canvas los serializa sin pedir red)
const IconPin = ({ c }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.5s7-6.6 7-11.5a7 7 0 1 0-14 0c0 4.9 7 11.5 7 11.5z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
const IconPhone = ({ c }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16.9v2.6a1.4 1.4 0 0 1-1.5 1.4A17.5 17.5 0 0 1 3.1 4.5 1.4 1.4 0 0 1 4.5 3h2.6a1.4 1.4 0 0 1 1.4 1.2c.1 1 .35 2 .7 2.9a1.4 1.4 0 0 1-.3 1.5L7.7 9.7a14 14 0 0 0 6.6 6.6l1.1-1.2a1.4 1.4 0 0 1 1.5-.3c.9.35 1.9.6 2.9.7A1.4 1.4 0 0 1 21 16.9z" />
  </svg>
);
const IconMail = ({ c }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="M3 6l9 6.5L21 6" />
  </svg>
);

// ─── Cenefa superior + tarjeta del negocio ────────────────────────────────────
const Masthead = ({ biz, t }) => {
  const logo = getBizLogo(biz);
  // Una sola linea: el telefono y el correo ya salen en el cuerpo y en el pie.
  const ribbon = biz?.website || biz?.contact_email || '';

  return (
    <div style={{ position: 'relative', height: 152, background: t.band, overflow: 'hidden' }}>
      {/* arte geométrico */}
      <div style={{ position: 'absolute', top: -110, right: -60, width: 300, height: 300, background: 'rgba(255,255,255,0.09)', transform: 'rotate(38deg)' }} />
      <div style={{ position: 'absolute', top: 10, right: 90, width: 220, height: 220, background: 'rgba(255,255,255,0.07)', transform: 'rotate(20deg)' }} />
      <div style={{ position: 'absolute', bottom: -140, right: 180, width: 260, height: 260, background: 'rgba(255,255,255,0.05)', transform: 'rotate(48deg)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 152, background: 'rgba(0,0,0,0.10)', transform: 'skewX(-16deg) translateX(40px)' }} />

      {/* tarjeta blanca del negocio */}
      <div style={{
        position: 'absolute', top: 20, left: 36, maxWidth: 430,
        background: '#fff', borderRadius: t.radius ? t.radius : 3,
        padding: '14px 26px 14px 18px', display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      }}>
        {logo ? (
          <img src={logo} alt="Logo" style={{ width: 46, height: 46, objectFit: 'contain', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 46, height: 46, flexShrink: 0, borderRadius: t.radius ? 10 : 4,
            background: t.tint, color: t.accent, fontFamily: t.titleFont,
            fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{(biz?.name || 'Q').trim().charAt(0).toUpperCase()}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: t.titleFont, fontSize: 17, fontWeight: 700, color: t.accent, lineHeight: 1.2 }}>
            {biz?.name || 'Mi Empresa'}
          </div>
          <div style={{ fontSize: 9.5, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>
            {biz?.nit ? `NIT ${biz.nit}` : 'Documento de venta'}
            {biz?.industry ? `  ·  ${biz.industry}` : ''}
          </div>
        </div>
      </div>

      {/* franja de contacto */}
      {ribbon && (
        <div style={{
          position: 'absolute', right: 40, bottom: 18, textAlign: 'right',
          fontSize: 9, color: 'rgba(255,255,255,0.82)', letterSpacing: 0.4,
        }}>{ribbon}</div>
      )}
    </div>
  );
};

// ─── Bandera con el tipo de documento ─────────────────────────────────────────
const Flag = ({ t, texto }) => {
  const base = {
    background: t.flag === 'plate' ? '#fff' : t.ink,
    color: t.flag === 'plate' ? t.ink : '#fff',
    fontFamily: t.titleFont,
    fontSize: 19, fontWeight: 700, letterSpacing: 3,
    padding: '11px 30px', lineHeight: '22px',
  };

  if (t.flag === 'pill') {
    return (
      <div style={{ ...base, borderRadius: 999, boxShadow: '0 8px 18px rgba(79,70,229,0.30)' }}>
        {texto}
      </div>
    );
  }
  if (t.flag === 'plate') {
    return (
      <div style={{
        ...base, border: `1px solid ${t.rule}`, borderLeft: `5px solid ${t.accent}`,
        boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
      }}>
        {texto}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex' }}>
      <div style={base}>{texto}</div>
      <div style={{
        width: 0, height: 0,
        borderTop: '22px solid transparent', borderBottom: '22px solid transparent',
        borderLeft: `17px solid ${t.ink}`,
      }} />
    </div>
  );
};

// ─── Tabla de ítems ───────────────────────────────────────────────────────────
const ItemsTable = ({ items, amt, t, minRows = 4 }) => {
  const showDto = items.some((i) => Number(i.descuento) > 0);
  const showIva = items.some((i) => Number(i.impuesto) > 0);

  const cols = [
    { k: 'cant',  h: 'Cantidad',          w: 74,   align: 'center' },
    { k: 'desc',  h: 'Descripción',       w: null, align: 'left' },
    { k: 'pu',    h: 'Precio por unidad', w: 118,  align: 'right' },
    ...(showDto ? [{ k: 'dto', h: 'Dto.', w: 58, align: 'right' }] : []),
    ...(showIva ? [{ k: 'iva', h: 'IVA',  w: 58, align: 'right' }] : []),
    { k: 'total', h: 'Total',             w: 122,  align: 'right' },
  ];

  const filler = Math.max(0, minRows - items.length);

  const cell = (align, extra = {}) => ({
    padding: '9px 12px', textAlign: align, fontSize: 11,
    borderBottom: `1px solid ${t.hair}`, ...extra,
  });

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>
        {cols.map((c) => <col key={c.k} style={c.w ? { width: c.w } : undefined} />)}
      </colgroup>
      <thead>
        <tr style={{ background: t.ink }}>
          {cols.map((c) => (
            <th key={c.k} style={{
              padding: '10px 12px', color: '#fff', fontSize: 9, fontWeight: 700,
              letterSpacing: 1.2, textTransform: 'uppercase', textAlign: c.align,
            }}>{c.h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ background: t.zebra && i % 2 === 1 ? t.tint : '#fff' }}>
            <td style={cell('center', { color: '#374151' })}>{it.cantidad}</td>
            <td style={cell('left', { color: '#1f2937', fontWeight: 500 })}>{it.descripcion}</td>
            <td style={cell('right', { color: '#4b5563' })}>{amt(it.precio_unitario)}</td>
            {showDto && <td style={cell('right', { color: '#4b5563' })}>{Number(it.descuento) > 0 ? `${it.descuento}%` : '—'}</td>}
            {showIva && <td style={cell('right', { color: '#4b5563' })}>{Number(it.impuesto) > 0 ? `${it.impuesto}%` : '—'}</td>}
            <td style={cell('right', { color: '#111827', fontWeight: 700 })}>{amt(it.total)}</td>
          </tr>
        ))}
        {/* renglones vacíos: la plantilla mantiene la retícula aunque falten ítems */}
        {Array.from({ length: filler }).map((_, i) => (
          <tr key={`f${i}`}>
            {cols.map((c) => (
              <td key={c.k} style={{ padding: '9px 12px', borderBottom: `1px solid ${t.hair}`, fontSize: 11 }}>&nbsp;</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Totales escalonados a la derecha ─────────────────────────────────────────
const TotalesBlock = ({ doc, amt, fmt, t, esFactura }) => {
  const row = (label, value, opts = {}) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      borderTop: `1px solid ${opts.strong ? t.accent : t.hair}`,
      padding: '8px 12px 8px 0',
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase',
        color: opts.danger ? '#b91c1c' : '#4b5563', textAlign: 'right', paddingRight: 16,
      }}>{label}</div>
      <div style={{
        width: 130, textAlign: 'right', fontSize: 12, fontWeight: 600,
        color: opts.danger ? '#b91c1c' : '#111827',
      }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 400 }}>
        {row('Subtotal', amt(doc.subtotal))}
        {Number(doc.descuento_global) > 0 && row('Descuento', `-${amt(doc.descuento_global)}`, { danger: true })}
        {row('Impuesto sobre las ventas', amt(doc.impuesto_total || 0))}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          background: t.ink, color: '#fff', marginTop: 6,
          borderRadius: t.radius ? t.radius - 4 : 0, padding: '12px 12px 12px 0',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', paddingRight: 16 }}>
            {esFactura ? 'Total a pagar' : 'Total cotizado'}
          </div>
          <div style={{ width: 130, textAlign: 'right', fontSize: 15, fontWeight: 800 }}>{fmt(doc.total)}</div>
        </div>
      </div>
    </div>
  );
};

// ─── Historial de abonos ──────────────────────────────────────────────────────
const AbonosBlock = ({ doc, amt, fmt, t }) => {
  const abonos = parseAbonos(doc.abonos);
  if (!abonos.length) return null;

  const total   = Number(doc.total || 0);
  const abonado = Number(doc.total_abonado || 0);
  const saldo   = Math.max(0, total - abonado);
  const pct     = total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 0;
  const parcial = doc.estado === 'ABONO';

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Label t={t}>Historial de pagos</Label>
        {parcial && (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#c2410c' }}>
            Saldo pendiente: {fmt(saldo)}
          </div>
        )}
      </div>
      <Rule t={t} />
      {parcial && (
        <div style={{ margin: '10px 0 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#5b6470', marginBottom: 4 }}>
            <span>Abonado: <strong style={{ color: '#15803d' }}>{fmt(abonado)}</strong></span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 5, background: t.hair }}>
            <div style={{ width: `${pct}%`, height: '100%', background: t.accent }} />
          </div>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr>
            {['Fecha', 'Monto', 'Medio de pago', 'Nota'].map((h, i) => (
              <th key={h} style={{
                padding: '5px 10px 7px', textAlign: i === 1 ? 'right' : 'left',
                fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase',
                color: '#94a3b8', borderBottom: `1px solid ${t.rule}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {abonos.map((a, i) => (
            <tr key={i}>
              <td style={{ padding: '7px 10px', fontSize: 10.5, color: '#5b6470', borderBottom: `1px solid ${t.hair}` }}>{formatFechaDia(a.fecha)}</td>
              <td style={{ padding: '7px 10px', fontSize: 10.5, textAlign: 'right', fontWeight: 700, color: '#15803d', borderBottom: `1px solid ${t.hair}` }}>{amt(a.monto)}</td>
              <td style={{ padding: '7px 10px', fontSize: 10.5, color: '#5b6470', borderBottom: `1px solid ${t.hair}` }}>{a.cuenta}</td>
              <td style={{ padding: '7px 10px', fontSize: 10, color: '#94a3b8', borderBottom: `1px solid ${t.hair}` }}>{a.nota || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!parcial && (
        <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, color: '#15803d', textAlign: 'right' }}>
          ✓ Pagado completamente el {formatFechaDia(doc.fecha_pago, 'DD/MM/YYYY', '')}
        </div>
      )}
    </div>
  );
};

// ─── Pie con dirección / teléfono / correo ────────────────────────────────────
const Footer = ({ biz, t }) => {
  const dir = [biz?.address, biz?.city].filter(Boolean).join(', ');
  const cols = [
    { icon: <IconPin c={t.accent} />,   label: 'Dirección de oficina', value: dir },
    { icon: <IconPhone c={t.accent} />, label: 'Número de teléfono',   value: biz?.phone },
    { icon: <IconMail c={t.accent} />,  label: 'Correo electrónico',   value: biz?.contact_email },
  ].filter((c) => c.value);

  if (!cols.length) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <Rule t={t} strong />
      <div style={{ height: 2 }} />
      <Rule t={t} />
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16, padding: '16px 0 4px', textAlign: 'center' }}>
        {cols.map((c) => (
          <div key={c.label} style={{ flex: 1 }}>
            <div style={{
              width: 30, height: 30, margin: '0 auto 8px', borderRadius: '50%',
              background: t.tint, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{c.icon}</div>
            <div style={{ fontSize: 10.5, color: '#1f2937', fontWeight: 600, lineHeight: 1.4 }}>{c.value}</div>
            <div style={{
              fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase',
              color: t.accent, marginTop: 3, fontWeight: 700,
            }}>[{c.label}]</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Hoja completa ────────────────────────────────────────────────────────────
const Sheet = ({ doc, items, biz, amt, fmt, t }) => {
  const esFactura = (doc.tipo || 'FACTURA') === 'FACTURA';
  const titulo    = esFactura ? 'FACTURA' : 'COTIZACIÓN';
  const cliente   = doc.persona_nombre || doc.cliente_nombre || 'Sin especificar';
  const est       = estadoStyle(doc.estado);
  const instrucciones = [doc.notas, doc.condiciones].filter(Boolean);

  const metaRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 4 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: t.accent }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#1f2937', minWidth: 96, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      position: 'relative', fontFamily: t.font, background: '#fff',
      minHeight: SHEET_H, display: 'flex', flexDirection: 'column',
    }}>
      {doc.estado === 'ANULADA' && (
        <div style={{
          position: 'absolute', top: 420, left: 0, right: 0, textAlign: 'center',
          fontSize: 92, fontWeight: 800, letterSpacing: 12, color: 'rgba(185,28,28,0.10)',
          transform: 'rotate(-18deg)', pointerEvents: 'none',
        }}>ANULADA</div>
      )}

      <Masthead biz={biz} t={t} />

      <div style={{ padding: '0 40px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* position+zIndex: la cenefa es `position:relative`, asi que sin esto se
            pintaria encima de la bandera y la cortaria por la mitad. */}
        <div style={{ marginTop: -22, marginBottom: 26, display: 'flex', position: 'relative', zIndex: 2 }}>
          <Flag t={t} texto={titulo} />
        </div>

        {/* Datos del emisor + número y fechas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 30, marginBottom: 12 }}>
          <div style={{ maxWidth: 300 }}>
            {/* Direccion postal del emisor (el telefono y el correo van en «Emitido por» y el pie) */}
            {biz?.address && <Line>{biz.address}</Line>}
            {(biz?.city || biz?.country) && <Line>{[biz.city, biz.country].filter(Boolean).join(', ')}</Line>}
            {biz?.website && <Line>{biz.website}</Line>}
          </div>
          <div style={{ textAlign: 'right' }}>
            {metaRow(`${titulo} N.º`, doc.numero || '—')}
            {metaRow('Fecha', formatFechaDia(doc.fecha_emision))}
            {doc.fecha_vencimiento && metaRow(esFactura ? 'Vence' : 'Válida hasta', formatFechaDia(doc.fecha_vencimiento))}
            <div style={{
              display: 'inline-block', marginTop: 6, padding: '3px 14px',
              borderRadius: t.radius ? 999 : 2, background: est.bg, color: est.fg,
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            }}>{doc.estado}</div>
          </div>
        </div>

        <Rule t={t} strong />

        {/* PARA / EMITIDO POR */}
        <div style={{ display: 'flex', gap: 40, padding: '14px 0 14px' }}>
          <div style={{ flex: 1 }}>
            <Label t={t} style={{ marginBottom: 7 }}>Para:</Label>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{cliente}</div>
            {doc.cliente_identificacion && <Line>NIT / CC {doc.cliente_identificacion}</Line>}
            {doc.cliente_direccion && <Line>{doc.cliente_direccion}</Line>}
            {doc.cliente_telefono && <Line>Teléfono {doc.cliente_telefono}</Line>}
            {doc.cliente_email && <Line>{doc.cliente_email}</Line>}
          </div>
          <div style={{ flex: 1 }}>
            <Label t={t} style={{ marginBottom: 7 }}>Emitido por:</Label>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{biz?.name || 'Mi Empresa'}</div>
            {biz?.nit && <Line>NIT {biz.nit}</Line>}
            {biz?.phone && <Line>Teléfono {biz.phone}</Line>}
            {biz?.contact_email && <Line>{biz.contact_email}</Line>}
          </div>
        </div>

        <Rule t={t} />

        {/* Instrucciones */}
        {instrucciones.length > 0 && (
          <>
            <div style={{ padding: '12px 0 12px' }}>
              <Label t={t} style={{ marginBottom: 6 }}>Instrucciones</Label>
              {instrucciones.map((txt, i) => (
                <div key={i} style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{txt}</div>
              ))}
            </div>
            <Rule t={t} />
          </>
        )}

        {/* Tabla */}
        <div style={{ marginTop: 18, borderRadius: t.radius ? t.radius - 4 : 0, overflow: 'hidden' }}>
          <ItemsTable items={items} amt={amt} t={t} />
        </div>

        <div style={{ marginTop: 10 }}>
          <TotalesBlock doc={doc} amt={amt} fmt={fmt} t={t} esFactura={esFactura} />
        </div>

        <AbonosBlock doc={doc} amt={amt} fmt={fmt} t={t} />

        {/* Cierre + pie */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{
            textAlign: 'center', marginTop: 22, fontSize: 11, fontWeight: 600,
            letterSpacing: 0.6, color: t.accent, fontFamily: t.titleFont,
          }}>
            {esFactura ? 'Gracias por su confianza' : 'Quedamos atentos a su respuesta'}
          </div>
          <Footer biz={biz} t={t} />
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const FacturaViewer = ({ open, onClose, doc }) => {
  const fmt        = useCurrency();
  const amt        = useAmount();
  const { user }   = useContext(AuthContext);
  const { isDark } = useTheme();
  const [design, setDesign]           = useState('corporativa');
  const [downloading, setDownloading] = useState(false);
  const [bizInfo, setBizInfo]         = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!open || !user?.bid) return;
    axios
      .get(`${API_AUTH_URL}/api/businesses/${user.bid}`, getAuthHeaders())
      .then(({ data }) => setBizInfo(data))
      .catch(() => {});
  }, [open, user?.bid]);

  if (!doc) return null;

  const items = parseItems(doc.items);
  const t     = THEMES[design] || THEMES.corporativa;

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const el = previewRef.current;

      // Forzar ancho A4 (794px ≈ 210mm a 96dpi) para que la proporción
      // alto/ancho sea consistente independientemente del dispositivo.
      const prevWidth    = el.style.width;
      const prevMinWidth = el.style.minWidth;
      el.style.width    = `${SHEET_W}px`;
      el.style.minWidth = `${SHEET_W}px`;
      el.getBoundingClientRect(); // fuerza reflow antes de capturar

      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        scrollX: 0, scrollY: 0,
      });

      el.style.width    = prevWidth;
      el.style.minWidth = prevMinWidth;

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF('p', 'mm', 'a4');
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = (canvas.height * pdfW) / canvas.width;
      const pageH   = pdf.internal.pageSize.getHeight();

      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      } else if (pdfH <= pageH * 1.2) {
        // Se pasa por poco: se ajusta a una sola página en vez de dejar una
        // segunda hoja casi vacía con el pie.
        const w = (pageH * pdfW) / pdfH;
        pdf.addImage(imgData, 'PNG', (pdfW - w) / 2, 0, w, pageH);
      } else {
        let y = 0;
        while (y < pdfH) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH);
          y += pageH;
        }
      }

      pdf.save(`${doc.numero}-${design}.pdf`);
      message.success('PDF descargado');
    } catch (err) {
      console.error(err);
      message.error('Error al generar PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const content = previewRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${doc.numero}</title>
      <style>body{margin:0;padding:0}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
      </head><body>${content.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const modalWidth = typeof window !== 'undefined' ? Math.min(900, window.innerWidth - 24) : 900;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={modalWidth}
      footer={null}
      styles={{ body: { padding: 0, background: isDark ? '#262624' : '#f1f5f9' } }}
      title={<span style={{ fontWeight: 700 }}>{doc.numero}</span>}
    >
      {/* Barra de controles — hace wrap en móvil */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: 8, padding: '12px 20px',
        borderBottom: `1px solid ${isDark ? '#403e3a' : '#e5e7eb'}`,
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          {DESIGNS.map((d) => {
            const activo = design === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDesign(d.id)}
                style={{
                  padding: '4px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `2px solid ${activo ? THEMES[d.id].accent : (isDark ? '#403e3a' : '#e2e8f0')}`,
                  background: activo ? THEMES[d.id].tint : (isDark ? '#30302e' : '#fff'),
                  color: activo ? THEMES[d.id].ink : (isDark ? '#a8a59e' : '#64748b'),
                  transition: 'all 0.15s',
                }}
              >{d.label}</button>
            );
          })}
        </div>
        <Space>
          <Tooltip title="Imprimir">
            <Button icon={<PrinterOutlined />} onClick={handlePrint} />
          </Tooltip>
          <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}>
            PDF
          </Button>
        </Space>
      </div>

      <div style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto', overflowX: 'auto' }}>
        <div
          ref={previewRef}
          style={{
            background: '#fff', width: SHEET_W, minWidth: SHEET_W,
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)', margin: '0 auto',
          }}
        >
          <Sheet doc={doc} items={items} biz={bizInfo} amt={amt} fmt={fmt} t={t} />
        </div>
      </div>
    </Modal>
  );
};

export default FacturaViewer;
