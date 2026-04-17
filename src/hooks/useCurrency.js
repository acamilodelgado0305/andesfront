/**
 * useCurrency — Hook que retorna una función de formateo de moneda
 * basada en el país del negocio activo (user.country del AuthContext).
 *
 * Uso:
 *   const fmt = useCurrency();
 *   fmt(150000)   →  "$ 150.000"  (Colombia)
 *   fmt(150000)   →  "$150,000"   (México)
 *
 * Si el componente no está dentro de AuthProvider, usa Colombia como fallback.
 */
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { formatCurrency } from '../utils/currency';

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

export default useCurrency;
