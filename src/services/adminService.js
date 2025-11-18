// src/services/adminService.js

import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BACKEND;

const backApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

backApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getAllClientsApi = async () => {
  try {
    const response = await backApi.get("/clients");
    return response.data;
  } catch (error) {
    console.error("Error al obtener los clientes:", error);
    throw error;
  }
};

export const getClientDetailsApi = async (userId) => {
  try {
    const response = await backApi.get(`/clients/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener los detalles del cliente ${userId}:`, error);
    throw error;
  }
};

export const createSubscriptionApi = async (subscriptionData) => {
  try {
    const response = await backApi.post('/api/subscriptions', subscriptionData);
    return response.data;
  } catch (error) {
    console.error('Error al crear la suscripción:', error);
    throw error;
  }
};

/**
 * Crea un nuevo cargo extra para una suscripción.
 * Corresponde a: POST /admin/extra-charges
 */
export const createExtraChargeApi = async (chargeData) => {
    try {
        const response = await backApi.post('/extra-charges', chargeData);
        return response.data;
    } catch (error) {
        console.error('Error al crear el cargo extra:', error);
        throw error;
    }
};