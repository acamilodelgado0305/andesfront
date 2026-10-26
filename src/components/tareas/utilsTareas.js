// src/components/tareas/utilsTareas.js
// Piezas puras de Tareas: fechas en hora de Colombia, colores y textos.

export const ZONA = 'America/Bogota';
const DIA = 86400000;

// ── Colores ─────────────────────────────────────────────────────────────────
// Etiquetas: los mismos tonos que se usaban en Trello (verde, amarillo, …).
export const PALETA_ETIQUETAS = [
  '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#3b82f6',
  '#0ea5e9', '#84cc16', '#ec4899', '#64748b',
  '#15803d', '#a16207', '#c2410c', '#b91c1c', '#7e22ce', '#1d4ed8',
];
export const COLORES_PROYECTO = [
  '#1d4ed8', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#ca8a04', '#16a34a', '#0d9488', '#0891b2', '#475569',
];
export const EMOJIS_PROYECTO = ['🎓', '🏠', '💼', '🚀', '💡', '🛒', '📚', '🧑‍🏫', '💪', '✈️', '🐝', '📈', '🛠️', '❤️', '🎯', '🏍️'];

/** Texto legible sobre un color de fondo (blanco o casi negro). */
export const textoSobre = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#1f2937' : '#fff';
};

/** Color con transparencia: '#1d4ed8' + 0.12 → 'rgba(29,78,216,0.12)'. */
export const tinte = (hex, alfa) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(100,116,139,${alfa})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
};

// ── Fechas (siempre en hora de Colombia) ────────────────────────────────────
export const diaCO = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(d));
export const hoyCO = () => diaCO(new Date());
export const sumarDiasStr = (dia, n) => {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
};
const diasEntre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DIA);

export const horaCO = (d) => new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, hour: 'numeric', minute: '2-digit' }).format(new Date(d));
export const horaHHMM = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d));

const fechaCorta = (dia, conAno = false) => {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(conAno ? { year: 'numeric' } : {}),
  }).replace('.', '');
};
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** 'YYYY-MM-DD' + 'HH:mm' (Colombia) → ISO para la API. */
export const isoDesdeLocal = (dia, hora) => new Date(`${dia}T${hora || '09:00'}:00-05:00`).toISOString();

/** Estado del vencimiento: null | 'completada' | 'vencida' | 'hoy' | 'manana' | 'semana' | 'futuro'. */
export const estadoVence = (t, ahora = new Date()) => {
  if (!t?.vence_at) return null;
  if (t.completada) return 'completada';
  const dia = diaCO(t.vence_at);
  const hoy = diaCO(ahora);
  const vencida = t.vence_con_hora ? new Date(t.vence_at) < ahora : dia < hoy;
  if (vencida) return 'vencida';
  if (dia === hoy) return 'hoy';
  const n = diasEntre(hoy, dia);
  if (n === 1) return 'manana';
  if (n <= 7) return 'semana';
  return 'futuro';
};

// Color de la pastilla de fecha según el estado (texto, fondo).
export const COLOR_VENCE = {
  vencida:    { color: '#fff', fondo: '#dc2626' },
  hoy:        { color: '#1f2937', fondo: '#fbbf24' },
  manana:     { color: '#d97706', fondo: 'rgba(251,191,36,0.18)' },
  completada: { color: '#fff', fondo: '#16a34a' },
  semana:     { color: 'var(--qc-text)', fondo: 'var(--qc-relleno)' },
  futuro:     { color: 'var(--qc-text-muted)', fondo: 'var(--qc-relleno)' },
};

/** "Hoy 3:00 p. m." / "Mañana" / "vie 30 oct" / "20 oct 2025" */
export const textoVence = (t, { largo = false } = {}) => {
  if (!t?.vence_at) return '';
  const dia = diaCO(t.vence_at);
  const hoy = hoyCO();
  const n = diasEntre(hoy, dia);
  let base;
  if (n === 0) base = 'Hoy';
  else if (n === 1) base = 'Mañana';
  else if (n === -1) base = 'Ayer';
  else if (n > 1 && n < 7) base = largo ? `El ${DIAS_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()]}` : `${DIAS_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()].slice(0, 3)} ${fechaCorta(dia)}`;
  else base = fechaCorta(dia, dia.slice(0, 4) !== hoy.slice(0, 4));
  return t.vence_con_hora ? `${base} ${horaCO(t.vence_at)}` : base;
};

export const fechaLarga = (dia) => {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
};

const RTF = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('es', { numeric: 'auto' }) : null;
export const haceCuanto = (fecha) => {
  if (!RTF || !fecha) return '';
  let v = (new Date(fecha).getTime() - Date.now()) / 1000;
  const pasos = [[60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year']];
  for (const [tope, unidad] of pasos) {
    if (Math.abs(v) < tope) return RTF.format(Math.round(v), unidad);
    v /= tope;
  }
  return '';
};

// ── Recordatorios ───────────────────────────────────────────────────────────
export const opcionesRecordatorio = (conHora) => (conHora
  ? [
    { value: 'no', label: 'Sin aviso' },
    { value: 0, label: 'A la hora' },
    { value: 10, label: '10 min antes' },
    { value: 30, label: '30 min antes' },
    { value: 60, label: '1 hora antes' },
    { value: 120, label: '2 horas antes' },
    { value: 1440, label: '1 día antes' },
    { value: 2880, label: '2 días antes' },
  ]
  : [
    { value: 'no', label: 'Sin aviso' },
    { value: 0, label: 'Ese día, 9:00 a. m.' },
    { value: 1440, label: 'El día anterior, 9:00 a. m.' },
    { value: 2880, label: 'Dos días antes, 9:00 a. m.' },
  ]);

// ── Búsqueda ────────────────────────────────────────────────────────────────
export const sinTildes = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtros comunes de las vistas: { q, etiquetas: [ids], vence, ocultarHechas }. */
export const pasaFiltros = (t, f) => {
  if (!f) return true;
  if (f.ocultarHechas && t.completada) return false;
  if (f.etiquetas?.length && !f.etiquetas.some((id) => t.etiquetas?.includes(id))) return false;
  if (f.vence) {
    const e = estadoVence(t);
    if (f.vence === 'sin' && t.vence_at) return false;
    if (f.vence === 'vencidas' && e !== 'vencida') return false;
    if (f.vence === 'hoy' && !['hoy', 'vencida'].includes(e)) return false;
    if (f.vence === 'semana' && !['hoy', 'vencida', 'manana', 'semana'].includes(e)) return false;
  }
  if (f.q) {
    const q = sinTildes(f.q);
    if (!sinTildes(`${t.titulo} ${t.descripcion || ''}`).includes(q)) return false;
  }
  return true;
};

export const hayFiltros = (f) => !!(f && (f.q || f.etiquetas?.length || f.vence || f.ocultarHechas));
