import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BACKEND;
// auth-service: aquí viven los usuarios (login) y los usuarios del negocio.
const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

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

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

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

// ─── Perfil propio del docente (rol 'docente') ───
export const getMyDocenteProfile = async () => {
  const response = await backApi.get("/api/docentes/me");
  return response.data;
};

export const updateMyDocenteProfile = async (data) => {
  const response = await backApi.put("/api/docentes/me", data);
  return response.data;
};

export const getMisProgramas = async () => {
  const response = await backApi.get("/api/docentes/me/programas");
  return response.data;
};

// ─── Acceso del docente (lo gestiona el admin) ───
// El acceso es un usuario real de auth-service con rol 'docente'. "Activar" crea
// ese usuario y enlaza su id en la fila del docente (andesback).

export const activarAccesoDocente = async (docente, password) => {
  let userId;
  // 1) Crear el usuario en auth-service con rol 'docente'.
  try {
    const { data } = await axios.post(
      `${API_AUTH_URL}/api/businesses/my/users`,
      {
        name: docente.nombre_completo,
        email: docente.email,
        password,
        role: "docente",
      },
      authHeaders()
    );
    userId = data.userId;
  } catch (err) {
    // Si el usuario con ese email YA pertenece al negocio (409) —p. ej. un intento
    // previo que creó el usuario pero no alcanzó a enlazar— lo recuperamos por
    // email y le fijamos la contraseña elegida, para que el flujo sea reintentable.
    if (err.response?.status === 409) {
      const { data: users } = await axios.get(
        `${API_AUTH_URL}/api/businesses/my/users`,
        authHeaders()
      );
      const email = (docente.email || "").toLowerCase();
      const existing = (users || []).find(
        (u) => (u.email || "").toLowerCase() === email
      );
      if (!existing) throw err;
      userId = existing.id;
      await axios.put(
        `${API_AUTH_URL}/api/businesses/my/users/${userId}/password`,
        { newPassword: password },
        authHeaders()
      );
    } else {
      throw err;
    }
  }
  // 2) Enlazar el usuario a la fila del docente (andesback).
  await backApi.put(`/api/docentes/${docente.id}/acceso`, { user_id: userId });
  return { userId };
};

export const resetAccesoPassword = async (userId, newPassword) => {
  const { data } = await axios.put(
    `${API_AUTH_URL}/api/businesses/my/users/${userId}/password`,
    { newPassword },
    authHeaders()
  );
  return data;
};

export const revocarAccesoDocente = async (docente) => {
  // 1) Desvincular el usuario de la fila del docente (andesback).
  await backApi.delete(`/api/docentes/${docente.id}/acceso`);
  // 2) Quitar el usuario del negocio en auth-service (si tenía uno enlazado).
  if (docente.user_id) {
    await axios.delete(
      `${API_AUTH_URL}/api/businesses/my/users/${docente.user_id}`,
      authHeaders()
    );
  }
  return { ok: true };
};
