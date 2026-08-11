/**
 * currency.js — Utilidad de formato de moneda para toda la app.
 *
 * Cubre todos los países de América Latina. Se usa el código ISO 3166-1 alpha-2
 * del país del negocio (almacenado en `businesses.country` y expuesto en el JWT
 * como `user.country`) para seleccionar el locale y la moneda correcta.
 *
 * Los separadores (miles y decimal) NO se escriben a mano: se derivan del locale
 * con Intl, así que Colombia da "25.000,00" y México "25,000.00" sin listas fijas.
 *
 * Uso display:
 *   formatCurrency(25000, 'CO')  →  "COP 25.000,00"
 *   formatCurrency(25000, 'MX')  →  "MXN 25,000.00"
 *   formatCurrency(25000, 'CL')  →  "CLP 25.000"      (el peso chileno no tiene centavos)
 *
 * Uso en InputNumber:
 *   const props = getInputCurrencyProps('CO');
 *   <InputNumber {...props} />      // acepta y muestra "25.000,00"
 */

// ---------------------------------------------------------------------------
// MAPA DE PAÍSES LATAM
//
// `decimals` = cuántos decimales tiene la moneda en la práctica.
// Solo van en 0 las monedas que no tienen subunidad en circulación
// (peso chileno y guaraní); el resto maneja centavos.
// ---------------------------------------------------------------------------
export const COUNTRY_CURRENCY_MAP = {
  AR: { locale: 'es-AR', currency: 'ARS', decimals: 2, name: 'Argentina',       phoneCode: '+54'  },
  BO: { locale: 'es-BO', currency: 'BOB', decimals: 2, name: 'Bolivia',         phoneCode: '+591' },
  BR: { locale: 'pt-BR', currency: 'BRL', decimals: 2, name: 'Brasil',          phoneCode: '+55'  },
  CL: { locale: 'es-CL', currency: 'CLP', decimals: 0, name: 'Chile',           phoneCode: '+56'  },
  CO: { locale: 'es-CO', currency: 'COP', decimals: 2, name: 'Colombia',        phoneCode: '+57'  },
  CR: { locale: 'es-CR', currency: 'CRC', decimals: 2, name: 'Costa Rica',      phoneCode: '+506' },
  CU: { locale: 'es-CU', currency: 'CUP', decimals: 2, name: 'Cuba',            phoneCode: '+53'  },
  DO: { locale: 'es-DO', currency: 'DOP', decimals: 2, name: 'Rep. Dominicana', phoneCode: '+1'   },
  EC: { locale: 'es-EC', currency: 'USD', decimals: 2, name: 'Ecuador',         phoneCode: '+593' },
  SV: { locale: 'es-SV', currency: 'USD', decimals: 2, name: 'El Salvador',     phoneCode: '+503' },
  GT: { locale: 'es-GT', currency: 'GTQ', decimals: 2, name: 'Guatemala',       phoneCode: '+502' },
  HN: { locale: 'es-HN', currency: 'HNL', decimals: 2, name: 'Honduras',       phoneCode: '+504' },
  MX: { locale: 'es-MX', currency: 'MXN', decimals: 2, name: 'México',         phoneCode: '+52'  },
  NI: { locale: 'es-NI', currency: 'NIO', decimals: 2, name: 'Nicaragua',       phoneCode: '+505' },
  PA: { locale: 'es-PA', currency: 'USD', decimals: 2, name: 'Panamá',         phoneCode: '+507' },
  PY: { locale: 'es-PY', currency: 'PYG', decimals: 0, name: 'Paraguay',       phoneCode: '+595' },
  PE: { locale: 'es-PE', currency: 'PEN', decimals: 2, name: 'Perú',           phoneCode: '+51'  },
  PR: { locale: 'es-PR', currency: 'USD', decimals: 2, name: 'Puerto Rico',     phoneCode: '+1'   },
  UY: { locale: 'es-UY', currency: 'UYU', decimals: 2, name: 'Uruguay',        phoneCode: '+598' },
  VE: { locale: 'es-VE', currency: 'VES', decimals: 2, name: 'Venezuela',      phoneCode: '+58'  },
};

/** URL de bandera real (no emoji) — funciona en todos los SO incluyendo Windows */
export const getFlagUrl = (code) =>
  `https://flagcdn.com/w20/${code.toLowerCase()}.png`;

const DEFAULT_COUNTRY = 'CO';

const getConfig = (countryCode) =>
  COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP[DEFAULT_COUNTRY];

// ---------------------------------------------------------------------------
// SEPARADORES DEL LOCALE
// es-CO → { group: '.', decimal: ',' } · es-MX → { group: ',', decimal: '.' }
// ---------------------------------------------------------------------------
const separatorCache = new Map();

