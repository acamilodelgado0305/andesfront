// src/components/tareas/TablaTareas.jsx
// Vista Tabla: todas las tarjetas en filas, ordenables por fecha, lista, etc.
// Sirve para un proyecto (con la lista editable en línea) o para todos los
// proyectos (columna Proyecto). En el celular se ve como lista compacta.
import React, { useMemo } from 'react';
import { Table, Select, Empty } from 'antd';
import { RetweetOutlined } from '@ant-design/icons';
import { ChipVence, EtiquetaPill, IconoProyecto, MarcaCompletar, BarraProgreso, InsigniasTarjeta } from './piezasTareas';
import { haceCuanto } from './utilsTareas';
import { describirRepeticion } from './repeticion';

const porVence = (a, b) => {
  if (!a.vence_at && !b.vence_at) return 0;
  if (!a.vence_at) return 1;
  if (!b.vence_at) return -1;
  return new Date(a.vence_at) - new Date(b.vence_at);
};

const FilaMovil = ({ t, etiquetasPorId, tablero, onAbrir, onCompletar }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onAbrir(t.id)}
    onKeyDown={(e) => { if (e.key === 'Enter') onAbrir(t.id); }}
    className="qc-mov-fila"
    style={{ display: 'flex', gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--qc-border)', cursor: 'pointer' }}
  >
    <span style={{ paddingTop: 1 }}><MarcaCompletar hecha={t.completada} onCambiar={(v) => onCompletar(t, v)} size={20} /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 15, fontWeight: 500, color: t.completada ? 'var(--qc-text-muted)' : 'var(--qc-text)',
        textDecoration: t.completada ? 'line-through' : 'none', overflowWrap: 'anywhere',
      }}>
        {t.titulo}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' }}>
        {tablero && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--qc-text-muted)' }}>
            <IconoProyecto tablero={tablero} size={18} /> {tablero.nombre}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{t.lista?.nombre || ''}</span>
        {(t.etiquetas || []).map((id) => etiquetasPorId[id]).filter(Boolean).map((e) => (
          <EtiquetaPill key={e.id} etiqueta={e} style={{ height: 18, fontSize: 11, padding: '0 7px' }} />
        ))}
        <InsigniasTarjeta tarjeta={t} />
      </div>
    </div>
  </div>
);

