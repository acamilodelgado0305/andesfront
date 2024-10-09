import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/studentService";
import Swal from "sweetalert2";

const LoginModal = ({ isOpen, onClose }) => {
  const [user, setUser] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setUser((prevUser) => ({ ...prevUser, [name]: value }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsLoading(true);
    try {
      const response = await login(user.email, user.password);

      if (response.message === "Inicio de sesión exitoso" && response.token) {
        // Guarda el token en el localStorage
        localStorage.setItem("token", response.token);

        // Mostrar mensaje de éxito y redirigir al dashboard
        await Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Has iniciado sesión correctamente.',
          timer: 1500,
          showConfirmButton: false
        });

        // Redirigir al dashboard
        navigate("/inicio/dashboard");
      } else {
        throw new Error(response.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al iniciar sesión. Por favor, intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
      setUser({ email: "", password: "" });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={user.email}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={user.password}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? "Iniciando sesión..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default React.memo(LoginModal);
