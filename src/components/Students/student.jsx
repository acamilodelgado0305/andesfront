import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaUserEdit, FaSearch, FaFilter } from "react-icons/fa";
import axios from "axios";
import CreateStudentModal from "./addStudent";
import { getStudents, deleteStudent } from "../../services/studentService";
import { Input, Button, Dropdown, Menu, Modal, message } from "antd";

import StudentTable from "./StudentTable";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    coordinador: null,
    programa: null,
    activo: null,
    estado_matricula: null,
  });
  const [coordinatorName, setCoordinatorName] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const fetchUserData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error("No userId found in localStorage");
        return;
      }
      const response = await axios.get(`https://back.app.validaciondebachillerato.com.co/auth/users/${userId}`);
      const { name } = response.data;
      setCoordinatorName(name);
      setIsAdminUser(name === "Adriana Benitez");
    } catch (err) {
      console.error("Error fetching user data:", err);
      message.error("Error al cargar la información del usuario");
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (coordinatorName) {
      fetchStudents();
    }
  }, [coordinatorName]);

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const allStudents = await getStudents();
      if (coordinatorName === "Adriana Benitez") {
        setStudents(allStudents);
      } else {
        const filteredStudents = allStudents.filter(student => student.coordinador === coordinatorName);
        setStudents(filteredStudents);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      message.error("Error al cargar los estudiantes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: "¿Está seguro de que desea eliminar este estudiante?",
      content: "Esta acción no se puede deshacer.",
      onOk: async () => {
        try {
          await deleteStudent(id);
          setStudents(students.filter((student) => student.id !== id));
          message.success("Estudiante eliminado con éxito");
        } catch (error) {
          console.error("Error al eliminar el estudiante:", error);
          message.error("Error al eliminar el estudiante");
        }
      },
    });
  };

  // Calcular estadísticas de programas y coordinadores
  const stats = useMemo(() => {
    const programStats = {};
    const coordinatorStats = {};
    
    students.forEach(student => {
      // Conteo por programa
      const program = student.programa_nombre;
      if (program) {
        programStats[program] = (programStats[program] || 0) + 1;
      }
      // Conteo por coordinador
      const coordinator = student.coordinador;
      if (coordinator) {
        coordinatorStats[coordinator] = (coordinatorStats[coordinator] || 0) + 1;
      }
    });

    return {
      programs: {
        uniquePrograms: Object.keys(programStats).filter(Boolean),
        programCounts: programStats,
      },
      coordinators: {
        uniqueCoordinators: Object.keys(coordinatorStats).filter(Boolean),
        coordinatorCounts: coordinatorStats,
      },
    };
  }, [students]);

  const getFilterMenu = () => {
    const filterItems = [
      isAdminUser && (
        <Menu.SubMenu key="coordinador" title="Coordinador">
          <Menu.Item key="coordinador-todos" onClick={() => setFilters({ ...filters, coordinador: null })}>
            Todos
          </Menu.Item>
          {[
            "Adriana Benitez",
            "Camilo Delgado",
            "Blanca Sanchez",
            "Mauricio Pulido",
            "Marily Gordillo",
            "Jesus Benitez",
          ].map(coordinador => (
            <Menu.Item
              key={`coordinador-${coordinador}`}
              onClick={() => setFilters({ ...filters, coordinador })}
            >
              {`${coordinador} (${stats.coordinators.coordinatorCounts[coordinador] || 0})`}
            </Menu.Item>
          ))}
        </Menu.SubMenu>
      ),
      <Menu.SubMenu key="programa" title="Programa">
        <Menu.Item key="programa-todos" onClick={() => setFilters({ ...filters, programa: null })}>
          Todos
        </Menu.Item>
        {stats.programs.uniquePrograms.map((programa, index) => (
          <Menu.Item
            key={`programa-${index}`}
            onClick={() => setFilters({ ...filters, programa })}
          >
            {`${programa} (${stats.programs.programCounts[programa] || 0})`}
          </Menu.Item>
        ))}
      </Menu.SubMenu>,
      <Menu.SubMenu key="estado" title="Estado">
        <Menu.Item key="estado-todos" onClick={() => setFilters({ ...filters, activo: null })}>
          Todos
        </Menu.Item>
        <Menu.Item key="estado-activo" onClick={() => setFilters({ ...filters, activo: true })}>
          Activo
        </Menu.Item>
        <Menu.Item key="estado-inactivo" onClick={() => setFilters({ ...filters, activo: false })}>
          Inactivo
        </Menu.Item>
      </Menu.SubMenu>,
      <Menu.SubMenu key="estado_matricula" title="Estado Matrícula">
        <Menu.Item key="matricula-todos" onClick={() => setFilters({ ...filters, estado_matricula: null })}>
          Todos
        </Menu.Item>
        <Menu.Item key="matricula-paga" onClick={() => setFilters({ ...filters, estado_matricula: true })}>
          Matrícula Paga
        </Menu.Item>
        <Menu.Item key="matricula-pendiente" onClick={() => setFilters({ ...filters, estado_matricula: false })}>
          Matrícula Pendiente
        </Menu.Item>
      </Menu.SubMenu>,
    ].filter(Boolean);

    return <Menu>{filterItems}</Menu>;
  };

  const getCoordinatorStyle = (coordinator) => {
    if (coordinator === "Camilo Delgado") return "text-orange-600";
    if (coordinator === "Adriana Benitez") return "text-purple-600";
    return "blue-600";
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
      const studentName = student.nombre.toLowerCase();
      const whatsappNumber = student.telefono_whatsapp?.toLowerCase() || '';
      const llamadasNumber = student.telefono_llamadas?.toLowerCase() || '';

      const matchesSearch = searchTerms.every(term =>
        studentName.includes(term) || whatsappNumber.includes(term) || llamadasNumber.includes(term)
      );
      const matchesCoordinator = !filters.coordinador || student.coordinador === filters.coordinador;
      const matchesProgram = !filters.programa || student.programa_nombre === filters.programa;
      const matchesActive = filters.activo === null || Boolean(student.activo) === filters.activo;
      const matchesMatricula = filters.estado_matricula === null || Boolean(student.estado_matricula) === filters.estado_matricula;

      return matchesSearch && (isAdminUser ? matchesCoordinator : true) && matchesProgram && matchesActive && matchesMatricula;
    });
  }, [students, searchTerm, filters, isAdminUser]);

  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido con éxito");
  };

  const programCounts = useMemo(() => {
    const validationProgramName = "Validación de bachillerato";
    const validationStudents = filteredStudents.filter(s => s.programa_nombre === validationProgramName);
    return {
      total: filteredStudents.length,
      validation: validationStudents.length,
      technical: filteredStudents.length - validationStudents.length,
    };
  }, [filteredStudents]);

  return (
    <div className="px-4 mt-8 p-2">
      <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded shadow">
        <div className="text-center">
          <p className="text-2xl font-bold">{filteredStudents.length}</p>
          <p>Total Estudiantes</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{programCounts.validation}</p>
          <p>Validación de Bachillerato</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{programCounts.technical}</p>
          <p>Técnicos</p>
        </div>
      </div>
      {filters.programa && (
        <div className="mt-4 text-blue-700">
          Programa seleccionado: {filters.programa} ({filteredStudents.length} estudiantes)
        </div>
      )}
      {filters.coordinador && (
        <div className="mt-2 text-blue-700">
          Coordinador seleccionado: {filters.coordinador} ({filteredStudents.length} estudiantes)
        </div>
      )}
      <div className="my-3 mb-4 flex justify-between items-center">
  {/* Grupo de búsqueda y filtro */}
  <div className="flex space-x-2">
    <Input
      placeholder="Buscar por nombre o WhatsApp..."
      prefix={<FaSearch />}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{ width: 300 }}
      allowClear
    />
    <Dropdown overlay={getFilterMenu()} trigger={["click"]}>
      <Button icon={<FaFilter />}>Filtrar</Button>
    </Dropdown>
  </div>

  {/* Botón a la derecha */}
  <Button type="primary" onClick={() => setIsModalOpen(true)}>
    Agregar Estudiante
  </Button>
</div>

      <StudentTable
        students={filteredStudents}
        loading={loading}
        onDelete={handleDelete}
        onEdit={handleEdit}
        fetchStudents={fetchStudents}
        getCoordinatorStyle={getCoordinatorStyle}
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