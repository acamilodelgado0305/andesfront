// src/services/user/userProfileService.js
// Perfil del usuario autenticado (auth-service): datos + foto de perfil (avatar).
import axios from 'axios';

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

// Perfil del usuario autenticado, incluye avatar_url.
export const getMyProfile = async () => {
  const { data } = await axios.get(`${API_AUTH_URL}/api/users/me`, { headers: authHeader() });
  return data;
};

// Sube/cambia la foto de perfil. Devuelve { message, avatar_url }.
export const uploadMyAvatar = async (file) => {
  const fd = new FormData();
  fd.append('avatar', file);
  // No fijamos Content-Type: el navegador agrega el boundary de multipart.
  const { data } = await axios.post(`${API_AUTH_URL}/api/users/me/avatar`, fd, { headers: authHeader() });
  return data;
};

// Quita la foto de perfil. Devuelve { message, avatar_url: null }.
export const deleteMyAvatar = async () => {
  const { data } = await axios.delete(`${API_AUTH_URL}/api/users/me/avatar`, { headers: authHeader() });
  return data;
};
