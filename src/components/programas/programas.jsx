import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";

const Students = () => {
  const [programas, setProgramas] = useState([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    const res = await axios.get("https://fevaback.app.la-net.co/api/programs");
    setProgramas(res.data);
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Lista de Estudiantes</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Crear Programa
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
                Descripcion
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {programas.map((program) => (
              <tr key={program.id} className="hover:bg-gray-100">
                <td className="px-6 py-4 border-b">{program.id}</td>
                <td className="px-6 py-4 border-b">{program.nombre}</td>
                <td className="px-6 py-4 border-b">{program.descripcion}</td>
                <td className="px-6 py-4 border-b">{program.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Students;
