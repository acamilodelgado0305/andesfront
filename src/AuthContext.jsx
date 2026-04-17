// src/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    getToken,
    setToken as saveToken,
    getUser,
    setUser as saveUser,
    removeToken,
    removeUser,
    decodeToken,
    logout as logoutService,
} from "./services/auth/authService";

export const AuthContext = createContext(null);

// Campos derivados del JWT que queremos siempre presentes en el `user` del contexto.
const buildUserFromPayload = (payload, base = {}) => ({
    id: base.id ?? payload.sub ?? payload.id,
    email: base.email ?? null,
    name: base.name ?? payload.name,
    role: base.role ?? payload.role,
    bid: base.bid ?? base.business_id ?? payload.bid ?? null,
    business_id: base.business_id ?? base.bid ?? payload.bid ?? null,
    app: base.app ?? payload.scope,
    modules: base.modules ?? payload.modules ?? [],
    business_name: base.business_name ?? payload.business_name,
    businesses: base.businesses ?? payload.businesses ?? [],
    is_trial: base.is_trial ?? payload.is_trial ?? false,
    trial_ends_at: base.trial_ends_at ?? payload.trial_ends_at ?? null,
    onboarding_completed_at: base.onboarding_completed_at ?? payload.onboarding_completed_at ?? null,
    country: base.country ?? payload.country ?? 'CO',
});

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Cargar datos desde localStorage al inicio (usando authService)
    useEffect(() => {
        const storedToken = getToken();
        const storedUser = getUser();

        if (storedToken) {
            const payload = decodeToken(storedToken);

            // Validar expiración
            if (payload && payload.exp * 1000 > Date.now()) {
                setToken(storedToken);
                setIsAuthenticated(true);

                // Fusionar storedUser con lo que venga en el JWT (el token es la
                // fuente de verdad para los campos de sesión: módulos, trial, onboarding).
                const merged = buildUserFromPayload(payload, storedUser || {});
                setUser(merged);
                saveUser(merged);
            } else {
                // Token expirado
                logoutService();
            }
        }
        setLoading(false);
    }, []);

    const login = (newToken, userFromApi) => {
        const payload = decodeToken(newToken);

        saveToken(newToken);
        setToken(newToken);
        setIsAuthenticated(true);

        const finalUser = buildUserFromPayload(payload || {}, userFromApi || {});

        saveUser(finalUser);
        setUser(finalUser);
    };

    // Permite parchar el user en memoria (y en localStorage) sin hacer refresh
    // de token. Lo usamos, por ejemplo, al completar el onboarding: la respuesta
    // del backend trae el business actualizado → marcamos onboarding_completed_at.
    const patchUser = (patch) => {
        setUser((prev) => {
            const next = { ...(prev || {}), ...patch };
            saveUser(next);
            return next;
        });
    };

    const logout = () => {
        logoutService();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        navigate("/login");
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                isAuthenticated,
                loading,
                login,
                logout,
                patchUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
