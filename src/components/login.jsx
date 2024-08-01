import React, { useState } from "react";
import axios from "axios";
import { useNavigate} from "react-router-dom";

export default function Login() {
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
      const response = await axios.post("http://localhost:7000/auth/login", {
        email: user.email,
        password: user.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      
      navigate("/home2"); 
  
      console.log('Respuesta del servidor:', response.data);
  
      // Aquí puedes manejar la respuesta del servidor según tu aplicación
  
      // Limpia los campos después de enviar la solicitud
      setUser({
        email: "",
        password: "",
      });
  
    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="sigin">
          <h2>login</h2>
          <div className="from-group">
            <label htmlFor="Correo">Correo</label>
            <input
              type="text"
              id="email"
              name="email"
              value={user.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="from-group">
            <label htmlFor="Password">Contraseña</label>
            <input
              type="text"
              id="password"
              name="password"
              value={user.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Iniciar Seccion
          </button>
        </div>
      </form>
    </div>
  );
}
