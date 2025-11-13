// src/services/studentAuthService.js
import backApi from "../backApi";

const STUDENT_TOKEN_KEY = "student_portal_token";

// Guardar token en localStorage
export const saveStudentToken = (token) => {
  if (token) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
  }
};

// Obtener token
export const getStudentToken = () => {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
};

// Limpiar token (logout)
export const clearStudentToken = () => {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
};

// Login de estudiante: POST /api/student-portal/login
// body: { documento, password }
// Devuelve { token, student }
export const loginStudent = async (documento, password) => {
  const response = await backApi.post("/api/student-portal/login", {
    documento,
    password,
  });

  const { token, student } = response.data;

  if (token) {
    saveStudentToken(token);
  }

  return { token, student };
};

// Obtener perfil de estudiante autenticado: GET /api/student-portal/me
export const getStudentProfile = async () => {
  const token = getStudentToken();

  if (!token) {
    throw new Error("No hay token de estudiante, inicie sesión nuevamente.");
  }

  const response = await backApi.get("/api/student-portal/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Según el controlador que te di, viene como { ok, student: {...} }
  if (response.data?.student) {
    return response.data.student;
  }

  return response.data;
};
