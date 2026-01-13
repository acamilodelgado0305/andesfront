import axios from "axios";

// Asegúrate de que esta variable de entorno apunte a tu backend principal
const API_BACKEND = import.meta.env.VITE_API_BACKEND;

// 1. Crear instancia de Axios
// NOTA: Hemos quitado "Content-Type": "application/json" de los headers globales.
// Axios es inteligente: si envías un objeto, él pone 'application/json' solo.
// Si envías FormData (archivos), él pone 'multipart/form-data' solo.
const inventarioApi = axios.create({
  baseURL: API_BACKEND,
  // headers: { "Content-Type": "application/json" } // <--- ESTO SE ELIMINÓ PARA SOPORTAR FOTOS
});

// 2. Interceptor: Inyecta el token automáticamente en cada petición
inventarioApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===================== FUNCIONES DEL CRUD ===================== //

/**
 * Obtener todo el inventario del usuario logueado
 */
export const getInventario = async (params = {}) => {
  const response = await inventarioApi.get('/api/inventario', { params });
  return response.data;
};

/**
 * Obtener un ítem específico por ID
 */
export const getInventarioById = async (id) => {
  const response = await inventarioApi.get(`/api/inventario/${id}`);
  return response.data;
};

/**
 * Crear un nuevo ítem
 * payload: Puede ser {objeto json} o new FormData() con imagen
 */
export const createInventario = async (payload) => {
  // Axios detectará si payload es FormData y ajustará los headers automáticamente
  const response = await inventarioApi.post("/api/inventario", payload);
  return response.data;
};

/**
 * Actualizar un ítem existente
 * payload: Puede ser {objeto json} o new FormData() con imagen
 */
export const updateInventario = async (id, payload) => {
  const response = await inventarioApi.put(`/api/inventario/${id}`, payload);
  return response.data;
};

/**
 * Eliminar ítems
 * Acepta eliminación simple (ID en URL) o múltiple (Array de IDs en body)
 */
export const deleteInventario = async (ids) => {
  // Si recibimos un array, usamos el endpoint de eliminación por lote
  if (Array.isArray(ids)) {
    const response = await inventarioApi.delete("/api/inventario", {
      data: { ids }, // Enviar body en delete requiere propiedad 'data' en axios
    });
    return response.data;
  }
  // Si es un solo ID
  else {
    const response = await inventarioApi.delete(`/api/inventario/${ids}`);
    return response.data;
  }
};

/**
 * Obtener inventario de un usuario específico (Solo Admins)
 */
export const getInventarioByUser = async (userId) => {
  const response = await inventarioApi.get(`/api/inventario/user/${userId}`);
  return response.data;
};

// Alias para mantener compatibilidad si otros componentes lo usan
export const getInventarioProgramas = getInventario;

export default inventarioApi;