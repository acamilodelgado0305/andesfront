import axios from "axios";
import { getFlexAuthToken } from "../../utils/authToken";

const API_BASE_URL = import.meta.env.VITE_API_BACKEND;

const backApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

backApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Instancia para el portal de estudiante: usa su propio token si existe,
// y cae al token de admin (útil cuando un admin previsualiza una clase).
const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

studentApi.interceptors.request.use((config) => {
  const token = getFlexAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getClasesByModulo = async (moduloId) => {
  const { data } = await backApi.get(`/api/modulos/${moduloId}/clases`);
  return data.clases || [];
};

export const getClaseById = async (claseId) => {
  const { data } = await backApi.get(`/api/clases/${claseId}`);
  return data;
};

export const createClase = async (moduloId, payload) => {
  // payload: { titulo, descripcion, video_url, orden }
  const { data } = await backApi.post(`/api/modulos/${moduloId}/clases`, payload);
  return data.clase;
};

export const updateClase = async (claseId, payload) => {
  const { data } = await backApi.put(`/api/clases/${claseId}`, payload);
  return data.clase;
};

export const deleteClase = async (claseId) => {
  const { data } = await backApi.delete(`/api/clases/${claseId}`);
  return data;
};

export const uploadClaseVideo = async (claseId, file) => {
  const fd = new FormData();
  fd.append('video', file);
  const { data } = await backApi.post(`/api/clases/${claseId}/video`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.clase;
};

export const uploadClasePdfs = async (claseId, files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('pdfs', f));
  const { data } = await backApi.post(`/api/clases/${claseId}/pdfs`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.pdfs;
};

export const deleteClasePdf = async (claseId, pdfId) => {
  const { data } = await backApi.delete(`/api/clases/${claseId}/pdfs/${pdfId}`);
  return data;
};

// Presentaciones de la clase (PDF/PPTX/SVG) que se ven en el visor 16:9.
export const uploadClasePresentaciones = async (claseId, files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('presentaciones', f));
  const { data } = await backApi.post(`/api/clases/${claseId}/presentaciones`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.presentaciones;
};

export const deleteClasePresentacion = async (claseId, presId) => {
  const { data } = await backApi.delete(`/api/clases/${claseId}/presentaciones/${presId}`);
  return data;
};

export const getClaseByIdEstudiante = async (claseId) => {
  const { data } = await studentApi.get(`/api/clases/${claseId}/estudiante`);
  return data;
};

export const completarClase = async (claseId) => {
  const { data } = await studentApi.patch(`/api/clases/${claseId}/completar`);
  return data;
};

// Índice del curso para el sidebar + barra de progreso del reproductor:
// temas (con sus clases y estado) + contadores globales de avance.
export const getClaseOutlineEstudiante = async (claseId) => {
  const { data } = await studentApi.get(`/api/clases/${claseId}/outline/estudiante`);
  return data;
};

/* ===================== COMENTARIOS DE LA CLASE ===================== */
// Discusión por clase (hilos). Usa studentApi: funciona con token de estudiante
// y cae al token de admin cuando un admin/docente previsualiza la clase.

export const getClaseComentarios = async (claseId) => {
  const { data } = await studentApi.get(`/api/clases/${claseId}/comentarios`);
  return data; // { ok, comentarios: [...hilos], viewer }
};

export const createClaseComentario = async (claseId, { contenido, parent_id } = {}) => {
  const { data } = await studentApi.post(`/api/clases/${claseId}/comentarios`, {
    contenido,
    ...(parent_id ? { parent_id } : {}),
  });
  return data; // { ok, comentario }
};

export const deleteClaseComentario = async (comentarioId) => {
  const { data } = await studentApi.delete(`/api/clase-comentarios/${comentarioId}`);
  return data;
};

// Examen del tema (módulo) para el estudiante actual. Se usa al terminar las
// clases de un tema para mostrar su examen ahí mismo. Devuelve { ok, examen }
// (examen = null si el tema no tiene examen vinculado).
export const getModuloExamenEstudiante = async (moduloId) => {
  const { data } = await studentApi.get(`/api/modulos/${moduloId}/examen/estudiante`);
  return data;
};
