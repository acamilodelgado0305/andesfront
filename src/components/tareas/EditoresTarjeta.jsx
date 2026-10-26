// src/components/tareas/EditoresTarjeta.jsx
// Editores que se abren desde el detalle de una tarjeta: etiquetas, fecha
// (con hora y aviso al celular) y repetición.
import React, { useMemo, useState } from 'react';
import { Input, Button, Calendar, TimePicker, Switch, Select, InputNumber, DatePicker, Popconfirm, message } from 'antd';
import { CheckOutlined, EditOutlined, DeleteOutlined, LeftOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import esCalendar from 'antd/es/calendar/locale/es_ES';
import esPicker from 'antd/es/date-picker/locale/es_ES';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { EtiquetaPill } from './piezasTareas';
import { PALETA_ETIQUETAS, diaCO, hoyCO, horaHHMM, isoDesdeLocal, opcionesRecordatorio, sinTildes, sumarDiasStr, textoSobre } from './utilsTareas';
import { describirRepeticion } from './repeticion';

dayjs.locale('es');

// ── Etiquetas ───────────────────────────────────────────────────────────────
const Paleta = ({ valor, onCambiar }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
    {PALETA_ETIQUETAS.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={`Color ${c}`}
        onClick={() => onCambiar(c)}
        style={{
          height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: c, color: textoSobre(c),
          outline: valor === c ? '2px solid var(--qc-text)' : 'none', outlineOffset: 1,
        }}
      >
        {valor === c && <CheckOutlined style={{ fontSize: 11 }} />}
      </button>
    ))}
  </div>
);

/**
 * Elegir etiquetas de la tarjeta y administrar las del proyecto.
 * `seleccion`: ids de la tarjeta. `onCambiarSeleccion(ids)`.
 * `onEtiquetasProyecto(fn)`: actualiza la lista de etiquetas del proyecto.
 */
export const EtiquetasSelector = ({ tableroId, etiquetas, seleccion, onCambiarSeleccion, onEtiquetasProyecto }) => {
  const [buscar, setBuscar] = useState('');
  const [editando, setEditando] = useState(null); // etiqueta | { nueva: true }
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(PALETA_ETIQUETAS[5]);
  const [guardando, setGuardando] = useState(false);

  const visibles = useMemo(
    () => etiquetas.filter((e) => !buscar || sinTildes(e.nombre).includes(sinTildes(buscar))),
    [etiquetas, buscar],
  );

  const abrirEditor = (e) => {
    setEditando(e || { nueva: true });
    setNombre(e ? e.nombre : buscar);
    setColor(e ? e.color : PALETA_ETIQUETAS[(etiquetas.length * 3) % PALETA_ETIQUETAS.length]);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      if (editando.nueva) {
        const e = await api.crearEtiqueta(tableroId, { nombre: nombre.trim(), color });
        onEtiquetasProyecto((xs) => [...xs, e]);
        onCambiarSeleccion([...seleccion, e.id]);
      } else {
        const e = await api.actualizarEtiqueta(editando.id, { nombre: nombre.trim(), color });
        onEtiquetasProyecto((xs) => xs.map((x) => (x.id === e.id ? e : x)));
      }
      setEditando(null);
      setBuscar('');
    } catch (err) {
      message.error(mensajeError(err, 'No se pudo guardar la etiqueta'));
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    try {
      await api.eliminarEtiqueta(editando.id);
      onEtiquetasProyecto((xs) => xs.filter((x) => x.id !== editando.id));
      if (seleccion.includes(editando.id)) onCambiarSeleccion(seleccion.filter((id) => id !== editando.id), { soloLocal: true });
      setEditando(null);
    } catch (err) {
      message.error(mensajeError(err, 'No se pudo eliminar'));
    }
  };

  if (editando) {
    return (
      <div style={{ width: 270 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Button type="text" size="small" icon={<LeftOutlined />} onClick={() => setEditando(null)} aria-label="Volver" />
          <strong style={{ color: 'var(--qc-text)' }}>{editando.nueva ? 'Nueva etiqueta' : 'Editar etiqueta'}</strong>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--qc-relleno)', marginBottom: 10, textAlign: 'center' }}>
          <EtiquetaPill etiqueta={{ nombre: nombre || ' ', color }} />
        </div>
        <Input autoFocus placeholder="Nombre (ej: Universidad, Urgente)" value={nombre} onChange={(e) => setNombre(e.target.value)} onPressEnter={guardar} maxLength={60} style={{ marginBottom: 10 }} />
        <Paleta valor={color} onCambiar={setColor} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button type="primary" onClick={guardar} loading={guardando} style={{ flex: 1 }}>{editando.nueva ? 'Crear' : 'Guardar'}</Button>
          {!editando.nueva && (
            <Popconfirm title="¿Eliminar la etiqueta?" description="Se quita de todas las tarjetas del proyecto." okText="Eliminar" cancelText="No" okButtonProps={{ danger: true }} onConfirm={borrar}>
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 270 }}>
      <Input placeholder="Buscar etiquetas…" value={buscar} onChange={(e) => setBuscar(e.target.value)} allowClear style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {visibles.map((e) => {
          const activa = seleccion.includes(e.id);
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                role="checkbox"
                aria-checked={activa}
                tabIndex={0}
                onClick={() => onCambiarSeleccion(activa ? seleccion.filter((x) => x !== e.id) : [...seleccion, e.id])}
                onKeyDown={(ev) => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); onCambiarSeleccion(activa ? seleccion.filter((x) => x !== e.id) : [...seleccion, e.id]); } }}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                  border: activa ? 'none' : '1.5px solid var(--qc-text-muted)', background: activa ? 'var(--qc-azul)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11,
                }}
              >
                {activa && <CheckOutlined />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <EtiquetaPill
                  etiqueta={e}
                  onClick={() => onCambiarSeleccion(activa ? seleccion.filter((x) => x !== e.id) : [...seleccion, e.id])}
                  style={{ width: '100%', height: 30, fontSize: 13 }}
                />
              </div>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => abrirEditor(e)} aria-label="Editar etiqueta" />
            </div>
          );
        })}
        {!visibles.length && <div style={{ color: 'var(--qc-text-muted)', fontSize: 13, padding: 4 }}>No hay etiquetas con ese nombre.</div>}
      </div>
      <Button block icon={<PlusOutlined />} onClick={() => abrirEditor(null)} style={{ marginTop: 10 }}>
        {buscar ? `Crear "${buscar}"` : 'Crear etiqueta'}
      </Button>
    </div>
  );
};

