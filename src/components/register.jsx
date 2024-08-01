import React, { useState } from "react";
import axios from "axios";
import { useNavigate} from "react-router-dom";

export default function Sigin() {
  const [user, setUser] = useState({
    name: "",
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
    const createUser = { ...user };
    await axios.post("http://localhost:7000/auth/sigin", createUser);

    setUser({
      name: "",
      email: "",
      password: ""
    });

    navigate("/login"); 
  };


  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="sigin">
          <h2>Sigin</h2>
          <div className="from-group">
            <label htmlFor="Nombre">Nombre</label>
            <input
              type="text"
              id="name"
              name="name"
              value={user.name}
              onChange={handleInputChange}
              required
            />
          </div>
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
            Registrar
          </button>
        </div>
      </form>
    </div>
  );
}
