import React, { useState, useEffect } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function FormClients() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState({
    nombre: "",
    apellido: "",
    direccion: "",
    telefono: "",
    correo: "",
  });

  const handleInputChange = (e) => {
    setClient({
      ...client,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const updatedClient = { ...client };

    try {
      if (_id) {
        await axios.put(`http://localhost:7000/clients/${_id}`, updatedClient);
        navigate(-1);
        // Handle success (e.g., show confirmation)
      } else {
        await axios.post('http://localhost:7000/clients', updatedClient);
        navigate(-1);
        // Handle success (e.g., show confirmation)
      }
      // Clear form after submission
      setClient({
        nombre: "",
        apellido: "",
        direccion: "",
        telefono: "",
        correo: "",
      });
    } catch (error) {
      
    }
  };

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await axios.get(`http://localhost:7000/clients/${_id}`);
        setClient(response.data);
      } catch (error) {
        // Handle error (e.g., display error message)
      }
    };

    if (_id) {
      fetchClient();
    }
  }, [_id]);

  return (
    <div className="col4">
      <h2>{_id ? 'Editar Cliente' : 'Agregar Cliente'}</h2>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Datos del cliente</legend>
          <div className="form-group">
            <label htmlFor="nombre">Nombre:</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={client.nombre}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Apellido:</label>
            <input
              type="text"
              className="form-control"
              name="apellido"
              value={client.apellido}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Direccion:</label>
            <input
              type="number"
              className="form-control"
              name="direccion"
              value={client.direccion}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Telefono:</label>
            <input
              type="text"
              className="form-control"
              name="telefono"
              value={client.telefono}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Correo:</label>
            <input
              type="email"
              className="form-control"
              name="correo"
              value={client.correo}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {_id ? 'Actualizar' : 'Guardar'}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
