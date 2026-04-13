import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BACKEND;

const backApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

backApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getAllMaterias = async () => {
  const response = await backApi.get("/api/materias");
  return response.data;
};

export const getMateriasByPrograma = async (programaId) => {
  const response = await backApi.get(`/api/materias?programa_id=${programaId}`);
  return response.data;
};

export const createMateria = async (materiaData) => {
  const response = await backApi.post("/api/materias", materiaData);
  return response.data;
};

export const updateMateria = async (materiaId, materiaData) => {
  const response = await backApi.put(`/api/materias/${materiaId}`, materiaData);
  return response.data;
};

export const deleteMateria = async (materiaId) => {
  const response = await backApi.delete(`/api/materias/${materiaId}`);
  return response.data;
};
