// src/services/student/studentGradesService.js
import backApi from "../backApi";

// Obtiene info del estudiante + notas por número de documento.
// Respuesta: { student, grades, gradesByCierre, studentId }.
// studentId (opcional) escopa a una institución concreta cuando el mismo
// documento existe en varias (multi-institución).
export const getStudentGradesAndInfoByDocument = async (documentNumber, studentId = null) => {
    const response = await backApi.get(`/api/grades/student/${documentNumber}`, {
        params: studentId ? { studentId } : {},
    });
    return response.data;
};

// Obtener todas las calificaciones
export const getAllGrades = async () => {
    const response = await backApi.get("/api/grades");
    return response.data;
};

// Guardar calificaciones (array de { studentId, programa, cierre_id, grades })
export const saveGrades = async (payload) => {
    const response = await backApi.post("/api/grades", payload);
    return response.data;
};

// Obtener estudiantes + calificaciones de un programa, opcionalmente filtrado por cierre
// Respuesta: { programa, students, grades }
export const getGradesByPrograma = async (programaId, cierreId = null) => {
    const url = cierreId
        ? `/api/grades/programa/${programaId}?cierre_id=${cierreId}`
        : `/api/grades/programa/${programaId}`;
    const response = await backApi.get(url);
    return response.data;
};
