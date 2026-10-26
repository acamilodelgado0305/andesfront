// src/components/tareas/Kanban.jsx
// Vista Tablero: listas en columnas y tarjetas que se arrastran entre ellas.
// Arrastrar con @dnd-kit: con mouse se arrastra al moverlo; en el celular se
// mantiene presionada la tarjeta un instante (si no, el dedo hace scroll).
// Las columnas se reordenan arrastrando su encabezado.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, Input, Button, Tooltip } from 'antd';
import {
  PlusOutlined, MoreOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined,
} from '@ant-design/icons';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, closestCorners, pointerWithin, MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy,
  arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EtiquetaPill, InsigniasTarjeta, MarcaCompletar, BotonSuave } from './piezasTareas';
import RegistroTarea from './RegistroTarea';

const idT = (id) => `t${id}`;
const idL = (id) => `l${id}`;
const num = (s) => Number(String(s).slice(1));
const esTarjeta = (s) => String(s).startsWith('t');

const construirOrden = (listas, tarjetas) => {
  const orden = {};
  listas.forEach((l) => { orden[l.id] = []; });
  tarjetas.forEach((t) => { if (orden[t.lista_id]) orden[t.lista_id].push(idT(t.id)); });
  return orden;
};

// ── Tarjeta ─────────────────────────────────────────────────────────────────
export const TarjetaContenido = ({ tarjeta, etiquetasPorId, onCompletar, arrastrando = false, sombra = false }) => {
  const [encima, setEncima] = useState(false);
  const etiquetas = (tarjeta.etiquetas || []).map((id) => etiquetasPorId[id]).filter(Boolean);
  const mostrarCheck = encima || tarjeta.completada;
  return (
    <div
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      style={{
        background: 'var(--qc-surface)', borderRadius: 10, padding: '9px 11px',
        border: '1px solid var(--qc-border)',
        boxShadow: sombra ? '0 12px 28px rgba(0,0,0,0.25)' : '0 1px 1px rgba(0,0,0,0.06)',
        transform: sombra ? 'rotate(2.5deg)' : undefined,
        opacity: arrastrando ? 0.35 : 1, cursor: 'pointer', userSelect: 'none',
      }}
    >
      {etiquetas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
          {etiquetas.map((e) => <EtiquetaPill key={e.id} etiqueta={e} style={{ height: 18, fontSize: 11, padding: '0 7px' }} />)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <span style={{
          width: mostrarCheck ? 18 : 0, overflow: 'hidden', transition: 'width .15s', flexShrink: 0, marginTop: 1,
        }}>
          <MarcaCompletar hecha={tarjeta.completada} onCambiar={(v) => onCompletar?.(tarjeta, v)} size={17} />
        </span>
        <div style={{
          flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.4, color: tarjeta.completada ? 'var(--qc-text-muted)' : 'var(--qc-text)',
          textDecoration: tarjeta.completada ? 'line-through' : 'none', overflowWrap: 'anywhere',
        }}>
          {tarjeta.titulo}
        </div>
      </div>
      {(tarjeta.vence_at || tarjeta.descripcion || tarjeta.subtareas_total || tarjeta.adjuntos || tarjeta.comentarios || tarjeta.repeticion) ? (
        <div style={{ marginTop: 8 }}><InsigniasTarjeta tarjeta={tarjeta} /></div>
      ) : null}
    </div>
  );
};

const TarjetaArrastrable = ({ tarjeta, etiquetasPorId, onAbrir, onCompletar }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: idT(tarjeta.id), data: { tipo: 'tarjeta' },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, touchAction: 'manipulation' }}
      {...attributes}
      {...listeners}
      onClick={() => onAbrir(tarjeta.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onAbrir(tarjeta.id);
        listeners?.onKeyDown?.(e);
      }}
    >
      <TarjetaContenido tarjeta={tarjeta} etiquetasPorId={etiquetasPorId} onCompletar={onCompletar} arrastrando={isDragging} />
    </div>
  );
};

