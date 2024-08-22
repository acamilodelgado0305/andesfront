import React, { useState, useEffect } from "react";
import { addStudent, getPrograms } from "../../services/studentService";

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
        alert("Estudiante creado exitosamente");
        onStudentAdded(); // Llama a la función para actualizar la lista de estudiantes
        onClose(); // Cierra el modal
      } else {
        console.error("Error al agregar el estudiante:", response.statusText);
        alert("Hubo un error al crear el estudiante");
      }
    } catch (error) {
      console.error("Error al agregar el estudiante:", error);
      alert("Hubo un error al crear el estudiante");
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
          <div>
            <label className="block text-gray-700">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Apellido</label>
            <input
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Fecha de Nacimiento</label>
            <input
              type="date"
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Programa</label>
            <select
              name="programaId"
              value={formData.programaId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Seleccione un programa</option>
              {programas.map((programa) => (
                <option key={programa.id} value={programa.id}>
                  {programa.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Coordinador</label>
            <select
              name="coordinador"
              value={formData.coordinador}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Seleccione un coordinador</option>
              {coordinadores.map((coordinador) => (
                <option key={coordinador.value} value={coordinador.value}>
                  {coordinador.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Último Curso Visto</label>
            <input
              type="number"
              name="ultimoCursoVisto"
              value={formData.ultimoCursoVisto}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Número de Cédula</label>
            <input
              type="text"
              name="numeroCedula"
              value={formData.numeroCedula}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Modalidad de Estudio</label>
            <input
              type="text"
              name="modalidadEstudio"
              value={formData.modalidadEstudio}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Fecha de Graduación</label>
            <input
              type="date"
              name="fechaGraduacion"
              value={formData.fechaGraduacion}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
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
