import React, { useState, useEffect } from "react";
import { addStudent, getPrograms } from "../../services/studentService";

const CreateStudentModal = ({ isOpen, onClose }) => {
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
        const data = await getPrograms(); // Asegúrate de que getPrograms() sea la función correcta para obtener los programas
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
      [name]: name === "programaId" || name === "ultimoCursoVisto" ? parseInt(value) : value, // Convertir a entero si el campo es "programaId" o "ultimoCursoVisto"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Verifica el contenido de formData antes de enviar
      console.log("Datos del formulario:", formData);
      const response = await addStudent(formData);
      alert("Estudiante creado exitosamente");
      onClose(); // Cierra el modal
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
              type="text"
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
            <label className="block text-gray-700">Programa ID</label>
            <select
              id="programaId"
              name="programaId"
              value={formData.programaId}
              onChange={handleChange}
              className="w-full p-2 bg-gray-100 rounded border border-gray-300"
              required
            >
              <option value="">Selecciona un programa</option>
              {programas.map((pro) => (
                <option key={pro.id} value={pro.id}>
                  {pro.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Coordinador</label>
            <select
              id="coordinador"
              name="coordinador"
              value={formData.coordinador}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="" disabled>
                Selecciona un coordinador
              </option>
              {coordinadores.map((coordinador) => (
                <option key={coordinador.value} value={coordinador.value}>
                  {coordinador.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Último Curso Visto</label>
            <select
              name="ultimoCursoVisto"
              value={formData.ultimoCursoVisto}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Selecciona un curso</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11">11</option>
            </select>
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
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStudentModal;
