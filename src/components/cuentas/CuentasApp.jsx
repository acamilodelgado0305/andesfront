// Cuentas: lo que me deben y lo que debo, en una sola pantalla.
// Arriba el balance (me deben − debo) y las dos píldoras que filtran; luego lo
// urgente (atrasado, esta semana, este mes) y la lista agrupada por el próximo
// pago. "Por persona" junta todo lo que hay con cada contacto.
// Celular y computador usan la misma vista (estilo app, como Tareas y Movimientos).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input, Spin, Empty, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import useIsMobile from '../../hooks/useIsMobile';
import { useAmountShort } from '../../hooks/useCurrency';
import BottomSheet from '../common/BottomSheet';
import {
  FondoApp, BotonesFlotantes, TituloPantalla, PildorasFiltro, Circulo, ChipFiltro, OpcionMenu, inicialDe,
} from '../Certificados/mobile/piezas';
import { BarraProgreso } from '../tareas/piezasTareas';
import { CUENTAS_CONFIG } from './cuentasConfig';
import CuentaForm from './CuentaForm';
import CuentaDetalle from './CuentaDetalle';
import { HojaAbono, HojaAjuste, HojaAumento } from './HojasCuenta';
import {
  saldoDe, estaAbierta, proximoPago, grupoDe, GRUPOS, textoFecha, numCuotasDe, cuotasPagadasDe,
  nombreContacto, abonadoEnMes, round2,
} from './cuentasUtils';

const LADOS = ['cobrar', 'pagar'];
const claveDe = (c) => `${c.tipo}-${c.id}`;

const Tile = ({ titulo, valor, detalle, color, onClick, activo, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activo}
    style={{
      textAlign: 'left', padding: '10px 12px', borderRadius: 14, cursor: onClick ? 'pointer' : 'default', minWidth: 0,
      background: 'var(--qc-surface)', border: `1px solid ${activo ? 'var(--qc-text)' : 'var(--qc-border)'}`,
    }}
  >
    <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--qc-text)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {valor}
    </div>
    {detalle && <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detalle}</div>}
    {children}
  </button>
);

const Seccion = ({ titulo, color, extra, children }) => (
  <section style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: color || 'var(--qc-text-muted)' }}>{titulo}</span>
      <div style={{ flex: 1 }} />
      {extra}
    </div>
    {children}
  </section>
);

const FilaCuenta = ({ c, mostrarLado, onAbrir, montoCorto }) => {
  const cfg = CUENTAS_CONFIG[c.tipo];
  const saldo = saldoDe(c);
  const total = Number(c.total) || 0;
  const prox = proximoPago(c);
  const n = numCuotasDe(c);
  const contacto = nombreContacto(c, cfg.nombreCol);
  const cerrada = !estaAbierta(c);
  const vencida = prox?.fecha && prox.fecha.isBefore(new Date(), 'day');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(c)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(c); } }}
      className="qc-mov-fila qc-cuenta-fila"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, cursor: 'pointer' }}
    >
      <div style={{ position: 'relative' }}>
        <Circulo size={42}>{inicialDe(contacto || c.titulo)}</Circulo>
        {mostrarLado && (
          <span style={{
            position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: '50%',
            background: cfg.colorSaldo, color: '#fff', fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--qc-bg)',
          }}>
            {cfg.flecha}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.titulo}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {contacto || 'Sin contacto'}
          {n > 1 && ` · cuota ${Math.min(n, cuotasPagadasDe(c) + (cerrada ? 0 : 1))}/${n}`}
        </div>
        {!cerrada && total > 0 && Number(c.total_abonado) > 0 && (
          <div style={{ marginTop: 5, maxWidth: 220 }}>
            <BarraProgreso valor={Number(c.total_abonado) || 0} total={total} color={cfg.colorSaldo} alto={4} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 15.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
          color: cerrada ? 'var(--qc-text-muted)' : cfg.colorSaldo,
          textDecoration: c.estado === 'ANULADA' ? 'line-through' : 'none',
        }}>
          {montoCorto(cerrada ? total : saldo)}
        </div>
        <div style={{ fontSize: 12, color: vencida ? '#dc2626' : 'var(--qc-text-muted)', fontWeight: vencida ? 700 : 400 }}>
          {c.estado === 'ANULADA' ? 'Anulada' : cerrada ? 'Saldada' : (n > 1 && prox ? `${montoCorto(prox.monto)} · ` : '') + textoFecha(prox?.fecha)}
        </div>
      </div>
    </div>
  );
};

