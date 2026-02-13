// src/services/backApi.js
import axios from "axios";

// Usamos la variable de entorno. Asegúrate de tener VITE_API_BACKEND definida.
const BACK_URL =
  import.meta.env.VITE_API_BACKEND || "http://localhost:3002";

// Si quisieras apuntar directamente a /api, podrías usar VITE_API en vez de VITE_API_BACKEND
// const BACK_URL = import.meta.env.VITE_API || "http://localhost:3002/api";

const backApi = axios.create({
  baseURL: BACK_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token y x-tenant a las solicitudes
backApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Inyectar x-tenant desde la organización del usuario
    try {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const slug = user?.organization?.slug || user?.organization?.name;
        if (slug) {
          config.headers["x-tenant"] = slug;
        }
      }
    } catch (e) {
      // silenciar errores de parsing
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default backApi;
