import axios from "axios";

// Mismo backend POS/Finanzas donde viven Inventario, CRM, Movimientos...
const API_BACKEND = import.meta.env.VITE_API_FINANZAS;

const tareasApi = axios.create({
    baseURL: `${API_BACKEND}/tareas`,
});

tareasApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const data = (p) => p.then((r) => r.data);

/** Mensaje legible de un error de la API. */
export const mensajeError = (error, porDefecto = 'No se pudo completar') =>
    error?.response?.data?.message || porDefecto;

// ── Proyectos ───────────────────────────────────────────────────────────────
export const getTableros = (archivados = false) => data(tareasApi.get('/tableros', { params: archivados ? { archivados: 1 } : {} }));
export const crearTablero = (body) => data(tareasApi.post('/tableros', body));
export const getTablero = (id, archivadas = false) => data(tareasApi.get(`/tableros/${id}`, { params: archivadas ? { archivadas: 1 } : {} }));
export const actualizarTablero = (id, body) => data(tareasApi.put(`/tableros/${id}`, body));
export const moverTablero = (id, despues_de) => data(tareasApi.put(`/tableros/${id}/mover`, { despues_de }));
export const eliminarTablero = (id) => data(tareasApi.delete(`/tableros/${id}`));

// ── Listas ──────────────────────────────────────────────────────────────────
export const crearLista = (tableroId, body) => data(tareasApi.post(`/tableros/${tableroId}/listas`, body));
export const actualizarLista = (id, body) => data(tareasApi.put(`/listas/${id}`, body));
export const moverLista = (id, despues_de) => data(tareasApi.put(`/listas/${id}/mover`, { despues_de }));
export const eliminarLista = (id, moverA) => data(tareasApi.delete(`/listas/${id}`, { params: moverA ? { mover_a: moverA } : {} }));

// ── Etiquetas ───────────────────────────────────────────────────────────────
export const crearEtiqueta = (tableroId, body) => data(tareasApi.post(`/tableros/${tableroId}/etiquetas`, body));
export const actualizarEtiqueta = (id, body) => data(tareasApi.put(`/etiquetas/${id}`, body));
export const eliminarEtiqueta = (id) => data(tareasApi.delete(`/etiquetas/${id}`));

// ── Tarjetas ────────────────────────────────────────────────────────────────
export const getTarjetas = (params = {}) => data(tareasApi.get('/tarjetas', { params }));
export const crearTarjeta = (listaId, body) => data(tareasApi.post(`/listas/${listaId}/tarjetas`, body));
export const getTarjeta = (id) => data(tareasApi.get(`/tarjetas/${id}`));
export const actualizarTarjeta = (id, body) => data(tareasApi.put(`/tarjetas/${id}`, body));
export const moverTarjeta = (id, lista_id, despues_de) => data(tareasApi.put(`/tarjetas/${id}/mover`, { lista_id, despues_de }));
export const copiarTarjeta = (id, body = {}) => data(tareasApi.post(`/tarjetas/${id}/copiar`, body));
export const eliminarTarjeta = (id) => data(tareasApi.delete(`/tarjetas/${id}`));

// ── Subtareas ───────────────────────────────────────────────────────────────
export const crearSubtareas = (tarjetaId, texto) => data(tareasApi.post(`/tarjetas/${tarjetaId}/subtareas`, { texto }));
export const actualizarSubtarea = (id, body) => data(tareasApi.put(`/subtareas/${id}`, body));
export const moverSubtarea = (id, despues_de) => data(tareasApi.put(`/subtareas/${id}/mover`, { despues_de }));
export const convertirSubtarea = (id) => data(tareasApi.post(`/subtareas/${id}/convertir`));
export const eliminarSubtarea = (id) => data(tareasApi.delete(`/subtareas/${id}`));

// ── Comentarios ─────────────────────────────────────────────────────────────
export const crearComentario = (tarjetaId, texto) => data(tareasApi.post(`/tarjetas/${tarjetaId}/comentarios`, { texto }));
export const actualizarComentario = (id, texto) => data(tareasApi.put(`/comentarios/${id}`, { texto }));
export const eliminarComentario = (id) => data(tareasApi.delete(`/comentarios/${id}`));

// ── Adjuntos ────────────────────────────────────────────────────────────────
export const subirAdjunto = (tarjetaId, archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return data(tareasApi.post(`/tarjetas/${tarjetaId}/adjuntos`, form));
};
export const agregarEnlace = (tarjetaId, url, nombre) => data(tareasApi.post(`/tarjetas/${tarjetaId}/enlaces`, { url, nombre }));
export const eliminarAdjunto = (id) => data(tareasApi.delete(`/adjuntos/${id}`));

// ── Avisos al celular ───────────────────────────────────────────────────────
export const getAvisos = () => data(tareasApi.get('/avisos'));
export const actualizarAvisos = (body) => data(tareasApi.put('/avisos', body));
export const suscribirAvisos = (suscripcion, dispositivo) => data(tareasApi.post('/avisos/suscribir', { suscripcion, dispositivo }));
export const desuscribirAvisos = (endpoint) => data(tareasApi.post('/avisos/desuscribir', { endpoint }));
export const probarAvisos = () => data(tareasApi.post('/avisos/probar'));
