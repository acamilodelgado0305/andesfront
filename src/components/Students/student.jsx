import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaUserEdit,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import axios from "axios";
import CreateStudentModal from "./addStudent";
import {
  getStudents,
  deleteStudent,
  getPrograms,
} from "../../services/studentService";
import { Input, Button, Dropdown, Menu, Modal, message } from "antd";
import StudentDetailModal from './StudentDetailModal';
import StudentTable from "./StudentTable";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programas, setProgramas] = useState([]);
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
      setFilters(prev => ({ ...prev, coordinador: name }));
    } catch (err) {
      console.error("Error fetching user data:", err);
      message.error("Error al cargar la información del usuario");
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchStudents();
    fetchUserData();
  }, []);

  const fetchPrograms = async () => {
    try {
      const data = await getPrograms();
      setProgramas(data);
    } catch (err) {
      console.error("Error fetching programs:", err);
      message.error("Error al cargar los programas");
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data);
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

  const filterMenu = (
    <Menu>
      <Menu.SubMenu key="coordinador" title="Coordinador">
        <Menu.Item
          key="coordinador-todos"
          onClick={() => setFilters({ ...filters, coordinador: null })}
        >
          Todos
        </Menu.Item>
        <Menu.Item
          key="coordinador-camilo"
          onClick={() =>
            setFilters({ ...filters, coordinador: "Camilo Delgado" })
          }
        >
          Camilo Delgado
        </Menu.Item>
        <Menu.Item
          key="coordinador-adriana"
          onClick={() =>
            setFilters({ ...filters, coordinador: "Adriana Benitez" })
          }
        >
          Adriana Benitez
        </Menu.Item>
        <Menu.Item
          key="coordinador-blanca"
          onClick={() =>
            setFilters({ ...filters, coordinador: "Blanca Sanchez" })
          }
        >
          Blanca Sanchez
        </Menu.Item>
        <Menu.Item
          key="coordinador-mauricio"
          onClick={() =>
            setFilters({ ...filters, coordinador: "Mauricio Pulido" })
          }
        >
          Mauricio Pulido
        </Menu.Item>
      </Menu.SubMenu>
      <Menu.SubMenu key="programa" title="Programa">
        <Menu.Item
          key="programa-todos"
          onClick={() => setFilters({ ...filters, programa: null })}
        >
          Todos
        </Menu.Item>
        {programas.map((programa) => (
          <Menu.Item
            key={`programa-${programa.id}`}
            onClick={() => setFilters({ ...filters, programa: programa.id })}
          >
            {programa.nombre}
          </Menu.Item>
        ))}
      </Menu.SubMenu>
      <Menu.SubMenu key="estado" title="Estado">
        <Menu.Item
          key="estado-todos"
          onClick={() => setFilters({ ...filters, activo: null })}
        >
          Todos
        </Menu.Item>
        <Menu.Item
          key="estado-activo"
          onClick={() => setFilters({ ...filters, activo: true })}
        >
          Activo
        </Menu.Item>
        <Menu.Item
          key="estado-inactivo"
          onClick={() => setFilters({ ...filters, activo: false })}
        >
          Inactivo
        </Menu.Item>
      </Menu.SubMenu>
      <Menu.SubMenu key="estado_matricula" title="Estado Matrícula">
        <Menu.Item
          key="matricula-todos"
          onClick={() => {
            console.log("Setting estado_matricula to null");
            setFilters({ ...filters, estado_matricula: null });
          }}
        >
          Todos
        </Menu.Item>
        <Menu.Item
          key="matricula-paga"
          onClick={() => {
            console.log("Setting estado_matricula to true");
            setFilters({ ...filters, estado_matricula: true });
          }}
        >
          Matrícula Paga
        </Menu.Item>
        <Menu.Item
          key="matricula-pendiente"
          onClick={() => {
            console.log("Setting estado_matricula to false");
            setFilters({ ...filters, estado_matricula: false });
          }}
        >
          Matrícula Pendiente
        </Menu.Item>
      </Menu.SubMenu>
    </Menu>
  );


  const getCoordinatorStyle = (coordinator) => {
    if (coordinator === "Camilo Delgado") {
      return "text-orange-600";
    } else if (coordinator === "Adriana Benitez") {
      return "text-blue-600";
    }
    return "";
  };

  const getProgramName = (programId) => {
    const program = programas.find((p) => p.id === programId);
    return program ? program.nombre : "Programa no encontrado";
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
      const studentName = student.nombre.toLowerCase();
      const whatsappNumber = student.telefono_whatsapp?.toLowerCase() || '';
      const llamadasNumber = student.telefono_llamadas?.toLowerCase() || '';

      const matchesSearch = searchTerms.every(term =>
        studentName.includes(term) || whatsappNumber.includes(term)|| llamadasNumber.includes(term)
      );

      const matchesCoordinator = !filters.coordinador || student.coordinador === filters.coordinador;
      const matchesProgram = !filters.programa || student.programa_id === filters.programa;
      const matchesActive = filters.activo === null || Boolean(student.activo) === filters.activo;
      const matchesMatricula = filters.estado_matricula === null ||
        Boolean(student.estado_matricula) === filters.estado_matricula;

      return matchesSearch &&
        matchesCoordinator &&
        matchesProgram &&
        matchesActive &&
        matchesMatricula;
    });
  }, [students, searchTerm, filters]);

  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido con éxito");
  };

  return (
    <div className="mx-auto mt-8 p-2">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Gestión de Estudiantes</h1>
        <div className="space-x-2">
          <Button
            onClick={() => setIsModalOpen(true)}
            type="primary"
            icon={<FaUserEdit />}
          >
            Crear Estudiante
          </Button>
        </div>
      </div>

      <div className="mb-4 flex space-x-2">
        <Input
          placeholder="Buscar por nombre o WhatsApp..."
          prefix={<FaSearch />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Dropdown overlay={filterMenu} trigger={["click"]}>
          <Button icon={<FaFilter />}>Filtrar</Button>
        </Dropdown>
      </div>

      <StudentTable
        students={filteredStudents}
        loading={loading}
        onDelete={handleDelete}
        getProgramName={getProgramName}
        getCoordinatorStyle={getCoordinatorStyle}
      />

      <CreateStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStudentAdded={handleStudentAdded}
      />

      <StudentDetailModal
        student={selectedStudent}
        visible={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        fetchStudents={fetchStudents}
        getCoordinatorStyle={getCoordinatorStyle}
        getProgramName={getProgramName}
      />
    </div>
  );
};

export default Students;