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
import { formatCurrency, formatAmount, getInputCurrencyProps } from '../utils/currency';

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

/** Props listas para <InputNumber prefix formatter parser precision step /> */
export const useCurrencyInput = () => getInputCurrencyProps(useCountry());

export default useCurrency;
