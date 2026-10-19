// Entiende lo que el usuario escribe o dicta para registrar un movimiento, al
// estilo de MonAi: "almuerzo 25000", "uber 12.500", "mercado 150 mil",
// "+ venta curso 80k", "arriendo 1,2 palos", "me pagaron 3.500.000".
//
// Funciones puras (sin React ni red): se pueden probar con node directamente.

// Minúsculas y sin tildes, para comparar sin importar cómo se escribió.
export const normalizar = (s = '') =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const EMOJI_RE = /\p{Extended_Pictographic}/gu;

/** Emoji con que empieza el nombre de una etiqueta ("🍔 Comida" → "🍔"), o null. */
export const emojiInicial = (nombre = '') => {
  const m = String(nombre).trim().match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u);
  return m ? m[1] : null;
};

// ── Montos ────────────────────────────────────────────────────────────────
// Número con separadores opcionales (25.000 · 25,000 · 12.500,50 · 1'200.000),
// pegado o no a un multiplicador: k, mil, lucas (miles) · m, mm, millón,
// palos (millones). "k" y "m" solo cuentan pegados al número ("80k", "1.5m")
// para no confundirlos con palabras sueltas.
const MONTO_RE = /(^|[^\p{L}\p{N}])([+\-−]?\s*\$?\s*)(\d[\d.,']*)(?:(k|m|mm)(?![\p{L}\p{N}])|\s*(mil|lucas?|millon(?:es)?|millón|palos?)(?![\p{L}\p{N}]))?(\s*(?:pesos?|cop|\$))?/giu;

const MULTIPLICADOR = {
  k: 1e3, mil: 1e3, luca: 1e3, lucas: 1e3,
  m: 1e6, mm: 1e6, millon: 1e6, millones: 1e6, 'millón': 1e6, palo: 1e6, palos: 1e6,
};

/**
 * "25.000" → 25000 · "25,5" → 25.5 · "12.500,50" → 12500.5 · "1'200.000" → 1200000
 * Con un solo tipo de separador: si quedan grupos de 3 dígitos es de miles; si
 * no (1 o 2 dígitos al final), es decimal.
 */
export const leerNumero = (raw = '') => {
  let s = String(raw).replace(/'/g, '.').replace(/[.,]+$/, '');
  const ultimoPunto = s.lastIndexOf('.');
  const ultimaComa = s.lastIndexOf(',');
  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    // Los dos: el que va de último es el decimal.
    const decimal = ultimoPunto > ultimaComa ? '.' : ',';
    const miles = decimal === '.' ? ',' : '.';
    s = s.split(miles).join('').replace(decimal, '.');
  } else if (ultimoPunto !== -1 || ultimaComa !== -1) {
    const sep = ultimoPunto !== -1 ? '.' : ',';
    const partes = s.split(sep);
    const ultima = partes[partes.length - 1];
    s = partes.length > 2 || ultima.length === 3 ? partes.join('') : partes.join('.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// ── Montos dichos en voz alta ─────────────────────────────────────────────
// El dictado del celular escribe la plata de muchas formas: "veinticinco mil",
// "un millón doscientos mil", "1 millón 200 mil", "25 mil 500", "medio millón".
// Antes de buscar el monto se pasan a un solo número ("1200000"); si no,
// "1 millón 200 mil" quedaba en 1.000.000 y "200 mil" en la descripción.
const UNIDADES = new Map(Object.entries({
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
}));
const DECENAS = new Map(Object.entries({
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
}));
const CENTENAS = new Map(Object.entries({
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
}));
const MILES = new Set(['mil', 'luca', 'lucas']);
const MILLONES = new Set(['millon', 'millones', 'palo', 'palos']);

const claseDe = (core, w) => {
  if (/^\d[\d.,']*$/.test(core)) return { k: 'dig', v: leerNumero(core) };
  if (UNIDADES.has(w)) return { k: 'uni', v: UNIDADES.get(w) };
  if (DECENAS.has(w)) return { k: 'dec', v: DECENAS.get(w) };
  if (CENTENAS.has(w)) return { k: 'cen', v: CENTENAS.get(w) };
  if (MILES.has(w)) return { k: 'mil' };
  if (MILLONES.has(w)) return { k: 'mill' };
  if (w === 'y') return { k: 'y' };
  if (w === 'medio') return { k: 'medio' };
  return null;
};

/** Palabras del texto con su posición; `corta` = traía coma o punto pegado. */
const tokenizar = (texto) => {
  const toks = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const crudo = m[0];
    const lead = crudo.match(/^[+\-−$¡¿("“]*/)[0].length;
    const trail = crudo.slice(lead).match(/[.,;:!?)"”]*$/)[0].length;
    const core = crudo.slice(lead, crudo.length - trail);
    toks.push({
      inicio: m.index + lead,
      fin: m.index + crudo.length - trail,
      corta: trail > 0,
      clase: core ? claseDe(core, normalizar(core)) : null,
    });
  }
  return toks;
};

// Un número menor que mil dicho en palabras: "doscientos treinta y cinco".
const leerGrupo = (at, k) => {
  let n = 0;
  let j = k;
  if (at(j)?.k === 'cen') { n += at(j).v; j += 1; }
  if (at(j)?.k === 'dec') {
    n += at(j).v; j += 1;
    if (at(j)?.k === 'y' && at(j + 1)?.k === 'uni' && at(j + 1).v >= 1 && at(j + 1).v <= 9) { n += at(j + 1).v; j += 2; }
  } else if (at(j)?.k === 'uni') { n += at(j).v; j += 1; }
  return j > k ? { n, j } : null;
};

/**
 * Lee un monto hablado que empieza en el token `i`: grupos con multiplicador
 * de mayor a menor ("un millón" + "doscientos mil" + "quinientos").
 */
const leerMontoHablado = (toks, i) => {
  // Una coma o un punto cortan el número: "taxi 12 mil, 2 personas".
  const at = (k) => (k < toks.length && (k === i || !toks[k - 1].corta) ? toks[k].clase : null);
  let total = 0;
  let k = i;
  let escalaPrevia = Infinity;
  let partes = 0;
  let conPalabras = false;
  let multiplicado = false;
  let soloMil = false;

  for (;;) {
    let n;
    let j;
    let palabras = false;
    const c = at(k);
    if (c?.k === 'dig') { n = c.v; j = k + 1; }
    else if (c?.k === 'mil') { n = 1; j = k; palabras = true; } // "mil quinientos"
    else if (c?.k === 'medio' && at(k + 1)?.k === 'mill') { n = 0.5; j = k + 1; palabras = true; } // "medio millón"
    else {
      const g = leerGrupo(at, k);
      if (!g) break;
      ({ n, j } = g);
      palabras = true;
    }
    if (n == null) break;

    let escala = 1;
    if (at(j)?.k === 'mill') { escala = 1e6; j += 1; } else if (at(j)?.k === 'mil') { escala = 1e3; j += 1; }
    // "25 mil 3 mil" son dos números, no uno.
    if (escala >= escalaPrevia) break;

    let valor = n * escala;
    if (escala === 1 && partes > 0) {
      // Número suelto después de "mil" o "millón".
      if (escalaPrevia === 1e6 && n >= 1 && n < 1000) valor = n * 1e3; // "un millón quinientos" = 1.500.000
      else if (escalaPrevia === 1e6 && n < 1e6) { /* "un millón 200000" */ }
      else if (escalaPrevia === 1e3 && n >= 100 && n < 1000) { /* "25 mil 500" */ }
      else break; // "20 mil 2 personas": el 2 no es parte de la plata
    }

    if (partes === 0) soloMil = c?.k === 'mil' && escala === 1e3;
    else soloMil = false;
    total += valor;
    k = j;
    partes += 1;
    escalaPrevia = escala;
    conPalabras = conPalabras || palabras || escala > 1;
    multiplicado = multiplicado || escala > 1;
    if (escala === 1) break;
    if (escala === 1e6 && at(k)?.k === 'y' && at(k + 1)?.k === 'medio') { total += 5e5; k += 2; } // "dos millones y medio"
  }

  if (!partes || !conPalabras) return null; // Solo cifras: lo resuelve MONTO_RE tal cual.
  if (!multiplicado && total < 100) return null; // "dos almuerzos", "un taxi": no es plata.
  return {
    valor: total,
    fin: k,
    // "mil" suelto no delata plata con seguridad ("almuerzo mil sabores 25000").
    marcado: multiplicado && !(soloMil && partes === 1),
  };
};

/**
 * Reescribe los montos hablados como cifras. Devuelve el texto nuevo y cada
 * reemplazo con su posición en los dos textos: así se sabe que esa cifra es
 * plata aunque ya no diga "mil", y la descripción sale del texto original
 * (un "mil" que no era la plata no aparece como "1000").
 */
const montosHabladosACifras = (texto) => {
  const toks = tokenizar(texto);
  let salida = '';
  let cursor = 0;
  const reemplazos = [];
  for (let i = 0; i < toks.length;) {
    const r = toks[i].clase ? leerMontoHablado(toks, i) : null;
    if (!r) { i += 1; continue; }
    const cifra = String(Math.round(r.valor * 100) / 100);
    const origen = [toks[i].inicio, toks[r.fin - 1].fin];
    salida += texto.slice(cursor, origen[0]);
    reemplazos.push({ salida: [salida.length, salida.length + cifra.length], origen, marcado: r.marcado });
    salida += cifra;
    cursor = origen[1];
    i = r.fin;
  }
  // Posición en el texto reescrito → posición en el original.
  const aOriginal = (p, lado) => {
    let delta = 0;
    for (const r of reemplazos) {
      if (p <= r.salida[0]) break;
      if (p < r.salida[1]) return lado === 'inicio' ? r.origen[0] : r.origen[1];
      delta += (r.origen[1] - r.origen[0]) - (r.salida[1] - r.salida[0]);
    }
    return p + delta;
  };
  return { texto: salida + texto.slice(cursor), reemplazos, aOriginal };
};

// ── Ingreso o gasto ───────────────────────────────────────────────────────
// Solo frases que no dejan duda. "pago" solo es ambiguo ("pago arriendo" es un
// gasto): por eso cuenta "me pagaron" pero no "pago".
const PALABRAS_INGRESO = [
  'ingreso', 'ingresos', 'me pagaron', 'pagaron', 'me consignaron', 'consignaron', 'cobre', 'cobro de',
  'venta', 'ventas', 'vendi', 'salario', 'sueldo', 'nomina recibida', 'quincena', 'prima',
  'honorarios', 'recibi', 'me transfirieron', 'reembolso', 'ganancia', 'ganancias', 'freelance',
  'comision', 'comisiones', 'dividendos', 'intereses ganados', 'abono recibido',
];

// Lo que se dice al dictar un gasto: "gasto taxi…", "gasté…", "pagué…".
const PALABRAS_GASTO = [
  'gasto', 'gastos', 'egreso', 'egresos', 'gaste', 'pague', 'compre', 'me costo', 'me cobraron',
];

// Si hay palabras de los dos tipos, manda la que se dijo primero: "pagué la
// comisión" es un gasto aunque "comisión" suela ser ingreso.
const detectarTipo = (textoNormalizado, signo) => {
  if (signo === '+') return 'ingreso';
  if (signo === '-' || signo === '−') return 'gasto';
  const t = ` ${textoNormalizado.replace(/[^a-z0-9ñ ]+/g, ' ')} `;
  const primera = (lista) => Math.min(...lista.map((p) => {
    const i = t.indexOf(` ${p} `);
    return i === -1 ? Infinity : i;
  }));
  const ingreso = primera(PALABRAS_INGRESO);
  const gasto = primera(PALABRAS_GASTO);
  if (ingreso === Infinity && gasto === Infinity) return null;
  return ingreso < gasto ? 'ingreso' : 'gasto';
};

// Palabras de relleno que quedan al quitar el monto: "almuerzo de 25000" → "almuerzo".
const RELLENO_FINAL = /\s+(de|por|en|a|al|con|para|del|valor|total|y|pesos)$/i;
// También los verbos que solo dicen el tipo ("me pagaron freelance" → "freelance")
// y lo que se dice al dictar: "anota un gasto de…", "descripción…", "valor…".
const RELLENO = [
  'me gaste', 'me gasté', 'gaste', 'gasté', 'pague', 'pagué', 'compre', 'compré', 'fueron', 'fue', 'son',
  'me costo', 'me costó', 'me cobraron', 'me pagaron', 'me consignaron', 'me transfirieron',
  'recibi', 'recibí', 'cobre', 'cobré',
  'registra', 'registrar', 'registre', 'registré', 'anota', 'anotar', 'apunta', 'apuntar',
  'agrega', 'agregar', 'añade', 'añadir', 'pon', 'poner', 'guarda', 'guardar', 'nuevo', 'nueva',
  'gasto', 'egreso', 'ingreso', 'descripcion', 'descripción', 'concepto', 'valor',
  'en', 'por', 'para', 'con', 'de', 'del',
].join('|');
const RELLENO_INICIAL = new RegExp(`^(${RELLENO})\\s+`, 'i');
// El artículo solo se quita detrás de una muletilla ("pagué el arriendo" →
// "arriendo"); escrito a secas es parte del nombre ("La luz", "El Corral").
const ARTICULO_INICIAL = /^(un|una|unos|unas|el|la|los|las)\s+/i;
// Si no queda nada más que relleno ("gasté 25 mil" → "gasté"), no hay descripción.
const SOLO_RELLENO = new RegExp(`^(${RELLENO})$`, 'i');

// `conMonto`: se quitó un monto del texto; si lo que queda es pura muletilla
// ("gasté"), no hay descripción. Sin monto, "ingreso" a secas se respeta.
const limpiarDescripcion = (s, conMonto = false) => {
  let d = s.replace(/\s+/g, ' ').trim();
  // Quita signos sueltos y separadores que quedaron colgando.
  d = d.replace(/^[\s+\-−:,.;]+|[\s:,.;-]+$/g, '').trim();
  let antes;
  let trasMuletilla = false;
  do {
    antes = d;
    d = d.replace(RELLENO_FINAL, '').trim();
    const sinInicio = d.replace(RELLENO_INICIAL, '').trim();
    if (sinInicio !== d) trasMuletilla = true;
    d = trasMuletilla ? sinInicio.replace(ARTICULO_INICIAL, '').trim() : sinInicio;
  } while (d !== antes);
  return conMonto && SOLO_RELLENO.test(d) ? '' : d;
};

/** "almuerzo" → "Almuerzo" (solo la primera letra; respeta el resto). */
export const capitalizar = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * En monedas de unidad pequeña un número suelto menor a esto no es plata:
 * "cuota 3 de 12" no es un gasto de 12 pesos.
 */
export const montoMinimoPara = (codigoMoneda) => (['COP', 'CLP', 'PYG'].includes(codigoMoneda) ? 50 : 0);

/**
 * Interpreta un texto libre.
 * @param {string} texto
 * @param {{ montoMinimo?: number }} opciones  montoMinimo: un número suelto (sin
 *   "$", "mil", "k"…) por debajo de esto no se toma como plata. En pesos
 *   colombianos "cuota 3 de 12" no es un gasto de 12 pesos.
 * @returns {{ valor: number|null, descripcion: string, tipo: 'ingreso'|'gasto'|null }}
 *   valor: el monto detectado (null si no hay ninguno)
 *   descripcion: el texto sin el monto ni el relleno
 *   tipo: 'ingreso'/'gasto' si el texto lo deja claro (signo o palabras), si no null
 */
export const interpretarMovimiento = (texto = '', { montoMinimo = 0 } = {}) => {
  // Los montos dichos en palabras ("veinticinco mil") se buscan ya como cifras.
  const dicho = String(texto);
  const { texto: original, reemplazos, aOriginal } = montosHabladosACifras(dicho);
  const marcas = reemplazos.filter((r) => r.marcado).map((r) => r.salida);
  const candidatos = [];
  let m;
  MONTO_RE.lastIndex = 0;
  while ((m = MONTO_RE.exec(original)) !== null) {
    const [completo, previo, prefijo, numero, letra, palabra, sufijo] = m;
    const base = leerNumero(numero);
    if (base === null) continue;
    const mult = MULTIPLICADOR[normalizar(letra || palabra || '')] || 1;
    const inicio = m.index + previo.length;
    candidatos.push({
      valor: base * mult,
      inicio,
      fin: m.index + completo.length,
      // Un "$", "pesos" o un multiplicador (también dicho: "veinte mil") delatan
      // que ese número es la plata.
      marcado: /\$/.test(prefijo) || !!sufijo || mult > 1
        || marcas.some(([a, b]) => inicio < b && m.index + completo.length > a),
      signo: (prefijo.match(/[+\-−]/) || [null])[0],
    });
    if (m[0].length === 0) MONTO_RE.lastIndex += 1;
  }

  // Entre varios números ("cuota 3 de 12 moto 450000") gana el marcado como
  // plata; si ninguno lo está, el más grande.
  const posibles = candidatos.filter((c) => c.marcado || c.valor >= montoMinimo);
  const elegido = posibles.length
    ? [...posibles].sort((a, b) => (Number(b.marcado) - Number(a.marcado)) || (b.valor - a.valor))[0]
    : null;

  const sinMonto = elegido
    ? dicho.slice(0, aOriginal(elegido.inicio, 'inicio')) + ' ' + dicho.slice(aOriginal(elegido.fin, 'fin'))
    : dicho;

  // Un "+" o "-" al comienzo del texto también marca el tipo.
  const signoInicial = (original.trim().match(/^[+\-−]/) || [null])[0];
  const descripcion = limpiarDescripcion(sinMonto, !!elegido);

  return {
    valor: elegido && elegido.valor > 0 ? Math.round(elegido.valor * 100) / 100 : null,
    descripcion,
    tipo: detectarTipo(normalizar(original), elegido?.signo || signoInicial),
  };
};

// ── Sugerencia de etiqueta ────────────────────────────────────────────────
// Palabras que delatan una etiqueta aunque nunca se haya usado. Solo sirven si
// el negocio tiene una etiqueta con alguno de esos nombres.
const SINONIMOS = [
  { palabras: ['almuerzo', 'almuerzos', 'desayuno', 'cena', 'comida', 'restaurante', 'corrientazo', 'pizza', 'hamburguesa', 'empanada', 'empanadas', 'cafe', 'tinto', 'domicilio', 'rappi', 'ifood', 'onces', 'mecato', 'helado', 'pollo', 'sushi', 'arepa', 'arepas', 'panaderia', 'pan', 'snack'],
    etiquetas: ['comida', 'comidas', 'alimentacion', 'alimentos', 'restaurante', 'restaurantes', 'almuerzos'] },
  { palabras: ['uber', 'taxi', 'didi', 'indriver', 'cabify', 'picap', 'bus', 'buseta', 'transmilenio', 'sitp', 'metro', 'gasolina', 'tanqueo', 'tanqueada', 'peaje', 'peajes', 'parqueadero', 'parqueo', 'pasaje', 'pasajes', 'soat', 'tecnomecanica', 'lavada'],
    etiquetas: ['transporte', 'movilidad', 'gasolina', 'carro', 'moto', 'vehiculo', 'vehiculos'] },
  { palabras: ['mercado', 'supermercado', 'd1', 'ara', 'exito', 'olimpica', 'carulla', 'jumbo', 'makro', 'tienda', 'fruver', 'verduras', 'surtimax', 'isimo', 'viveres'],
    etiquetas: ['mercado', 'supermercado', 'viveres', 'hogar', 'casa'] },
  { palabras: ['luz', 'agua', 'gas', 'energia', 'internet', 'wifi', 'celular', 'recarga', 'claro', 'movistar', 'tigo', 'etb', 'wom', 'epm', 'codensa', 'enel', 'acueducto', 'vanti', 'servicios'],
    etiquetas: ['servicios', 'servicios publicos', 'facturas', 'hogar'] },
  { palabras: ['arriendo', 'alquiler', 'administracion', 'renta', 'hipoteca'],
    etiquetas: ['arriendo', 'vivienda', 'hogar', 'casa'] },
  { palabras: ['drogueria', 'farmacia', 'medicina', 'medicamento', 'medicamentos', 'medico', 'cita', 'eps', 'odontologo', 'examen', 'examenes', 'laboratorio', 'gimnasio', 'gym'],
    etiquetas: ['salud', 'bienestar', 'medicina'] },
  { palabras: ['cine', 'netflix', 'spotify', 'disney', 'hbo', 'max', 'youtube', 'fiesta', 'rumba', 'bar', 'cerveza', 'cervezas', 'trago', 'concierto', 'juego', 'videojuego', 'salida', 'paseo', 'viaje', 'hotel', 'vuelo', 'tiquete'],
    etiquetas: ['entretenimiento', 'ocio', 'diversion', 'salidas', 'viajes', 'suscripciones'] },
  { palabras: ['meta', 'facebook', 'instagram', 'ads', 'publicidad', 'pauta', 'tiktok', 'marketing', 'anuncio', 'anuncios', 'google ads'],
    etiquetas: ['publicidad', 'marketing', 'meta ads', 'pauta', 'anuncios'] },
  { palabras: ['ropa', 'zapatos', 'tenis', 'camisa', 'camiseta', 'pantalon', 'vestido', 'jean'],
    etiquetas: ['ropa', 'compras', 'vestuario'] },
  { palabras: ['colegio', 'universidad', 'curso', 'matricula', 'libro', 'libros', 'pension', 'semestre', 'clase', 'clases'],
    etiquetas: ['educacion', 'estudio', 'estudios', 'cursos'] },
  { palabras: ['nomina', 'sueldo', 'salario', 'prestaciones', 'pila', 'seguridad social', 'liquidacion'],
    etiquetas: ['nomina', 'personal', 'salarios', 'empleados'] },
  { palabras: ['impuesto', 'impuestos', 'dian', 'iva', 'retencion', 'predial', 'ica', '4x1000'],
    etiquetas: ['impuestos', 'tributos'] },
  { palabras: ['papeleria', 'impresion', 'impresiones', 'fotocopias', 'hosting', 'dominio', 'software', 'licencia', 'computador'],
    etiquetas: ['oficina', 'papeleria', 'tecnologia', 'software'] },
  { palabras: ['perro', 'gato', 'mascota', 'veterinario', 'veterinaria', 'concentrado'],
    etiquetas: ['mascotas', 'mascota'] },
];

const PALABRAS_VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'para', 'por', 'un', 'una', 'unos', 'unas',
  'y', 'a', 'al', 'mi', 'mis', 'me', 'se', 'su', 'sus', 'lo', 'que', 'pago', 'compra', 'gasto',
]);

const palabrasDe = (textoNormalizado) =>
  textoNormalizado.split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 2 && !PALABRAS_VACIAS.has(p));

const nombreComparable = (nombre) => normalizar(String(nombre).replace(EMOJI_RE, ''));

// "comidas" y "comida", "servicios" y "servicio" cuentan como la misma palabra.
const mismaPalabra = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.replace(/e?s$/, '') === b.replace(/e?s$/, '')));

/**
 * Sugiere la etiqueta de un gasto a partir de su descripción.
 * Orden: 1) la etiqueta se nombra en el texto; 2) un gasto anterior con la
 * misma descripción o la misma palabra clave (aprende del uso); 3) palabras
 * comunes (uber → Transporte) si existe una etiqueta con ese nombre.
 *
 * @param {string} descripcion
 * @param {{id:number, nombre:string}[]} etiquetas  etiquetas del negocio
 * @param {{descripcion:string, categoria_id:number|null}[]} historial  gastos anteriores, el más reciente primero
 * @returns {number|null} id de la etiqueta sugerida
 */
export const sugerirEtiqueta = (descripcion, etiquetas = [], historial = []) => {
  const texto = normalizar(descripcion);
  if (!texto || !etiquetas.length) return null;
  const palabras = palabrasDe(texto);
  if (!palabras.length) return null;

  const lista = etiquetas
    .map((e) => ({ id: e.id, n: nombreComparable(e.nombre) }))
    .filter((e) => e.n.length >= 3);
  const validas = new Set(lista.map((e) => e.id));

  // 1. La etiqueta aparece en el texto ("meta ads campaña" → Meta Ads).
  const nombrada = lista.find((e) => (
    e.n.includes(' ') ? ` ${texto} `.includes(` ${e.n} `) : palabras.some((p) => mismaPalabra(p, e.n))
  ));
  if (nombrada) return nombrada.id;

  // 2. Historial: lo que ya se hizo con un gasto parecido.
  const usables = historial.filter((h) => h?.categoria_id != null && validas.has(h.categoria_id) && h.descripcion);
  const exacto = usables.find((h) => normalizar(h.descripcion) === texto);
  if (exacto) return exacto.categoria_id;
  const clave = palabras[0];
  const porClave = usables.find((h) => palabrasDe(normalizar(h.descripcion))[0] === clave);
  if (porClave) return porClave.categoria_id;
  const porPalabra = usables.find((h) => {
    const suyas = palabrasDe(normalizar(h.descripcion));
    return palabras.some((p) => p.length >= 4 && suyas.some((s) => mismaPalabra(p, s)));
  });
  if (porPalabra) return porPalabra.categoria_id;

  // 3. Palabras comunes → etiqueta con un nombre equivalente.
  for (const grupo of SINONIMOS) {
    const aparece = grupo.palabras.some((p) => (p.includes(' ') ? ` ${texto} `.includes(` ${p} `) : palabras.includes(p)));
    if (!aparece) continue;
    const etiqueta = lista.find((e) => grupo.etiquetas.some((g) => e.n === g || ` ${e.n} `.includes(` ${g} `)));
    if (etiqueta) return etiqueta.id;
  }
  return null;
};

/**
 * Producto del inventario que se nombra en la descripción de un ingreso
 * ("venta curso manipulación" → ítem "Curso de manipulación de alimentos").
 * Exige al menos dos palabras en común (o el nombre completo) para no
 * adivinar de más.
 */
export const sugerirProducto = (descripcion, inventario = []) => {
  const texto = normalizar(descripcion);
  if (!texto || !inventario.length) return null;
  const palabras = palabrasDe(texto);
  let mejor = null;
  let mejorPuntaje = 0;
  for (const item of inventario) {
    const nombre = normalizar(item?.nombre || '');
    if (!nombre) continue;
    if (` ${texto} `.includes(` ${nombre} `)) return item;
    const suyas = palabrasDe(nombre);
    const comunes = palabras.filter((p) => p.length >= 4 && suyas.some((s) => mismaPalabra(p, s))).length;
    const necesarias = Math.min(2, suyas.length);
    if (comunes >= necesarias && comunes > mejorPuntaje) {
      mejor = item;
      mejorPuntaje = comunes;
    }
  }
  return mejor;
};
