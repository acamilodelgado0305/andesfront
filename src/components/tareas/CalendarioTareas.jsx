// src/components/tareas/CalendarioTareas.jsx
// Vista Calendario: las tareas en el día en que vencen.
//  - Mes (computador): arrastrar una tarea a otro día la reprograma (conserva
//    la hora); las que no tienen fecha están a la derecha y se sueltan en un día.
//  - Agenda (celular, o a elección): lista por día desde hoy.
// Las repeticiones futuras de una tarea (clases de los martes…) se ven
// punteadas: todavía no existen, nacen cuando se completa la anterior.
import React, { useMemo, useState } from 'react';
import { Button, Segmented, Popover, Empty } from 'antd';
import { LeftOutlined, RightOutlined, RetweetOutlined, PlusOutlined } from '@ant-design/icons';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin,
} from '@dnd-kit/core';
import { MarcaCompletar } from './piezasTareas';
import { diaCO, hoyCO, sumarDiasStr, horaCO, horaHHMM, isoDesdeLocal, estadoVence, fechaLarga, tinte } from './utilsTareas';
import { proximasOcurrencias } from './repeticion';

const NOMBRES_DIA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const leerModo = () => {
  try { return localStorage.getItem('qc-tareas-calendario') || 'semana'; } catch { return 'semana'; }
};

const mesLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('es-CO', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const moverMes = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 15)).toISOString().slice(0, 7);
};
// Lunes de la semana de un día (las semanas van de lunes a domingo).
const lunesDe = (dia) => sumarDiasStr(dia, -((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7));
const diaCorto = (dia, conAno = false) => {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(conAno ? { year: 'numeric' } : {}),
  }).replace('.', '');
};
const semanaLabel = (lunes) => `${diaCorto(lunes)} – ${diaCorto(sumarDiasStr(lunes, 6), true)}`;

