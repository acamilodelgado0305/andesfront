// src/components/tareas/TableroVista.jsx
// Un proyecto abierto: encabezado, registro rápido, filtros y las tres vistas
// (Tablero kanban, Tabla y Calendario).
import React, { useMemo, useState } from 'react';
import {
  Button, Segmented, Dropdown, Popover, Input, Switch, Select, Modal, Radio, Badge, Spin, Result, Popconfirm, Drawer, Empty, message,
} from 'antd';
import {
  ArrowLeftOutlined, StarOutlined, StarFilled, MoreOutlined, FilterOutlined, EditOutlined, TagsOutlined,
  InboxOutlined, ProjectOutlined, TableOutlined, CalendarOutlined, UndoOutlined,
} from '@ant-design/icons';
import useTablero from './useTablero';
import Kanban from './Kanban';
import TablaTareas from './TablaTareas';
import CalendarioTareas from './CalendarioTareas';
import TarjetaDetalle from './TarjetaDetalle';
import RegistroTarea from './RegistroTarea';
import ProyectoModal from './ProyectoModal';
import { EtiquetasSelector } from './EditoresTarjeta';
import { EtiquetaPill, IconoProyecto } from './piezasTareas';
import { OPCIONES_FECHA, hayFiltros, pasaFiltros, textoVence, tinte } from './utilsTareas';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';

const VISTA_KEY = 'qc-tareas-vista';
const leerVista = () => {
  try { return localStorage.getItem(VISTA_KEY) || 'tablero'; } catch { return 'tablero'; }
};
const FILTROS_VACIOS = { q: '', etiquetas: [], vence: null, ocultarHechas: false };

const FiltrosContenido = ({ filtros, setFiltros, etiquetas }) => (
  <div style={{ width: 290, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Input.Search placeholder="Buscar en títulos y descripciones" allowClear value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} />
    {etiquetas.length > 0 && (
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginBottom: 6 }}>Etiquetas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {etiquetas.map((e) => (
            <EtiquetaPill
              key={e.id}
              etiqueta={e}
              activa={filtros.etiquetas.includes(e.id)}
              onClick={() => setFiltros((f) => ({
                ...f, etiquetas: f.etiquetas.includes(e.id) ? f.etiquetas.filter((x) => x !== e.id) : [...f.etiquetas, e.id],
              }))}
              style={{ opacity: filtros.etiquetas.length && !filtros.etiquetas.includes(e.id) ? 0.45 : 1 }}
            />
          ))}
        </div>
      </div>
    )}
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginBottom: 6 }}>Fecha</div>
      <Select
        value={filtros.vence || 'todas'}
        onChange={(v) => setFiltros((f) => ({ ...f, vence: v === 'todas' ? null : v }))}
        style={{ width: '100%' }}
        options={OPCIONES_FECHA}
      />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Switch size="small" checked={filtros.ocultarHechas} onChange={(v) => setFiltros((f) => ({ ...f, ocultarHechas: v }))} />
      <span style={{ color: 'var(--qc-text)' }}>Ocultar completadas</span>
    </div>
    {hayFiltros(filtros) && <Button onClick={() => setFiltros(FILTROS_VACIOS)}>Quitar filtros</Button>}
  </div>
);

