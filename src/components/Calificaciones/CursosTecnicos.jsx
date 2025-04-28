import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, InputNumber, Button, message, Input } from 'antd';
import axios from 'axios';

const { Title } = Typography;
const { Search } = Input;

// Lista de materias para cursos técnicos
const materias = [
  'Inglés',
  'Cloud Computing',
  'Costos y Presupuestos',
  'Salud Ocupacional',
  'Salud Mental y Desarrollo Lúdico',
  'Bases de Datos',
];

function CursosTecnicos() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Cargar estudiantes y notas desde la API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener estudiantes de cursos técnicos
        const studentsResponse = await axios.get('https://back.app.validaciondebachillerato.com.co/api/students/cursos-tecnicos');
        const studentsData = studentsResponse.data;
        setStudents(studentsData);
        setFilteredStudents(studentsData);

        // Obtener notas
        const gradesResponse = await axios.get('https://back.app.validaciondebachillerato.com.co/api/grades');
        const gradesData = gradesResponse.data;

        // Inicializar el estado de las notas
        const initialGrades = {};
        studentsData.forEach((student) => {
          initialGrades[student.id] = {};
          materias.forEach((materia) => {
            const existingGrade = gradesData.find(
              (grade) => grade.student_id === student.id && grade.materia === materia
            );
            initialGrades[student.id][materia] = existingGrade ? existingGrade.nota : null;
          });
        });
        setGrades(initialGrades);
      } catch (error) {
        message.error('Error al cargar los datos');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Manejar búsqueda
  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = students.filter((student) =>
      `${student.nombre} ${student.apellido}`
        .toLowerCase()
        .includes(value.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  // Manejar cambio de nota
  const handleGradeChange = (studentId, materia, value) => {
    // Validar y redondear a 1 decimal
    let roundedValue = value !== null && value !== undefined ? Math.round(value * 10) / 10 : null;
    // Asegurar que la nota esté en el rango 0-5
    if (roundedValue !== null && (roundedValue < 0 || roundedValue > 5)) {
      roundedValue = null; // Resetear si está fuera de rango
    }
    setGrades((prevGrades) => ({
      ...prevGrades,
      [studentId]: {
        ...prevGrades[studentId],
        [materia]: roundedValue,
      },
    }));
  };

  // Guardar notas
  const handleSaveGrades = async () => {
    try {
      const gradesToSave = Object.keys(grades).map((studentId) => ({
        studentId: parseInt(studentId),
        grades: grades[studentId],
      }));

      await axios.post('https://back.app.validaciondebachillerato.com.co/api/grades', gradesToSave);
      message.success('Notas guardadas exitosamente');
    } catch (error) {
      message.error('Error al guardar las notas');
      console.error(error);
    }
  };

  // Determinar el color del campo según la nota
  const getInputStyle = (value) => {
    if (value === null || value === undefined) return { width: 80 };
    return {
      width: 80,
      backgroundColor: value >= 3.0 ? '#e6f4ea' : '#fff1f0', // Verde claro para ≥3.0, rojo claro para <3.0
      borderColor: value >= 3.0 ? '#52c41a' : '#ff4d4f',
    };
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Estudiante',
      dataIndex: 'nombre',
      key: 'nombre',
      fixed: 'left',
      width: 300, // Aumentar el ancho para acomodar el programa
      render: (_, record) => (
        <span>
          <strong>{record.programa_nombre}</strong> - {record.nombre} {record.apellido}
        </span>
      ),
    },
    ...materias.map((materia) => ({
      title: materia,
      key: materia,
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={5}
          step={0.1}
          value={grades[record.id]?.[materia] || null}
          onChange={(value) => handleGradeChange(record.id, materia, value)}
          placeholder="0.0-5.0"
          style={getInputStyle(grades[record.id]?.[materia])}
          formatter={(value) => (value !== null ? Number(value).toFixed(1) : '')}
          parser={(value) => (value ? parseFloat(value) : null)}
        />
      ),
    })),
  ];

  // Configuración de paginación
  const paginationConfig = {
    pageSize: 100,
    showSizeChanger: false,
    position: ['topRight', 'bottomRight'],
  };

  return (
    <div className="flex justify-start items-start min-h-screen bg-gray-100">
      <Card className="w-full shadow-lg">
        <Title level={2}>Boletín - Cursos Técnicos</Title>
        <div className="flex justify-between mb-4">
          <Search
            placeholder="Buscar por nombre o apellido"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
          />
          <Button type="primary" onClick={handleSaveGrades} size="large">
            Guardar Notas
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="id"
          loading={loading}
          pagination={paginationConfig}
          scroll={{ x: 1400 }}
          className="mt-4"
        />
      </Card>
    </div>
  );
}

export default CursosTecnicos;