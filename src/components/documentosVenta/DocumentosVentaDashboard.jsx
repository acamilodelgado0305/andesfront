import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Modal,
  message, Input, Space, Card, Statistic,
  Dropdown, Select, InputNumber, Progress, Tooltip as AntTooltip,
} from 'antd';
import {
  PlusOutlined, FileDoneOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, MoreOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useCurrency from '../../hooks/useCurrency';
import {
  getDocumentosVenta,
  getEstadisticasDocumentos,
  deleteDocumentoVenta,
  updateDocumentoVenta,
  registrarAbono,
} from '../../services/documentoVenta/documentoVentaService';
import DocumentoVentaForm from './DocumentoVentaForm';
import FacturaViewer from './FacturaViewer';

const { Content } = Layout;
const { Title, Text } = Typography;

const ESTADO_COLOR = {
  EMITIDA: 'blue',
  ABONO:   'orange',
  PAGADA:  'green',
  ANULADA: 'red',
};

const ESTADO_ICON = {
  EMITIDA: <ClockCircleOutlined />,
  ABONO:   <WalletOutlined />,
  PAGADA:  <CheckCircleOutlined />,
  ANULADA: <CloseCircleOutlined />,
};

const ESTADOS_FACTURA = ['EMITIDA', 'PAGADA', 'ANULADA'];
const CUENTAS = ['Efectivo', 'Nequi', 'Daviplata', 'Bancolombia', 'Transferencia', 'Otra'];

const DocumentosVentaDashboard = () => {
  const formatCurrency = useCurrency();

  const [docs, setDocs]       = useState([]);
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [formOpen, setFormOpen]     = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [viewerDoc, setViewerDoc]   = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [pagarModal, setPagarModal]       = useState({ open: false, doc: null });
  const [cuentaPago, setCuentaPago]       = useState('Efectivo');
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [abonoModal, setAbonoModal]         = useState({ open: false, doc: null });
  const [abonoMonto, setAbonoMonto]         = useState(null);
  const [abonoCuenta, setAbonoCuenta]       = useState('Efectivo');
  const [abonoNota, setAbonoNota]           = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // ─── Carga ────────────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { tipo: 'FACTURA' };
      if (busqueda) params.q = busqueda;
      const [docsData, statsData] = await Promise.all([
        getDocumentosVenta(params),
        getEstadisticasDocumentos(),
      ]);
      setDocs(docsData);
      setStats(statsData);
    } catch {
      message.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const calcStat = (estado) =>
    stats
      .filter((s) => s.tipo === 'FACTURA' && (!estado || s.estado === estado))
      .reduce((acc, s) => ({ qty: acc.qty + s.cantidad, sum: acc.sum + Number(s.total_suma) }), { qty: 0, sum: 0 });

  const emitidas  = calcStat('EMITIDA');
  const pagadas   = calcStat('PAGADA');
  const anuladas  = calcStat('ANULADA');
  const total     = calcStat(null);

  // ─── Eliminar ─────────────────────────────────────────────────────────────────
  const handleEliminar = (doc) => {
    Modal.confirm({
      title: `¿Eliminar factura ${doc.numero}?`,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar', okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteDocumentoVenta(doc.id);
          message.success('Factura eliminada');
          cargarDatos();
        } catch { message.error('Error al eliminar'); }
      },
    });
  };

  // ─── Cambiar estado ───────────────────────────────────────────────────────────
  const handleCambiarEstado = (doc, nuevoEstado) => {
    if (nuevoEstado === 'PAGADA') {
      setCuentaPago('Efectivo');
      setPagarModal({ open: true, doc });
      return;
    }
    Modal.confirm({
      title: `Cambiar estado a ${nuevoEstado}`,
      content: `La factura ${doc.numero} pasará a estado ${nuevoEstado}.`,
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateDocumentoVenta(doc.id, { estado: nuevoEstado });
          message.success(`Estado actualizado a ${nuevoEstado}`);
          cargarDatos();
        } catch { message.error('Error al cambiar estado'); }
      },
    });
  };

  const confirmarPago = async () => {
    const doc = pagarModal.doc;
    if (!doc) return;
    setGuardandoPago(true);
    try {
      await updateDocumentoVenta(doc.id, {
        estado:     'PAGADA',
        fecha_pago: dayjs().format('YYYY-MM-DD'),
        cuenta:     cuentaPago,
      });
      message.success(`Factura PAGADA · Ingreso registrado en ${cuentaPago}`);
      setPagarModal({ open: false, doc: null });
      cargarDatos();
    } catch {
      message.error('Error al registrar el pago');
    } finally {
      setGuardandoPago(false);
    }
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
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      render: (num) => (
        <Space>
          <FileDoneOutlined style={{ color: '#1d4ed8' }} />
          <Text strong style={{ fontSize: 13 }}>{num || '—'}</Text>
        </Space>
      ),
    },
    {
      title: 'Cliente',
      key: 'cliente',
      render: (_, rec) => (
        <Text>{rec.cliente_nombre || rec.persona_nombre || <Text type="secondary">Sin cliente</Text>}</Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_emision',
      key: 'fecha_emision',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Vencimiento',
      dataIndex: 'fecha_vencimiento',
      key: 'fecha_vencimiento',
      render: (d) => {
        if (!d) return <Text type="secondary">—</Text>;
        const vencido = dayjs(d).isBefore(dayjs(), 'day');
        return <Text type={vencido ? 'danger' : undefined}>{dayjs(d).format('DD/MM/YYYY')}</Text>;
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (t, rec) => {
        const abonado = Number(rec.total_abonado || 0);
        const total   = Number(t || 0);
        if (abonado > 0 && rec.estado !== 'PAGADA') {
          const pct     = Math.min(100, Math.round((abonado / total) * 100));
          const saldo   = total - abonado;
          return (
            <AntTooltip title={`Abonado: ${formatCurrency(abonado)} · Saldo: ${formatCurrency(saldo)}`}>
              <div style={{ minWidth: 110 }}>
                <Text strong style={{ fontSize: 12 }}>{formatCurrency(total)}</Text>
                <Progress percent={pct} size="small" showInfo={false} strokeColor="#f97316" style={{ marginBottom: 0 }} />
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
      render: (estado, rec) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: ESTADOS_FACTURA.map((e) => ({
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
      render: (_, rec) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'ver',
                icon: <EyeOutlined />,
                label: 'Ver / Descargar PDF',
                onClick: () => { setViewerDoc(rec); setViewerOpen(true); },
              },
              {
                key: 'editar',
                icon: <EditOutlined />,
                label: 'Editar',
                disabled: ['PAGADA', 'ANULADA'].includes(rec.estado),
                onClick: () => { setEditingDoc(rec); setFormOpen(true); },
              },
              {
                key: 'abono',
                icon: <WalletOutlined />,
                label: 'Registrar abono',
                disabled: ['PAGADA', 'ANULADA'].includes(rec.estado),
                onClick: () => { setAbonoMonto(null); setAbonoCuenta('Efectivo'); setAbonoNota(''); setAbonoModal({ open: true, doc: rec }); },
              },
              { type: 'divider' },
              {
                key: 'eliminar',
                icon: <DeleteOutlined />,
                label: 'Eliminar',
                danger: true,
                onClick: () => handleEliminar(rec),
              },
            ],
          }}
        >
          <Button size="small" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Content style={{ padding: '16px 20px' }}>

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <Title level={3} style={{ margin: 0 }}>Facturas</Title>
          <Text type="secondary">Gestiona y descarga tus facturas</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingDoc(null); setFormOpen(true); }}
        >
          Nueva Factura
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Pendientes de pago"
            value={emitidas.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<ClockCircleOutlined style={{ color: '#1d4ed8' }} />}
            valueStyle={{ color: '#1d4ed8', fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{emitidas.qty} facturas</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Cobradas"
            value={pagadas.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
            valueStyle={{ color: '#16a34a', fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{pagadas.qty} facturas</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Total facturado"
            value={total.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<DollarOutlined style={{ color: '#0891b2' }} />}
            valueStyle={{ color: '#0891b2', fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{total.qty} facturas</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Anuladas"
            value={anuladas.qty}
            prefix={<CloseCircleOutlined style={{ color: '#dc2626' }} />}
            valueStyle={{ color: '#dc2626', fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{formatCurrency(anuladas.sum)}</Text>
        </Card>
      </div>

      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder="Buscar por número o cliente..."
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
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} facturas` }}
        scroll={{ x: 780 }}
      />

      {/* Drawer creación/edición */}
      <DocumentoVentaForm
        open={formOpen}
        defaultTipo="FACTURA"
        editingDoc={editingDoc}
        onClose={() => { setFormOpen(false); setEditingDoc(null); }}
        onSaved={cargarDatos}
      />

      {/* Modal pago */}
      <Modal
        open={pagarModal.open}
        title="Registrar pago"
        okText="Confirmar pago"
        cancelText="Cancelar"
        onCancel={() => setPagarModal({ open: false, doc: null })}
        onOk={confirmarPago}
        confirmLoading={guardandoPago}
        width={360}
      >
        <div style={{ marginBottom: 8 }}>
          <Text>Factura: <strong>{pagarModal.doc?.numero}</strong></Text><br />
          <Text>Total: <strong style={{ color: '#1d4ed8' }}>{formatCurrency(pagarModal.doc?.total)}</strong></Text>
        </div>
        <div style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Medio de pago recibido</Text>
          <Select
            value={cuentaPago}
            onChange={setCuentaPago}
            style={{ width: '100%', marginTop: 6 }}
            options={CUENTAS.map(c => ({ value: c, label: c }))}
            size="large"
          />
        </div>
      </Modal>

      {/* Modal abono */}
      <Modal
        open={abonoModal.open}
        title={
          <Space>
            <WalletOutlined style={{ color: '#f97316' }} />
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
          const total    = Number(abonoModal.doc.total || 0);
          const abonado  = Number(abonoModal.doc.total_abonado || 0);
          const saldo    = total - abonado;
          const abonos   = Array.isArray(abonoModal.doc.abonos)
            ? abonoModal.doc.abonos
            : (typeof abonoModal.doc.abonos === 'string' ? JSON.parse(abonoModal.doc.abonos || '[]') : []);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <Text type="secondary">Factura</Text>
                  <Text strong>{abonoModal.doc.numero}</Text>
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
                  <span style={{ color: '#f97316' }}>{formatCurrency(saldo)}</span>
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
                      style={{ cursor: 'pointer', color: '#f97316', fontSize: 11, fontWeight: 600 }}
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

      {/* Viewer PDF */}
      <FacturaViewer
        open={viewerOpen}
        doc={viewerDoc}
        onClose={() => { setViewerOpen(false); setViewerDoc(null); }}
      />
    </Content>
  );
};

export default DocumentosVentaDashboard;
