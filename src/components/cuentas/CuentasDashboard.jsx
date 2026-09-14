import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layout, Typography, Button, Table, Tag, Modal,
  message, Input, Space, Card, Statistic,
  Dropdown, Select, InputNumber, Progress, Switch, Tooltip as AntTooltip,
  DatePicker, Tabs,
} from 'antd';
import {
  PlusOutlined, FileProtectOutlined,
  EditOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined, MoreOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  CalendarOutlined, DownOutlined,
  DollarOutlined, WalletOutlined,
  PlusCircleOutlined, BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import useCurrency, { useCurrencyInput } from '../../hooks/useCurrency';
import CuentaForm from './CuentaForm';
import { CUENTAS_CONFIG } from './cuentasConfig';
import { cuentaOptions } from '../Certificados/options';
import { parseFechaDia, formatFechaDia, toFechaDiaPayload } from '../../utils/fechas';

const { Content } = Layout;
const { Title, Text } = Typography;

// Paleta alineada con el módulo de Facturas (colorida, coherente con el tema azul)
const BLUE   = '#1d4ed8'; // acento principal / pendientes
const GREEN  = '#16a34a'; // pagadas / abonos aplicados
const ORANGE = '#f97316'; // abonos en curso / progreso
// El color del saldo y de los aumentos depende de la cuenta: `colorSaldo` en cuentasConfig.
const MUTED  = '#8c8c8c'; // texto e iconos secundarios
const ACCENT = BLUE;      // usos genéricos de acento (botones, iconos, enlaces)

// ─── Celda «Movimiento» (monto) editable en línea ─────────────────────────────
// Corrige el valor de una línea del estado de cuenta.
const MontoMovimientoCell = ({ cuentaId, mov, onSaved, servicio, colorSaldo }) => {
  const formatCurrency = useCurrency();
  const { formatter: fmt, parser: prs, precision, step } = useCurrencyInput();

  const [editando, setEditando]   = useState(false);
  const [valor, setValor]         = useState(Math.abs(Number(mov.monto) || 0));
  const [guardando, setGuardando] = useState(false);
  // Enter dispara onPressEnter y además el onBlur al desmontarse: evita el doble PUT.
  const enCurso = useRef(false);

  const abona    = mov.tipo === 'abono';
  const original = Math.abs(Number(mov.monto) || 0);

  // Abonos/aumentos viejos sin uuid no se pueden identificar en el backend.
  const sinId = (mov.tipo === 'abono' || mov.tipo === 'aumento')
    && /^(abono|cargo)-\d+$/.test(String(mov.key));

  const bloqueado = sinId;

  const abrir = () => { setValor(original); setEditando(true); };

  const guardar = async () => {
    if (enCurso.current) return;
    const nuevo = Number(valor);
    if (!Number.isFinite(nuevo) || nuevo <= 0) {
      message.error('El monto debe ser mayor a 0');
      return;
    }
    if (nuevo === original) { setEditando(false); return; }

    enCurso.current = true;
    setGuardando(true);
    try {
      await servicio.editarMontoMovimiento(cuentaId, mov.key, { monto: nuevo });
      message.success(`Movimiento actualizado a ${formatCurrency(nuevo)}`);
      setEditando(false);
      await onSaved();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Error al editar el movimiento');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <InputNumber
        autoFocus
        size="small"
        style={{ width: 130 }}
        min={step}
        value={valor}
        onChange={setValor}
        formatter={fmt}
        parser={prs}
        precision={precision}
        step={step}
        disabled={guardando}
        onPressEnter={guardar}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditando(false); } }}
      />
    );
  }

  const texto = (
    <Text strong style={{ fontSize: 12, color: abona ? GREEN : colorSaldo }}>
      {abona ? '−' : '+'}{formatCurrency(original)}
    </Text>
  );

  if (bloqueado) {
    return (
      <AntTooltip title="Movimiento antiguo sin identificador: no se puede editar">
        <span>{texto}</span>
      </AntTooltip>
    );
  }

  return (
    <AntTooltip title="Clic para corregir el monto">
      <span
        role="button"
        tabIndex={0}
        onClick={abrir}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } }}
        className="cpp-monto-editable"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          cursor: 'pointer', padding: '2px 6px', margin: '-2px -6px',
          borderRadius: 6, borderBottom: '1px dashed #d9d9d9',
        }}
      >
        {texto}
        <EditOutlined style={{ fontSize: 10, color: MUTED, opacity: 0.65 }} />
      </span>
    </AntTooltip>
  );
};

