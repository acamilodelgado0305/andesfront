import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_FINANZAS;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Cuentas por Pagar y por Cobrar exponen los mismos endpoints en BACKEND;
// solo cambia la ruta base.
const crearServicioCuentas = (base) => ({
  getCuentas: (params = {}) =>
    api.get(base, { params }).then((r) => r.data),

  getCuentaById: (id) =>
    api.get(`${base}/${id}`).then((r) => r.data),

  createCuenta: (data) =>
    api.post(base, data).then((r) => r.data),

  updateCuenta: (id, data) =>
    api.put(`${base}/${id}`, data).then((r) => r.data),

  deleteCuenta: (id) =>
    api.delete(`${base}/${id}`).then((r) => r.data),

  registrarAbono: (id, data) =>
    api.post(`${base}/${id}/abonar`, data).then((r) => r.data),

  aumentarDeuda: (id, data) =>
    api.post(`${base}/${id}/aumentar`, data).then((r) => r.data),

  editarMontoMovimiento: (id, movId, data) =>
    api.put(`${base}/${id}/movimientos/${movId}`, data).then((r) => r.data),

  getEstadisticas: () =>
    api.get(`${base}/stats`).then((r) => r.data),
});

export const cuentasPorPagarService  = crearServicioCuentas('/cuentas-por-pagar');
export const cuentasPorCobrarService = crearServicioCuentas('/cuentas-por-cobrar');
