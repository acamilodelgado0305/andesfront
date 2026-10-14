// src/services/nav/landing.js
// A dónde llega el usuario al entrar a la app (login, abrir el ícono instalado,
// cambiar de negocio).
//
// En el celular la app se usa sobre todo para anotar ingresos y gastos al
// momento, así que entra DIRECTO a Movimientos en vez de al resumen del inicio
// (que sigue a un toque en la barra inferior). En computador, el inicio.
import { buildNavSections } from './navSections';

export const MOVIMIENTOS_PATH = '/inicio/certificados';

// Mismo corte que el resto de la app (useIsMobile, root.jsx): < 768px.
export const esPantallaMovil = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(max-width: 767px)').matches;

/** Rutas de módulo (las del menú) que el usuario puede abrir en el negocio activo. */
export const rutasDelMenu = (user) =>
  buildNavSections(user).flatMap((s) => s.items.map((i) => i.path));

export const getLandingPath = (user) => {
  if (!user) return '/login';
  // El docente no usa el dashboard general; su inicio es "Mis Programas".
  if (user.role === 'docente') return '/inicio/mis-programas';
  if (esPantallaMovil() && rutasDelMenu(user).includes(MOVIMIENTOS_PATH)) return MOVIMIENTOS_PATH;
  return '/inicio';
};
