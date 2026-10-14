import React, { useEffect, useState } from 'react';
import { Button, Input, Popover, Popconfirm, Spin, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';

import {
  getEgresoCategorias,
  createEgresoCategoria,
  updateEgresoCategoria,
  deleteEgresoCategoria,
} from '../../../services/controlapos/posService';

// Etiquetas de los gastos (en BD/API se llaman categorías).
//
// Paleta fija: todas llevan texto blanco, así que son colores oscuros que se
// leen en tema claro y oscuro. Debe coincidir con la de
// egreso_etiquetas_color_migration.sql (que colorea las etiquetas viejas).
export const PALETA_ETIQUETAS = [
  '#15803d', // verde
  '#1d4ed8', // azul
  '#7c3aed', // morado
  '#db2777', // rosa
  '#dc2626', // rojo
  '#ea580c', // naranja
  '#ca8a04', // mostaza
  '#0891b2', // cian
  '#475569', // gris
];
const COLOR_POR_DEFECTO = '#475569';

const anillo = (color) => `0 0 0 2px var(--qc-surface), 0 0 0 4px ${color}`;

// Nombres que empiezan con emoji ("🍔 Comida") no necesitan el punto de color.
const empiezaConEmoji = (nombre = '') => /^\p{Extended_Pictographic}/u.test(String(nombre).trim());

// Chip de color sólido con texto blanco. Se usa igual en el formulario, la
// tabla y las tarjetas del celular.
//
// `sutil`: versión sobria para la vista del celular (estilo MonAi): fondo
// neutro del tema y solo un punto con el color de la etiqueta. Se lee igual de
// bien en claro y en oscuro.
export const EtiquetaChip = ({ nombre, color, size = 'md', selected = false, dimmed = false, onClick, title, sutil = false }) => {
  const fondo = color || COLOR_POR_DEFECTO;
  const chico = size === 'sm';
  const Elemento = onClick ? 'button' : 'span';

  const estilo = sutil
    ? {
      background: 'var(--qc-surface-2)',
      color: 'var(--qc-text)',
      borderRadius: chico ? 6 : 18,
      padding: chico ? '1px 8px' : '6px 13px',
      fontWeight: selected ? 700 : 500,
      boxShadow: selected ? '0 0 0 1.5px var(--qc-text)' : 'none',
    }
    : {
      background: fondo,
      color: '#fff',
      borderRadius: chico ? 5 : 7,
      padding: chico ? '1px 8px' : '5px 12px',
      fontWeight: 600,
      boxShadow: selected ? anillo(fondo) : 'none',
    };

  return (
    <Elemento
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      aria-pressed={onClick ? selected : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        border: 'none',
        fontSize: chico ? 12 : 14,
        lineHeight: chico ? '20px' : '22px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.45 : 1,
        transition: 'opacity .15s, box-shadow .15s',
        whiteSpace: 'nowrap',
        ...estilo,
      }}
    >
      {selected && <CheckOutlined style={{ fontSize: chico ? 10 : 12 }} />}
      {sutil && !selected && !empiezaConEmoji(nombre) && (
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: fondo, flexShrink: 0 }} />
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</span>
    </Elemento>
  );
};

const SelectorColor = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {PALETA_ETIQUETAS.map((color) => (
      <button
        key={color}
        type="button"
        aria-label={`Color ${color}`}
        onClick={() => onChange(color)}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: 'none',
          background: color,
          color: '#fff',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: value === color ? anillo(color) : 'none',
        }}
      >
        {value === color && <CheckOutlined />}
      </button>
    ))}
  </div>
);

// Formulario corto de nombre + color, para crear o editar.
const EditorEtiqueta = ({ inicial, guardando, textoBoton, onGuardar, onCancelar }) => {
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [color, setColor]   = useState(inicial?.color || PALETA_ETIQUETAS[0]);
  const listo = nombre.trim().length > 0;
  const guardar = () => { if (listo) onGuardar({ nombre: nombre.trim(), color }); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <EtiquetaChip nombre={nombre.trim() || 'Vista previa'} color={color} size="sm" dimmed={!listo} />
      </div>
      <Input
        autoFocus
        placeholder="Nombre de la etiqueta"
        value={nombre}
        maxLength={80}
        onChange={(e) => setNombre(e.target.value)}
        onPressEnter={guardar}
      />
      <SelectorColor value={color} onChange={setColor} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {onCancelar && <Button size="small" onClick={onCancelar}>Cancelar</Button>}
        <Button size="small" type="primary" loading={guardando} disabled={!listo} onClick={guardar}>
          {textoBoton}
        </Button>
      </div>
    </div>
  );
};

