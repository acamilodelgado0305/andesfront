// Hojas de acción de una cuenta: registrar un abono, ajustar el saldo a mano y
// aumentar la deuda (o prestar más). En el celular suben desde abajo; en el
// computador se abren como panel a la derecha.
import React, { useEffect, useState } from 'react';
import { Input, InputNumber, message } from 'antd';
import BottomSheet from '../common/BottomSheet';
import { BotonPrincipal, ChipOpcion } from '../Certificados/mobile/piezas';
import { cuentaOptions } from '../Certificados/options';
import { useAmountShort, useCurrencyInput } from '../../hooks/useCurrency';
import {
  saldoDe, valorCuotaDe, numCuotasDe, cuotasPagadasDe, round2, parseArr, esAjuste, aumentosDe,
} from './cuentasUtils';

const MEDIOS = ['Efectivo', 'Nequi', 'Daviplata', 'Bancolombia', 'Transferencia', 'Otra'];
const MEDIO_KEY = 'qc-cuentas-medio';
const leerMedio = () => { try { return localStorage.getItem(MEDIO_KEY) || 'Efectivo'; } catch { return 'Efectivo'; } };
const guardarMedio = (v) => { try { localStorage.setItem(MEDIO_KEY, v); } catch { /* sin almacenamiento */ } };

const Etiqueta = ({ children }) => (
  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--qc-text-muted)', margin: '16px 0 6px' }}>{children}</div>
);

