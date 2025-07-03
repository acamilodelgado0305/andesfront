import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { FaUserEdit, FaSearch, FaFilter } from "react-icons/fa";
// No necesitamos axios directamente aquí para la petición de usuario, pero lo mantenemos por si lo usas en otros lados
import axios from "axios"; 
import CreateStudentModal from "./addStudent";
import { getStudents, deleteStudent, getStudentsByCoordinator } from "../../services/studentService"; 
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
    // Eliminamos coordinatorName si no lo necesitas para mostrarlo
    // o para filtros específicos más allá de la lógica de admin/no-admin.
    // const [coordinatorName, setCoordinatorName] = useState(null); 
    const [currentUserId, setCurrentUserId] = useState(null); 
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState(false); 

    // 1. Obtener solo el userId y determinar el rol de administrador
    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.error("No userId found in localStorage");
            message.error("ID de usuario no encontrado. Por favor, inicie sesión de nuevo.");
            setCurrentUserId(null); // Asegura que el ID sea null si no se encuentra
            setIsAdminUser(false);
            return;
        }

        const parsedUserId = parseInt(userId, 10);
        setCurrentUserId(parsedUserId); // Almacena el ID del usuario como número
        setIsAdminUser(parsedUserId === 3); // Determina si es admin (ID 3)
        
        // Ya no hacemos la petición a /auth/users/${userId} aquí.
        // Si el nombre del coordinador es necesario para algo más que la lógica de admin,
        // tendrías que obtenerlo de otra manera (ej. en el login y guardarlo en un contexto).
    }, []); 

    // 2. Función para cargar estudiantes, memorizada con useCallback
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            let studentsData;
            // Asegurarse de que currentUserId no sea null antes de proceder
            // Esto es crucial porque userId se establece asincrónicamente en el primer useEffect
            if (currentUserId === null) {
                setStudents([]); 
                setLoading(false);
                return;
            }

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
    }, [currentUserId, isAdminUser]); // Dependencias de useCallback

    // 3. Efecto para llamar a fetchStudents cuando cambian currentUserId o isAdminUser
    useEffect(() => {
        // Solo llamar a fetchStudents si currentUserId ya ha sido establecido (no es null)
        if (currentUserId !== null) { 
            fetchStudents();
        }
    }, [currentUserId, isAdminUser, fetchStudents]); 

    const handleEdit = (student) => {
        setSelectedStudent(student);
        setIsDetailModalOpen(true);
    };

    const handleDelete = async (id) => {
        Modal.confirm({
            title: "¿Está seguro de que desea eliminar este estudiante?",
            content: "Esta acción no se puede deshacer.",
            onOk: async () => {
                try {
                    await deleteStudent(id);
                    fetchStudents(); 
                    message.success("Estudiante eliminado con éxito");
                } catch (error) {
                    console.error("Error al eliminar el estudiante:", error);
                    message.error("Error al eliminar el estudiante.");
                }
            },
        });
    };

    // Calcular estadísticas de programas y coordinadores
    const stats = useMemo(() => {
        const programStats = {};
        const coordinatorStats = {};
        
        if (Array.isArray(students)) { 
            students.forEach(student => {
                if (student.programas_asociados && Array.isArray(student.programas_asociados)) {
                    student.programas_asociados.forEach(p => {
                        const programName = p.nombre_programa;
                        if (programName) {
                            programStats[programName] = (programStats[programName] || 0) + 1;
                        }
                    });
                }
                // Si ya no obtienes coordinatorName en una petición separada,
                // asegúrate de que 'coordinador_nombre' venga en los datos de los estudiantes
                const coordinator = student.coordinador_nombre; 
                if (coordinator) {
                    coordinatorStats[coordinator] = (coordinatorStats[coordinator] || 0) + 1;
                }
            });
        }

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
            // El filtro de coordinador solo se muestra si es admin
            isAdminUser && ( 
                <Menu.SubMenu key="coordinador" title="Coordinador">
                    <Menu.Item key="coordinador-todos" onClick={() => setFilters({ ...filters, coordinador: null })}>
                        Todos
                    </Menu.Item>
                    {stats.coordinators.uniqueCoordinators.map(coordinador => (
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
        return "text-blue-600"; 
    };

    const filteredStudents = useMemo(() => {
        if (!Array.isArray(students)) {
            return [];
        }

        return students.filter((student) => {
            const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
            const studentName = student.nombre.toLowerCase();
            const whatsappNumber = student.telefono_whatsapp?.toLowerCase() || '';
            const llamadasNumber = student.telefono_llamadas?.toLowerCase() || '';

            const matchesSearch = searchTerms.every(term =>
                studentName.includes(term) || whatsappNumber.includes(term) || llamadasNumber.includes(term)
            );

            const matchesCoordinator = !filters.coordinador || student.coordinador_nombre === filters.coordinador;

            const matchesProgram = !filters.programa ||
                                   (student.programas_asociados && Array.isArray(student.programas_asociados) &&
                                    student.programas_asociados.some(p => p.nombre_programa === filters.programa));

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
        if (!Array.isArray(filteredStudents)) {
            return { total: 0, validation: 0, technical: 0 };
        }

        const validationStudents = filteredStudents.filter(s =>
            s.programas_asociados && Array.isArray(s.programas_asociados) && 
            s.programas_asociados.some(p => p.nombre_programa === validationProgramName)
        );
        return {
            total: filteredStudents.length,
            validation: validationStudents.length,
            technical: filteredStudents.length - validationStudents.length,
        };
    }, [filteredStudents]);

    return (
        <div className="px-4 mt-8 p-2">
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

                <Button type="primary" onClick={() => setIsModalOpen(true)}>
                    Agregar Estudiante
                </Button>
            </div>

            <StudentTable
                students={filteredStudents}
                loading={loading}
                onDelete={handleDelete}
                onEdit={handleEdit}
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