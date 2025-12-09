// src/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

const STORAGE_TOKEN_KEY = "authToken";
const STORAGE_USER_KEY = "authUser";

const decodeToken = (token) => {
    try {
        const payloadBase64 = token.split(".")[1];
        const payloadJson = atob(payloadBase64);
        return JSON.parse(payloadJson);
    } catch (error) {
        console.error("Error al decodificar el token:", error);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null); // { email, name, role, ... }
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Cargar datos desde localStorage al inicio
    useEffect(() => {
        const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
        const storedUser = localStorage.getItem(STORAGE_USER_KEY);

        if (storedToken) {
            const payload = decodeToken(storedToken);

            // Validar expiración del token (payload.exp viene en segundos)
            if (payload && payload.exp * 1000 > Date.now()) {
                setToken(storedToken);
                setIsAuthenticated(true);

                if (storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch {
                        setUser(null);
                    }
                } else {
                    // Si no tenemos user guardado, lo reconstruimos desde el payload
                    const reconstructedUser = {
                        id: payload.sub,
                        name: payload.name,
                        role: payload.role,
                        bid: payload.bid,
                    };
                    setUser(reconstructedUser);
                    localStorage.setItem(
                        STORAGE_USER_KEY,
                        JSON.stringify(reconstructedUser)
                    );
                }
            } else {
                // Token expirado o inválido
                localStorage.removeItem(STORAGE_TOKEN_KEY);
                localStorage.removeItem(STORAGE_USER_KEY);
            }
        }

        setLoading(false);
    }, []);

    const login = (newToken, userFromApi) => {
        const payload = decodeToken(newToken);

        localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
        setToken(newToken);
        setIsAuthenticated(true);

        let finalUser = userFromApi;

        if (!finalUser && payload) {
            finalUser = {
                id: payload.sub,
                name: payload.name,
                role: payload.role,
                bid: payload.bid,
            };
        }

        if (finalUser) {
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(finalUser));
            setUser(finalUser);
        }
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
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
