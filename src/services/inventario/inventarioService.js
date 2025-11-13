// src/services/inventarioService.js
import backApi from "../backApi"; // ajusta la ruta si tu backApi está en otro sitio

// Obtener todos los items del inventario (general, si lo usas)
export const getInventario = async () => {
  const response = await backApi.get("/api/inventario");
  return response.data;
};

// Obtener inventario de un usuario específico
export const getInventarioByUser = async (userId) => {
  const response = await backApi.get(`/api/inventario/user/${userId}`);
  return response.data;
};

// Obtener un ítem de inventario por ID
export const getInventarioById = async (id) => {
  const response = await backApi.get(`/api/inventario/${id}`);
  return response.data;
};

// Crear un nuevo ítem de inventario
export const createInventario = async (payload) => {
  // payload debe incluir: { nombre, descripcion?, monto, user_id }
  const response = await backApi.post("/api/inventario", payload);
  return response.data;
};

// Actualizar un ítem de inventario por ID
export const updateInventario = async (id, payload) => {
  // payload: { nombre, descripcion?, monto }
  const response = await backApi.put(`/api/inventario/${id}`, payload);
  return response.data;
};

// Eliminar ítems de inventario por arreglo de IDs
export const deleteInventario = async (ids) => {
  // ids: [1, 2, 3]
  const response = await backApi.delete("/api/inventario", {
    data: { ids },
  });
  return response.data;
};


// Obtener la lista de programas académicos desde inventario
// (los usamos en los selects de Evaluaciones)
export const getInventarioProgramas = async () => {
  // Ahora mismo usamos el mismo endpoint general de inventario.
  // Si más adelante creas un endpoint específico para "programas",
  // solo actualizas esta URL.
  const response = await backApi.get("/api/inventario");
  return response.data;
};
