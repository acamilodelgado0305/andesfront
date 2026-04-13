import React, { useEffect, useState, useCallback } from 'react';
import {
  Typography, Table, InputNumber, Button, message,
  Input, Modal, Space, Spin, Tag, Tooltip, Empty,
} from 'antd';
import {
  SearchOutlined,
  SaveOutlined,
  UndoOutlined,
  ClearOutlined,
  TrophyOutlined,
  TeamOutlined,
  BookOutlined,
  ArrowLeftOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getGradesByPrograma, saveGrades } from '../../services/gardes/gradesService';
import { getMateriasByPrograma } from '../../services/materias/serviceMateria';

const { Search } = Input;

function CalificacionesPrograma() {
  const navigate = useNavigate();
  const { programaId } = useParams();

  const [programa, setPrograma] = useState(null);
  const [materias, setMaterias] = useState([]);   // nombres de materias activas
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [initialGradesBackup, setInitialGradesBackup] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ programa: prog, students: studs, grades: gradesData }, materiasData] = await Promise.all([
        getGradesByPrograma(programaId),
        getMateriasByPrograma(programaId),
      ]);

      setPrograma(prog);

      // Solo materias activas del programa
      const materiasActivas = (materiasData || [])
        .filter((m) => m.activa !== false)
        .map((m) => m.nombre);
      setMaterias(materiasActivas);

      setStudents(studs || []);
      setFilteredStudents(studs || []);

      // Construir mapa de calificaciones
      const gradeMap = {};
      (studs || []).forEach((s) => {
        gradeMap[s.id] = {};
        materiasActivas.forEach((materia) => {
          const found = (gradesData || []).find(
            (g) => g.student_id === s.id && g.materia === materia
          );
          gradeMap[s.id][materia] = found ? parseFloat(found.nota) : null;
        });
      });
      setGrades(gradeMap);
      setInitialGradesBackup(JSON.parse(JSON.stringify(gradeMap)));
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error('Error al cargar los datos del programa');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [programaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (value) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredStudents(students);
      return;
    }
    const q = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const terms = q.split(' ').filter(Boolean);
    setFilteredStudents(
      students.filter((s) => {
        const text = `${s.nombre} ${s.apellido} ${s.numero_documento || ''}`
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return terms.every((t) => text.includes(t));
      })
    );
  };

  const handleGradeChange = (studentId, materia, value) => {
    let val = value === '' || value === null || value === undefined ? null : parseFloat(value);
    if (val !== null) {
      val = Math.round(val * 10) / 10;
      if (val < 0 || val > 5) {
        message.warning('La nota debe estar entre 0.0 y 5.0.', 2);
        val = grades[studentId]?.[materia] ?? null;
      }
    }
    setGrades((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [materia]: val } }));
    setHasUnsavedChanges(true);
  };

  const handleSaveGrades = async () => {
    if (!programa) return;
    setLoading(true);
    try {
      const payload = Object.keys(grades).map((studentId) => ({
        studentId: parseInt(studentId),
        programa: programa.nombre,
        grades: grades[studentId],
      }));
      await saveGrades(payload);
      message.success('Notas guardadas exitosamente');
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error('Error al guardar las notas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertGrades = () => {
    Modal.confirm({
      title: 'Revertir a notas originales',
      content: '¿Revertir todas las notas a los valores cargados del servidor? Se perderán los cambios no guardados.',
      okText: 'Sí, revertir',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(JSON.parse(JSON.stringify(initialGradesBackup)));
        setHasUnsavedChanges(false);
        message.info('Notas revertidas a los valores originales.');
      },
    });
  };

  const handleResetGrades = () => {
    Modal.confirm({
      title: 'Establecer todas las notas a 0.0',
      content: 'Los cambios no se guardarán hasta que presione "Guardar Notas".',
      okText: 'Sí, poner en 0.0',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades((prev) => {
          const next = { ...prev };
          students.forEach((s) => {
            next[s.id] = { ...prev[s.id] };
            materias.forEach((m) => { next[s.id][m] = 0.0; });
          });
          return next;
        });
        setHasUnsavedChanges(true);
      },
    });
  };

  const getGradeStyle = (value) => {
    const base = { width: 80, textAlign: 'right', borderRadius: 8, fontSize: 14, fontWeight: 600 };
    if (value === null || value === undefined || value === '') return { ...base, borderColor: '#e5e7eb' };
    const n = parseFloat(value);
    if (n >= 3.0) return { ...base, backgroundColor: '#ecfdf5', borderColor: '#10b981', color: '#065f46' };
    if (n === 0.0) return { ...base, backgroundColor: '#fafafa', borderColor: '#d1d5db', color: '#6b7280' };
    return { ...base, backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' };
  };

  const columns = [
    {
      title: <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Estudiante</span>,
      key: 'nombre',
      fixed: 'left',
      width: 230,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #155153, #28a5a5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {record.nombre?.[0]}{record.apellido?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 13, lineHeight: 1.3 }}>
              {record.nombre} {record.apellido}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{record.numero_documento || 'Sin doc.'}</div>
          </div>
        </div>
      ),
    },
    ...materias.map((materia) => ({
      title: (
        <Tooltip title={materia}>
          <span style={{ fontWeight: 600, fontSize: 12, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100, display: 'inline-block' }}>
            {materia}
          </span>
        </Tooltip>
      ),
      key: materia,
      width: 110,
      align: 'center',
      render: (_, record) => {
        const val = grades[record.id]?.[materia];
        return (
          <InputNumber
            min={0} max={5} step={0.1}
            value={val === null || val === undefined ? '' : val}
            onChange={(v) => handleGradeChange(record.id, materia, v)}
            placeholder="—"
            style={getGradeStyle(val)}
            formatter={(v) => (v === '' || v === null || v === undefined ? '' : parseFloat(v).toFixed(1))}
            parser={(v) => (v === '' ? null : parseFloat(v))}
            onFocus={(e) => e.target.select()}
          />
        );
      },
    })),
  ];

  if (loading && !programa) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d3b3d 0%, #155153 40%, #1e8a8a 100%)', borderRadius: 20, padding: '32px 36px 28px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -40, right: -20 }} />
        <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(40,165,165,0.12)', bottom: -20, right: 100 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => navigate('/inicio/calificaciones')}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 14px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, marginBottom: 18 }}
          >
            <ArrowLeftOutlined /> Volver
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff' }}>
                <TrophyOutlined />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                  {programa?.nombre || 'Cargando...'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  {programa?.tipo_programa && <Tag color="cyan" style={{ marginRight: 6 }}>{programa.tipo_programa}</Tag>}
                  Registro y gestión de calificaciones por materia
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { icon: <TeamOutlined />, value: students.length, label: 'Estudiantes' },
                { icon: <BookOutlined />, value: materias.length, label: 'Materias' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#5ce0d8', fontSize: 16 }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px 24px', marginBottom: 20, border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search
            placeholder="Buscar estudiante..."
            allowClear
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            value={searchText}
            style={{ width: 280 }}
            size="large"
          />
          {hasUnsavedChanges && (
            <Tag icon={<WarningOutlined />} color="warning" style={{ borderRadius: 8, padding: '4px 12px', fontSize: 12 }}>
              Cambios sin guardar
            </Tag>
          )}
        </div>
        <Space wrap>
          <Button icon={<UndoOutlined />} onClick={handleRevertGrades} size="large" style={{ borderRadius: 10 }}>
            Revertir
          </Button>
          <Button icon={<ClearOutlined />} type="dashed" danger onClick={handleResetGrades} size="large" style={{ borderRadius: 10 }}>
            Notas a 0.0
          </Button>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={handleSaveGrades}
            size="large"
            loading={loading}
            style={{ borderRadius: 10, fontWeight: 600, background: 'linear-gradient(135deg, #155153, #1e8a8a)', border: 'none', boxShadow: '0 4px 14px rgba(21,81,83,0.3)', paddingLeft: 24, paddingRight: 24 }}
          >
            Guardar Notas
          </Button>
        </Space>
      </div>

      {/* Table */}
      {materias.length === 0 && !loading ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 60, textAlign: 'center' }}>
          <Empty description="Este programa no tiene materias activas configuradas" />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <Table
            columns={columns}
            dataSource={filteredStudents}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 100, showSizeChanger: false, position: ['topRight', 'bottomRight'], showTotal: (total) => <span style={{ color: '#6b7280', fontSize: 13 }}>Total: <strong>{total}</strong> estudiantes</span> }}
            scroll={{ x: materias.length * 110 + 230 }}
            bordered
            size="small"
          />
        </div>
      )}
    </div>
  );
}

export default CalificacionesPrograma;
