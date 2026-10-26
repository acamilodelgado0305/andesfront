// src/components/tareas/SubtareasTarjeta.jsx
// Lista de chequeo de una tarjeta: marcar, editar, reordenar arrastrando,
// convertir en tarjeta propia. Pegar varias líneas crea varias subtareas.
import React, { useState } from 'react';
import { Input, Button, Dropdown, message } from 'antd';
import { HolderOutlined, MoreOutlined, DeleteOutlined, ExportOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { BarraProgreso, MarcaCompletar } from './piezasTareas';

const Fila = ({ s, onCambiar, onBorrar, onConvertir }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: s.id });
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(s.texto);
  const guardar = () => {
    setEditando(false);
    const limpio = texto.trim();
    if (limpio && limpio !== s.texto) onCambiar(s, { texto: limpio });
    else setTexto(s.texto);
  };
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', borderRadius: 8,
        background: isDragging ? 'var(--qc-relleno)' : 'transparent',
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--qc-text-muted)', touchAction: 'none', padding: '0 2px' }} aria-label="Arrastrar">
        <HolderOutlined />
      </span>
      <MarcaCompletar hecha={s.hecha} onCambiar={(v) => onCambiar(s, { hecha: v })} size={18} />
      {editando ? (
        <Input.TextArea
          autoFocus
          autoSize
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guardar(); }
            if (e.key === 'Escape') { setTexto(s.texto); setEditando(false); }
          }}
          style={{ flex: 1 }}
        />
      ) : (
        <span
          onClick={() => setEditando(true)}
          style={{
            flex: 1, minWidth: 0, fontSize: 14, cursor: 'text', overflowWrap: 'anywhere',
            color: s.hecha ? 'var(--qc-text-muted)' : 'var(--qc-text)', textDecoration: s.hecha ? 'line-through' : 'none',
          }}
        >
          {s.texto}
        </span>
      )}
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'convertir', icon: <ExportOutlined />, label: 'Convertir en tarjeta' },
            { key: 'borrar', icon: <DeleteOutlined />, label: 'Eliminar', danger: true },
          ],
          onClick: ({ key }) => (key === 'borrar' ? onBorrar(s) : onConvertir(s)),
        }}
      >
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Opciones de la subtarea" />
      </Dropdown>
    </div>
  );
};

const SubtareasTarjeta = ({ tarjetaId, subtareas, onCambio, onTarjetaNueva }) => {
  const [nueva, setNueva] = useState('');
  const [ocultarHechas, setOcultarHechas] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  const hechas = subtareas.filter((s) => s.hecha).length;
  const visibles = ocultarHechas ? subtareas.filter((s) => !s.hecha) : subtareas;

  const agregar = async () => {
    if (!nueva.trim()) return;
    setAgregando(true);
    try {
      onCambio(await api.crearSubtareas(tarjetaId, nueva));
      setNueva('');
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo agregar'));
    } finally {
      setAgregando(false);
    }
  };

  const cambiar = async (s, cambios) => {
    onCambio(subtareas.map((x) => (x.id === s.id ? { ...x, ...cambios } : x)));
    try { await api.actualizarSubtarea(s.id, cambios); } catch (e) { message.error(mensajeError(e, 'No se pudo guardar')); }
  };
  const borrar = async (s) => {
    onCambio(subtareas.filter((x) => x.id !== s.id));
    try { await api.eliminarSubtarea(s.id); } catch (e) { message.error(mensajeError(e, 'No se pudo eliminar')); }
  };
  const convertir = async (s) => {
    try {
      const t = await api.convertirSubtarea(s.id);
      onCambio(subtareas.filter((x) => x.id !== s.id));
      onTarjetaNueva?.(t);
      message.success('Ahora es una tarjeta en la misma lista');
    } catch (e) { message.error(mensajeError(e, 'No se pudo convertir')); }
  };

  const alSoltar = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const nuevas = arrayMove(subtareas, subtareas.findIndex((s) => s.id === active.id), subtareas.findIndex((s) => s.id === over.id));
    onCambio(nuevas);
    const i = nuevas.findIndex((s) => s.id === active.id);
    try { await api.moverSubtarea(active.id, i > 0 ? nuevas[i - 1].id : null); } catch (e) { message.error(mensajeError(e, 'No se pudo mover')); }
  };

  return (
    <div>
      {subtareas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--qc-text-muted)', width: 38 }}>
            {Math.round((hechas / subtareas.length) * 100)}%
          </span>
          <div style={{ flex: 1 }}><BarraProgreso valor={hechas} total={subtareas.length} color="var(--qc-azul)" /></div>
          {hechas > 0 && (
            <Button size="small" type="text" icon={ocultarHechas ? <EyeOutlined /> : <EyeInvisibleOutlined />} onClick={() => setOcultarHechas((v) => !v)}>
              {ocultarHechas ? `Mostrar hechas (${hechas})` : 'Ocultar hechas'}
            </Button>
          )}
        </div>
      )}
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
        <SortableContext items={visibles.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {visibles.map((s) => <Fila key={s.id} s={s} onCambiar={cambiar} onBorrar={borrar} onConvertir={convertir} />)}
        </SortableContext>
      </DndContext>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <Input.TextArea
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregar(); } }}
          placeholder="Añadir subtarea… (pega una lista para crear varias)"
          autoSize={{ minRows: 1, maxRows: 6 }}
          style={{ flex: 1 }}
        />
        <Button onClick={agregar} loading={agregando} disabled={!nueva.trim()}>Añadir</Button>
      </div>
    </div>
  );
};

export default SubtareasTarjeta;
