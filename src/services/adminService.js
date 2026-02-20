import axios from 'axios';

const API_URL = import.meta.env.VITE_API_AUTH_SERVICE;

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const adminService = {
  // Suscripciones
  getSubscriptions: async () => {
    const { data } = await axios.get(`${API_URL}/api/admin/subscriptions`, getAuthHeaders());
    return data; // Retorna lista de negocios con estado de suscripción
  },

  getClientDetails: async (businessId) => {
    const { data } = await axios.get(`${API_URL}/api/admin/client-details/${businessId}`, getAuthHeaders());
    return data;
  },

  createSubscription: async (subscriptionData) => {
    // subscriptionData espera: { businessId, planId, amountPaid, durationMonths, description }
    const { data } = await axios.post(`${API_URL}/api/admin/subscriptions`, subscriptionData, getAuthHeaders());
    return data;
  },

  renewSubscription: async (renewalData) => {
    // renewalData espera: { businessId, planId, description }
    const { data } = await axios.post(`${API_URL}/api/admin/subscriptions/renew`, renewalData, getAuthHeaders());
    return data;
  },

  updateSubscription: async (subscriptionId, updateData) => {
    // updateData espera: { planId, amountPaid, description }
    const { data } = await axios.put(`${API_URL}/api/admin/subscriptions/${subscriptionId}`, updateData, getAuthHeaders());
    return data;
  },

  // Planes
  getPublicPlans: async () => {
    const { data } = await axios.get(`${API_URL}/api/admin/plans`, getAuthHeaders());
    return data;
  },

  getAdminPlans: async () => {
    const { data } = await axios.get(`${API_URL}/api/admin/plans-admin`, getAuthHeaders());
    return data;
  },

  createPlan: async (planData) => {
    const { data } = await axios.post(`${API_URL}/api/admin/plans`, planData, getAuthHeaders());
    return data;
  },

  updatePlan: async (id, planData) => {
    const { data } = await axios.put(`${API_URL}/api/admin/plans/${id}`, planData, getAuthHeaders());
    return data;
  },

  togglePlanStatus: async (id) => {
    const { data } = await axios.patch(`${API_URL}/api/admin/plans/${id}/status`, {}, getAuthHeaders());
    return data;
  }
};