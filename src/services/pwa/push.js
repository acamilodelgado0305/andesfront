// src/services/pwa/push.js
// Notificaciones al celular (Web Push) para Tareas.
//
// El navegador entrega una "suscripción" (dirección única del dispositivo en
// el servicio de push de Apple/Google); se guarda en el backend y desde allá
// se mandan los avisos. El que los muestra es el service worker (public/sw.js),
// por eso funcionan con la app cerrada.
//
// iPhone: solo desde iOS 16.4 y con la app INSTALADA en la pantalla de inicio
// (Safari → Compartir → "Agregar a inicio"). En Safari normal no existe.
import { esIOS, esStandalone } from './pwa';
import { suscribirAvisos, desuscribirAvisos } from '../tareas/tareasService';

export const pushSoportado = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * Qué se puede hacer en ESTE dispositivo:
 *  'activo' | 'disponible' | 'bloqueado' | 'instalar-ios' | 'no-soportado'
 */
export const estadoPushDispositivo = async () => {
  if (esIOS() && !esStandalone()) return 'instalar-ios';
  if (!pushSoportado()) return 'no-soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  const sub = await suscripcionActual();
  return sub && Notification.permission === 'granted' ? 'activo' : 'disponible';
};

const registro = async () => {
  // En producción pwa.js ya lo registró; en desarrollo se registra aquí, solo
  // cuando alguien activa los avisos.
  const existente = await navigator.serviceWorker.getRegistration('/');
  if (existente) return existente;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
};

export const suscripcionActual = async () => {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
};

const aUint8 = (base64) => {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
};

const nombreDispositivo = () => {
  const ua = navigator.userAgent;
  const so = /iphone|ipad/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'Mac' : 'Navegador';
  const nav = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : '';
  return `${so}${nav ? ` · ${nav}` : ''}`;
};

/**
 * Pide permiso y registra el dispositivo. Debe llamarse dentro de un toque
 * del usuario (Safari solo pregunta desde un gesto).
 * @returns {Promise<object>} la config de avisos que devuelve el backend
 */
export const activarPush = async (clavePublica) => {
  if (!clavePublica) throw new Error('El servidor todavía no tiene configuradas las notificaciones');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    const err = new Error(permiso === 'denied' ? 'bloqueado' : 'sin-permiso');
    err.code = permiso;
    throw err;
  }
  const reg = await registro();
  let sub = await reg.pushManager.getSubscription();
  // Una suscripción hecha con otra llave (servidor reconfigurado) no sirve.
  if (sub) {
    const actual = sub.options?.applicationServerKey;
    const nueva = aUint8(clavePublica);
    const igual = actual && new Uint8Array(actual).every((b, i) => b === nueva[i]);
    if (!igual) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aUint8(clavePublica) });
  }
  return suscribirAvisos(sub.toJSON(), nombreDispositivo());
};

export const desactivarPush = async () => {
  const sub = await suscripcionActual();
  if (!sub) return null;
  const { endpoint } = sub;
  await sub.unsubscribe().catch(() => {});
  return desuscribirAvisos(endpoint);
};
