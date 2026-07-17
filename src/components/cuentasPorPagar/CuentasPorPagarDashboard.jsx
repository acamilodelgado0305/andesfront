import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Modal,
  message, Input, Space, Card, Statistic,
  Dropdown, Select, InputNumber, Progress, Switch, Tooltip as AntTooltip,
} from 'antd';
import {
  PlusOutlined, FileProtectOutlined,
  EditOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined, MoreOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, WalletOutlined, BankOutlined, UnorderedListOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useCurrency from '../../hooks/useCurrency';
import {
  getCuentasPorPagar,
  getEstadisticasCuentasPorPagar,
  deleteCuentaPorPagar,
  updateCuentaPorPagar,
  registrarAbono,
  aumentarDeuda,
} from '../../services/cuentaPorPagar/cuentaPorPagarService';
import CuentaPorPagarForm from './CuentaPorPagarForm';
import CronogramaModal from './CronogramaModal';

const { Content } = Layout;
const { Title, Text } = Typography;

const ACCENT = '#262626'; // near-black: botones, iconos, énfasis neutro
const DANGER = '#dc2626'; // rojo: saldo/deuda, aumentos, vencidos
const MUTED  = '#8c8c8c'; // gris: barras de progreso e iconos secundarios

const ESTADO_COLOR = {
  PENDIENTE: 'default',
  ABONO:     'default',
  PAGADA:    'default',
  ANULADA:   'red',
};

const ESTADO_ICON = {
  PENDIENTE: <ClockCircleOutlined />,
  ABONO:     <WalletOutlined />,
  PAGADA:    <CheckCircleOutlined />,
  ANULADA:   <CloseCircleOutlined />,
};

const ESTADOS = ['PENDIENTE', 'PAGADA', 'ANULADA'];
const CUENTAS = ['Efectivo', 'Nequi', 'Daviplata', 'Bancolombia', 'Transferencia', 'Otra'];

const parseArr = (raw) =>
  Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Reconstruye el estado de cuenta (movimientos con saldo corrido) de una cuenta.
// El saldo final coincide con total − total_abonado.
const buildMovimientos = (rec) => {
  const total      = Number(rec.total || 0);
  const abonos     = parseArr(rec.abonos);
  const cargos     = parseArr(rec.cargos);
  const cuotas     = parseArr(rec.cuotas);
  const esPrestamo = !!rec.es_prestamo;
  const sumCargos  = cargos.reduce((s, c) => s + Number(c.monto || 0), 0);

  const eventos = [];

  // Deuda / préstamo inicial (base antes de aumentos)
  eventos.push({
    key:      'inicial',
    fecha:    rec.fecha_emision || rec.created_at,
    tipo:     'inicial',
    concepto: esPrestamo ? 'Préstamo inicial' : 'Deuda inicial',
    detalle:  null,
    monto:    esPrestamo ? total : round2(total - sumCargos),
  });

  // Aumentos de deuda
  cargos.forEach((c, i) => eventos.push({
    key:      c.id || `cargo-${i}`,
    fecha:    c.fecha,
    tipo:     'aumento',
    concepto: 'Aumento de deuda',
    detalle:  c.nota || null,
    monto:    Number(c.monto || 0),
  }));

  if (esPrestamo) {
    // Cuotas pagadas del préstamo
    cuotas
      .filter((c) => c.estado === 'PAGADA')
      .forEach((c) => eventos.push({
        key:      `cuota-${c.numero}`,
        fecha:    c.fecha_pago,
        tipo:     'cuota',
        concepto: `Cuota #${c.numero}`,
        detalle:  c.cuenta || null,
        monto:    -Number(c.valor || 0),
      }));
  } else {
    // Abonos
    abonos.forEach((a, i) => eventos.push({
      key:      a.id || `abono-${i}`,
      fecha:    a.fecha,
      tipo:     'abono',
      concepto: 'Abono',
      detalle:  [a.cuenta, a.nota].filter(Boolean).join(' · ') || null,
      monto:    -Number(a.monto || 0),
    }));
  }

  // Orden cronológico (el inicial siempre primero)
  eventos.sort((a, b) => {
    if (a.tipo === 'inicial') return -1;
    if (b.tipo === 'inicial') return 1;
    return dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf();
  });

  // Saldo corrido
  let saldo = 0;
  for (const e of eventos) { saldo = round2(saldo + e.monto); e.saldo = saldo; }
  return eventos;
};


const CuentasPorPagarDashboard = () => {
  const formatCurrency = useCurrency();

  const [docs, setDocs]       = useState([]);
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verPagadas, setVerPagadas] = useState(false); // las pagadas se archivan (ocultas por defecto)

  const [formOpen, setFormOpen]     = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [cronogramaId, setCronogramaId] = useState(null);
  const cronogramaDoc = docs.find((d) => d.id === cronogramaId) || null;

  const [abonoModal, setAbonoModal]         = useState({ open: false, doc: null });
  const [abonoMonto, setAbonoMonto]         = useState(null);
  const [abonoCuenta, setAbonoCuenta]       = useState('Efectivo');
  const [abonoNota, setAbonoNota]           = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  const [aumentarModal, setAumentarModal]       = useState({ open: false, doc: null });
  const [aumentarMonto, setAumentarMonto]       = useState(null);
  const [aumentarNota, setAumentarNota]         = useState('');
  const [guardandoAumento, setGuardandoAumento] = useState(false);

  // ─── Carga ────────────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (busqueda) params.q = busqueda;
      const [docsData, statsData] = await Promise.all([
        getCuentasPorPagar(params),
        getEstadisticasCuentasPorPagar(),
      ]);
      setDocs(docsData);
      setStats(statsData);
    } catch {
      message.error('Error al cargar cuentas por pagar');
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const calcStat = (estado) =>
    stats
      .filter((s) => (!estado || s.estado === estado))
      .reduce(
        (acc, s) => ({
          qty:   acc.qty   + Number(s.cantidad),
          sum:   acc.sum   + Number(s.total_suma),
          saldo: acc.saldo + Number(s.saldo_suma),
        }),
        { qty: 0, sum: 0, saldo: 0 },
      );

  const pendientes = calcStat('PENDIENTE');
  const abonadas   = calcStat('ABONO');
  const pagadas    = calcStat('PAGADA');
  // Total a pagar = saldo pendiente de las cuentas no pagadas/no anuladas
  const porPagar   = {
    qty:   pendientes.qty + abonadas.qty,
    saldo: pendientes.saldo + abonadas.saldo,
  };

  // Las cuentas pagadas se archivan: no se muestran salvo que se active "Ver pagadas"
  const docsVisibles = verPagadas ? docs : docs.filter((d) => d.estado !== 'PAGADA');
  const pagadasOcultas = docs.length - docsVisibles.length;

  // ─── Eliminar ─────────────────────────────────────────────────────────────────
  const handleEliminar = (doc) => {
    Modal.confirm({
      title: `¿Eliminar "${doc.titulo}"?`,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar', okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteCuentaPorPagar(doc.id);
          message.success('Cuenta por pagar eliminada');
          cargarDatos();
        } catch { message.error('Error al eliminar'); }
      },
    });
  };

  // ─── Cambiar estado ───────────────────────────────────────────────────────────
  const handleCambiarEstado = (doc, nuevoEstado) => {
    Modal.confirm({
      title: `Cambiar estado a ${nuevoEstado}`,
      content: `La cuenta "${doc.titulo}" pasará a estado ${nuevoEstado}.`,
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateCuentaPorPagar(doc.id, { estado: nuevoEstado });
          message.success(`Estado actualizado a ${nuevoEstado}`);
          cargarDatos();
        } catch { message.error('Error al cambiar estado'); }
      },
    });
  };

  const confirmarAbono = async () => {
    const doc = abonoModal.doc;
    if (!doc || !abonoMonto) return;
    setGuardandoAbono(true);
    try {
      await registrarAbono(doc.id, { monto: abonoMonto, cuenta: abonoCuenta, nota: abonoNota });
      message.success('Abono registrado correctamente');
      setAbonoModal({ open: false, doc: null });
      setAbonoMonto(null);
      setAbonoCuenta('Efectivo');
      setAbonoNota('');
      cargarDatos();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Error al registrar abono');
    } finally {
      setGuardandoAbono(false);
    }
  };

  const confirmarAumento = async () => {
    const doc = aumentarModal.doc;
    if (!doc || !aumentarMonto) return;
    setGuardandoAumento(true);
    try {
      await aumentarDeuda(doc.id, { monto: aumentarMonto, nota: aumentarNota });
      message.success('Deuda aumentada correctamente');
      setAumentarModal({ open: false, doc: null });
      setAumentarMonto(null);
      setAumentarNota('');
      cargarDatos();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Error al aumentar la deuda');
    } finally {
      setGuardandoAumento(false);
    }
  };

  const abrirAumentar = (doc) => {
    setAumentarMonto(null);
    setAumentarNota('');
    setAumentarModal({ open: true, doc });
  };

  // ─── Fila expandible: estado de cuenta / movimientos ──────────────────────────
  const expandedRowRender = (rec) => {
    const total   = Number(rec.total || 0);
    const abonado = Number(rec.total_abonado || 0);
    const saldo   = Math.max(0, total - abonado);
    const pct     = total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 0;
    const cuotas        = parseArr(rec.cuotas);
    const cuotasPagadas = cuotas.filter((c) => c.estado === 'PAGADA').length;
    const movimientos   = buildMovimientos(rec);

    const movColumns = [
      {
        title: 'Fecha',
        dataIndex: 'fecha',
        key: 'fecha',
        width: 108,
        render: (f) => <Text style={{ fontSize: 12 }}>{f ? dayjs(f).format('DD/MM/YYYY') : '—'}</Text>,
      },
      {
        title: 'Concepto',
        dataIndex: 'concepto',
        key: 'concepto',
        render: (c, r) => (
          <div>
            <Space size={6}>
              <Tag
                color={r.tipo === 'aumento' ? 'red' : 'default'}
                style={{ fontSize: 10, marginInlineEnd: 0 }}
              >
                {r.tipo === 'inicial' ? 'Inicial' : (r.tipo === 'aumento' ? 'Aumento' : (r.tipo === 'cuota' ? 'Cuota' : 'Abono'))}
              </Tag>
              <Text style={{ fontSize: 12, fontWeight: 600 }}>{c}</Text>
            </Space>
            {r.detalle && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.detalle}</div>}
          </div>
        ),
      },
      {
        title: 'Movimiento',
        dataIndex: 'monto',
        key: 'monto',
        align: 'right',
        width: 130,
        render: (m, r) => {
          const abona = r.tipo === 'abono' || r.tipo === 'cuota';
          return (
            <Text strong style={{ fontSize: 12, color: abona ? '#595959' : DANGER }}>
              {abona ? '−' : '+'}{formatCurrency(Math.abs(m))}
            </Text>
          );
        },
      },
      {
        title: 'Saldo',
        dataIndex: 'saldo',
        key: 'saldo',
        align: 'right',
        width: 120,
        render: (s) => <Text style={{ fontSize: 12 }}>{formatCurrency(s)}</Text>,
      },
    ];

    return (
      <div style={{ padding: '2px 4px 8px' }}>
        {/* Detalle de movimientos (líneas de la "factura") */}
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
          Movimientos ({movimientos.length})
        </Text>
        <Table
          columns={movColumns}
          dataSource={movimientos}
          rowKey="key"
          size="small"
          pagination={false}
          scroll={{ x: 460 }}
        />

        {/* Totales alineados a la derecha, estilo factura */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ width: 260, maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13 }}>
              <Text type="secondary">Total</Text>
              <Text strong>{formatCurrency(total)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13 }}>
              <Text type="secondary">{rec.es_prestamo ? 'Pagado' : 'Abonado'}</Text>
              <Text style={{ color: '#595959' }}>−{formatCurrency(abonado)}</Text>
            </div>
            {rec.es_prestamo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13 }}>
                <Text type="secondary">Cuotas pagadas</Text>
                <Text>{cuotasPagadas} / {cuotas.length}</Text>
              </div>
            )}
            <div style={{ borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0', fontSize: 15, fontWeight: 700 }}>
              <span>Saldo</span>
              <span style={{ color: DANGER }}>{formatCurrency(saldo)}</span>
            </div>
            <Progress percent={pct} size="small" strokeColor={MUTED} showInfo={false} style={{ marginTop: 4, marginBottom: 0 }} />
            {rec.es_prestamo && (
              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <Button size="small" icon={<UnorderedListOutlined />} onClick={() => setCronogramaId(rec.id)}>
                  Ver cronograma
                </Button>
              </div>
            )}
          </div>
        </div>

        {rec.notas && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <Text type="secondary">Notas: </Text>
            <Text style={{ fontSize: 12 }}>{rec.notas}</Text>
          </div>
        )}
      </div>
    );
  };

  // ─── Columnas ─────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Título',
      dataIndex: 'titulo',
      key: 'titulo',
      sorter: (a, b) => (a.titulo || '').localeCompare(b.titulo || ''),
      render: (titulo, rec) => (
        <Space>
          {rec.es_prestamo
            ? <BankOutlined style={{ color: ACCENT }} />
            : <FileProtectOutlined style={{ color: ACCENT }} />}
          <Text strong style={{ fontSize: 13 }}>{titulo || '—'}</Text>
          {rec.es_prestamo && (
            <Tag style={{ fontSize: 10, marginInlineStart: 2 }}>
              Préstamo{rec.num_cuotas ? ` · ${rec.num_cuotas} cuotas` : ''}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Proveedor',
      key: 'proveedor',
      sorter: (a, b) =>
        (a.persona_nombre || a.proveedor_nombre || '').localeCompare(b.persona_nombre || b.proveedor_nombre || ''),
      render: (_, rec) => (
        <Text>{rec.persona_nombre || rec.proveedor_nombre || <Text type="secondary">Sin contacto</Text>}</Text>
      ),
    },
    {
      title: 'Vencimiento',
      dataIndex: 'fecha_vencimiento',
      key: 'fecha_vencimiento',
      sorter: (a, b) => {
        const va = a.fecha_vencimiento ? dayjs(a.fecha_vencimiento).valueOf() : 0;
        const vb = b.fecha_vencimiento ? dayjs(b.fecha_vencimiento).valueOf() : 0;
        return va - vb;
      },
      render: (d, rec) => {
        if (!d) return <Text type="secondary">—</Text>;
        const vencido = dayjs(d).isBefore(dayjs(), 'day') && !['PAGADA', 'ANULADA'].includes(rec.estado);
        return <Text type={vencido ? 'danger' : undefined}>{dayjs(d).format('DD/MM/YYYY')}</Text>;
      },
    },
    {
      title: 'Saldo',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      // Ordena por saldo pendiente (lo que realmente falta por pagar)
      sorter: (a, b) =>
        (Number(a.total || 0) - Number(a.total_abonado || 0)) -
        (Number(b.total || 0) - Number(b.total_abonado || 0)),
      render: (t, rec) => {
        const total   = Number(t || 0);
        const abonado = Number(rec.total_abonado || 0);
        const saldo   = Math.max(0, total - abonado);
        const cargos  = parseArr(rec.cargos);

        // Pagada: saldo en 0, se muestra cuánto se pagó en total
        if (rec.estado === 'PAGADA') {
          return (
            <AntTooltip title={`Total pagado: ${formatCurrency(total)}`}>
              <div style={{ minWidth: 110 }}>
                <Text strong style={{ fontSize: 13, color: MUTED }}>{formatCurrency(0)}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>Pagado {formatCurrency(total)}</Text></div>
              </div>
            </AntTooltip>
          );
        }

        // Con abonos o con aumentos: saldo (que va cambiando) + referencia del total
        if (abonado > 0 || cargos.length > 0) {
          const pct = total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 0;
          return (
            <AntTooltip title={`Total: ${formatCurrency(total)} · Abonado: ${formatCurrency(abonado)} · Saldo: ${formatCurrency(saldo)}`}>
              <div style={{ minWidth: 110 }}>
                <Text strong style={{ fontSize: 13, color: DANGER }}>{formatCurrency(saldo)}</Text>
                <Progress percent={pct} size="small" showInfo={false} strokeColor={MUTED} style={{ marginBottom: 0 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  de {formatCurrency(total)}
                  {cargos.length > 0 && (
                    <span style={{ color: DANGER }}> · +{cargos.length} aumento{cargos.length > 1 ? 's' : ''}</span>
                  )}
                </Text>
              </div>
            </AntTooltip>
          );
        }

        // Sin movimientos: el saldo es igual al total
        return <Text strong>{formatCurrency(saldo)}</Text>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      sorter: (a, b) => (a.estado || '').localeCompare(b.estado || ''),
      render: (estado, rec) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: ESTADOS.map((e) => ({
              key: e,
              label: e,
              disabled: e === estado,
              onClick: () => handleCambiarEstado(rec, e),
            })),
          }}
        >
          <Tag icon={ESTADO_ICON[estado]} color={ESTADO_COLOR[estado] || 'default'} style={{ cursor: 'pointer' }}>
            {estado}
          </Tag>
        </Dropdown>
      ),
    },
    {
      title: '',
      key: 'acciones',
      align: 'center',
      width: 48,
      render: (_, rec) => {
        const items = [];
        if (rec.es_prestamo) {
          items.push({
            key: 'cronograma',
            icon: <UnorderedListOutlined />,
            label: 'Ver cuotas / cronograma',
            onClick: () => setCronogramaId(rec.id),
          });
        }
        items.push({
          key: 'editar',
          icon: <EditOutlined />,
          label: 'Editar',
          disabled: ['PAGADA', 'ANULADA'].includes(rec.estado),
          onClick: () => { setEditingDoc(rec); setFormOpen(true); },
        });
        if (!rec.es_prestamo) {
          items.push({
            key: 'abono',
            icon: <WalletOutlined />,
            label: 'Registrar abono',
            disabled: ['PAGADA', 'ANULADA'].includes(rec.estado),
            onClick: () => { setAbonoMonto(null); setAbonoCuenta('Efectivo'); setAbonoNota(''); setAbonoModal({ open: true, doc: rec }); },
          });
          items.push({
            key: 'aumentar',
            icon: <PlusCircleOutlined />,
            label: 'Aumentar deuda',
            disabled: rec.estado === 'ANULADA',
            onClick: () => abrirAumentar(rec),
          });
        }
        items.push({ type: 'divider' });
        items.push({
          key: 'eliminar',
          icon: <DeleteOutlined />,
          label: 'Eliminar',
          danger: true,
          onClick: () => handleEliminar(rec),
        });
        return (
          <Dropdown trigger={['click']} menu={{ items }}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Content style={{ padding: '16px 20px' }}>

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <Title level={3} style={{ margin: 0 }}>Cuentas por Pagar</Title>
          <Text type="secondary">Controla tus obligaciones y pagos a proveedores</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingDoc(null); setFormOpen(true); }}
          style={{ background: ACCENT, borderColor: ACCENT }}
        >
          Nueva cuenta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Total a pagar"
            value={porPagar.saldo}
            formatter={(v) => formatCurrency(v)}
            prefix={<DollarOutlined style={{ color: MUTED }} />}
            valueStyle={{ color: DANGER, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{porPagar.qty} cuentas pendientes</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Pendientes"
            value={pendientes.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<ClockCircleOutlined style={{ color: MUTED }} />}
            valueStyle={{ color: ACCENT, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{pendientes.qty} cuentas</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Con abonos"
            value={abonadas.saldo}
            formatter={(v) => formatCurrency(v)}
            prefix={<WalletOutlined style={{ color: MUTED }} />}
            valueStyle={{ color: ACCENT, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{abonadas.qty} · saldo restante</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Pagadas"
            value={pagadas.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<CheckCircleOutlined style={{ color: MUTED }} />}
            valueStyle={{ color: ACCENT, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{pagadas.qty} cuentas</Text>
        </Card>
      </div>

      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder="Buscar por título o proveedor..."
          prefix={<SearchOutlined />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Button icon={<ReloadOutlined />} onClick={cargarDatos} loading={loading} />
        <Space size={6}>
          <Switch size="small" checked={verPagadas} onChange={setVerPagadas} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Ver pagadas{!verPagadas && pagadasOcultas > 0 ? ` (${pagadasOcultas})` : ''}
          </Text>
        </Space>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        dataSource={docsVisibles}
        rowKey="id"
        loading={loading}
        size="small"
        expandable={{
          expandedRowRender,
          rowExpandable: () => true,
          columnWidth: 40,
        }}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} cuentas` }}
        scroll={{ x: 720 }}
      />

      {/* Drawer creación/edición */}
      <CuentaPorPagarForm
        open={formOpen}
        editingDoc={editingDoc}
        onClose={() => { setFormOpen(false); setEditingDoc(null); }}
        onSaved={cargarDatos}
      />

      {/* Modal cronograma de cuotas (préstamos) */}
      <CronogramaModal
        open={!!cronogramaId}
        doc={cronogramaDoc}
        onClose={() => setCronogramaId(null)}
        onChanged={cargarDatos}
      />

      {/* Modal abono */}
      <Modal
        open={abonoModal.open}
        title={
          <Space>
            <WalletOutlined style={{ color: ACCENT }} />
            <span>Registrar abono</span>
          </Space>
        }
        okText="Confirmar abono"
        cancelText="Cancelar"
        onCancel={() => setAbonoModal({ open: false, doc: null })}
        onOk={confirmarAbono}
        confirmLoading={guardandoAbono}
        okButtonProps={{ disabled: !abonoMonto || abonoMonto <= 0 }}
        width={400}
      >
        {abonoModal.doc && (() => {
          const total   = Number(abonoModal.doc.total || 0);
          const abonado = Number(abonoModal.doc.total_abonado || 0);
          const saldo   = total - abonado;
          const abonos  = Array.isArray(abonoModal.doc.abonos)
            ? abonoModal.doc.abonos
            : (typeof abonoModal.doc.abonos === 'string' ? JSON.parse(abonoModal.doc.abonos || '[]') : []);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <Text type="secondary">Cuenta</Text>
                  <Text strong>{abonoModal.doc.titulo}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <Text type="secondary">Total</Text>
                  <Text strong>{formatCurrency(total)}</Text>
                </div>
                {abonado > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <Text type="secondary">Ya abonado</Text>
                    <Text style={{ color: '#595959' }}>{formatCurrency(abonado)}</Text>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Saldo pendiente</span>
                  <span style={{ color: DANGER }}>{formatCurrency(saldo)}</span>
                </div>
                {abonado > 0 && (
                  <Progress
                    percent={Math.min(100, Math.round((abonado / total) * 100))}
                    size="small" strokeColor={MUTED} style={{ marginTop: 8, marginBottom: 0 }}
                  />
                )}
              </div>

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Monto del abono <span style={{ color: '#ef4444' }}>*</span>
                </Text>
                <InputNumber
                  style={{ width: '100%' }} size="large" min={1} max={saldo}
                  value={abonoMonto}
                  onChange={setAbonoMonto}
                  formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  placeholder="Monto a abonar"
                  addonAfter={
                    <span
                      style={{ cursor: 'pointer', color: ACCENT, fontSize: 11, fontWeight: 600 }}
                      onClick={() => setAbonoMonto(saldo)}
                    >Pagar todo</span>
                  }
                />
              </div>

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Medio de pago</Text>
                <Select
                  value={abonoCuenta} onChange={setAbonoCuenta}
                  style={{ width: '100%' }} size="large"
                  options={CUENTAS.map(c => ({ value: c, label: c }))}
                />
              </div>

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nota (opcional)</Text>
                <Input
                  value={abonoNota} onChange={(e) => setAbonoNota(e.target.value)}
                  placeholder="Ej: Transferencia #1234"
                />
              </div>

              {abonos.length > 0 && (
                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Historial de abonos</Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
                    {abonos.map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#f9fafb', borderRadius: 6, padding: '6px 10px', fontSize: 12,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#595959' }}>{formatCurrency(a.monto)}</span>
                          <span style={{ color: '#94a3b8', marginLeft: 6 }}>{a.cuenta}</span>
                          {a.nota && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· {a.nota}</span>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(a.fecha).format('DD/MM/YY')}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Modal aumentar deuda */}
      <Modal
        open={aumentarModal.open}
        title={
          <Space>
            <PlusCircleOutlined style={{ color: ACCENT }} />
            <span>Aumentar deuda</span>
          </Space>
        }
        okText="Aumentar deuda"
        cancelText="Cancelar"
        onCancel={() => setAumentarModal({ open: false, doc: null })}
        onOk={confirmarAumento}
        confirmLoading={guardandoAumento}
        okButtonProps={{ disabled: !aumentarMonto || aumentarMonto <= 0 }}
        width={400}
      >
        {aumentarModal.doc && (() => {
          const total   = Number(aumentarModal.doc.total || 0);
          const abonado = Number(aumentarModal.doc.total_abonado || 0);
          const saldo   = total - abonado;
          const inc         = Number(aumentarMonto || 0);
          const nuevoTotal  = total + inc;
          const nuevoSaldo  = saldo + inc;
          const cargos  = parseArr(aumentarModal.doc.cargos);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Suma un nuevo monto a esta deuda (por ejemplo, si {aumentarModal.doc.persona_nombre || aumentarModal.doc.proveedor_nombre || 'el proveedor'} te prestó otra vez). El saldo pendiente aumentará.
              </Text>

              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <Text type="secondary">Cuenta</Text>
                  <Text strong>{aumentarModal.doc.titulo}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <Text type="secondary">Total actual</Text>
                  <Text strong>{formatCurrency(total)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <Text type="secondary">Saldo actual</Text>
                  <Text style={{ color: DANGER }}>{formatCurrency(saldo)}</Text>
                </div>
                {inc > 0 && (
                  <>
                    <div style={{ borderTop: '1px dashed #e5e7eb', margin: '10px 0 8px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <Text type="secondary">Nuevo total</Text>
                      <Text strong>{formatCurrency(nuevoTotal)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                      <span>Nuevo saldo</span>
                      <span style={{ color: DANGER }}>{formatCurrency(nuevoSaldo)}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Monto a aumentar <span style={{ color: '#ef4444' }}>*</span>
                </Text>
                <InputNumber
                  style={{ width: '100%' }} size="large" min={1}
                  value={aumentarMonto}
                  onChange={setAumentarMonto}
                  formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  placeholder="Monto a sumar"
                />
              </div>

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Motivo / nota (opcional)</Text>
                <Input
                  value={aumentarNota} onChange={(e) => setAumentarNota(e.target.value)}
                  placeholder="Ej: Nuevo préstamo del 15/07"
                />
              </div>

              {cargos.length > 0 && (
                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Historial de aumentos</Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
                    {cargos.map((c, i) => (
                      <div key={c.id || i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#f9fafb', borderRadius: 6, padding: '6px 10px', fontSize: 12,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: DANGER }}>+{formatCurrency(c.monto)}</span>
                          {c.nota && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· {c.nota}</span>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(c.fecha).format('DD/MM/YY')}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </Content>
  );
};

export default CuentasPorPagarDashboard;
