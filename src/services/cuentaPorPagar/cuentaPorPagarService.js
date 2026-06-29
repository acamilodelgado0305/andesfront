import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_FINANZAS;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCuentasPorPagar = (params = {}) =>
  api.get('/cuentas-por-pagar', { params }).then((r) => r.data);

export const getCuentaPorPagarById = (id) =>
  api.get(`/cuentas-por-pagar/${id}`).then((r) => r.data);

export const createCuentaPorPagar = (data) =>
  api.post('/cuentas-por-pagar', data).then((r) => r.data);

export const updateCuentaPorPagar = (id, data) =>
  api.put(`/cuentas-por-pagar/${id}`, data).then((r) => r.data);

export const deleteCuentaPorPagar = (id) =>
  api.delete(`/cuentas-por-pagar/${id}`).then((r) => r.data);

export const registrarAbono = (id, data) =>
  api.post(`/cuentas-por-pagar/${id}/abonar`, data).then((r) => r.data);

export const pagarCuota = (id, numero, data) =>
  api.post(`/cuentas-por-pagar/${id}/cuotas/${numero}/pagar`, data).then((r) => r.data);

export const revertirCuota = (id, numero) =>
  api.post(`/cuentas-por-pagar/${id}/cuotas/${numero}/revertir`).then((r) => r.data);

export const getEstadisticasCuentasPorPagar = () =>
  api.get('/cuentas-por-pagar/stats').then((r) => r.data);

export default api;
