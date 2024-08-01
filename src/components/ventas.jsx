import React, { Component } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";

export default class Sales extends Component {
  state = {
    sales: [],
  };

  componentDidMount() {
    this.fetchSales();
  }

  async fetchSales() {
    try {
      const res = await axios.get("http://localhost:7000/sales");
      this.setState({ sales: res.data });
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  }

  deleteSale = async (id) => {
    try {
      await axios.delete(`http://localhost:7000/sales/${id}`);
      this.fetchSales();
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  render() {
    return (
      <div>
        <div className="Buttons">
          <Link to="/ventas/nuevo">
            <button type="button" className="btn btn-primary">
              Crear Venta
            </button>
          </Link>
        </div>

        <div className="container">
          <div className="table">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {this.state.sales.map((sale) => (
                  <tr key={sale._id}>
                    <td>{sale._id}</td>
                    <td>{sale.client.nombre} {sale.client.apellido}</td>
                    <td>
                      <ul>
                        {sale.products.map((product) => (
                          <li key={product._id}>{product.nombre}</li>
                        ))}
                      </ul>
                    </td>
                    <td>{sale.totalPrice}</td>
                    <td>
                      <button
                        className="delete-user-button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Está seguro de que desea eliminar esta venta?"
                            )
                          ) {
                            this.deleteSale(sale._id);
                          }
                        }}
                      >
                        <FaTrashAlt />
                      </button>
                      <button>
                        <Link to={`/sales/editar/${sale._id}`}>
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
