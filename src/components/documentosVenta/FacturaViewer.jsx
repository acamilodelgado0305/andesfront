import React, { useRef, useState, useEffect, useContext } from 'react';
import { Modal, Button, Space, Tooltip, message } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import axios from 'axios';
import useCurrency from '../../hooks/useCurrency';
import { AuthContext } from '../../AuthContext';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } });

const parseItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const parseAbonos = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) || []; } catch { return []; }
};

const DESIGNS = [
  { id: 'corporativa',  label: 'Corporativa'  },
  { id: 'moderna',      label: 'Moderna'      },
  { id: 'ejecutiva',    label: 'Ejecutiva'    },
];

// ─── Tabla de ítems compartida ────────────────────────────────────────────────
const ItemsTable = ({ items, formatCurrency, headerBg, headerColor = '#fff', borderColor = '#e5e7eb', altRowBg = '#f9fafb' }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
    <thead>
      <tr style={{ background: headerBg }}>
        {['Descripción', 'Cant.', 'Precio unit.', 'Dto. %', 'IVA %', 'Total'].map((h, i) => (
          <th key={i} style={{
            padding: '10px 12px', color: headerColor, fontWeight: 600, fontSize: 11,
            textAlign: i === 0 ? 'left' : 'right',
          }}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {items.map((it, i) => (
        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : altRowBg, borderBottom: `1px solid ${borderColor}` }}>
          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{it.descripcion}</td>
          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>{it.cantidad}</td>
          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>{formatCurrency(it.precio_unitario)}</td>
          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>{it.descuento || 0}%</td>
          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>{it.impuesto || 0}%</td>
          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(it.total)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// ─── Bloque de totales compartido ─────────────────────────────────────────────
const TotalesBlock = ({ doc, formatCurrency, totalColor = '#111', totalBg, borderColor = '#e5e7eb' }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
    <div style={{ minWidth: 260, background: totalBg, borderRadius: totalBg ? 10 : 0, padding: totalBg ? '14px 20px' : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: totalBg ? 'rgba(255,255,255,0.8)' : '#6b7280', padding: '4px 0' }}>
        <span>Subtotal</span><span>{formatCurrency(doc.subtotal)}</span>
      </div>
      {Number(doc.descuento_global) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: totalBg ? 'rgba(255,255,255,0.8)' : '#dc2626', padding: '4px 0' }}>
          <span>Descuento</span><span>-{formatCurrency(doc.descuento_global)}</span>
        </div>
      )}
      {Number(doc.impuesto_total) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: totalBg ? 'rgba(255,255,255,0.8)' : '#6b7280', padding: '4px 0' }}>
          <span>IVA</span><span>{formatCurrency(doc.impuesto_total)}</span>
        </div>
      )}
      <div style={{ height: 1, background: totalBg ? 'rgba(255,255,255,0.25)' : borderColor, margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, color: totalBg ? '#fff' : totalColor }}>
        <span>TOTAL</span><span>{formatCurrency(doc.total)}</span>
      </div>
    </div>
  </div>
);

