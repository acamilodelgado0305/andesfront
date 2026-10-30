// src/components/documentosVenta/FacturasMovil.jsx
// Facturas en el celular, con el mismo estilo de Movimientos y Pedidos: número
// grande (lo que falta por cobrar), píldoras que filtran, lista con montos en
// pastilla y una ficha desde abajo con todas las acciones a un toque.
// Los datos y las acciones vienen del dashboard (DocumentosVentaDashboard).
import React, { useMemo, useState } from 'react';
import { Input, Progress, Skeleton } from 'antd';
import {
  CheckOutlined, ClockCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined,
  EyeOutlined, LeftOutlined, RightOutlined, StopOutlined, WalletOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import BottomSheet from '../common/BottomSheet';
import DatePicker from '../common/DatePicker';
import {
  BotonesFlotantes, BotonPrincipal, ChipOpcion, Circulo, COLOR_SIGNO, FondoApp, inicialDe,
  NumeroGrande, OpcionMenu, PastillaMonto, PildorasFiltro, Seccion, TituloPantalla,
} from '../Certificados/mobile/piezas';
import { useAmountShort, useTypedAmount } from '../../hooks/useCurrency';
import { parseFechaDia, formatFechaDia } from '../../utils/fechas';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ESTADO = {
  EMITIDA: { texto: 'Por cobrar', color: '#d97706' },
  ABONO:   { texto: 'Con abono', color: '#ea580c' },
  PAGADA:  { texto: 'Pagada', color: COLOR_SIGNO.ingreso },
  ANULADA: { texto: 'Anulada', color: '#9ca3af' },
};

const clienteDe = (d) => d.persona_nombre || d.cliente_nombre || 'Sin cliente';
const itemsDe = (d) => (Array.isArray(d.items) ? d.items : (() => { try { return JSON.parse(d.items || '[]'); } catch { return []; } })());
const porCobrar = (d) => ['EMITIDA', 'ABONO'].includes(d.estado);
const saldoDe = (d) => Math.max(0, Number(d.total || 0) - Number(d.total_abonado || 0));
const vencida = (d) => porCobrar(d) && parseFechaDia(d.fecha_vencimiento)?.isBefore(dayjs(), 'day');

const FacturasMovil = ({
  docs, loading, mes, onMes, busqueda, onBusqueda, cuentas,
  onNueva, onEditar, onVer, onPagar, onAbono, onDuplicar, onAnular, onEliminar, onVencimiento,
}) => {
  const montoCorto = useAmountShort();
  const { codigo } = useTypedAmount();
  const [vista, setVista] = useState(null); // null | 'cobrar' | 'pagadas'
  const [buscando, setBuscando] = useState(!!busqueda);
  const [fichaId, setFichaId] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [cuenta, setCuenta] = useState(cuentas[0]);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [cambiandoVence, setCambiandoVence] = useState(false);

  const activas = docs.filter((d) => d.estado !== 'ANULADA');
  const deCobrar = activas.filter(porCobrar);
  const pagadas = activas.filter((d) => d.estado === 'PAGADA');
  const pendiente = deCobrar.reduce((s, d) => s + saldoDe(d), 0);
  const facturado = activas.reduce((s, d) => s + Number(d.total || 0), 0);
  const vencidas = deCobrar.filter(vencida).length;

  const lista = useMemo(() => {
    const base = vista === 'cobrar' ? deCobrar : vista === 'pagadas' ? pagadas : docs;
    return [...base].sort((a, b) => String(b.fecha_emision).localeCompare(String(a.fecha_emision)) || b.id - a.id);
  }, [docs, vista]); // eslint-disable-line react-hooks/exhaustive-deps

  const ficha = docs.find((d) => d.id === fichaId) || null;
  const cargando = loading && docs.length === 0;

  const pildora = (icono, n, label, total) => (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15, minWidth: 0 }}>
      <span style={{ whiteSpace: 'nowrap' }}>{icono} {n} <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{label}</span></span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{montoCorto(total)}</span>
    </span>
  );

  const confirmarPago = async () => {
    setGuardandoPago(true);
    try {
      await onPagar(pagando, cuenta);
      setPagando(null);
    } finally {
      setGuardandoPago(false);
    }
  };

  const btnMes = {
    width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
    background: 'var(--qc-relleno)', color: 'var(--qc-text)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <FondoApp>
      <TituloPantalla>Facturas</TituloPantalla>

      {/* Mes: ‹ Octubre 2026 › · tocar el nombre = ver todos los meses */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
        <button type="button" aria-label="Mes anterior" style={btnMes} onClick={() => onMes((mes || dayjs()).subtract(1, 'month'))}><LeftOutlined /></button>
        <ChipOpcion activo={!mes} onClick={() => onMes(mes ? null : dayjs())} style={{ minWidth: 150 }}>
          {mes ? `${MESES[mes.month()]} ${mes.year()}` : 'Todos los meses'}
        </ChipOpcion>
        <button type="button" aria-label="Mes siguiente" style={btnMes} onClick={() => onMes((mes || dayjs()).add(1, 'month'))}><RightOutlined /></button>
      </div>

      <div style={{ textAlign: 'center', padding: '18px 0 16px' }}>
        <span style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>Por cobrar</span>
        <div style={{ marginTop: 4 }}>
          <NumeroGrande valor={cargando ? '…' : montoCorto(pendiente)} codigo={codigo} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>
          Facturado {montoCorto(facturado)}
          {vencidas > 0 && <span style={{ color: COLOR_SIGNO.gasto, fontWeight: 600 }}> · {vencidas} vencida{vencidas === 1 ? '' : 's'}</span>}
        </div>
      </div>

      <PildorasFiltro
        activo={vista}
        onCambiar={setVista}
        opciones={[
          { valor: 'cobrar', label: `Por cobrar: ${deCobrar.length}`, contenido: pildora(<ClockCircleOutlined />, deCobrar.length, 'Por cobrar', pendiente) },
          { valor: 'pagadas', label: `Pagadas: ${pagadas.length}`, contenido: pildora(<CheckOutlined />, pagadas.length, 'Pagadas', pagadas.reduce((s, d) => s + Number(d.total || 0), 0)) },
        ]}
      />

      {buscando && (
        <Input
          autoFocus
          allowClear
          size="large"
          placeholder="Buscar número o cliente…"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          style={{ marginTop: 12, borderRadius: 22, fontSize: 16 }}
        />
      )}

      {cargando ? (
        <div style={{ marginTop: 20 }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ padding: '10px 0' }}><Skeleton active avatar paragraph={{ rows: 1 }} title={false} /></div>)}
        </div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--qc-text-muted)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>
            {busqueda ? 'Nada coincide con la búsqueda' : 'No hay facturas aquí'}
          </div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>
            {mes ? 'Prueba otro mes o toca el mes para ver todas.' : 'Crea la primera con el botón +.'}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {lista.map((d) => {
            const est = ESTADO[d.estado] || ESTADO.EMITIDA;
            const anulada = d.estado === 'ANULADA';
            const venceTxt = porCobrar(d) && d.fecha_vencimiento
              ? (vencida(d) ? `venció ${formatFechaDia(d.fecha_vencimiento, 'DD/MM')}` : `vence ${formatFechaDia(d.fecha_vencimiento, 'DD/MM')}`)
              : formatFechaDia(d.fecha_emision, 'DD/MM/YY');
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => setFichaId(d.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFichaId(d.id); } }}
                className="qc-mov-fila"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', margin: '0 -4px',
                  borderRadius: 16, cursor: 'pointer', opacity: anulada ? 0.55 : 1,
                }}
              >
                <Circulo>{inicialDe(clienteDe(d))}</Circulo>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {clienteDe(d)}
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: est.color, fontWeight: 600 }}>● {est.texto}</span>
                    {' · '}
                    <span style={{ color: vencida(d) ? COLOR_SIGNO.gasto : undefined }}>{venceTxt}</span>
                    {' · '}{d.numero}
                  </span>
                </span>
                <PastillaMonto apagado={anulada}>{montoCorto(d.total)}</PastillaMonto>
              </div>
            );
          })}
        </div>
      )}

      <BotonesFlotantes
        onBuscar={() => { if (buscando) onBusqueda(''); setBuscando((v) => !v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        buscando={buscando}
        onPrincipal={onNueva}
        labelPrincipal="Nueva factura"
      />

      {/* ── Ficha de la factura ── */}
      <BottomSheet
        open={!!ficha}
        onClose={() => setFichaId(null)}
        title={ficha ? clienteDe(ficha) : ''}
        subtitle={ficha ? `${ficha.numero} · ${formatFechaDia(ficha.fecha_emision)}` : undefined}
      >
        {ficha && (() => {
          const est = ESTADO[ficha.estado] || ESTADO.EMITIDA;
          const total = Number(ficha.total || 0);
          const abonado = Number(ficha.total_abonado || 0);
          const cerrada = ['PAGADA', 'ANULADA'].includes(ficha.estado);
          const items = itemsDe(ficha);
          return (
            <>
              <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {montoCorto(total)} <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{codigo}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: est.color }}>{est.texto}</div>
                {abonado > 0 && ficha.estado !== 'PAGADA' && (
                  <div style={{ maxWidth: 260, margin: '8px auto 0' }}>
                    <Progress percent={Math.min(100, Math.round((abonado / total) * 100))} showInfo={false} strokeColor="#ea580c" size="small" />
                    <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
                      Abonado {montoCorto(abonado)} · Falta {montoCorto(saldoDe(ficha))}
                    </div>
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div style={{ background: 'var(--qc-relleno)', borderRadius: 14, padding: '8px 12px' }}>
                  {items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 14, color: 'var(--qc-text)' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {it.descripcion || 'Sin descripción'}
                        <span style={{ color: 'var(--qc-text-muted)' }}> × {it.cantidad || 1}</span>
                      </span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{montoCorto(it.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Seccion>Acciones</Seccion>
              {porCobrar(ficha) && (
                <OpcionMenu
                  icon={<CheckOutlined />}
                  titulo="Marcar como pagada"
                  detalle="Registra el ingreso en la cuenta que elijas"
                  onClick={() => { setCuenta(cuentas[0]); setPagando(ficha); }}
                />
              )}
              {porCobrar(ficha) && (
                <OpcionMenu icon={<WalletOutlined />} titulo="Registrar abono" detalle="Pago parcial" onClick={() => { setFichaId(null); onAbono(ficha); }} />
              )}
              <OpcionMenu
                icon={<EditOutlined />}
                titulo="Editar factura"
                detalle={cerrada ? `No se puede: ya está ${ficha.estado === 'PAGADA' ? 'pagada' : 'anulada'}` : 'Cliente, productos, fechas y notas'}
                onClick={() => { if (!cerrada) { setFichaId(null); onEditar(ficha); } }}
              />
              {ficha.estado !== 'ANULADA' && (
                <OpcionMenu
                  icon={<CalendarOutlined />}
                  titulo="Cambiar vencimiento"
                  detalle={ficha.fecha_vencimiento ? `Vence el ${formatFechaDia(ficha.fecha_vencimiento)}` : 'Sin fecha de vencimiento'}
                  onClick={() => setCambiandoVence(true)}
                />
              )}
              <OpcionMenu icon={<EyeOutlined />} titulo="Ver / descargar PDF" onClick={() => { setFichaId(null); onVer(ficha); }} />
              <OpcionMenu icon={<CopyOutlined />} titulo="Duplicar" onClick={() => onDuplicar(ficha)} />
              {ficha.estado !== 'ANULADA' && (
                <OpcionMenu icon={<StopOutlined />} titulo="Anular" onClick={() => onAnular(ficha)} />
              )}
              <OpcionMenu
                icon={<DeleteOutlined style={{ color: COLOR_SIGNO.gasto }} />}
                titulo={<span style={{ color: COLOR_SIGNO.gasto }}>Eliminar</span>}
                onClick={() => onEliminar(ficha, () => setFichaId(null))}
              />

              {/* El selector de fecha del celular se abre solo (sin campo visible). */}
              {cambiandoVence && (
                <div style={{ display: 'none' }}>
                  <DatePicker
                    open
                    value={parseFechaDia(ficha.fecha_vencimiento)}
                    placeholder="Vencimiento"
                    onChange={(d) => { setCambiandoVence(false); onVencimiento(ficha, d); }}
                    onOpenChange={(v) => { if (!v) setCambiandoVence(false); }}
                  />
                </div>
              )}
            </>
          );
        })()}
      </BottomSheet>

      {/* ── ¿Dónde entró el pago? ── */}
      <BottomSheet
        open={!!pagando}
        onClose={() => setPagando(null)}
        title="¿Dónde entró el pago?"
        subtitle={pagando ? `${pagando.numero} · ${montoCorto(saldoDe(pagando) || pagando.total)} ${codigo}` : undefined}
        zIndex={1200}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cuentas.map((c) => (
            <ChipOpcion key={c} activo={cuenta === c} onClick={() => setCuenta(c)} style={{ minHeight: 44 }}>{c}</ChipOpcion>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginTop: 12 }}>
          La factura queda pagada y la venta se registra como ingreso en esa cuenta.
        </div>
        <BotonPrincipal onClick={confirmarPago} cargando={guardandoPago} style={{ width: '100%', height: 52, borderRadius: 16, fontSize: 16, marginTop: 16 }}>
          Confirmar pago
        </BotonPrincipal>
      </BottomSheet>
    </FondoApp>
  );
};

export default FacturasMovil;
