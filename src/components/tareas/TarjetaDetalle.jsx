// src/components/tareas/TarjetaDetalle.jsx
// Detalle de una tarjeta (panel a la derecha en computador, hoja a pantalla
// casi completa en el celular): título, proyecto/lista, etiquetas, fecha con
// aviso, repetición, descripción, subtareas, adjuntos y comentarios.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Drawer, Input, Button, Select, Popover, Spin, Upload, Popconfirm, Dropdown, Avatar, message, Tooltip,
} from 'antd';
import {
  CloseOutlined, MoreOutlined, CopyOutlined, InboxOutlined, DeleteOutlined, LinkOutlined, PaperClipOutlined,
  PlusOutlined, RetweetOutlined, TagOutlined, ClockCircleOutlined, AlignLeftOutlined, CheckSquareOutlined,
  MessageOutlined, FilePdfOutlined, FileImageOutlined, UndoOutlined, BellOutlined,
} from '@ant-design/icons';
import BottomSheet from '../common/BottomSheet';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { ChipVence, EtiquetaPill, MarcaCompletar, TextoFormato, IconoProyecto } from './piezasTareas';
import { EtiquetasSelector, FechaEditor, RepeticionEditor } from './EditoresTarjeta';
import SubtareasTarjeta from './SubtareasTarjeta';
import { describirRepeticion } from './repeticion';
import { haceCuanto, opcionesRecordatorio, textoVence } from './utilsTareas';

