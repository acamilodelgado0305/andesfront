import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BACKEND;

const backApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

backApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const getAllDocentes = async () => {
  const response = await backApi.get("/api/docentes");
  return response.data;
};

export const getDocenteById = async (docenteId) => {
  const response = await backApi.get(`/api/docentes/${docenteId}`);
  return response.data;
};

export const createDocente = async (docenteData) => {
  const response = await backApi.post("/api/docentes", docenteData);
  return response.data;
};

export const updateDocente = async (docenteId, docenteData) => {
  const response = await backApi.put(`/api/docentes/${docenteId}`, docenteData);
  return response.data;
};

export const deleteDocente = async (docenteId) => {
  const response = await backApi.delete(`/api/docentes/${docenteId}`);
  return response.data;
};

// ─── Docentes asociados a un programa (muchos a muchos) ───
export const getProgramaDocentes = async (programaId) => {
  const response = await backApi.get(`/api/programas/${programaId}/docentes`);
  return response.data;
};

export const addDocenteToPrograma = async (programaId, docenteId) => {
  const response = await backApi.post(`/api/programas/${programaId}/docentes`, {
    docente_id: docenteId,
  });
  return response.data;
};

export const removeDocenteFromPrograma = async (programaId, docenteId) => {
  const response = await backApi.delete(`/api/programas/${programaId}/docentes/${docenteId}`);
  return response.data;
};
