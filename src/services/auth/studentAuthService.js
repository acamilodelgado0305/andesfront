// src/services/auth/studentAuthService.js
import backApi from "../backApi";
import { decodeJwt } from "../../utils/jwt.js";

const STUDENT_TOKEN_KEY = "student_portal_token";
const STUDENT_DATA_KEY = "student_portal_data";

// ===== Token management =====

export const saveStudentToken = (token) => {
  if (token) localStorage.setItem(STUDENT_TOKEN_KEY, token);
};

export const getStudentToken = () => {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
};

export const clearStudentToken = () => {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
  localStorage.removeItem(STUDENT_DATA_KEY);
};

// ===== Student data cache (for fast restore) =====

export const saveStudentData = (data) => {
  if (data) localStorage.setItem(STUDENT_DATA_KEY, JSON.stringify(data));
};

export const getSavedStudentData = () => {
  try {
    const raw = localStorage.getItem(STUDENT_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ===== Auth API calls =====

// Login: POST /api/student-portal/login
export const loginStudent = async (documento, password) => {
  const response = await backApi.post("/api/student-portal/login", {
    documento,
    password,
  });

  const { token, student } = response.data;

  if (token) {
    saveStudentToken(token);
    saveStudentData(student);
  }

  return { token, student };
};

// Profile: GET /api/student-portal/me (validates token is still valid)
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

  if (response.data?.student) {
    saveStudentData(response.data.student);
    return response.data.student;
  }

  return response.data;
};

// Info pública del programa a partir del token del enlace de inscripción
// GET /api/public/programas/join/:token
export const getJoinInfo = async (token) => {
  const response = await backApi.get(`/api/public/programas/join/${token}`);
  return response.data;
};

// Unirse a un programa por enlace: registra (si es nuevo) o inscribe (si ya existe)
// y devuelve sesión de estudiante ya lista para usar.
// POST /api/student-portal/join/:token
export const joinPrograma = async (token, payload) => {
  const response = await backApi.post(`/api/student-portal/join/${token}`, payload);

  const { token: studentToken, student } = response.data;

  if (studentToken) {
    saveStudentToken(studentToken);
    saveStudentData(student);
  }

  return response.data;
};

// Check if a session can be restored (token exists + not expired)
export const canRestoreSession = () => {
  const token = getStudentToken();
  if (!token) return false;

  // Decode JWT payload (without verification — the server verifies)
  const payload = decodeJwt(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
};
