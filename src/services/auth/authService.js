// src/services/authService.js
import backApi from "../backApi";
import axios from "axios";

const BACK_URL =
  "https://clasit-backend-api-570877385695.us-central1.run.app";

// Opcional: si quieres login SIN interceptor ni token:
export const rawLogin = async (email, password) => {
  try {
    const response = await axios.post(`${BACK_URL}/login`, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error al iniciar sesión (rawLogin):", error);
    throw error;
  }
};

// Login usando backApi (normalmente igual al anterior, pero pasando por interceptor)
export const login = async (email, password) => {
  try {
    const response = await backApi.post("/api/login", { email, password });
    return response.data; // aquí vendrá tu token, user, etc.
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
};

// Helper opcional para cerrar sesión
export const logout = () => {
  localStorage.removeItem("token");
  // aquí también puedes limpiar más cosas (usuario, rol, etc.)
};
