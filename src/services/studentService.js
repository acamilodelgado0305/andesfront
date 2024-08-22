import axios from "axios";

const BACK_URL = import.meta.env.VITE_API_BACKEND;

// Instancia de axios personalizada
const backApi = axios.create({
  baseURL: BACK_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a las solicitudes
backApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Servicio de autenticación
export const login = async (email, password) => {
  try {
    const response = await backApi.post("/auth/login", { email, password });
    return response.data; // Devuelve los datos de la respuesta, como el token o el mensaje de éxito
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
};

export const addStudent = async (studentData) => {
    try {
        const response = await backApi.post('/api/students', studentData);
        return response.data; // Devuelve los datos de la respuesta, como el ID del estudiante o un mensaje de éxito
    } catch (error) {
        console.error('Error al agregar el estudiante:', error);
        throw error;
    }
};

// Función para obtener todas las cuentas
export const getStudents = async () => {
  try {
    const response = await backApi.get("api/students");
    return response.data;
  } catch (error) {
    console.error("Error al obtener las cuentas:", error);
    throw error;
  }
};


export const getPrograms = async () => {
    try {
      const response = await backApi.get("api/programs");
      return response.data;
    } catch (error) {
      console.error("Error al obtener los programas:", error);
      throw error;
    }
  };


export const deleteStudent = async (studentId) => {
    try {
        const response = await backApi.delete(`/api/students/${studentId}`);
        return response.data; // Devuelve los datos de la respuesta, como un mensaje de éxito
    } catch (error) {
        console.error('Error al eliminar el estudiante:', error);
        throw error;
    }
};