// ── Columna ─────────────────────────────────────────────────────────────────
const Columna = ({
  lista, ids, tarjetasPorId, etiquetasPorId, etiquetas, ancho, altoMax,
  onAbrir, onCompletar, onCrearTarjeta, onRenombrar, onFinal, onEliminar, componiendo, setComponiendo,
}) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: idL(lista.id), data: { tipo: 'lista' },
  });
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(lista.nombre);
  useEffect(() => { setNombre(lista.nombre); }, [lista.nombre]);

  const guardarNombre = () => {
    setEditando(false);
    const limpio = nombre.trim();
    if (limpio && limpio !== lista.nombre) onRenombrar(lista.id, limpio);
    else setNombre(lista.nombre);
  };

  const menu = {
    items: [
      { key: 'nueva', icon: <PlusOutlined />, label: 'Añadir tarjeta' },
      { key: 'renombrar', icon: <EditOutlined />, label: 'Cambiar nombre' },
      {
        key: 'final', icon: <CheckCircleOutlined />,
        label: lista.es_final ? 'Dejar de ser lista de cierre' : 'Lista de cierre (lo que entra queda hecho)',
      },
      { type: 'divider' },
      { key: 'eliminar', icon: <DeleteOutlined />, label: 'Eliminar lista…', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation();
      if (key === 'nueva') setComponiendo(lista.id);
      if (key === 'renombrar') setEditando(true);
      if (key === 'final') onFinal(lista.id, !lista.es_final);
      if (key === 'eliminar') onEliminar(lista);
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1,
        width: ancho, flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: altoMax,
        background: 'var(--qc-surface-2)', borderRadius: 14, border: '1px solid var(--qc-border)',
        scrollSnapAlign: 'start',
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px 6px 12px', cursor: 'grab', touchAction: 'manipulation' }}
      >
        {editando ? (
          <Input
            autoFocus
            size="small"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onPressEnter={guardarNombre}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { setNombre(lista.nombre); setEditando(false); } }}
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            style={{ fontWeight: 700 }}
          />
        ) : (
          <div
            onDoubleClick={() => setEditando(true)}
            style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14, color: 'var(--qc-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={lista.nombre}
          >
            {lista.nombre}
          </div>
        )}
        {lista.es_final && (
          <Tooltip title="Lista de cierre: lo que entra queda completado">
            <CheckCircleOutlined style={{ color: '#16a34a' }} />
          </Tooltip>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)', padding: '0 4px' }}>{ids.length}</span>
        <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
          <Button type="text" size="small" icon={<MoreOutlined />} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} aria-label="Opciones de la lista" />
        </Dropdown>
      </div>

      <div className="qc-sin-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2px 8px', minHeight: 12 }}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 6, paddingBottom: 4 }}>
            {ids.map((id) => {
              const t = tarjetasPorId[num(id)];
              return t ? (
                <TarjetaArrastrable key={id} tarjeta={t} etiquetasPorId={etiquetasPorId} onAbrir={onAbrir} onCompletar={onCompletar} />
              ) : null;
            })}
          </div>
        </SortableContext>
      </div>

      <div style={{ padding: '4px 8px 8px' }}>
        {componiendo === lista.id ? (
          <RegistroTarea
            compacto
            autoFocus
            etiquetas={etiquetas}
            placeholder="Título… (ej: Leer capítulo 3 mañana)"
            onCrear={(body) => onCrearTarjeta(lista.id, body)}
            onCerrar={() => setComponiendo(null)}
          />
        ) : (
          <BotonSuave icon={<PlusOutlined />} onClick={() => setComponiendo(lista.id)} style={{ width: '100%' }}>
            Añadir tarjeta
          </BotonSuave>
        )}
      </div>
    </div>
  );
};

