// src/services/auth/studentAuthService.js
import backApi from "../backApi";

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

// Check if a session can be restored (token exists + not expired)
export const canRestoreSession = () => {
  const token = getStudentToken();
  if (!token) return false;

  try {
    // Decode JWT payload (without verification — the server verifies)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
};
