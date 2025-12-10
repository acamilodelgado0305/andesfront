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

// Interceptor: Inyecta el token automáticamente en cada petición
coalianzaApi.interceptors.request.use(
  (config) => {
    // Usamos la misma key que definiste en tu AuthContext
    const token = localStorage.getItem("authToken"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

export default coalianzaApi;