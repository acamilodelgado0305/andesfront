// src/services/backApi.js
import axios from "axios";

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

export default backApi;

