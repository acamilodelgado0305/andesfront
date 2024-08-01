import React, { Component } from "react";
import axios from "axios";

export default class NewSale extends Component {
  state = {
    clients: [],
    products: [],
    selectedClient: "",
    selectedProducts: [],
    message: ""
  };

  componentDidMount() {
    this.fetchClients();
    this.fetchProducts();
  }

  async fetchClients() {
    const res = await axios.get("http://localhost:7000/clients");
    this.setState({ clients: res.data });
  }

  async fetchProducts() {
    const res = await axios.get("http://localhost:7000/products");
    this.setState({ products: res.data });
  }

  handleClientChange = (e) => {
    this.setState({ selectedClient: e.target.value });
  };

  handleProductChange = (e) => {
    const productId = e.target.value;
    const { selectedProducts } = this.state;
    const updatedProducts = selectedProducts.includes(productId)
      ? selectedProducts.filter((id) => id !== productId)
      : [...selectedProducts, productId];
    this.setState({ selectedProducts: updatedProducts });
  };

  handleSubmit = async () => {
    const { selectedClient, selectedProducts } = this.state;
    try {
      const res = await axios.post("http://localhost:7000/sales", {
        clientId: selectedClient,
        productIds: selectedProducts
      });
      this.setState({ message: res.data.message });
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  render() {
    const { clients, products, message } = this.state;

    return (
      <div>
        <h2>Nueva Venta</h2>
        <div>
          <label htmlFor="client">Cliente:</label>
          <select id="client" onChange={this.handleClientChange}>
            <option value="">Seleccionar cliente</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.nombre} {client.apellido}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p>Productos:</p>
          {products.map((product) => (
            <div key={product._id}>
              <input
                type="checkbox"
                id={product._id}
                value={product._id}
                onChange={this.handleProductChange}
              />
              <label htmlFor={product._id}>
                {product.nombre} - Precio: {product.precio}
              </label>
            </div>
          ))}
        </div>
        <button onClick={this.handleSubmit}>Crear Venta</button>
        {message && <p>{message}</p>}
        {message && (
          <a href="http://localhost:7000/download/receipt.pdf" download>
            Descargar Recibo de Compra
          </a>
        )}
      </div>
    );
  }
}
