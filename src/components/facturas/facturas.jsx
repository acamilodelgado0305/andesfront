import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";

const Students = () => {
  const [facturas, setFacturas] = useState([]);

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    const res = await axios.get("https://fevaback.app.la-net.co/api/invoices");
    setFacturas(res.data);
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Lista de Facturas</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Crear Factura
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b text-left text-gray-600">ID</th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Nombre
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Fecha
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Monto
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Descripcion
              </th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((factura) => (
              <tr key={factura.id} className="hover:bg-gray-100">
                <td className="px-6 py-4 border-b">{factura.id}</td>
                <td className="px-6 py-4 border-b">{factura.student_id}</td>
                <td className="px-6 py-4 border-b">{factura.fecha}</td>
                <td className="px-6 py-4 border-b">{factura.monto}</td>
                <td className="px-6 py-4 border-b">{factura.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Students;
