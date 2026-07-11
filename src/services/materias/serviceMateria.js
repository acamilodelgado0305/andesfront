import axios from "axios";
import { getFlexAuthToken } from "../../utils/authToken";

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

// Instancia para el portal de estudiante: usa su propio token si existe,
// y cae al token de admin (útil cuando un admin previsualiza el portal).
const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

studentApi.interceptors.request.use((config) => {
  const token = getFlexAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getAllMaterias = async () => {
  const response = await backApi.get("/api/materias");
  return response.data;
};

export const getMateriasByPrograma = async (programaId) => {
  const response = await backApi.get(`/api/materias?programa_id=${programaId}`);
  return response.data;
};

// flexAuth en el backend: el endpoint sirve tanto al admin (ProgramaDetalle,
// scopeado por business_id) como al portal de estudiante (MateriaDetalle
// solo-lectura, scopeado por inscripción del estudiante).
//
// IMPORTANTE: el token debe corresponder al CONTEXTO real:
//  - admin  → backApi (authToken). Si usáramos studentApi y quedó un
//    student_portal_token VIGENTE en ese dominio (p. ej. alguien probó el
//    portal), el backend trataría al admin como estudiante y respondería
//    "Materia no encontrada" (pasa en prod, no en local por localStorage
//    distinto por dominio).
//  - estudiante (readOnly) → studentApi (token de estudiante).
export const getMateriaDetalle = async (materiaId, { asStudent = false } = {}) => {
  const client = asStudent ? studentApi : backApi;
  const response = await client.get(`/api/materias/${materiaId}/detalle`);
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

// Copia profunda de la materia en otro programa: clona temas, clases, PDFs,
// presentaciones y evaluaciones (con preguntas/opciones), y copia físicamente los
// archivos de GCS. Puede tardar unos segundos si hay videos/archivos grandes.
export const duplicarMateria = async (materiaId, { programa_id_destino, nombre } = {}) => {
  const response = await backApi.post(`/api/materias/${materiaId}/duplicar`, {
    programa_id_destino,
    nombre,
  });
  return response.data;
};

export const uploadMateriaBanner = async (materiaId, file) => {
  const fd = new FormData();
  fd.append('banner', file);
  const response = await backApi.put(`/api/materias/${materiaId}/banner`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Progreso del estudiante en la materia: temas con examen aprobado vs. total de
// temas. El curso queda "completado" cuando son iguales. Usado por la página de
// felicitaciones al terminar el curso.
export const getMateriaProgresoEstudiante = async (materiaId) => {
  const { data } = await studentApi.get(`/api/materias/${materiaId}/estudiante/progreso`);
  return data;
};
