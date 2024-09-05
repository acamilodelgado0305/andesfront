import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreateProgramModal from "./addProgram";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";
import { getPrograms, deleteProgram } from "../../services/studentService";
import Swal from 'sweetalert2';

const Students = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programas, setProgramas] = useState([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const data = await getPrograms();
      setProgramas(data);
    } catch (err) {
      console.error("Error fetching programs:", err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Error al cargar los programas',
      });
    }
  };

  const handleProgramAdded = () => {
    fetchPrograms();
  };

  const handleDeleteProgram = async (programId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteProgram(programId);
        if (response.ok) {
          Swal.fire(
            '¡Eliminado!',
            'El programa ha sido eliminado.',
            'success'
          );
          fetchPrograms(); // Actualiza la lista después de eliminar
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        console.error("Error al eliminar el programa:", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar el programa',
        });
      }
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Función para formatear el valor como moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Lista de Estudiantes</h1>
        <button onClick={openModal} 
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Crear Programa
        </button>
        <CreateProgramModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onProgramAdded={handleProgramAdded}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b text-left text-gray-600">ID</th>
              <th className="px-6 py-3 border-b text-left text-gray-600">Nombre</th>
              <th className="px-6 py-3 border-b text-left text-gray-600">Valor</th>
              <th className="px-6 py-3 border-b text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {programas.map((program) => (
              <tr key={program.id} className="hover:bg-gray-100">
                <td className="px-6 py-4 border-b">{program.id}</td>
                <td className="px-6 py-4 border-b">{program.nombre}</td>
                <td className="px-6 py-4 border-b">{formatCurrency(program.valor)}</td>
                <td className="px-6 py-4 border-b">
                  <button 
                    onClick={() => handleDeleteProgram(program.id)}
                    className="text-red-500 hover:text-red-700 mr-2"
                  >
                    <FaTrashAlt />
                  </button>
                  <Link to={`/edit-program/${program.id}`} className="text-blue-500 hover:text-blue-700">
                    <FaUserEdit />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Students;