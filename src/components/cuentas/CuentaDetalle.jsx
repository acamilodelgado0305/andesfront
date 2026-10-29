// Detalle de una cuenta: cuánto falta, cuándo es el próximo pago, las acciones
// a un toque y el estado de cuenta (movimientos con saldo corrido).
import React, { useRef, useState } from 'react';
import { Dropdown, InputNumber, Modal, message } from 'antd';
import DatePicker from '../common/DatePicker';
import {
  MoreOutlined, EditOutlined, DeleteOutlined, StopOutlined, UndoOutlined,
  WhatsAppOutlined, CalendarOutlined, SlidersOutlined, PlusCircleOutlined, CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import BottomSheet from '../common/BottomSheet';
import { BotonCircular, Circulo, inicialDe } from '../Certificados/mobile/piezas';
import { BarraProgreso } from '../tareas/piezasTareas';
import useCurrency, { useAmountShort, useCurrencyInput, useTypedAmount } from '../../hooks/useCurrency';
import { parseFechaDia, toFechaDiaPayload } from '../../utils/fechas';
import {
  saldoDe, numCuotasDe, valorCuotaDe, cuotasPagadasDe, proximoPago, estaVencida,
  buildMovimientos, textoFecha, nombreContacto, enlaceWhatsApp,
} from './cuentasUtils';

const COLOR_TIPO_MOV = { inicial: 'var(--qc-text-muted)', aumento: '#dc2626', ajuste: '#d97706', abono: '#16a34a' };

// Monto de un movimiento: un toque para corregirlo.
const MontoMovimiento = ({ cuentaId, mov, servicio, onGuardado, colorSaldo }) => {
  const fmt = useCurrency();
  const corto = useAmountShort();
  const { formatter, parser, precision, step } = useCurrencyInput();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(Math.abs(Number(mov.monto) || 0));
  const [guardando, setGuardando] = useState(false);
  // Enter dispara onPressEnter y además el onBlur al desmontarse: evita el doble PUT.
  const enCurso = useRef(false);

  const original = Math.abs(Number(mov.monto) || 0);
  const sinId = (mov.tipo === 'abono' || mov.tipo === 'aumento') && /^(abono|cargo)-\d+$/.test(String(mov.key));
  const editable = !sinId && mov.tipo !== 'ajuste';

  const guardar = async () => {
    if (enCurso.current) return;
    const nuevo = Number(valor);
    if (!Number.isFinite(nuevo) || nuevo <= 0) { message.error('El monto debe ser mayor a 0'); return; }
    if (nuevo === original) { setEditando(false); return; }
    enCurso.current = true;
    setGuardando(true);
    try {
      await servicio.editarMontoMovimiento(cuentaId, mov.key, { monto: nuevo });
      message.success(`Movimiento corregido a ${fmt(nuevo)}`);
      setEditando(false);
      await onGuardado();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo corregir el movimiento');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <InputNumber
        autoFocus size="small" style={{ width: 130 }} min={step}
        value={valor} onChange={setValor}
        formatter={formatter} parser={parser} precision={precision} step={step}
        disabled={guardando} onPressEnter={guardar} onBlur={guardar}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditando(false); } }}
      />
    );
  }

  const negativo = Number(mov.monto) < 0;
  const texto = (
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums', color: negativo ? '#16a34a' : colorSaldo }}>
      {negativo ? '−' : '+'}{corto(original)}
    </span>
  );
  if (!editable) return texto;
  return (
    <button
      type="button"
      title="Toca para corregir el monto"
      onClick={() => { setValor(original); setEditando(true); }}
      style={{ border: 'none', background: 'none', padding: '2px 4px', margin: '-2px -4px', borderRadius: 6, cursor: 'pointer', borderBottom: '1px dashed var(--qc-border)' }}
    >
      {texto}
    </button>
  );
};

const BotonAccion = ({ icono, texto, onClick, principal, color }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      minHeight: 66, padding: '8px 4px', borderRadius: 14, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      border: principal ? 'none' : '1px solid var(--qc-border)',
      background: principal ? (color || 'var(--qc-text)') : 'var(--qc-surface)',
      color: principal ? '#fff' : 'var(--qc-text)',
    }}
  >
    <span style={{ fontSize: 19, lineHeight: 1 }}>{icono}</span>
    {texto}
  </button>
);

