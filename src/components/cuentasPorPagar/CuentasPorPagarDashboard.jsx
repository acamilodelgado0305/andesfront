import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Modal,
  message, Input, Space, Card, Statistic,
  Dropdown, Select, InputNumber, Progress, Tooltip as AntTooltip,
} from 'antd';
import {
  PlusOutlined, FileProtectOutlined,
  EditOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined, MoreOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, WalletOutlined, BankOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useCurrency from '../../hooks/useCurrency';
import {
  getCuentasPorPagar,
  getEstadisticasCuentasPorPagar,
  deleteCuentaPorPagar,
  updateCuentaPorPagar,
  registrarAbono,
} from '../../services/cuentaPorPagar/cuentaPorPagarService';
import CuentaPorPagarForm from './CuentaPorPagarForm';
import CronogramaModal from './CronogramaModal';

const { Content } = Layout;
const { Title, Text } = Typography;

const ACCENT = '#ea580c';

const ESTADO_COLOR = {
  PENDIENTE: 'gold',
  ABONO:     'orange',
  PAGADA:    'green',
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

const CuentasPorPagarDashboard = () => {
  const formatCurrency = useCurrency();

  const [docs, setDocs]       = useState([]);
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [formOpen, setFormOpen]     = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [cronogramaId, setCronogramaId] = useState(null);
  const cronogramaDoc = docs.find((d) => d.id === cronogramaId) || null;

  const [abonoModal, setAbonoModal]         = useState({ open: false, doc: null });
  const [abonoMonto, setAbonoMonto]         = useState(null);
  const [abonoCuenta, setAbonoCuenta]       = useState('Efectivo');
  const [abonoNota, setAbonoNota]           = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

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
            <Tag color="orange" style={{ fontSize: 10, marginInlineStart: 2 }}>
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
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      sorter: (a, b) => Number(a.total || 0) - Number(b.total || 0),
      render: (t, rec) => {
        const abonado = Number(rec.total_abonado || 0);
        const total   = Number(t || 0);
        if (abonado > 0 && rec.estado !== 'PAGADA') {
          const pct   = Math.min(100, Math.round((abonado / total) * 100));
          const saldo = total - abonado;
          return (
            <AntTooltip title={`Abonado: ${formatCurrency(abonado)} · Saldo: ${formatCurrency(saldo)}`}>
              <div style={{ minWidth: 110 }}>
                <Text strong style={{ fontSize: 12 }}>{formatCurrency(total)}</Text>
                <Progress percent={pct} size="small" showInfo={false} strokeColor={ACCENT} style={{ marginBottom: 0 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>Saldo: {formatCurrency(saldo)}</Text>
              </div>
            </AntTooltip>
          );
        }
        return <Text strong>{formatCurrency(t)}</Text>;
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
            prefix={<DollarOutlined style={{ color: ACCENT }} />}
            valueStyle={{ color: ACCENT, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{porPagar.qty} cuentas pendientes</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Pendientes"
            value={pendientes.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<ClockCircleOutlined style={{ color: '#d97706' }} />}
            valueStyle={{ color: '#d97706', fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{pendientes.qty} cuentas</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Con abonos"
            value={abonadas.saldo}
            formatter={(v) => formatCurrency(v)}
            prefix={<WalletOutlined style={{ color: '#ea580c' }} />}
            valueStyle={{ color: '#ea580c', fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{abonadas.qty} · saldo restante</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Pagadas"
            value={pagadas.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
            valueStyle={{ color: '#16a34a', fontSize: 15 }}
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
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        dataSource={docs}
        rowKey="id"
        loading={loading}
        size="small"
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
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px' }}>
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
                    <Text style={{ color: '#16a34a' }}>{formatCurrency(abonado)}</Text>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Saldo pendiente</span>
                  <span style={{ color: ACCENT }}>{formatCurrency(saldo)}</span>
                </div>
                {abonado > 0 && (
                  <Progress
                    percent={Math.min(100, Math.round((abonado / total) * 100))}
                    size="small" strokeColor="#16a34a" style={{ marginTop: 8, marginBottom: 0 }}
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
                          <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(a.monto)}</span>
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
    </Content>
  );
};

export default CuentasPorPagarDashboard;
