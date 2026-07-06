// src/services/evaluationService.js
import axios from "axios";
import backApi from "../backApi"; // para rutas de ADMIN
import { getFlexAuthToken } from "../../utils/authToken";

// Instancia separada para rutas del ESTUDIANTE — usa student_portal_token, no authToken
const BACK_URL = import.meta.env.VITE_API_BACKEND || "http://localhost:3002";
const studentApi = axios.create({
  baseURL: BACK_URL,
  headers: { "Content-Type": "application/json" },
});
studentApi.interceptors.request.use((config) => {
  const token = getFlexAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ===================== EVALUACIONES (ADMIN) ===================== */

// Listar evaluaciones (puedes mandar filtros opcionales)
export const getEvaluations = async (params = {}) => {
  // params puede tener: { programa_id, tipo_destino, activa }
  const response = await backApi.get("/api/evaluaciones", { params });
  return response.data;
};

// Crear una nueva evaluación
// payload: { titulo, descripcion, tipo_destino, programa_id, materia_id, fecha_inicio, fecha_fin, intentos_max, tiempo_limite_min, activa }
export const createEvaluation = async (payload) => {
  const response = await backApi.post("/api/evaluaciones", payload);
  return response.data;
};

// Obtener evaluación por ID (con preguntas y opciones - modo admin)
export const getEvaluationById = async (evaluationId) => {
  // OJO: la ruta del backend es /api/evaluaciones/evaluaciones/:id
  const response = await backApi.get(
    `/api/evaluaciones/evaluaciones/${evaluationId}`
  );
  return response.data;
};

// Actualizar evaluación
export const updateEvaluation = async (evaluationId, payload) => {
  const response = await backApi.put(
    `/api/evaluaciones/${evaluationId}`,
    payload
  );
  return response.data;
};

// Eliminar evaluación
export const deleteEvaluation = async (evaluationId) => {
  const response = await backApi.delete(`/api/evaluaciones/${evaluationId}`);
  return response.data;
};

/* ===================== PREGUNTAS Y OPCIONES (ADMIN) ===================== */

// Crear pregunta (con opciones) para una evaluación
// payload: { enunciado, tipo_pregunta, es_obligatoria, puntaje, orden, opciones: [{ texto, es_correcta, orden }] }
export const addQuestionWithOptions = async (evaluationId, payload) => {
  const response = await backApi.post(
    `/api/evaluaciones/${evaluationId}/preguntas`,
    payload
  );
  return response.data;
};

// Actualizar pregunta
// payload: { enunciado?, tipo_pregunta?, es_obligatoria?, puntaje?, orden? }
export const updateQuestion = async (questionId, payload) => {
  const response = await backApi.put(
    `/api/evaluaciones/preguntas/${questionId}`,
    payload
  );
  return response.data;
};

// Eliminar pregunta
export const deleteQuestion = async (questionId) => {
  const response = await backApi.delete(
    `/api/preguntas/${questionId}`
  );
  return response.data;
};

// Crear opción para una pregunta
// payload: { texto, es_correcta, orden }
export const addOption = async (questionId, payload) => {
  const response = await backApi.post(
    `/api/evaluaciones/preguntas/${questionId}/opciones`,
    payload
  );
  return response.data;
};

// Actualizar opción
// payload: { texto?, es_correcta?, orden? }
export const updateOption = async (optionId, payload) => {
  const response = await backApi.put(
    `/api/evaluaciones/opciones/${optionId}`,
    payload
  );
  return response.data;
};

// Eliminar opción
export const deleteOption = async (optionId) => {
  const response = await backApi.delete(
    `/api/evaluaciones/opciones/${optionId}`
  );
  return response.data;
};

/* ===================== ASIGNACIONES (ADMIN) ===================== */

// Asignar evaluación por programa principal (students.programa_id)
// body: { programa_id }
export const assignByMainProgram = async (evaluationId, payload) => {
  const response = await backApi.post(
    `/api/evaluaciones/${evaluationId}/asignar/programa-principal`,
    payload
  );
  return response.data;
};

// Asignar evaluación usando estudiante_programas (muchos a muchos)
// body: { programa_id }
export const assignByStudentPrograms = async (evaluationId, payload) => {
  const response = await backApi.post(
    `/api/evaluaciones/${evaluationId}/asignar/estudiante-programas`,
    payload
  );
  return response.data;
};

// 🔹 NUEVO: asignar a una lista de estudiantes específicos
// body: { estudiante_ids: [1,2,3,...] }
export const assignToSelectedStudents = async (evaluationId, payload) => {
  const response = await backApi.post(
    `/api/evaluaciones/${evaluationId}/asignar/estudiantes`,
    payload
  );
  return response.data;
};

// Obtener todos los estudiantes asignados a una evaluación (admin)
export const getEvaluationAssignments = async (evaluationId) => {
  const response = await backApi.get(`/api/evaluaciones/${evaluationId}/asignaciones`);
  return response.data;
};

// Eliminar asignación de un estudiante a una evaluación
export const removeAssignment = async (evaluationId, estudianteId) => {
  const response = await backApi.delete(`/api/evaluaciones/${evaluationId}/asignaciones/${estudianteId}`);
  return response.data;
};

// Obtener evaluaciones asignadas a un estudiante (admin) — usa authToken vía backApi
export const getStudentAssignmentsAdmin = async (studentId) => {
  const response = await backApi.get(
    `/api/evaluaciones/estudiantes/${studentId}/asignaciones`
  );
  return response.data;
};

/* ===================== PARTE ESTUDIANTE ===================== */

// Obtener evaluaciones asignadas a un estudiante (usa token de estudiante)
export const getStudentAssignments = async (studentId) => {
  const response = await studentApi.get(
    `/api/evaluaciones/estudiantes/${studentId}/asignaciones`
  );
  return response.data;
};

// Obtener detalle de una asignación (usa token de estudiante)
export const getAssignmentDetail = async (assignmentId) => {
  const response = await studentApi.get(
    `/api/evaluaciones/asignaciones/${assignmentId}`
  );
  return response.data;
};

// Enviar respuestas de una evaluación (usa token de estudiante)
export const sendEvaluationAnswers = async (assignmentId, payload) => {
  const response = await studentApi.post(
    `/api/evaluaciones/asignaciones/${assignmentId}/respuestas`,
    payload
  );
  return response.data;
};