// Semanas de lunes a domingo que cubren el mes.
const diasDelMes = (ym) => {
  const primero = `${ym}-01`;
  const dow = (new Date(`${primero}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
  const inicio = sumarDiasStr(primero, -dow);
  const [y, m] = ym.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
  const dias = [];
  for (let d = inicio; dias.length < 42; d = sumarDiasStr(d, 1)) {
    dias.push(d);
    if (dias.length % 7 === 0 && d >= ultimo) break;
  }
  return dias;
};

const colorDe = (t, tablerosPorId, etiquetasPorId, colorProyecto) => {
  if (tablerosPorId) return (tablerosPorId[t.tablero_id] || t.tablero)?.color || '#64748b';
  const e = (t.etiquetas || []).map((id) => etiquetasPorId[id]).find(Boolean);
  return e?.color || colorProyecto || '#64748b';
};

// ── Chip de tarea en una celda ──────────────────────────────────────────────
const ChipVista = React.forwardRef(({ item, color, onAbrir, arrastrando = false, ...resto }, ref) => {
  const { t, virtual } = item;
  const vencida = !virtual && estadoVence(t) === 'vencida';
  return (
    <div
      ref={ref}
      {...resto}
      onClick={(e) => { e.stopPropagation(); onAbrir(t.id); }}
      title={virtual ? `${t.titulo} (se repite)` : t.titulo}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '2px 6px', borderRadius: 5, fontSize: 12,
        lineHeight: '17px', cursor: virtual ? 'pointer' : 'grab', minWidth: 0,
        background: virtual ? 'transparent' : tinte(color, 0.16),
        border: virtual ? `1px dashed ${tinte(color, 0.7)}` : '1px solid transparent',
        borderLeft: virtual ? undefined : `3px solid ${color}`,
        color: t.completada ? 'var(--qc-text-muted)' : 'var(--qc-text)',
        textDecoration: t.completada ? 'line-through' : 'none',
        opacity: arrastrando ? 0.3 : virtual ? 0.75 : 1,
        outline: vencida ? '1px solid #dc2626' : 'none',
      }}
    >
      {virtual && <RetweetOutlined style={{ fontSize: 10, color }} />}
      {t.vence_con_hora && t.vence_at && <span style={{ fontWeight: 700, flexShrink: 0 }}>{horaHHMM(item.fecha)}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</span>
    </div>
  );
});
ChipVista.displayName = 'ChipVista';

// Las repeticiones virtuales no se arrastran: se mueve la tarea real.
const Chip = ({ item, color, onAbrir }) => {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `c${item.t.id}`, data: { t: item.t }, disabled: item.virtual,
  });
  if (item.virtual) return <ChipVista item={item} color={color} onAbrir={onAbrir} />;
  return <ChipVista ref={setNodeRef} {...attributes} {...listeners} item={item} color={color} onAbrir={onAbrir} arrastrando={isDragging} />;
};

const Celda = ({ dia, ym, items, hoy, colorItem, onAbrir, onCrearEnDia, alto, todas = false }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `d${dia}` });
  const fuera = !!ym && dia.slice(0, 7) !== ym;
  // En la vista Semana se ven todas; en el mes, 4 y "+N más".
  const visibles = todas ? items : items.slice(0, 4);
  const resto = items.length - visibles.length;
  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => onCrearEnDia?.(dia)}
      style={{
        minHeight: alto, padding: '4px 5px 6px', borderRight: '1px solid var(--qc-border)', borderBottom: '1px solid var(--qc-border)',
        background: isOver ? 'var(--qc-azul-suave)' : fuera ? 'var(--qc-surface-2)' : 'var(--qc-surface)',
        display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, position: 'relative',
      }}
      className="qc-cal-celda"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 12, fontWeight: dia === hoy ? 800 : 600, width: 24, height: 24, borderRadius: 12,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: dia === hoy ? '#f0565c' : 'transparent', color: dia === hoy ? '#fff' : fuera ? 'var(--qc-text-muted)' : 'var(--qc-text)',
        }}>
          {Number(dia.slice(8))}
        </span>
        {todas && items.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--qc-text-muted)', marginRight: 'auto', marginLeft: 4 }}>
            {items.length} tarea{items.length === 1 ? '' : 's'}
          </span>
        )}
        {onCrearEnDia && (
          <button
            type="button"
            className="qc-cal-mas"
            onClick={() => onCrearEnDia(dia)}
            aria-label="Nueva tarea este día"
            style={{ border: 'none', background: 'none', color: 'var(--qc-text-muted)', cursor: 'pointer', padding: 2 }}
          >
            <PlusOutlined style={{ fontSize: 11 }} />
          </button>
        )}
      </div>
      {visibles.map((it) => (
        <Chip key={`${it.t.id}-${it.fecha.getTime()}`} item={it} color={colorItem(it.t)} onAbrir={onAbrir} />
      ))}
      {resto > 0 && (
        <Popover
          trigger="click"
          title={fechaLarga(dia)}
          content={(
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 240 }}>
              {items.map((it) => <ChipVista key={`${it.t.id}-${it.fecha.getTime()}`} item={it} color={colorItem(it.t)} onAbrir={onAbrir} />)}
            </div>
          )}
        >
          <button type="button" style={{ border: 'none', background: 'none', color: 'var(--qc-text-muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '0 4px' }}>
            +{resto} más
          </button>
        </Popover>
      )}
    </div>
  );
};

const SinFecha = ({ tarjetas, colorItem, onAbrir }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'sin-fecha' });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: 220, flexShrink: 0, borderRadius: 12, border: '1px solid var(--qc-border)', padding: 10,
        background: isOver ? 'var(--qc-azul-suave)' : 'var(--qc-surface-2)', alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 260px)', overflowY: 'auto',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--qc-text)', marginBottom: 2 }}>Sin fecha · {tarjetas.length}</div>
      <div style={{ fontSize: 11.5, color: 'var(--qc-text-muted)', marginBottom: 8 }}>Arrástralas a un día del calendario</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tarjetas.map((t) => <Chip key={t.id} item={{ t, fecha: new Date(), virtual: false }} color={colorItem(t)} onAbrir={onAbrir} />)}
      </div>
    </div>
  );
};

// ── Agenda (lista por día) ──────────────────────────────────────────────────
// `rango` [desde, hasta]: solo esos días, todos aunque estén vacíos (semana).
const Agenda = ({ porDia, hoy, colorItem, tablerosPorId, onAbrir, onCompletar, rango = null }) => {
  const dias = Object.keys(porDia).sort();
  const vencidas = rango ? [] : dias.filter((d) => d < hoy).flatMap((d) => porDia[d]).filter((it) => !it.virtual && !it.t.completada);
  const futuros = rango
    ? Array.from({ length: 7 }, (_, i) => sumarDiasStr(rango[0], i))
    : dias.filter((d) => d >= hoy);
  if (!vencidas.length && !futuros.length) return <Empty description="No hay tareas con fecha" style={{ padding: 40 }} />;

  const Fila = ({ it }) => {
    const tb = tablerosPorId?.[it.t.tablero_id] || it.t.tablero;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onAbrir(it.t.id)}
        onKeyDown={(e) => { if (e.key === 'Enter') onAbrir(it.t.id); }}
        className="qc-mov-fila"
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', opacity: it.virtual ? 0.7 : 1 }}
      >
        {it.virtual
          ? <RetweetOutlined style={{ width: 20, color: colorItem(it.t) }} />
          : <MarcaCompletar hecha={it.t.completada} onCambiar={(v) => onCompletar(it.t, v)} size={20} />}
        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: colorItem(it.t), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, color: it.t.completada ? 'var(--qc-text-muted)' : 'var(--qc-text)',
            textDecoration: it.t.completada ? 'line-through' : 'none', overflowWrap: 'anywhere',
          }}>
            {it.t.titulo}
          </div>
          <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            {it.t.vence_con_hora && <span>{horaCO(it.fecha)}</span>}
            {it.virtual && <span>Se repite</span>}
            {tb && <span>{tb.icono} {tb.nombre}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {vencidas.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>Vencidas · {vencidas.length}</div>
          {vencidas.map((it) => <Fila key={`v${it.t.id}`} it={it} />)}
        </section>
      )}
      {futuros.map((d) => (
        <section key={d} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: d === hoy ? '#f0565c' : 'var(--qc-text)', marginBottom: 2 }}>
            {d === hoy ? 'Hoy' : d === sumarDiasStr(hoy, 1) ? 'Mañana' : fechaLarga(d).replace(/^./, (c) => c.toUpperCase())}
          </div>
          {(porDia[d] || []).length
            ? porDia[d].map((it) => <Fila key={`${it.t.id}-${it.fecha.getTime()}`} it={it} />)
            : <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', padding: '6px 4px' }}>Sin tareas</div>}
        </section>
      ))}
    </div>
  );
};

// ── Calendario ──────────────────────────────────────────────────────────────
const CalendarioTareas = ({
  tarjetas, etiquetas = [], tablerosPorId = null, colorProyecto, esMovil,
  onAbrir, onCompletar, onReprogramar, onCrearEnDia,
}) => {
  const hoy = hoyCO();
  const [ym, setYm] = useState(hoy.slice(0, 7));
  const [lunes, setLunes] = useState(() => lunesDe(hoy));
  const [modo, setModoEstado] = useState(leerModo);
  const [arrastrada, setArrastrada] = useState(null);
  const setModo = (m) => { setModoEstado(m); try { localStorage.setItem('qc-tareas-calendario', m); } catch { /* sin almacenamiento */ } };

  const etiquetasPorId = useMemo(() => Object.fromEntries(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const colorItem = (t) => colorDe(t, tablerosPorId, etiquetasPorId, colorProyecto);

  const dias = useMemo(
    () => (modo === 'semana' ? Array.from({ length: 7 }, (_, i) => sumarDiasStr(lunes, i)) : diasDelMes(ym)),
    [modo, lunes, ym],
  );
  const hastaAgenda = sumarDiasStr(hoy, 45);
  const limite = modo === 'agenda' ? hastaAgenda : dias[dias.length - 1];

  // Cada tarjeta con fecha en su día + sus repeticiones futuras (virtuales).
  const porDia = useMemo(() => {
    const mapa = {};
    const poner = (dia, item) => { (mapa[dia] = mapa[dia] || []).push(item); };
    tarjetas.forEach((t) => {
      if (!t.vence_at) return;
      poner(diaCO(t.vence_at), { t, fecha: new Date(t.vence_at), virtual: false });
      if (!t.completada) {
        proximasOcurrencias(t, `${limite}T23:59:59-05:00`).forEach((f) => poner(diaCO(f), { t, fecha: f, virtual: true }));
      }
    });
    Object.values(mapa).forEach((xs) => xs.sort((a, b) => Number(a.t.completada) - Number(b.t.completada)
      || Number(b.t.vence_con_hora === false) - Number(a.t.vence_con_hora === false) || a.fecha - b.fecha));
    return mapa;
  }, [tarjetas, limite]);

  const sinFecha = useMemo(() => tarjetas.filter((t) => !t.vence_at && !t.completada), [tarjetas]);
  const tareasSemana = modo === 'semana' ? dias.reduce((n, d) => n + (porDia[d]?.length || 0), 0) : 0;

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const alSoltar = ({ active, over }) => {
    setArrastrada(null);
    const t = active.data.current?.t;
    if (!t || !over) return;
    if (over.id === 'sin-fecha') {
      if (t.vence_at) onReprogramar(t, null);
      return;
    }
    const dia = String(over.id).slice(1);
    if (t.vence_at && diaCO(t.vence_at) === dia) return;
    onReprogramar(t, t.vence_at && t.vence_con_hora
      ? { vence_at: isoDesdeLocal(dia, horaHHMM(t.vence_at)), vence_con_hora: true }
      : { vence_at: dia, vence_con_hora: false });
  };

  const encabezado = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      {modo === 'mes' && (
        <>
          <Button shape="circle" icon={<LeftOutlined />} onClick={() => setYm((x) => moverMes(x, -1))} aria-label="Mes anterior" />
          <Button shape="circle" icon={<RightOutlined />} onClick={() => setYm((x) => moverMes(x, 1))} aria-label="Mes siguiente" />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--qc-text)', minWidth: 170 }}>{mesLabel(ym)}</span>
          <Button size="small" onClick={() => setYm(hoy.slice(0, 7))}>Hoy</Button>
        </>
      )}
      {modo === 'semana' && (
        <>
          <Button shape="circle" icon={<LeftOutlined />} onClick={() => setLunes((x) => sumarDiasStr(x, -7))} aria-label="Semana anterior" />
          <Button shape="circle" icon={<RightOutlined />} onClick={() => setLunes((x) => sumarDiasStr(x, 7))} aria-label="Semana siguiente" />
          <span style={{ fontSize: esMovil ? 16 : 18, fontWeight: 800, color: 'var(--qc-text)' }}>{semanaLabel(lunes)}</span>
          <span style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
            {lunes === lunesDe(hoy) ? 'Esta semana · ' : lunes === sumarDiasStr(lunesDe(hoy), 7) ? 'Próxima semana · ' : ''}
            {`${tareasSemana} tarea${tareasSemana === 1 ? '' : 's'}`}
          </span>
          {lunes !== lunesDe(hoy) && <Button size="small" onClick={() => setLunes(lunesDe(hoy))}>Esta semana</Button>}
        </>
      )}
      {modo === 'agenda' && <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--qc-text)' }}>Próximos 45 días</span>}
      <div style={{ flex: 1 }} />
      <Segmented
        size="small"
        value={modo}
        onChange={setModo}
        options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }, { value: 'agenda', label: 'Agenda' }]}
      />
    </div>
  );

  // En el celular la semana se ve como lista por día (7 columnas no caben).
  if (modo === 'agenda' || (modo === 'semana' && esMovil)) {
    return (
      <div>
        {encabezado}
        <Agenda
          porDia={porDia}
          hoy={hoy}
          colorItem={colorItem}
          tablerosPorId={tablerosPorId}
          onAbrir={onAbrir}
          onCompletar={onCompletar}
          rango={modo === 'semana' ? [lunes, sumarDiasStr(lunes, 6)] : null}
        />
      </div>
    );
  }

  const alto = modo === 'semana' ? 'calc(100vh - 330px)' : esMovil ? 74 : 112;
  return (
    <DndContext
      sensors={sensores}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => setArrastrada(active.data.current?.t || null)}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastrada(null)}
    >
      {encabezado}
      <style>{`.qc-cal-celda .qc-cal-mas{opacity:0}.qc-cal-celda:hover .qc-cal-mas{opacity:1}`}</style>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--qc-border)', borderRight: 'none', borderBottom: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {NOMBRES_DIA.map((n) => (
              <div key={n} style={{
                padding: '6px 8px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                color: 'var(--qc-text-muted)', background: 'var(--qc-surface-2)',
                borderRight: '1px solid var(--qc-border)', borderBottom: '1px solid var(--qc-border)',
              }}>
                {n}
              </div>
            ))}
            {dias.map((d) => (
              <Celda key={d} dia={d} ym={modo === 'semana' ? null : ym} hoy={hoy} items={porDia[d] || []} colorItem={colorItem}
                onAbrir={onAbrir} onCrearEnDia={esMovil ? null : onCrearEnDia} alto={alto} todas={modo === 'semana'} />
            ))}
          </div>
        </div>
        {!esMovil && sinFecha.length > 0 && <SinFecha tarjetas={sinFecha} colorItem={colorItem} onAbrir={onAbrir} />}
      </div>
      <DragOverlay dropAnimation={null}>
        {arrastrada && (
          <div style={{ width: 180 }}>
            <ChipVista item={{ t: arrastrada, fecha: new Date(arrastrada.vence_at || Date.now()), virtual: false }} color={colorItem(arrastrada)} onAbrir={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default CalendarioTareas;
