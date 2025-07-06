import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, InputNumber, Button, message, Input, Modal, Space } from 'antd';
import axios from 'axios';

const { Title } = Typography;
const { Search } = Input;

// Lista de materias
const materias = [
  'Matemáticas',
  'Español',
  'Bioquímica',
  'Inglés',
  'Informática',
];

function Bachillerato() {
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
        const studentsResponse = await axios.get('https://back.app.validaciondebachillerato.com.co/api/students/type/bachillerato');
        const studentsData = studentsResponse.data;
        setStudents(studentsData);
        setFilteredStudents(studentsData);

        const gradesResponse = await axios.get('https://back.app.validaciondebachillerato.com.co/api/grades');
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
        console.error("Error en fetchData:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = students.filter((student) =>
      `${student.nombre} ${student.apellido}`
        .toLowerCase()
        .includes(value.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  const handleGradeChange = (studentId, materia, value) => {
    let numericValue = value === '' || value === null || value === undefined ? null : parseFloat(value);
    let roundedValue = null;

    if (numericValue !== null) {
      roundedValue = Math.round(numericValue * 10) / 10;
      if (roundedValue < 0 || roundedValue > 5) {
        message.warn('La nota debe estar entre 0.0 y 5.0. Se ha restablecido.', 2);
        roundedValue = grades[studentId]?.[materia] || null;
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
      // El payload ya se construye correctamente con los valores actuales en 'grades'
      // Si 'grades' tiene 0.0, eso es lo que se enviará.
      const payload = Object.keys(grades).map((studentId) => ({
        studentId: parseInt(studentId),
        grades: grades[studentId], // Esto enviará las notas {materia1: 0.0, materia2: 0.0 ...}
      }));

      await axios.post('https://back.app.validaciondebachillerato.com.co/api/grades', payload);
      message.success('Notas guardadas exitosamente');
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));
    } catch (error) {
      message.error('Error al guardar las notas');
      console.error("Error en handleSaveGrades:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  // MODIFICADO: Restablecer todas las notas a 0.0 (en la vista)
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
            newGrades[student.id] = { ...prevGrades[student.id] }; // Copiar notas existentes del estudiante o inicializar si no existe
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
      title: 'Revertir a notas originales',
      content: '¿Está seguro de que desea revertir todas las notas a los valores cargados originalmente desde el servidor? Se perderán los cambios no guardados.',
      okText: 'Sí, revertir',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(JSON.parse(JSON.stringify(initialGradesBackup)));
        message.info('Las notas han sido revertidas a los valores originales cargados.');
      },
    });
  };

  const getInputStyle = (value) => {
    if (value === null || value === undefined || value === '') return { width: 80, textAlign: 'right' };
    const numericValue = parseFloat(value);
    return {
      width: 80,
      textAlign: 'right',
      backgroundColor: numericValue >= 3.0 ? '#e6f4ea' : (numericValue < 0 ? '#fff1f0' : (numericValue === 0.0 ? '#fafafa' : '#fff1f0')), // Color diferente para 0.0 si se desea, o mantener el de reprobado
      borderColor: numericValue >= 3.0 ? '#52c41a' : (numericValue < 0 ? '#ff4d4f' : (numericValue === 0.0 ? '#d9d9d9' : '#ff4d4f')),
    };
  };

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
      width: 110,
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
              if (value === '') return null; // Si se borra el campo, se interpreta como null
              const parsedValue = parseFloat(value);
               // Validar que solo tenga un decimal y redondear si es necesario, o permitir más y que handleGradeChange lo maneje
              // Para este parser, es mejor solo convertir a número o null.
              return isNaN(parsedValue) ? null : parsedValue; // Dejar que handleGradeChange haga el redondeo final y validación
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

  return (
    <div className="flex justify-start items-start min-h-screen bg-gray-100 p-4">
      <Card className="w-full shadow-lg">
        <Title level={2}>Boletín - Validación de Bachillerato</Title>
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <Search
            placeholder="Buscar por nombre o apellido"
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
            {/* El botón sigue llamando a handleResetAllGradesView, que ahora pone 0.0 */}
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
          scroll={{ x: materias.length * 110 + 200 }}
          bordered
          className="mt-4"
          size="small"
        />
      </Card>
    </div>
  );
}

export default Bachillerato;