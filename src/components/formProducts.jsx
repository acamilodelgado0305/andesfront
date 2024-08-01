import React, { useState, useEffect } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function FormProducts() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState({
    _id: "",
    nombre: "",
    precio: "",
    cantidad: "",
  });

  const handleInputChange = (event) => {
    setProduct({
      ...product,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const updatedProduct = { ...product };

    try {
      if (_id) {
        await axios.put(`http://localhost:7000/products/${_id}`, updatedProduct);
        navigate(-1);
        // Handle success (e.g., show confirmation)
      } else {
        await axios.post('http://localhost:7000/products', updatedProduct);
        navigate(-1);
        // Handle success (e.g., show confirmation)
      }
      // Clear form after submission
      setProduct({
        _id: "",
        nombre: "",
        precio: "",
        cantidad: "",
      });
    } catch (error) {
      
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:7000/products/${_id}`);
        setProduct(response.data);
      } catch (error) {
        // Handle error (e.g., display error message)
      }
    };

    if (_id) {
      fetchProduct();
    }
  }, [_id]);

  return (
    <div className="col4">
      <h2>{_id ? 'Editar Cliente' : 'Agregar Cliente'}</h2>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Datos del cliente</legend>
          <div className="form-group">
            <label htmlFor="id">ID:</label>
            <input
              type="text"
              id="id"
              name="_id"
              value={product._id}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="nombre">Nombre:</label>
            <input
              type="text"
              id="text"
              name="nombre"
              value={product.nombre}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Precio:</label>
            <input
              type="number"
              className="form-control"
              name="precio"
              value={product.precio}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Cantidad:</label>
            <input
              type="number"
              className="form-control"
              name="cantidad"
              value={product.cantidad}
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
