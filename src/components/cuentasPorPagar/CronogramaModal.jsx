import React, { useState, useMemo } from 'react';
import {
  Modal, Table, Tag, Button, Select, Progress, Typography,
  Space, message, Popconfirm, Tooltip,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, UndoOutlined, BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useCurrency from '../../hooks/useCurrency';
import { pagarCuota, revertirCuota } from '../../services/cuentaPorPagar/cuentaPorPagarService';

const { Text } = Typography;

const ACCENT = '#262626'; // near-black neutro
const DANGER = '#dc2626'; // rojo: saldo pendiente
const MUTED  = '#8c8c8c'; // gris: barra de progreso
const CUENTAS = ['Efectivo', 'Nequi', 'Daviplata', 'Bancolombia', 'Transferencia', 'Otra'];

const parseCuotas = (raw) =>
  Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);

const CronogramaModal = ({ open, doc, onClose, onChanged }) => {
  const formatCurrency = useCurrency();
  const [cuentaPago, setCuentaPago] = useState('Efectivo');
  const [procesando, setProcesando] = useState(null); // numero de cuota en proceso

  const cuotas = useMemo(() => parseCuotas(doc?.cuotas), [doc]);

  const total       = Number(doc?.total || 0);
  const abonado     = Number(doc?.total_abonado || 0);
  const saldo       = total - abonado;
  const pagadas     = cuotas.filter((c) => c.estado === 'PAGADA').length;
  const pct         = cuotas.length ? Math.round((pagadas / cuotas.length) * 100) : 0;

  const handlePagar = async (cuota) => {
    setProcesando(cuota.numero);
    try {
      await pagarCuota(doc.id, cuota.numero, { cuenta: cuentaPago });
      message.success(`Cuota #${cuota.numero} pagada`);
      onChanged?.();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Error al pagar la cuota');
    } finally {
      setProcesando(null);
    }
  };

  const handleRevertir = async (cuota) => {
    setProcesando(cuota.numero);
    try {
      await revertirCuota(doc.id, cuota.numero);
      message.success(`Pago de la cuota #${cuota.numero} revertido`);
      onChanged?.();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Error al revertir la cuota');
    } finally {
      setProcesando(null);
    }
  };

  // La siguiente cuota a pagar (primera pendiente)
  const proximaPendiente = cuotas.find((c) => c.estado !== 'PAGADA')?.numero;

  const columns = [
    {
      title: '#',
      dataIndex: 'numero',
      key: 'numero',
      width: 44,
      render: (n) => <Text strong>{n}</Text>,
    },
    {
      title: 'Vence',
      dataIndex: 'fecha_vencimiento',
      key: 'fecha_vencimiento',
      render: (d, rec) => {
        if (!d) return '—';
        const vencida = dayjs(d).isBefore(dayjs(), 'day') && rec.estado !== 'PAGADA';
        return <Text type={vencida ? 'danger' : undefined} style={{ fontSize: 12 }}>{dayjs(d).format('DD/MM/YYYY')}</Text>;
      },
    },
    {
      title: 'Capital',
      dataIndex: 'capital',
      key: 'capital',
      align: 'right',
      render: (v) => <Text style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Interés',
      dataIndex: 'interes',
      key: 'interes',
      align: 'right',
      render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Cuota',
      dataIndex: 'valor',
      key: 'valor',
      align: 'right',
      render: (v) => <Text strong style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Saldo',
      dataIndex: 'saldo',
      key: 'saldo',
      align: 'right',
      render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      align: 'center',
      render: (estado, rec) =>
        estado === 'PAGADA'
          ? (
            <Tooltip title={rec.fecha_pago ? `Pagada ${dayjs(rec.fecha_pago).format('DD/MM/YYYY')}${rec.cuenta ? ' · ' + rec.cuenta : ''}` : 'Pagada'}>
              <Tag icon={<CheckCircleOutlined />}>Pagada</Tag>
            </Tooltip>
          )
          : <Tag icon={<ClockCircleOutlined />}>Pendiente</Tag>,
    },
    {
      title: '',
      key: 'accion',
      align: 'center',
      width: 96,
      render: (_, rec) => {
        if (rec.estado === 'PAGADA') {
          return (
            <Popconfirm
              title="¿Revertir el pago de esta cuota?"
              okText="Revertir" cancelText="Cancelar"
              onConfirm={() => handleRevertir(rec)}
            >
              <Button size="small" type="text" icon={<UndoOutlined />} loading={procesando === rec.numero}>
                Revertir
              </Button>
            </Popconfirm>
          );
        }
        return (
          <Button
            size="small"
            type={rec.numero === proximaPendiente ? 'primary' : 'default'}
            loading={procesando === rec.numero}
            onClick={() => handlePagar(rec)}
            style={rec.numero === proximaPendiente ? { background: ACCENT, borderColor: ACCENT } : undefined}
          >
            Pagar
          </Button>
        );
      },
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Cerrar</Button>}
      width={760}
      title={
        <Space>
          <BankOutlined style={{ color: ACCENT }} />
          <span>Cronograma de cuotas — {doc?.titulo}</span>
        </Space>
      }
    >
      {/* Resumen */}
      <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Total del préstamo</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(total)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Pagado</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#595959' }}>{formatCurrency(abonado)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Saldo pendiente</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DANGER }}>{formatCurrency(saldo)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Cuotas</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{pagadas} / {cuotas.length}</div>
          </div>
        </div>
        <Progress percent={pct} size="small" strokeColor={MUTED} />
      </div>

      {/* Medio de pago para registrar cuotas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>Medio de pago al registrar cuota:</Text>
        <Select
          value={cuentaPago}
          onChange={setCuentaPago}
          style={{ width: 180 }}
          size="small"
          options={CUENTAS.map((c) => ({ value: c, label: c }))}
        />
      </div>

      <Table
        columns={columns}
        dataSource={cuotas}
        rowKey="numero"
        size="small"
        pagination={false}
        scroll={{ x: 680, y: 360 }}
      />
    </Modal>
  );
};

export default CronogramaModal;
