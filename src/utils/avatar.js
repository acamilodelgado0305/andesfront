// src/utils/avatar.js
// Helpers del avatar de personas (usuarios, docentes, autores del foro).
// La foto de perfil vive en auth-service (`users.avatar_url`) y es única por
// usuario: no cambia al cambiar de negocio. Cuando no hay foto se pintan las
// iniciales (estilo Microsoft) con un color determinístico por nombre, para que
// la misma persona siempre salga del mismo color en toda la app.

export const initialsFromName = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const AVATAR_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#dc2626', '#4f46e5', '#0891b2', '#ca8a04'];

export const colorFromName = (name) => {
  const s = name || '?';
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};