// ── Fecha ───────────────────────────────────────────────────────────────────
const proximoLunes = (hoy) => {
  const d = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  return sumarDiasStr(hoy, ((8 - d) % 7) || 7);
};

/** `onGuardar({ vence_at, vence_con_hora, recordatorio_min })` (vence_at null = quitar). */
export const FechaEditor = ({ tarjeta, onGuardar, onCerrar }) => {
  const inicialDia = tarjeta.vence_at ? diaCO(tarjeta.vence_at) : hoyCO();
  const [dia, setDia] = useState(inicialDia);
  const [conHora, setConHora] = useState(tarjeta.vence_at ? tarjeta.vence_con_hora : false);
  const [hora, setHora] = useState(tarjeta.vence_at && tarjeta.vence_con_hora ? horaHHMM(tarjeta.vence_at) : '09:00');
  const [aviso, setAviso] = useState(tarjeta.vence_at ? (tarjeta.recordatorio_min ?? 'no') : 'no');
  const hoy = hoyCO();

  const guardar = (diaElegido = dia) => {
    onGuardar({
      vence_at: conHora ? isoDesdeLocal(diaElegido, hora) : diaElegido,
      vence_con_hora: conHora,
      recordatorio_min: aviso === 'no' ? null : aviso,
    });
    onCerrar?.();
  };

  const atajos = [
    ['Hoy', hoy], ['Mañana', sumarDiasStr(hoy, 1)], ['Próx. lunes', proximoLunes(hoy)], ['En 1 semana', sumarDiasStr(hoy, 7)],
  ];

  return (
    <div style={{ width: 300 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {atajos.map(([txt, d]) => (
          <Button key={txt} size="small" type={dia === d ? 'primary' : 'default'} onClick={() => setDia(d)}>{txt}</Button>
        ))}
      </div>
      <Calendar
        fullscreen={false}
        locale={esCalendar}
        value={dayjs(`${dia}T12:00:00`)}
        onSelect={(v, info) => { if (!info || info.source === 'date') setDia(v.format('YYYY-MM-DD')); }}
        onPanelChange={(v) => setDia(v.format('YYYY-MM-DD'))}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <Switch
          size="small"
          checked={conHora}
          onChange={(v) => {
            setConHora(v);
            // Las opciones de aviso cambian: con hora, 1 hora antes es lo normal.
            setAviso(v ? 60 : 'no');
          }}
        />
        <span style={{ color: 'var(--qc-text)', fontSize: 13.5 }}>Con hora</span>
        {conHora && (
          <TimePicker
            size="small"
            locale={esPicker}
            format="h:mm a"
            use12Hours
            minuteStep={5}
            allowClear={false}
            needConfirm={false}
            value={dayjs(`2000-01-01T${hora}:00`)}
            onChange={(v) => v && setHora(v.format('HH:mm'))}
            style={{ marginLeft: 'auto', width: 120 }}
          />
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginBottom: 4 }}>Avisarme al celular</div>
        <Select value={aviso} onChange={setAviso} options={opcionesRecordatorio(conHora)} style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button type="primary" style={{ flex: 1 }} onClick={() => guardar()}>Guardar</Button>
        {tarjeta.vence_at && (
          <Button onClick={() => { onGuardar({ vence_at: null }); onCerrar?.(); }}>Quitar</Button>
        )}
      </div>
    </div>
  );
};

// ── Repetición ──────────────────────────────────────────────────────────────
const LETRAS = [['L', 1], ['M', 2], ['X', 3], ['J', 4], ['V', 5], ['S', 6], ['D', 0]];
const TIPOS = [
  { value: 'no', label: 'No se repite' },
  { value: 'diaria', label: 'Cada día' },
  { value: 'semanal', label: 'Cada semana (elige los días)' },
  { value: 'habiles', label: 'Días hábiles (lun a vie)' },
  { value: 'mensual', label: 'Cada mes' },
  { value: 'anual', label: 'Cada año' },
];

/** `onGuardar(regla | null)`. `listas`: para elegir dónde aparece la siguiente. */
export const RepeticionEditor = ({ tarjeta, listas = [], onGuardar, onCerrar }) => {
  const r = tarjeta.repeticion;
  const diaVence = tarjeta.vence_at ? new Date(`${diaCO(tarjeta.vence_at)}T12:00:00Z`) : null;
  const esHabiles = r?.frecuencia === 'semanal' && (r.cada || 1) === 1 && [...(r.dias || [])].sort().join() === '1,2,3,4,5';
  const [tipo, setTipo] = useState(r ? (esHabiles ? 'habiles' : r.frecuencia) : 'semanal');
  const [cada, setCada] = useState(r?.cada || 1);
  const [dias, setDias] = useState(r?.dias?.length ? r.dias : (diaVence ? [diaVence.getUTCDay()] : [1]));
  const [hasta, setHasta] = useState(r?.hasta || null);
  const abiertas = listas.filter((l) => !l.es_final);
  const [listaId, setListaId] = useState(r?.lista_id || (abiertas.find((l) => l.id === tarjeta.lista_id) || abiertas[0])?.id || null);

  const regla = tipo === 'no' ? null : {
    frecuencia: tipo === 'habiles' ? 'semanal' : tipo,
    cada: tipo === 'habiles' ? 1 : cada,
    ...(tipo === 'semanal' ? { dias } : {}),
    ...(tipo === 'habiles' ? { dias: [1, 2, 3, 4, 5] } : {}),
    ...(tipo === 'mensual' && r?.dia_mes ? { dia_mes: r.dia_mes } : {}),
    hasta,
    lista_id: listaId,
  };

  if (!tarjeta.vence_at) {
    return (
      <div style={{ width: 280, color: 'var(--qc-text)' }}>
        Para que se repita, primero ponle una <strong>fecha</strong> (por ejemplo, el próximo martes a las 6:00 p. m.).
        Al completarla, o cuando pase su hora, aparece sola la siguiente.
      </div>
    );
  }

  const unidad = { diaria: 'días', semanal: 'semanas', mensual: 'meses', anual: 'años' }[tipo];

  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Select value={tipo} onChange={setTipo} options={TIPOS} />
      {['diaria', 'semanal', 'mensual', 'anual'].includes(tipo) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--qc-text)' }}>
          Cada <InputNumber min={1} max={99} value={cada} onChange={(v) => setCada(v || 1)} style={{ width: 70 }} /> {unidad}
        </div>
      )}
      {tipo === 'semanal' && (
        <div style={{ display: 'flex', gap: 5 }}>
          {LETRAS.map(([letra, d]) => {
            const on = dias.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setDias((xs) => (on ? (xs.length > 1 ? xs.filter((x) => x !== d) : xs) : [...xs, d].sort()))}
                style={{
                  width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer', fontWeight: 700,
                  background: on ? 'var(--qc-azul)' : 'var(--qc-relleno)', color: on ? '#fff' : 'var(--qc-text)',
                }}
              >
                {letra}
              </button>
            );
          })}
        </div>
      )}
      {regla && (
        <>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginBottom: 4 }}>Termina</div>
            <DatePicker
              locale={esPicker}
              placeholder="Nunca"
              value={hasta ? dayjs(`${hasta}T12:00:00`) : null}
              onChange={(v) => setHasta(v ? v.format('YYYY-MM-DD') : null)}
              format="D MMM YYYY"
              style={{ width: '100%' }}
            />
          </div>
          {abiertas.length > 1 && (
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginBottom: 4 }}>La siguiente aparece en</div>
              <Select value={listaId} onChange={setListaId} options={abiertas.map((l) => ({ value: l.id, label: l.nombre }))} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
            {describirRepeticion(regla)}. Al completarla (o cuando pase su fecha) aparece la siguiente con su aviso.
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="primary" style={{ flex: 1 }} onClick={() => { onGuardar(regla); onCerrar?.(); }}>Guardar</Button>
        {r && <Button onClick={() => { onGuardar(null); onCerrar?.(); }}>No repetir</Button>}
      </div>
    </div>
  );
};
