/**
 * currency.js — Utilidad de formato de moneda para toda la app.
 *
 * Cubre todos los países de América Latina. Se usa el código ISO 3166-1 alpha-2
 * del país del negocio (almacenado en `businesses.country` y expuesto en el JWT
 * como `user.country`) para seleccionar el locale y la moneda correcta.
 *
 * Uso:
 *   import { formatCurrency, LATAM_COUNTRIES } from '../utils/currency';
 *   formatCurrency(150000, 'CO')  →  "$ 150.000"
 *   formatCurrency(150000, 'MX')  →  "$150,000"
 *   formatCurrency(150000, 'BR')  →  "R$ 150.000"
 */

// ---------------------------------------------------------------------------
// MAPA DE PAÍSES LATAM
// phoneCode: código de discado internacional
// flagUrl: imagen real vía flagcdn.com (evita problema de emoji en Windows)
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

// URL de bandera real (no emoji) — funciona en todos los SO incluyendo Windows
export const getFlagUrl = (code) =>
  `https://flagcdn.com/w20/${code.toLowerCase()}.png`;

// Fallback
const DEFAULT_COUNTRY = 'CO';

/**
 * Formatea un valor numérico como moneda según el país del negocio.
 */
export const formatCurrency = (value, countryCode) => {
  const config = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP[DEFAULT_COUNTRY];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(value || 0);
};

/**
 * Retorna el símbolo de moneda del país.
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
// LISTA PARA EL SELECT (solo metadatos — el componente construye las opciones
// con imágenes reales usando getFlagUrl para evitar el problema de emoji Windows)
// ---------------------------------------------------------------------------
export const LATAM_COUNTRIES = Object.entries(COUNTRY_CURRENCY_MAP)
  .map(([code, info]) => ({
    value: code,
    name: info.name,
    currency: info.currency,
    phoneCode: info.phoneCode,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));