const TablaTareas = ({
  tarjetas, listas = null, etiquetas = [], tablerosPorId = null, esMovil,
  onAbrir, onCompletar, onMoverLista, vacio = 'No hay tareas con estos filtros',
}) => {
  const etiquetasPorId = useMemo(() => Object.fromEntries(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const listasPorId = useMemo(() => Object.fromEntries((listas || []).map((l, i) => [l.id, { ...l, orden: i }])), [listas]);
  const conLista = useMemo(
    () => tarjetas.map((t) => ({ ...t, lista: t.lista || listasPorId[t.lista_id] })),
    [tarjetas, listasPorId],
  );

  if (!tarjetas.length) return <Empty description={vacio} style={{ padding: 40 }} />;

  if (esMovil) {
    const ordenadas = [...conLista].sort((a, b) => Number(a.completada) - Number(b.completada) || porVence(a, b));
    return (
      <div>
        {ordenadas.map((t) => (
          <FilaMovil key={t.id} t={t} etiquetasPorId={etiquetasPorId} tablero={tablerosPorId?.[t.tablero_id] || t.tablero}
            onAbrir={onAbrir} onCompletar={onCompletar} />
        ))}
      </div>
    );
  }

  const columnas = [
    {
      key: 'check', width: 46,
      render: (_, t) => <MarcaCompletar hecha={t.completada} onCambiar={(v) => onCompletar(t, v)} size={19} />,
    },
    {
      title: 'Tarea', dataIndex: 'titulo', key: 'titulo',
      sorter: (a, b) => a.titulo.localeCompare(b.titulo, 'es'),
      render: (titulo, t) => (
        <div style={{ minWidth: 220 }}>
          <div style={{
            fontWeight: 500, color: t.completada ? 'var(--qc-text-muted)' : 'var(--qc-text)',
            textDecoration: t.completada ? 'line-through' : 'none',
          }}>
            {titulo}
            {t.repeticion && <RetweetOutlined title={describirRepeticion(t.repeticion)} style={{ marginLeft: 8, color: 'var(--qc-text-muted)' }} />}
          </div>
          {t.etiquetas?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {t.etiquetas.map((id) => etiquetasPorId[id]).filter(Boolean).map((e) => (
                <EtiquetaPill key={e.id} etiqueta={e} style={{ height: 18, fontSize: 11, padding: '0 7px' }} />
              ))}
            </div>
          )}
        </div>
      ),
    },
    ...(tablerosPorId ? [{
      title: 'Proyecto', key: 'proyecto', width: 190,
      sorter: (a, b) => (tablerosPorId[a.tablero_id]?.nombre || '').localeCompare(tablerosPorId[b.tablero_id]?.nombre || '', 'es'),
      render: (_, t) => {
        const tb = tablerosPorId[t.tablero_id] || t.tablero;
        return tb ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <IconoProyecto tablero={tb} size={22} /> <span style={{ color: 'var(--qc-text)' }}>{tb.nombre}</span>
          </span>
        ) : null;
      },
    }] : []),
    {
      title: 'Lista', key: 'lista', width: 190,
      sorter: listas ? (a, b) => (a.lista?.orden ?? 0) - (b.lista?.orden ?? 0) || a.posicion - b.posicion : (a, b) => (a.lista?.nombre || '').localeCompare(b.lista?.nombre || '', 'es'),
      render: (_, t) => (listas && onMoverLista ? (
        <Select
          size="small"
          value={t.lista_id}
          onClick={(e) => e.stopPropagation()}
          onChange={(v) => onMoverLista(t.id, v)}
          options={listas.map((l) => ({ value: l.id, label: l.nombre }))}
          style={{ width: 170 }}
          variant="borderless"
          popupMatchSelectWidth={false}
        />
      ) : <span style={{ color: 'var(--qc-text-muted)' }}>{t.lista?.nombre}</span>),
    },
    {
      title: 'Vence', key: 'vence', width: 170, sorter: porVence, defaultSortOrder: tablerosPorId ? 'ascend' : undefined,
      render: (_, t) => <ChipVence tarjeta={t} />,
    },
    {
      title: 'Subtareas', key: 'subtareas', width: 120,
      sorter: (a, b) => (a.subtareas_total ? a.subtareas_hechas / a.subtareas_total : -1) - (b.subtareas_total ? b.subtareas_hechas / b.subtareas_total : -1),
      render: (_, t) => (t.subtareas_total ? (
        <div style={{ width: 90 }}>
          <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginBottom: 3 }}>{t.subtareas_hechas}/{t.subtareas_total}</div>
          <BarraProgreso valor={t.subtareas_hechas} total={t.subtareas_total} alto={5} />
        </div>
      ) : null),
    },
    {
      title: 'Actualizada', dataIndex: 'updated_at', key: 'updated_at', width: 130,
      sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
      render: (v) => <span style={{ color: 'var(--qc-text-muted)', fontSize: 12.5 }}>{haceCuanto(v)}</span>,
    },
  ];

  const datos = listas
    ? [...conLista].sort((a, b) => (a.lista?.orden ?? 0) - (b.lista?.orden ?? 0) || a.posicion - b.posicion)
    : conLista;

  return (
    <Table
      rowKey="id"
      size="middle"
      columns={columnas}
      dataSource={datos}
      pagination={datos.length > 50 ? { pageSize: 50, showSizeChanger: false } : false}
      onRow={(t) => ({ onClick: () => onAbrir(t.id), style: { cursor: 'pointer' } })}
      scroll={{ x: 900 }}
      style={{ background: 'var(--qc-surface)', borderRadius: 12 }}
    />
  );
};

export default TablaTareas;
