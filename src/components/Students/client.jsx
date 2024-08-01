import React, { Component } from "react";
import axios from "axios";
import { Link, } from "react-router-dom";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";
import "./students.css"





export default class Clients extends Component {
  
  state = {
    clients: [],
    _id: "",
    nombre: "",
    apellido: "",
    direccion: "",
    telefono: "",
    correo:"",
  };

  componentDidMount() {
    this.fetchClients();
  }



  async fetchClients() {
    const res = await axios.get("http://localhost:7000/student");
    this.setState({ clients: res.data });
  }

  deleteClient = async (_id) => {
    await axios.delete("http://localhost:7000/clients/" + _id);
    // Después de eliminar, volvemos a cargar la lista de clientes
    this.fetchClients();
  };

  render() {
    return (
      <div>
        <div className="Buttons">
          <Link to="/clientes/nuevo">
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
                  <th>Coordinador</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Estado</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                  <th>Fecha Inscripción</th>
                  
                </tr>
              </thead>
              <tbody>
                {this.state.clients.map((client) => (
                  <tr key={client._id}>
                    <td>{client.numeroCedula}</td>
                    <td>{client.coordinador}</td>
                    <td>{client.nombre}</td>
                    <td>{client.apellido}</td>
                    <td>{client.activo}</td>
                    <td>{client.email}</td>
                    <td>{client.telefono}</td>
                    <td>{client.fechaInscripcion}</td>

                    <td>
                      <button
                        className="delete-user-button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Está seguro de que desea eliminar este cliente?"
                            )
                          ) {
                            this.deleteClient(client._id);
                          }
                        }}
                      >
                        <FaTrashAlt />
                      </button >
                      <button>
                      <Link to={"/clientes/editar/" + client._id}>
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
