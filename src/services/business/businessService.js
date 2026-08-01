// src/services/business/businessService.js
import axios from 'axios';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

// Info pública mínima de un negocio (nombre + logo). Sin autenticación —
// pensada para el portal del estudiante, que no tiene JWT de auth-service.
export const getBusinessPublicInfo = async (businessId) => {
  const response = await axios.get(`${API_AUTH_URL}/api/businesses/${businessId}/public`);
  return response.data; // { id, name, profilePictureUrl }
};
