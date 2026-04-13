// src/services/student/studentGradesService.js
import backApi from "../backApi";

// Obtiene info del estudiante + notas por número de documento
// Respuesta esperada: { student, grades, studentId }
export const getStudentGradesAndInfoByDocument = async (documentNumber) => {
  const response = await backApi.get(`/api/grades/student/${documentNumber}`);
  return response.data;
};

// Obtener todas las calificaciones
export const getAllGrades = async () => {
  const response = await backApi.get("/api/grades");
  return response.data;
};

// Guardar calificaciones (array de { studentId, programa, grades })
export const saveGrades = async (payload) => {
  const response = await backApi.post("/api/grades", payload);
  return response.data;
};

// Obtener estudiantes + calificaciones de un programa (role-aware)
// Respuesta: { programa, students, grades }
export const getGradesByPrograma = async (programaId) => {
  const response = await backApi.get(`/api/grades/programa/${programaId}`);
  return response.data;
};
