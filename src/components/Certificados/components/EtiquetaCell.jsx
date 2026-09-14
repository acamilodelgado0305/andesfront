import React, { useRef, useState } from 'react';
import { Popover, Spin, message } from 'antd';
import { TagOutlined } from '@ant-design/icons';

import { updateEgreso } from '../../../services/controlapos/posService';
import EtiquetasSelector, { EtiquetaChip } from './EtiquetasSelector';

/**
 * Etiqueta de un gasto editable en la misma tabla (o en la tarjeta del
 * celular): un clic abre los chips de etiquetas y elegir uno lo guarda de una
 * vez; tocar la elegida la quita. Desde el "+" del selector también se crean,
 * editan y eliminan etiquetas.
 *
 * onSaved: recarga los gastos (la tabla recibe los datos del padre).
 */
const EtiquetaCell = ({ record, onSaved }) => {
  const [abierto, setAbierto]     = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Se crearon/editaron/eliminaron etiquetas: al cerrar hay que recargar para
  // ver nombres y colores nuevos aunque este gasto no haya cambiado.
  const etiquetasCambiaron = useRef(false);

  const actual = record.categoria_id ?? null;

  const cerrar = () => {
    setAbierto(false);
    if (etiquetasCambiaron.current) {
      etiquetasCambiaron.current = false;
      onSaved?.();
    }
  };

  const asignar = async (categoriaId) => {
    const nueva = categoriaId ?? null;
    if (nueva === actual) { cerrar(); return; }

    setGuardando(true);
    try {
      // Solo se manda la etiqueta: el backend conserva el resto del gasto.
      await updateEgreso(record._id, { categoria_id: nueva });
      message.success(nueva ? 'Etiqueta asignada' : 'Etiqueta quitada');
      etiquetasCambiaron.current = false;
      setAbierto(false);
      onSaved?.();
    } catch (err) {
      message.error(err?.response?.data?.message || 'No se pudo cambiar la etiqueta');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Popover
      open={abierto}
      onOpenChange={(abrir) => (abrir ? setAbierto(true) : cerrar())}
      trigger="click"
      placement="bottomLeft"
      // Se desmonta al cerrar: cada vez que se abre trae las etiquetas al día.
      destroyTooltipOnHide
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Etiqueta del gasto {guardando && <Spin size="small" />}
        </span>
      }
      content={
        <div style={{ maxWidth: 320, opacity: guardando ? 0.6 : 1, pointerEvents: guardando ? 'none' : 'auto' }}>
          <EtiquetasSelector
            value={actual}
            onChange={asignar}
            onCambios={() => { etiquetasCambiaron.current = true; }}
          />
        </div>
      }
    >
      <button
        type="button"
        title="Cambiar etiqueta"
        aria-label="Cambiar etiqueta"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          maxWidth: '100%',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
        }}
      >
        {/* Sin ícono de editar: tocar el chip ya abre la edición */}
        {record.categoria_nombre ? (
          <EtiquetaChip nombre={record.categoria_nombre} color={record.categoria_color} size="sm" />
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              lineHeight: '20px',
              padding: '0 8px',
              borderRadius: 5,
              border: '1px dashed var(--qc-border)',
              color: 'var(--qc-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            <TagOutlined /> Sin etiqueta
          </span>
        )}
      </button>
    </Popover>
  );
};

export default EtiquetaCell;
