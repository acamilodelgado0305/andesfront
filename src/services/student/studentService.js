// src/services/studentsService.js

import axios from "axios";
import backApi from "../backApi";

const API_BACKEND = import.meta.env.VITE_API_BACKEND;

// 1. Crear instancia de Axios dedicada para Estudiantes
const studentsApi = axios.create({
  baseURL: API_BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Interceptor: Inyecta el token automáticamente en cada petición
studentsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper para loguear errores
const logApiError = (context, error) => {
  if (error.response) {
    console.error(
      `${context} - Status: ${error.response.status}, Data:`,
      error.response.data
    );
  } else if (error.request) {
    console.error(`${context} - No hubo respuesta del servidor`, error.request);
  } else {
    console.error(`${context} - Error configurando la solicitud:`, error.message);
  }
};

// ========================= STUDENTS ========================= //

// Obtener todos los estudiantes
export const getStudents = async () => {
  try {
    // Ya no necesitas lógica condicional aquí. 
    // Si eres Admin, el backend devuelve todos. Si eres Coordinador, devuelve los tuyos.
    const response = await studentsApi.get("/api/students");
    return response.data;
  } catch (error) {
    logApiError("Error al obtener los estudiantes", error);
    throw error;
  }
};

// Obtener estudiantes por coordinador
export const getStudentsByCoordinator = async (coordinatorId) => {
  try {
    const response = await backApi.get(`/api/students/coordinator/${coordinatorId}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    logApiError(
      `Error al obtener los estudiantes del coordinador ${coordinatorId}`,
      error
    );
    return [];
  }
};

// Crear estudiante
export const addStudent = async (studentData) => {
  try {
    const response = await backApi.post("/api/students", studentData);
    return response.data;
  } catch (error) {
    logApiError("Error al agregar el estudiante", error);
    throw error;
  }
};

// Obtener estudiante por ID
export const getStudentById = async (id) => {
  try {
    const response = await backApi.get(`/api/students/${id}`);
    return response.data;
  } catch (error) {
    logApiError(`Error al obtener el estudiante con ID ${id}`, error);
    throw error;
  }
};

// Obtener estudiante por número de documento
export const getStudentByDocument = async (numeroDocumento) => {
  try {
    const response = await backApi.get(
      `/api/students/document/${numeroDocumento}`
    );
    return response.data;
  } catch (error) {
    logApiError(
      `Error al obtener el estudiante con documento ${numeroDocumento}`,
      error
    );
    throw error;
  }
};

// Actualizar estudiante (datos generales)
export const updateStudent = async (id, studentData) => {
  try {
    const response = await backApi.put(`/api/students/${id}`, studentData);
    return response.data;
  } catch (error) {
    logApiError(`Error al actualizar el estudiante con ID ${id}`, error);
    throw error;
  }
};

// Eliminar estudiante
export const deleteStudent = async (studentId) => {
  try {
    const response = await backApi.delete(`/api/students/${studentId}`);
    return response.data;
  } catch (error) {
    logApiError(
      `Error al eliminar el estudiante con ID ${studentId}`,
      error
    );
    throw error;
  }
};

// Actualizar estado de matrícula (boolean)
export const updateStudentEstadoMatricula = async (id, estadoMatricula) => {
  try {
    const response = await backApi.patch(
      `/api/students/${id}/estado-matricula`,
      {
        estado_matricula: estadoMatricula,
      }
    );
    return response.data;
  } catch (error) {
    logApiError(
      `Error al actualizar estado de matrícula del estudiante ${id}`,
      error
    );
    throw error;
  }
};

// Marcar / desmarcar como posible graduación
export const updateStudentPosibleGraduacion = async (
  id,
  posibleGraduacion
) => {
  try {
    const response = await backApi.patch(
      `/api/students/${id}/posible-graduacion`,
      {
        posible_graduacion: posibleGraduacion,
      }
    );
    return response.data;
  } catch (error) {
    logApiError(
      `Error al actualizar posible graduación del estudiante ${id}`,
      error
    );
    throw error;
  }
};

// Obtener candidatos a graduación (filtros opcionales: { programaId, coordinadorId })
export const getGraduationCandidates = async (filters = {}) => {
  try {
    const response = await backApi.get(
      "/api/students/candidatos-graduacion",
      {
        params: filters,
      }
    );
    return response.data;
  } catch (error) {
    logApiError("Error al obtener candidatos a graduación", error);
    throw error;
  }
};

// Carga masiva de estudiantes (Excel/CSV)
export const uploadStudents = async (formData) => {
  try {
    const response = await backApi.post("/api/upload-students", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    logApiError("Error al cargar estudiantes", error);
    throw error;
  }
};

export const uploadStudentDocument = async (studentId, file) => {
  const formData = new FormData();
  // 👀 Este nombre "document" debe coincidir con .single("document") en el backend
  formData.append("document", file);

  const response = await backApi.post(
    `/api/students/${studentId}/document`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data; // { message, documento_url, student, ... }
};


export const getStudentDocuments = async (studentId) => {
  const response = await backApi.get(
    `/api/students/${studentId}/documents`
  );
  return response.data; // array de documentos
};


export const deleteStudentDocument = async (studentId, documentId) => {
  const response = await backApi.delete(
    `/api/students/${studentId}/documents/${documentId}`
  );
  return response.data; // { message: "Documento eliminado correctamente" }
};
