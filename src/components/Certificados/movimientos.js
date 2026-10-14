// Lectura de los registros de Movimientos que comparten la tabla de escritorio
// y la vista del celular (así ambas muestran lo mismo de un ingreso o gasto).

/** Ítems vendidos de un ingreso (llegan como arreglo o como JSON en texto). */
export const itemsDe = (r = {}) => {
  let items = r.items_detalle;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return Array.isArray(items) ? items : [];
};

/** Concepto de un ingreso: los productos vendidos o, si no hay, el texto del producto. */
export const conceptoDe = (r = {}) => {
  const items = itemsDe(r);
  if (items.length > 0) {
    return items.map((it) => it.descripcion || it.nombre_producto || '').filter(Boolean).join(', ');
  }
  return (r.producto || '').trim();
};

/** Nombre del cliente de un ingreso ('' si es venta general). */
export const clienteDe = (r = {}) =>
  `${r.cliente_nombre || r.nombre || ''} ${r.persona_id != null ? (r.cliente_apellido ?? '') : (r.apellido || '')}`.trim();
