import backApi from "../backApi";

export const getHorariosByMateria = (materiaId) =>
  backApi.get(`/api/horarios?materia_id=${materiaId}`).then(r => r.data);

export const getHorariosByEstudiante = (estudianteId) =>
  backApi.get(`/api/horarios/estudiante/${estudianteId}`).then(r => r.data);

export const createHorario = (payload) =>
  backApi.post('/api/horarios', payload).then(r => r.data);

export const updateHorario = (id, payload) =>
  backApi.put(`/api/horarios/${id}`, payload).then(r => r.data);

export const deleteHorario = (id) =>
  backApi.delete(`/api/horarios/${id}`).then(r => r.data);

export const getEstudiantesDeHorario = (horarioId) =>
  backApi.get(`/api/horarios/${horarioId}/estudiantes`).then(r => r.data);

export const asignarEstudiantes = (horarioId, estudianteIds) =>
  backApi.post(`/api/horarios/${horarioId}/estudiantes`, { estudiante_ids: estudianteIds }).then(r => r.data);

export const desasignarEstudiante = (horarioId, estudianteId) =>
  backApi.delete(`/api/horarios/${horarioId}/estudiantes/${estudianteId}`).then(r => r.data);
