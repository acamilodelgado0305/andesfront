import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaTrashAlt,
  FaUserEdit,
  FaSearch,
  FaFilter,
  FaDownload,
  FaWhatsapp,
} from "react-icons/fa";
import axios from "axios";
import CreateStudentModal from "./addStudent";
import {
  getStudents,
  deleteStudent,
  getPrograms,
} from "../../services/studentService";
import { Table, Input, Button, Dropdown, Menu, Modal, message } from "antd";
import { CSVLink } from "react-csv";
import StudentDetailModal from './StudentDetailModal';

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


  useEffect(() => {
    if (coordinatorName) {
      fetchStudents();
    }
  }, [coordinatorName]);


  useEffect(() => {
    if (coordinatorName) {
      fetchStudents();
    }
  }, [coordinatorName]);

  const fetchPrograms = async () => {
    try {
      const data = await getPrograms();
      setProgramas(data);
      console.log(data)
    } catch (err) {
      console.error("Error fetching programs:", err);
      message.error("Error al cargar los programas");
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
      message.error("Error al cargar los estudiantes");
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

  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido con éxito");
  };

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
      // Normaliza el término de búsqueda y lo divide en palabras
      const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);

      // Normaliza el nombre del estudiante y el teléfono de WhatsApp
      const studentName = student.nombre.toLowerCase();
      const whatsappNumber = student.telefono_whatsapp?.toLowerCase() || '';

      // Verifica si todos los términos de búsqueda están contenidos en el nombre o en el teléfono
      const matchesSearch = searchTerms.every(term =>
        studentName.includes(term) || whatsappNumber.includes(term)
      );

      // Verificación de filtros con manejo explícito de booleanos
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

  useEffect(() => {
    console.log('Current filters:', filters);
    console.log('Filtered students:', filteredStudents);
  }, [filters, filteredStudents]);





  const handleRowClick = (record) => {
    setSelectedStudent(record);
    setIsDetailModalOpen(true);
  };

  const handleGraduate = async (studentId) => {

    await fetchStudents();
  };


  const handleStudentUpdated = (updatedStudent) => {
    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.id === updatedStudent.id ? updatedStudent : student
      )
    );
  };

  const columns = [
    {
      title: "Documento",
      key: "documento",
      render: (_, record) => (
        <span>
          {record.tipo_documento} {record.numero_documento || 'No especificado'}
        </span>
      ),
    },
    {
      title: "Coordinador",
      dataIndex: "coordinador",
      key: "coordinador",
      render: (text) => (
        <span className={getCoordinatorStyle(text)}>{text}</span>
      ),
    },
    {
      title: "Nombre Completo",
      key: "nombre_completo",
      render: (_, record) => (
        <span>{record.nombre}</span>
      ),
    },
    {
      title: "Estado",
      key: "estados",
      render: (_, record) => (
        <div className="space-y-1">
          <div>
            <span className={`px-2 py-1 rounded-full text-sm ${record.activo ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
              }`}>
              {record.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div>
            <span className={`px-2 py-1 rounded-full text-sm ${record.estado_matricula ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"
              }`}>
              {record.estado_matricula ? "Matrícula Paga" : "Matrícula Pendiente"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Programa",
      dataIndex: "programa_id",
      key: "programa_id",
      render: (programId) => getProgramName(programId),
    },
    {
      title: "Contacto",
      key: "contacto",
      render: (_, record) => (
        <div className="space-y-1">
          <div>{record.email || 'No especificado'}</div>
          <div>
            Llamadas: {record.telefono_llamadas || 'No especificado'}
          </div>
          <div>
            WhatsApp: {record.telefono_whatsapp || 'No especificado'}
          </div>
        </div>
      ),
    },
    {
      title: "Fechas",
      key: "fechas",
      render: (_, record) => (
        <div className="space-y-1">
          <div>
            <span className="font-medium">Inscripción:</span>{' '}
            {record.fecha_inscripcion ? new Date(record.fecha_inscripcion).toLocaleDateString() : 'No especificado'}
          </div>
          {record.fecha_graduacion && (
            <div>
              <span className="font-medium">Graduación:</span>{' '}
              {new Date(record.fecha_graduacion).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Pagos",
      key: "facturas",
      render: (_, record) => (
        <Link
          to={`/inicio/students/facturas/${record.id}`}
          className="text-blue-500 hover:text-blue-700"
        >
          Ver Pagos
        </Link>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => (
        <div className="flex space-x-2">
          <Button
            icon={<FaTrashAlt />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            danger
          />

          <Button
            icon={<FaWhatsapp />}
            type="default"
            onClick={(e) => {
              e.stopPropagation();
              let phoneNumber = record.telefono_whatsapp?.replace(/\D/g, "") ||
                record.telefono_llamadas?.replace(/\D/g, "");

              if (!phoneNumber) {
                message.error("No hay número de teléfono disponible");
                return;
              }

              if (!phoneNumber.startsWith("57")) {
                phoneNumber = `57${phoneNumber}`;
              }

              window.open(`https://wa.me/${phoneNumber}`, "_blank");
            }}
          >
            WhatsApp
          </Button>
        </div>
      ),
    },
  ];

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
          placeholder="Buscar por nombre o WhatsApp..."  // Updated placeholder
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

      <Table
        columns={columns}
        dataSource={filteredStudents}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' }  // Changes cursor to pointer on hover
        })}
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
        onGraduate={handleGraduate}
        fetchStudents={fetchStudents}  // Explicitly pass the function
        getCoordinatorStyle={getCoordinatorStyle}
        getProgramName={getProgramName}
      />
    </div>
  );
};

export default Students;