const NuevaLista = ({ ancho, onCrear }) => {
  const [abierta, setAbierta] = useState(false);
  const [nombre, setNombre] = useState('');
  const crear = async () => {
    if (!nombre.trim()) return;
    const l = await onCrear(nombre.trim());
    if (l) setNombre('');
  };
  return (
    <div style={{ width: ancho, flexShrink: 0, scrollSnapAlign: 'start' }}>
      {abierta ? (
        <div style={{ background: 'var(--qc-surface-2)', borderRadius: 14, padding: 10, border: '1px solid var(--qc-border)' }}>
          <Input
            autoFocus
            placeholder="Nombre de la lista"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onPressEnter={crear}
            onKeyDown={(e) => { if (e.key === 'Escape') setAbierta(false); }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button type="primary" onClick={crear}>Añadir lista</Button>
            <Button type="text" onClick={() => setAbierta(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbierta(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 14,
            border: '1px dashed var(--qc-border)', background: 'var(--qc-relleno)', color: 'var(--qc-text)',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          <PlusOutlined /> Añadir otra lista
        </button>
      )}
    </div>
  );
};

// ── Tablero ─────────────────────────────────────────────────────────────────
const Kanban = ({
  listas, tarjetas, etiquetas, esMovil,
  onAbrir, onCompletar, onMoverTarjeta, onMoverLista, onCrearTarjeta, onCrearLista,
  onRenombrarLista, onFinalLista, onEliminarLista,
}) => {
  const [orden, setOrden] = useState(() => construirOrden(listas, tarjetas));
  const [ordenListas, setOrdenListas] = useState(() => listas.map((l) => idL(l.id)));
  const [activo, setActivo] = useState(null); // { id, tipo }
  const [componiendo, setComponiendo] = useState(null);
  const ordenRef = useRef(orden);
  ordenRef.current = orden;
  const inicio = useRef(null);

  const tarjetasPorId = useMemo(() => Object.fromEntries(tarjetas.map((t) => [t.id, t])), [tarjetas]);
  const etiquetasPorId = useMemo(() => Object.fromEntries(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const listasPorId = useMemo(() => Object.fromEntries(listas.map((l) => [l.id, l])), [listas]);

  // Mientras no se arrastra, el orden sale de los datos.
  useEffect(() => {
    if (activo) return;
    setOrden(construirOrden(listas, tarjetas));
    setOrdenListas(listas.map((l) => idL(l.id)));
  }, [listas, tarjetas, activo]);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const contenedorDe = useCallback((id) => {
    if (id == null) return null;
    if (!esTarjeta(id)) return num(id);
    const entrada = Object.entries(ordenRef.current).find(([, ids]) => ids.includes(id));
    return entrada ? Number(entrada[0]) : null;
  }, []);

  const deteccion = useCallback((args) => {
    if (activo?.tipo === 'lista') {
      return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => !esTarjeta(c.id)) });
    }
    const dentro = pointerWithin(args);
    if (dentro.length) {
      const sobreTarjetas = dentro.filter((c) => esTarjeta(c.id) && c.id !== args.active.id);
      if (sobreTarjetas.length) {
        const ids = new Set(sobreTarjetas.map((c) => c.id));
        return closestCorners({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.has(c.id)) });
      }
      return dentro.filter((c) => !esTarjeta(c.id));
    }
    return closestCorners(args);
  }, [activo]);

  const alEmpezar = ({ active }) => {
    const tipo = active.data.current?.tipo;
    setActivo({ id: active.id, tipo });
    if (tipo === 'tarjeta') {
      const lista = contenedorDe(active.id);
      const ids = ordenRef.current[lista] || [];
      const i = ids.indexOf(active.id);
      inicio.current = { lista, despues: i > 0 ? ids[i - 1] : null };
    }
  };

  const alPasar = ({ active, over }) => {
    if (activo?.tipo !== 'tarjeta' || !over) return;
    const desde = contenedorDe(active.id);
    const hacia = contenedorDe(over.id);
    if (desde == null || hacia == null || desde === hacia) return;
    setOrden((prev) => {
      const origen = prev[desde].filter((x) => x !== active.id);
      const destino = prev[hacia].filter((x) => x !== active.id);
      let idx = esTarjeta(over.id) ? destino.indexOf(over.id) : destino.length;
      if (esTarjeta(over.id) && idx >= 0) {
        const r = active.rect.current.translated;
        if (r && r.top > over.rect.top + over.rect.height / 2) idx += 1;
      }
      destino.splice(idx < 0 ? destino.length : idx, 0, active.id);
      return { ...prev, [desde]: origen, [hacia]: destino };
    });
  };

  const alSoltar = ({ active, over }) => {
    const tipo = activo?.tipo;
    setActivo(null);
    if (!over) { setOrden(construirOrden(listas, tarjetas)); return; }

    if (tipo === 'lista') {
      if (active.id === over.id) return;
      const viejo = ordenListas.indexOf(active.id);
      const nuevo = ordenListas.indexOf(over.id);
      if (viejo < 0 || nuevo < 0) return;
      const nuevas = arrayMove(ordenListas, viejo, nuevo);
      setOrdenListas(nuevas);
      const i = nuevas.indexOf(active.id);
      onMoverLista(num(active.id), i > 0 ? num(nuevas[i - 1]) : null);
      return;
    }

    const lista = contenedorDe(active.id);
    if (lista == null) return;
    let ids = ordenRef.current[lista];
    if (esTarjeta(over.id) && over.id !== active.id && ids.includes(over.id)) {
      ids = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
      setOrden((prev) => ({ ...prev, [lista]: ids }));
    }
    const i = ids.indexOf(active.id);
    const despues = i > 0 ? ids[i - 1] : null;
    if (inicio.current && inicio.current.lista === lista && inicio.current.despues === despues) return;
    onMoverTarjeta(num(active.id), lista, despues ? num(despues) : null);
  };

  const ancho = esMovil ? 'min(84vw, 320px)' : 284;
  const altoMax = esMovil ? 'calc(100vh - 250px)' : 'calc(100vh - 230px)';
  const tarjetaActiva = activo?.tipo === 'tarjeta' ? tarjetasPorId[num(activo.id)] : null;
  const listaActiva = activo?.tipo === 'lista' ? listasPorId[num(activo.id)] : null;

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={deteccion}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={alEmpezar}
      onDragOver={alPasar}
      onDragEnd={alSoltar}
      onDragCancel={() => { setActivo(null); setOrden(construirOrden(listas, tarjetas)); }}
    >
      <div
        className="qc-sin-scrollbar"
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, overflowX: 'auto', paddingBottom: 16,
          scrollSnapType: esMovil && !activo ? 'x mandatory' : 'none', scrollPaddingLeft: 2,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <SortableContext items={ordenListas} strategy={horizontalListSortingStrategy}>
          {ordenListas.map((lid) => {
            const lista = listasPorId[num(lid)];
            if (!lista) return null;
            return (
              <Columna
                key={lid}
                lista={lista}
                ids={orden[lista.id] || []}
                tarjetasPorId={tarjetasPorId}
                etiquetasPorId={etiquetasPorId}
                etiquetas={etiquetas}
                ancho={ancho}
                altoMax={altoMax}
                onAbrir={onAbrir}
                onCompletar={onCompletar}
                onCrearTarjeta={onCrearTarjeta}
                onRenombrar={onRenombrarLista}
                onFinal={onFinalLista}
                onEliminar={onEliminarLista}
                componiendo={componiendo}
                setComponiendo={setComponiendo}
              />
            );
          })}
        </SortableContext>
        <NuevaLista ancho={ancho} onCrear={onCrearLista} />
      </div>

      <DragOverlay dropAnimation={{ duration: 160 }}>
        {tarjetaActiva && (
          <div style={{ width: esMovil ? '76vw' : 266 }}>
            <TarjetaContenido tarjeta={tarjetaActiva} etiquetasPorId={etiquetasPorId} sombra />
          </div>
        )}
        {listaActiva && (
          <div style={{
            width: esMovil ? '80vw' : 284, padding: '12px 14px', borderRadius: 14, background: 'var(--qc-surface-2)',
            border: '1px solid var(--qc-border)', fontWeight: 700, boxShadow: '0 12px 28px rgba(0,0,0,0.25)', color: 'var(--qc-text)',
          }}>
            {listaActiva.nombre} · {(orden[listaActiva.id] || []).length}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default Kanban;
