import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaSearch } from "react-icons/fa";
import CreateStudentModal from "./addStudent";
import {
  getStudents,
  deleteStudent,
  getStudentsByCoordinator,
} from "../../services/student/studentService";
import { Input, Button, message } from "antd";

import StudentTable from "./StudentTable";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // 1. Obtener userId y determinar si es admin
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("No userId found in localStorage");
      message.error(
        "ID de usuario no encontrado. Por favor, inicie sesión de nuevo."
      );
      setCurrentUserId(null);
      setIsAdminUser(false);
      return;
    }

    const parsedUserId = parseInt(userId, 10);
    setCurrentUserId(parsedUserId);
    setIsAdminUser(parsedUserId === 3); // ID 3 como admin (ajustable)
  }, []);

  // 2. Cargar estudiantes según rol
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      if (currentUserId === null) {
        setStudents([]);
        return;
      }

      let studentsData;
      if (isAdminUser) {
        studentsData = await getStudents();
      } else {
        studentsData = await getStudentsByCoordinator(currentUserId);
      }

      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err) {
      console.error("Error fetching students:", err);
      message.error("Error al cargar los estudiantes.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isAdminUser]);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchStudents();
    }
  }, [currentUserId, isAdminUser, fetchStudents]);

  // 3. Eliminar estudiante (la confirmación se maneja en la tabla)
  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      message.success("Estudiante eliminado con éxito");
      fetchStudents();
    } catch (error) {
      console.error("Error al eliminar el estudiante:", error);
      message.error("Error al eliminar el estudiante.");
    }
  };

  // 4. Búsqueda global (nombre, documento, WhatsApp, llamadas)
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];

    const term = searchTerm.toLowerCase().trim();
    if (!term) return students;

    const words = term.split(/\s+/);

    return students.filter((student) => {
      const fullName = `${student.nombre || ""} ${
        student.apellido || ""
      }`.toLowerCase();
      const whatsapp =
        (student.telefono_whatsapp && student.telefono_whatsapp.toLowerCase()) ||
        "";
      const llamadas =
        (student.telefono_llamadas && student.telefono_llamadas.toLowerCase()) ||
        "";
      const documento =
        (student.numero_documento &&
          student.numero_documento.toString().toLowerCase()) ||
        "";

      return words.every(
        (w) =>
          fullName.includes(w) ||
          whatsapp.includes(w) ||
          llamadas.includes(w) ||
          documento.includes(w)
      );
    });
  }, [students, searchTerm]);

  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido con éxito");
  };

  return (
    <div className="px-4 mt-8 p-2">
      <div className="my-3 mb-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <Input
            placeholder="Buscar por nombre, documento o WhatsApp..."
            prefix={<FaSearch />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 340 }}
            allowClear
          />
        </div>

        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Agregar Estudiante
        </Button>
      </div>

      <StudentTable
        students={filteredStudents}
        loading={loading}
        onDelete={handleDelete}
      />

      <CreateStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStudentAdded={handleStudentAdded}
      />
    </div>
  );
};

export default Students;
