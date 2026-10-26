// src/components/tareas/ProyectoModal.jsx
// Crear o editar un proyecto: nombre, emoji, color y (al crear) con qué listas
// arranca.
import React, { useEffect, useState } from 'react';
import { Modal, Input, Radio } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { COLORES_PROYECTO, EMOJIS_PROYECTO } from './utilsTareas';
import { IconoProyecto } from './piezasTareas';

const PLANTILLAS = [
  { value: 'flujo', titulo: 'Mi flujo (como en Trello)', detalle: '📥 Bandeja · 📌 Por hacer · 📆 Esta semana · ⚙️ En proceso · ⏳ Esperando a otros · ✅ Hecho' },
  { value: 'simple', titulo: 'Simple', detalle: 'Por hacer · En proceso · ✅ Hecho' },
  { value: 'universidad', titulo: 'Universidad', detalle: '📚 Pendientes · ✍️ Haciendo · 📤 Entregado · ✅ Calificado' },
  { value: 'vacio', titulo: 'Vacío', detalle: 'Creo mis propias listas' },
];

const ProyectoModal = ({ abierto, proyecto = null, onCerrar, onGuardar }) => {
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('🎓');
  const [color, setColor] = useState(COLORES_PROYECTO[0]);
  const [descripcion, setDescripcion] = useState('');
  const [plantilla, setPlantilla] = useState('flujo');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setNombre(proyecto?.nombre || '');
    setIcono(proyecto ? (proyecto.icono || '') : '🎓');
    setColor(proyecto?.color || COLORES_PROYECTO[0]);
    setDescripcion(proyecto?.descripcion || '');
    setPlantilla('flujo');
  }, [abierto, proyecto]);

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const ok = await onGuardar({ nombre: nombre.trim(), icono, color, descripcion: descripcion.trim(), ...(proyecto ? {} : { plantilla }) });
    setGuardando(false);
    if (ok) onCerrar();
  };

  return (
    <Modal
      open={abierto}
      onCancel={onCerrar}
      onOk={guardar}
      okText={proyecto ? 'Guardar' : 'Crear proyecto'}
      cancelText="Cancelar"
      confirmLoading={guardando}
      okButtonProps={{ disabled: !nombre.trim() }}
      title={proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
      destroyOnClose
      width={520}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 16px' }}>
        <IconoProyecto tablero={{ icono, color, nombre }} size={48} />
        <Input
          autoFocus
          size="large"
          placeholder="Ej: Universidad, Personal, Oblé…"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onPressEnter={guardar}
          maxLength={120}
        />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 6 }}>Ícono</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {EMOJIS_PROYECTO.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setIcono(e)}
            style={{
              width: 38, height: 38, borderRadius: 10, fontSize: 20, cursor: 'pointer',
              border: icono === e ? `2px solid ${color}` : '1px solid var(--qc-border)', background: 'var(--qc-surface)',
            }}
          >
            {e}
          </button>
        ))}
        <Input
          value={EMOJIS_PROYECTO.includes(icono) ? '' : icono}
          onChange={(ev) => setIcono(Array.from(ev.target.value.trim()).slice(0, 2).join(''))}
          placeholder="Otro"
          style={{ width: 70, height: 38, textAlign: 'center', fontSize: 18 }}
          maxLength={8}
        />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 6 }}>Color</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {COLORES_PROYECTO.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            style={{
              width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer', background: c, color: '#fff',
              outline: color === c ? '2px solid var(--qc-text)' : 'none', outlineOffset: 2,
            }}
          >
            {color === c && <CheckOutlined />}
          </button>
        ))}
      </div>

      <Input.TextArea
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        autoSize={{ minRows: 1, maxRows: 4 }}
        style={{ marginBottom: proyecto ? 0 : 14 }}
      />

      {!proyecto && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 6 }}>Empezar con</div>
          <Radio.Group value={plantilla} onChange={(e) => setPlantilla(e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PLANTILLAS.map((p) => (
              <Radio key={p.value} value={p.value}>
                <span style={{ fontWeight: 600 }}>{p.titulo}</span>
                <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{p.detalle}</div>
              </Radio>
            ))}
          </Radio.Group>
          <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 10 }}>
            Trae las etiquetas Urgente, Alta y Leve; puedes crear las tuyas (Universidad de Pamplona, Maestría…).
          </div>
        </>
      )}
    </Modal>
  );
};

export default ProyectoModal;