const CuentasApp = () => {
  const esMovil = useIsMobile();
  const montoCorto = useAmountShort();
  const [params, setParams] = useSearchParams();

  const tabUrl = params.get('tab');
  const lado = LADOS.includes(tabUrl) ? tabUrl : null;
  const setLado = (v) => setParams(v ? { tab: v } : {}, { replace: true });

  const [cuentas, setCuentas] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [q, setQ] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [contacto, setContacto] = useState(null); // { clave, nombre }
  const [urgencia, setUrgencia] = useState(null); // 'vencidas' | 'semana' | 'mes'
  const [verCerradas, setVerCerradas] = useState(false);

  const [detalleId, setDetalleId] = useState(null);
  const [hoja, setHoja] = useState(null); // { tipo: 'abono'|'ajuste'|'aumento', id }
  const [form, setForm] = useState(null); // { tipo, cuenta? }
  const [elegirNueva, setElegirNueva] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await Promise.allSettled(LADOS.map((t) => CUENTAS_CONFIG[t].servicio.getCuentas()));
    const todas = [];
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') (r.value || []).forEach((c) => todas.push({ ...c, tipo: LADOS[i] }));
      else message.error(CUENTAS_CONFIG[LADOS[i]].errorCarga);
    });
    setCuentas(todas);
    setCargando(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const porClave = useMemo(() => Object.fromEntries((cuentas || []).map((c) => [claveDe(c), c])), [cuentas]);
  const detalle = detalleId ? porClave[detalleId] : null;
  const hojaCuenta = hoja ? porClave[hoja.id] : null;

  const contactoDe = (c) => {
    const nombre = nombreContacto(c, CUENTAS_CONFIG[c.tipo].nombreCol);
    return { clave: c.persona_id ? `p${c.persona_id}` : `n:${nombre.toLowerCase()}`, nombre };
  };

  // ── Totales ────────────────────────────────────────────────────────────
  const abiertas = useMemo(() => (cuentas || []).filter(estaAbierta), [cuentas]);
  const suma = (xs) => round2(xs.reduce((s, c) => s + saldoDe(c), 0));
  const meDeben = abiertas.filter((c) => c.tipo === 'cobrar');
  const debo    = abiertas.filter((c) => c.tipo === 'pagar');
  const totalMeDeben = suma(meDeben);
  const totalDebo    = suma(debo);
  const neto = round2(totalMeDeben - totalDebo);

  // Lo que se ve: lado + persona + búsqueda
  const pasa = useCallback((c) => {
    if (lado && c.tipo !== lado) return false;
    if (contacto && contactoDe(c).clave !== contacto.clave) return false;
    if (q) {
      const t = q.toLowerCase();
      const nombre = nombreContacto(c, CUENTAS_CONFIG[c.tipo].nombreCol).toLowerCase();
      if (!c.titulo?.toLowerCase().includes(t) && !nombre.includes(t)) return false;
    }
    return true;
  }, [lado, contacto, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = useMemo(() => abiertas.filter(pasa), [abiertas, pasa]);
  const cerradas = useMemo(() => (cuentas || []).filter((c) => !estaAbierta(c) && pasa(c))
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))), [cuentas, pasa]);

  const porGrupo = useMemo(() => {
    const g = {};
    visibles.forEach((c) => { const k = grupoDe(c); (g[k] = g[k] || []).push(c); });
    Object.values(g).forEach((xs) => xs.sort((a, b) => {
      const fa = proximoPago(a)?.fecha; const fb = proximoPago(b)?.fecha;
      if (!fa || !fb) return saldoDe(b) - saldoDe(a);
      return fa.valueOf() - fb.valueOf();
    }));
    return g;
  }, [visibles]);

  // Urgencias (sobre lo visible): monto de la cuota que toca, no el saldo entero.
  const montoGrupo = (claves) => round2(visibles.filter((c) => claves.includes(grupoDe(c))).reduce((s, c) => s + (proximoPago(c)?.monto || 0), 0));
  const nGrupo = (claves) => visibles.filter((c) => claves.includes(grupoDe(c))).length;
  const atrasado = { n: nGrupo(['vencidas']), monto: montoGrupo(['vencidas']) };
  const semana   = { n: nGrupo(['semana']), monto: montoGrupo(['semana']) };
  const mes      = { n: nGrupo(['vencidas', 'semana', 'mes']), monto: montoGrupo(['vencidas', 'semana', 'mes']) };
  const movidoMes = round2((cuentas || []).filter((c) => c.estado !== 'ANULADA' && pasa(c)).reduce((s, c) => s + abonadoEnMes(c), 0));

  const gruposUrgencia = { vencidas: ['vencidas'], semana: ['vencidas', 'semana'], mes: ['vencidas', 'semana', 'mes'] };
  const gruposVisibles = GRUPOS.filter((g) => porGrupo[g.clave]?.length && (!urgencia || gruposUrgencia[urgencia].includes(g.clave)));

  // ── Por persona ────────────────────────────────────────────────────────
  const personas = useMemo(() => {
    const m = new Map();
    abiertas.filter((c) => !lado || c.tipo === lado).forEach((c) => {
      const { clave, nombre } = contactoDe(c);
      if (!nombre) return;
      if (!m.has(clave)) m.set(clave, { clave, nombre, meDebe: 0, leDebo: 0, n: 0 });
      const p = m.get(clave);
      p[c.tipo === 'cobrar' ? 'meDebe' : 'leDebo'] += saldoDe(c);
      p.n += 1;
    });
    return [...m.values()].sort((a, b) => (b.meDebe + b.leDebo) - (a.meDebe + a.leDebo));
  }, [abiertas, lado]); // eslint-disable-line react-hooks/exhaustive-deps

  const textoPersona = (p) => {
    if (p.meDebe && p.leDebo) {
      const n = round2(p.meDebe - p.leDebo);
      return { texto: n >= 0 ? `Neto te debe ${montoCorto(n)}` : `Neto le debes ${montoCorto(-n)}`, color: n >= 0 ? CUENTAS_CONFIG.cobrar.colorSaldo : CUENTAS_CONFIG.pagar.colorSaldo };
    }
    return p.meDebe
      ? { texto: `Te debe ${montoCorto(p.meDebe)}`, color: CUENTAS_CONFIG.cobrar.colorSaldo }
      : { texto: `Le debes ${montoCorto(p.leDebo)}`, color: CUENTAS_CONFIG.pagar.colorSaldo };
  };

  const elegirPersona = (p) => setContacto((act) => (act?.clave === p.clave ? null : { clave: p.clave, nombre: p.nombre }));

  // ── Acciones ───────────────────────────────────────────────────────────
  const abrir = (c) => setDetalleId(claveDe(c));
  const abrirHoja = (tipo) => setHoja({ tipo, id: detalleId });
  const trasHoja = () => { setHoja(null); cargar(); };
  const nueva = (tipo) => { setElegirNueva(false); setForm({ tipo }); };

  const hayFiltros = lado || contacto || q || urgencia;
  const limpiar = () => { setLado(null); setContacto(null); setQ(''); setUrgencia(null); };

  // ── Piezas ─────────────────────────────────────────────────────────────
  const textoPildora = (t, total, n) => {
    const cfg = CUENTAS_CONFIG[t];
    return (
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap' }}>
          <span style={{ color: cfg.colorSaldo }}>{cfg.flecha}</span> {cfg.lado} · {n}
        </span>
        <span style={{ fontSize: 17, fontWeight: 800, color: cfg.colorSaldo, whiteSpace: 'nowrap' }}>{montoCorto(total)}</span>
      </span>
    );
  };

  const encabezado = (
    <div style={{ textAlign: esMovil ? 'center' : 'left' }}>
      <div style={{ fontSize: 13.5, color: 'var(--qc-text-muted)' }}>
        {neto === 0 ? 'Balance' : neto > 0 ? 'Balance a tu favor' : 'Balance en contra'}
      </div>
      <div style={{
        fontSize: esMovil ? 42 : 52, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
        color: neto === 0 ? 'var(--qc-text)' : neto > 0 ? CUENTAS_CONFIG.cobrar.colorSaldo : CUENTAS_CONFIG.pagar.colorSaldo,
      }}>
        {cuentas === null ? '…' : `${neto < 0 ? '−' : ''}${montoCorto(Math.abs(neto))}`}
      </div>
      <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>
        Lo que te deben menos lo que debes · {abiertas.length} cuenta{abiertas.length === 1 ? '' : 's'} abierta{abiertas.length === 1 ? '' : 's'}
      </div>
    </div>
  );

  const pildoras = (
    <PildorasFiltro
      activo={lado}
      onCambiar={setLado}
      opciones={[
        { valor: 'cobrar', label: `Me deben ${montoCorto(totalMeDeben)}`, contenido: textoPildora('cobrar', totalMeDeben, meDeben.length) },
        { valor: 'pagar', label: `Debo ${montoCorto(totalDebo)}`, contenido: textoPildora('pagar', totalDebo, debo.length) },
      ]}
    />
  );

  const tiles = (
    <div style={{ display: 'grid', gridTemplateColumns: esMovil ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
      <Tile
        titulo="Atrasado" valor={montoCorto(atrasado.monto)} color={atrasado.n ? '#dc2626' : 'var(--qc-text-muted)'}
        detalle={atrasado.n ? `${atrasado.n} cuenta${atrasado.n === 1 ? '' : 's'}` : 'Todo al día 🎉'}
        onClick={() => setUrgencia((u) => (u === 'vencidas' ? null : 'vencidas'))} activo={urgencia === 'vencidas'}
      />
      <Tile
        titulo="Próximos 7 días" valor={montoCorto(semana.monto)} color={semana.n ? '#d97706' : 'var(--qc-text-muted)'}
        detalle={`${semana.n} pago${semana.n === 1 ? '' : 's'}`}
        onClick={() => setUrgencia((u) => (u === 'semana' ? null : 'semana'))} activo={urgencia === 'semana'}
      />
      <Tile
        titulo="Resta este mes" valor={montoCorto(mes.monto)}
        detalle={`${mes.n} cuota${mes.n === 1 ? '' : 's'} hasta fin de mes`}
        onClick={() => setUrgencia((u) => (u === 'mes' ? null : 'mes'))} activo={urgencia === 'mes'}
      />
      <Tile
        titulo={lado === 'pagar' ? 'Pagado este mes' : lado === 'cobrar' ? 'Cobrado este mes' : 'Abonado este mes'}
        valor={montoCorto(movidoMes)} color="#16a34a"
      >
        <div style={{ marginTop: 6 }}>
          <BarraProgreso valor={movidoMes} total={movidoMes + mes.monto} color="#16a34a" alto={5} />
        </div>
      </Tile>
    </div>
  );

  const listaPersonas = personas.length > 0 && (
    esMovil ? (
      <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px' }}>
        {personas.map((p) => {
          const t = textoPersona(p);
          const activo = contacto?.clave === p.clave;
          return (
            <button
              key={p.clave} type="button" onClick={() => elegirPersona(p)} aria-pressed={activo}
              style={{
                flexShrink: 0, width: 132, padding: '10px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                background: 'var(--qc-surface)', border: `1px solid ${activo ? 'var(--qc-text)' : 'var(--qc-border)'}`,
              }}
            >
              <Circulo size={32}>{inicialDe(p.nombre)}</Circulo>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--qc-text)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.texto}</div>
            </button>
          );
        })}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {personas.slice(0, 12).map((p) => {
          const t = textoPersona(p);
          const activo = contacto?.clave === p.clave;
          return (
            <div
              key={p.clave} role="button" tabIndex={0}
              onClick={() => elegirPersona(p)}
              onKeyDown={(e) => { if (e.key === 'Enter') elegirPersona(p); }}
              className="qc-mov-fila qc-cuenta-fila"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 12, cursor: 'pointer',
                background: activo ? 'var(--qc-relleno-fuerte)' : undefined,
              }}
            >
              <Circulo size={34}>{inicialDe(p.nombre)}</Circulo>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{p.n} cuenta{p.n === 1 ? '' : 's'}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.color, textAlign: 'right' }}>{t.texto}</div>
            </div>
          );
        })}
      </div>
    )
  );

  const filtrosActivos = (contacto || urgencia || q) && (
    <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
      {contacto && <ChipFiltro onQuitar={() => setContacto(null)}>{contacto.nombre}</ChipFiltro>}
      {urgencia && <ChipFiltro onQuitar={() => setUrgencia(null)}>{{ vencidas: 'Atrasadas', semana: 'Próximos 7 días', mes: 'Este mes' }[urgencia]}</ChipFiltro>}
      {q && <ChipFiltro onQuitar={() => setQ('')}>“{q}”</ChipFiltro>}
    </div>
  );

  const lista = cuentas === null ? (
    <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
  ) : (
    <>
      {filtrosActivos}
      {gruposVisibles.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={hayFiltros ? 'Nada con estos filtros' : 'No tienes cuentas abiertas'}
          style={{ margin: '30px 0' }}
        >
          {hayFiltros
            ? <Button onClick={limpiar}>Ver todo</Button>
            : <Button type="primary" icon={<PlusOutlined />} onClick={() => setElegirNueva(true)}>Agregar cuenta</Button>}
        </Empty>
      )}
      {gruposVisibles.map((g) => {
        const xs = porGrupo[g.clave];
        const totalG = round2(xs.reduce((s, c) => s + (proximoPago(c)?.monto || 0), 0));
        return (
          <Seccion
            key={g.clave}
            titulo={`${g.titulo} · ${xs.length}`}
            color={g.color}
            extra={<span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--qc-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{montoCorto(totalG)}</span>}
          >
            {xs.map((c) => <FilaCuenta key={claveDe(c)} c={c} mostrarLado={!lado} onAbrir={abrir} montoCorto={montoCorto} />)}
          </Seccion>
        );
      })}

      {cerradas.length > 0 && !urgencia && (
        <Seccion titulo={`Saldadas y anuladas · ${cerradas.length}`}>
          <Button type="text" size="small" onClick={() => setVerCerradas((v) => !v)} icon={verCerradas ? <UpOutlined /> : <DownOutlined />} style={{ color: 'var(--qc-text-muted)', paddingLeft: 8 }}>
            {verCerradas ? 'Ocultar' : 'Mostrar'}
          </Button>
          {verCerradas && cerradas.map((c) => <FilaCuenta key={claveDe(c)} c={c} mostrarLado={!lado} onAbrir={abrir} montoCorto={montoCorto} />)}
        </Seccion>
      )}
    </>
  );

  const buscador = (
    <Input
      autoFocus={esMovil}
      allowClear
      size="large"
      prefix={<SearchOutlined />}
      placeholder="Buscar por título o persona"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      style={{ borderRadius: 22 }}
    />
  );

  const cfgDetalle = detalle ? CUENTAS_CONFIG[detalle.tipo] : CUENTAS_CONFIG.pagar;
  const cfgHoja = hojaCuenta ? CUENTAS_CONFIG[hojaCuenta.tipo] : CUENTAS_CONFIG.pagar;

  return (
    <FondoApp escritorio={!esMovil}>
      <style>{`
        @media (hover: hover) { .qc-cuenta-fila:hover { background: var(--qc-relleno); } }
      `}</style>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: esMovil ? 10 : 16 }}>
        <TituloPantalla escritorio={!esMovil}>Cuentas</TituloPantalla>
        <div style={{ flex: 1 }} />
        <Button type="text" icon={<ReloadOutlined spin={cargando && cuentas !== null} />} onClick={cargar} aria-label="Recargar" />
        {!esMovil && (
          <>
            <Button icon={<span style={{ color: CUENTAS_CONFIG.cobrar.colorSaldo, fontWeight: 800 }}>↓</span>} onClick={() => nueva('cobrar')}>
              {CUENTAS_CONFIG.cobrar.botonNuevo}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => nueva('pagar')}>
              {CUENTAS_CONFIG.pagar.botonNuevo} por pagar
            </Button>
          </>
        )}
      </div>

      {esMovil ? (
        <>
          {buscando && <div style={{ marginBottom: 12 }}>{buscador}</div>}
          {encabezado}
          <div style={{ marginTop: 14 }}>{pildoras}</div>
          <div style={{ marginTop: 12 }}>{tiles}</div>
          {listaPersonas && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--qc-text-muted)', marginBottom: 6 }}>Por persona</div>
              {listaPersonas}
            </div>
          )}
          <div style={{ marginTop: 18 }}>{lista}</div>
          <BotonesFlotantes
            onBuscar={() => { setBuscando((b) => !b); if (buscando) setQ(''); }}
            buscando={buscando}
            onPrincipal={() => setElegirNueva(true)}
            labelPrincipal="Nueva cuenta"
          />
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: 28, alignItems: 'end', marginBottom: 16 }}>
            {encabezado}
            {pildoras}
          </div>
          {tiles}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 28, alignItems: 'start', marginTop: 22 }}>
            <div>
              <div style={{ maxWidth: 420, marginBottom: 14 }}>{buscador}</div>
              {lista}
            </div>
            <div style={{ position: 'sticky', top: 12 }}>
              <Seccion titulo="Por persona">
                {listaPersonas || <div style={{ color: 'var(--qc-text-muted)', fontSize: 13, padding: '8px' }}>Sin cuentas abiertas con contactos.</div>}
              </Seccion>
            </div>
          </div>
        </>
      )}

      {/* ¿Qué vas a registrar? (celular, y "Agregar cuenta" sin filtros) */}
      <BottomSheet open={elegirNueva} onClose={() => setElegirNueva(false)} title="Nueva cuenta" lateral={!esMovil}>
        <OpcionMenu
          icon={<span style={{ color: CUENTAS_CONFIG.pagar.colorSaldo, fontWeight: 800 }}>↑</span>}
          titulo="Debo"
          detalle="Una deuda con un proveedor, un banco o alguien que te prestó"
          onClick={() => nueva('pagar')}
        />
        <OpcionMenu
          icon={<span style={{ color: CUENTAS_CONFIG.cobrar.colorSaldo, fontWeight: 800 }}>↓</span>}
          titulo="Me deben"
          detalle="Un préstamo que le hiciste a alguien (sale como egreso)"
          onClick={() => nueva('cobrar')}
        />
      </BottomSheet>

      <CuentaDetalle
        cuenta={detalle}
        cfg={cfgDetalle}
        esMovil={esMovil}
        onCerrar={() => setDetalleId(null)}
        onRecargar={cargar}
        onAbonar={() => abrirHoja('abono')}
        onAjustar={() => abrirHoja('ajuste')}
        onAumentar={() => abrirHoja('aumento')}
        onEditar={() => setForm({ tipo: detalle.tipo, cuenta: detalle })}
      />

      <HojaAbono cuenta={hoja?.tipo === 'abono' ? hojaCuenta : null} cfg={cfgHoja} esMovil={esMovil} onCerrar={() => setHoja(null)} onHecho={trasHoja} />
      <HojaAjuste cuenta={hoja?.tipo === 'ajuste' ? hojaCuenta : null} cfg={cfgHoja} esMovil={esMovil} onCerrar={() => setHoja(null)} onHecho={trasHoja} />
      <HojaAumento cuenta={hoja?.tipo === 'aumento' ? hojaCuenta : null} cfg={cfgHoja} esMovil={esMovil} onCerrar={() => setHoja(null)} onHecho={trasHoja} />

      <CuentaForm
        config={CUENTAS_CONFIG[form?.tipo || 'pagar']}
        open={!!form}
        editingDoc={form?.cuenta || null}
        onClose={() => setForm(null)}
        onSaved={cargar}
      />
    </FondoApp>
  );
};

export default CuentasApp;