const CuentaDetalle = ({
  cuenta, cfg, esMovil, onCerrar, onRecargar,
  onAbonar, onAjustar, onAumentar, onEditar,
}) => {
  const fmt = useCurrency();
  const corto = useAmountShort();
  const { codigo } = useTypedAmount();
  const [cambiandoFecha, setCambiandoFecha] = useState(false);
  if (!cuenta) return <BottomSheet open={false} onClose={onCerrar} />;

  const { servicio } = cfg;
  const saldo   = saldoDe(cuenta);
  const total   = Number(cuenta.total) || 0;
  const abonado = Number(cuenta.total_abonado) || 0;
  const n       = numCuotasDe(cuenta);
  const vc      = valorCuotaDe(cuenta);
  const pagadas = cuotasPagadasDe(cuenta);
  const prox    = proximoPago(cuenta);
  const vencida = estaVencida(cuenta);
  const contacto = nombreContacto(cuenta, cfg.nombreCol);
  const anulada = cuenta.estado === 'ANULADA';
  const saldada = !anulada && saldo <= 0;
  const movs    = buildMovimientos(cuenta, cfg);
  const vence   = parseFechaDia(cuenta.fecha_vencimiento);

  const wa = cuenta.persona_celular && !anulada && !saldada && enlaceWhatsApp(
    cuenta.persona_celular,
    cfg.generaEgreso
      ? `Hola ${contacto.split(' ')[0] || ''}, te recuerdo el saldo pendiente de ${fmt(saldo)} por "${cuenta.titulo}".${prox ? ` Próxima cuota: ${fmt(prox.monto)}.` : ''} ¡Gracias!`
      : `Hola ${contacto.split(' ')[0] || ''}, te escribo por "${cuenta.titulo}". Saldo pendiente: ${fmt(saldo)}.`,
  );

  const cambiarEstado = (estado, texto) => Modal.confirm({
    title: texto,
    okText: 'Sí', cancelText: 'No',
    onOk: async () => {
      try {
        await servicio.updateCuenta(cuenta.id, { estado });
        message.success('Listo');
        onRecargar();
      } catch { message.error('No se pudo cambiar el estado'); }
    },
  });

  const eliminar = () => Modal.confirm({
    title: `¿Eliminar "${cuenta.titulo}"?`,
    content: cfg.generaEgreso
      ? 'También se borrarán sus egresos en Movimientos. No se puede deshacer.'
      : 'Se borra con todos sus movimientos. No se puede deshacer.',
    okText: 'Eliminar', okButtonProps: { danger: true }, cancelText: 'Cancelar',
    onOk: async () => {
      try {
        await servicio.deleteCuenta(cuenta.id);
        message.success(cfg.eliminada);
        onCerrar();
        onRecargar();
      } catch { message.error('No se pudo eliminar'); }
    },
  });

  const guardarVencimiento = async (fecha) => {
    setCambiandoFecha(false);
    if ((fecha ? fecha.format('YYYY-MM-DD') : null) === (vence ? vence.format('YYYY-MM-DD') : null)) return;
    try {
      await servicio.updateCuenta(cuenta.id, { fecha_vencimiento: toFechaDiaPayload(fecha) });
      message.success(fecha ? `Vence el ${fecha.format('DD/MM/YYYY')}` : 'Sin fecha de vencimiento');
      onRecargar();
    } catch { message.error('No se pudo cambiar el vencimiento'); }
  };

  const menu = {
    items: [
      { key: 'editar', icon: <EditOutlined />, label: 'Editar datos', disabled: anulada, onClick: onEditar },
      anulada
        ? { key: 'reactivar', icon: <UndoOutlined />, label: 'Reactivar', onClick: () => cambiarEstado(abonado > 0 ? 'ABONO' : 'PENDIENTE', '¿Reactivar esta cuenta?') }
        : { key: 'anular', icon: <StopOutlined />, label: 'Anular', onClick: () => cambiarEstado('ANULADA', '¿Anular esta cuenta? Deja de contar en los totales.') },
      { type: 'divider' },
      { key: 'eliminar', icon: <DeleteOutlined />, label: 'Eliminar', danger: true, onClick: eliminar },
    ],
  };

  const encabezado = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: cfg.colorSaldo }}>
      {cfg.flecha} {cfg.lado}
    </span>
  );

  return (
    <BottomSheet
      open={!!cuenta}
      onClose={onCerrar}
      title={encabezado}
      extra={(
        <Dropdown trigger={['click']} menu={menu} placement="bottomRight">
          <span><BotonCircular label="Más opciones" size={38}><MoreOutlined /></BotonCircular></span>
        </Dropdown>
      )}
      lateral={!esMovil}
      width={480}
      height="92vh"
      maxHeight="92vh"
    >
      {/* Quién y qué */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Circulo size={48}>{inicialDe(contacto || cuenta.titulo)}</Circulo>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--qc-text)', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{cuenta.titulo}</div>
          <div style={{ fontSize: 13.5, color: 'var(--qc-text-muted)' }}>{contacto || 'Sin contacto'}</div>
        </div>
      </div>

      {/* Saldo */}
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>
          {anulada ? 'Cuenta anulada' : saldada ? 'Saldada' : cfg.textoSaldo(contacto)}
        </div>
        <div style={{
          fontSize: 40, fontWeight: 800, letterSpacing: -1, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15,
          color: anulada || saldada ? 'var(--qc-text-muted)' : cfg.colorSaldo,
          textDecoration: anulada ? 'line-through' : 'none',
        }}>
          {corto(saldo)} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--qc-text-muted)', letterSpacing: 0 }}>{codigo}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>
          {corto(abonado)} {cfg.generaEgreso ? 'cobrado' : 'pagado'} de {corto(total)}
        </div>
        <div style={{ maxWidth: 320, margin: '10px auto 0' }}>
          <BarraProgreso valor={abonado} total={total} color={cfg.colorSaldo} alto={8} />
        </div>
      </div>

      {/* Próximo pago y cuotas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
        <div style={{ background: vencida ? 'rgba(220,38,38,0.10)' : 'var(--qc-relleno)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ fontSize: 12, color: vencida ? '#dc2626' : 'var(--qc-text-muted)', fontWeight: 600 }}>
            {vencida ? 'Atrasado' : 'Próximo pago'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>
            {prox ? corto(prox.monto) : '—'}
          </div>
          <div style={{ fontSize: 12.5, color: vencida ? '#dc2626' : 'var(--qc-text-muted)' }}>
            {prox ? textoFecha(prox.fecha) : (saldada ? 'Nada pendiente' : '—')}
          </div>
        </div>
        <div style={{ background: 'var(--qc-relleno)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', fontWeight: 600 }}>Cuotas</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--qc-text)' }}>{n > 1 ? `${pagadas} de ${n}` : 'Pago único'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{n > 1 ? `${corto(vc)} c/u` : ' '}</div>
        </div>
      </div>

      {/* Vencimiento final */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--qc-text-muted)' }}>
        <CalendarOutlined />
        <span>{n > 1 ? 'Última cuota' : 'Vence'}:</span>
        {cambiandoFecha ? (
          <DatePicker
            autoFocus open allowClear size="small" format="DD/MM/YYYY"
            value={vence} onChange={guardarVencimiento}
            onOpenChange={(o) => { if (!o) setCambiandoFecha(false); }}
            inputReadOnly={esMovil}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCambiandoFecha(true)}
            disabled={anulada}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--qc-text)', fontWeight: 600, borderBottom: '1px dashed var(--qc-border)' }}
          >
            {vence ? vence.locale('es').format('D [de] MMMM YYYY') : 'Sin fecha'}
          </button>
        )}
      </div>

      {/* Acciones */}
      {!anulada && (
        <div style={{ display: 'grid', gridTemplateColumns: wa ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 8, marginTop: 18 }}>
          {!saldada && <BotonAccion principal color={cfg.colorSaldo} icono={<CheckOutlined />} texto={cfg.verboAbono === 'Pago' ? 'Pagar' : 'Cobrar'} onClick={onAbonar} />}
          <BotonAccion icono={<SlidersOutlined />} texto="Ajustar" onClick={onAjustar} />
          <BotonAccion icono={<PlusCircleOutlined />} texto={cfg.generaEgreso ? 'Prestar más' : 'Aumentar'} onClick={onAumentar} />
          {wa && <BotonAccion icono={<WhatsAppOutlined style={{ color: '#25d366' }} />} texto={cfg.generaEgreso ? 'Recordar' : 'Escribir'} onClick={() => window.open(wa, '_blank', 'noopener')} />}
          {saldada && <BotonAccion icono={<EditOutlined />} texto="Editar" onClick={onEditar} />}
        </div>
      )}

      {/* Estado de cuenta */}
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--qc-text-muted)', margin: '22px 0 6px' }}>
        Movimientos · {movs.length}
      </div>
      <div>
        {movs.slice().reverse().map((m) => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--qc-border)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_TIPO_MOV[m.tipo], flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--qc-text)' }}>{m.concepto}</div>
              <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', overflowWrap: 'anywhere' }}>
                {m.fecha ? dayjs(m.fecha).format('DD/MM/YYYY') : '—'}{m.detalle ? ` · ${m.detalle}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {anulada
                ? <span style={{ fontWeight: 700, fontSize: 14 }}>{corto(Math.abs(m.monto))}</span>
                : <MontoMovimiento cuentaId={cuenta.id} mov={m} servicio={servicio} onGuardado={onRecargar} colorSaldo={cfg.colorSaldo} />}
              <div style={{ fontSize: 11.5, color: 'var(--qc-text-muted)', fontVariantNumeric: 'tabular-nums' }}>Saldo {corto(m.saldo)}</div>
            </div>
          </div>
        ))}
      </div>

      {cuenta.notas && (
        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 12, background: 'var(--qc-relleno)', fontSize: 13.5, color: 'var(--qc-text)', whiteSpace: 'pre-wrap' }}>
          {cuenta.notas}
        </div>
      )}
      <div style={{ height: 12 }} />
    </BottomSheet>
  );
};

export default CuentaDetalle;
