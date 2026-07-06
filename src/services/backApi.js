// src/services/backApi.js
import axios from "axios";
import {
  getRefreshToken,
  refreshSession,
  persistSession,
  logout as clearSession,
} from "./auth/authService";

// Usamos la variable de entorno. Asegúrate de tener VITE_API_BACKEND definida.
const BACK_URL =
  import.meta.env.VITE_API_BACKEND || "http://localhost:3002";

const backApi = axios.create({
  baseURL: BACK_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a las solicitudes
// Prioridad: 1) authToken (admin/usuario principal)  2) student_portal_token (portal estudiante)
backApi.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem("authToken");
    const studentToken = localStorage.getItem("student_portal_token");

    // Usa el token de admin si existe, si no usa el de estudiante
    const token = adminToken || studentToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================
// 🔐 Manejo global de sesión expirada (HTTP 401) con auto-refresh
// =========================================================
// El access token es corto. Cuando expira, el backend responde 401. En vez de
// echar al usuario, intentamos renovar el access token con el refresh token de
// forma silenciosa y reintentamos la petición original. Solo si el refresh
// falla (refresh token también expirado/ inválido) cerramos sesión y vamos al
// login. Sin esto, las peticiones quedaban rechazadas y la pantalla en blanco.

// No intentamos refrescar en los endpoints de autenticación: un 401 en /login
// significa credenciales incorrectas (lo maneja el formulario), y un 401 en
// /refresh significa que el refresh token ya no sirve → logout.
const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
  "/api/auth/refresh",
];
const isAuthEndpoint = (url = "") => AUTH_ENDPOINTS.some((e) => url.includes(e));

let redirecting = false; // evita disparar varias redirecciones a la vez
let isRefreshing = false; // hay un refresh en curso
let pendingQueue = []; // peticiones en espera mientras se refresca

// Resuelve/rechaza las peticiones encoladas una vez que termina el refresh.
const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

// Cierra la sesión y redirige al login (full reload limpia el estado de React).
const forceLogout = () => {
  clearSession(); // borra authToken, refreshToken y authUser
  localStorage.removeItem("student_portal_token");
  const path = window.location.pathname;
  if (path !== "/login" && path !== "/" && !redirecting) {
    redirecting = true;
    window.location.assign("/login");
  }
};

const handleUnauthorized = async (error) => {
  const status = error?.response?.status;
  const originalRequest = error?.config || {};
  const url = originalRequest.url || "";

  // Solo actuamos ante un 401 real, fuera de endpoints de auth y sin reintento previo.
  if (status !== 401 || isAuthEndpoint(url) || originalRequest._retry) {
    return Promise.reject(error);
  }

  // Este interceptor es global (backApi + axios) y también recibe los 401 de
  // las llamadas del portal de estudiante, que nunca tienen refreshToken de
  // admin. Sin este check, cualquier 401 del lado estudiante (evaluaciones,
  // foro, módulos, o el propio vencimiento del token de 8h) terminaba en
  // forceLogout() → redirección dura a /login (la página de admin), sacando
  // al estudiante del portal en medio de la sesión. Si no hay sesión de admin
  // activa, dejamos que el componente que hizo la llamada maneje el 401 él
  // mismo (los del portal de estudiante ya lo hacen sin recargar la página).
  if (!localStorage.getItem("authToken")) {
    return Promise.reject(error);
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    forceLogout();
    return Promise.reject(error);
  }

  // Si ya hay un refresh en curso, encolamos esta petición hasta que termine.
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    }).then((newToken) => {
      originalRequest._retry = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axios(originalRequest);
    });
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const session = await refreshSession(refreshToken);
    const newToken = session.token;
    persistSession(session); // guarda nuevo access + refresh (+ user)

    processQueue(null, newToken); // libera las peticiones encoladas

    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return axios(originalRequest); // reintenta la petición original
  } catch (refreshError) {
    processQueue(refreshError, null);
    forceLogout();
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
};

// Registramos el interceptor de respuesta tanto en la instancia `backApi` como
// en el `axios` global, porque hay servicios que llaman a axios directamente
// (los interceptores NO se heredan entre instancias).
backApi.interceptors.response.use((response) => response, handleUnauthorized);
axios.interceptors.response.use((response) => response, handleUnauthorized);

export default backApi;

