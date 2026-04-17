/**
 * useCurrency — Hook que retorna una función de formateo de moneda
 * basada en el país del negocio activo (user.country del AuthContext).
 *
 * Uso display:
 *   const fmt = useCurrency();
 *   fmt(150000)   →  "COP 150.000"  (Colombia)
 *   fmt(150000)   →  "MXN 150,000"  (México)
 *
 * Uso en InputNumber:
 *   const { prefix, formatter, parser } = useCurrencyInput();
 *   <InputNumber prefix={prefix} formatter={formatter} parser={parser} />
 *
 * Si el componente no está dentro de AuthProvider, usa Colombia como fallback.
 */
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { formatCurrency, getInputCurrencyProps } from '../utils/currency';

/** Formateo de moneda para mostrar: "COP 150.000", "MXN 150,000" */
const useCurrency = () => {
  let country = 'CO';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useContext(AuthContext);
    country = ctx?.user?.country || 'CO';
  } catch (_) {
    // contexto no disponible — usa Colombia
  }
  return (value) => formatCurrency(value, country);
};

/** Props listas para <InputNumber prefix formatter parser /> */
export const useCurrencyInput = () => {
  let country = 'CO';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useContext(AuthContext);
    country = ctx?.user?.country || 'CO';
  } catch (_) {
    // contexto no disponible — usa Colombia
  }
  return getInputCurrencyProps(country);
};

export default useCurrency;
