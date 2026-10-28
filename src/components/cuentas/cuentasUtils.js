// Cálculos de las cuentas (por pagar y por cobrar) que usan la vista, el
// detalle y las hojas de abono/ajuste. Todo sale de la fila que manda BACKEND.
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { parseFechaDia } from '../../utils/fechas';

export const parseArr = (raw) =>
  Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// En `cargos` conviven los aumentos de deuda y los ajustes manuales de saldo.
export const esAjuste   = (c) => c?.tipo === 'ajuste';
export const aumentosDe = (rec) => parseArr(rec.cargos).filter((c) => !esAjuste(c));

export const saldoDe = (rec) =>
  Math.max(0, round2((Number(rec.total) || 0) - (Number(rec.total_abonado) || 0)));

export const estaAbierta = (rec) => !['PAGADA', 'ANULADA'].includes(rec.estado) && saldoDe(rec) > 0;

// Valor de cada cuota. Las cuentas anteriores a la migración aún no lo tienen
// guardado, así que se deduce del total.
export const valorCuotaDe = (rec) => {
  if (rec.valor_cuota != null && Number(rec.valor_cuota) > 0) return Number(rec.valor_cuota);
  const cuotas = Math.max(1, Number(rec.num_cuotas) || 1);
  return round2((Number(rec.total) || 0) / cuotas);
};

export const numCuotasDe = (rec) => Math.max(1, Number(rec.num_cuotas) || 1);

export const cuotasPagadasDe = (rec) => {
  const vc = valorCuotaDe(rec);
  if (vc <= 0) return 0;
  return Math.min(numCuotasDe(rec), Math.floor(round2(Number(rec.total_abonado) || 0) / vc + 1e-9));
};

/**
 * Próximo pago de una cuenta abierta: { fecha (dayjs|null), monto }.
 * Con una sola cuota es el vencimiento. Con N cuotas, `fecha_vencimiento` es la
 * de la ÚLTIMA; la cuota k cae k meses después de la emisión, y la que sigue es
 * la primera que aún no está cubierta por los abonos.
 */
export const proximoPago = (rec) => {
  if (!estaAbierta(rec)) return null;
  const saldo = saldoDe(rec);
  const n = numCuotasDe(rec);
  const vencimiento = parseFechaDia(rec.fecha_vencimiento);
  if (n <= 1) return { fecha: vencimiento, monto: saldo };

  const vc      = valorCuotaDe(rec);
  const pagadas = Math.min(cuotasPagadasDe(rec), n - 1);
  const emision = parseFechaDia(rec.fecha_emision);
  let fecha = emision ? emision.add(pagadas + 1, 'month') : vencimiento;
  if (fecha && vencimiento && fecha.isAfter(vencimiento, 'day')) fecha = vencimiento;
  // Lo que falta de la cuota en curso (si ya se abonó una parte, solo el resto).
  const monto = Math.min(saldo, Math.max(0, round2(vc * (pagadas + 1) - (Number(rec.total_abonado) || 0))) || vc);
  return { fecha, monto: round2(monto) };
};

export const estaVencida = (rec) => {
  const p = proximoPago(rec);
  return !!p?.fecha && p.fecha.isBefore(dayjs(), 'day');
};

/** Grupo de la lista según el próximo pago. */
export const GRUPOS = [
  { clave: 'vencidas',  titulo: 'Atrasadas',      color: '#dc2626' },
  { clave: 'semana',    titulo: 'Próximos 7 días', color: '#d97706' },
  { clave: 'mes',       titulo: 'Este mes' },
  { clave: 'siguiente', titulo: 'Próximo mes' },
  { clave: 'despues',   titulo: 'Más adelante' },
  { clave: 'sinFecha',  titulo: 'Sin fecha' },
];

export const grupoDe = (rec) => {
  const p = proximoPago(rec);
  if (!p) return null;
  if (!p.fecha) return 'sinFecha';
  const hoy = dayjs().startOf('day');
  if (p.fecha.isBefore(hoy, 'day')) return 'vencidas';
  if (!p.fecha.isAfter(hoy.add(7, 'day'), 'day')) return 'semana';
  if (!p.fecha.isAfter(hoy.endOf('month'), 'day')) return 'mes';
  if (!p.fecha.isAfter(hoy.add(1, 'month').endOf('month'), 'day')) return 'siguiente';
  return 'despues';
};

/** "hoy", "mañana", "en 5 días", "hace 3 días", "15 nov". */
export const textoFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  const dias = fecha.startOf('day').diff(dayjs().startOf('day'), 'day');
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  if (dias < 0) return `Hace ${-dias} días`;
  if (dias <= 7) return `En ${dias} días`;
  return fecha.locale('es').format(fecha.year() === dayjs().year() ? 'D MMM' : 'D MMM YYYY');
};

// Reconstruye el estado de cuenta (movimientos con saldo corrido).
// El saldo final coincide con total − total_abonado.
export const buildMovimientos = (rec, { movInicial, movAumento }) => {
  const total     = Number(rec.total || 0);
  const abonos    = parseArr(rec.abonos);
  const cargos    = parseArr(rec.cargos);
  const sumCargos = cargos.reduce((s, c) => s + Number(c.monto || 0), 0);

  const eventos = [{
    key:      'inicial',
    fecha:    rec.fecha_emision ? parseFechaDia(rec.fecha_emision) : rec.created_at,
    tipo:     'inicial',
    concepto: movInicial,
    detalle:  null,
    monto:    round2(total - sumCargos),
  }];

  // Aumentos de deuda y ajustes manuales de saldo (estos pueden ser negativos)
  cargos.forEach((c, i) => eventos.push({
    key:      c.id || `cargo-${i}`,
    fecha:    c.fecha,
    tipo:     esAjuste(c) ? 'ajuste' : 'aumento',
    concepto: esAjuste(c) ? 'Ajuste de saldo' : movAumento,
    detalle:  c.nota || null,
    monto:    Number(c.monto || 0),
  }));

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

  let saldo = 0;
  for (const e of eventos) { saldo = round2(saldo + e.monto); e.saldo = saldo; }
  return eventos;
};

/** Abonos hechos dentro del mes en curso. */
export const abonadoEnMes = (rec) => {
  const ini = dayjs().startOf('month');
  const fin = dayjs().endOf('month');
  return parseArr(rec.abonos).reduce((s, a) => {
    const f = a?.fecha ? dayjs(a.fecha) : null;
    if (!f || !f.isValid() || f.isBefore(ini) || f.isAfter(fin)) return s;
    return s + (Number(a.monto) || 0);
  }, 0);
};

export const nombreContacto = (rec, nombreCol) =>
  (rec.persona_nombre || rec[nombreCol] || '').trim();

/** Enlace de WhatsApp (Colombia por defecto si el número viene sin indicativo). */
export const enlaceWhatsApp = (celular, texto) => {
  let num = String(celular || '').replace(/\D/g, '');
  if (!num) return null;
  if (num.length === 10) num = `57${num}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
};
