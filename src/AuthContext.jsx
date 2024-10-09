import React, { createContext, useState, useEffect } from "react";

// Crear el contexto
export const AuthContext = createContext();

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);

    // Cargar el token desde localStorage cuando la aplicación se monta
    useEffect(() => {
        const storedToken = localStorage.getItem("authToken");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    // Función para iniciar sesión
    const login = (token) => {
        localStorage.setItem("authToken", token);
        setToken(token);
    };

    // Función para cerrar sesión
    const logout = () => {
        localStorage.removeItem("authToken");
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
