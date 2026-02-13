// src/services/coalianzaService.js
import axios from "axios";

const API_COALIANZA = import.meta.env.VITE_API_FINANZAS;

// Instancia de axios personalizada
const coalianzaApi = axios.create({
  baseURL: API_COALIANZA,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Inyecta el token y x-tenant automáticamente en cada petición
coalianzaApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const slug = user?.organization?.slug || user?.organization?.name;
        if (slug) {
          config.headers["x-tenant"] = slug;
        }
      }
    } catch (e) { }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===================== INGRESOS (VENTAS) ===================== //

export const getAllIngresos = async (params = {}) => {
  const response = await coalianzaApi.get("/ingresos", { params });
  return response.data;
};

export const createIngreso = async (data) => {
  const response = await coalianzaApi.post("/ingresos", data);
  return response.data;
};

export const updateIngreso = async (id, data) => {
  const response = await coalianzaApi.put(`/ingresos/${id}`, data);
  return response.data;
};

export const deleteIngreso = async (id) => {
  const response = await coalianzaApi.delete(`/ingresos/${id}`);
  return response.data;
};

// ===================== EGRESOS (GASTOS) ===================== //

export const getAllEgresos = async (params = {}) => {
  const response = await coalianzaApi.get("/egresos", { params });
  return response.data;
};

export const createEgreso = async (data) => {
  const response = await coalianzaApi.post("/egresos", data);
  return response.data;
};

export const updateEgreso = async (id, data) => {
  const response = await coalianzaApi.put(`/egresos/${id}`, data);
  return response.data;
};

export const deleteEgreso = async (id) => {
  const response = await coalianzaApi.delete(`/egresos/${id}`);
  return response.data;
};


export const getClientByCedula = async (cedula) => {
  // Axios se encarga de lanzar error si es 404 o 500, el frontend debe usar try/catch
  const response = await coalianzaApi.get(`/clients/${cedula}`);
  return response.data;
};

export default coalianzaApi;