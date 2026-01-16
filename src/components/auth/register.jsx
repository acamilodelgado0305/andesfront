import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../../services/auth/authService"; // Importamos el servicio

export default function Register() {
  const navigate = useNavigate();

  // Estado para los datos del formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Estados para UX (Carga y Errores)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleInputChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
    // Limpiamos errores al escribir
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // Usamos el servicio centralizado
      await register(formData);

      setSuccessMsg("¡Cuenta creada con éxito! Redirigiendo...");

      // Esperamos 1.5 seg para que el usuario lea el mensaje y redirigimos
      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      // Extraemos el mensaje de error del backend (si existe)
      const msg = err.response?.data?.error ||
        err.response?.data?.details?.[0] ||
        "Error al registrar usuario.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">

        {/* Encabezado */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Crear Cuenta</h2>
          <p className="text-gray-500 text-sm">Empieza a gestionar tu negocio hoy</p>
        </div>

        {/* Mensajes de Alerta */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded text-sm text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-200 rounded text-sm text-center">
            {successMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Ej: Juan Pérez"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="********"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-semibold transition duration-200 
              ${loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </span>
            ) : (
              "Registrarme"
            )}
          </button>
        </form>

        {/* Footer del Formulario */}
        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
            Inicia sesión aquí
          </Link>
        </div>

      </div>
    </div>
  );
}