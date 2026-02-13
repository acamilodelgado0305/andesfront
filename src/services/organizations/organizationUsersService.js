import axios from "axios";

const API_BACKEND = import.meta.env.VITE_API_BACKEND;

const orgUsersApi = axios.create({
    baseURL: API_BACKEND,
});

// Interceptor: Inyecta el token y x-tenant automáticamente
orgUsersApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Inyectar x-tenant desde la organización del usuario
        try {
            const storedUser = localStorage.getItem("authUser");
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const slug = user?.organization?.slug || user?.organization?.name;
                if (slug) {
                    config.headers["x-tenant"] = slug;
                }
            }
        } catch (e) {
            // silenciar errores de parsing
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ===================== FUNCIONES ===================== //

/**
 * Obtener usuarios de una organización (paginado + búsqueda)
 * @param {number|string} organizationId
 * @param {Object} params - { page, limit, search }
 */
export const getOrganizationUsers = async (organizationId, params = {}) => {
    const response = await orgUsersApi.get(
        `/api/organizations/${organizationId}/users`,
        { params }
    );
    return response.data;
};

/**
 * Crear o asociar usuario a una organización
 * @param {number|string} organizationId
 * @param {Object} data - { name, email, password, role?, is_default? }
 */
export const createOrganizationUser = async (organizationId, data) => {
    const response = await orgUsersApi.post(
        `/api/organizations/${organizationId}/users`,
        data
    );
    return response.data;
};

/**
 * Remover usuario de una organización (solo la relación, no borra el usuario)
 * @param {number|string} organizationId
 * @param {number|string} userId
 */
export const removeOrganizationUser = async (organizationId, userId) => {
    const response = await orgUsersApi.delete(
        `/api/organizations/${organizationId}/users/${userId}`
    );
    return response.data;
};

export default orgUsersApi;
