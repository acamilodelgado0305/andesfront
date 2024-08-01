import React, { Component } from 'react'
import { Outlet, Link } from "react-router-dom";
import {
  BsCart,
  BsBarChartFill,
  BsPersonCheckFill,
  BsBox,
  BsPersonXFill,
} from "react-icons/bs";


export default class Root extends Component {
  render() {
    return (
      <>
      <div id="sidebar">
        <h1>Administrador</h1>
        <div></div>
        <nav>
          <ul>
            <li className="sidebar-list-item">
              <Link to="/dashboard" className="sidebar-link">
                <div className="icon-container">
                  <BsBarChartFill className="icon" />
                  <span>Dashboard</span>
                </div>
              </Link>
            </li>
            <li className="sidebar-list-item">
              <Link to="/clientes" className="sidebar-link">
                <div className="icon-container">
                  <BsPersonCheckFill className="icon" />
                  <span>Etudiantes</span>
                </div>
              </Link>
            </li>
            <li className="sidebar-list-item">
              <Link to="/productos" className="sidebar-link">
                <div className="icon-container">
                  <BsBox className="icon" />
                  <span>Facturas</span>
                </div>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div id="detail">
        <Outlet />
      </div>
    </>
    )
  }
}


