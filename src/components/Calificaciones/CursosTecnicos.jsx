import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, InputNumber, Button, message, Input, Modal, Space } from 'antd';
import axios from 'axios';

const { Title } = Typography;
const { Search } = Input;

// Lista de materias para cursos técnicos
const materias = [
  'Inglés',
  'Ofimatica',
  'Costos y Presupuestos',
  'Salud Ocupacional',
  'Salud Mental y Desarrollo Lúdico',
  'Diseño',
];

const API_URL = 'https://clasit-backend-api-570877385695.us-central1.run.app/api';

function CursosTecnicos() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [initialGradesBackup, setInitialGradesBackup] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const studentsResponse = await axios.get(`${API_URL}/students/type/tecnicos`);
        const studentsData = studentsResponse.data;
        setStudents(studentsData);
        setFilteredStudents(studentsData);

        const gradesResponse = await axios.get(`${API_URL}/grades`);
        const gradesData = gradesResponse.data;

        const initialGrades = {};
        studentsData.forEach((student) => {
          initialGrades[student.id] = {};
          materias.forEach((materia) => {
            const existingGrade = gradesData.find(
              (grade) => grade.student_id === student.id && grade.materia === materia
            );
            initialGrades[student.id][materia] = existingGrade ? parseFloat(existingGrade.nota) : null;
          });
        });
        setGrades(initialGrades);
        setInitialGradesBackup(JSON.parse(JSON.stringify(initialGrades)));

      } catch (error) {
        message.error('Error al cargar los datos');
        console.error("Error en fetchData Cursos Técnicos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (value) => {
    setSearchText(value);
    const lowercasedValue = value.toLowerCase();
    const filtered = students.filter((student) =>
        (`${student.programa_nombre} ${student.nombre} ${student.apellido}`
            .toLowerCase()
            .includes(lowercasedValue)
        )
    );
    setFilteredStudents(filtered);
  };

  const handleGradeChange = (studentId, materia, value) => {
    let numericValue = value === '' || value === null || value === undefined ? null : parseFloat(value);
    let roundedValue = null;

    if (numericValue !== null) {
        roundedValue = Math.round(numericValue * 10) / 10;
        if (roundedValue < 0 || roundedValue > 5) {
            message.warn('La nota debe estar entre 0.0 y 5.0. Se ha restablecido al valor anterior.', 2);
            roundedValue = grades[studentId]?.[materia] !== undefined ? grades[studentId][materia] : null;
        }
    }

    setGrades((prevGrades) => ({
      ...prevGrades,
      [studentId]: {
        ...prevGrades[studentId],
        [materia]: roundedValue,
      },
    }));
  };

  const handleSaveGrades = async () => {
    setLoading(true);
    try {
      const payload = Object.keys(grades).map((studentId) => ({
        studentId: parseInt(studentId),
        grades: grades[studentId],
      }));

      await axios.post(`${API_URL}/grades`, payload);
      message.success('Notas guardadas exitosamente');
      
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));

    } catch (error) {
      message.error('Error al guardar las notas');
      console.error("Error en handleSaveGrades Cursos Técnicos:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  // Restablecer todas las notas a 0.0 (en la vista)
  const handleResetAllGradesView = () => {
    Modal.confirm({
      title: 'Establecer todas las notas a 0.0',
      content: '¿Está seguro de que desea establecer todas las notas a 0.0 en la vista? Los cambios no se guardarán en el servidor hasta que presione "Guardar Notas".',
      okText: 'Sí, poner en 0.0',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(prevGrades => {
          const newGrades = { ...prevGrades };
          students.forEach(student => {
            newGrades[student.id] = { ...prevGrades[student.id] }; // Copiar notas existentes
            materias.forEach(materia => {
              newGrades[student.id][materia] = 0.0; // Establecer a 0.0
            });
          });
          return newGrades;
        });
        message.info('Todas las notas en la vista han sido establecidas a 0.0. Guarde los cambios para aplicarlos.');
      },
    });
  };
  
  const handleRevertToOriginalGrades = () => {
    Modal.confirm({
      title: 'Revertir cambios a notas originales',
      content: '¿Está seguro de que desea revertir todas las notas a los valores cargados originalmente o al último estado guardado? Se perderán los cambios no guardados en la vista.',
      okText: 'Sí, revertir',
      okType: 'default',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(JSON.parse(JSON.stringify(initialGradesBackup)));
        message.info('Las notas han sido revertidas a los valores originales/guardados.');
      },
    });
  };

  const getInputStyle = (value) => {
    if (value === null || value === undefined || value === '') return { width: '100%', minWidth: 70, textAlign: 'right' };
    const numericValue = parseFloat(value);
    return {
      width: '100%',
      minWidth: 70,
      textAlign: 'right',
      backgroundColor: numericValue >= 3.0 ? '#e6f4ea' : (numericValue === 0.0 ? '#fafafa' : '#fff1f0'),
      borderColor: numericValue >= 3.0 ? '#155153' : (numericValue === 0.0 ? '#d9d9d9' : '#ff4d4f'),
    };
  };

  const columns = [
    {
      title: 'Estudiante (Programa)',
      dataIndex: 'nombre',
      key: 'nombre',
      fixed: 'left',
      width: 280,
      render: (_, record) => (
        <span>
          {record.nombre} {record.apellido}<br />
          <small style={{ color: '#888' }}>({record.programa_nombre || 'N/A'})</small>
        </span>
      ),
    },
    ...materias.map((materia) => ({
      title: materia,
      key: materia,
      width: materia.length > 20 ? 180 : 140,
      align: 'center',
      render: (_, record) => {
        const studentGrade = grades[record.id]?.[materia];
        return (
          <InputNumber
            min={0}
            max={5}
            step={0.1}
            value={studentGrade === null || studentGrade === undefined ? '' : studentGrade}
            onChange={(value) => handleGradeChange(record.id, materia, value)}
            placeholder="0.0-5.0"
            style={getInputStyle(studentGrade)}
            formatter={(value) => {
                if (value === '' || value === null || value === undefined) return '';
                const num = parseFloat(value);
                return isNaN(num) ? '' : num.toFixed(1);
            }}
            parser={(value) => {
                if (value === '') return null;
                const numericString = typeof value === 'string' ? value.replace(',', '.') : value;
                const parsedValue = parseFloat(numericString);
                return isNaN(parsedValue) ? null : Math.round(parsedValue * 10) / 10;
            }}
            onFocus={(e) => e.target.select()}
          />
        );
      },
    })),
  ];

  const paginationConfig = {
    pageSize: 100,
    showSizeChanger: false,
    position: ['topRight', 'bottomRight'],
  };

  const studentColumnWidth = 280;
  const estimatedMateriasWidth = materias.reduce((acc, materia) => acc + (materia.length > 20 ? 180 : 140), 0);

  return (
    <div className="flex justify-start items-start min-h-screen bg-gray-100 p-4">
      <Card className="w-full shadow-lg">
        <Title level={2}>Boletín - Cursos Técnicos</Title>
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <Search
            placeholder="Buscar por estudiante o programa"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => {
              setSearchText(e.target.value);
              handleSearch(e.target.value);
            }}
            value={searchText}
            style={{ width: 300 }}
          />
          <Space wrap>
            <Button onClick={handleRevertToOriginalGrades} size="large">
              Revertir Cambios
            </Button>
            <Button type="dashed" danger onClick={handleResetAllGradesView} size="large">
              Borrar Notas (a 0.0)
            </Button>
            <Button type="primary" onClick={handleSaveGrades} size="large" loading={loading}>
              Guardar Notas
            </Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="id"
          loading={loading}
          pagination={paginationConfig}
          scroll={{ x: studentColumnWidth + estimatedMateriasWidth + 50 }}
          bordered
          className="mt-4"
          size="small"
        />
      </Card>
    </div>
  );
}

export default CursosTecnicos;

