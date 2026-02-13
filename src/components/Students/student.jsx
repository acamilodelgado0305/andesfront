import React, { useState, useEffect, useMemo, useCallback, useContext } from "react";
import { FaSearch } from "react-icons/fa";
import { Input, Button, message } from "antd";

// Componentes y Servicios
import CreateStudentModal from "./addStudent";
import StudentTable from "./StudentTable";
import {
  getStudents, // Este servicio ahora es "polimórfico" gracias a tu backend
  deleteStudent
} from "../../services/student/studentService";
import { getOrganizationUsers } from "../../services/organizations/organizationUsersService";
import { AuthContext } from "../../AuthContext";

const Students = () => {
  const { user } = useContext(AuthContext);

  // --- ESTADOS ---
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [organizationUsers, setOrganizationUsers] = useState([]);

  // --- 1. CARGAR ESTUDIANTES (Lógica Simplificada) ---
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      // Llamamos al endpoint genérico. 
      // El Backend lee el Token y decide si devolver todos (Admin/SuperAdmin) o filtrados (User).
      const data = await getStudents();

      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching students:", err);
      message.error("No se pudo cargar la lista de estudiantes.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- CARGAR USUARIOS DE LA ORGANIZACIÓN (para filtro de coordinador) ---
  const fetchOrganizationUsers = useCallback(async () => {
    const orgId = user?.organization?.id;
    if (!orgId) return;
    try {
      const data = await getOrganizationUsers(orgId, { limit: 100 });
      setOrganizationUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching organization users:", err);
    }
  }, [user?.organization?.id]);

  // Cargar al montar el componente
  useEffect(() => {
    fetchStudents();
    fetchOrganizationUsers();
  }, [fetchStudents, fetchOrganizationUsers]);

  // --- 2. ELIMINAR ESTUDIANTE ---
  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      message.success("Estudiante eliminado con éxito");
      // Recargamos la lista para ver los cambios
      fetchStudents();
    } catch (error) {
      console.error("Error al eliminar:", error);
      message.error("No se pudo eliminar el estudiante.");
    }
  };

  // --- 3. BÚSQUEDA EN TIEMPO REAL (Memoizada) ---
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];

    const term = searchTerm.toLowerCase().trim();
    if (!term) return students;

    const words = term.split(/\s+/);

    return students.filter((student) => {
      // Unimos nombre y apellido para buscar completo
      const fullName = `${student.nombre || ""} ${student.apellido || ""}`.toLowerCase();

      const whatsapp = (student.telefono_whatsapp || "").toLowerCase();
      const llamadas = (student.telefono_llamadas || "").toLowerCase();
      const documento = (student.numero_documento || "").toString().toLowerCase();

      // Verifica que TODAS las palabras de búsqueda estén en alguno de los campos
      return words.every(
        (w) =>
          fullName.includes(w) ||
          whatsapp.includes(w) ||
          llamadas.includes(w) ||
          documento.includes(w)
      );
    });
  }, [students, searchTerm]);

  // Callback al crear para refrescar la tabla
  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido correctamente");
  };

  return (
    <div className="px-4 mt-8 p-2">
      {/* Barra de Búsqueda y Botón */}
      <div className="my-3 mb-4 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex space-x-2 w-full md:w-auto">
          <Input
            placeholder="Buscar por nombre, documento o celular..."
            prefix={<FaSearch className="text-gray-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', minWidth: '320px' }}
            allowClear
          />
        </div>

        <Button
          type="primary"
          onClick={() => setIsModalOpen(true)}
          size="large"
        >
          Agregar Estudiante
        </Button>
      </div>

      {/* Tabla de Estudiantes */}
      <StudentTable
        students={filteredStudents}
        loading={loading}
        onDelete={handleDelete}
        organizationUsers={organizationUsers}
      />

      {/* Modal de Creación */}
      <CreateStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStudentAdded={handleStudentAdded}
      />
    </div>
  );
};

export default Students;