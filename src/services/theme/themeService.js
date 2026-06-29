// src/services/theme/themeService.js
// Utilidades de tema (modo oscuro) compartidas: clave de caché local,
// resolución de "system" y persistencia en backend.
import axios from 'axios';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

// Clave de caché en localStorage. Se lee antes de montar React (script en
// index.html) para pintar el tema correcto sin parpadeo (FOUC).
export const THEME_STORAGE_KEY = 'qc-theme';

// Modos válidos. 'system' sigue prefers-color-scheme del SO.
export const THEME_MODES = ['light', 'dark', 'system'];

export const getStoredTheme = () => {
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_MODES.includes(v) ? v : 'system';
};

export const storeTheme = (mode) => {
  if (THEME_MODES.includes(mode)) localStorage.setItem(THEME_STORAGE_KEY, mode);
};

// ¿El modo (resuelto) es oscuro? 'system' consulta el SO.
export const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveIsDark = (mode) =>
  mode === 'dark' || (mode === 'system' && systemPrefersDark());

// Aplica el tema al DOM: clase `dark` en <html> (Tailwind) + color-scheme
// (controla scrollbars/inputs nativos) + data-theme para CSS específico.
export const applyThemeToDom = (mode) => {
  const isDark = resolveIsDark(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  return isDark;
};

// Persiste la preferencia en el backend (fuente de verdad cross-device).
// Silencioso ante errores: la caché local ya cubre la sesión actual.
export const persistThemeToBackend = async (mode) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token || !API_AUTH_URL) return;
    await axios.patch(
      `${API_AUTH_URL}/api/users/me/theme`,
      { theme_preference: mode },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    /* no crítico: la preferencia queda guardada localmente */
  }
};
