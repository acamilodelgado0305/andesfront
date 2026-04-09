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

                if (storedUser) {
                    // Si el token trae módulos nuevos y el localStorage es viejo, actualizamos
                    if (!storedUser.modules && payload.modules) {
                        storedUser.modules = payload.modules;
                    }
                    setUser(storedUser);
                } else {
                    // RECONSTRUCCIÓN SI NO HAY DATOS EN LOCALSTORAGE
                    const reconstructedUser = {
                        id: payload.sub, // O payload.id según tu backend
                        name: payload.name,
                        role: payload.role,
                        bid: payload.bid,
                        app: payload.scope, // O payload.app
                        modules: payload.modules || [],
                        business_name: payload.business_name,
                        businesses: payload.businesses || []
                    };
                    setUser(reconstructedUser);
                    saveUser(reconstructedUser);
                }
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

        let finalUser = userFromApi;

        // Si por alguna razón la API no manda el user completo, lo sacamos del token
        if (!finalUser && payload) {
            finalUser = {
                id: payload.sub,
                name: payload.name,
                role: payload.role,
                bid: payload.bid,
                app: payload.scope,
                modules: payload.modules || [],
                business_name: payload.business_name,
                businesses: payload.businesses || []
            };
        }

        // Completar campos faltantes desde el token
        if (finalUser && payload) {
            if (!finalUser.modules && payload.modules) {
                finalUser.modules = payload.modules;
            }
            if (!finalUser.businesses && payload.businesses) {
                finalUser.businesses = payload.businesses;
            }
            if (!finalUser.business_name && payload.business_name) {
                finalUser.business_name = payload.business_name;
            }
            // Normalizar bid: prioridad token > business_id del user object
            if (!finalUser.bid) {
                finalUser.bid = payload.bid || finalUser.business_id || null;
            }
        }

        if (finalUser) {
            saveUser(finalUser);
            setUser(finalUser);
        }
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
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
