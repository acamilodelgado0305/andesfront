/**
 * numeroALetras.js — Valor en palabras para facturas y cotizaciones.
 *
 *   montoEnLetras(1904000, 'CO')   →  "UN MILLÓN NOVECIENTOS CUATRO MIL PESOS M/CTE"
 *   montoEnLetras(2000000, 'CO')   →  "DOS MILLONES DE PESOS M/CTE"
 *   montoEnLetras(1250.5, 'MX')    →  "MIL DOSCIENTOS CINCUENTA PESOS CON CINCUENTA CENTAVOS M.N."
 */
import { getCurrencyCode, getCurrencyDecimals } from './currency';

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DIEZ_A_DIECINUEVE = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const VEINTIS = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

// «uno» se apocopa delante de un sustantivo: «un peso», «veintiún mil», «treinta y un pesos»
const apocopar = (txt) => txt.replace(/uno$/, 'un').replace(/veintiun$/, 'veintiún');

// 0..999
const centenas = (n, apocope) => {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  const c = Math.floor(n / 100);
  const r = n % 100;
  let dec = '';
  if (r > 0 && r < 10)       dec = UNIDADES[r];
  else if (r < 20 && r >= 10) dec = DIEZ_A_DIECINUEVE[r - 10];
  else if (r < 30 && r >= 20) dec = VEINTIS[r - 20];
  else if (r >= 30)           dec = DECENAS[Math.floor(r / 10)] + (r % 10 ? ` y ${UNIDADES[r % 10]}` : '');

  if (apocope) dec = apocopar(dec);
  return [CENTENAS[c], dec].filter(Boolean).join(' ');
};

// 0..999.999
const miles = (n, apocope) => {
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const txtMiles = m === 0 ? '' : m === 1 ? 'mil' : `${centenas(m, true)} mil`;
  return [txtMiles, centenas(r, apocope)].filter(Boolean).join(' ');
};

/** Entero a palabras (hasta 999.999.999.999). `apocope` = va delante de un sustantivo. */
export const enteroALetras = (n, apocope = false) => {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return 'cero';

  const mill = Math.floor(n / 1e6);
  const r = n % 1e6;
  const txtMill = mill === 0 ? '' : mill === 1 ? 'un millón' : `${miles(mill, true)} millones`;
  return [txtMill, miles(r, apocope)].filter(Boolean).join(' ');
};

// [singular, plural, sufijo legal]
const MONEDAS = {
  COP: ['peso', 'pesos', 'M/CTE'],
  MXN: ['peso', 'pesos', 'M.N.'],
  ARS: ['peso', 'pesos', ''],
  CLP: ['peso', 'pesos', ''],
  CUP: ['peso', 'pesos', ''],
  DOP: ['peso', 'pesos', ''],
  UYU: ['peso', 'pesos', ''],
  USD: ['dólar', 'dólares', ''],
  BOB: ['boliviano', 'bolivianos', ''],
  BRL: ['real', 'reales', ''],
  CRC: ['colón', 'colones', ''],
  GTQ: ['quetzal', 'quetzales', ''],
  HNL: ['lempira', 'lempiras', ''],
  NIO: ['córdoba', 'córdobas', ''],
  PYG: ['guaraní', 'guaraníes', ''],
  PEN: ['sol', 'soles', ''],
  VES: ['bolívar', 'bolívares', ''],
};

/** Monto con moneda del país, en MAYÚSCULAS como se estila en las facturas. */
export const montoEnLetras = (value, countryCode) => {
  const [sing, plur, sufijo] = MONEDAS[getCurrencyCode(countryCode)] || MONEDAS.COP;
  const abs = Math.abs(Number(value) || 0);
  const entero = Math.floor(abs);
  const centavos = getCurrencyDecimals(countryCode) > 0 ? Math.round((abs - entero) * 100) % 100 : 0;

  // «un millón DE pesos», «dos millones DE pesos»; pero «un millón cien pesos»
  const de = entero >= 1e6 && entero % 1e6 === 0 ? ' de' : '';
  let txt = `${enteroALetras(entero, true)}${de} ${entero === 1 ? sing : plur}`;
  if (centavos > 0) txt += ` con ${enteroALetras(centavos, true)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  if (sufijo) txt += ` ${sufijo}`;
  return txt.toUpperCase();
};
