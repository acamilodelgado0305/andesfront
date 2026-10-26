// src/components/tareas/RegistroTarea.jsx
// Escribir (o dictar) una tarea en una línea. Mientras se escribe se ve lo que
// se entendió: fecha, hora, repetición y etiquetas; tocar una pieza la deja
// como texto normal del título.
import React, { useMemo, useRef, useState } from 'react';
import { Input, Button, Tooltip } from 'antd';
import { AudioOutlined, CloseOutlined, ClockCircleOutlined, RetweetOutlined, TagOutlined, CalendarOutlined } from '@ant-design/icons';
import useDictado from '../Certificados/mobile/useDictado';
import { interpretarTarea } from './interpretarTarea';
import { describirRepeticion } from './repeticion';
import { fechaLarga, isoDesdeLocal } from './utilsTareas';

const ICONOS = { fecha: <CalendarOutlined />, hora: <ClockCircleOutlined />, repite: <RetweetOutlined />, etiqueta: <TagOutlined /> };

/** Cuerpo para POST /listas/:id/tarjetas a partir de lo interpretado. */
export const cuerpoDesdeInterpretacion = (p) => {
  const body = { titulo: p.titulo };
  if (p.etiquetas.length) body.etiquetas = p.etiquetas;
  if (p.fecha) {
    body.vence_at = p.hora ? isoDesdeLocal(p.fecha, p.hora) : p.fecha;
    body.vence_con_hora = !!p.hora;
    body.recordatorio_min = p.hora ? 60 : null;
    if (p.repeticion) body.repeticion = p.repeticion;
  }
  return body;
};

const RegistroTarea = ({
  etiquetas = [],
  onCrear,              // async (body) => tarjeta | null
  placeholder = 'Escribe una tarea… ej: Entregar informe el viernes 3pm #universidad',
  autoFocus = false,
  compacto = false,     // dentro de una columna del tablero
  onCerrar,
  extra = null,         // selector de proyecto/lista al lado del botón
  textoBoton = 'Añadir',
}) => {
  const [texto, setTexto] = useState('');
  const [ignorar, setIgnorar] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const ref = useRef(null);
  const dictado = useDictado();

  const interpretado = useMemo(
    () => (texto.trim() ? interpretarTarea(texto, { etiquetas, ignorar }) : null),
    [texto, etiquetas, ignorar],
  );

  const enviar = async () => {
    if (!interpretado?.titulo?.trim() || guardando) return;
    setGuardando(true);
    const t = await onCrear(cuerpoDesdeInterpretacion(interpretado));
    setGuardando(false);
    if (t) {
      setTexto('');
      setIgnorar([]);
      ref.current?.focus();
    }
  };

  const dictar = () => {
    if (dictado.escuchando) { dictado.detener(); return; }
    const base = texto ? `${texto.trim()} ` : '';
    dictado.iniciar((dicho) => setTexto(base + dicho));
  };

  const piezas = interpretado?.piezas || [];
  const resumen = [];
  if (interpretado?.fecha) resumen.push(`${fechaLarga(interpretado.fecha)}${interpretado.hora ? ` · ${interpretado.hora}` : ''}`);
  if (interpretado?.repeticion) resumen.push(describirRepeticion(interpretado.repeticion));

  return (
    <div>
      {/* En pantallas angostas los botones bajan a su propia fila (flex-wrap). */}
      <div style={{ display: 'flex', gap: 8, alignItems: compacto ? 'stretch' : 'center', flexDirection: compacto ? 'column' : 'row', flexWrap: 'wrap' }}>
        <Input.TextArea
          ref={ref}
          value={texto}
          autoFocus={autoFocus}
          onChange={(e) => setTexto(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
            if (e.key === 'Escape') onCerrar?.();
          }}
          placeholder={placeholder}
          autoSize={{ minRows: compacto ? 2 : 1, maxRows: 4 }}
          style={{ borderRadius: 10, fontSize: 14.5, flex: compacto ? undefined : '1 1 260px', minWidth: 0 }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
          {extra}
          {dictado.disponible && (
            <Tooltip title={dictado.escuchando ? 'Detener' : 'Dictar'}>
              <Button
                shape="circle"
                icon={<AudioOutlined />}
                onClick={dictar}
                className={dictado.escuchando ? 'qc-dictando' : undefined}
                style={dictado.escuchando ? { background: '#f0565c', color: '#fff', borderColor: '#f0565c' } : undefined}
              />
            </Tooltip>
          )}
          <Button type="primary" onClick={enviar} loading={guardando} disabled={!interpretado?.titulo?.trim()}>
            {textoBoton}
          </Button>
          {compacto && onCerrar && <Button type="text" icon={<CloseOutlined />} onClick={onCerrar} aria-label="Cerrar" />}
        </div>
      </div>

      {(piezas.length > 0 || ignorar.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
          {piezas.map((p) => (
            <Tooltip key={`${p.tipo}-${p.inicio}`} title="Tocar para dejarlo como texto">
              <button
                type="button"
                onClick={() => setIgnorar((xs) => [...new Set([...xs, p.tipo])])}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px',
                  borderRadius: 13, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  background: 'var(--qc-azul-suave)', color: 'var(--qc-azul)',
                }}
              >
                {ICONOS[p.tipo]} {p.texto} <CloseOutlined style={{ fontSize: 9, opacity: 0.7 }} />
              </button>
            </Tooltip>
          ))}
          {ignorar.length > 0 && (
            <button
              type="button"
              onClick={() => setIgnorar([])}
              style={{ border: 'none', background: 'none', color: 'var(--qc-text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Volver a interpretar
            </button>
          )}
          {resumen.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>→ {resumen.join(' · ')}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default RegistroTarea;
