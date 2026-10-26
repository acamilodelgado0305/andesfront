// src/components/tareas/interpretarTarea.js
//
// Registro rápido de tareas: entiende la frase como se dice en Colombia y saca
// la fecha, la hora, la repetición y las etiquetas. Lo que reconoce sale del
// título y se muestra como "piezas" para que se vea qué entendió.
//
//   "Entregar informe el viernes 3pm #universidad"
//     → título "Entregar informe", viernes 15:00, etiqueta Universidad…
//   "Clase de seminario los martes y jueves a las 6"
//     → se repite mar y jue, 18:00, primera fecha = el próximo martes o jueves
//   "Pagar arriendo cada mes el 5"   "Revisar correo todos los días 8am"
//
// Puro (sin React): se prueba con node.

const DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15 };
const DIA_RE = '(?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)';

// Misma longitud que el original (unidad por unidad, también con emojis) para
// poder cortar el título con las posiciones de los hallazgos.
const normalizar = (s) => s.split('').map((ch) => (ch.normalize('NFD')[0] || ch).toLowerCase()[0]).join('');

const hoyCO = (ahora) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora);
const sumarDias = (dia, n) => {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
};
const diaSemana = (dia) => new Date(`${dia}T12:00:00Z`).getUTCDay();
const pad = (n) => String(n).padStart(2, '0');
const aDia = (raw) => DIAS[raw] ?? DIAS[raw.replace(/s$/, '')];
const numero = (raw) => (/^\d+$/.test(raw) ? Number(raw) : NUMEROS[raw] || null);

/**
 * @param {string} texto
 * @param {{ etiquetas?: {id:number,nombre:string}[], ahora?: Date, ignorar?: string[] }} opciones
 *   ignorar: tipos de pieza que se dejan en el título ('fecha','hora','repite','etiqueta'),
 *   para cuando la frase dice "lunes" sin querer una fecha.
 * @returns {{ titulo, fecha, hora, repeticion, etiquetas, piezas }}
 */
