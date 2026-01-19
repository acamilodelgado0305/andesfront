import axios from "axios";

// Usamos la misma variable de entorno
const API_BACKEND = import.meta.env.VITE_API_FINANZAS;

const pedidoApi = axios.create({
    baseURL: API_BACKEND,
});

// Interceptor: Inyecta el token automáticamente (Igual que en personas)
pedidoApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ===================== FUNCIONES DEL CRUD PEDIDOS ===================== //

/**
 * Obtener lista de pedidos con paginación y filtros.
 * @param {Object} params - { page: 1, estado: 'PENDIENTE', fecha_inicio: '...', fecha_fin: '...' }
 */
export const getPedidos = async (params = {}) => {
    // La ruta es /pedidos porque en app.js definimos app.use('/api/pedidos', ...)
    // y la baseURL ya apunta a /api (asumiendo tu config). 
    // Si tu baseURL termina en /api, aquí solo pon '/pedidos'
    const response = await pedidoApi.get('/pedidos', { params });
    return response.data;
};

/**
 * Obtener el detalle completo de un pedido (Cabecera + Items)
 * @param {number} id - ID del pedido
 */
export const getPedidoById = async (id) => {
    const response = await pedidoApi.get(`/pedidos/${id}`);
    return response.data;
};

/**
 * Crear un nuevo pedido.
 * Estructura esperada de data:
 * {
 * persona_id: 1,
 * observaciones: "Opcional",
 * items: [
 * { inventario_id: 10, cantidad: 2 },
 * { inventario_id: 5, cantidad: 1 }
 * ]
 * }
 */
export const createPedido = async (data) => {
    const response = await pedidoApi.post("/pedidos", data);
    return response.data;
};

/**
 * Cambiar el estado de un pedido (PENDIENTE -> ENTREGADO / ANULADO)
 * @param {number} id - ID del pedido
 * @param {string} nuevoEstado - 'PENDIENTE', 'ENTREGADO' o 'ANULADO'
 */
export const updateEstadoPedido = async (id, data) => {
    // 1. Preparamos el cuerpo de la petición (body)
    let body;

    // Si pasas solo el texto (ej: "ANULADO"), lo envolvemos
    if (typeof data === 'string') {
        body = { nuevo_estado: data };
    }
    // Si pasas un objeto (ej: { nuevo_estado: 'ENTREGADO', cuenta_destino: 'Nequi' }), lo usamos directo
    else {
        body = data;
    }

    // 2. Enviamos la petición
    // Nota: Verifica si tu backend usa PATCH o PUT. Usaré PATCH porque así lo tienes tú.
    const response = await pedidoApi.patch(`/pedidos/${id}/estado`, body);

    return response.data;
};

/**
 * Eliminar un pedido
 * @param {number} id - ID del pedido
 */
export const deletePedido = async (id) => {
    const response = await pedidoApi.delete(`/pedidos/${id}`);
    return response.data;
};

export const updatePedido = async (id, data) => {
    const response = await pedidoApi.put(`/pedidos/${id}`, data);
    return response.data;
};

export const getOrderStats = async () => {
    const response = await pedidoApi.get('/pedidos/stats');
    return response.data;
};

export default pedidoApi;