import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_FINANZAS;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getDocumentosVenta = (params = {}) =>
  api.get('/documentos-venta', { params }).then((r) => r.data);

export const getDocumentoVentaById = (id) =>
  api.get(`/documentos-venta/${id}`).then((r) => r.data);

export const createDocumentoVenta = (data) =>
  api.post('/documentos-venta', data).then((r) => r.data);

export const updateDocumentoVenta = (id, data) =>
  api.put(`/documentos-venta/${id}`, data).then((r) => r.data);

export const deleteDocumentoVenta = (id) =>
  api.delete(`/documentos-venta/${id}`).then((r) => r.data);

export const convertirCotizacionAFactura = (id) =>
  api.post(`/documentos-venta/${id}/convertir`).then((r) => r.data);

export const getEstadisticasDocumentos = () =>
  api.get('/documentos-venta/stats').then((r) => r.data);

export default api;
