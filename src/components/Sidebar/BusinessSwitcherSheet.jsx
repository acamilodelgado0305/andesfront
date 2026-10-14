// src/components/Sidebar/BusinessSwitcherSheet.jsx
// Cambio de negocio en el celular: una hoja inferior con filas grandes, fáciles
// de tocar con el pulgar. Cada negocio funciona como un "perfil" con sus propios
// ingresos, gastos y módulos (p. ej. "Personal" y la empresa), así que cambiar
// tiene que ser cosa de un toque. En computador sigue el menú desplegable.
import React from 'react';
import { Spin } from 'antd';
import { CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import BottomSheet from '../common/BottomSheet';

// Color estable por negocio: el mismo negocio siempre se ve igual.
const COLORES = ['#1d4ed8', '#15803d', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#ca8a04', '#475569'];
export const colorNegocio = (id) => COLORES[Math.abs(Number(id) || 0) % COLORES.length];

export const inicialesNegocio = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const BusinessSwitcherSheet = ({ open, onClose, businesses = [], activeId, switchingId, onSelect, onCreate }) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title="Cambiar de negocio"
    subtitle="Cada negocio lleva sus propios ingresos, gastos y módulos."
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {businesses.map((b) => {
        const activo = String(b.id) === String(activeId);
        const cambiando = String(b.id) === String(switchingId);
        return (
          <button
            key={b.id}
            type="button"
            disabled={!!switchingId}
            onClick={() => (activo ? onClose() : onSelect(b))}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', minHeight: 60, padding: '10px 12px',
              borderRadius: 14, textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${activo ? 'var(--qc-azul)' : 'var(--qc-border)'}`,
              background: activo ? 'var(--qc-azul-suave)' : 'var(--qc-surface)',
              opacity: switchingId && !cambiando ? 0.55 : 1,
              transition: 'opacity .15s, background .15s',
            }}
          >
            <span style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: colorNegocio(b.id), color: '#fff', fontWeight: 700, fontSize: 15,
            }}>
              {inicialesNegocio(b.name)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {b.name}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 1 }}>
                {b.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </span>
            {cambiando
              ? <Spin size="small" />
              : activo && <CheckCircleFilled style={{ color: 'var(--qc-azul)', fontSize: 20 }} />}
          </button>
        );
      })}

      {businesses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--qc-text-muted)', fontSize: 13 }}>
          Sin negocios disponibles
        </div>
      )}

      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            minHeight: 48, marginTop: 4, borderRadius: 14, cursor: 'pointer',
            border: '1.5px dashed var(--qc-azul)', background: 'transparent',
            color: 'var(--qc-azul)', fontWeight: 600, fontSize: 14,
          }}
        >
          <PlusOutlined /> Crear nuevo negocio
        </button>
      )}
    </div>
  </BottomSheet>
);

export default BusinessSwitcherSheet;
