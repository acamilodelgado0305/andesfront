import backApi from "../backApi"; // Asegúrate de que apunte a tu instancia de Axios

// Helper para loguear errores de forma consistente
const logApiError = (context, error) => {
  if (error.response) {
    // El servidor respondió con un código de estado fuera del rango 2xx
    console.error(
      `${context} - Status: ${error.response.status}, Data:`,
      error.response.data
    );
    // Retornamos el mensaje exacto del backend si existe (ej: "Ya existe un programa...")
    return error.response.data.message || error.response.statusText;
  } else if (error.request) {
    // La petición fue hecha pero no se recibió respuesta
    console.error(`${context} - No hubo respuesta del servidor`, error.request);
    return "No hubo respuesta del servidor. Verifica tu conexión.";
  } else {
    // Algo pasó al configurar la petición
    console.error(`${context} - Error de configuración:`, error.message);
    return error.message;
  }
};

// ========================= PROGRAMAS ========================= //

/**
 * Obtener programas
 * Mejora: Acepta 'params' para filtros (ej: { activo: true, tipo_programa: 'Tecnico' })
 */
export const getPrograms = async (params = {}) => {
  try {
    // Axios maneja los query params automáticamente si se los pasas así
    const response = await backApi.get("/api/programas", { params });
    return response.data;
  } catch (error) {
    const msg = logApiError("Error al obtener los programas", error);
    throw new Error(msg); // Lanzamos el error para que la UI (useEffect/React Query) lo maneje
  }
};

/**
 * Obtener un solo programa por ID
 * Útil para cargar los datos en el formulario de edición
 */
export const getProgramById = async (id) => {
  try {
    const response = await backApi.get(`/api/programas/${id}`);
    return { ok: true, data: response.data };
  } catch (error) {
    const msg = logApiError("Error al obtener el programa", error);
    return { ok: false, error: msg };
  }
};

/**
 * Crear programa
 * Espera objeto con: { nombre, tipo_programa, duracion_meses, valor_matricula... }
 */
export const addProgram = async (programData) => {
  try {
    const response = await backApi.post("/api/programas", programData);
    return { ok: true, data: response.data };
  } catch (error) {
    const msg = logApiError("Error al agregar el programa", error);
    return { ok: false, error: msg };
  }
};

/**
 * Actualizar programa
 * NUEVO: Es vital para recalcular costos si cambias duración o precios.
 */
export const updateProgram = async (id, programData) => {
  try {
    const response = await backApi.put(`/api/programas/${id}`, programData);
    return { ok: true, data: response.data };
  } catch (error) {
    const msg = logApiError("Error al actualizar el programa", error);
    return { ok: false, error: msg };
  }
};

/**
 * Eliminar (Desactivar) programa
 */
export const deleteProgram = async (programId) => {
  try {
    const response = await backApi.delete(`/api/programas/${programId}`);
    return { ok: true, data: response.data };
  } catch (error) {
    const msg = logApiError("Error al eliminar el programa", error);
    return { ok: false, error: msg };
  }
};