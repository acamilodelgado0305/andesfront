// src/services/auth/sessionRefresh.js
// Mantiene viva la sesión: renueva el access token ANTES de que venza y
// reintenta con token nuevo las peticiones que igual lleguen con 401.
//
// Por qué existe: el access token dura 8 h y el refresh 30 días (ventana
// deslizante), pero la renovación solo vivía en `backApi` y en el axios global.
// Los servicios que crean su propia instancia con `axios.create` (movimientos,
// inventario, contactos, cuentas, facturas…) no la heredaban: con la app
// abierta más de 8 h —o al volver al celular al otro día sin recargar— cada
// guardado fallaba con 401 y parecía que "la sesión se había caído".
//
// Este módulo debe evaluarse ANTES que cualquier `axios.create` (se importa de
// primero en main.jsx): desde ese momento toda instancia nueva nace con la
// renovación instalada, sin tener que acordarse de hacerlo servicio por servicio.
import axios from "axios";
import { decodeJwt } from "../../utils/jwt.js";
import {
  getRefreshToken,
  refreshSession,
  persistSession,
  logout as clearSession,
} from "./authService";

const TOKEN_KEY = "authToken";

// Si al access token le queda menos que esto, se renueva antes de mandarlo.
const MARGEN_PETICION_MS = 2 * 60 * 1000;
// Al volver a la app (celular desbloqueado, pestaña otra vez al frente) se
// renueva con más holgura, para que lo que el usuario haga enseguida ya salga
// con un token fresco y sin esperar.
const MARGEN_AL_VOLVER_MS = 30 * 60 * 1000;

// En estos endpoints no se renueva ni se reintenta: un 401 en /login son
// credenciales incorrectas (lo maneja el formulario) y un 401 en /refresh es
// una sesión que ya no sirve.
const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
  "/api/auth/refresh",
  "/api/auth/demo",
];
export const isAuthEndpoint = (url = "") => AUTH_ENDPOINTS.some((e) => url.includes(e));

const msParaVencer = (token) => {
  const exp = decodeJwt(token)?.exp;
  return exp ? exp * 1000 - Date.now() : Infinity;
};

/**
 * ¿El servidor rechazó la sesión (refresh vencido, inválido o usuario borrado)?
 * Es distinto de un fallo de red —sin señal, servidor caído—: en ese caso NO se
 * saca al usuario; la app sigue con lo que tiene y se renueva al volver la red.
 */
export const esRechazoDeSesion = (error) => [400, 401, 403].includes(error?.response?.status);

// Cierra la sesión y manda al login (recarga completa: limpia el estado de React).
let redirigiendo = false;
export const cerrarSesionYSalir = () => {
  clearSession(); // borra authToken, refreshToken y authUser
  localStorage.removeItem("student_portal_token");
  const path = window.location.pathname;
  if (path !== "/login" && path !== "/" && !redirigiendo) {
    redirigiendo = true;
    window.location.assign("/login");
  }
};

// Una sola renovación a la vez: las peticiones que llegan mientras tanto
// esperan la misma promesa en vez de gastar el refresh token cada una.
let renovacionEnCurso = null;

/** Pide un access token nuevo con el refresh token y lo guarda. Devuelve el token. */
export const renovarSesion = () => {
  if (!renovacionEnCurso) {
    renovacionEnCurso = refreshSession(getRefreshToken())
      .then((session) => {
        persistSession(session); // nuevo access + refresh (rotado) + user
        return session.token;
      })
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
};

/**
 * Devuelve un access token vigente, renovándolo si vence en menos de `margenMs`.
 * null si no hay sesión de admin. Si la renovación falla, lanza el error y el
 * que llama decide (cerrar sesión solo si es un rechazo, no si es la red).
 */
export const asegurarTokenVigente = async (margenMs = MARGEN_PETICION_MS) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (msParaVencer(token) > margenMs || !getRefreshToken()) return token;
  return renovarSesion();
};

