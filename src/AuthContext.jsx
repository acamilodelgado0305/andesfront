import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = sessionStorage.getItem("authToken");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    const login = (newToken) => {
        sessionStorage.setItem("authToken", newToken);
        setToken(newToken);
    };

    const logout = () => {
        sessionStorage.removeItem("authToken");
        setToken(null);
        navigate("/"); // Redirigir al inicio
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