// ─── Celda «Vencimiento» editable en línea ────────────────────────────────────
// Un clic abre el calendario sobre la misma celda y guarda al elegir la fecha.
const VencimientoCell = ({ record, onSaved, servicio }) => {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const fecha    = parseFechaDia(record.fecha_vencimiento);
  const vencido  = fecha?.isBefore(dayjs(), 'day') && !['PAGADA', 'ANULADA'].includes(record.estado);
  const guardar = async (nueva) => {
    // Mismo día: no vale la pena ir al servidor
    if ((nueva ? nueva.format('YYYY-MM-DD') : null) === (fecha ? fecha.format('YYYY-MM-DD') : null)) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    try {
      await servicio.updateCuenta(record.id, { fecha_vencimiento: toFechaDiaPayload(nueva) });
      message.success(nueva ? `Vencimiento: ${nueva.format('DD/MM/YYYY')}` : 'Vencimiento quitado');
      setEditando(false);
      await onSaved();
    } catch {
      message.error('Error al actualizar el vencimiento');
    } finally {
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <DatePicker
        autoFocus
        open
        allowClear
        disabled={guardando}
        size="small"
        style={{ width: 138 }}
        format="DD/MM/YYYY"
        value={fecha}
        placeholder="Sin fecha"
        onChange={guardar}
        onOpenChange={(abierto) => { if (!abierto && !guardando) setEditando(false); }}
      />
    );
  }

  const contenido = (
    <Text type={vencido ? 'danger' : (fecha ? undefined : 'secondary')}>
      {fecha ? formatFechaDia(record.fecha_vencimiento) : '—'}
    </Text>
  );

  return (
    <AntTooltip title="Clic para cambiar el vencimiento">
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditando(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditando(true); } }}
        className="cpp-vencimiento-editable"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', padding: '2px 6px', margin: '-2px -6px',
          borderRadius: 6, borderBottom: '1px dashed #d9d9d9',
        }}
      >
        {contenido}
        <CalendarOutlined style={{ fontSize: 11, color: MUTED, opacity: 0.65 }} />
      </span>
    </AntTooltip>
  );
};