// Los headers llegan como AxiosHeaders (con get/set) o como objeto plano.
const leerHeader = (config, nombre) =>
  config.headers?.get?.(nombre) ?? config.headers?.[nombre];

const ponerHeader = (config, nombre, valor) => {
  if (config.headers?.set) config.headers.set(nombre, valor);
  else config.headers = { ...(config.headers || {}), [nombre]: valor };
};

// ── Antes de cada petición: si el token está por vencer, se renueva primero ──
// Los interceptores de petición corren del último al primero que se registró.
// Este se instala al crear la instancia, antes que el del servicio, así que
// corre DESPUÉS de que el servicio puso su header: lo revisa y lo reemplaza.
const alPedir = async (config) => {
  if (isAuthEndpoint(config.url)) return config;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return config;

  // Solo se tocan las peticiones que van con el token de admin. El portal de
  // estudiante usa el suyo y maneja su propia sesión.
  if (leerHeader(config, "Authorization") !== `Bearer ${token}`) return config;

  try {
    const fresco = await asegurarTokenVigente();
    if (fresco && fresco !== token) ponerHeader(config, "Authorization", `Bearer ${fresco}`);
  } catch (error) {
    if (esRechazoDeSesion(error)) {
      cerrarSesionYSalir();
      throw error;
    }
    // Sin red: se manda con el token que había; si de verdad venció, el 401
    // de abajo vuelve a intentar renovar.
  }
  return config;
};

// ── Si igual llega un 401: renovar una vez y reintentar con la misma instancia ──
const alFallar = (instancia) => async (error) => {
  const original = error?.config;
  if (
    error?.response?.status !== 401 ||
    !original ||
    original._retry ||
    isAuthEndpoint(original.url)
  ) {
    return Promise.reject(error);
  }

  // Interceptor compartido con las llamadas del portal de estudiante, que nunca
  // tienen sesión de admin. Sin este check, un 401 del lado estudiante
  // terminaba en una redirección dura a /login (la página de admin). Si no hay
  // sesión de admin, el componente que hizo la llamada maneja el 401.
  if (!localStorage.getItem(TOKEN_KEY)) return Promise.reject(error);

  if (!getRefreshToken()) {
    cerrarSesionYSalir();
    return Promise.reject(error);
  }

  original._retry = true;
  try {
    const fresco = await renovarSesion();
    ponerHeader(original, "Authorization", `Bearer ${fresco}`);
    return instancia(original);
  } catch (refreshError) {
    if (esRechazoDeSesion(refreshError)) cerrarSesionYSalir();
    return Promise.reject(error);
  }
};

const conRenovacion = new WeakSet();

/** Instala la renovación en una instancia de axios (una sola vez por instancia). */
export const instalarRenovacion = (instancia) => {
  if (conRenovacion.has(instancia)) return instancia;
  conRenovacion.add(instancia);
  instancia.interceptors.request.use(alPedir);
  instancia.interceptors.response.use((response) => response, alFallar(instancia));
  return instancia;
};

// Toda instancia creada de aquí en adelante nace con la renovación.
const crearInstancia = axios.create.bind(axios);
axios.create = (...args) => instalarRenovacion(crearInstancia(...args));
instalarRenovacion(axios);

// ── Al volver a la app ──
// En el celular la app suele quedar dormida en segundo plano y se retoma sin
// recargar: ahí se renueva de una vez, antes de que el usuario toque algo.
// También cubre las llamadas hechas con fetch(), que no pasan por axios.
const alVolverALaApp = () => {
  if (document.visibilityState !== "visible") return;
  if (!localStorage.getItem(TOKEN_KEY) || !getRefreshToken()) return;
  asegurarTokenVigente(MARGEN_AL_VOLVER_MS).catch((error) => {
    if (esRechazoDeSesion(error)) cerrarSesionYSalir();
  });
};

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", alVolverALaApp);
  window.addEventListener("online", alVolverALaApp);
  // iOS restaura la página desde la caché de navegación sin volver a cargarla.
  window.addEventListener("pageshow", alVolverALaApp);
}
