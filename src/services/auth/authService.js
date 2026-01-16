// src/services/authService.js
import backApi from "../backApi";
import axios from "axios";

const BACK_URL = import.meta.env.VITE_API_BACKEND;

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
    // IMPORTANTE: aquí voy directo al endpoint real de login del backend
    const { data } = await axios.post(`${BACK_URL}/api/login`, {
      email,
      password,
    });
    // data = { token, user, message }
    return data;
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


export const register = async (userData) => {
  try {
    // userData debe ser objeto: { name, email, password }
    const { data } = await axios.post(`${BACK_URL}/api/registro/auth`, userData);
    return data;
  } catch (error) {
    // Capturamos el error del backend para mostrar mensajes claros
    console.error("Error en registro:", error);
    throw error;
  }
};