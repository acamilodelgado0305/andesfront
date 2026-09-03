// src/services/student/studentSelfService.js
// =============================================================================
// AUTOSERVICIO DEL ESTUDIANTE (portal): sus datos personales, su foto y sus
// documentos en PDF. Todos los endpoints identifican al estudiante por el token
// del portal, así que aquí SIEMPRE se manda ese token y nunca el de admin
// (a diferencia de los endpoints flexAuth): son datos propios del estudiante.
// =============================================================================
import axios from "axios";
import { getStudentToken } from "../auth/studentAuthService";

const API_BACKEND = import.meta.env.VITE_API_BACKEND || "http://localhost:3002";

const selfApi = axios.create({ baseURL: API_BACKEND });

selfApi.interceptors.request.use((config) => {
  const token = getStudentToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mensaje de error legible para el estudiante (el backend responde { error }).
export const mensajeDeError = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;

// ===== Datos personales =====

export const getMiPerfil = async () => {
  const { data } = await selfApi.get("/api/student-portal/me/perfil");
  return data.perfil;
};

export const updateMiPerfil = async (cambios) => {
  const { data } = await selfApi.put("/api/student-portal/me/perfil", cambios);
  return data.perfil;
};

// ===== Foto de perfil =====

export const uploadMiFoto = async (file) => {
  const formData = new FormData();
  formData.append("foto", file);
  const { data } = await selfApi.post("/api/student-portal/me/foto", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.foto_url;
};

export const deleteMiFoto = async () => {
  const { data } = await selfApi.delete("/api/student-portal/me/foto");
  return data;
};

// ===== Mis documentos (PDF) =====

export const getMisDocumentos = async () => {
  const { data } = await selfApi.get("/api/student-portal/me/documentos");
  return data.documentos || [];
};

export const uploadMiDocumento = async (file, { tipo, nombre } = {}) => {
  const formData = new FormData();
  formData.append("documento", file);
  if (tipo) formData.append("tipo", tipo);
  if (nombre) formData.append("nombre", nombre);
  const { data } = await selfApi.post("/api/student-portal/me/documentos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.documento;
};

export const deleteMiDocumento = async (documentoId) => {
  const { data } = await selfApi.delete(`/api/student-portal/me/documentos/${documentoId}`);
  return data;
};