export const interpretarTarea = (texto, { etiquetas = [], ahora = new Date(), ignorar = [] } = {}) => {
  const original = String(texto || '');
  const norm = normalizar(original);
  const quitar = []; // [inicio, fin]
  const piezas = [];
  const libre = (i, f) => !quitar.some(([a, b]) => i < b && f > a);
  const tomar = (m, tipo, offset = 0) => {
    if (ignorar.includes(tipo)) return false;
    const i = m.index + offset;
    const f = i + m[0].length - offset;
    if (!libre(i, f)) return false;
    quitar.push([i, f]);
    piezas.push({ tipo, texto: original.slice(i, f).trim(), inicio: i });
    return true;
  };
  const buscar = (re, fn) => {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let m;
    while ((m = g.exec(norm))) { if (fn(m) === 'parar') break; }
  };

  const hoy = hoyCO(ahora);
  let fecha = null;
  let hora = null;
  let repeticion = null;
  const ids = [];

  // ── Etiquetas: #universidad, !urgente ────────────────────────────────────
  const etqNorm = etiquetas.map((e) => {
    const n = normalizar(e.nombre || '');
    return { ...e, n: n.replace(/\s+/g, ''), palabras: n.split(/\s+/).filter(Boolean) };
  });
  buscar(/(^|\s)[#!]([\p{L}\d_-]+)/u, (m) => {
    const clave = m[2].replace(/[-_]/g, '');
    // exacta → empieza igual → alguna palabra empieza igual (#polen = "Proyecto Polen")
    const e = etqNorm.find((x) => x.n === clave)
      || etqNorm.find((x) => x.n && x.n.startsWith(clave))
      || etqNorm.find((x) => x.palabras.some((w) => w.length > 2 && w.startsWith(clave)));
    if (e && tomar(m, 'etiqueta', m[1].length)) {
      if (!ids.includes(e.id)) ids.push(e.id);
      piezas[piezas.length - 1].texto = e.nombre;
    }
  });

  // ── Repetición ───────────────────────────────────────────────────────────
  const fijar = (m, regla) => { if (!repeticion && tomar(m, 'repite')) repeticion = regla; };
  buscar(/\b(?:cada|todos los|todas las)\s+(\d+|dos|tres|cuatro|quince)\s+(dias|semanas|meses|anos)\b/, (m) => {
    const n = numero(m[1]);
    const frecuencia = { dias: 'diaria', semanas: 'semanal', meses: 'mensual', anos: 'anual' }[m[2]];
    fijar(m, { frecuencia, cada: n });
  });
  buscar(/\b(?:entre semana|dias habiles|de lunes a viernes)\b/, (m) => fijar(m, { frecuencia: 'semanal', dias: [1, 2, 3, 4, 5] }));
  buscar(new RegExp(`\\b(?:cada|todos los|todas las|los)\\s+(${DIA_RE}(?:\\s*(?:,|y|e)\\s*${DIA_RE})*)\\b`), (m) => {
    const dias = [...new Set(m[1].split(/\s*(?:,|\by\b|\be\b)\s*/).map(aDia).filter((d) => d !== undefined))].sort();
    fijar(m, { frecuencia: 'semanal', dias });
  });
  buscar(/\b(?:todos los dias|cada dia|a diario|diariamente|diario)\b/, (m) => fijar(m, { frecuencia: 'diaria' }));
  buscar(/\b(?:cada semana|semanalmente|semanal)\b/, (m) => fijar(m, { frecuencia: 'semanal' }));
  buscar(/\bquincenal(?:mente)?\b/, (m) => fijar(m, { frecuencia: 'semanal', cada: 2 }));
  buscar(/\b(?:cada mes|mensualmente|mensual)\b/, (m) => fijar(m, { frecuencia: 'mensual' }));
  buscar(/\b(?:cada ano|anualmente|anual)\b/, (m) => fijar(m, { frecuencia: 'anual' }));

  // ── Hora ─────────────────────────────────────────────────────────────────
  const ponerHora = (m, h, min, momento) => {
    if (hora || h > 23 || min > 59) return;
    let hh = h;
    if (momento === 'pm' || momento === 'tarde' || momento === 'noche') { if (hh < 12) hh += 12; }
    else if (momento === 'am' || momento === 'manana' || momento === 'madrugada') { if (hh === 12) hh = 0; }
    else if (momento === 'auto' && hh >= 1 && hh <= 6) hh += 12; // "a las 3" = 3 de la tarde
    if (tomar(m, 'hora')) hora = `${pad(hh)}:${pad(min)}`;
  };
  buscar(/\b(?:a\s+las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.\s?m\.?|p\.\s?m\.?)(?=\s|$|[,.;])/, (m) => ponerHora(m, +m[1], +(m[2] || 0), m[3][0] === 'a' ? 'am' : 'pm'));
  buscar(/\b(?:a\s+las?\s+)(\d{1,2})(?::(\d{2}))?(?:\s+(?:de la|en la|por la)\s+(manana|tarde|noche|madrugada))?\b/, (m) => ponerHora(m, +m[1], +(m[2] || 0), m[3] || 'auto'));
  buscar(/\b(\d{1,2}):(\d{2})\b/, (m) => ponerHora(m, +m[1], +m[2], null));
  buscar(/\b(?:al\s+|a\s+)?mediodia\b/, (m) => ponerHora(m, 12, 0, null));
  buscar(/\b(?:esta noche|en la noche)\b/, (m) => { if (!hora && tomar(m, 'hora')) hora = '20:00'; });

  // ── Fecha ────────────────────────────────────────────────────────────────
  const ponerFecha = (m, dia) => { if (!fecha && dia && tomar(m, 'fecha')) fecha = dia; };
  buscar(/\bpasado\s+manana\b/, (m) => ponerFecha(m, sumarDias(hoy, 2)));
  buscar(/\b(?:para\s+)?hoy\b/, (m) => ponerFecha(m, hoy));
  buscar(/\b(?:para\s+)?manana\b/, (m) => {
    // "de la mañana" ya lo tomó la hora; "mañana" a secas = el día siguiente
    if (/\b(?:de|en|por)\s+la\s+$/.test(norm.slice(Math.max(0, m.index - 8), m.index))) return;
    ponerFecha(m, sumarDias(hoy, 1));
  });
  buscar(/\b(?:la\s+)?(?:proxima|siguiente)\s+semana\b/, (m) => {
    const d = diaSemana(hoy);
    ponerFecha(m, sumarDias(hoy, ((8 - d) % 7) || 7));
  });
  buscar(/\ben\s+(\d+|un|una|dos|tres|cuatro|cinco|quince)\s+(dias?|semanas?|mes(?:es)?)\b/, (m) => {
    const n = numero(m[1]);
    if (!n) return;
    if (m[2].startsWith('dia')) ponerFecha(m, sumarDias(hoy, n));
    else if (m[2].startsWith('semana')) ponerFecha(m, sumarDias(hoy, 7 * n));
    else {
      const [y, mm, d] = hoy.split('-').map(Number);
      ponerFecha(m, new Date(Date.UTC(y, mm - 1 + n, d, 12)).toISOString().slice(0, 10));
    }
  });
  buscar(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => {
    const [d, mes] = [+m[1], +m[2]];
    if (d < 1 || d > 31 || mes < 1 || mes > 12) return;
    let y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : +hoy.slice(0, 4);
    let dia = `${y}-${pad(mes)}-${pad(d)}`;
    if (!m[3] && dia < hoy) dia = `${y + 1}-${pad(mes)}-${pad(d)}`;
    ponerFecha(m, dia);
  });
  buscar(new RegExp(`\\b(?:el\\s+)?(\\d{1,2})\\s+de\\s+(${Object.keys(MESES).join('|')})(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`), (m) => {
    const y = m[3] ? +m[3] : +hoy.slice(0, 4);
    let dia = `${y}-${pad(MESES[m[2]])}-${pad(+m[1])}`;
    if (!m[3] && dia < hoy) dia = `${y + 1}-${pad(MESES[m[2]])}-${pad(+m[1])}`;
    ponerFecha(m, dia);
  });
  buscar(/\b(?:el\s+|este\s+|el\s+proximo\s+|proximo\s+|el\s+siguiente\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/, (m) => {
    const objetivo = DIAS[m[1]];
    const delta = ((objetivo - diaSemana(hoy) + 7) % 7) || 7;
    ponerFecha(m, sumarDias(hoy, delta));
  });
  // "el 15" (día del mes; el próximo que venga)
  buscar(/\bel\s+(\d{1,2})\b(?!\s*(?:de|\/|:|am|pm|a\.|p\.))/, (m) => {
    const d = +m[1];
    if (d < 1 || d > 31) return;
    const [y, mes] = hoy.split('-').map(Number);
    let dia = `${y}-${pad(mes)}-${pad(d)}`;
    if (dia < hoy) dia = new Date(Date.UTC(y, mes, d, 12)).toISOString().slice(0, 10);
    ponerFecha(m, dia);
  });

  // ── Repetición sin fecha: arranca en la próxima ocurrencia ───────────────
  if (repeticion && !fecha) {
    const ahoraHHMM = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ahora);
    const sirveHoy = !hora || hora > ahoraHHMM;
    if (repeticion.frecuencia === 'semanal' && repeticion.dias?.length) {
      for (let i = sirveHoy ? 0 : 1; i < 8; i += 1) {
        const dia = sumarDias(hoy, i);
        if (repeticion.dias.includes(diaSemana(dia))) { fecha = dia; break; }
      }
    } else {
      fecha = sirveHoy ? hoy : sumarDias(hoy, 1);
    }
  }
  // Una hora sola ("llamar a las 3") es para hoy, o mañana si ya pasó.
  if (hora && !fecha) {
    const ahoraHHMM = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ahora);
    fecha = hora > ahoraHHMM ? hoy : sumarDias(hoy, 1);
  }
  if (repeticion?.frecuencia === 'semanal' && !repeticion.dias?.length && fecha) repeticion.dias = [diaSemana(fecha)];

  // ── Título: lo que queda, sin conectores sueltos al final ─────────────────
  let titulo = '';
  let k = 0;
  for (const [a, b] of [...quitar].sort((x, y) => x[0] - y[0])) {
    titulo += `${original.slice(k, a)} `;
    k = Math.max(k, b);
  }
  titulo += original.slice(k);
  titulo = titulo.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 4; i += 1) {
    titulo = titulo
      .replace(/[\s,;:-]+(?:el|la|los|las|de|del|para|a|al|en|y|e|que|desde)$/i, '')
      .replace(/[\s,;:-]+$/, '')
      .trim();
  }

  piezas.sort((a, b) => a.inicio - b.inicio);
  return { titulo: titulo || original.trim(), fecha, hora, repeticion, etiquetas: ids, piezas };
};
