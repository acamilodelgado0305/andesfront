// src/services/programasService.js
import backApi from "../backApi";

// Listar programas (opcionalmente con filtros: { tipo_programa, activo })
export const getProgramas = async (params = {}) => {
  const response = await backApi.get("/api/programas", { params });
  // El backend devuelve un array directamente
  return response.data;
};

export const getProgramaById = async (id) => {
  const response = await backApi.get(`/api/programas/${id}`);
  return response.data;
};

export const createPrograma = async (payload) => {
  const response = await backApi.post("/api/programas", payload);
  return response.data;
};

export const updateProgramaService = async (id, payload) => {
  const response = await backApi.put(`/api/programas/${id}`, payload);
  return response.data;
};

export const deleteProgramaService = async (id) => {
  const response = await backApi.delete(`/api/programas/${id}`);
  return response.data;
};
