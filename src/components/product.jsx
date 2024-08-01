import React, { Component } from "react";
import axios from "axios";
import { Link, } from "react-router-dom";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";


export default class Products extends Component {
  state = {
    products: [],
    _id: "",
    nombre: "",
    precio: "",
    cantidad: "",
    
  };

  componentDidMount() {
    this.fetchProducts();
  }

  async fetchProducts() {
    const res = await axios.get("http://localhost:7000/products");
    this.setState({ products: res.data });
  }

  deleteProduct = async (_id) => {
    await axios.delete("http://localhost:7000/products/" + _id);
    this.fetchProducts();
  };

  render() {
    return (
      <div>
        <div className="Buttons">
          <Link to="/productos/nuevo">
            <button type="button" className="btn btn-primary">
              Crear
            </button>
          </Link>
        </div>

        <div className="container">
          <div className="table">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {this.state.products.map((product) => (
                  <tr key={product._id}>
                    <td>{product._id}</td>
                    <td>{product.nombre}</td>
                    <td>{product.precio}</td>
                    <td>{product.cantidad}</td>
                    <td>
                      <button
                        className="delete-user-button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Está seguro de que desea eliminar este producto?"
                            )
                          ) {
                            this.deleteProduct(product._id);
                          }
                        }}
                      >
                        <FaTrashAlt />
                      </button >
                      <button>
                      <Link to={"/productos/editar/" + product._id}>
                        <FaUserEdit />
                      </Link>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}
