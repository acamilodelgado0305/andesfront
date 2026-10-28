// src/components/tareas/InicioTareas.jsx
// Inicio de Tareas: TODO en un solo lugar. Lo de hoy y lo vencido de todos los
// proyectos, los próximos días, los proyectos (Universidad, Personal…) y las
// vistas Tabla y Calendario con las tareas de todos juntos.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Segmented, Select, Input, Switch, Spin, Empty, Popconfirm, Modal, message, Tooltip } from 'antd';
import {
  PlusOutlined, BellOutlined, StarFilled, AppstoreOutlined, TableOutlined, CalendarOutlined, InboxOutlined,
  UndoOutlined, DeleteOutlined, RightOutlined,
} from '@ant-design/icons';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import RegistroTarea from './RegistroTarea';
import TablaTareas from './TablaTareas';
import CalendarioTareas from './CalendarioTareas';
import TarjetaDetalle from './TarjetaDetalle';
import ProyectoModal from './ProyectoModal';
import AvisosHoja from './AvisosHoja';
import { ChipVence, IconoProyecto, MarcaCompletar, BarraProgreso, EtiquetaPill } from './piezasTareas';
import { estadoVence, diaCO, hoyCO, sumarDiasStr, fechaLarga, textoVence, pasaFiltros, OPCIONES_FECHA } from './utilsTareas';
import { describirRepeticion } from './repeticion';

const VISTA_KEY = 'qc-tareas-inicio-vista';
const ULTIMO_KEY = 'qc-tareas-ultimo-proyecto';
const leer = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const guardarLocal = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* sin almacenamiento */ } };

// Proyectos sugeridos para empezar (lo que ya se usaba en Trello).
const SUGERIDOS = [
  { nombre: 'Centro de Control', icono: '🎯', color: '#1d4ed8', plantilla: 'flujo' },
  { nombre: 'Universidad', icono: '🎓', color: '#7c3aed', plantilla: 'universidad' },
  { nombre: 'Personal', icono: '🏠', color: '#16a34a', plantilla: 'simple' },
  { nombre: 'Mis Negocios', icono: '🚀', color: '#ea580c', plantilla: 'flujo' },
];

const FilaTarea = ({ t, tablero, etiquetasPorId, onAbrir, onCompletar }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onAbrir(t)}
    onKeyDown={(e) => { if (e.key === 'Enter') onAbrir(t); }}
    className="qc-mov-fila"
    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 10, cursor: 'pointer' }}
  >
    <MarcaCompletar hecha={t.completada} onCambiar={(v) => onCompletar(t, v)} size={20} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 15, color: t.completada ? 'var(--qc-text-muted)' : 'var(--qc-text)',
        textDecoration: t.completada ? 'line-through' : 'none', overflowWrap: 'anywhere',
      }}>
        {t.titulo}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
        {tablero && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--qc-text-muted)' }}>
            <IconoProyecto tablero={tablero} size={18} /> {tablero.nombre}
          </span>
        )}
        {(t.etiquetas || []).map((id) => etiquetasPorId[id]).filter(Boolean).slice(0, 3).map((e) => (
          <EtiquetaPill key={e.id} etiqueta={e} style={{ height: 18, fontSize: 11, padding: '0 7px' }} />
        ))}
        {t.repeticion && <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>🔁 {describirRepeticion(t.repeticion)}</span>}
      </div>
    </div>
    <ChipVence tarjeta={t} />
  </div>
);

// Orden dentro de un día: por hora, salvo que la hayas movido a mano. `orden_dia`
// vive en la misma escala que vence_at (ms), así una clave sirve para las dos.
const claveDia = (t) => (t.orden_dia ?? new Date(t.vence_at).getTime());
const porClaveDia = (a, b) => claveDia(a) - claveDia(b) || a.id - b.id;
const MINUTO = 60000;

const FilaOrdenable = ({ tablerosPorId, ...props }) => {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: props.t.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{
        transform: CSS.Translate.toString(transform), transition, touchAction: 'manipulation',
        position: 'relative', zIndex: isDragging ? 5 : 'auto', opacity: isDragging ? 0.85 : 1,
        boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.15)' : 'none', borderRadius: 10,
        background: isDragging ? 'var(--qc-surface)' : 'transparent',
      }}
    >
      <FilaTarea {...props} tablero={tablerosPorId[props.t.tablero_id] || props.t.tablero} />
    </div>
  );
};

