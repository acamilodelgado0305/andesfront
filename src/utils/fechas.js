import dayjs from 'dayjs';

/**
 * Fechas «solo día» (columnas DATE del backend: fecha_vencimiento, fecha_emision…).
 *
 * El backend puede responderlas como '2026-09-01' o como '2026-09-01T00:00:00.000Z'.
 * dayjs() interpreta la segunda en hora local: en Colombia (UTC-5) da el 31/08 a las
 * 19:00 y se muestra un día antes. Aquí se toma solo la parte de la fecha, así que el
 * día que se eligió en el calendario es el que se ve.
 */

// Valor del backend -> dayjs local del mismo día (o null).
export const parseFechaDia = (v) => {
  if (!v) return null;
  const s = typeof v === 'string' ? v : dayjs(v).format('YYYY-MM-DD');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  const d = dayjs(m ? m[1] : s, 'YYYY-MM-DD');
  return d.isValid() ? d : null;
};

// Valor del backend -> texto para mostrar.
export const formatFechaDia = (v, formato = 'DD/MM/YYYY', vacio = '—') => {
  const d = parseFechaDia(v);
  return d ? d.format(formato) : vacio;
};

// dayjs (DatePicker) -> string que se manda al backend.
export const toFechaDiaPayload = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : null);