const Fila = ({ izq, der, fuerte, color }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10,
    fontSize: fuerte ? 15 : 13.5, fontWeight: fuerte ? 800 : 500, padding: '3px 0',
  }}>
    <span style={{ color: fuerte ? 'var(--qc-text)' : 'var(--qc-text-muted)' }}>{izq}</span>
    <span style={{ color: color || 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>{der}</span>
  </div>
);

const Caja = ({ children }) => (
  <div style={{ background: 'var(--qc-relleno)', borderRadius: 14, padding: '12px 14px' }}>{children}</div>
);

const Chips = ({ children }) => (
  <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>{children}</div>
);

const Hoja = ({ abierta, onCerrar, titulo, subtitulo, esMovil, boton, onConfirmar, cargando, deshabilitado, children }) => (
  <BottomSheet
    open={abierta}
    onClose={onCerrar}
    title={titulo}
    subtitle={subtitulo}
    lateral={!esMovil}
    autoFocus={false}
    footer={(
      <BotonPrincipal
        onClick={deshabilitado ? undefined : onConfirmar}
        cargando={cargando}
        style={{ width: '100%', height: 52, borderRadius: 26, fontSize: 16, opacity: deshabilitado ? 0.4 : 1, cursor: deshabilitado ? 'not-allowed' : 'pointer' }}
      >
        {boton}
      </BotonPrincipal>
    )}
  >
    {children}
  </BottomSheet>
);

const CampoMonto = ({ value, onChange, max, placeholder, autoFocus, onEnter }) => {
  const { formatter, parser, precision, step } = useCurrencyInput();
  return (
    <InputNumber
      autoFocus={autoFocus}
      inputMode="decimal"
      style={{ width: '100%', fontSize: 22, fontWeight: 700 }}
      size="large"
      min={0}
      max={max}
      value={value}
      onChange={onChange}
      formatter={formatter}
      parser={parser}
      precision={precision}
      step={step}
      placeholder={placeholder}
      onPressEnter={onEnter}
    />
  );
};

// ─── Abono ──────────────────────────────────────────────────────────────────
export const HojaAbono = ({ cuenta, cfg, esMovil, onCerrar, onHecho }) => {
  const fmt = useAmountShort();
  const [monto, setMonto] = useState(null);
  const [medio, setMedio] = useState(leerMedio);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const saldo   = cuenta ? saldoDe(cuenta) : 0;
  const n       = cuenta ? numCuotasDe(cuenta) : 1;
  const vc      = cuenta ? valorCuotaDe(cuenta) : 0;
  const pagadas = cuenta ? cuotasPagadasDe(cuenta) : 0;
  const faltan  = Math.max(1, n - pagadas);
  const porCuotas = n > 1 && vc > 0;
  const deCuotas = (k) => Math.min(round2(k * vc), saldo);

  useEffect(() => {
    if (!cuenta) return;
    setMonto(porCuotas ? deCuotas(1) : saldo);
    setNota('');
  }, [cuenta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = async () => {
    if (!monto || monto <= 0) return;
    setGuardando(true);
    try {
      await cfg.servicio.registrarAbono(cuenta.id, { monto, cuenta: medio, nota });
      guardarMedio(medio);
      message.success(monto >= saldo ? `${cfg.verboAbono} completo: cuenta saldada 🎉` : `${cfg.verboAbono} de ${fmt(monto)} registrado`);
      onHecho();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo registrar el abono');
    } finally {
      setGuardando(false);
    }
  };

  const opcionesCuotas = porCuotas ? [...new Set([1, 2, 3, faltan])].filter((k) => k <= faltan) : [];

  return (
    <Hoja
      abierta={!!cuenta}
      onCerrar={onCerrar}
      esMovil={esMovil}
      titulo={cfg.accionAbonar}
      subtitulo={cuenta?.titulo}
      boton={monto ? `${cfg.accionAbonar} ${fmt(monto)}` : cfg.accionAbonar}
      onConfirmar={confirmar}
      cargando={guardando}
      deshabilitado={!monto || monto <= 0 || monto > saldo + 0.001}
    >
      {cuenta && (
        <>
          <Caja>
            <Fila izq="Saldo pendiente" der={fmt(saldo)} fuerte color={cfg.colorSaldo} />
            {porCuotas && <Fila izq="Cuotas" der={`${pagadas} de ${n} pagadas · ${fmt(vc)} c/u`} />}
          </Caja>

          {porCuotas && (
            <>
              <Etiqueta>¿Cuántas cuotas?</Etiqueta>
              <Chips>
                {opcionesCuotas.map((k) => (
                  <ChipOpcion key={k} activo={Math.abs((monto || 0) - deCuotas(k)) < 0.005} onClick={() => setMonto(deCuotas(k))}>
                    {k === faltan && k > 1 ? `Todas (${k})` : `${k} cuota${k === 1 ? '' : 's'}`}
                  </ChipOpcion>
                ))}
              </Chips>
            </>
          )}

          <Etiqueta>Monto</Etiqueta>
          <CampoMonto value={monto} onChange={setMonto} max={saldo} placeholder="0" onEnter={confirmar} />
          {monto !== saldo && (
            <div style={{ marginTop: 8 }}>
              <ChipOpcion onClick={() => setMonto(saldo)}>{cfg.saldarTodo}: {fmt(saldo)}</ChipOpcion>
            </div>
          )}

          <Etiqueta>Medio de pago</Etiqueta>
          <Chips>
            {MEDIOS.map((m) => <ChipOpcion key={m} activo={medio === m} onClick={() => setMedio(m)}>{m}</ChipOpcion>)}
          </Chips>

          <Etiqueta>Nota (opcional)</Etiqueta>
          <Input size="large" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Transferencia #1234" />
        </>
      )}
    </Hoja>
  );
};

// ─── Ajustar saldo ──────────────────────────────────────────────────────────
export const HojaAjuste = ({ cuenta, cfg, esMovil, onCerrar, onHecho }) => {
  const fmt = useAmountShort();
  const [nuevo, setNuevo] = useState(null);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const saldo = cuenta ? saldoDe(cuenta) : 0;
  useEffect(() => { if (cuenta) { setNuevo(saldo); setNota(''); } }, [cuenta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = round2(Number(nuevo) || 0);
  const dif = round2(valor - saldo);
  const ajustes = cuenta ? parseArr(cuenta.cargos).filter(esAjuste) : [];

  const confirmar = async () => {
    if (nuevo == null || dif === 0) return;
    setGuardando(true);
    try {
      await cfg.servicio.ajustarSaldo(cuenta.id, { saldo: valor, nota });
      message.success(`Saldo ajustado a ${fmt(valor)}`);
      onHecho();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo ajustar el saldo');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Hoja
      abierta={!!cuenta}
      onCerrar={onCerrar}
      esMovil={esMovil}
      titulo="Ajustar saldo"
      subtitulo={cuenta?.titulo}
      boton="Guardar saldo"
      onConfirmar={confirmar}
      cargando={guardando}
      deshabilitado={nuevo == null || nuevo < 0 || dif === 0}
    >
      {cuenta && (
        <>
          <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginBottom: 12 }}>
            Escribe el saldo real que queda (intereses, una multa, un descuento, un acuerdo…).
            La diferencia queda como ajuste en los movimientos; los abonos no cambian.
          </div>
          <Caja>
            <Fila izq="Saldo actual" der={fmt(saldo)} />
            {dif !== 0 && nuevo != null && (
              <>
                <Fila izq="Ajuste" der={`${dif < 0 ? '−' : '+'}${fmt(Math.abs(dif))}`} color={dif < 0 ? '#16a34a' : cfg.colorSaldo} />
                <Fila izq="Nuevo saldo" der={fmt(valor)} fuerte color={cfg.colorSaldo} />
              </>
            )}
          </Caja>
          {valor === 0 && dif !== 0 && (
            <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 6 }}>Con saldo en cero la cuenta queda saldada.</div>
          )}

          <Etiqueta>Nuevo saldo</Etiqueta>
          <CampoMonto value={nuevo} onChange={setNuevo} placeholder="Saldo pendiente real" onEnter={confirmar} />

          <Etiqueta>Motivo (opcional)</Etiqueta>
          <Input size="large" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Intereses de octubre" />

          {ajustes.length > 0 && (
            <>
              <Etiqueta>Ajustes anteriores</Etiqueta>
              {ajustes.slice().reverse().map((c, i) => (
                <Fila
                  key={c.id || i}
                  izq={`${new Date(c.fecha).toLocaleDateString('es-CO')}${c.nota ? ` · ${c.nota}` : ''}`}
                  der={`${Number(c.monto) < 0 ? '−' : '+'}${fmt(Math.abs(Number(c.monto) || 0))}`}
                  color={Number(c.monto) < 0 ? '#16a34a' : cfg.colorSaldo}
                />
              ))}
            </>
          )}
        </>
      )}
    </Hoja>
  );
};

// ─── Aumentar deuda / prestar más ───────────────────────────────────────────
export const HojaAumento = ({ cuenta, cfg, esMovil, onCerrar, onHecho }) => {
  const fmt = useAmountShort();
  const [monto, setMonto] = useState(null);
  const [nota, setNota] = useState('');
  const [salida, setSalida] = useState('Nequi');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (cuenta) { setMonto(null); setNota(''); setSalida('Nequi'); } }, [cuenta?.id]);

  const saldo = cuenta ? saldoDe(cuenta) : 0;
  const aumentos = cuenta ? aumentosDe(cuenta) : [];

  const confirmar = async () => {
    if (!monto || monto <= 0) return;
    setGuardando(true);
    try {
      await cfg.servicio.aumentarDeuda(cuenta.id, { monto, nota, ...(cfg.generaEgreso && { cuenta_egreso: salida }) });
      message.success(cfg.aumentoOk);
      onHecho();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo aumentar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Hoja
      abierta={!!cuenta}
      onCerrar={onCerrar}
      esMovil={esMovil}
      titulo={cfg.accionAumentar}
      subtitulo={cuenta?.titulo}
      boton={cfg.accionAumentar}
      onConfirmar={confirmar}
      cargando={guardando}
      deshabilitado={!monto || monto <= 0}
    >
      {cuenta && (
        <>
          <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginBottom: 12 }}>
            {cfg.ayudaAumentar(cuenta.persona_nombre || cuenta[cfg.nombreCol])}
          </div>
          <Caja>
            <Fila izq="Saldo actual" der={fmt(saldo)} />
            {monto > 0 && <Fila izq="Nuevo saldo" der={fmt(saldo + monto)} fuerte color={cfg.colorSaldo} />}
          </Caja>

          <Etiqueta>Monto a sumar</Etiqueta>
          <CampoMonto value={monto} onChange={setMonto} placeholder="0" onEnter={confirmar} />

          <Etiqueta>Motivo (opcional)</Etiqueta>
          <Input size="large" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Nuevo préstamo del 15/07" />

          {cfg.generaEgreso && (
            <>
              <Etiqueta>Sale de</Etiqueta>
              <Chips>
                {cuentaOptions.map((o) => (
                  <ChipOpcion key={o.value} activo={salida === o.value} onClick={() => setSalida(o.value)}>{o.label}</ChipOpcion>
                ))}
              </Chips>
              <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 6 }}>Se registra un egreso por este monto en Movimientos.</div>
            </>
          )}

          {aumentos.length > 0 && (
            <>
              <Etiqueta>Aumentos anteriores</Etiqueta>
              {aumentos.slice().reverse().map((c, i) => (
                <Fila
                  key={c.id || i}
                  izq={`${new Date(c.fecha).toLocaleDateString('es-CO')}${c.nota ? ` · ${c.nota}` : ''}`}
                  der={`+${fmt(c.monto)}`}
                  color={cfg.colorSaldo}
                />
              ))}
            </>
          )}
        </>
      )}
    </Hoja>
  );
};
