import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Modal,
  message, Input, Space, Card, Statistic,
  Dropdown, Select,
} from 'antd';
import {
  PlusOutlined, FileDoneOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, MoreOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useCurrency from '../../hooks/useCurrency';
import {
  getDocumentosVenta,
  getEstadisticasDocumentos,
  deleteDocumentoVenta,
  updateDocumentoVenta,
} from '../../services/documentoVenta/documentoVentaService';
import DocumentoVentaForm from './DocumentoVentaForm';
import FacturaViewer from './FacturaViewer';

const { Content } = Layout;
const { Title, Text } = Typography;

const ESTADO_COLOR = {
  EMITIDA: 'blue',
  PAGADA:  'green',
  ANULADA: 'red',
};

const ESTADO_ICON = {
  EMITIDA: <ClockCircleOutlined />,
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
      render: (t) => <Text strong>{formatCurrency(t)}</Text>,
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
