/**
 * currency.js — Utilidad de formato de moneda para toda la app.
 *
 * Cubre todos los países de América Latina. Se usa el código ISO 3166-1 alpha-2
 * del país del negocio (almacenado en `businesses.country` y expuesto en el JWT
 * como `user.country`) para seleccionar el locale y la moneda correcta.
 *
 * Uso display:
 *   formatCurrency(150000, 'CO')  →  "COP 150.000"
 *   formatCurrency(150000, 'MX')  →  "MXN 150,000"
 *   formatCurrency(150000, 'BR')  →  "BRL 150.000"
 *
 * Uso en InputNumber:
 *   const { prefix, formatter, parser } = getInputCurrencyProps('CO');
 *   // prefix   → "COP"
 *   // formatter → "150.000"
 *   // parser   → "150000"
 */

// ---------------------------------------------------------------------------
// MAPA DE PAÍSES LATAM
// ---------------------------------------------------------------------------
export const COUNTRY_CURRENCY_MAP = {
  AR: { locale: 'es-AR', currency: 'ARS', decimals: 2, name: 'Argentina',       phoneCode: '+54'  },
  BO: { locale: 'es-BO', currency: 'BOB', decimals: 2, name: 'Bolivia',         phoneCode: '+591' },
  BR: { locale: 'pt-BR', currency: 'BRL', decimals: 2, name: 'Brasil',          phoneCode: '+55'  },
  CL: { locale: 'es-CL', currency: 'CLP', decimals: 0, name: 'Chile',           phoneCode: '+56'  },
  CO: { locale: 'es-CO', currency: 'COP', decimals: 0, name: 'Colombia',        phoneCode: '+57'  },
  CR: { locale: 'es-CR', currency: 'CRC', decimals: 0, name: 'Costa Rica',      phoneCode: '+506' },
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
  UY: { locale: 'es-UY', currency: 'UYU', decimals: 0, name: 'Uruguay',        phoneCode: '+598' },
  VE: { locale: 'es-VE', currency: 'VES', decimals: 2, name: 'Venezuela',      phoneCode: '+58'  },
};

/** URL de bandera real (no emoji) — funciona en todos los SO incluyendo Windows */
export const getFlagUrl = (code) =>
  `https://flagcdn.com/w20/${code.toLowerCase()}.png`;

const DEFAULT_COUNTRY = 'CO';

// ---------------------------------------------------------------------------
// DISPLAY — formato de texto (tablas, cards, stats, etc.)
// Muestra el código ISO de la moneda al frente: "COP 150.000", "MXN 150,000"
// ---------------------------------------------------------------------------
export const formatCurrency = (value, countryCode) => {
  const config = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP[DEFAULT_COUNTRY];

  // Formateamos solo el número con Intl (sin símbolo)
  const number = new Intl.NumberFormat(config.locale, {
    style: 'decimal',
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(value || 0);

  return `${config.currency}\u00A0${number}`;   // "COP 150.000"
};

// ---------------------------------------------------------------------------
// INPUTS — props listas para usar en <InputNumber>
//
// Uso:
//   const { prefix, formatter, parser } = getInputCurrencyProps('CO');
//   <InputNumber prefix={prefix} formatter={formatter} parser={parser} />
// ---------------------------------------------------------------------------
export const getInputCurrencyProps = (countryCode) => {
  const config = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP[DEFAULT_COUNTRY];

  // Separador de miles según locale:
  // período para COP, CLP, BRL, ARS…  coma para MXN, USD, HNL…
  const usesPeriod = ['es-CO','es-CL','pt-BR','es-AR','es-PY','es-UY'].includes(config.locale);
  const sep = usesPeriod ? '.' : ',';

  return {
    /** Código de moneda — usar addonAfter en InputNumber para mostrarlo al final */
    addonAfter: config.currency,
    /** Alias para Statistic / Input components que usan prefix */
    prefix: config.currency,

    /** Aplica separador de miles al valor numérico */
    formatter: (v) => {
      if (v === undefined || v === null || v === '') return '';
      const [int, dec] = String(v).split('.');
      const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      return config.decimals > 0 && dec !== undefined
        ? `${intFormatted}.${dec}`
        : intFormatted;
    },

    /** Elimina el separador de miles para que Ant Design pueda parsear el número */
    parser: (v) => {
      if (!v) return '';
      // Quitar cualquier carácter que no sea dígito, punto o coma
      return v.replace(new RegExp(`\\${sep}`, 'g'), '').replace(/[^0-9.]/g, '');
    },
  };
};

// Retorna solo el código: "COP", "MXN", "USD" …
export const getCurrencyCode = (countryCode) =>
  (COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP[DEFAULT_COUNTRY]).currency;

/**
 * Retorna el símbolo de moneda del país.
 * @deprecated — usar getCurrencyCode() para mostrar el código ISO
 */
export const getCurrencySymbol = (countryCode) => {
  const config = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP[DEFAULT_COUNTRY];
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
