import React, { Component } from "react";
import axios from "axios";
import { Link, } from "react-router-dom";





export default class Homep extends Component {
  
  state = {
    user: [],
  };

  componentDidMount() {
    this.fetchClients();
  }



  async fetchdata() {
    const res = await axios.get("http://localhost:7000/clients");
    this.setState({ user: res.data });
  }


  render() {
    return (
      <div>
        <div className="container">
          <div className="table">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {this.state.clients.map((client) => (
                  <tr key={client._id}>
                    <td>{client._id}</td>
                    <td>{client.nombre}</td>
                    <td>{client.apellido}</td>
                    <td>{client.direccion}</td>
                    <td>{client.telefono}</td>
                    <td>{client.correo}</td>
        
                    
                      
                   
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
