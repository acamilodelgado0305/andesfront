import axios from "axios";

// Mismo backend POS/Finanzas donde viven Inventario, Personas, Pedidos...
const API_BACKEND = import.meta.env.VITE_API_FINANZAS;

const crmApi = axios.create({
    baseURL: API_BACKEND,
});

// Interceptor: Inyecta el token automáticamente en cada petición
crmApi.interceptors.request.use(
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
 * Listar / buscar leads.
 * @param {Object} params - { q, estado, origen }
 */
export const getLeads = async (params = {}) => {
    const response = await crmApi.get('/crm/leads', { params });
    return response.data;
};

/**
 * Resumen del embudo: { total, valorPipeline, porEstado }
 */
export const getLeadStats = async (params = {}) => {
    const response = await crmApi.get('/crm/leads/stats', { params });
    return response.data;
};

/**
 * Obtener un lead por ID
 */
export const getLeadById = async (id) => {
    const response = await crmApi.get(`/crm/leads/${id}`);
    return response.data;
};

/**
 * Crear nuevo lead
 */
export const createLead = async (data) => {
    const response = await crmApi.post('/crm/leads', data);
    return response.data;
};

/**
 * Actualizar lead existente
 */
export const updateLead = async (id, data) => {
    const response = await crmApi.put(`/crm/leads/${id}`, data);
    return response.data;
};

/**
 * Eliminar lead
 */
export const deleteLead = async (id) => {
    const response = await crmApi.delete(`/crm/leads/${id}`);
    return response.data;
};

export default crmApi;