// Lista de un día que se reordena arrastrando (con el mouse o dejando el dedo
// quieto un momento en el celular). No deja pasar tareas a otro día.
const ListaDia = ({ tareas, onReordenar, ...resto }) => {
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );
  const alSoltar = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const de = tareas.findIndex((t) => t.id === active.id);
    const a = tareas.findIndex((t) => t.id === over.id);
    if (de < 0 || a < 0) return;
    onReordenar(arrayMove(tareas, de, a), a);
  };
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={tareas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tareas.map((t) => <FilaOrdenable key={t.id} t={t} {...resto} />)}
      </SortableContext>
    </DndContext>
  );
};

const BotonPorHora = ({ tareas, onPorHora }) => (tareas.some((t) => t.orden_dia != null) ? (
  <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => onPorHora(tareas)}>
    Ordenar por hora
  </Button>
) : null);

// Filtro por proyecto: chips siempre visibles en las tres vistas. "Todos" está
// siempre a mano; tocar el proyecto ya elegido también vuelve a todos.
const FiltroProyectos = ({ tableros, valor, onCambiar, pendientesPor }) => {
  const Chip = ({ activo, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 17,
        flexShrink: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: activo ? 700 : 500, whiteSpace: 'nowrap',
        border: `1px solid ${activo ? 'var(--qc-text)' : 'var(--qc-border)'}`,
        background: activo ? 'var(--qc-text)' : 'var(--qc-surface)', color: activo ? 'var(--qc-bg)' : 'var(--qc-text)',
      }}
    >
      {children}
    </button>
  );
  return (
    <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, marginBottom: 16 }}>
      <Chip activo={valor === 'todos'} onClick={() => onCambiar('todos')}>Todos los proyectos</Chip>
      {tableros.map((t) => (
        <Chip key={t.id} activo={valor === t.id} onClick={() => onCambiar(valor === t.id ? 'todos' : t.id)}>
          <span>{t.icono || '•'}</span>{t.nombre}
          {pendientesPor[t.id] ? <span style={{ opacity: 0.6, fontWeight: 600 }}>{pendientesPor[t.id]}</span> : null}
        </Chip>
      ))}
    </div>
  );
};

const Seccion = ({ titulo, color, children, extra }) => (
  <section style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: color || 'var(--qc-text-muted)' }}>{titulo}</span>
      <div style={{ flex: 1 }} />
      {extra}
    </div>
    {children}
  </section>
);

const TarjetaProyecto = ({ t, onAbrir }) => {
  const total = t.total || 0;
  return (
    <button
      type="button"
      onClick={() => onAbrir(t.id)}
      style={{
        textAlign: 'left', border: '1px solid var(--qc-border)', borderRadius: 14, padding: 0, cursor: 'pointer',
        background: 'var(--qc-surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)', transition: 'transform .12s, box-shadow .12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.10)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ height: 6, background: t.color }} />
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconoProyecto tablero={t} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nombre}</div>
            <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
              {t.pendientes} pendiente{t.pendientes === 1 ? '' : 's'}
              {t.hoy > 0 && <> · <span style={{ color: '#d97706', fontWeight: 700 }}>{t.hoy} hoy</span></>}
              {t.vencidas > 0 && <> · <span style={{ color: '#dc2626', fontWeight: 700 }}>{t.vencidas} vencida{t.vencidas === 1 ? '' : 's'}</span></>}
            </div>
          </div>
          {t.favorito && <StarFilled style={{ color: '#f59e0b' }} />}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <BarraProgreso valor={t.completadas || 0} total={total} color={t.color} alto={5} />
          <div style={{ fontSize: 11.5, color: 'var(--qc-text-muted)', marginTop: 4 }}>
            {total ? `${t.completadas} de ${total} hechas` : 'Sin tarjetas todavía'}
          </div>
        </div>
      </div>
    </button>
  );
};

const InicioTareas = ({
  tableros, cargandoTableros, archivados, esMovil, nombreUsuario,
  tarjetaAbierta, abrirTarjeta, cerrarTarjeta, abrirTablero, onTablerosCambio,
}) => {
  const [vista, setVistaEstado] = useState(() => leer(VISTA_KEY, 'resumen'));
  const [tarjetas, setTarjetas] = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const [proyectoRapido, setProyectoRapido] = useState(() => Number(leer(ULTIMO_KEY, 0)) || null);
  const [nuevoProyecto, setNuevoProyecto] = useState(false);
  const [avisos, setAvisos] = useState(false);
  const [verArchivados, setVerArchivados] = useState(false);
  const [filtroQ, setFiltroQ] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('todas');
  const [ocultarHechas, setOcultarHechas] = useState(true);
  const [crearEnDia, setCrearEnDia] = useState(null);
  const [creandoBase, setCreandoBase] = useState(false);
  const listasCache = useRef({});

  const setVista = (v) => { setVistaEstado(v); guardarLocal(VISTA_KEY, v); };

  const cargar = useCallback(async () => {
    try {
      const d = await api.getTarjetas({ estado: 'todas' });
      setTarjetas(d.tarjetas);
      setEtiquetas(d.etiquetas);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudieron cargar las tareas'));
      setTarjetas([]);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const tablerosPorId = useMemo(() => Object.fromEntries(tableros.map((t) => [t.id, t])), [tableros]);
  const etiquetasPorId = useMemo(() => Object.fromEntries(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const proyectoQuick = tablerosPorId[proyectoRapido] ? proyectoRapido : tableros[0]?.id;
  const etiquetasQuick = useMemo(() => etiquetas.filter((e) => e.tablero_id === proyectoQuick), [etiquetas, proyectoQuick]);

  // ── cambios locales ──────────────────────────────────────────────────────
  const poner = useCallback((t) => {
    if (!t) return;
    setTarjetas((xs) => {
      if (!xs) return xs;
      if (t.archivada) return xs.filter((x) => x.id !== t.id);
      const existe = xs.some((x) => x.id === t.id);
      return existe ? xs.map((x) => (x.id === t.id ? { ...x, ...t } : x)) : [t, ...xs];
    });
  }, []);
  const quitar = useCallback((id) => setTarjetas((xs) => (xs ? xs.filter((x) => x.id !== id) : xs)), []);

  const actualizar = async (t, cambios) => {
    poner({ ...t, ...cambios });
    try {
      const { lista_subtareas, lista_comentarios, lista_adjuntos, siguiente, ...resp } = await api.actualizarTarjeta(t.id, cambios);
      poner({ ...resp, tablero: t.tablero, lista: resp.lista || t.lista });
      if (siguiente) {
        poner({ ...siguiente, tablero: t.tablero });
        message.success(`🔁 Siguiente: ${textoVence(siguiente, { largo: true })}`);
      }
      onTablerosCambio?.();
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo guardar'));
      cargar();
    }
  };
  const completar = (t, hecha) => actualizar(t, { completada: hecha });

  // ── orden manual dentro del día ──────────────────────────────────────────
  const guardarOrden = async (cambios) => {
    if (!cambios.length) return;
    cambios.forEach(({ t, orden_dia }) => poner({ ...t, orden_dia }));
    try {
      await Promise.all(cambios.map(({ t, orden_dia }) => api.actualizarTarjeta(t.id, { orden_dia })));
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo guardar el orden'));
      cargar();
    }
  };
  // `lista` ya viene en el orden nuevo; solo cambia la clave de la tarea movida
  // (punto medio entre sus vecinas). Si las vecinas empatan (p. ej. dos tareas
  // sin hora), se renumera el día completo.
  const reordenar = (lista, i) => {
    const antes = lista[i - 1] ? claveDia(lista[i - 1]) : null;
    const despues = lista[i + 1] ? claveDia(lista[i + 1]) : null;
    let clave;
    if (antes !== null && despues !== null) clave = despues - antes > 1 ? (antes + despues) / 2 : null;
    else if (antes !== null) clave = antes + MINUTO;
    else if (despues !== null) clave = despues - MINUTO;
    if (clave != null) {
      guardarOrden([{ t: lista[i], orden_dia: clave }]);
      return;
    }
    const base = Math.min(...lista.map(claveDia));
    guardarOrden(lista
      .map((t, k) => ({ t, orden_dia: base + k * MINUTO }))
      .filter(({ t, orden_dia }) => t.orden_dia !== orden_dia));
  };
  const porHora = (lista) => guardarOrden(lista.filter((t) => t.orden_dia != null).map((t) => ({ t, orden_dia: null })));

  const listaInicial = async (tableroId) => {
    if (!listasCache.current[tableroId]) {
      const d = await api.getTablero(tableroId);
      listasCache.current[tableroId] = d.listas;
    }
    const ls = listasCache.current[tableroId];
    return ls.find((l) => !l.es_final) || ls[0];
  };

  const crearRapida = async (body, tableroId = proyectoQuick) => {
    if (!tableroId) { setNuevoProyecto(true); return null; }
    try {
      const lista = await listaInicial(tableroId);
      if (!lista) { message.warning('Ese proyecto no tiene listas'); return null; }
      const t = await api.crearTarjeta(lista.id, body);
      poner({ ...t, tablero: tablerosPorId[tableroId], lista });
      guardarLocal(ULTIMO_KEY, tableroId);
      onTablerosCambio?.();
      message.success(`Agregada a ${tablerosPorId[tableroId]?.icono || ''} ${tablerosPorId[tableroId]?.nombre || ''} · ${lista.nombre}`);
      return t;
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo crear'));
      return null;
    }
  };

  const crearProyecto = async (body) => {
    try {
      const t = await api.crearTablero(body);
      await onTablerosCambio?.();
      abrirTablero(t.id);
      return true;
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo crear el proyecto'));
      return false;
    }
  };

  const crearBase = async () => {
    setCreandoBase(true);
    try {
      for (const p of SUGERIDOS) await api.crearTablero(p);
      await onTablerosCambio?.();
      message.success('Listo: tus proyectos base están creados');
    } catch (e) {
      message.error(mensajeError(e, 'No se pudieron crear'));
    } finally {
      setCreandoBase(false);
    }
  };

  // ── grupos del resumen ───────────────────────────────────────────────────
  const hoy = hoyCO();
  const pendientesTodos = useMemo(() => (tarjetas || []).filter((t) => !t.completada), [tarjetas]);
  const pendientesPor = useMemo(() => pendientesTodos.reduce((m, t) => ({ ...m, [t.tablero_id]: (m[t.tablero_id] || 0) + 1 }), {}), [pendientesTodos]);
  const pendientes = useMemo(
    () => (filtroProyecto === 'todos' ? pendientesTodos : pendientesTodos.filter((t) => t.tablero_id === filtroProyecto)),
    [pendientesTodos, filtroProyecto],
  );
  // Elegir un proyecto en el filtro también lo deja para "Guardar en".
  const elegirProyecto = (v) => {
    setFiltroProyecto(v);
    if (v !== 'todos') { setProyectoRapido(v); guardarLocal(ULTIMO_KEY, v); }
  };
  const paraHoy = useMemo(() => pendientes
    .filter((t) => ['vencida', 'hoy'].includes(estadoVence(t)))
    .sort(porClaveDia), [pendientes]);
  const proximos = useMemo(() => {
    const hasta = sumarDiasStr(hoy, 7);
    const grupos = {};
    pendientes.forEach((t) => {
      if (!t.vence_at) return;
      const d = diaCO(t.vence_at);
      if (d > hoy && d <= hasta) (grupos[d] = grupos[d] || []).push(t);
    });
    Object.values(grupos).forEach((xs) => xs.sort(porClaveDia));
    return grupos;
  }, [pendientes, hoy]);
  const vencidas = paraHoy.filter((t) => estadoVence(t) === 'vencida').length;
  const nProximos = Object.values(proximos).reduce((n, xs) => n + xs.length, 0);
  const sinFecha = pendientes.filter((t) => !t.vence_at).length;

  const filtradas = useMemo(() => (tarjetas || []).filter((t) => {
    if (ocultarHechas && t.completada) return false;
    if (filtroProyecto !== 'todos' && t.tablero_id !== filtroProyecto) return false;
    // La fecha solo filtra la Tabla: el calendario ya se mueve por semanas.
    if (!pasaFiltros(t, { q: filtroQ, vence: vista === 'tabla' ? filtroFecha : null })) return false;
    return true;
  }), [tarjetas, ocultarHechas, filtroProyecto, filtroQ, filtroFecha, vista]);

  const abrir = (t) => abrirTarjeta(typeof t === 'object' ? t.id : t, typeof t === 'object' ? t.tablero_id : null);

  const proyectoSelect = tableros.length > 0 && (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap' }}>Guardar en</span>
    <Select
      value={proyectoQuick}
      onChange={(v) => { setProyectoRapido(v); guardarLocal(ULTIMO_KEY, v); }}
      popupMatchSelectWidth={false}
      style={{ width: esMovil ? 140 : 190 }}
      options={tableros.map((t) => ({
        value: t.id,
        label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconoProyecto tablero={t} size={18} />{t.nombre}</span>,
      }))}
    />
    </span>
  );

  // ── sin proyectos todavía ─────────────────────────────────────────────────
  if (!cargandoTableros && tableros.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '30px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>🗂️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--qc-text)', margin: '8px 0' }}>Todas tus tareas en un solo lugar</h1>
        <p style={{ color: 'var(--qc-text-muted)', fontSize: 15 }}>
          Crea un proyecto por cada frente (la universidad, lo personal, cada negocio). Son tuyas: las ves desde cualquier negocio y nadie más del negocio las ve. Cada proyecto tiene su tablero kanban,
          sus etiquetas, subtareas, fechas con aviso al celular y tareas que se repiten, como tus clases.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          <Button type="primary" size="large" onClick={crearBase} loading={creandoBase}>Crear mis proyectos base</Button>
          <Button size="large" icon={<PlusOutlined />} onClick={() => setNuevoProyecto(true)}>Proyecto en blanco</Button>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          {SUGERIDOS.map((p) => (
            <span key={p.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--qc-text-muted)' }}>
              <IconoProyecto tablero={p} size={22} /> {p.nombre}
            </span>
          ))}
        </div>
        {archivados.length > 0 && <Button type="link" onClick={() => setVerArchivados(true)} style={{ marginTop: 14 }}>Ver proyectos archivados ({archivados.length})</Button>}
        <ProyectoModal abierto={nuevoProyecto} onCerrar={() => setNuevoProyecto(false)} onGuardar={crearProyecto} />
        <ArchivadosModal abierto={verArchivados} onCerrar={() => setVerArchivados(false)} archivados={archivados} onTablerosCambio={onTablerosCambio} />
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: esMovil ? '100%' : 0 }}>
          <h1 style={{ margin: 0, fontSize: esMovil ? 22 : 26, fontWeight: 800, color: 'var(--qc-text)', letterSpacing: -0.4 }}>Tareas</h1>
          <div style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>
            {nombreUsuario ? `De ${nombreUsuario} · ` : ''}{tableros.length} proyecto{tableros.length === 1 ? '' : 's'} · {pendientesTodos.length} pendientes
          </div>
        </div>
        {/* En el celular, vistas y botones van en su propia fila */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...(esMovil ? { width: '100%' } : {}) }}>
          <Segmented
            value={vista}
            onChange={setVista}
            options={[
              { value: 'resumen', icon: <AppstoreOutlined />, label: esMovil ? undefined : 'Resumen' },
              { value: 'tabla', icon: <TableOutlined />, label: esMovil ? undefined : 'Tabla' },
              { value: 'calendario', icon: <CalendarOutlined />, label: esMovil ? undefined : 'Calendario' },
            ]}
          />
          {esMovil && <div style={{ flex: 1 }} />}
          <Tooltip title="Avisos al celular">
            <Button icon={<BellOutlined />} onClick={() => setAvisos(true)}>{esMovil ? null : 'Avisos'}</Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNuevoProyecto(true)}>Proyecto</Button>
        </div>
      </div>

      {/* Registro rápido */}
      <div style={{
        padding: esMovil ? 12 : 14, borderRadius: 14, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)', marginBottom: 18,
      }}>
        <RegistroTarea etiquetas={etiquetasQuick} onCrear={(b) => crearRapida(b)} extra={proyectoSelect} />
      </div>

      <FiltroProyectos tableros={tableros} valor={filtroProyecto} onCambiar={elegirProyecto} pendientesPor={pendientesPor} />

      {tarjetas === null ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
      ) : vista === 'resumen' ? (
        <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: esMovil ? 0 : 26, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: esMovil ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
              {[
                ['Vencidas', vencidas, '#dc2626'],
                ['Para hoy', paraHoy.length - vencidas, '#d97706'],
                ['Próximos 7 días', nProximos, 'var(--qc-azul)'],
                ['Sin fecha', sinFecha, 'var(--qc-text-muted)'],
              ].map(([txt, n, color]) => (
                <div key={txt} style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: n ? color : 'var(--qc-text-muted)', lineHeight: 1.1 }}>{n}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{txt}</div>
                </div>
              ))}
            </div>

            <Seccion
              titulo={`Para hoy${paraHoy.length ? ` · ${paraHoy.length}` : ''}`}
              color="#f0565c"
              extra={<BotonPorHora tareas={paraHoy} onPorHora={porHora} />}
            >
              {paraHoy.length ? (
                <ListaDia tareas={paraHoy} onReordenar={reordenar} tablerosPorId={tablerosPorId} etiquetasPorId={etiquetasPorId} onAbrir={abrir} onCompletar={completar} />
              ) : (
                <div style={{ padding: '14px 8px', color: 'var(--qc-text-muted)' }}>Nada vencido ni para hoy. 🎉</div>
              )}
            </Seccion>

            {Object.keys(proximos).sort().map((d) => (
              <Seccion
                key={d}
                titulo={d === sumarDiasStr(hoy, 1) ? 'Mañana' : fechaLarga(d)}
                extra={<BotonPorHora tareas={proximos[d]} onPorHora={porHora} />}
              >
                <ListaDia tareas={proximos[d]} onReordenar={reordenar} tablerosPorId={tablerosPorId} etiquetasPorId={etiquetasPorId} onAbrir={abrir} onCompletar={completar} />
              </Seccion>
            ))}
          </div>

          <div>
            <Seccion
              titulo="Proyectos"
              extra={archivados.length > 0 && (
                <Button type="link" size="small" icon={<InboxOutlined />} onClick={() => setVerArchivados(true)}>Archivados ({archivados.length})</Button>
              )}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 6 }}>
                {tableros.filter((t) => filtroProyecto === 'todos' || t.id === filtroProyecto).map((t) => <TarjetaProyecto key={t.id} t={t} onAbrir={abrirTablero} />)}
                <button
                  type="button"
                  onClick={() => setNuevoProyecto(true)}
                  style={{
                    minHeight: 120, borderRadius: 14, border: '1.5px dashed var(--qc-border)', background: 'var(--qc-relleno)',
                    color: 'var(--qc-text-muted)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <PlusOutlined /> Nuevo proyecto
                </button>
              </div>
            </Seccion>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <Input.Search placeholder="Buscar en todas las tareas" allowClear value={filtroQ} onChange={(e) => setFiltroQ(e.target.value)} style={{ width: esMovil ? '100%' : 280 }} />
            {vista === 'tabla' && (
              <Select value={filtroFecha} onChange={setFiltroFecha} options={OPCIONES_FECHA} style={{ width: 190 }} popupMatchSelectWidth={false} />
            )}
            {(filtroProyecto !== 'todos' || filtroFecha !== 'todas' || filtroQ) && (
              <Button type="link" onClick={() => { setFiltroProyecto('todos'); setFiltroFecha('todas'); setFiltroQ(''); }}>
                Ver todo
              </Button>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--qc-text)' }}>
              <Switch size="small" checked={ocultarHechas} onChange={setOcultarHechas} /> Ocultar completadas
            </span>
          </div>
          {vista === 'tabla' ? (
            <TablaTareas
              tarjetas={filtradas}
              etiquetas={etiquetas}
              tablerosPorId={tablerosPorId}
              esMovil={esMovil}
              onAbrir={(id) => abrir(filtradas.find((t) => t.id === id) || id)}
              onCompletar={completar}
            />
          ) : (
            <CalendarioTareas
              tarjetas={filtradas}
              etiquetas={etiquetas}
              tablerosPorId={tablerosPorId}
              esMovil={esMovil}
              onAbrir={(id) => abrir(filtradas.find((t) => t.id === id) || id)}
              onCompletar={completar}
              onReprogramar={(t, cambios) => actualizar(t, cambios || { vence_at: null })}
              onCrearEnDia={setCrearEnDia}
            />
          )}
        </>
      )}

      <TarjetaDetalle
        tarjetaId={tarjetaAbierta}
        onCerrar={cerrarTarjeta}
        esMovil={esMovil}
        tableros={tableros}
        onCambio={(t) => { poner({ ...t, tablero: tablerosPorId[t.tablero_id] || t.tablero }); onTablerosCambio?.(); }}
        onEliminada={(id) => { quitar(id); onTablerosCambio?.(); }}
        onNueva={(t) => poner({ ...t, tablero: tablerosPorId[t.tablero_id] })}
      />

      <ProyectoModal abierto={nuevoProyecto} onCerrar={() => setNuevoProyecto(false)} onGuardar={crearProyecto} />
      <AvisosHoja abierta={avisos} onCerrar={() => setAvisos(false)} esMovil={esMovil} />
      <ArchivadosModal abierto={verArchivados} onCerrar={() => setVerArchivados(false)} archivados={archivados} onTablerosCambio={onTablerosCambio} />

      <Modal open={!!crearEnDia} onCancel={() => setCrearEnDia(null)} footer={null} title={crearEnDia ? `Nueva tarea · ${fechaLarga(crearEnDia)}` : ''} destroyOnClose>
        <RegistroTarea
          autoFocus
          compacto
          etiquetas={etiquetasQuick}
          extra={proyectoSelect}
          placeholder="Título (ej: Parcial de estadística 8am)"
          onCrear={async (body) => {
            const t = await crearRapida(body.vence_at ? body : { ...body, vence_at: crearEnDia, vence_con_hora: false });
            if (t) setCrearEnDia(null);
            return t;
          }}
          onCerrar={() => setCrearEnDia(null)}
        />
      </Modal>
    </div>
  );
};

