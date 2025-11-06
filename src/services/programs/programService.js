// src/services/programsService.js
import backApi from "../backApi";

// Helper para loguear errores
const logApiError = (context, error) => {
  if (error.response) {
    console.error(
      `${context} - Status: ${error.response.status}, Data:`,
      error.response.data
    );
  } else if (error.request) {
    console.error(`${context} - No hubo respuesta del servidor`, error.request);
  } else {
    console.error(`${context} - Error configurando la solicitud:`, error.message);
  }
};

// ========================= PROGRAMAS ========================= //

// Obtener todos los programas
export const getPrograms = async () => {
  try {
    const response = await backApi.get("/api/programs");
    return response.data;
  } catch (error) {
    logApiError("Error al obtener los programas", error);
    throw error;
  }
};

// Crear programa
export const addProgram = async (programData) => {
  try {
    const response = await backApi.post("/api/programs", programData);

    if (response.status >= 200 && response.status < 300) {
      return { ok: true, data: response.data };
    } else {
      return { ok: false, error: response.statusText || "Error desconocido" };
    }
  } catch (error) {
    logApiError("Error al agregar el programa", error);
    return {
      ok: false,
      error: error.message || "Error al realizar la solicitud",
    };
  }
};

// Eliminar programa
export const deleteProgram = async (programId) => {
  try {
    const response = await backApi.delete(`/api/programs/${programId}`);

    if (response.status >= 200 && response.status < 300) {
      return { ok: true, data: response.data };
    } else {
      return { ok: false, error: response.statusText || "Error desconocido" };
    }
  } catch (error) {
    logApiError("Error al eliminar el programa", error);
    return {
      ok: false,
      error: error.message || "Error al realizar la solicitud",
    };
  }
};