const ESTADO_COLOR = {
  PENDIENTE: 'blue',
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

const parseArr = (raw) =>
  Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Valor de cada cuota. Las cuentas anteriores a la migración aún no lo tienen
// guardado, así que se deduce del total.
const valorCuotaDe = (rec) => {
  if (rec.valor_cuota != null) return Number(rec.valor_cuota) || 0;
  const cuotas = Math.max(1, Number(rec.num_cuotas) || 1);
  return round2((Number(rec.total) || 0) / cuotas);
};

// Reconstruye el estado de cuenta (movimientos con saldo corrido) de una cuenta.
// El saldo final coincide con total − total_abonado.
const buildMovimientos = (rec, { movInicial, movAumento }) => {
  const total      = Number(rec.total || 0);
  const abonos     = parseArr(rec.abonos);
  const cargos     = parseArr(rec.cargos);
  const sumCargos  = cargos.reduce((s, c) => s + Number(c.monto || 0), 0);

  const eventos = [];

  // Deuda / préstamo inicial (base antes de aumentos)
  eventos.push({
    key:      'inicial',
    fecha:    rec.fecha_emision ? parseFechaDia(rec.fecha_emision) : rec.created_at,
    tipo:     'inicial',
    concepto: movInicial,
    detalle:  null,
    monto:    round2(total - sumCargos),
  });

  // Aumentos de deuda
  cargos.forEach((c, i) => eventos.push({
    key:      c.id || `cargo-${i}`,
    fecha:    c.fecha,
    tipo:     'aumento',
    concepto: movAumento,
    detalle:  c.nota || null,
    monto:    Number(c.monto || 0),
  }));

  // Abonos
  abonos.forEach((a, i) => eventos.push({
    key:      a.id || `abono-${i}`,
    fecha:    a.fecha,
    tipo:     'abono',
    concepto: 'Abono',
    detalle:  [a.cuenta, a.nota].filter(Boolean).join(' · ') || null,
    monto:    -Number(a.monto || 0),
  }));

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


// Pantalla compartida por Cuentas por Pagar y Cuentas por Cobrar (préstamos).
// Pestañas Por pagar / Por cobrar. El texto sale de cuentasConfig; el icono va
// aquí porque el config no es JSX.
const TAB_ICON = { pagar: <BankOutlined />, cobrar: <WalletOutlined /> };
const TABS = Object.entries(CUENTAS_CONFIG).map(([key, c]) => ({
  key,
  label: <span>{TAB_ICON[key]} {c.tab}</span>,
}));

const CuentasDashboard = ({ tipo = 'pagar', onCambiarTipo }) => {
  const cfg = CUENTAS_CONFIG[tipo] || CUENTAS_CONFIG.pagar;
  const { servicio } = cfg;
  const SALDO = cfg.colorSaldo; // saldo pendiente y aumentos
  const formatCurrency = useCurrency();
  const { formatter: currFormatter, parser: currParser, precision: currPrecision, step: currStep } = useCurrencyInput();

  const [docs, setDocs]       = useState([]);
  const [stats, setStats]     = useState([]);
  const [statsMes, setStatsMes] = useState(null);
  const [statsMesSig, setStatsMesSig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verPagadas, setVerPagadas] = useState(false); // las pagadas se archivan (ocultas por defecto)

  const [formOpen, setFormOpen]     = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [abonoModal, setAbonoModal]         = useState({ open: false, doc: null });
  const [abonoMonto, setAbonoMonto]         = useState(null);
  const [abonoCuenta, setAbonoCuenta]       = useState('Efectivo');
  const [abonoNota, setAbonoNota]           = useState('');
  const [abonoCuotas, setAbonoCuotas]       = useState(1);
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  const [aumentarModal, setAumentarModal]       = useState({ open: false, doc: null });
  const [aumentarMonto, setAumentarMonto]       = useState(null);
  const [aumentarNota, setAumentarNota]         = useState('');
  const [aumentarCuenta, setAumentarCuenta]     = useState('Nequi'); // cuenta de salida del egreso
  const [guardandoAumento, setGuardandoAumento] = useState(false);

  // ─── Carga ────────────────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (busqueda) params.q = busqueda;
      const [docsData, statsData] = await Promise.all([
        servicio.getCuentas(params),
        servicio.getEstadisticas(),
      ]);
      setDocs(docsData);
      setStats(Array.isArray(statsData) ? statsData : (statsData?.porEstado || []));
      setStatsMes(Array.isArray(statsData) ? null : (statsData?.mes || null));
      setStatsMesSig(Array.isArray(statsData) ? null : (statsData?.mesSiguiente || null));
    } catch {
      message.error(cfg.errorCarga);
    } finally {
      setLoading(false);
    }
  }, [busqueda, servicio, cfg.errorCarga]);

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
  // Total a pagar = saldo pendiente de las cuentas no pagadas/no anuladas
  const porPagar   = {
    qty:   pendientes.qty + abonadas.qty,
    saldo: pendientes.saldo + abonadas.saldo,
  };

  // ── Lo que se paga cada mes ──
  // Una cuenta de N cuotas se paga una cuota por mes, así que el mes vale una
  // cuota de cada cuenta que aún deba algo. (Agrupar por fecha_vencimiento no
  // sirve: esa fecha es la de la ÚLTIMA cuota.)
  // Normalmente llega del backend, sin filtrar por la búsqueda; si aún no lo
  // manda, se calcula con lo que hay cargado.
  const cuotasDelMes = (() => {
    const iniMes = dayjs().startOf('month');
    const finMes = dayjs().endOf('month');
    let total = 0, qty = 0, totalSig = 0, qtySig = 0, pagado = 0;

    docs.forEach((d) => {
      if (['PAGADA', 'ANULADA'].includes(d.estado)) return;
      const saldo = round2((Number(d.total) || 0) - (Number(d.total_abonado) || 0));
      if (saldo <= 0) return;
      const cuota = Math.min(valorCuotaDe(d), saldo);
      total += cuota; qty += 1;
      const restante = round2(saldo - cuota);
      if (restante > 0) { totalSig += Math.min(valorCuotaDe(d), restante); qtySig += 1; }
    });

    // Abonado durante el mes en curso (por la fecha del abono).
    docs.forEach((d) => {
      if (d.estado === 'ANULADA') return;
      parseArr(d.abonos).forEach((a) => {
        const f = a?.fecha ? dayjs(a.fecha) : null;
        if (!f || !f.isValid() || f.isBefore(iniMes) || f.isAfter(finMes)) return;
        pagado += Number(a.monto) || 0;
      });
    });

    return {
      mes:    { total: round2(total),    pagado: round2(pagado), saldo: Math.max(0, round2(total - pagado)), qty },
      mesSig: { total: round2(totalSig), pagado: 0,              saldo: round2(totalSig),                    qty: qtySig },
    };
  })();

  const conPct = (m) => ({
    ...m,
    pct: m.total > 0 ? Math.min(100, Math.round((m.pagado / m.total) * 100)) : 0,
  });

  const mes    = conPct(statsMes    ? { ...statsMes,    qty: statsMes.cantidad }    : cuotasDelMes.mes);
  const mesSig = conPct(statsMesSig ? { ...statsMesSig, qty: statsMesSig.cantidad } : cuotasDelMes.mesSig);

  const nombreMes    = dayjs().locale('es').format('MMMM');
  const nombreMesSig = dayjs().add(1, 'month').locale('es').format('MMMM');

  // Las cuentas pagadas se archivan: no se muestran salvo que se active "Ver pagadas"
  const docsVisibles = verPagadas ? docs : docs.filter((d) => d.estado !== 'PAGADA');
  const pagadasOcultas = docs.length - docsVisibles.length;

  // ─── Eliminar ─────────────────────────────────────────────────────────────────
  const handleEliminar = (doc) => {
    Modal.confirm({
      title: `¿Eliminar "${doc.titulo}"?`,
      content: cfg.generaEgreso
        ? 'También se borrarán sus egresos en Movimientos. Esta acción no se puede deshacer.'
        : 'Esta acción no se puede deshacer.',
      okText: 'Eliminar', okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await servicio.deleteCuenta(doc.id);
          message.success(cfg.eliminada);
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
          await servicio.updateCuenta(doc.id, { estado: nuevoEstado });
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
      await servicio.registrarAbono(doc.id, { monto: abonoMonto, cuenta: abonoCuenta, nota: abonoNota });
      message.success('Abono registrado correctamente');
      setAbonoModal({ open: false, doc: null });
      setAbonoMonto(null);
      setAbonoCuotas(1);
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
      await servicio.aumentarDeuda(doc.id, {
        monto: aumentarMonto,
        nota:  aumentarNota,
        ...(cfg.generaEgreso && { cuenta_egreso: aumentarCuenta }),
      });
      message.success(cfg.aumentoOk);
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
    setAumentarCuenta('Nequi');
    setAumentarModal({ open: true, doc });
  };

  // ─── Fila expandible: estado de cuenta / movimientos ──────────────────────────
  const expandedRowRender = (rec) => {
    const movimientos = buildMovimientos(rec, cfg);

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
                {r.tipo === 'inicial' ? 'Inicial' : (r.tipo === 'aumento' ? 'Aumento' : 'Abono')}
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
        render: (_, r) => (
          <MontoMovimientoCell
            cuentaId={rec.id}
            mov={r}
            onSaved={cargarDatos}
            servicio={servicio}
            colorSaldo={SALDO}
          />
        ),
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
          <FileProtectOutlined style={{ color: ACCENT }} />
          <Text strong style={{ fontSize: 13 }}>{titulo || '—'}</Text>
        </Space>
      ),
    },
    {
      title: cfg.columnaContacto,
      key: 'contacto',
      sorter: (a, b) =>
        (a.persona_nombre || a[cfg.nombreCol] || '').localeCompare(b.persona_nombre || b[cfg.nombreCol] || ''),
      render: (_, rec) => (
        <Text>{rec.persona_nombre || rec[cfg.nombreCol] || <Text type="secondary">Sin contacto</Text>}</Text>
      ),
    },
    {
      title: 'Cuotas',
      dataIndex: 'num_cuotas',
      key: 'num_cuotas',
      align: 'center',
      width: 80,
      sorter: (a, b) => (Number(a.num_cuotas) || 1) - (Number(b.num_cuotas) || 1),
      render: (n) => {
        const cuotas = Math.max(1, Number(n) || 1);
        return cuotas > 1
          ? <Tag style={{ fontSize: 11, marginInlineEnd: 0 }}>{cuotas}</Tag>
          : <Text type="secondary" style={{ fontSize: 12 }}>1</Text>;
      },
    },
    {
      title: 'Valor cuota',
      dataIndex: 'valor_cuota',
      key: 'valor_cuota',
      align: 'right',
      width: 130,
      sorter: (a, b) => valorCuotaDe(a) - valorCuotaDe(b),
      render: (_, rec) => <Text style={{ fontSize: 12 }}>{formatCurrency(valorCuotaDe(rec))}</Text>,
    },
    {
      title: 'Vencimiento',
      dataIndex: 'fecha_vencimiento',
      key: 'fecha_vencimiento',
      sorter: (a, b) => {
        const va = parseFechaDia(a.fecha_vencimiento)?.valueOf() || 0;
        const vb = parseFechaDia(b.fecha_vencimiento)?.valueOf() || 0;
        return va - vb;
      },
      render: (_, rec) => <VencimientoCell record={rec} onSaved={cargarDatos} servicio={servicio} />,
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
                <Text strong style={{ fontSize: 13, color: SALDO }}>{formatCurrency(saldo)}</Text>
                <Progress percent={pct} size="small" showInfo={false} strokeColor={ORANGE} style={{ marginBottom: 0 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  de {formatCurrency(total)}
                  {cargos.length > 0 && (
                    <span style={{ color: SALDO }}> · +{cargos.length} aumento{cargos.length > 1 ? 's' : ''}</span>
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
        items.push({
          key: 'editar',
          icon: <EditOutlined />,
          label: 'Editar',
          disabled: ['PAGADA', 'ANULADA'].includes(rec.estado),
          onClick: () => { setEditingDoc(rec); setFormOpen(true); },
        });
        {
          items.push({
            key: 'abono',
            icon: <WalletOutlined />,
            label: 'Registrar abono',
            disabled: ['PAGADA', 'ANULADA'].includes(rec.estado),
            onClick: () => {
              // Arranca proponiendo una cuota: es el caso normal.
              const vc    = valorCuotaDe(rec);
              const saldo = Math.max(0, (Number(rec.total) || 0) - (Number(rec.total_abonado) || 0));
              setAbonoCuotas(1);
              setAbonoMonto(vc > 0 ? Math.min(round2(vc), round2(saldo)) : null);
              setAbonoCuenta('Efectivo'); setAbonoNota('');
              setAbonoModal({ open: true, doc: rec });
            },
          });
          items.push({
            key: 'aumentar',
            icon: <PlusCircleOutlined />,
            label: cfg.accionAumentar,
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
      <style>{`
        .cpp-vencimiento-editable:hover { background: #f1f5f9; border-bottom-color: ${ACCENT}; }
        .cpp-vencimiento-editable:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
        .cpp-expand-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 6px; cursor: pointer;
          color: ${MUTED}; transition: background .2s, color .2s;
        }
        .cpp-expand-icon:hover { background: #f1f5f9; color: ${ACCENT}; }
        .cpp-expand-icon:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
        .cpp-monto-editable:hover { background: #f1f5f9; border-bottom-color: ${ACCENT}; }
        .cpp-monto-editable:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
      `}</style>

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <Title level={3} style={{ margin: 0 }}>Cuentas</Title>
          <Text type="secondary">{cfg.subtitulo}</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingDoc(null); setFormOpen(true); }}
          style={{ background: ACCENT, borderColor: ACCENT }}
        >
          {cfg.botonNuevo}
        </Button>
      </div>

      {onCambiarTipo && (
        <Tabs activeKey={tipo} onChange={onCambiarTipo} items={TABS} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title={cfg.tarjetaTotal}
            value={porPagar.saldo}
            formatter={(v) => formatCurrency(v)}
            prefix={<DollarOutlined style={{ color: SALDO }} />}
            valueStyle={{ color: SALDO, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{porPagar.qty} cuentas pendientes</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Pendientes"
            value={pendientes.sum}
            formatter={(v) => formatCurrency(v)}
            prefix={<ClockCircleOutlined style={{ color: BLUE }} />}
            valueStyle={{ color: BLUE, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{pendientes.qty} cuentas</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title="Con abonos"
            value={abonadas.saldo}
            formatter={(v) => formatCurrency(v)}
            prefix={<WalletOutlined style={{ color: ORANGE }} />}
            valueStyle={{ color: ORANGE, fontSize: 15 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>{abonadas.qty} · saldo restante</Text>
        </Card>
        <Card size="small" bordered={false} className="shadow-sm">
          <Statistic
            title={`Cuota de ${nombreMes}`}
            value={mes.total}
            formatter={(v) => formatCurrency(v)}
            prefix={<CalendarOutlined style={{ color: BLUE }} />}
            valueStyle={{ color: BLUE, fontSize: 15 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
            <Text type="secondary">
              {cfg.abonadoEnMes} <span style={{ color: GREEN, fontWeight: 600 }}>{formatCurrency(mes.pagado)}</span>
            </Text>
            <Text type="secondary">
              Falta <span style={{ color: SALDO, fontWeight: 600 }}>{formatCurrency(mes.saldo)}</span>
            </Text>
          </div>
          <Progress
            percent={mes.pct}
            size="small"
            strokeColor={GREEN}
            showInfo={false}
            style={{ marginTop: 4, marginBottom: 2 }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            borderTop: '1px dashed #e5e7eb', marginTop: 6, paddingTop: 5, fontSize: 11,
          }}>
            <Text type="secondary">Próximo · {nombreMesSig}</Text>
            <Text strong style={{ fontSize: 12 }}>
              {formatCurrency(mesSig.total)}
              {mesSig.qty > 0 && (
                <span style={{ color: MUTED, fontWeight: 400 }}> · {mesSig.qty}</span>
              )}
            </Text>
          </div>
        </Card>
      </div>

      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder={cfg.buscar}
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
          expandIcon: ({ expanded, onExpand, record }) => (
            <AntTooltip title={expanded ? 'Ocultar movimientos' : 'Ver movimientos'}>
              <span
                role="button"
                tabIndex={0}
                aria-label={expanded ? 'Ocultar movimientos' : 'Ver movimientos'}
                aria-expanded={expanded}
                onClick={(e) => onExpand(record, e)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(record, e); } }}
                className="cpp-expand-icon"
              >
                <DownOutlined
                  style={{
                    fontSize: 11,
                    transition: 'transform .2s',
                    transform: `rotate(${expanded ? 180 : 0}deg)`,
                  }}
                />
              </span>
            </AntTooltip>
          ),
        }}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} cuentas` }}
        scroll={{ x: 930 }}
      />

      {/* Drawer creación/edición */}
      <CuentaForm
        config={cfg}
        open={formOpen}
        editingDoc={editingDoc}
        onClose={() => { setFormOpen(false); setEditingDoc(null); }}
        onSaved={cargarDatos}
      />

      {/* Modal abono */}
      <Modal
        open={abonoModal.open}
        title={
          <Space>
            <WalletOutlined style={{ color: ORANGE }} />
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

          // El abono se propone por cuotas: N × valor de cuota, sin pasarse del saldo.
          const numCuotas     = Math.max(1, Number(abonoModal.doc.num_cuotas) || 1);
          const valorCuota    = valorCuotaDe(abonoModal.doc);
          const cuotasPagadas = valorCuota > 0 ? Math.floor(round2(abonado) / valorCuota) : 0;
          const cuotasFaltan  = Math.max(1, numCuotas - cuotasPagadas);
          const porCuotas     = numCuotas > 1 && valorCuota > 0;
          const montoDeCuotas = (n) => Math.min(round2(n * valorCuota), round2(saldo));
          const montoEsDeCuotas = (n) => Math.abs(round2(abonoMonto || 0) - montoDeCuotas(n)) < 0.005;
          // Cuántas cuotas representa el monto escrito a mano (para avisar si no cuadra).
          const cuotasDelMonto = valorCuota > 0 ? round2((Number(abonoMonto) || 0) / valorCuota) : 0;
          const elegirCuotas  = (n) => {
            const c = Math.max(1, Math.min(Math.trunc(Number(n) || 1), cuotasFaltan));
            setAbonoCuotas(c);
            setAbonoMonto(montoDeCuotas(c));
          };

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
                    <Text style={{ color: GREEN }}>{formatCurrency(abonado)}</Text>
                  </div>
                )}
                {porCuotas && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <Text type="secondary">Cuotas</Text>
                    <Text>
                      {cuotasPagadas} de {numCuotas} pagadas
                      <span style={{ color: '#94a3b8' }}> · {formatCurrency(valorCuota)} c/u</span>
                    </Text>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Saldo pendiente</span>
                  <span style={{ color: ORANGE }}>{formatCurrency(saldo)}</span>
                </div>
                {abonado > 0 && (
                  <Progress
                    percent={Math.min(100, Math.round((abonado / total) * 100))}
                    size="small" strokeColor={GREEN} style={{ marginTop: 8, marginBottom: 0 }}
                  />
                )}
              </div>

              {porCuotas && (
                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    ¿Cuántas cuotas abonas?
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <InputNumber
                      size="large" min={1} max={cuotasFaltan} precision={0}
                      value={abonoCuotas}
                      onChange={elegirCuotas}
                      style={{ width: 90 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      de {cuotasFaltan} pendiente{cuotasFaltan === 1 ? '' : 's'} ={' '}
                      <strong style={{ color: ORANGE }}>{formatCurrency(montoDeCuotas(abonoCuotas))}</strong>
                    </Text>
                  </div>
                  {cuotasFaltan > 1 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {[...new Set([1, 2, 3, cuotasFaltan])]
                        .filter((n) => n >= 1 && n <= cuotasFaltan)
                        .map((n) => (
                          <Button
                            key={n}
                            size="small"
                            type={montoEsDeCuotas(n) ? 'primary' : 'default'}
                            onClick={() => elegirCuotas(n)}
                            style={montoEsDeCuotas(n) ? { background: ORANGE, borderColor: ORANGE } : undefined}
                          >
                            {n === cuotasFaltan && n > 3 ? `Todas (${n})` : `${n} cuota${n === 1 ? '' : 's'}`}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Monto del abono <span style={{ color: '#ef4444' }}>*</span>
                </Text>
                <InputNumber
                  style={{ width: '100%' }} size="large" min={currStep} max={saldo}
                  value={abonoMonto}
                  onChange={setAbonoMonto}
                  formatter={currFormatter}
                  parser={currParser}
                  precision={currPrecision}
                  step={currStep}
                  placeholder="Monto a abonar"
                  addonAfter={
                    <span
                      style={{ cursor: 'pointer', color: ORANGE, fontSize: 11, fontWeight: 600 }}
                      onClick={() => setAbonoMonto(saldo)}
                    >{cfg.saldarTodo}</span>
                  }
                />
                {porCuotas && cuotasDelMonto > 0 && !Number.isInteger(cuotasDelMonto) && (
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Equivale a {cuotasDelMonto.toLocaleString('es-CO')} cuotas (no es un número exacto).
                  </Text>
                )}
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
                          <span style={{ fontWeight: 600, color: GREEN }}>{formatCurrency(a.monto)}</span>
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
            <PlusCircleOutlined style={{ color: SALDO }} />
            <span>{cfg.accionAumentar}</span>
          </Space>
        }
        okText={cfg.accionAumentar}
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
                {cfg.ayudaAumentar(aumentarModal.doc.persona_nombre || aumentarModal.doc[cfg.nombreCol])}
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
                  <Text style={{ color: SALDO }}>{formatCurrency(saldo)}</Text>
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
                      <span style={{ color: SALDO }}>{formatCurrency(nuevoSaldo)}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Monto a aumentar <span style={{ color: '#ef4444' }}>*</span>
                </Text>
                <InputNumber
                  style={{ width: '100%' }} size="large" min={currStep}
                  value={aumentarMonto}
                  onChange={setAumentarMonto}
                  formatter={currFormatter}
                  parser={currParser}
                  precision={currPrecision}
                  step={currStep}
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

              {cfg.generaEgreso && (
                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Cuenta de salida</Text>
                  <Select
                    value={aumentarCuenta} onChange={setAumentarCuenta}
                    style={{ width: '100%' }} size="large"
                    options={cuentaOptions}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Se registra un egreso por este monto en Movimientos.
                  </Text>
                </div>
              )}

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
                          <span style={{ fontWeight: 600, color: SALDO }}>+{formatCurrency(c.monto)}</span>
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

export default CuentasDashboard;
