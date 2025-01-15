import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem("authToken");
        const storedUserId = localStorage.getItem("userId");
        if (storedToken && storedUserId) {
            setToken(storedToken);
            setUserId(storedUserId);
        } else if (storedToken) {
            const decodedUserId = decodeUserIdFromToken(storedToken);
            setUserId(decodedUserId);
        }
    }, []);

    // Función para extraer el userId del token y guardarlo en localStorage
    const decodeUserIdFromToken = (token) => {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const userId = payload.userId || null;
            if (userId) {
                localStorage.setItem("userId", userId);
            }
            return userId;
        } catch (error) {
            console.error("Error al decodificar el token:", error);
            return null;
        }
    };

    const login = (newToken) => {
        localStorage.setItem("authToken", newToken);
        setToken(newToken);

        const decodedUserId = decodeUserIdFromToken(newToken);
        setUserId(decodedUserId);
    };

    const logout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userId");
        setToken(null);
        setUserId(null);
        navigate("/");
    };

    return (
        <AuthContext.Provider value={{ token, userId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
