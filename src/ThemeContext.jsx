// src/ThemeContext.jsx
// Contexto global de tema (modo oscuro) para toda la app.
//
// Estrategia de persistencia (mejor de ambos mundos):
//   1. localStorage `qc-theme`  → caché local, pinta al instante sin parpadeo
//      (lo lee también el script inline de index.html antes de montar React).
//   2. Backend `users.theme_preference` → fuente de verdad cross-device; se
//      adopta cuando el usuario inicia sesión en un dispositivo nuevo.
//
// Modos: 'light' | 'dark' | 'system' ('system' sigue al SO en vivo).
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import {
  getStoredTheme,
  storeTheme,
  applyThemeToDom,
  resolveIsDark,
  persistThemeToBackend,
} from './services/theme/themeService';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Modo seleccionado por el usuario (light | dark | system).
  const [mode, setMode] = useState(() => getStoredTheme());
  // ¿El tema efectivo actual es oscuro? (resuelve 'system').
  const [isDark, setIsDark] = useState(() => resolveIsDark(getStoredTheme()));

  const auth = useContext(AuthContext);
  const backendPreference = auth?.user?.theme_preference;

  // Aplica el tema al DOM cada vez que cambia el modo.
  useEffect(() => {
    setIsDark(applyThemeToDom(mode));
  }, [mode]);

  // Si el modo es 'system', reacciona en vivo a los cambios del SO.
  useEffect(() => {
    if (mode !== 'system') return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setIsDark(applyThemeToDom('system'));
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  // Al iniciar sesión, adoptar la preferencia guardada en el backend
  // (fuente de verdad). Solo si difiere de la caché local: así, al entrar en
  // un dispositivo nuevo, se respeta lo configurado por el usuario.
  useEffect(() => {
    if (!backendPreference) return;
    if (backendPreference !== getStoredTheme()) {
      storeTheme(backendPreference);
      setMode(backendPreference);
    }
  }, [backendPreference]);

  // Cambia el tema: estado + DOM + caché local + backend.
  const setTheme = useCallback((next) => {
    setMode(next);
    storeTheme(next);
    persistThemeToBackend(next);
  }, []);

  // Alterna rápido entre claro y oscuro (ignora 'system' para el botón rápido).
  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook de consumo. Lanza si se usa fuera del provider para detectar errores.
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
};

export { ThemeContext };
