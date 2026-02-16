import React, { useEffect, useState } from 'react';
import { Typography, Table, InputNumber, Button, message, Input, Modal, Space, Tag, Tooltip } from 'antd';
import {
  SearchOutlined,
  SaveOutlined,
  UndoOutlined,
  ClearOutlined,
  BookOutlined,
  TeamOutlined,
  ReadOutlined,
  ArrowLeftOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getStudentsByType } from '../../services/student/studentService';
import { getAllGrades, saveGrades } from '../../services/gardes/gradesService';
import { getAllMaterias } from '../../services/materias/serviceMateria';

const { Title, Text } = Typography;
const { Search } = Input;

function CursosTecnicos() {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [initialGradesBackup, setInitialGradesBackup] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentsData, gradesData, allMateriasResponse] = await Promise.all([
          getStudentsByType('tecnicos'),
          getAllGrades(),
          getAllMaterias(),
        ]);

        const tecnicosMaterias = allMateriasResponse
          .filter((m) => m.tipo_programa === 'Tecnicos' && m.activa)
          .map((m) => m.nombre);
        setMaterias(tecnicosMaterias);

        setStudents(studentsData);
        setFilteredStudents(studentsData);
        const initialGrades = {};
        studentsData.forEach((student) => {
          initialGrades[student.id] = {};
          tecnicosMaterias.forEach((materia) => {
            const existingGrade = gradesData.find(
              (grade) => grade.student_id === student.id && grade.materia === materia
            );
            initialGrades[student.id][materia] = existingGrade
              ? parseFloat(existingGrade.nota)
              : null;
          });
        });
        setGrades(initialGrades);
        setInitialGradesBackup(JSON.parse(JSON.stringify(initialGrades)));
      } catch (error) {
        message.error('Error al cargar los datos');
        console.error('Error en fetchData Cursos Técnicos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (value) => {
    setSearchText(value);
    const normalizedSearch = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (!normalizedSearch.trim()) {
      setFilteredStudents(students);
      return;
    }
    const searchTerms = normalizedSearch.split(' ').filter((term) => term);
    const filtered = students.filter((student) => {
      const studentText = `${student.nombre_programa || ''} ${student.nombre} ${student.apellido}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return searchTerms.every((term) => studentText.includes(term));
    });
    setFilteredStudents(filtered);
  };

  const handleGradeChange = (studentId, materia, value) => {
    let numericValue =
      value === '' || value === null || value === undefined ? null : parseFloat(value);
    let roundedValue = null;

    if (numericValue !== null) {
      roundedValue = Math.round(numericValue * 10) / 10;
      if (roundedValue < 0 || roundedValue > 5) {
        message.warn('La nota debe estar entre 0.0 y 5.0.', 2);
        roundedValue =
          grades[studentId]?.[materia] !== undefined ? grades[studentId][materia] : null;
      }
    }

    setGrades((prevGrades) => ({
      ...prevGrades,
      [studentId]: {
        ...prevGrades[studentId],
        [materia]: roundedValue,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveGrades = async () => {
    setLoading(true);
    try {
      const payload = Object.keys(grades).map((studentId) => ({
        studentId: parseInt(studentId),
        programa: 'Tecnicos',
        grades: grades[studentId],
      }));

      await saveGrades(payload);

      message.success('Notas guardadas exitosamente');
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error('Error al guardar las notas');
      console.error(
        'Error en handleSaveGrades Cursos Técnicos:',
        error.response ? error.response.data : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllGradesView = () => {
    Modal.confirm({
      title: 'Establecer todas las notas a 0.0',
      content:
        '¿Está seguro de que desea establecer todas las notas a 0.0 en la vista? Los cambios no se guardarán en el servidor hasta que presione "Guardar Notas".',
      okText: 'Sí, poner en 0.0',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades((prevGrades) => {
          const newGrades = { ...prevGrades };
          students.forEach((student) => {
            newGrades[student.id] = { ...prevGrades[student.id] };
            materias.forEach((materia) => {
              newGrades[student.id][materia] = 0.0;
            });
          });
          return newGrades;
        });
        setHasUnsavedChanges(true);
        message.info(
          'Todas las notas en la vista han sido establecidas a 0.0. Guarde los cambios para aplicarlos.'
        );
      },
    });
  };

  const handleRevertToOriginalGrades = () => {
    Modal.confirm({
      title: 'Revertir cambios a notas originales',
      content:
        '¿Está seguro de que desea revertir todas las notas a los valores cargados originalmente o al último estado guardado? Se perderán los cambios no guardados en la vista.',
      okText: 'Sí, revertir',
      okType: 'default',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(JSON.parse(JSON.stringify(initialGradesBackup)));
        setHasUnsavedChanges(false);
        message.info('Las notas han sido revertidas a los valores originales/guardados.');
      },
    });
  };

  const getGradeStyle = (value) => {
    const base = {
      width: '100%',
      minWidth: 70,
      textAlign: 'right',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
    };
    if (value === null || value === undefined || value === '')
      return { ...base, borderColor: '#e5e7eb' };
    const numericValue = parseFloat(value);
    if (numericValue >= 3.0) {
      return { ...base, backgroundColor: '#ecfdf5', borderColor: '#10b981', color: '#065f46' };
    }
    if (numericValue === 0.0) {
      return { ...base, backgroundColor: '#fafafa', borderColor: '#d1d5db', color: '#6b7280' };
    }
    return { ...base, backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' };
  };

  const columns = [
    {
      title: () => (
        <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
          Estudiante (Programa)
        </span>
      ),
      dataIndex: 'nombre',
      key: 'nombre',
      fixed: 'left',
      width: 280,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1a1a40, #4a69bd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {record.nombre?.[0]}
            {record.apellido?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 13, lineHeight: 1.3 }}>
              {record.nombre} {record.apellido}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {record.nombre_programa || record.programa_nombre || 'N/A'}
            </div>
          </div>
        </div>
      ),
    },
    ...materias.map((materia) => ({
      title: () => (
        <Tooltip title={materia}>
          <span
            style={{
              fontWeight: 600,
              fontSize: 12,
              color: '#4b5563',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: materia.length > 20 ? 160 : 120,
              display: 'inline-block',
            }}
          >
            {materia}
          </span>
        </Tooltip>
      ),
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
            placeholder="—"
            style={getGradeStyle(studentGrade)}
            formatter={(value) =>
              value === '' || value === null || value === undefined
                ? ''
                : parseFloat(value).toFixed(1)
            }
            parser={(value) =>
              value === '' ? null : parseFloat(value.toString().replace(',', '.'))
            }
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
    showTotal: (total) => (
      <span style={{ color: '#6b7280', fontSize: 13 }}>
        Total: <strong>{total}</strong> estudiantes
      </span>
    ),
  };

  const studentColumnWidth = 280;
  const estimatedMateriasWidth = materias.reduce(
    (acc, materia) => acc + (materia.length > 20 ? 180 : 140),
    0
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* ===== Header ===== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f1535 0%, #1a1a40 35%, #2d3a6e 70%, #4a69bd 100%)',
          borderRadius: 20,
          padding: '32px 36px 28px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            top: -50,
            right: -30,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'rgba(74,105,189,0.15)',
            bottom: -25,
            right: 90,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.02)',
            top: 30,
            left: '40%',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Back button */}
          <button
            onClick={() => navigate('/inicio/calificaciones')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              padding: '6px 14px',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 18,
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            <ArrowLeftOutlined /> Volver
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    color: '#fff',
                  }}
                >
                  <ReadOutlined />
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#fff',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    Boletín – Cursos Técnicos
                  </h2>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    Gestión de calificaciones por módulo de formación técnica
                  </p>
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <TeamOutlined style={{ color: '#7c9cff', fontSize: 16 }} />
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#fff',
                      lineHeight: 1.1,
                    }}
                  >
                    {students.length}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.45)',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Estudiantes
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <BookOutlined style={{ color: '#7c9cff', fontSize: 16 }} />
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#fff',
                      lineHeight: 1.1,
                    }}
                  >
                    {materias.length}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.45)',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Materias
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Toolbar ===== */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px 24px',
          marginBottom: 20,
          border: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search
            placeholder="Buscar por estudiante o programa..."
            allowClear
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
            size="large"
          />
          {hasUnsavedChanges && (
            <Tag
              icon={<WarningOutlined />}
              color="warning"
              style={{ borderRadius: 8, padding: '4px 12px', fontSize: 12 }}
            >
              Cambios sin guardar
            </Tag>
          )}
        </div>

        <Space wrap>
          <Button
            icon={<UndoOutlined />}
            onClick={handleRevertToOriginalGrades}
            size="large"
            style={{ borderRadius: 10, fontWeight: 500 }}
          >
            Revertir
          </Button>
          <Button
            icon={<ClearOutlined />}
            type="dashed"
            danger
            onClick={handleResetAllGradesView}
            size="large"
            style={{ borderRadius: 10, fontWeight: 500 }}
          >
            Notas a 0.0
          </Button>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={handleSaveGrades}
            size="large"
            loading={loading}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #1a1a40, #4a69bd)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(26, 26, 64, 0.3)',
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            Guardar Notas
          </Button>
        </Space>
      </div>

      {/* ===== Table ===== */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #f0f0f0',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="id"
          loading={loading}
          pagination={paginationConfig}
          scroll={{ x: studentColumnWidth + estimatedMateriasWidth + 50 }}
          bordered
          size="small"
          style={{ fontSize: 13 }}
        />
      </div>
    </div>
  );
}

export default CursosTecnicos;
