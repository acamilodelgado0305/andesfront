// src/components/Sidebar/BusinessSwitcherSheet.jsx
// Cambio de negocio en el celular: una hoja inferior con filas grandes, fáciles
// de tocar con el pulgar. Cada negocio funciona como un "perfil" con sus propios
// ingresos, gastos y módulos (p. ej. "Personal" y la empresa), así que cambiar
// tiene que ser cosa de un toque. En computador sigue el menú desplegable.
//
// Desde aquí también se le cambia el nombre al negocio activo (solo admins):
// en el celular no hay otro sitio a mano para hacerlo.
import React, { useEffect, useState } from 'react';
import { Button, Input, Spin } from 'antd';
import { CheckCircleFilled, EditOutlined, PlusOutlined } from '@ant-design/icons';
import BottomSheet from '../common/BottomSheet';

// Color estable por negocio: el mismo negocio siempre se ve igual.
const COLORES = ['#1d4ed8', '#15803d', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#ca8a04', '#475569'];
export const colorNegocio = (id) => COLORES[Math.abs(Number(id) || 0) % COLORES.length];

export const inicialesNegocio = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const NOMBRE_MAX = 100;

const Avatar = ({ id, nombre }) => (
  <span style={{
    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: colorNegocio(id), color: '#fff', fontWeight: 700, fontSize: 15,
  }}>
    {inicialesNegocio(nombre)}
  </span>
);

const BusinessSwitcherSheet = ({
  open,
  onClose,
  businesses = [],
  activeId,
  activeName = '',
  switchingId,
  onSelect,
  onCreate,
  // (nombre) => Promise<boolean>. Sin él no se ofrece editar (usuario no admin).
  onRename,
  zIndex,
}) => {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cada vez que se abre, arranca en la lista y no en la edición a medias.
  useEffect(() => {
    if (!open) { setEditando(false); setGuardando(false); }
  }, [open]);

  const nombreActual = businesses.find((b) => String(b.id) === String(activeId))?.name || activeName;
  const limpio = nombre.trim();

  const empezarEdicion = () => { setNombre(nombreActual); setEditando(true); };

  const guardar = async () => {
    if (!limpio || guardando) return;
    if (limpio === nombreActual) { setEditando(false); return; }
    setGuardando(true);
    const ok = await onRename(limpio);
    setGuardando(false);
    if (ok) setEditando(false);
  };

  if (editando) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        zIndex={zIndex}
        title="Nombre del negocio"
        subtitle="Lo verán todos los usuarios de este negocio."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Avatar id={activeId} nombre={limpio || nombreActual} />
          <Input
            size="large"
            autoFocus
            value={nombre}
            maxLength={NOMBRE_MAX}
            placeholder="Ej. Mi tienda"
            onChange={(e) => setNombre(e.target.value)}
            onPressEnter={guardar}
            disabled={guardando}
            // 16px: con menos, el iPhone hace zoom al enfocar el campo.
            style={{ fontSize: 16 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button size="large" block onClick={() => setEditando(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="large" block type="primary" onClick={guardar} loading={guardando} disabled={!limpio}>
            Guardar
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      zIndex={zIndex}
      title="Cambiar de negocio"
      subtitle="Cada negocio lleva sus propios ingresos, gastos y módulos."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {businesses.map((b) => {
          const activo = String(b.id) === String(activeId);
          const cambiando = String(b.id) === String(switchingId);
          const editable = activo && !!onRename;
          return (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center',
                borderRadius: 14, overflow: 'hidden',
                border: `1.5px solid ${activo ? 'var(--qc-azul)' : 'var(--qc-border)'}`,
                background: activo ? 'var(--qc-azul-suave)' : 'var(--qc-surface)',
                opacity: switchingId && !cambiando ? 0.55 : 1,
                transition: 'opacity .15s, background .15s',
              }}
            >
              <button
                type="button"
                disabled={!!switchingId}
                onClick={() => (activo ? onClose() : onSelect(b))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
                  minHeight: 64, padding: '10px 12px',
                  textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                <Avatar id={b.id} nombre={b.name} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {b.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 1 }}>
                    {activo ? 'Negocio actual · ' : ''}{['admin', 'superadmin'].includes(b.role) ? 'Administrador' : 'Colaborador'}
                  </span>
                </span>
                {cambiando
                  ? <Spin size="small" />
                  : activo && !editable && <CheckCircleFilled style={{ color: 'var(--qc-azul)', fontSize: 20 }} />}
              </button>

              {editable && (
                <button
                  type="button"
                  onClick={empezarEdicion}
                  disabled={!!switchingId}
                  aria-label={`Editar el nombre de ${b.name}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    alignSelf: 'stretch', padding: '0 14px', marginLeft: 2,
                    border: 'none', borderLeft: '1px solid var(--qc-border)',
                    background: 'transparent', color: 'var(--qc-azul)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  <EditOutlined style={{ fontSize: 15 }} /> Editar
                </button>
              )}
            </div>
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
};

export default BusinessSwitcherSheet;
