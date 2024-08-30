import React, { useState, useEffect } from "react";
import { addStudent, getPrograms } from "../../services/studentService";
import Swal from "sweetalert2";

const CreateStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
  const [programas, setProgramas] = useState([]);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    fechaNacimiento: "",
    programaId: "",
    coordinador: "",
    ultimoCursoVisto: "",
    numeroCedula: "",
    modalidadEstudio: "",
    fechaGraduacion: "",
  });

  const coordinadores = [
    { value: "Adriana Benitez", label: "Adriana Benitez" },
    { value: "Camilo Delgado", label: "Camilo Delgado" },
    { value: "coordinador3", label: "Coordinador 3" },
  ];

  useEffect(() => {
    const fetchProgramsData = async () => {
      try {
        const data = await getPrograms();
        setProgramas(data);
      } catch (err) {
        console.error("Error fetching Programs:", err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los programas. Por favor, intenta de nuevo.',
        });
      }
    };

    fetchProgramsData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "programaId" || name === "ultimoCursoVisto"
          ? parseInt(value)
          : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const apiUrl = "https://fevaback.app.la-net.co/api/students";
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Estudiante creado exitosamente',
          timer: 1500,
          showConfirmButton: false
        });
        onStudentAdded();
        onClose();
      } else {
        throw new Error(response.statusText);
      }
    } catch (error) {
      console.error("Error al agregar el estudiante:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al crear el estudiante. Por favor, intenta de nuevo.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
      <div className="h-[90%] bg-white p-3 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-2xl font-semibold mb-4">Crear Nuevo Estudiante</h2>
        <form
          onSubmit={handleSubmit}
          className="h-[90%] overflow-y-auto overflow-x-hidden"
        >
          {/* ... (el resto del formulario permanece igual) ... */}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Guardar Estudiante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStudentModal;