import React, { useEffect, useState, useCallback } from 'react';
import {
  Typography, Table, InputNumber, Button, message,
  Input, Modal, Space, Spin, Tag, Tooltip, Empty, Select,
} from 'antd';
import {
  SearchOutlined, SaveOutlined, UndoOutlined, ClearOutlined,
  TrophyOutlined, TeamOutlined, BookOutlined, ArrowLeftOutlined,
  WarningOutlined, PlusOutlined, LockOutlined, UnlockOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getGradesByPrograma, saveGrades } from '../../services/gardes/gradesService';
import { getMateriasByPrograma } from '../../services/materias/serviceMateria';
import { getCierresByPrograma, createCierre, cerrarCierre } from '../../services/cierres/cierresService';

const { Search } = Input;
const { Option } = Select;

function CalificacionesPrograma() {
  const navigate = useNavigate();
  const { programaId } = useParams();

  const [programa, setPrograma] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [initialGradesBackup, setInitialGradesBackup] = useState({});
  const [dirtyGrades, setDirtyGrades] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estado de cierres
  const [cierres, setCierres] = useState([]);
  const [selectedCierre, setSelectedCierre] = useState(null);
  const [creatingCierre, setCreatingCierre] = useState(false);
  const [newCierreName, setNewCierreName] = useState('');
  const [loadingCierre, setLoadingCierre] = useState(false);

  // ── Cargar cierres del programa ──────────────────────────────────
  const fetchCierres = useCallback(async () => {
    try {
      const data = await getCierresByPrograma(programaId);
      setCierres(data);
      return data;
    } catch {
      message.error('Error al cargar los cierres');
      return [];
    }
  }, [programaId]);

  // ── Cargar notas para un cierre específico ───────────────────────
  const fetchGradesForCierre = useCallback(async (cierre) => {
    if (!cierre) return;
    setLoading(true);
    try {
      const [{ programa: prog, students: studs, grades: gradesData }, materiasData] = await Promise.all([
        getGradesByPrograma(programaId, cierre.id),
        getMateriasByPrograma(programaId),
      ]);

      setPrograma(prog);

      const materiasActivas = (materiasData || [])
        .filter((m) => m.activa !== false)
        .map((m) => m.nombre);
      setMaterias(materiasActivas);
      setStudents(studs || []);
      setFilteredStudents(studs || []);

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
      setDirtyGrades(new Set());
      setHasUnsavedChanges(false);
    } catch {
      message.error('Error al cargar los datos del programa');
    } finally {
      setLoading(false);
    }
  }, [programaId]);

  // ── Inicialización ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const data = await fetchCierres();
      if (data.length > 0) {
        // Auto-seleccionar el primer cierre abierto, o el más reciente si todos cerrados
        const open = data.find((c) => !c.cerrado);
        setSelectedCierre(open || data[data.length - 1]);
      }
    };
    init();
  }, [fetchCierres]);

  useEffect(() => {
    if (selectedCierre) fetchGradesForCierre(selectedCierre);
  }, [selectedCierre, fetchGradesForCierre]);

  // ── Búsqueda ─────────────────────────────────────────────────────
  const handleSearch = (value) => {
    setSearchText(value);
    if (!value.trim()) { setFilteredStudents(students); return; }
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

  // ── Cambio de nota ────────────────────────────────────────────────
  const handleGradeChange = (studentId, materia, value) => {
    if (selectedCierre?.cerrado) return;
    let val = value === '' || value === null || value === undefined ? null : parseFloat(value);
    if (val !== null) {
      val = Math.round(val * 10) / 10;
      if (val < 0 || val > 5) {
        message.warning('La nota debe estar entre 0.0 y 5.0.', 2);
        val = grades[studentId]?.[materia] ?? null;
      }
    }
    setGrades((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [materia]: val } }));
    setDirtyGrades((prev) => new Set(prev).add(`${studentId}:${materia}`));
    setHasUnsavedChanges(true);
  };

  // ── Guardar notas ─────────────────────────────────────────────────
  const handleSaveGrades = async () => {
    if (!programa || !selectedCierre) return;
    if (selectedCierre.cerrado) {
      message.error('No se pueden modificar notas de un cierre cerrado.');
      return;
    }
    if (dirtyGrades.size === 0) return;
    setLoading(true);
    try {
      // Solo enviar las notas que realmente cambiaron
      const changedByStudent = {};
      for (const key of dirtyGrades) {
        const [studentId, materia] = key.split(':');
        if (!changedByStudent[studentId]) changedByStudent[studentId] = {};
        const nota = grades[studentId]?.[materia];
        if (nota !== null && nota !== undefined) {
          changedByStudent[studentId][materia] = nota;
        }
      }
      const payload = Object.entries(changedByStudent).map(([studentId, g]) => ({
        studentId: parseInt(studentId),
        programa: programa.nombre,
        cierre_id: selectedCierre.id,
        grades: g,
      }));
      await saveGrades(payload);
      message.success('Notas guardadas exitosamente');
      setInitialGradesBackup(JSON.parse(JSON.stringify(grades)));
      setDirtyGrades(new Set());
      setHasUnsavedChanges(false);
    } catch {
      message.error('Error al guardar las notas');
    } finally {
      setLoading(false);
    }
  };

  // ── Revertir notas ────────────────────────────────────────────────
  const handleRevertGrades = () => {
    Modal.confirm({
      title: 'Revertir a notas originales',
      content: '¿Revertir todas las notas a los valores cargados del servidor?',
      okText: 'Sí, revertir',
      cancelText: 'Cancelar',
      onOk: () => {
        setGrades(JSON.parse(JSON.stringify(initialGradesBackup)));
        setDirtyGrades(new Set());
        setHasUnsavedChanges(false);
        message.info('Notas revertidas.');
      },
    });
  };

  // ── Reset notas a 0 ───────────────────────────────────────────────
  const handleResetGrades = () => {
    if (selectedCierre?.cerrado) return;
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
        setDirtyGrades(() => {
          const all = new Set();
          students.forEach((s) => materias.forEach((m) => all.add(`${s.id}:${m}`)));
          return all;
        });
        setHasUnsavedChanges(true);
      },
    });
  };

  // ── Crear cierre ──────────────────────────────────────────────────
  const handleCreateCierre = async () => {
    if (!newCierreName.trim()) { message.warning('Ingresa un nombre para el cierre'); return; }
    setLoadingCierre(true);
    try {
      const nuevo = await createCierre(newCierreName.trim(), parseInt(programaId));
      const updated = [...cierres, nuevo];
      setCierres(updated);
      setSelectedCierre(nuevo);
      setNewCierreName('');
      setCreatingCierre(false);
      message.success(`Cierre "${nuevo.nombre}" creado`);
    } catch {
      message.error('Error al crear el cierre');
    } finally {
      setLoadingCierre(false);
    }
  };

  // ── Cerrar cierre ─────────────────────────────────────────────────
  const handleCerrarCierre = () => {
    if (!selectedCierre || selectedCierre.cerrado) return;
    Modal.confirm({
      title: `Cerrar "${selectedCierre.nombre}"`,
      content: 'Las notas quedarán bloqueadas y visibles en el portal del estudiante. Esta acción no se puede deshacer.',
      okText: 'Sí, cerrar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        setLoadingCierre(true);
        try {
          const updated = await cerrarCierre(selectedCierre.id);
          setCierres((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCierre(updated);
          message.success('Cierre realizado. Las notas ya están visibles para los estudiantes.');
        } catch {
          message.error('Error al cerrar el cierre');
        } finally {
          setLoadingCierre(false);
        }
      },
    });
  };

  // ── Estilo de notas ───────────────────────────────────────────────
  const getGradeStyle = (value, disabled) => {
    const base = { width: 80, textAlign: 'right', borderRadius: 8, fontSize: 14, fontWeight: 600 };
    if (disabled) return { ...base, backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#9ca3af' };
    if (value === null || value === undefined || value === '') return { ...base, borderColor: '#e5e7eb' };
    const n = parseFloat(value);
    if (n >= 3.0) return { ...base, backgroundColor: '#ecfdf5', borderColor: '#10b981', color: '#065f46' };
    if (n === 0.0) return { ...base, backgroundColor: '#fafafa', borderColor: '#d1d5db', color: '#6b7280' };
    return { ...base, backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' };
  };

  const isClosed = selectedCierre?.cerrado ?? false;

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
            <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 13 }}>{record.nombre} {record.apellido}</div>
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
            disabled={isClosed}
            style={getGradeStyle(val, isClosed)}
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
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #0d3b3d 0%, #155153 40%, #1e8a8a 100%)', borderRadius: 20, padding: '32px 36px 28px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -40, right: -20 }} />
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
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>
                  {programa?.nombre || 'Cargando...'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  Registro y gestión de calificaciones por cierre
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ icon: <TeamOutlined />, value: students.length, label: 'Estudiantes' }, { icon: <BookOutlined />, value: materias.length, label: 'Materias' }].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#5ce0d8', fontSize: 16 }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel de Cierres ── */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px 24px', marginBottom: 16, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Cierre activo:</span>
            {cierres.length > 0 ? (
              <Select
                value={selectedCierre?.id}
                onChange={(val) => {
                  const c = cierres.find((x) => x.id === val);
                  if (c) setSelectedCierre(c);
                }}
                style={{ minWidth: 220 }}
                size="middle"
              >
                {cierres.map((c) => (
                  <Option key={c.id} value={c.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.cerrado
                        ? <LockOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                        : <UnlockOutlined style={{ color: '#10b981', fontSize: 12 }} />}
                      {c.nombre}
                      {c.cerrado && <Tag color="default" style={{ marginLeft: 4, fontSize: 10 }}>Cerrado</Tag>}
                      {!c.cerrado && <Tag color="green" style={{ marginLeft: 4, fontSize: 10 }}>Activo</Tag>}
                    </div>
                  </Option>
                ))}
              </Select>
            ) : (
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Sin cierres — crea uno para comenzar</span>
            )}

            {selectedCierre && !selectedCierre.cerrado && (
              <Button
                icon={<LockOutlined />}
                size="middle"
                danger
                loading={loadingCierre}
                onClick={handleCerrarCierre}
                style={{ borderRadius: 8 }}
              >
                Cerrar cierre
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {creatingCierre ? (
              <>
                <Input
                  placeholder="Ej: Primer corte 2025"
                  value={newCierreName}
                  onChange={(e) => setNewCierreName(e.target.value)}
                  onPressEnter={handleCreateCierre}
                  style={{ width: 200, borderRadius: 8 }}
                  autoFocus
                />
                <Button type="primary" size="middle" loading={loadingCierre} onClick={handleCreateCierre} style={{ borderRadius: 8, background: '#155153', borderColor: '#155153' }}>
                  Crear
                </Button>
                <Button size="middle" onClick={() => { setCreatingCierre(false); setNewCierreName(''); }} style={{ borderRadius: 8 }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button icon={<PlusOutlined />} size="middle" onClick={() => setCreatingCierre(true)} style={{ borderRadius: 8 }}>
                Nuevo cierre
              </Button>
            )}
          </div>
        </div>

        {selectedCierre?.cerrado && (
          <div style={{ marginTop: 10, padding: '8px 14px', background: '#fef3c7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <LockOutlined style={{ color: '#d97706' }} />
            <span style={{ color: '#92400e' }}>
              Este cierre está <strong>cerrado</strong>. Las notas son de solo lectura y ya están visibles en el portal del estudiante.
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
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
          <Button icon={<UndoOutlined />} onClick={handleRevertGrades} size="large" style={{ borderRadius: 10 }} disabled={isClosed}>
            Revertir
          </Button>
          <Button icon={<ClearOutlined />} type="dashed" danger onClick={handleResetGrades} size="large" style={{ borderRadius: 10 }} disabled={isClosed}>
            Notas a 0.0
          </Button>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={handleSaveGrades}
            size="large"
            loading={loading}
            disabled={isClosed || !selectedCierre}
            style={{ borderRadius: 10, fontWeight: 600, background: isClosed ? undefined : 'linear-gradient(135deg, #155153, #1e8a8a)', border: 'none', boxShadow: isClosed ? undefined : '0 4px 14px rgba(21,81,83,0.3)', paddingLeft: 24, paddingRight: 24 }}
          >
            Guardar Notas
          </Button>
        </Space>
      </div>

      {/* ── Tabla ── */}
      {!selectedCierre ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 60, textAlign: 'center' }}>
          <Empty description="Crea un cierre para comenzar a registrar notas" />
        </div>
      ) : materias.length === 0 && !loading ? (
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
