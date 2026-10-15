// Categorías del inventario y su color. Se comparten entre la lista, el
// formulario del producto y la ficha.

export const CATEGORIAS = [
  'Alimentos y bebidas', 'Tecnología y electrónica', 'Ropa y calzado',
  'Salud y belleza', 'Hogar y decoración', 'Papelería y oficina',
  'Herramientas y ferretería', 'Juguetes y entretenimiento', 'Deportes',
  'Automotriz', 'Mascotas', 'Servicios profesionales', 'Consultoría',
  'Diseño', 'Transporte', 'Educación', 'Construcción', 'Agropecuario', 'Otro',
];

// Color de cada categoría (presets de Ant Design).
const CATEGORIA_COLORS = {
  'Alimentos y bebidas': 'orange',
  'Tecnología y electrónica': 'geekblue',
  'Ropa y calzado': 'magenta',
  'Salud y belleza': 'pink',
  'Hogar y decoración': 'cyan',
  'Papelería y oficina': 'blue',
  'Herramientas y ferretería': 'volcano',
  'Juguetes y entretenimiento': 'purple',
  Deportes: 'lime',
  Automotriz: 'red',
  Mascotas: 'gold',
  'Servicios profesionales': 'blue',
  Consultoría: 'geekblue',
  Diseño: 'purple',
  Transporte: 'volcano',
  Educación: 'cyan',
  Construcción: 'gold',
  Agropecuario: 'green',
  Otro: 'default',
};

// Paleta de reserva para categorías antiguas que ya no están en la lista:
// mismo nombre → siempre el mismo color.
const FALLBACK_COLORS = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];

/** Preset de Ant Design (para <Tag color>). */
export const colorCategoria = (cat) => {
  if (!cat) return 'default';
  if (CATEGORIA_COLORS[cat]) return CATEGORIA_COLORS[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) % 997;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
};

// Tono medio de cada preset: sirve de punto y de tinte suave en claro y en oscuro.
const PRESET_HEX = {
  magenta: '#c41d7f', pink: '#c41d7f', red: '#cf1322', volcano: '#d4380d', orange: '#d46b08',
  gold: '#d48806', lime: '#7cb305', green: '#389e0d', cyan: '#08979c', blue: '#0958d9',
  geekblue: '#1d39c4', purple: '#531dab', default: '#9ca3af',
};

/** Color hex de la categoría (null si no tiene). */
export const hexCategoria = (cat) => (cat ? PRESET_HEX[colorCategoria(cat)] || PRESET_HEX.default : null);
