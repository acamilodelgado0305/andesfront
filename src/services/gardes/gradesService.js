// src/services/student/studentGradesService.js
import backApi from "../backApi";

// Obtiene info del estudiante + notas por número de documento
// Respuesta esperada: { student, grades, studentId }
export const getStudentGradesAndInfoByDocument = async (documentNumber) => {
  const response = await backApi.get(`/api/grades/student/${documentNumber}`);
  return response.data;
};
