import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./auth.css"; // Asegúrate de crear y usar el archivo de estilos adecuado

const LoginModal = ({ isOpen, onClose }) => {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    setUser({
      ...user,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post("https://fevaback.app.la-net.co/auth/login", {
        email: user.email,
        password: user.password,
      });

      if (
        response.status === 200 &&
        response.data.message === "Inicio de sesión exitoso"
      ) {
        console.log("Navigating to /inicio");
        navigate("/inicio");
      } else {
        // Mostrar mensaje de error
        console.error(response.data.error);
      }

      setUser({
        email: "",
        password: "",
      });

      onClose();
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
    }
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          X
        </button>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={user.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={user.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
