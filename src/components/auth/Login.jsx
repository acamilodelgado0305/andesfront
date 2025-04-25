import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import { Button, Input } from 'antd';
import { login } from "../../services/studentService";
import Swal from "sweetalert2";
import loginimage from "../../../images/sixNyx.jpg";

const { Password } = Input;

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { login: contextLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await login(formData.email, formData.password);
      
      if (response.message === "Inicio de sesión exitoso" && response.token) {
        contextLogin(response.token);
        
        Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text: "Has iniciado sesión correctamente",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => navigate("/inicio"));
        
      } else {
        throw new Error("Credenciales inválidas");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Correo o contraseña incorrectos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid ">
      {/* Columna de imagen con overlay */}
    

      {/* Columna de formulario */}
      <div className="flex items-center justify-center p">
        <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-xl">
        <h2 className="text-xl font-semibold mb-2 text-start text-gray-300">
            Classuite
          </h2>

          <h2 className="text-3xl font-bold mb-6 text-start text-purple-800">
            Iniciar Sesión
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-purple-700 mb-2">Correo Electrónico</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="ejemplo@correo.com"
                className="w-full rounded-lg border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                size="large"
              />
            </div>

            <div className="mb-4">
              <label className="block text-purple-700 mb-2">Contraseña</label>
              <Password
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="********"
                className="w-full rounded-lg border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                size="large"
                visibilityToggle={{
                  visible: false,
                  onVisibleChange: () => {}
                }}
              />
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              style={{ height: '48px' }}
            >
              {isLoading ? "Iniciando..." : "Iniciar Sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;