export const getSeparators = (countryCode) => {
  const { locale } = getConfig(countryCode);
  if (separatorCache.has(locale)) return separatorCache.get(locale);

  const parts = new Intl.NumberFormat(locale, { minimumFractionDigits: 2 })
    .formatToParts(12345.6);

  const seps = {
    group:   parts.find((p) => p.type === 'group')?.value   || '.',
    decimal: parts.find((p) => p.type === 'decimal')?.value || ',',
  };
  separatorCache.set(locale, seps);
  return seps;
};

/** Cuántos decimales usa la moneda del país (0 para CLP y PYG) */
export const getCurrencyDecimals = (countryCode) => getConfig(countryCode).decimals;

// ---------------------------------------------------------------------------
// DISPLAY — formato de texto (tablas, cards, stats, PDFs, etc.)
// Muestra el código ISO de la moneda al frente: "COP 25.000,00"
// ---------------------------------------------------------------------------
export const formatCurrency = (value, countryCode) => {
  const config = getConfig(countryCode);
  return `${config.currency} ${formatAmount(value, countryCode)}`;
};

/**
 * Igual que formatCurrency pero SIN el código de moneda: "25.000,00".
 * Útil donde el símbolo ya está en el diseño (columnas de tabla, facturas).
 */
export const formatAmount = (value, countryCode) => {
  const config = getConfig(countryCode);
  const number = Number(value);

  return new Intl.NumberFormat(config.locale, {
    style: 'decimal',
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(Number.isFinite(number) ? number : 0);
};

// ---------------------------------------------------------------------------
// INPUTS — props listas para usar en <InputNumber>
//
//   const currencyProps = getInputCurrencyProps('CO');
//   <InputNumber {...currencyProps} min={0} />
//
// Ojo: rc-input-number ignora `decimalSeparator` cuando se le pasa un `parser`
// propio, así que la coma decimal la resolvemos nosotros en formatter/parser.
// ---------------------------------------------------------------------------
export const getInputCurrencyProps = (countryCode) => {
  const config = getConfig(countryCode);
  const { group, decimal } = getSeparators(countryCode);
  const { decimals } = config;

  /** "25.000,50" → "25000.50" (lo que antd entiende como número) */
  const parser = (v) => {
    if (v === null || v === undefined || v === '') return '';
    let str = String(v).split(group).join('');
    if (decimals > 0) {
      str = str.replace(decimal, '.');
    } else {
      // Moneda sin centavos: lo que venga tras la coma se descarta en vez de
      // pegarse a los enteros (25000,50 → 25000, nunca 2500050)
      str = str.split(decimal)[0];
    }
    // Deja solo dígitos, el punto decimal y el signo
    str = str.replace(/[^0-9.-]/g, '');
    if (decimals === 0) str = str.split('.')[0];
    return str;
  };

  /**
   * Valor interno de antd (siempre con punto) → texto visible del locale.
   * Mientras el usuario escribe respetamos lo tecleado si representa el mismo
   * número: así no le borramos la coma ni los ceros de la derecha a medio digitar.
   */
  const formatter = (v, info) => {
    if (v === null || v === undefined || v === '') return '';

    if (info?.userTyping && info.input) {
      const typed = parser(info.input);
      if (typed !== '' && Number(typed) === Number(v)) return info.input;
    }

    let str = String(v);
    const negative = str.startsWith('-');
    if (negative) str = str.slice(1);

    const [rawInt = '', rawDec] = str.split('.');
    const int = (rawInt.replace(/\D/g, '') || '0')
      .replace(/\B(?=(\d{3})+(?!\d))/g, group);

    let out = int;
    if (decimals > 0) {
      const dec = info?.userTyping
        ? (rawDec === undefined ? null : rawDec.slice(0, decimals))   // sin rellenar
        : (rawDec || '').padEnd(decimals, '0').slice(0, decimals);    // "50" fijo
      if (dec !== null) out = `${int}${decimal}${dec}`;
    }

    return negative ? `-${out}` : out;
  };

  return {
    /** Código de moneda — se pinta al final del InputNumber */
    addonAfter: config.currency,
    /** Alias para Statistic / Input que usan prefix */
    prefix: config.currency,
    /** Fija los decimales al salir del campo */
    precision: decimals,
    /** Las flechitas suben/bajan de a un centavo */
    step: decimals > 0 ? 0.01 : 1,
    formatter,
    parser,
  };
};

// Retorna solo el código: "COP", "MXN", "USD" …
export const getCurrencyCode = (countryCode) => getConfig(countryCode).currency;

/**
 * Retorna el símbolo de moneda del país.
 * @deprecated — usar getCurrencyCode() para mostrar el código ISO
 */
export const getCurrencySymbol = (countryCode) => {
  const config = getConfig(countryCode);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(0).find((p) => p.type === 'currency')?.value || '$';
};

// ---------------------------------------------------------------------------
// LISTA PARA EL SELECT DE PAÍSES
// ---------------------------------------------------------------------------
export const LATAM_COUNTRIES = Object.entries(COUNTRY_CURRENCY_MAP)
  .map(([code, info]) => ({
    value: code,
    name: info.name,
    currency: info.currency,
    phoneCode: info.phoneCode,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));
