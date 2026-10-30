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

  if (import.meta.env.PROD) vigilarVersionNueva();
};

// ── Versión nueva ──────────────────────────────────────────────────────────
// La app instalada en el celular casi nunca se cierra del todo: queda en
// segundo plano con el código viejo en memoria y no ve los despliegues. Al
// volver a ella (y cada 10 min) se compara el script principal del index.html
// publicado con el que está corriendo; si cambió, se recarga.
const scriptDe = (html) => (html.match(/\/assets\/index-[\w-]+\.js/) || [])[0] || null;

const vigilarVersionNueva = () => {
  const actual = scriptDe(document.querySelector('script[type="module"][src*="/assets/index-"]')?.getAttribute('src') || '');
  if (!actual) return;
  let ocultaDesde = 0;
  let avisada = false;

  const revisar = async (alVolver) => {
    try {
      const r = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
      const publicada = r.ok ? scriptDe(await r.text()) : null;
      if (!publicada || publicada === actual) return;
      // Volviendo de un rato largo afuera no hay nada a medio escribir: se recarga sola.
      if (alVolver && Date.now() - ocultaDesde > 2 * 60 * 1000) {
        window.location.reload();
        return;
      }
      if (avisada) return;
      avisada = true;
      const { notification } = await import('antd');
      notification.info({
        message: 'Hay una versión nueva de Rapictrl',
        description: 'Toca aquí para actualizar.',
        duration: 0,
        placement: 'bottom',
        onClick: () => window.location.reload(),
        style: { cursor: 'pointer' },
      });
    } catch { /* sin red: se revisa la próxima vez */ }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ocultaDesde = Date.now();
    else revisar(ocultaDesde > 0);
  });
  setInterval(() => { if (!document.hidden) revisar(false); }, 10 * 60 * 1000);
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