// ─── Bloque de abonos compartido ──────────────────────────────────────────────
const AbonosBlock = ({ doc, formatCurrency, borderColor = '#e5e7eb', headerBg = '#f8fafc', accentColor = '#16a34a' }) => {
  const abonos = parseAbonos(doc.abonos);
  if (!abonos.length) return null;

  const total    = Number(doc.total || 0);
  const abonado  = Number(doc.total_abonado || 0);
  const saldo    = Math.max(0, total - abonado);
  const pct      = total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 0;
  const parcial  = doc.estado === 'ABONO';

  return (
    <div style={{ marginTop: 24, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: headerBg, padding: '10px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#94a3b8' }}>HISTORIAL DE PAGOS</div>
        {parcial && (
          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700 }}>
            Saldo pendiente: {formatCurrency(saldo)}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>
        {parcial && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>
              <span>Abonado: <strong style={{ color: '#16a34a' }}>{formatCurrency(abonado)}</strong></span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#16a34a', borderRadius: 3 }} />
            </div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              {['Fecha', 'Monto', 'Medio de pago', 'Nota'].map((h, i) => (
                <th key={i} style={{
                  padding: '5px 8px', textAlign: i === 1 ? 'right' : 'left',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#94a3b8',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {abonos.map((a, i) => (
              <tr key={i} style={{ borderBottom: i < abonos.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                <td style={{ padding: '8px', color: '#6b7280' }}>{dayjs(a.fecha).format('DD/MM/YYYY')}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(a.monto)}</td>
                <td style={{ padding: '8px', color: '#6b7280' }}>{a.cuenta}</td>
                <td style={{ padding: '8px', color: '#94a3b8', fontSize: 11 }}>{a.nota || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!parcial && (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>
            ✓ Pagado completamente el {doc.fecha_pago ? dayjs(doc.fecha_pago).format('DD/MM/YYYY') : ''}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DISEÑO 1: CORPORATIVA ────────────────────────────────────────────────────
const DisenoCorporativa = ({ doc, items, formatCurrency, biz }) => {
  const cliente = doc.cliente_nombre || doc.persona_nombre || 'Sin especificar';
  const estadoBg    = doc.estado === 'PAGADA' ? '#dcfce7' : doc.estado === 'ANULADA' ? '#fee2e2' : doc.estado === 'ABONO' ? '#fff7ed' : '#dbeafe';
  const estadoColor = doc.estado === 'PAGADA' ? '#166534' : doc.estado === 'ANULADA' ? '#dc2626' : doc.estado === 'ABONO' ? '#ea580c' : '#1d4ed8';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', minHeight: 900 }}>
      {/* Barra superior azul oscuro */}
      <div style={{ background: '#0f172a', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>FACTURA</div>
          {biz?.name && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{biz.name}</div>}
          {(biz?.address || biz?.city) && (
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{[biz.address, biz.city].filter(Boolean).join(' · ')}</div>
          )}
          {biz?.phone && <div style={{ color: '#64748b', fontSize: 11 }}>{biz.phone}</div>}
          {biz?.contact_email && <div style={{ color: '#64748b', fontSize: 11 }}>{biz.contact_email}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#cbd5e1', fontSize: 22, fontWeight: 700 }}>{doc.numero || '—'}</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
            Emisión: <span style={{ color: '#94a3b8' }}>{doc.fecha_emision ? dayjs(doc.fecha_emision).format('DD / MM / YYYY') : '—'}</span>
          </div>
          {doc.fecha_vencimiento && (
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
              Vence: <span style={{ color: '#94a3b8' }}>{dayjs(doc.fecha_vencimiento).format('DD / MM / YYYY')}</span>
            </div>
          )}
          <div style={{ marginTop: 10, display: 'inline-block', background: estadoBg, color: estadoColor, borderRadius: 20, padding: '3px 14px', fontSize: 12, fontWeight: 700 }}>
            {doc.estado}
          </div>
        </div>
      </div>

      {/* Acento azul */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #1d4ed8, #38bdf8)' }} />

      <div style={{ padding: '32px 40px' }}>
        {/* Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '18px 20px', borderLeft: '4px solid #1d4ed8' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10 }}>FACTURAR A</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{cliente}</div>
            {doc.cliente_identificacion && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>NIT / CC: {doc.cliente_identificacion}</div>}
            {doc.cliente_email && <div style={{ fontSize: 12, color: '#64748b' }}>{doc.cliente_email}</div>}
            {doc.cliente_telefono && <div style={{ fontSize: 12, color: '#64748b' }}>{doc.cliente_telefono}</div>}
            {doc.cliente_direccion && <div style={{ fontSize: 12, color: '#64748b' }}>{doc.cliente_direccion}</div>}
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10 }}>DETALLE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{formatCurrency(doc.total)}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
              {Number(doc.impuesto_total) > 0 && ` · IVA: ${formatCurrency(doc.impuesto_total)}`}
            </div>
            {doc.fecha_pago && (
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8, fontWeight: 600 }}>
                ✓ Pagado el {dayjs(doc.fecha_pago).format('DD/MM/YYYY')}
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <ItemsTable items={items} formatCurrency={formatCurrency} headerBg="#0f172a" altRowBg="#f8fafc" borderColor="#e2e8f0" />
        </div>

        <TotalesBlock doc={doc} formatCurrency={formatCurrency} totalColor="#1d4ed8" borderColor="#e2e8f0" />

        <AbonosBlock doc={doc} formatCurrency={formatCurrency} borderColor="#e2e8f0" headerBg="#f8fafc" />

        {doc.notas && (
          <div style={{ marginTop: 28, padding: '14px 18px', background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid #1d4ed8' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 6 }}>NOTAS</div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{doc.notas}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DISEÑO 2: MODERNA ────────────────────────────────────────────────────────
const DisenoModerna = ({ doc, items, formatCurrency, biz }) => {
  const cliente = doc.cliente_nombre || doc.persona_nombre || 'Sin especificar';
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#fff', minHeight: 900 }}>
      {/* Header degradado violeta-azul */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)', padding: '36px 44px 32px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>FACTURA</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>{doc.numero || '—'}</div>
            {biz?.name && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, fontWeight: 600 }}>{biz.name}</div>}
            {(biz?.address || biz?.city) && (
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{[biz.address, biz.city].filter(Boolean).join(', ')}</div>
            )}
            {biz?.phone && <div style={{ fontSize: 11, opacity: 0.65 }}>{biz.phone}</div>}
          </div>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div style={{ opacity: 0.7, fontSize: 10, letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>FECHA EMISIÓN</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{doc.fecha_emision ? dayjs(doc.fecha_emision).format('DD / MM / YYYY') : '—'}</div>
            {doc.fecha_vencimiento && (
              <>
                <div style={{ opacity: 0.7, fontSize: 10, letterSpacing: 2, fontWeight: 700, marginTop: 12, marginBottom: 6 }}>VENCIMIENTO</div>
                <div style={{ fontWeight: 600 }}>{dayjs(doc.fecha_vencimiento).format('DD / MM / YYYY')}</div>
              </>
            )}
            {biz?.contact_email && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 10 }}>{biz.contact_email}</div>}
          </div>
        </div>

        {/* Badge estado */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)',
            borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700,
          }}>{doc.estado}</div>
          {doc.fecha_pago && (
            <div style={{ fontSize: 11, opacity: 0.8 }}>· Pagado el {dayjs(doc.fecha_pago).format('DD/MM/YYYY')}</div>
          )}
        </div>
      </div>

      <div style={{ padding: '32px 44px' }}>
        {/* Cliente + resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div style={{ border: '1.5px solid #e0e7ff', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6366f1', marginBottom: 10 }}>CLIENTE</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e1b4b' }}>{cliente}</div>
            {doc.cliente_identificacion && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>NIT/CC: {doc.cliente_identificacion}</div>}
            {doc.cliente_email && <div style={{ fontSize: 12, color: '#6b7280' }}>{doc.cliente_email}</div>}
            {doc.cliente_telefono && <div style={{ fontSize: 12, color: '#6b7280' }}>{doc.cliente_telefono}</div>}
          </div>
          <div style={{ border: '1.5px solid #e0e7ff', borderRadius: 12, padding: '18px 20px', background: '#fafbff' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6366f1', marginBottom: 10 }}>RESUMEN</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#4f46e5' }}>{formatCurrency(doc.total)}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
              {Number(doc.impuesto_total) > 0 && ` · IVA ${formatCurrency(doc.impuesto_total)}`}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e0e7ff', marginBottom: 24 }}>
          <ItemsTable items={items} formatCurrency={formatCurrency} headerBg="#4f46e5" altRowBg="#f5f3ff" borderColor="#e0e7ff" />
        </div>

        <TotalesBlock doc={doc} formatCurrency={formatCurrency} totalBg="linear-gradient(135deg,#4f46e5,#0ea5e9)" />

        <AbonosBlock doc={doc} formatCurrency={formatCurrency} borderColor="#e0e7ff" headerBg="#fafbff" />

        {doc.notas && (
          <div style={{ marginTop: 24, padding: '14px 18px', background: '#fafbff', borderRadius: 10, borderLeft: '3px solid #6366f1' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6366f1', marginBottom: 6 }}>NOTAS</div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{doc.notas}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DISEÑO 3: EJECUTIVA ──────────────────────────────────────────────────────
const DisenoEjecutiva = ({ doc, items, formatCurrency, biz }) => {
  const cliente = doc.cliente_nombre || doc.persona_nombre || 'Sin especificar';
  return (
    <div style={{ fontFamily: '"Segoe UI", Arial, sans-serif', background: '#fff', display: 'flex', minHeight: 900 }}>
      {/* Sidebar izquierdo oscuro */}
      <div style={{ width: 210, background: '#111827', flexShrink: 0, padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Logo/empresa */}
        <div>
          <div style={{ width: 40, height: 4, background: '#10b981', borderRadius: 2, marginBottom: 14 }} />
          {biz?.name
            ? <div style={{ color: '#f9fafb', fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{biz.name}</div>
            : <div style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>Mi Empresa</div>
          }
          {(biz?.address || biz?.city) && (
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{[biz.address, biz.city].filter(Boolean).join('\n')}</div>
          )}
          {biz?.phone && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{biz.phone}</div>}
          {biz?.contact_email && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{biz.contact_email}</div>}
        </div>

        {/* Número */}
        <div>
          <div style={{ color: '#4b5563', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 6 }}>FACTURA</div>
          <div style={{ color: '#10b981', fontSize: 18, fontWeight: 800 }}>{doc.numero || '—'}</div>
        </div>

        {/* Fechas */}
        <div>
          <div style={{ color: '#4b5563', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>FECHAS</div>
          <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>Emisión</div>
          <div style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
            {doc.fecha_emision ? dayjs(doc.fecha_emision).format('DD / MM / YYYY') : '—'}
          </div>
          {doc.fecha_vencimiento && (
            <>
              <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>Vencimiento</div>
              <div style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600 }}>
                {dayjs(doc.fecha_vencimiento).format('DD / MM / YYYY')}
              </div>
            </>
          )}
        </div>

        {/* Estado */}
        <div>
          <div style={{ color: '#4b5563', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>ESTADO</div>
          <div style={{
            display: 'inline-block', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700,
            background: doc.estado === 'PAGADA' ? '#064e3b' : doc.estado === 'ANULADA' ? '#7f1d1d' : doc.estado === 'ABONO' ? '#431407' : '#1e3a5f',
            color:      doc.estado === 'PAGADA' ? '#6ee7b7' : doc.estado === 'ANULADA' ? '#fca5a5' : doc.estado === 'ABONO' ? '#fb923c' : '#93c5fd',
          }}>{doc.estado}</div>
          {doc.fecha_pago && (
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 6 }}>
              Cobrado el<br />{dayjs(doc.fecha_pago).format('DD/MM/YYYY')}
            </div>
          )}
        </div>

        {/* Total en sidebar */}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #1f2937' }}>
          <div style={{ color: '#4b5563', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 6 }}>TOTAL</div>
          <div style={{ color: '#10b981', fontSize: 20, fontWeight: 900 }}>{formatCurrency(doc.total)}</div>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, padding: '36px 36px 36px 32px' }}>
        {/* Cliente */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#9ca3af', fontWeight: 700, marginBottom: 10 }}>FACTURAR A</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{cliente}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 1.8 }}>
            {doc.cliente_identificacion && <div>NIT / CC: {doc.cliente_identificacion}</div>}
            {doc.cliente_email && <div>{doc.cliente_email}</div>}
            {doc.cliente_telefono && <div>{doc.cliente_telefono}</div>}
            {doc.cliente_direccion && <div>{doc.cliente_direccion}</div>}
          </div>
        </div>

        {/* Línea */}
        <div style={{ height: 2, background: '#111827', marginBottom: 24 }} />

        {/* Tabla */}
        <div style={{ marginBottom: 24 }}>
          <ItemsTable items={items} formatCurrency={formatCurrency} headerBg="#111827" altRowBg="#f9fafb" borderColor="#f3f4f6" />
        </div>

        {/* Totales */}
        <TotalesBlock doc={doc} formatCurrency={formatCurrency} totalColor="#10b981" borderColor="#e5e7eb" />

        <AbonosBlock doc={doc} formatCurrency={formatCurrency} borderColor="#374151" headerBg="#f9fafb" />

        {doc.notas && (
          <div style={{ marginTop: 28, padding: '14px 18px', background: '#f9fafb', borderRadius: 8, borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#9ca3af', marginBottom: 6 }}>NOTAS</div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{doc.notas}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const DESIGN_COMPONENTS = {
  corporativa: DisenoCorporativa,
  moderna:     DisenoModerna,
  ejecutiva:   DisenoEjecutiva,
};

// ─── Componente principal ─────────────────────────────────────────────────────
const FacturaViewer = ({ open, onClose, doc }) => {
  const formatCurrency = useCurrency();
  const { user }       = useContext(AuthContext);
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

  const items    = parseItems(doc.items);
  const DesignComp = DESIGN_COMPONENTS[design];

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const el = previewRef.current;

      // Forzar ancho A4 (794px ≈ 210mm a 96dpi) para que la proporción
      // alto/ancho sea consistente independientemente del dispositivo.
      const prevWidth    = el.style.width;
      const prevMinWidth = el.style.minWidth;
      el.style.width    = '794px';
      el.style.minWidth = '794px';
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
      <style>body{margin:0;padding:0}@media print{body{-webkit-print-color-adjust:exact}}</style>
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
      styles={{ body: { padding: 0, background: '#f1f5f9' } }}
      title={<span style={{ fontWeight: 700, color: '#0f172a' }}>{doc.numero}</span>}
    >
      {/* Barra de controles — hace wrap en móvil */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: 8, padding: '12px 20px 0',
        borderBottom: '1px solid #e5e7eb', paddingBottom: 12,
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          {DESIGNS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDesign(d.id)}
              style={{
                padding: '4px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: design === d.id ? '2px solid #1d4ed8' : '2px solid #e2e8f0',
                background: design === d.id ? '#eff6ff' : '#fff',
                color: design === d.id ? '#1d4ed8' : '#64748b',
                transition: 'all 0.15s',
              }}
            >{d.label}</button>
          ))}
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
          style={{ background: '#fff', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', minWidth: 600 }}
        >
          <DesignComp doc={doc} items={items} formatCurrency={formatCurrency} biz={bizInfo} />
        </div>
      </div>
    </Modal>
  );
};

export default FacturaViewer;
