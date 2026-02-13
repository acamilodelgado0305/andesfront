import axios from "axios";
// Usamos la misma variable de entorno para la URL del backend
const API_BASE_URL = import.meta.env.VITE_API_BACKEND;

// Creamos la instancia de axios con la configuración base
const backApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor para añadir el token y x-tenant a cada petición
backApi.interceptors.request.use(
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

// --- SERVICIOS DEL CRUD PARA DOCENTES ---

/**
 * @description Obtiene todos los docentes.
 * Corresponde a: GET /api/docentes
 */
export const getAllDocentes = async () => {
    try {
        const response = await backApi.get("/api/docentes");
        return response.data;
    } catch (error) {
        console.error("Error al obtener los docentes:", error);
        throw error;
    }
};

/**
 * @description Obtiene un docente específico por su ID.
 * @param {number} docenteId - El ID del docente a obtener.
 * Corresponde a: GET /api/docentes/:id
 */
export const getDocenteById = async (docenteId) => {
    try {
        const response = await backApi.get(`/api/docentes/${docenteId}`);
        return response.data;
    } catch (error) {
        console.error(`Error al obtener el docente con ID ${docenteId}:`, error);
        throw error;
    }
};

/**
 * @description Crea un nuevo docente.
 * @param {object} docenteData - Los datos del nuevo docente (nombre_completo, email, especialidad).
 * Corresponde a: POST /api/docentes
 */
export const createDocente = async (docenteData) => {
    try {
        const response = await backApi.post('/api/docentes', docenteData);
        return response.data;
    } catch (error) {
        console.error('Error al crear el docente:', error);
        throw error;
    }
};

/**
 * @description Actualiza un docente existente.
 * @param {number} docenteId - El ID del docente a actualizar.
 * @param {object} docenteData - Los nuevos datos para el docente.
 * Corresponde a: PUT /api/docentes/:id
 */
export const updateDocente = async (docenteId, docenteData) => {
    try {
        const response = await backApi.put(`/api/docentes/${docenteId}`, docenteData);
        return response.data;
    } catch (error) {
        console.error(`Error al actualizar el docente con ID ${docenteId}:`, error);
        throw error;
    }
};

/**
 * @description Elimina un docente por su ID.
 * @param {number} docenteId - El ID del docente a eliminar.
 * Corresponde a: DELETE /api/docentes/:id
 */
export const deleteDocente = async (docenteId) => {
    try {
        // La respuesta de un DELETE exitoso no suele tener cuerpo, pero la retornamos por si acaso.
        const response = await backApi.delete(`/api/docentes/${docenteId}`);
        return response.data;
    } catch (error) {
        console.error(`Error al eliminar el docente con ID ${docenteId}:`, error);
        throw error;
    }
};