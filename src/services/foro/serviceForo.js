// src/services/foro/serviceForo.js
// Foro de la materia. Endpoints con flexAuth: funcionan con token de admin
// (authToken) o token de estudiante (student_portal_token).
import axios from "axios";
import backApi from "../backApi"; // usa authToken (panel admin)
import { getFlexAuthToken } from "../../utils/authToken";

const BACK_URL = import.meta.env.VITE_API_BACKEND || "http://localhost:3002";

// Instancia para el portal del estudiante (token distinto)
const studentApi = axios.create({
  baseURL: BACK_URL,
  headers: { "Content-Type": "application/json" },
});
studentApi.interceptors.request.use((config) => {
  const token = getFlexAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Construye el FormData que espera el backend (multer) para publicar en el foro.
const buildForoFormData = ({ contenido, parent_id, archivos, enlaces }) => {
  const fd = new FormData();
  fd.append('contenido', contenido || '');
  if (parent_id) fd.append('parent_id', parent_id);
  if (enlaces?.length) fd.append('enlaces', JSON.stringify(enlaces));
  (archivos || []).forEach((f) => fd.append('archivos', f));
  return fd;
};

/* ===================== ADMIN / DOCENTE ===================== */
export const getForoPosts = async (materiaId) => {
  const { data } = await backApi.get(`/api/materias/${materiaId}/foro`);
  return data;
};

export const createForoPost = async (materiaId, payload) => {
  // payload: { contenido, parent_id?, archivos?: File[], enlaces?: [{url, titulo}] }
  const fd = buildForoFormData(payload);
  const { data } = await backApi.post(`/api/materias/${materiaId}/foro`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteForoPost = async (postId) => {
  const { data } = await backApi.delete(`/api/foro/${postId}`);
  return data;
};

/* ===================== ESTUDIANTE (portal) ===================== */
// Materias del estudiante (para elegir a qué foro entrar)
export const getStudentMaterias = async (studentId) => {
  const { data } = await studentApi.get(`/api/estudiantes/${studentId}/materias`);
  return data;
};

export const getForoPostsStudent = async (materiaId) => {
  const { data } = await studentApi.get(`/api/materias/${materiaId}/foro`);
  return data;
};

export const createForoPostStudent = async (materiaId, payload) => {
  const fd = buildForoFormData(payload);
  const { data } = await studentApi.post(`/api/materias/${materiaId}/foro`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteForoPostStudent = async (postId) => {
  const { data } = await studentApi.delete(`/api/foro/${postId}`);
  return data;
};
