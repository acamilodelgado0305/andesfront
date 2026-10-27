// src/components/tareas/EliminarProyectoModal.jsx
// Eliminar un proyecto para siempre (con sus listas, tarjetas, subtareas,
// comentarios y adjuntos). Como no se puede deshacer, se confirma escribiendo
// el nombre. El backend solo borra proyectos archivados: si no lo está, se
// archiva primero y luego se elimina.
import React, { useEffect, useState } from 'react';
import { Modal, Input, Alert, message } from 'antd';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { IconoProyecto } from './piezasTareas';

const normal = (s) => String(s || '').trim().toLowerCase();

const EliminarProyectoModal = ({ proyecto, onCerrar, onEliminado }) => {
  const [texto, setTexto] = useState('');
  const [borrando, setBorrando] = useState(false);
  useEffect(() => { setTexto(''); }, [proyecto?.id]);

  const coincide = proyecto && normal(texto) === normal(proyecto.nombre);

  const eliminar = async () => {
    if (!coincide) return;
    setBorrando(true);
    try {
      if (!proyecto.archivado) await api.actualizarTablero(proyecto.id, { archivado: true });
      await api.eliminarTablero(proyecto.id);
      message.success(`Proyecto "${proyecto.nombre}" eliminado`);
      onEliminado?.(proyecto);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo eliminar el proyecto'));
    } finally {
      setBorrando(false);
    }
  };

  const total = proyecto?.total ?? proyecto?.tarjetas;

  return (
    <Modal
      open={!!proyecto}
      onCancel={onCerrar}
      onOk={eliminar}
      okText="Eliminar para siempre"
      cancelText="Cancelar"
      okButtonProps={{ danger: true, disabled: !coincide }}
      confirmLoading={borrando}
      title="Eliminar proyecto"
      destroyOnClose
    >
      {proyecto && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 14px' }}>
            <IconoProyecto tablero={proyecto} size={36} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--qc-text)' }}>{proyecto.nombre}</div>
              {typeof total === 'number' && (
                <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{total} tarjeta{total === 1 ? '' : 's'}</div>
              )}
            </div>
          </div>
          <Alert
            type="error"
            showIcon
            message="Esto no se puede deshacer"
            description="Se borran el proyecto, sus listas y todas sus tarjetas con subtareas, comentarios y archivos. Si solo quieres sacarlo de la vista, mejor archívalo."
            style={{ marginBottom: 14 }}
          />
          <div style={{ fontSize: 13, color: 'var(--qc-text)', marginBottom: 6 }}>
            Para confirmar, escribe <strong>{proyecto.nombre}</strong>
          </div>
          <Input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} onPressEnter={eliminar} placeholder={proyecto.nombre} />
        </>
      )}
    </Modal>
  );
};

export default EliminarProyectoModal;
