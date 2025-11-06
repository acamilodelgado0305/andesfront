// src/services/paymentService.js
import backApi from "../backApi"; // ajusta la ruta si tu backApi está en otro sitio

// Obtener tipos de pago (Mensualidad, Matrícula, etc.)
export const getPaymentTypes = async () => {
  const response = await backApi.get("/api/types_pago");
  return response.data;
};

// Obtener info de programa del estudiante (costo mensual, etc.)
export const getStudentProgramInfo = async (studentId) => {
  const response = await backApi.get(`/api/students/${studentId}/program-info`);
  return response.data;
};

// Obtener todos los pagos de un estudiante
export const getPaymentsByStudent = async (studentId) => {
  const response = await backApi.get(`/api/payments/student/${studentId}`);
  return response.data;
};

// Crear un nuevo pago
export const createPayment = async (payload) => {
  const response = await backApi.post("/api/payments", payload);
  return response.data;
};

// Eliminar un pago por ID
export const deletePayment = async (paymentId) => {
  const response = await backApi.delete(`/api/payments/${paymentId}`);
  return response.data;
};

// Obtener total pagado por estudiante (si quieres usarlo)
export const getTotalPaidByStudent = async (studentId) => {
  const response = await backApi.get(
    `/api/payments/student/${studentId}/total-paid`
  );
  return response.data;
};
