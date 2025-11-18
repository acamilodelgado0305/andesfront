// src/services/programasService.js
import backApi from "../backApi";

/**
 * Listar programas
 * @param {object} params - Filtros opcionales: { tipo_programa, activo }
 * @returns {Promise<Array>} Lista de programas.
 */
export const getProgramas = async (params = {}) => {
  // Comunicación con GET /api/programas?tipo_programa=Tecnico...
  const response = await backApi.get("/api/programas", { params });
  // El backend devuelve un array directamente (rows)
  return response.data;
};

/**
 * Obtener un programa por ID
 * @param {number} id - ID del programa.
 * @returns {Promise<object>} Objeto programa.
 */
export const getProgramaById = async (id) => {
  const response = await backApi.get(`/api/programas/${id}`);
  return response.data;
};

/**
 * Crear un nuevo programa
 * @param {object} payload - Datos del nuevo programa.
 * @returns {Promise<object>} Objeto con message y data del programa creado.
 */
export const createPrograma = async (payload) => {
  const response = await backApi.post("/api/programas", payload);
  // El backend devuelve { message, data: { ... } }
  return response.data;
};

/**
 * Actualizar un programa existente (Refactorizado)
 * @param {number} id - ID del programa a actualizar.
 * @param {object} payload - Datos parciales o completos a actualizar.
 * @returns {Promise<object>} Objeto con message y data del programa actualizado.
 */
export const updatePrograma = async (id, payload) => {
  // Usamos .put o .patch según la convención. El backend espera un PATCH/PUT.
  const response = await backApi.put(`/api/programas/${id}`, payload); 
  return response.data;
};

/**
 * Desactivar (Borrado Lógico) un programa (Refactorizado)
 * @param {number} id - ID del programa a desactivar.
 * @returns {Promise<object>} Objeto con message.
 */
export const deletePrograma = async (id) => {
  // El backend hace un soft delete (activo = false)
  const response = await backApi.delete(`/api/programas/${id}`);
  return response.data;
};