// src/services/auth/authService.js
import axios from "axios";

// Access environment variable for backend URL
const BACK_URL = import.meta.env.VITE_API_BACKEND || "http://localhost:3002";
// Access environment variable for Auth Service URL
const AUTH_SERVICE_URL = import.meta.env.VITE_API_AUTH_SERVICE || "http://localhost:3001";

// Define storage keys to ensure consistency across the application
export const TOKEN_KEY = "authToken";
export const USER_KEY = "authUser";

/**
 * Set the authentication token in local storage.
 * @param {string} token - The JWT token.
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Get the authentication token from local storage.
 * @returns {string|null} The JWT token or null.
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove the authentication token from local storage.
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Set the user data in local storage.
 * @param {object} user - The user object.
 */
export const setUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Get the user data from local storage.
 * @returns {object|null} The user object or null.
 */
export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error parsing user from storage", e);
    return null;
  }
};

/**
 * Remove the user data from local storage.
 */
export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * Decode part of the JWT token.
 * @param {string} token 
 * @returns {object|null}
 */
export const decodeToken = (token) => {
  try {
    const payloadBase64 = token.split(".")[1];
    // Fix for special characters in base64
    const payloadJson = decodeURIComponent(
      atob(payloadBase64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(payloadJson);
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    return null;
  }
};

/**
 * Perform login request to the Auth Service.
 * Returns the response data { token, user, message }.
 * Note: This function does NOT automatically save to localStorage. 
 * The consumer (e.g., AuthContext or Component) should handle storage or use helper methods.
 * 
 * @param {string} email 
 * @param {string} password 
 */
export const login = async (email, password) => {
  try {
    const { data } = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
      email,
      password,
    });
    return data;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
};

/**
 * Helper to clear session data (token and user).
 */
export const logout = () => {
  removeToken();
  removeUser();
};

/**
 * Register a new user via Auth Service.
 * @param {object} userData - { name, email, password }
 */
export const register = async (userData) => {
  try {
    const { data } = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, userData);
    return data;
  } catch (error) {
    console.error("Error en registro:", error);
    throw error;
  }
};

/**
 * Switch business context.
 * @param {number} businessId
 * @param {string} currentToken - Optional if using axios interceptor, but good to specific
 */
export const switchBusiness = async (businessId, currentToken) => {
  try {
    const headers = {};
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    } else {
      const storedToken = getToken();
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
    }

    const { data } = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/switch-business`,
      { businessId },
      { headers }
    );
    return data;
  } catch (error) {
    console.error("Error al cambiar de negocio:", error);
    throw error;
  }
};
