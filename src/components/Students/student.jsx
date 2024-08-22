import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaTrashAlt, FaUserEdit } from "react-icons/fa";
import CreateStudentModal from "./addStudent";
import { getStudents, deleteStudent } from "../../services/studentService";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      const updatedStudents = students.filter((student) => student.id !== id);
      setStudents(updatedStudents);
    } catch (error) {
      console.error("Error al eliminar el estudiante:", error);
    }
  };

  const handleStudentAdded = () => {
    fetchStudents(); // Actualiza la lista de estudiantes después de agregar uno nuevo
  };

  const getCoordinatorStyle = (coordinator) => {
    if (coordinator === "Camilo Delgado") {
      return "underline text-orange-600";
    } else if (coordinator === "Adriana Benitez") {
      return "underline text-red-600";
    }
    return "";
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Lista de Estudiantes</h1>
        <button
          onClick={openModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Crear Estudiante
        </button>
        <CreateStudentModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onStudentAdded={handleStudentAdded}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b text-left text-gray-600">ID</th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Coordinador
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Nombre
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Apellido
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Estado
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Email
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Teléfono
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Fecha de Graduación
              </th>
              <th className="px-6 py-3 border-b text-left text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-100">
                <td className="px-6 py-4 border-b">{student.numero_cedula}</td>
                <td
                  className={`px-6 py-4 border-b ${getCoordinatorStyle(student.coordinador)}`}
                >
                  {student.coordinador}
                </td>
                <td className="px-6 py-4 border-b">{student.nombre}</td>
                <td className="px-6 py-4 border-b">{student.apellido}</td>
                <td className="px-6 py-4 border-b">
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      student.activo
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {student.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 border-b">{student.email}</td>
                <td className="px-6 py-4 border-b">{student.telefono}</td>
                <td className="px-6 py-4 border-b">
                  {student.fecha_graduacion}
                </td>
                <td className="px-6 py-4 border-b flex space-x-2">
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Está seguro de que desea eliminar este estudiante?"
                        )
                      ) {
                        handleDelete(student.id);
                      }
                    }}
                  >
                    <FaTrashAlt />
                  </button>
                  <Link
                    to={`/clientes/editar/${student.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
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
