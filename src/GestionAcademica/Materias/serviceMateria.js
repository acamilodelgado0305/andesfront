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

// Interceptor para añadir el token de autenticación a cada petición
backApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- SERVICIOS DEL CRUD PARA MATERIAS ---

/**
 * @description Obtiene todas las materias.
 * Corresponde a: GET /api/materias
 */
export const getAllMaterias = async () => {
  try {
    const response = await backApi.get("/materias");
    return response.data;
  } catch (error) {
    console.error("Error al obtener las materias:", error);
    throw error;
  }
};

/**
 * @description Crea una nueva materia.
 * @param {object} materiaData - Los datos de la nueva materia (nombre, tipo_programa, docente_id).
 * Corresponde a: POST /api/materias
 */
export const createMateria = async (materiaData) => {
  try {
    const response = await backApi.post('/materias', materiaData);
    return response.data;
  } catch (error) {
    console.error('Error al crear la materia:', error);
    throw error;
  }
};

/**
 * @description Actualiza una materia existente.
 * @param {number} materiaId - El ID de la materia a actualizar.
 * @param {object} materiaData - Los nuevos datos para la materia.
 * Corresponde a: PUT /api/materias/:id
 */
export const updateMateria = async (materiaId, materiaData) => {
  try {
    const response = await backApi.put(`/materias/${materiaId}`, materiaData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar la materia con ID ${materiaId}:`, error);
    throw error;
  }
};

/**
 * @description Elimina una materia por su ID.
 * @param {number} materiaId - El ID de la materia a eliminar.
 * Corresponde a: DELETE /api/materias/:id
 */
export const deleteMateria = async (materiaId) => {
  try {
    const response = await backApi.delete(`/materias/${materiaId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al eliminar la materia con ID ${materiaId}:`, error);
    throw error;
  }
};