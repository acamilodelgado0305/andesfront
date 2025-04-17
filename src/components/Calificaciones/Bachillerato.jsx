import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, InputNumber, Button, message, Input } from 'antd';
import axios from 'axios';

const { Title } = Typography;
const { Search } = Input;

// Lista de materias (debe coincidir con las usadas en el backend)
const materias = [
  'Matemáticas',
  'Español',
  'Bioquimica',
  'Inglés', 
  'Informatica',
 
];

function Bachillerato() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]); // Estudiantes filtrados por búsqueda
  const [grades, setGrades] = useState({}); // Almacena las notas por estudiante y materia
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Cargar estudiantes y notas desde la API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener estudiantes
        const studentsResponse = await axios.get('https://back.app.validaciondebachillerato.com.co/api/students/bachillerato');
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
    // Redondear a 1 decimal
    const roundedValue = value !== null && value !== undefined ? Math.round(value * 10) / 10 : null;
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

  // Columnas de la tabla
  const columns = [
    {
      title: 'Estudiante',
      dataIndex: 'nombre',
      key: 'nombre',
      fixed: 'left',
      width: 200,
      render: (_, record) => `${record.nombre} ${record.apellido}`,
    },
    ...materias.map((materia) => ({
      title: materia,
      key: materia,
      width: 100, // Reducir ancho de la columna
      render: (_, record) => (
        <InputNumber
          min={0}
          max={100}
          step={0.1} // Permitir un solo decimal
          value={grades[record.id]?.[materia] || null}
          onChange={(value) => handleGradeChange(record.id, materia, value)}
          placeholder="Nota"
          style={{ width: 80 }} // Hacer el campo más pequeño
          formatter={(value) => (value !== null ? Number(value).toFixed(1) : '')} // Mostrar 1 decimal
          parser={(value) => (value ? parseFloat(value) : null)} // Parsear entrada
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
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full shadow-lg">
        <Title level={2}>Boletín - Validación de Bachillerato</Title>
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
          scroll={{ x: 1200 }}
          className="mt-4"
        />
      </Card>
    </div>
  );
}

export default Bachillerato;