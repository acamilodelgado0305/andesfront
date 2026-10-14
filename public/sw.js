/* Service worker de Rapictrl (app instalable en el celular).
 *
 * Solo acelera y da respaldo sin señal; nunca sirve una versión vieja de la app
 * si hay red:
 *  - Páginas (navegación): primero la red; sin señal, el index.html guardado.
 *  - /assets/* (archivos con hash de Vite, inmutables): primero la caché.
 *  - Íconos e imágenes propias: caché y se refrescan por detrás.
 *  - APIs y todo lo de otros dominios: no se toca (siempre va a la red).
 *
 * Se registra solo en producción (src/services/pwa/pwa.js).
 */
const VERSION = 'v1';
const CACHE_PAGINA = `qc-pagina-${VERSION}`;
const CACHE_ASSETS = `qc-assets-${VERSION}`;
const CACHE_IMAGENES = `qc-imagenes-${VERSION}`;
const CACHES_VIGENTES = [CACHE_PAGINA, CACHE_ASSETS, CACHE_IMAGENES];
// Cada despliegue agrega archivos nuevos: se guardan los más recientes.
const MAX_ASSETS = 300;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGINA)
      .then((cache) => cache.addAll(['/index.html', '/images/logo.png', '/manifest.webmanifest']))
      .catch(() => { /* sin red al instalar: se llena en el primer uso */ })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((c) => c.startsWith('qc-') && !CACHES_VIGENTES.includes(c)).map((c) => caches.delete(c)),
      ))
      .then(() => self.clients.claim()),
  );
});

const recortar = async (nombre, maximo) => {
  const cache = await caches.open(nombre);
  const claves = await cache.keys();
  // keys() viene en orden de inserción: se borran las más viejas.
  await Promise.all(claves.slice(0, Math.max(0, claves.length - maximo)).map((k) => cache.delete(k)));
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: red primero (despliegues nuevos al instante); sin señal, la guardada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_PAGINA).then((cache) => cache.put('/index.html', copia));
          }
          return respuesta;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    );
    return;
  }

  // Archivos de la app con hash en el nombre: nunca cambian.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((guardada) => guardada || fetch(request).then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE_ASSETS)
            .then((cache) => cache.put(request, copia))
            .then(() => recortar(CACHE_ASSETS, MAX_ASSETS));
        }
        return respuesta;
      })),
    );
    return;
  }

  // Íconos, logo, manifiesto: lo guardado ya, y se actualiza por detrás.
  if (/^\/(icons|images)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.open(CACHE_IMAGENES).then((cache) => cache.match(request).then((guardada) => {
        const deRed = fetch(request).then((respuesta) => {
          if (respuesta.ok) cache.put(request, respuesta.clone());
          return respuesta;
        }).catch(() => guardada || Response.error());
        return guardada || deRed;
      })),
    );
  }
});
