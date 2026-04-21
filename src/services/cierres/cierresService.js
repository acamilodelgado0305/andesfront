import backApi from "../backApi";

export const getCierresByPrograma = async (programaId) => {
    const response = await backApi.get(`/api/cierres/programa/${programaId}`);
    return response.data;
};

export const createCierre = async (nombre, programa_id) => {
    const response = await backApi.post('/api/cierres', { nombre, programa_id });
    return response.data;
};

export const cerrarCierre = async (id) => {
    const response = await backApi.put(`/api/cierres/${id}/cerrar`);
    return response.data;
};

export const deleteCierre = async (id) => {
    const response = await backApi.delete(`/api/cierres/${id}`);
    return response.data;
};
