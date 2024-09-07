import React, { useState } from "react";
import Swal from "sweetalert2"; 
import { addProgram } from "../../services/studentService";

const CreateProgramModal = ({ isOpen, onClose, onProgramAdded }) => {

  const apiUrl = import.meta.env.VITE_API_BACKEND;
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    monto: {},
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    Swal.fire({
      title: 'Procesando...',
      text: 'Por favor, espera.',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response = await addProgram(formData); // Utiliza el servicio addProgram

      if (response.ok) {
        Swal.fire({
          title: 'Éxito',
          text: 'Programa creado exitosamente',
          icon: 'success',
          confirmButtonText: 'Cerrar'
        }).then(() => {
          onProgramAdded(); // Llama a la función para actualizar la lista de programas
          onClose(); // Cierra el modal
        });
      } else {
        console.error("Error al agregar el programa:", response.statusText);
        Swal.fire({
          title: 'Error',
          text: 'Hubo un error al crear el programa',
          icon: 'error',
          confirmButtonText: 'Cerrar'
        });
      }
    } catch (error) {
      console.error("Error al agregar el programa:", error);
      Swal.fire({
        title: 'Error',
        text: 'Hubo un error al crear el programa',
        icon: 'error',
        confirmButtonText: 'Cerrar'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center">Crear Nuevo Programa</h2>
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: '90vh' }} // Altura máxima del formulario para que sea responsivo
        >
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Monto</label>
            <input
              type="number"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-2 transition duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200"
            >
              Guardar Programa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProgramModal;