const Seccion = ({ icon, titulo, extra, children }) => (
  <section style={{ marginTop: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ color: 'var(--qc-text-muted)', fontSize: 15 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--qc-text)', flex: 1 }}>{titulo}</span>
      {extra}
    </div>
    {children}
  </section>
);

// forwardRef: va dentro de Popover, que necesita el nodo para ubicarse.
const BotonChip = React.forwardRef(({ icon, children, ...resto }, ref) => (
  <button
    ref={ref}
    type="button"
    {...resto}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 8,
      border: '1px dashed var(--qc-border)', background: 'var(--qc-relleno)', color: 'var(--qc-text)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}
  >
    {icon}{children}
  </button>
));
BotonChip.displayName = 'BotonChip';

const resumenDe = (t, subtareas, comentarios, adjuntos) => {
  const { lista_subtareas, lista_comentarios, lista_adjuntos, siguiente, ...resto } = t;
  return {
    ...resto,
    subtareas_total: subtareas.length,
    subtareas_hechas: subtareas.filter((s) => s.hecha).length,
    comentarios: comentarios.length,
    adjuntos: adjuntos.length,
  };
};

// Editor de fecha / repetición: globo junto al chip en computador; en el
// celular, hoja desde abajo (el globo se salía de la pantalla).
const EditorFlotante = ({ esMovil, abierto, onAbierto, titulo, contenido, children }) => (esMovil ? (
  <>
    <span role="button" tabIndex={0} onClick={() => onAbierto(true)} style={{ cursor: 'pointer' }}>{children}</span>
    <BottomSheet open={abierto} onClose={() => onAbierto(false)} title={titulo} zIndex={1300}>
      {abierto && contenido}
    </BottomSheet>
  </>
) : (
  <Popover open={abierto} onOpenChange={onAbierto} trigger="click" placement="bottomLeft" destroyTooltipOnHide content={contenido}>
    {children}
  </Popover>
));

const TarjetaDetalle = ({
  tarjetaId, onCerrar, esMovil, tableros = [],
  contexto = null,          // { tableroId, listas, etiquetas, setEtiquetas } si el proyecto ya está abierto
  onCambio,                 // (resumen) → actualiza la tarjeta en la vista
  onEliminada,              // (id)
  onNueva,                  // (tarjeta) → copia, subtarea convertida o siguiente repetición
}) => {
  const [t, setT] = useState(null);
  const [subtareas, setSubtareas] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [adjuntos, setAdjuntos] = useState([]);
  const [meta, setMeta] = useState(null); // { listas, etiquetas } del proyecto de la tarjeta
  const [error, setError] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editDesc, setEditDesc] = useState(false);
  const [comentario, setComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [pop, setPop] = useState(null); // 'etiquetas' | 'fecha' | 'repetir' | 'enlace'
  const [enlace, setEnlace] = useState({ url: '', nombre: '' });
  const [subiendo, setSubiendo] = useState(false);

  // ── carga ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tarjetaId) return undefined;
    let vivo = true;
    setT(null); setError(null); setEditDesc(false); setPop(null);
    api.getTarjeta(tarjetaId)
      .then((d) => {
        if (!vivo) return;
        setT(d);
        setTitulo(d.titulo);
        setDescripcion(d.descripcion || '');
        setSubtareas(d.lista_subtareas || []);
        setComentarios(d.lista_comentarios || []);
        setAdjuntos(d.lista_adjuntos || []);
      })
      .catch((e) => { if (vivo) setError(mensajeError(e, 'No se encontró la tarjeta')); });
    return () => { vivo = false; };
  }, [tarjetaId]);

  // Listas y etiquetas del proyecto: del tablero abierto, o se piden.
  const tableroId = t?.tablero_id;
  useEffect(() => {
    if (!tableroId) return undefined;
    if (contexto && contexto.tableroId === tableroId) {
      setMeta({ listas: contexto.listas, etiquetas: contexto.etiquetas });
      return undefined;
    }
    let vivo = true;
    api.getTablero(tableroId).then((d) => { if (vivo) setMeta({ listas: d.listas, etiquetas: d.etiquetas }); }).catch(() => {});
    return () => { vivo = false; };
  }, [tableroId, contexto]);

  const setEtiquetasProyecto = useCallback((fn) => {
    setMeta((m) => (m ? { ...m, etiquetas: fn(m.etiquetas) } : m));
    if (contexto && contexto.tableroId === tableroId) contexto.setEtiquetas(fn);
  }, [contexto, tableroId]);

  const avisar = useCallback((nueva, subs = subtareas, coms = comentarios, adjs = adjuntos) => {
    onCambio?.(resumenDe(nueva, subs, coms, adjs));
  }, [onCambio, subtareas, comentarios, adjuntos]);

  // ── guardar campos ────────────────────────────────────────────────────────
  const guardar = async (cambios, { silencioso = false } = {}) => {
    const antes = t;
    const optimista = { ...t, ...cambios };
    setT(optimista);
    avisar(optimista);
    try {
      const resp = await api.actualizarTarjeta(t.id, cambios);
      const { siguiente, ...real } = resp;
      setT((x) => ({ ...x, ...real }));
      avisar(real);
      if (siguiente) {
        onNueva?.(siguiente);
        message.success(`🔁 Siguiente: ${textoVence(siguiente, { largo: true })}`);
      } else if (!silencioso && cambios.completada) {
        message.success('¡Hecha! ✓');
      }
      return real;
    } catch (e) {
      setT(antes);
      avisar(antes);
      message.error(mensajeError(e, 'No se pudo guardar'));
      return null;
    }
  };

  const guardarTitulo = () => {
    const limpio = titulo.trim();
    if (!limpio) { setTitulo(t.titulo); return; }
    if (limpio !== t.titulo) guardar({ titulo: limpio }, { silencioso: true });
  };

  const guardarDescripcion = async () => {
    setEditDesc(false);
    if ((descripcion || '') !== (t.descripcion || '')) await guardar({ descripcion }, { silencioso: true });
  };

  const mover = async (listaId) => {
    try {
      const resp = await api.moverTarjeta(t.id, listaId, null);
      const { siguiente, ...real } = resp;
      const lista = meta?.listas?.find((l) => l.id === listaId) || (await api.getTablero(real.tablero_id).then((d) => {
        setMeta({ listas: d.listas, etiquetas: d.etiquetas });
        return d.listas.find((l) => l.id === listaId);
      }));
      const nueva = { ...t, ...real, lista: lista ? { id: lista.id, nombre: lista.nombre, es_final: lista.es_final } : t.lista };
      setT(nueva);
      avisar(nueva);
      if (siguiente) onNueva?.(siguiente);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo mover'));
    }
  };

  // Otro proyecto: va a la primera lista abierta de ese proyecto.
  const moverAProyecto = async (otroId) => {
    try {
      const d = await api.getTablero(otroId);
      const destino = d.listas.find((l) => !l.es_final) || d.listas[0];
      if (!destino) { message.warning('Ese proyecto no tiene listas'); return; }
      const resp = await api.moverTarjeta(t.id, destino.id, null);
      const nueva = { ...t, ...resp, tablero: d.tablero, lista: destino };
      delete nueva.siguiente;
      // Las etiquetas pudieron crearse en el destino al mover: se releen.
      setMeta({ listas: d.listas, etiquetas: (await api.getTablero(otroId).catch(() => d)).etiquetas });
      setT(nueva);
      avisar(nueva);
      message.success(`Movida a ${d.tablero.icono ? `${d.tablero.icono} ` : ''}${d.tablero.nombre}`);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo mover'));
    }
  };

  // ── comentarios / adjuntos ────────────────────────────────────────────────
  const comentar = async () => {
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      const c = await api.crearComentario(t.id, comentario.trim());
      const coms = [c, ...comentarios];
      setComentarios(coms);
      setComentario('');
      avisar(t, subtareas, coms);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo comentar'));
    } finally {
      setEnviandoComentario(false);
    }
  };

  const borrarComentario = async (c) => {
    try {
      await api.eliminarComentario(c.id);
      const coms = comentarios.filter((x) => x.id !== c.id);
      setComentarios(coms);
      avisar(t, subtareas, coms);
    } catch (e) { message.error(mensajeError(e, 'No se pudo eliminar')); }
  };

  const subir = async ({ file }) => {
    setSubiendo(true);
    try {
      const a = await api.subirAdjunto(t.id, file);
      const adjs = [a, ...adjuntos];
      setAdjuntos(adjs);
      avisar(t, subtareas, comentarios, adjs);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo subir el archivo'));
    } finally {
      setSubiendo(false);
    }
  };

  const agregarEnlace = async () => {
    if (!enlace.url.trim()) return;
    try {
      const a = await api.agregarEnlace(t.id, enlace.url.trim(), enlace.nombre.trim());
      const adjs = [a, ...adjuntos];
      setAdjuntos(adjs);
      setEnlace({ url: '', nombre: '' });
      setPop(null);
      avisar(t, subtareas, comentarios, adjs);
    } catch (e) { message.error(mensajeError(e, 'No se pudo agregar el enlace')); }
  };

  const borrarAdjunto = async (a) => {
    try {
      await api.eliminarAdjunto(a.id);
      const adjs = adjuntos.filter((x) => x.id !== a.id);
      setAdjuntos(adjs);
      avisar(t, subtareas, comentarios, adjs);
    } catch (e) { message.error(mensajeError(e, 'No se pudo eliminar')); }
  };

  // ── acciones de la tarjeta ────────────────────────────────────────────────
  const accion = async (key) => {
    if (key === 'copiar') {
      try {
        const copia = await api.copiarTarjeta(t.id);
        onNueva?.(copia);
        message.success('Tarjeta copiada');
      } catch (e) { message.error(mensajeError(e, 'No se pudo copiar')); }
    }
    if (key === 'enlace') {
      const url = `${window.location.origin}/inicio/tareas?tablero=${t.tablero_id}&tarjeta=${t.id}`;
      try { await navigator.clipboard.writeText(url); message.success('Enlace copiado'); } catch { message.info(url); }
    }
    if (key === 'archivar') {
      const real = await guardar({ archivada: !t.archivada }, { silencioso: true });
      if (real) {
        message.success(real.archivada ? 'Tarjeta archivada' : 'Tarjeta restaurada');
        if (real.archivada) onCerrar();
      }
    }
  };

  const eliminar = async () => {
    try {
      await api.eliminarTarjeta(t.id);
      onEliminada?.(t.id);
      message.success('Tarjeta eliminada');
      onCerrar();
    } catch (e) { message.error(mensajeError(e, 'No se pudo eliminar')); }
  };

  const etiquetasProyecto = useMemo(() => meta?.etiquetas || [], [meta]);
  const etiquetasPorId = useMemo(() => Object.fromEntries(etiquetasProyecto.map((e) => [e.id, e])), [etiquetasProyecto]);
  const tablero = t ? (tableros.find((x) => x.id === t.tablero_id) || t.tablero) : null;
  const avisoTexto = t?.vence_at && t.recordatorio_min != null
    ? opcionesRecordatorio(t.vence_con_hora).find((o) => o.value === t.recordatorio_min)?.label
    : null;

  // ── contenido ────────────────────────────────────────────────────────────
  let cuerpo;
  if (error) {
    cuerpo = <div style={{ padding: 30, textAlign: 'center', color: 'var(--qc-text-muted)' }}>{error}</div>;
  } else if (!t) {
    cuerpo = <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>;
  } else {
    cuerpo = (
      <div>
        {t.archivada && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.15)', color: 'var(--qc-text)', marginBottom: 12 }}>
            <InboxOutlined /> Esta tarjeta está archivada.
            <Button size="small" icon={<UndoOutlined />} onClick={() => accion('archivar')} style={{ marginLeft: 'auto' }}>Restaurar</Button>
          </div>
        )}

        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ paddingTop: 7 }}>
            <MarcaCompletar hecha={t.completada} onCambiar={(v) => guardar({ completada: v })} size={24} />
          </span>
          <Input.TextArea
            value={titulo}
            onChange={(e) => setTitulo(e.target.value.replace(/\n/g, ' '))}
            onBlur={guardarTitulo}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            autoSize
            variant="borderless"
            style={{
              fontSize: 20, fontWeight: 800, padding: '2px 4px', color: 'var(--qc-text)',
              textDecoration: t.completada ? 'line-through' : 'none',
            }}
            aria-label="Título"
          />
        </div>

        {/* Proyecto y lista */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '6px 0 0 34px', fontSize: 13, color: 'var(--qc-text-muted)' }}>
          en
          <Select
            size="small"
            value={t.tablero_id}
            onChange={moverAProyecto}
            variant="filled"
            popupMatchSelectWidth={false}
            options={tableros.filter((x) => !x.archivado || x.id === t.tablero_id).map((x) => ({
              value: x.id,
              label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconoProyecto tablero={x} size={18} />{x.nombre}</span>,
            }))}
            style={{ minWidth: 150 }}
          />
          /
          <Select
            size="small"
            value={t.lista_id}
            onChange={mover}
            variant="filled"
            popupMatchSelectWidth={false}
            loading={!meta}
            options={(meta?.listas || [t.lista]).filter(Boolean).map((l) => ({ value: l.id, label: l.nombre }))}
            style={{ minWidth: 140 }}
          />
          {t.created_by_name && <span>· creada por {t.created_by_name} {haceCuanto(t.created_at)}</span>}
        </div>

        {/* Etiquetas, fecha, repetición */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 5 }}>Etiquetas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              {(t.etiquetas || []).map((id) => etiquetasPorId[id]).filter(Boolean).map((e) => (
                <EtiquetaPill key={e.id} etiqueta={e} onClick={() => setPop('etiquetas')} style={{ height: 30, fontSize: 13 }} />
              ))}
              <Popover
                open={pop === 'etiquetas'}
                onOpenChange={(v) => setPop(v ? 'etiquetas' : null)}
                trigger="click"
                placement="bottomLeft"
                title="Etiquetas del proyecto"
                content={meta ? (
                  <EtiquetasSelector
                    tableroId={t.tablero_id}
                    etiquetas={etiquetasProyecto}
                    seleccion={t.etiquetas || []}
                    onCambiarSeleccion={(ids, op) => (op?.soloLocal ? setT((x) => ({ ...x, etiquetas: ids })) : guardar({ etiquetas: ids }, { silencioso: true }))}
                    onEtiquetasProyecto={setEtiquetasProyecto}
                  />
                ) : <Spin />}
              >
                {(t.etiquetas || []).length
                  ? <Button size="small" shape="circle" icon={<PlusOutlined />} aria-label="Etiquetas" />
                  : <BotonChip icon={<TagOutlined />}>Agregar</BotonChip>}
              </Popover>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 5 }}>Fecha</div>
            <EditorFlotante
              esMovil={esMovil}
              abierto={pop === 'fecha'}
              onAbierto={(v) => setPop(v ? 'fecha' : null)}
              titulo="Fecha"
              contenido={<FechaEditor enHoja={esMovil} tarjeta={t} onGuardar={(c) => guardar(c, { silencioso: true })} onCerrar={() => setPop(null)} />}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {t.vence_at
                  ? <ChipVence tarjeta={t} grande onClick={() => {}} />
                  : <BotonChip icon={<ClockCircleOutlined />}>Agregar fecha</BotonChip>}
                {avisoTexto && (
                  <Tooltip title={`Aviso al celular: ${avisoTexto}`}>
                    <BellOutlined style={{ color: 'var(--qc-text-muted)' }} />
                  </Tooltip>
                )}
              </span>
            </EditorFlotante>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 5 }}>Repetir</div>
            <EditorFlotante
              esMovil={esMovil}
              abierto={pop === 'repetir'}
              onAbierto={(v) => setPop(v ? 'repetir' : null)}
              titulo="Repetir"
              contenido={<RepeticionEditor enHoja={esMovil} tarjeta={t} listas={meta?.listas || []} onGuardar={(r) => guardar({ repeticion: r }, { silencioso: true })} onCerrar={() => setPop(null)} />}
            >
              <span>
                <BotonChip icon={<RetweetOutlined />}>{t.repeticion ? describirRepeticion(t.repeticion) : 'No se repite'}</BotonChip>
              </span>
            </EditorFlotante>
          </div>
        </div>

        {/* Descripción */}
        <Seccion
          icon={<AlignLeftOutlined />}
          titulo="Descripción"
          extra={!editDesc && t.descripcion ? <Button size="small" onClick={() => setEditDesc(true)}>Editar</Button> : null}
        >
          {editDesc || !t.descripcion ? (
            editDesc ? (
              <div>
                <Input.TextArea
                  autoFocus
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  autoSize={{ minRows: 4, maxRows: 18 }}
                  placeholder="Detalles, pasos, enlaces… Usa **negrita**, _cursiva_ y listas con -"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button type="primary" onClick={guardarDescripcion}>Guardar</Button>
                  <Button onClick={() => { setDescripcion(t.descripcion || ''); setEditDesc(false); }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditDesc(true)}
                style={{
                  width: '100%', minHeight: 56, textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'text',
                  border: 'none', background: 'var(--qc-relleno)', color: 'var(--qc-text-muted)', fontSize: 14,
                }}
              >
                Añade una descripción más detallada…
              </button>
            )
          ) : (
            <div role="button" tabIndex={0} onClick={() => setEditDesc(true)} onKeyDown={(e) => { if (e.key === 'Enter') setEditDesc(true); }} style={{ cursor: 'text' }}>
              <TextoFormato texto={t.descripcion} />
            </div>
          )}
        </Seccion>

        {/* Subtareas */}
        <Seccion icon={<CheckSquareOutlined />} titulo={`Subtareas${subtareas.length ? ` · ${subtareas.filter((s) => s.hecha).length}/${subtareas.length}` : ''}`}>
          <SubtareasTarjeta
            tarjetaId={t.id}
            subtareas={subtareas}
            onCambio={(subs) => { setSubtareas(subs); avisar(t, subs); }}
            onTarjetaNueva={onNueva}
          />
        </Seccion>

        {/* Adjuntos */}
        <Seccion
          icon={<PaperClipOutlined />}
          titulo="Adjuntos"
          extra={(
            <div style={{ display: 'flex', gap: 6 }}>
              <Upload accept=".pdf,image/jpeg,image/png,image/webp" showUploadList={false} customRequest={subir}>
                <Button size="small" icon={<PaperClipOutlined />} loading={subiendo}>Archivo</Button>
              </Upload>
              <Popover
                open={pop === 'enlace'}
                onOpenChange={(v) => setPop(v ? 'enlace' : null)}
                trigger="click"
                placement="bottomRight"
                content={(
                  <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input autoFocus placeholder="https://…" value={enlace.url} onChange={(e) => setEnlace((x) => ({ ...x, url: e.target.value }))} onPressEnter={agregarEnlace} />
                    <Input placeholder="Nombre (opcional)" value={enlace.nombre} onChange={(e) => setEnlace((x) => ({ ...x, nombre: e.target.value }))} onPressEnter={agregarEnlace} />
                    <Button type="primary" onClick={agregarEnlace}>Agregar enlace</Button>
                  </div>
                )}
              >
                <Button size="small" icon={<LinkOutlined />}>Enlace</Button>
              </Popover>
            </div>
          )}
        >
          {adjuntos.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>PDF o imágenes (hasta 10 MB) y enlaces (Drive, documentos…).</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {adjuntos.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--qc-relleno)' }}>
                  <span style={{ fontSize: 18, color: 'var(--qc-text-muted)' }}>
                    {a.tipo === 'enlace' ? <LinkOutlined /> : a.mime === 'application/pdf' ? <FilePdfOutlined style={{ color: '#dc2626' }} /> : <FileImageOutlined style={{ color: '#2563eb' }} />}
                  </span>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--qc-text)', fontWeight: 600 }}>
                    {a.nombre}
                  </a>
                  <span style={{ fontSize: 12, color: 'var(--qc-text-muted)', flexShrink: 0 }}>{haceCuanto(a.created_at)}</span>
                  <Popconfirm title="¿Quitar este adjunto?" okText="Quitar" cancelText="No" onConfirm={() => borrarAdjunto(a)}>
                    <Button type="text" size="small" icon={<DeleteOutlined />} aria-label="Quitar adjunto" />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        {/* Comentarios */}
        <Seccion icon={<MessageOutlined />} titulo="Comentarios">
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.TextArea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) comentar(); }}
              placeholder="Escribe un comentario o una nota de avance…"
              autoSize={{ minRows: 1, maxRows: 6 }}
            />
            <Button onClick={comentar} loading={enviandoComentario} disabled={!comentario.trim()}>Guardar</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {comentarios.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar size={30} style={{ background: 'var(--qc-azul)', flexShrink: 0 }}>{(c.user_name || '?').charAt(0).toUpperCase()}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
                    <strong style={{ color: 'var(--qc-text)' }}>{c.user_name || 'Alguien'}</strong> · {haceCuanto(c.created_at)}
                    <Popconfirm title="¿Eliminar el comentario?" okText="Eliminar" cancelText="No" onConfirm={() => borrarComentario(c)}>
                      <button type="button" style={{ border: 'none', background: 'none', color: 'var(--qc-text-muted)', cursor: 'pointer', fontSize: 12, marginLeft: 6, textDecoration: 'underline' }}>Eliminar</button>
                    </Popconfirm>
                  </div>
                  <div style={{ marginTop: 3, padding: '8px 11px', borderRadius: 8, background: 'var(--qc-relleno)' }}>
                    <TextoFormato texto={c.texto} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Seccion>
        <div style={{ height: 20 }} />
      </div>
    );
  }

  const menu = t ? {
    items: [
      { key: 'copiar', icon: <CopyOutlined />, label: 'Hacer una copia' },
      { key: 'enlace', icon: <LinkOutlined />, label: 'Copiar enlace' },
      { key: 'archivar', icon: t.archivada ? <UndoOutlined /> : <InboxOutlined />, label: t.archivada ? 'Restaurar' : 'Archivar' },
    ],
    onClick: ({ key }) => accion(key),
  } : { items: [] };

  const acciones = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {t && (
        <>
          <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} aria-label="Más acciones" />
          </Dropdown>
          <Popconfirm
            title="¿Eliminar la tarjeta?"
            description="Se borra con sus subtareas, comentarios y adjuntos. Archivar la guarda."
            okText="Eliminar"
            cancelText="No"
            okButtonProps={{ danger: true }}
            onConfirm={eliminar}
          >
            <Button type="text" icon={<DeleteOutlined />} aria-label="Eliminar tarjeta" />
          </Popconfirm>
        </>
      )}
      <Button type="text" icon={<CloseOutlined />} onClick={onCerrar} aria-label="Cerrar" />
    </div>
  );

  const encabezado = tablero ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--qc-text-muted)' }}>
      <IconoProyecto tablero={tablero} size={22} /> {tablero.nombre}
    </span>
  ) : null;

  if (esMovil) {
    return (
      <BottomSheet open={!!tarjetaId} onClose={onCerrar} title={encabezado} extra={acciones} height="94vh" maxHeight="94vh">
        {cuerpo}
      </BottomSheet>
    );
  }
  return (
    <Drawer
      open={!!tarjetaId}
      onClose={onCerrar}
      width={640}
      closable={false}
      destroyOnClose
      title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{encabezado}{acciones}</div>}
      styles={{ header: { padding: '12px 20px' }, body: { padding: '16px 26px' } }}
    >
      {cuerpo}
    </Drawer>
  );
};

export default TarjetaDetalle;
