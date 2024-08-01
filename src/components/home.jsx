import React, { Component, useEffect } from 'react'
import {
  BsFillArchiveFill,
  BsFillGrid3X3GapFill,
  BsPeopleFill,
  BsFillBellFill,
} from "react-icons/bs";
import { AreaChart } from "keep-react";
import {Link} from "react-router-dom";

export default class Home extends Component {
  render() {
    const chartData = [
      {
        name: "1",
        price: 0,
        sell: 0,
      },
      {
        name: "2",
        price: 300,
        sell: 200,
      },
      {
        name: "3",
        price: 170,
        sell: 120,
      },
      {
        name: "4",
        price: 190,
        sell: 130,
      },
      {
        name: "5",
        price: 220,
        sell: 120,
      },
      {
        name: "6",
        price: 400,
        sell: 213,
      },
      {
        name: "7",
        price: 420,
        sell: 325,
      },
      {
        name: "8",
        price: 450,
        sell: 250,
      },
      {
        name: "9",
        price: 400,
        sell: 300,
      },
      {
        name: "10",
        price: 500,
        sell: 400,
      },
    ];
    return (
      <main className="main-container">
      <div className="main-title">
        <h3>DASHBOARD</h3>
      </div>
    
    <div className="Buttons">
          <Link to="/sigin">
            <button type="button" className="btn btn-primary">
              SigIn
            </button>
          </Link>
        </div>

        <div className="Buttons">
          <Link to="/login">
            <button type="button" className="btn btn-primary">
              Login
            </button>
          </Link>
        </div>
      

      <div className="main-cards">
        <div className="card">
          <div className="card-inner">
            <h3>PRODUCTOS</h3>
            <BsFillArchiveFill className="card_icon" />
          </div>
          <h1>300</h1>
        </div>
        <div className="card">
          <div className="card-inner">
            <h3>TRAFICO</h3>
            <BsFillGrid3X3GapFill className="card_icon" />
          </div>
          <h1>12</h1>
        </div>
        <div className="card">
          <div className="card-inner">
            <h3>CLIENTES ACTIVOS</h3>
            <BsPeopleFill className="card_icon" />
          </div>
          <h1>33</h1>
        </div>
        <div className="card">
          <div className="card-inner">
            <h3>ALERTAS</h3>
            <BsFillBellFill className="card_icon" />
          </div>
          <h1>42</h1>
        </div>
      </div>

      <AreaChart
        chartData={chartData}
        dataKey="price"
        secondaryDataKey="sell"
        showTooltip={true}
      />
    </main>
    )
  }
}
