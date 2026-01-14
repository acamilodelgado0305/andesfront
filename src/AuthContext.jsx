// src/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

const STORAGE_TOKEN_KEY = "authToken";
const STORAGE_USER_KEY = "authUser";

const decodeToken = (token) => {
    try {
        const payloadBase64 = token.split(".")[1];
        // Truco para caracteres especiales (tildes/ñ) en base64
        const payloadJson = decodeURIComponent(atob(payloadBase64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(payloadJson);
    } catch (error) {
        console.error("Error al decodificar el token:", error);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Cargar datos desde localStorage al inicio
    useEffect(() => {
        const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
        const storedUser = localStorage.getItem(STORAGE_USER_KEY);

        if (storedToken) {
            const payload = decodeToken(storedToken);

            // Validar expiración
            if (payload && payload.exp * 1000 > Date.now()) {
                setToken(storedToken);
                setIsAuthenticated(true);

                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        // Aseguramos que si el token trae módulos nuevos y el localStorage es viejo,
                        // actualizamos con la info del token
                        if (!parsedUser.modules && payload.modules) {
                            parsedUser.modules = payload.modules;
                        }
                        setUser(parsedUser);
                    } catch {
                        setUser(null);
                    }
                } else {
                    // RECONSTRUCCIÓN SI NO HAY DATOS EN LOCALSTORAGE
                    const reconstructedUser = {
                        id: payload.sub, // O payload.id según tu backend
                        name: payload.name,
                        role: payload.role,
                        bid: payload.bid,
                        app: payload.scope, // O payload.app
                        // <--- IMPORTANTE: RECUPERAR LOS MÓDULOS DEL TOKEN
                        modules: payload.modules || []
                    };
                    setUser(reconstructedUser);
                    localStorage.setItem(
                        STORAGE_USER_KEY,
                        JSON.stringify(reconstructedUser)
                    );
                }
            } else {
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

        // Si por alguna razón la API no manda el user completo, lo sacamos del token
        if (!finalUser && payload) {
            finalUser = {
                id: payload.sub,
                name: payload.name,
                role: payload.role,
                bid: payload.bid,
                app: payload.scope,
                // <--- IMPORTANTE: MAPEAR MÓDULOS AQUÍ TAMBIÉN
                modules: payload.modules || []
            };
        }

        // Si el user viene de la API, nos aseguramos que traiga módulos, sino miramos el token
        if (finalUser && !finalUser.modules && payload && payload.modules) {
            finalUser.modules = payload.modules;
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