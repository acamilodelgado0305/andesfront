import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, InputNumber, Button, message, Input, Modal, Space } from 'antd'; // Agregado Modal y Space
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
  const [initialGradesBackup, setInitialGradesBackup] = useState({}); // Para restablecer a los valores originales cargados

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

        // Inicializar estado de notas
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
        setInitialGradesBackup(JSON.parse(JSON.stringify(initialGrades))); // Copia profunda para el backup

      } catch (error) {
        message.error('Error al cargar los datos');
        console.error("Error en fetchData:", error);
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
    let numericValue = value === '' || value === null || value === undefined ? null : parseFloat(value);
    let roundedValue = null;

    if (numericValue !== null) {
        // Redondear a 1 decimal
        roundedValue = Math.round(numericValue * 10) / 10;
        // Asegurar que la nota esté en el rango 0-5
        if (roundedValue < 0 || roundedValue > 5) {
            message.warn('La nota debe estar entre 0.0 y 5.0. Se ha restablecido.', 2);
            roundedValue = grades[studentId]?.[materia] || null; // Volver al valor anterior o null
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
      const gradesToSave = [];
      Object.keys(grades).forEach(studentId => {
        materias.forEach(materia => {
          const nota = grades[studentId][materia];
          // Solo enviar notas que no son null o que han cambiado respecto al backup (opcional, pero bueno para optimizar)
          // O simplemente enviar todas las que no son null si la API maneja la creación/actualización
          if (nota !== null) { // Opcionalmente podrías añadir: && nota !== initialGradesBackup[studentId]?.[materia]
            gradesToSave.push({
              student_id: parseInt(studentId),
              materia: materia,
              nota: nota,
            });
          } else if (nota === null && initialGradesBackup[studentId]?.[materia] !== null) {
            // Si la nota se borró (era X y ahora es null), también hay que enviarla para que se actualice/borre en el backend
            // Esto depende de cómo tu API maneje el borrado (e.g., enviar null o un endpoint DELETE específico)
            // Asumiendo que enviar null actualiza la nota a null o la borra.
             gradesToSave.push({
              student_id: parseInt(studentId),
              materia: materia,
              nota: null, // o un valor que tu API entienda como "borrar"
            });
          }
        });
      });

      // Lógica de guardado: Deberías hacer un POST para nuevas notas y PUT para actualizar existentes.
      // O si tu API maneja un "upsert" (actualizar o insertar) con POST, está bien.
      // El formato actual `gradesToSave` es una lista de objetos individuales.
      // Si tu API espera `{ studentId: ..., grades: {materia: nota} }`, necesitas ajustar el formato.
      // Basado en tu código original, la API `/api/grades` parece esperar un array de objetos
      // donde cada objeto es una nota individual o un conjunto de notas por estudiante.
      // Tu POST original era: axios.post('.../api/grades', gradesToSaveConFormatoOriginal);
      // El formato de `gradesToSave` que generé arriba es más granular.
      // Ajustemos al formato que tu API probablemente espera (basado en el POST original):
      const payload = Object.keys(grades).map((studentId) => ({
          studentId: parseInt(studentId), // Asegúrate que la API espere studentId y no student_id aquí
          grades: grades[studentId], // Esto envía todas las notas del estudiante, {materia1: nota1, materia2: nota2 ...}
      }));


      await axios.post('https://back.app.validaciondebachillerato.com.co/api/grades', payload);
      message.success('Notas guardadas exitosamente');
      
      // Actualizar el backup después de guardar exitosamente
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));

    } catch (error) {
      message.error('Error al guardar las notas');
      console.error("Error en handleSaveGrades:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  // Restablecer todas las notas a null (en la vista)
  const handleResetAllGradesView = () => {
    Modal.confirm({
      title: 'Restablecer todas las notas',
      content: '¿Está seguro de que desea borrar todas las notas ingresadas en la vista? Los cambios no se guardarán en el servidor hasta que presione "Guardar Notas".',
      okText: 'Sí, restablecer vista',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(prevGrades => {
          const newGrades = { ...prevGrades };
          students.forEach(student => {
            newGrades[student.id] = {};
            materias.forEach(materia => {
              newGrades[student.id][materia] = null;
            });
          });
          return newGrades;
        });
        message.info('Todas las notas en la vista han sido borradas. Guarde los cambios para aplicarlos.');
      },
    });
  };
  
  // Restablecer las notas a los valores originales cargados desde la API
  const handleRevertToOriginalGrades = () => {
    Modal.confirm({
      title: 'Revertir a notas originales',
      content: '¿Está seguro de que desea revertir todas las notas a los valores cargados originalmente desde el servidor? Se perderán los cambios no guardados.',
      okText: 'Sí, revertir',
      okType: 'default', // O 'warning'
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(JSON.parse(JSON.stringify(initialGradesBackup)));
        message.info('Las notas han sido revertidas a los valores originales cargados.');
      },
    });
  };


  // Determinar el color del campo según la nota
  const getInputStyle = (value) => {
    if (value === null || value === undefined || value === '') return { width: 80, textAlign: 'right' };
    const numericValue = parseFloat(value);
    return {
      width: 80,
      textAlign: 'right',
      backgroundColor: numericValue >= 3.0 ? '#e6f4ea' : '#fff1f0',
      borderColor: numericValue >= 3.0 ? '#52c41a' : '#ff4d4f',
    };
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
      width: 110, // Un poco más de ancho para el input
      align: 'center',
      render: (_, record) => {
        const studentGrade = grades[record.id]?.[materia];
        return (
          <InputNumber
            min={0}
            max={5}
            step={0.1}
            value={studentGrade === null || studentGrade === undefined ? '' : studentGrade} // Mostrar vacío si es null
            onChange={(value) => handleGradeChange(record.id, materia, value)}
            placeholder="0.0-5.0"
            style={getInputStyle(studentGrade)}
            formatter={(value) => {
                // Solo formatea si es un número válido
                if (value === '' || value === null || value === undefined) return '';
                const num = parseFloat(value);
                return isNaN(num) ? '' : num.toFixed(1);
            }}
            parser={(value) => {
                // Permite borrar el contenido y que se interprete como null
                if (value === '') return null;
                const parsedValue = parseFloat(value);
                // Solo permite un decimal
                return isNaN(parsedValue) ? null : Math.round(parsedValue * 10) / 10;
            }}
            onFocus={(e) => e.target.select()} // Seleccionar todo el texto al enfocar
          />
        );
      },
    })),
  ];

  // Configuración de paginación
  const paginationConfig = {
    pageSize: 100,
    showSizeChanger: false,
    position: ['topRight', 'bottomRight'],
  };

  return (
    <div className="flex justify-start items-start min-h-screen bg-gray-100 p-4">
      <Card className="w-full shadow-lg">
        <Title level={2}>Boletín - Validación de Bachillerato</Title>
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4"> {/* flex-wrap y gap para responsiveness */}
          <Search
            placeholder="Buscar por nombre o apellido"
            allowClear
            onSearch={handleSearch} // Idealmente, la búsqueda se activa al presionar Enter o el ícono
            onChange={(e) => { // Búsqueda en tiempo real mientras se escribe
              setSearchText(e.target.value); // Actualizar searchText para control
              handleSearch(e.target.value);
            }}
            value={searchText} // Controlar el valor del input
            style={{ width: 300 }}
          />
          <Space wrap> {/* Space para agrupar botones y wrap para responsiveness */}
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
          scroll={{ x: materias.length * 110 + 200 }} // Ajustar scroll dinámicamente
          bordered // Añade bordes para mejor separación visual
          className="mt-4"
          size="small" // Hace la tabla un poco más compacta
        />
      </Card>
    </div>
  );
}

export default Bachillerato;