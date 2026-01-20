import backApi from "../backApi";

// 1. Obtener tipos de pago (Efectivo, Transferencia, etc.)
// Nota: Se actualizó la ruta para coincidir con el backend ('/payment-types')
export const getPaymentTypes = async () => {
  const response = await backApi.get("/api/payment-types");
  return response.data;
};

// 2. Obtener Info Financiera / Cartera (Saldo pendiente, total abonado)
// Esta es la función clave para el nuevo dashboard
export const getStudentProgramInfo = async (studentId) => {
  const response = await backApi.get(`/api/students/${studentId}/program-info`);
  return response.data;
};

// 3. Obtener historial de pagos de un estudiante
export const getPaymentsByStudent = async (studentId) => {
  const response = await backApi.get(`/api/payments/student/${studentId}`);
  return response.data;
};

// 4. Crear un nuevo pago (Abono)
// El payload debe incluir ahora 'program_id' si es un abono a deuda
export const createPayment = async (payload) => {
  const response = await backApi.post("/api/payments", payload);
  return response.data;
};

// 5. Eliminar un pago por ID
export const deletePayment = async (paymentId) => {
  const response = await backApi.delete(`/api/payments/${paymentId}`);
  return response.data;
};

// 6. Obtener total pagado histórico (opcional)
export const getTotalPaidByStudent = async (studentId) => {
  const response = await backApi.get(
    `/api/payments/student/${studentId}/total-paid`
  );
  return response.data;
};