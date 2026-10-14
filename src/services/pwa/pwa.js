// src/services/pwa/pwa.js
// La app se puede instalar en el celular (PWA): ícono en la pantalla de inicio,
// abre a pantalla completa sin la barra del navegador y carga más rápido.
//
// - Android/Chrome avisa que se puede instalar con `beforeinstallprompt`; se
//   guarda ese evento para lanzar la instalación desde un botón propio.
// - iPhone/Safari no tiene ese evento: se instala desde Compartir → "Agregar a
//   inicio", así que ahí se muestran las instrucciones.
import { useEffect, useState } from 'react';

let eventoInstalacion = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((fn) => fn());

export const esStandalone = () =>
  typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );

export const esIOS = () =>
  typeof navigator !== 'undefined' && (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se presenta como Mac con pantalla táctil
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

/** Se llama una vez al arrancar (main.jsx), antes de que el navegador avise. */
export const iniciarPwa = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // sin el banner automático: se ofrece desde la app
    eventoInstalacion = e;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalacion = null;
    avisar();
  });

  // Service worker solo en producción: en desarrollo cachearía el código que
  // se está editando. Ver public/sw.js.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* la app funciona igual sin él */ });
    });
  }
};

/** Estado de instalación para la UI: ¿ya está instalada?, ¿se puede ofrecer? */
export const usePwaInstall = () => {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const fn = () => refrescar((n) => n + 1);
    oyentes.add(fn);
    return () => { oyentes.delete(fn); };
  }, []);

  const instalada = esStandalone();
  return {
    instalada,
    // Android: instalación de un toque. iOS: hay que mostrar los pasos.
    puedeInstalar: !instalada && !!eventoInstalacion,
    necesitaPasosIOS: !instalada && !eventoInstalacion && esIOS(),
    instalar: async () => {
      if (!eventoInstalacion) return false;
      const evento = eventoInstalacion;
      evento.prompt();
      const { outcome } = await evento.userChoice;
      eventoInstalacion = null;
      avisar();
      return outcome === 'accepted';
    },
  };
};