const ArchivadosModal = ({ abierto, onCerrar, archivados, onTablerosCambio }) => {
  const restaurar = async (t) => {
    try { await api.actualizarTablero(t.id, { archivado: false }); await onTablerosCambio?.(); message.success('Proyecto restaurado'); } catch (e) { message.error(mensajeError(e, 'No se pudo restaurar')); }
  };
  const eliminar = async (t) => {
    try { await api.eliminarTablero(t.id); await onTablerosCambio?.(); message.success('Proyecto eliminado'); } catch (e) { message.error(mensajeError(e, 'No se pudo eliminar')); }
  };
  return (
    <Modal open={abierto} onCancel={onCerrar} footer={null} title="Proyectos archivados">
      {archivados.length ? archivados.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--qc-border)' }}>
          <IconoProyecto tablero={t} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--qc-text)' }}>{t.nombre}</div>
            <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{t.total} tarjeta{t.total === 1 ? '' : 's'}</div>
          </div>
          <Button size="small" icon={<UndoOutlined />} onClick={() => restaurar(t)}>Restaurar</Button>
          <Popconfirm
            title="¿Eliminar para siempre?"
            description="Se borran el proyecto y todas sus tarjetas. No se puede deshacer."
            okText="Eliminar"
            cancelText="No"
            okButtonProps={{ danger: true }}
            onConfirm={() => eliminar(t)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="Eliminar proyecto" />
          </Popconfirm>
        </div>
      )) : <Empty description="No hay proyectos archivados" />}
      <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 10 }}>
        <RightOutlined /> Para eliminar un proyecto primero se archiva: así nada se pierde de un toque.
      </div>
    </Modal>
  );
};

export default InicioTareas;
