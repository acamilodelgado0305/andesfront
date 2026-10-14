/**
 * useCurrency — Hook que retorna una función de formateo de moneda
 * basada en el país del negocio activo (user.country del AuthContext).
 *
 * Uso display:
 *   const fmt = useCurrency();
 *   fmt(150000)   →  "COP 150.000,00"  (Colombia)
 *   fmt(150000)   →  "MXN 150,000.00"  (México)
 *
 *   const monto = useAmount();
 *   monto(150000) →  "150.000,00"      (sin código de moneda)
 *
 * Uso en InputNumber:
 *   const { prefix, formatter, parser } = useCurrencyInput();
 *   <InputNumber prefix={prefix} formatter={formatter} parser={parser} />
 *
 * Si el componente no está dentro de AuthProvider, usa Colombia como fallback.
 */
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import {
  formatCurrency,
  formatAmount,
  formatAmountShort,
  formatAmountCompact,
  formatTypedAmount,
  typedAmountFromValue,
  getCurrencyCode,
  getInputCurrencyProps,
} from '../utils/currency';

/** País del negocio activo; Colombia si no hay contexto disponible */
const useCountry = () => {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useContext(AuthContext);
    return ctx?.user?.country || 'CO';
  } catch (_) {
    return 'CO';
  }
};

/** Formateo de moneda para mostrar: "COP 25.000,00", "MXN 25,000.00" */
const useCurrency = () => {
  const country = useCountry();
  return (value) => formatCurrency(value, country);
};

/**
 * Solo el número, sin el código de moneda: "25.000,00".
 * Para espacios angostos donde el `$` ya está en el diseño.
 */
export const useAmount = () => {
  const country = useCountry();
  return (value) => formatAmount(value, country);
};

/**
 * Monto corto para el celular: "25.000" (sin ",00"); los centavos que sí
 * existen se muestran: "25.000,50".
 */
export const useAmountShort = () => {
  const country = useCountry();
  return (value) => formatAmountShort(value, country);
};

/** Monto compacto para espacios mínimos: "717K", "1,48M". */
export const useAmountCompact = () => {
  const country = useCountry();
  return (value) => formatAmountCompact(value, country);
};

/**
 * Campo de monto tecleado (registro rápido): da formato mientras se escribe.
 *   const { codigo, formatear, desdeValor } = useTypedAmount();
 *   formatear('25000')   → { texto: '25.000', valor: 25000 }
 *   desdeValor(25000.5)  → '25.000,50'
 */
export const useTypedAmount = () => {
  const country = useCountry();
  return {
    codigo: getCurrencyCode(country),
    formatear: (raw) => formatTypedAmount(raw, country),
    desdeValor: (value) => typedAmountFromValue(value, country),
  };
};

/** Props listas para <InputNumber prefix formatter parser precision step /> */
export const useCurrencyInput = () => getInputCurrencyProps(useCountry());

export default useCurrency;
