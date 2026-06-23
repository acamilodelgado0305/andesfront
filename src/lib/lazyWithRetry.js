import { lazy } from "react";

// Envuelve React.lazy para recuperarse de un fallo al descargar un chunk.
// Caso típico: tras un nuevo despliegue el index.html cacheado del usuario
// pide un archivo con hash viejo que ya no existe (404) → la app quedaba en
// blanco. Aquí intentamos recargar UNA sola vez antes de propagar el error.
const RELOAD_KEY = "chunk-reload-attempted";

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      const component = await factory();
      // Carga exitosa: limpiamos la marca para futuros despliegues.
      window.sessionStorage.removeItem(RELOAD_KEY);
      return component;
    } catch (error) {
      const alreadyReloaded = window.sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        // Probablemente un chunk obsoleto: forzamos recarga limpia una vez.
        window.sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Componente vacío mientras el navegador recarga.
        return { default: () => null };
      }
      // Ya recargamos y sigue fallando: dejamos que el ErrorBoundary lo maneje.
      throw error;
    }
  });
}
