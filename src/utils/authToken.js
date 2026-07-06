// src/utils/authToken.js
// Selección de token para las instancias "studentApi": endpoints flexAuth que
// sirven tanto al portal del estudiante como al panel de admin (previsualización).
import { decodeJwt } from "./jwt";

// ¿El JWT ya expiró (o no tiene un `exp` legible)? Se trata como expirado si no
// se puede leer su vencimiento, para no confiar en un token dudoso.
const isTokenExpired = (token) => {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp <= Math.floor(Date.now() / 1000);
};

// Token para endpoints flexAuth. Prefiere el token de estudiante SOLO si sigue
// vigente; si está expirado (p. ej. quedó uno viejo tras probar el portal) o no
// existe, cae al token de admin. Así un token de estudiante caducado deja de
// opacar la sesión de admin y romper las llamadas con "Token inválido o expirado".
export const getFlexAuthToken = () => {
  const studentToken = localStorage.getItem("student_portal_token");
  if (studentToken && !isTokenExpired(studentToken)) return studentToken;
  return localStorage.getItem("authToken") || studentToken || null;
};