const ordenar = (lista) => [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/**
 * Chips de todas las etiquetas del negocio + botón "+" para crear, editar y
 * eliminar. Funciona como campo de Form (value = id de la etiqueta elegida):
 * tocar un chip lo elige; tocarlo otra vez lo quita.
 *
 * onCambios: se llama cuando se crea, edita o elimina una etiqueta, para que
 * quien lo use refresque lo que muestra (p. ej. la tabla de gastos).
 */
// `tipo`: 'gasto' (por defecto) o 'ingreso'. Son dos listas separadas.
const EtiquetasSelector = ({ value, onChange, onCambios, sutil = false, tipo = 'gasto' }) => {
  const [etiquetas, setEtiquetas] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [abierto, setAbierto]     = useState(false);
  const [editando, setEditando]   = useState(null); // null | 'nueva' | id
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    getEgresoCategorias({ tipo })
      .then((data) => { if (vigente) setEtiquetas(ordenar(Array.isArray(data) ? data : [])); })
      .catch(() => { /* el campo es opcional: sin etiquetas igual se guarda el gasto */ })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [tipo]);

  const errorDe = (err, porDefecto) => err?.response?.data?.message || porDefecto;

  const crear = async (datos) => {
    setGuardando(true);
    try {
      // Si el nombre ya existía, el backend devuelve esa etiqueta.
      const etiqueta = await createEgresoCategoria({ ...datos, tipo });
      setEtiquetas((prev) => ordenar([...prev.filter((e) => e.id !== etiqueta.id), etiqueta]));
      onChange?.(etiqueta.id); // la recién creada queda elegida
      setEditando(null);
      setAbierto(false);
      onCambios?.();
    } catch (err) {
      message.error(errorDe(err, 'No se pudo crear la etiqueta'));
    } finally {
      setGuardando(false);
    }
  };

  const editar = async (id, datos) => {
    setGuardando(true);
    try {
      const etiqueta = await updateEgresoCategoria(id, datos);
      setEtiquetas((prev) => ordenar(prev.map((e) => (e.id === id ? etiqueta : e))));
      setEditando(null);
      onCambios?.();
    } catch (err) {
      message.error(errorDe(err, 'No se pudo editar la etiqueta'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    try {
      const res = await deleteEgresoCategoria(id);
      setEtiquetas((prev) => prev.filter((e) => e.id !== id));
      if (value === id) onChange?.(null);
      const n = Number(res?.movimientos_sin_etiqueta ?? res?.gastos_sin_etiqueta) || 0;
      const que = tipo === 'ingreso' ? 'ingreso' : 'gasto';
      message.success(n > 0
        ? `Etiqueta eliminada · ${n} ${que}${n === 1 ? '' : 's'} quedó sin etiqueta`
        : 'Etiqueta eliminada');
      onCambios?.();
    } catch (err) {
      message.error(errorDe(err, 'No se pudo eliminar la etiqueta'));
    }
  };

  const hayEtiquetas = etiquetas.length > 0;
  const creando = editando === 'nueva' || !hayEtiquetas;

  const panel = (
    <div style={{ width: 260 }}>
      {creando ? (
        <EditorEtiqueta
          key="nueva"
          // Cada nueva arranca con el siguiente color de la paleta.
          inicial={{ color: PALETA_ETIQUETAS[etiquetas.length % PALETA_ETIQUETAS.length] }}
          guardando={guardando}
          textoBoton="Crear"
          onGuardar={crear}
          onCancelar={hayEtiquetas ? () => setEditando(null) : undefined}
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
            {etiquetas.map((e) => (editando === e.id ? (
              <div key={e.id} style={{ padding: 8, border: '1px solid var(--qc-border)', borderRadius: 8 }}>
                <EditorEtiqueta
                  inicial={e}
                  guardando={guardando}
                  textoBoton="Guardar"
                  onGuardar={(datos) => editar(e.id, datos)}
                  onCancelar={() => setEditando(null)}
                />
              </div>
            ) : (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <EtiquetaChip nombre={e.nombre} color={e.color} size="sm" />
                </div>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  aria-label={`Editar ${e.nombre}`}
                  onClick={() => setEditando(e.id)}
                />
                <Popconfirm
                  title="¿Eliminar esta etiqueta?"
                  description="Los gastos que la tengan quedarán sin etiqueta."
                  okText="Eliminar"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancelar"
                  onConfirm={() => eliminar(e.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Eliminar ${e.nombre}`} />
                </Popconfirm>
              </div>
            )))}
          </div>
          <Button block icon={<PlusOutlined />} onClick={() => setEditando('nueva')}>
            Nueva etiqueta
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {cargando && <Spin size="small" />}

      {etiquetas.map((e) => (
        <EtiquetaChip
          key={e.id}
          nombre={e.nombre}
          color={e.color}
          sutil={sutil}
          selected={value === e.id}
          // Con una elegida, las demás se apagan para que se note cuál es.
          dimmed={value != null && value !== e.id}
          title={value === e.id ? 'Quitar etiqueta' : 'Elegir etiqueta'}
          onClick={() => onChange?.(value === e.id ? null : e.id)}
        />
      ))}

      <Popover
        open={abierto}
        onOpenChange={(abrir) => { setAbierto(abrir); if (!abrir) setEditando(null); }}
        trigger="click"
        placement="bottomLeft"
        title={creando ? 'Nueva etiqueta' : 'Etiquetas'}
        content={panel}
      >
        <Button
          icon={<PlusOutlined />}
          title="Crear, editar o eliminar etiquetas"
          aria-label="Crear, editar o eliminar etiquetas"
          shape={sutil ? 'circle' : undefined}
          style={{ width: 34, height: 34 }}
        />
      </Popover>

      {!cargando && !hayEtiquetas && (
        <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>Crea tu primera etiqueta con +</span>
      )}
    </div>
  );
};

export default EtiquetasSelector;
