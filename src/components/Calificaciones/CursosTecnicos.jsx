import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, InputNumber, Button, message, Input, Modal, Space } from 'antd'; // Agregado Modal y Space
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
  const [initialGradesBackup, setInitialGradesBackup] = useState({}); // Para restablecer a los valores originales cargados

  // Cargar estudiantes y notas desde la API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener estudiantes de cursos técnicos
        const studentsResponse = await axios.get('https://clasit-backend-api-570877385695.us-central1.run.app/api/students/type/tecnicos');
        const studentsData = studentsResponse.data;
        setStudents(studentsData);
        setFilteredStudents(studentsData);

        // Obtener notas
        const gradesResponse = await axios.get('https://clasit-backend-api-570877385695.us-central1.run.app/api/grades');
        const gradesData = gradesResponse.data;

        // Inicializar el estado de las notas
        const initialGrades = {};
        studentsData.forEach((student) => {
          initialGrades[student.id] = {};
          materias.forEach((materia) => {
            const existingGrade = gradesData.find(
              (grade) => grade.student_id === student.id && grade.materia === materia
            );
            // Asegurarse de que la nota sea un número o null
            initialGrades[student.id][materia] = existingGrade ? parseFloat(existingGrade.nota) : null;
          });
        });
        setGrades(initialGrades);
        setInitialGradesBackup(JSON.parse(JSON.stringify(initialGrades))); // Copia profunda para el backup

      } catch (error) {
        message.error('Error al cargar los datos');
        console.error("Error en fetchData Cursos Técnicos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Manejar búsqueda
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

  // Manejar cambio de nota
  const handleGradeChange = (studentId, materia, value) => {
    let numericValue = value === '' || value === null || value === undefined ? null : parseFloat(value);
    let roundedValue = null;

    if (numericValue !== null) {
        // Redondear a 1 decimal
        roundedValue = Math.round(numericValue * 10) / 10;
        // Asegurar que la nota esté en el rango 0-5
        if (roundedValue < 0 || roundedValue > 5) {
            message.warn('La nota debe estar entre 0.0 y 5.0. Se ha restablecido al valor anterior.', 2);
            // Revertir al valor anterior válido o null si no hay valor previo para esa celda específica
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

  // Guardar notas
  const handleSaveGrades = async () => {
    setLoading(true);
    try {
      // Formato esperado por la API: [{ studentId: ..., grades: {materia: nota, ...} }, ...]
      const payload = Object.keys(grades).map((studentId) => ({
        studentId: parseInt(studentId),
        grades: grades[studentId],
      }));

      await axios.post('https://clasit-backend-api-570877385695.us-central1.run.app/api/grades', payload);
      message.success('Notas guardadas exitosamente');
      
      // Actualizar el backup después de guardar exitosamente
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));

    } catch (error) {
      message.error('Error al guardar las notas');
      console.error("Error en handleSaveGrades Cursos Técnicos:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  // Restablecer todas las notas a null (en la vista)
  const handleResetAllGradesView = () => {
    Modal.confirm({
      title: 'Restablecer todas las notas en la vista',
      content: '¿Está seguro de que desea borrar todas las notas ingresadas en la vista? Los cambios no se guardarán en el servidor hasta que presione "Guardar Notas".',
      okText: 'Sí, borrar en vista',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(prevGrades => {
          const newGrades = { ...prevGrades }; // Copia de la estructura de estudiantes
          students.forEach(student => { // Iterar sobre todos los estudiantes, no solo los filtrados
            newGrades[student.id] = {}; // Reiniciar notas para este estudiante
            materias.forEach(materia => {
              newGrades[student.id][materia] = null;
            });
          });
          return newGrades;
        });
        message.info('Todas las notas en la vista han sido borradas. Guarde los cambios para aplicarlos en el servidor.');
      },
    });
  };
  
  // Restablecer las notas a los valores originales cargados desde la API o el último guardado
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

  // Determinar el color del campo según la nota
  const getInputStyle = (value) => {
    if (value === null || value === undefined || value === '') return { width: '100%', minWidth: 70, textAlign: 'right' }; // Ancho completo responsivo
    const numericValue = parseFloat(value);
    return {
      width: '100%',
      minWidth: 70,
      textAlign: 'right',
      backgroundColor: numericValue >= 3.0 ? '#e6f4ea' : '#fff1f0',
      borderColor: numericValue >= 3.0 ? '#52c41a' : '#ff4d4f',
    };
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Estudiante (Programa)',
      dataIndex: 'nombre',
      key: 'nombre',
      fixed: 'left',
      width: 280, // Ajustar si es necesario
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
      width: materia.length > 20 ? 180 : 140, // Ancho dinámico para nombres largos de materia
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
                if (value === '') return null; // Permite borrar para poner null
                 // Reemplazar coma por punto para parseo correcto
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

  // Configuración de paginación
  const paginationConfig = {
    pageSize: 100, // Mostrar muchos estudiantes por página
    showSizeChanger: false, // Opcional: permitir cambiar tamaño de página
    // pageSizeOptions: ['50', '100', '200'], // Opciones si showSizeChanger es true
    position: ['topRight', 'bottomRight'],
  };

  const studentColumnWidth = 280;
  const estimatedMateriasWidth = materias.reduce((acc, materia) => acc + (materia.length > 20 ? 180 : 140), 0);


  return (
    <div className="flex justify-start items-start min-h-screen bg-gray-100 p-4"> {/* Padding general */}
      <Card className="w-full shadow-lg">
        <Title level={2}>Boletín - Cursos Técnicos</Title>
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <Search
            placeholder="Buscar por estudiante o programa"
            allowClear
            onSearch={handleSearch} // Búsqueda al presionar Enter o ícono
            onChange={(e) => { // Búsqueda en tiempo real
              setSearchText(e.target.value);
              handleSearch(e.target.value);
            }}
            value={searchText} // Controlar el input
            style={{ width: 300 }}
          />
          <Space wrap> {/* `wrap` permite que los botones pasen a la siguiente línea si no hay espacio */}
            <Button onClick={handleRevertToOriginalGrades} size="large">
              Revertir Cambios
            </Button>
            <Button type="dashed" danger onClick={handleResetAllGradesView} size="large">
              Borrar Notas (Vista)
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
          scroll={{ x: studentColumnWidth + estimatedMateriasWidth + 50 }} // Ajustar scroll X dinámicamente + un poco de margen
          bordered // Bordes para mejor separación
          className="mt-4"
          size="small" // Tabla más compacta
        />
      </Card>
    </div>
  );
}

export default CursosTecnicos;