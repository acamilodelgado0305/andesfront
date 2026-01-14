import axios from "axios";

// Asegúrate de que esta variable de entorno esté definida en tu .env
const API_BACKEND = import.meta.env.VITE_API_FINANZAS;

const personaApi = axios.create({
    baseURL: API_BACKEND,
    // Axios maneja automáticamente el Content-Type para JSON
});

// Interceptor: Inyecta el token automáticamente
personaApi.interceptors.request.use(
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
 * Obtener lista de personas.
 * @param {Object} params - Puede incluir { q: "juan" } para buscar
 */
export const getPersonas = async (params = {}) => {
    const response = await personaApi.get('/personas', { params });
    return response.data;
};

/**
 * Obtener una persona por ID
 */
export const getPersonaById = async (id) => {
    const response = await personaApi.get(`/personas/${id}`);
    return response.data;
};

/**
 * Crear nueva persona
 * @param {Object} data - JSON con { nombre, numero_documento, celular... }
 */
export const createPersona = async (data) => {
    const response = await personaApi.post("/personas", data);
    return response.data;
};

/**
 * Actualizar persona existente
 */
export const updatePersona = async (id, data) => {
    const response = await personaApi.put(`/personas/${id}`, data);
    return response.data;
};

/**
 * Eliminar persona (verifica backend si tiene ventas asociadas)
 */
export const deletePersona = async (id) => {
    const response = await personaApi.delete(`/personas/${id}`);
    return response.data;
};

export default personaApi;