const TableroVista = ({ tableroId, tableros, esMovil, tarjetaAbierta, abrirTarjeta, cerrarTarjeta, onVolver, onTablerosCambio }) => {
  const tb = useTablero(tableroId, {
    onTarjetaNueva: (t) => message.success(`🔁 Siguiente: ${textoVence(t, { largo: true })}`),
  });
  const [vista, setVistaEstado] = useState(leerVista);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [editarProyecto, setEditarProyecto] = useState(false);
  const [verEtiquetas, setVerEtiquetas] = useState(false);
  const [listaABorrar, setListaABorrar] = useState(null);
  const [destinoBorrado, setDestinoBorrado] = useState('mover');
  const [listaDestino, setListaDestino] = useState(null);
  const [archivadas, setArchivadas] = useState(null);
  const [crearEnDia, setCrearEnDia] = useState(null);
  const [listaRapida, setListaRapida] = useState(null);

  const setVista = (v) => { setVistaEstado(v); try { localStorage.setItem(VISTA_KEY, v); } catch { /* sin almacenamiento */ } };
  const datos = tb.datos;
  const visibles = useMemo(() => (datos ? datos.tarjetas.filter((t) => pasaFiltros(t, filtros)) : []), [datos, filtros]);

  if (tb.error) {
    return <Result status="404" title="No se pudo abrir el proyecto" subTitle={tb.error} extra={<Button onClick={onVolver}>Volver a Tareas</Button>} />;
  }
  if (!datos) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>;

  const { tablero, listas, etiquetas } = datos;
  const primeraLista = listas.find((l) => !l.es_final) || listas[0];
  const listaParaRapida = listas.find((l) => l.id === listaRapida) || primeraLista;
  const contexto = { tableroId: tablero.id, listas, etiquetas, setEtiquetas: tb.setEtiquetas };
  const nFiltros = (filtros.q ? 1 : 0) + filtros.etiquetas.length + (filtros.vence ? 1 : 0) + (filtros.ocultarHechas ? 1 : 0);

  const completar = (t, hecha) => tb.actualizarTarjeta(t.id, { completada: hecha });

  const crearRapida = async (body) => {
    if (!listaParaRapida) { message.warning('Primero crea una lista'); return null; }
    return tb.crearTarjeta(listaParaRapida.id, body);
  };

  const confirmarBorrarLista = async () => {
    const lista = listaABorrar;
    const conTarjetas = datos.tarjetas.some((t) => t.lista_id === lista.id);
    const destino = conTarjetas && destinoBorrado === 'mover' ? (listaDestino || listas.find((l) => l.id !== lista.id)?.id) : null;
    const ok = await tb.eliminarLista(lista.id, destino);
    if (ok) { setListaABorrar(null); message.success('Lista eliminada'); }
  };

  const abrirArchivadas = async () => {
    setArchivadas([]);
    try {
      const d = await api.getTablero(tablero.id, true);
      setArchivadas(d.tarjetas);
    } catch (e) { message.error(mensajeError(e, 'No se pudieron cargar')); setArchivadas(null); }
  };

  const restaurar = async (t) => {
    const resp = await tb.actualizarTarjeta(t.id, { archivada: false });
    if (resp) setArchivadas((xs) => xs.filter((x) => x.id !== t.id));
  };

  const archivarProyecto = async () => {
    const t = await tb.actualizarTablero({ archivado: true });
    if (t) { message.success('Proyecto archivado'); onTablerosCambio?.(); onVolver(); }
  };

  const menu = {
    items: [
      { key: 'editar', icon: <EditOutlined />, label: 'Editar proyecto' },
      { key: 'etiquetas', icon: <TagsOutlined />, label: 'Etiquetas del proyecto' },
      { key: 'archivadas', icon: <InboxOutlined />, label: 'Tarjetas archivadas' },
      { type: 'divider' },
      { key: 'archivar', icon: <InboxOutlined />, label: 'Archivar proyecto', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'editar') setEditarProyecto(true);
      if (key === 'etiquetas') setVerEtiquetas(true);
      if (key === 'archivadas') abrirArchivadas();
      if (key === 'archivar') {
        Modal.confirm({
          title: `¿Archivar ${tablero.nombre}?`,
          content: 'Sale de tu lista de proyectos con todas sus tarjetas. Lo puedes restaurar desde "Proyectos archivados".',
          okText: 'Archivar', cancelText: 'Cancelar', onOk: archivarProyecto,
        });
      }
    },
  };

  const vistas = [
    { value: 'tablero', icon: <ProjectOutlined />, label: esMovil ? undefined : 'Tablero' },
    { value: 'tabla', icon: <TableOutlined />, label: esMovil ? undefined : 'Tabla' },
    { value: 'calendario', icon: <CalendarOutlined />, label: esMovil ? undefined : 'Calendario' },
  ];

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Button type="text" shape="circle" icon={<ArrowLeftOutlined />} onClick={onVolver} aria-label="Volver a Tareas" />
        <IconoProyecto tablero={tablero} size={esMovil ? 34 : 40} />
        <div style={{ minWidth: 0, flex: esMovil ? 1 : '0 1 auto' }}>
          <h1
            onClick={() => setEditarProyecto(true)}
            style={{ margin: 0, fontSize: esMovil ? 19 : 22, fontWeight: 800, color: 'var(--qc-text)', letterSpacing: -0.3, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {tablero.nombre}
          </h1>
          {tablero.descripcion && !esMovil && <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{tablero.descripcion}</div>}
        </div>
        <Button
          type="text"
          shape="circle"
          onClick={() => { tb.actualizarTablero({ favorito: !tablero.favorito }); onTablerosCambio?.(); }}
          icon={tablero.favorito ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarOutlined />}
          aria-label={tablero.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
        />
        {!esMovil && <div style={{ flex: 1 }} />}
        {/* En el celular, las vistas y los filtros van en su propia fila */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...(esMovil ? { width: '100%' } : {}) }}>
          <Segmented value={vista} onChange={setVista} options={vistas} />
          {esMovil && <div style={{ flex: 1 }} />}
          <Popover trigger="click" placement="bottomRight" content={<FiltrosContenido filtros={filtros} setFiltros={setFiltros} etiquetas={etiquetas} />}>
            <Badge count={nFiltros} size="small">
              <Button icon={<FilterOutlined />}>{esMovil ? null : 'Filtrar'}</Button>
            </Badge>
          </Popover>
          <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
            <Button icon={<MoreOutlined />} aria-label="Más opciones del proyecto" />
          </Dropdown>
        </div>
      </div>

      {/* Registro rápido */}
      {(vista !== 'tablero' || !esMovil) && (
        <div style={{ marginBottom: 16, maxWidth: 900 }}>
          <RegistroTarea
            etiquetas={etiquetas}
            onCrear={crearRapida}
            extra={listas.length > 1 ? (
              <Select
                value={listaParaRapida?.id}
                onChange={setListaRapida}
                options={listas.map((l) => ({ value: l.id, label: l.nombre }))}
                style={{ width: esMovil ? 130 : 170 }}
                popupMatchSelectWidth={false}
              />
            ) : null}
          />
        </div>
      )}

      {hayFiltros(filtros) && (
        <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginBottom: 10 }}>
          Mostrando {visibles.length} de {datos.tarjetas.length} tarjetas ·{' '}
          <button type="button" onClick={() => setFiltros(FILTROS_VACIOS)} style={{ border: 'none', background: 'none', color: 'var(--qc-azul)', cursor: 'pointer', padding: 0 }}>quitar filtros</button>
        </div>
      )}

      {vista === 'tablero' && (
        <Kanban
          listas={listas}
          tarjetas={visibles}
          etiquetas={etiquetas}
          esMovil={esMovil}
          onAbrir={abrirTarjeta}
          onCompletar={completar}
          onMoverTarjeta={tb.moverTarjeta}
          onMoverLista={tb.moverLista}
          onCrearTarjeta={tb.crearTarjeta}
          onCrearLista={tb.crearLista}
          onRenombrarLista={(id, nombre) => tb.actualizarLista(id, { nombre })}
          onFinalLista={(id, esFinal) => tb.actualizarLista(id, { es_final: esFinal })}
          onEliminarLista={(l) => { setListaABorrar(l); setDestinoBorrado('mover'); setListaDestino(listas.find((x) => x.id !== l.id)?.id || null); }}
        />
      )}
      {vista === 'tabla' && (
        <TablaTareas
          tarjetas={visibles}
          listas={listas}
          etiquetas={etiquetas}
          esMovil={esMovil}
          onAbrir={abrirTarjeta}
          onCompletar={completar}
          onMoverLista={(id, listaId) => tb.moverTarjeta(id, listaId, null)}
        />
      )}
      {vista === 'calendario' && (
        <CalendarioTareas
          tarjetas={visibles}
          etiquetas={etiquetas}
          colorProyecto={tablero.color}
          esMovil={esMovil}
          onAbrir={abrirTarjeta}
          onCompletar={completar}
          onReprogramar={(t, cambios) => tb.actualizarTarjeta(t.id, cambios || { vence_at: null })}
          onCrearEnDia={setCrearEnDia}
        />
      )}

      {/* Detalle */}
      <TarjetaDetalle
        tarjetaId={tarjetaAbierta}
        onCerrar={cerrarTarjeta}
        esMovil={esMovil}
        tableros={tableros}
        contexto={contexto}
        onCambio={tb.ponerTarjeta}
        onEliminada={tb.quitarTarjeta}
        onNueva={tb.ponerTarjeta}
      />

      <ProyectoModal
        abierto={editarProyecto}
        proyecto={tablero}
        onCerrar={() => setEditarProyecto(false)}
        onGuardar={async (cambios) => { const t = await tb.actualizarTablero(cambios); onTablerosCambio?.(); return !!t; }}
      />

      <Modal open={verEtiquetas} onCancel={() => setVerEtiquetas(false)} footer={null} title="Etiquetas del proyecto" width={340} destroyOnClose>
        <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginBottom: 10 }}>
          Úsalas para marcar prioridad (Urgente, Alta, Leve) o temas (Universidad de Pamplona, Maestría…). Toca el lápiz para editar.
        </div>
        <EtiquetasSelector
          tableroId={tablero.id}
          etiquetas={etiquetas}
          seleccion={[]}
          onCambiarSeleccion={() => {}}
          onEtiquetasProyecto={(fn) => { tb.setEtiquetas(fn); }}
        />
      </Modal>

      <Modal
        open={!!listaABorrar}
        onCancel={() => setListaABorrar(null)}
        onOk={confirmarBorrarLista}
        okText="Eliminar lista"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        title={listaABorrar ? `Eliminar "${listaABorrar.nombre}"` : ''}
        destroyOnClose
      >
        {listaABorrar && (() => {
          const n = datos.tarjetas.filter((t) => t.lista_id === listaABorrar.id).length;
          const otras = listas.filter((l) => l.id !== listaABorrar.id);
          if (!n) return <div>La lista está vacía.</div>;
          return (
            <Radio.Group value={destinoBorrado} onChange={(e) => setDestinoBorrado(e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {otras.length > 0 && (
                <Radio value="mover">
                  Mover sus {n} tarjeta{n === 1 ? '' : 's'} a{' '}
                  <Select size="small" value={listaDestino} onChange={setListaDestino} options={otras.map((l) => ({ value: l.id, label: l.nombre }))} style={{ minWidth: 150 }} />
                </Radio>
              )}
              <Radio value="borrar">Eliminar también sus {n} tarjeta{n === 1 ? '' : 's'}</Radio>
            </Radio.Group>
          );
        })()}
      </Modal>

      <Modal open={!!crearEnDia} onCancel={() => setCrearEnDia(null)} footer={null} title="Nueva tarea" destroyOnClose>
        <RegistroTarea
          autoFocus
          compacto
          etiquetas={etiquetas}
          placeholder="Título (ej: Parcial de estadística 8am)"
          onCrear={async (body) => {
            const t = await crearRapida(body.vence_at ? body : { ...body, vence_at: crearEnDia, vence_con_hora: false });
            if (t) setCrearEnDia(null);
            return t;
          }}
          onCerrar={() => setCrearEnDia(null)}
        />
      </Modal>

      <Drawer open={archivadas !== null} onClose={() => setArchivadas(null)} title="Tarjetas archivadas" width={esMovil ? '100%' : 420}>
        {archivadas?.length ? archivadas.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--qc-border)' }}>
            <button type="button" onClick={() => abrirTarjeta(t.id)} style={{ flex: 1, textAlign: 'left', border: 'none', background: 'none', color: 'var(--qc-text)', cursor: 'pointer', fontSize: 14 }}>
              {t.titulo}
            </button>
            <Popconfirm title="¿Restaurar la tarjeta?" okText="Restaurar" cancelText="No" onConfirm={() => restaurar(t)}>
              <Button size="small" icon={<UndoOutlined />}>Restaurar</Button>
            </Popconfirm>
          </div>
        )) : <Empty description="No hay tarjetas archivadas" />}
      </Drawer>

      {/* Fondo del proyecto: un tinte de su color sobre el fondo de la app */}
      <style>{`.qc-tablero-fondo{background:linear-gradient(180deg, ${tinte(tablero.color, 0.13)} 0, ${tinte(tablero.color, 0.04)} 420px), var(--qc-bg)}`}</style>
    </div>
  );
};

export default TableroVista;
