import { lazy } from "react";

// Envuelve React.lazy para recuperarse de un fallo al descargar un chunk.
// Caso típico: tras un nuevo despliegue, el index.html cacheado del usuario
// pide un archivo con hash viejo que ya no existe (404 → el hosting devuelve
// index.html como HTML) → el import del módulo falla y la app quedaba en blanco.
//
// Estrategia: si un chunk falla al cargar, recargamos UNA vez para obtener el
// index.html nuevo (que referencia los hashes correctos). Guardamos el momento
// de la recarga (timestamp) en sessionStorage para NO entrar en un bucle de
// recargas si el fallo persiste o si varios chunks fallan a la vez (lo que pasa
// al refrescar con la sesión iniciada: se cargan Root + la vista simultáneamente).
const RELOAD_TS_KEY = "chunk-reload-ts";
const RELOAD_WINDOW_MS = 15000; // si ya recargamos hace <15s y sigue fallando, no insistas

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      let lastReload = 0;
      try {
        lastReload = Number(window.sessionStorage.getItem(RELOAD_TS_KEY)) || 0;
      } catch {
        // sessionStorage puede no estar disponible (modo privado, etc.)
      }
      const now = Date.now();

      // Solo recargamos si no lo hicimos hace muy poco. Así un chunk que carga
      // bien nunca borra la guarda de otro que está fallando → sin bucles.
      if (now - lastReload > RELOAD_WINDOW_MS) {
        try {
          window.sessionStorage.setItem(RELOAD_TS_KEY, String(now));
        } catch {
          // ignore
        }
        window.location.reload();
        // Componente vacío mientras el navegador recarga.
        return { default: () => null };
      }

      // Ya recargamos hace poco y sigue fallando: dejamos que el ErrorBoundary
      // muestre un mensaje claro en vez de la pantalla en blanco.
      throw error;
    }
  });
}
