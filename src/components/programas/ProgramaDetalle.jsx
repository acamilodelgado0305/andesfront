import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tabs, Card, Button, Tag, Table, Typography, Spin, Empty, Badge,
  Modal, Drawer, Form, Input, Switch, InputNumber, Space, Tooltip, Popconfirm,
  message, Upload, Select, Divider, List, Collapse
} from 'antd';
import {
  ArrowLeftOutlined, BookOutlined, TeamOutlined, EditOutlined,
  PlusOutlined, DeleteOutlined, FilePdfOutlined, FileTextOutlined,
  TrophyOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UnorderedListOutlined, WhatsAppOutlined, LinkOutlined, EyeOutlined,
  ScheduleOutlined, SwapOutlined, CopyOutlined, AppstoreAddOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import CreateProgramModal from './addProgram';
import HorarioDrawer from '../Horarios/HorarioDrawer';
import useCurrency from '../../hooks/useCurrency';
import {
  getMateriasByPrograma, createMateria, updateMateria, deleteMateria
} from '../../services/materias/serviceMateria';
import { getAllDocentes } from '../../services/docentes/serviceDocente';
import {
  getEvaluations, getStudentAssignmentsAdmin,
  assignToSelectedStudents, removeAssignment
} from '../../services/evaluation/evaluationService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const API = import.meta.env.VITE_API_BACKEND;
const PRIMARY = '#155153';
const PURPLE  = '#7c3aed';

export default function ProgramaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrency();

  const [loading, setLoading]   = useState(true);
  const [programa, setPrograma] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  const [modulos, setModulos]   = useState([]);

  // Evaluaciones por estudiante
  const [evalStudent, setEvalStudent]             = useState(null); // estudiante seleccionado
  const [studentEvals, setStudentEvals]           = useState([]);
  const [loadingStudentEvals, setLoadingStudentEvals] = useState(false);
  const [assignEvalId, setAssignEvalId]           = useState(null);
  const [assigningEval, setAssigningEval]         = useState(false);
  const [removingEvalId, setRemovingEvalId]       = useState(null);

  // Editar programa
  const [editProgramaOpen, setEditProgramaOpen] = useState(false);

  // Módulos
  const [moduloModalOpen, setModuloModalOpen] = useState(false);
  const [editingModulo, setEditingModulo]     = useState(null);
  const [savingModulo, setSavingModulo]       = useState(false);
  const [pdfFiles, setPdfFiles]               = useState([]);
  const [existingPdfs, setExistingPdfs]       = useState([]); // PDFs ya subidos a GCS
  const [deletingPdfId, setDeletingPdfId]     = useState(null);
  const [uploadingPdf, setUploadingPdf]       = useState(false);
  const [selectedMateriaId, setSelectedMateriaId] = useState(null);
  const [moduloForm] = Form.useForm();

  // PDF viewer
  const [pdfViewer, setPdfViewer] = useState(null);

  // Materias
  const [materias, setMaterias]         = useState([]);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [materiaFormOpen, setMateriaFormOpen] = useState(false);
  const [editingMateria, setEditingMateria]   = useState(null);
  const [savingMateria, setSavingMateria]     = useState(false);
  const [docentes, setDocentes]               = useState([]);
  const [horarioMateria, setHorarioMateria]   = useState(null);
  const [transferModal, setTransferModal]     = useState(null);
  const [allProgramas, setAllProgramas]       = useState([]);
  const [transferProgramaId, setTransferProgramaId] = useState(null);
  const [savingTransfer, setSavingTransfer]   = useState(false);
  const [materiaForm] = Form.useForm();

  const token = localStorage.getItem('authToken');
  const headers = { Authorization: `Bearer ${token}` };

  // ─── Fetch detalle ────────────────────────────────────────────────────────
  const fetchDetalle = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/programas/${id}/detalle`, { headers });
      setPrograma(data.programa);
      setEstudiantes(data.estudiantes || []);
      setModulos(data.modulos || []);
    } catch {
      message.error('Error al cargar el programa');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchMaterias = useCallback(async () => {
    setLoadingMaterias(true);
    try {
      const data = await getMateriasByPrograma(id);
      setMaterias(data);
    } catch { /* ignore */ }
    finally { setLoadingMaterias(false); }
  }, [id]);

  const [evaluaciones, setEvaluaciones] = useState([]);

  const fetchDocentes = async () => {
    try { setDocentes(await getAllDocentes()); } catch { /* ignore */ }
  };

  const fetchEvaluaciones = async () => {
    try {
      // Traer todas y filtrar por materias del programa en el cliente
      // (el backend también acepta materia_id pero necesitamos N calls o un filtro por programa)
      const data = await getEvaluations({});
      const all = Array.isArray(data) ? data : (data.evaluaciones || []);
      setEvaluaciones(all);
    } catch { /* ignore */ }
  };

  const fetchAllProgramas = async () => {
    try {
      const { data } = await axios.get(`${API}/api/programas`, { headers });
      setAllProgramas(data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchDetalle();
    fetchMaterias();
    fetchDocentes();
    fetchAllProgramas();
    fetchEvaluaciones();
  }, [fetchDetalle, fetchMaterias]);

  // ─── Hooks SIEMPRE antes de cualquier return condicional ─────────────────
  const modulosByMateria = useMemo(() => {
    const map = {};
    modulos.forEach((m) => {
      const key = m.materia_id ?? 'sin_materia';
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [modulos]);

  const evaluacionesByMateria = useMemo(() => {
    // IDs de las materias de este programa
    const materiaIds = new Set(materias.map((m) => m.id));
    const map = {};
    evaluaciones.forEach((ev) => {
      // Solo incluir las que pertenecen a una materia de este programa
      if (ev.materia_id && !materiaIds.has(ev.materia_id)) return;
      const key = ev.materia_id ?? 'sin_materia';
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [evaluaciones, materias]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spin size="large" /></div>;
  if (!programa) return <Empty description="Programa no encontrado" />;

  // ─── Módulos ──────────────────────────────────────────────────────────────
  const openCreateModulo = (materiaId = null) => {
    setEditingModulo(null);
    setSelectedMateriaId(materiaId);
    setPdfFiles([]);
    setExistingPdfs([]);
    moduloForm.resetFields();
    moduloForm.setFieldsValue({ activa: true, orden: 0, materia_id: materiaId });
    setModuloModalOpen(true);
  };

  const openEditModulo = async (m) => {
    setEditingModulo(m);
    setSelectedMateriaId(m.materia_id || null);
    setPdfFiles([]);
    setExistingPdfs([]);
    let evalId = null;
    try {
      const { data } = await axios.get(`${API}/api/modulos/${m.id}`, { headers });
      evalId = data.evaluaciones?.[0]?.id || null;
      setExistingPdfs(data.pdfs || []);
    } catch { /* ignore */ }
    moduloForm.setFieldsValue({ ...m, materia_id: m.materia_id || null, evaluacion_id: evalId });
    setModuloModalOpen(true);
  };

  const handleDeleteExistingPdf = async (pdfId) => {
    setDeletingPdfId(pdfId);
    try {
      await axios.delete(`${API}/api/modulos/${editingModulo.id}/pdfs/${pdfId}`, { headers });
      setExistingPdfs((prev) => prev.filter((p) => p.id !== pdfId));
      message.success('PDF eliminado');
    } catch {
      message.error('Error al eliminar el PDF');
    } finally {
      setDeletingPdfId(null);
    }
  };

  const uploadPdfsPendientes = async (moduloId) => {
    if (!pdfFiles.length) return;
    setUploadingPdf(true);
    const fd = new FormData();
    pdfFiles.forEach((f) => fd.append('pdfs', f));
    try {
      await axios.post(`${API}/api/modulos/${moduloId}/pdfs`, fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
    } catch { message.warning('Módulo guardado, pero hubo un error al subir los PDFs.'); }
    finally { setUploadingPdf(false); }
  };

  const handleSaveModulo = async (values) => {
    setSavingModulo(true);
    try {
      let moduloId;
      if (editingModulo) {
        await axios.put(`${API}/api/modulos/${editingModulo.id}`, values, { headers });
        moduloId = editingModulo.id;
        // Actualizar evaluación vinculada: primero quitar las existentes, luego vincular la nueva
        if (values.evaluacion_id) {
          await axios.post(
            `${API}/api/modulos/${moduloId}/evaluaciones`,
            { evaluacion_id: values.evaluacion_id, es_requerida: true },
            { headers }
          ).catch(() => {});
        }
        message.success('Módulo actualizado');
      } else {
        // materia_id → el backend deriva programa_id y auto-asigna estudiantes
        const { data } = await axios.post(
          `${API}/api/modulos`,
          { ...values, materia_id: values.materia_id || null },
          { headers }
        );
        moduloId = data.modulo.id;
        const mat = materias.find((m) => m.id === values.materia_id);
        message.success(
          `Módulo creado y asignado a ${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''}` +
          (mat ? ` · Materia: ${mat.nombre}` : '')
        );
      }
      await uploadPdfsPendientes(moduloId);
      setModuloModalOpen(false);
      fetchDetalle();
    } catch { message.error('Error al guardar módulo'); }
    finally { setSavingModulo(false); }
  };

  const handleDeleteModulo = async (moduloId) => {
    try {
      await axios.delete(`${API}/api/modulos/${moduloId}`, { headers });
      message.success('Módulo eliminado');
      fetchDetalle();
    } catch { message.error('Error al eliminar módulo'); }
  };

  const pdfUploadProps = {
    name: 'pdfs', accept: '.pdf,application/pdf', multiple: true,
    beforeUpload: (file) => {
      if (file.type !== 'application/pdf') { message.error(`"${file.name}" no es PDF.`); return Upload.LIST_IGNORE; }
      if (file.size > 20 * 1024 * 1024) { message.error(`"${file.name}" supera 20 MB.`); return Upload.LIST_IGNORE; }
      setPdfFiles((p) => [...p, file]);
      return false;
    },
    onRemove: (file) => setPdfFiles((p) => p.filter((f) => f.uid !== file.uid)),
    fileList: pdfFiles,
  };

  // ─── Materias ─────────────────────────────────────────────────────────────
  const openCreateMateria = () => { setEditingMateria(null); materiaForm.resetFields(); setMateriaFormOpen(true); };
  const openEditMateria   = (m) => { setEditingMateria(m); materiaForm.setFieldsValue({ nombre: m.nombre, docente_id: m.docente_id }); setMateriaFormOpen(true); };

  const handleSaveMateria = async (values) => {
    setSavingMateria(true);
    try {
      const payload = { ...values, programa_id: parseInt(id) };
      if (editingMateria) { await updateMateria(editingMateria.id, payload); message.success('Materia actualizada'); }
      else { await createMateria(payload); message.success('Materia creada'); }
      setMateriaFormOpen(false);
      materiaForm.resetFields();
      setEditingMateria(null);
      fetchMaterias();
    } catch { message.error('Error al guardar materia'); }
    finally { setSavingMateria(false); }
  };

  const handleDeleteMateria = async (materiaId) => {
    try { await deleteMateria(materiaId); message.success('Materia eliminada'); fetchMaterias(); }
    catch { message.error('Error al eliminar materia'); }
  };

  const handleStatusMateria = async (materia, checked) => {
    try { await updateMateria(materia.id, { ...materia, activa: checked }); fetchMaterias(); }
    catch { message.error('Error al cambiar estado'); }
  };

  const handleTransferConfirm = async () => {
    if (!transferProgramaId) return message.warning('Selecciona un programa destino.');
    setSavingTransfer(true);
    const { materia, mode } = transferModal;
    try {
      if (mode === 'mover') {
        await updateMateria(materia.id, { nombre: materia.nombre, programa_id: transferProgramaId, docente_id: materia.docente_id, activa: materia.activa });
        message.success(`"${materia.nombre}" movida`);
      } else {
        await createMateria({ nombre: materia.nombre, programa_id: transferProgramaId, docente_id: materia.docente_id });
        message.success(`"${materia.nombre}" duplicada`);
      }
      setTransferModal(null);
      fetchMaterias();
    } catch { message.error('Error al procesar la operación'); }
    finally { setSavingTransfer(false); }
  };

  // ─── Evaluaciones por estudiante ───────────────────────────────────────────
  const fetchStudentEvals = async (studentId) => {
    setLoadingStudentEvals(true);
    try {
      const data = await getStudentAssignmentsAdmin(studentId);
      setStudentEvals(data.asignaciones || []);
    } catch {
      message.error('Error al cargar las evaluaciones del estudiante');
      setStudentEvals([]);
    } finally {
      setLoadingStudentEvals(false);
    }
  };

  const openStudentEvals = (student) => {
    setEvalStudent(student);
    setAssignEvalId(null);
    setStudentEvals([]);
    fetchStudentEvals(student.id);
  };

  const handleAssignEval = async () => {
    if (!assignEvalId) return message.warning('Selecciona una evaluación.');
    setAssigningEval(true);
    try {
      await assignToSelectedStudents(assignEvalId, { estudiante_ids: [evalStudent.id] });
      message.success('Evaluación asignada al estudiante');
      setAssignEvalId(null);
      fetchStudentEvals(evalStudent.id);
    } catch {
      message.error('Error al asignar la evaluación');
    } finally {
      setAssigningEval(false);
    }
  };

  const handleRemoveAssignment = async (evaluacionId) => {
    setRemovingEvalId(evaluacionId);
    try {
      await removeAssignment(evaluacionId, evalStudent.id);
      message.success('Asignación eliminada');
      fetchStudentEvals(evalStudent.id);
    } catch {
      message.error('Error al quitar la asignación');
    } finally {
      setRemovingEvalId(null);
    }
  };

  // Evaluaciones del programa disponibles para asignar (las que aún no tiene el estudiante)
  const evalsDelPrograma = Object.values(evaluacionesByMateria).flat();
  const evalsAsignadasIds = new Set(studentEvals.map((e) => e.evaluacion_id));
  const evalsDisponibles = evalsDelPrograma.filter((e) => !evalsAsignadasIds.has(e.id));

  // ─── Columnas ─────────────────────────────────────────────────────────────
  const modulosCols = [
    { title: '#', dataIndex: 'orden', width: 50, render: (v) => <Tag>{v}</Tag> },
    {
      title: 'Módulo', dataIndex: 'titulo',
      render: (t, r) => (
        <div>
          <div className="font-semibold">{t}</div>
          {r.descripcion && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.descripcion}</div>}
        </div>
      ),
    },
    { title: 'Estado', dataIndex: 'activa', width: 90,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    { title: 'PDFs', dataIndex: 'total_pdfs', width: 70,
      render: (v) => <span className="flex items-center gap-1 text-red-500"><FilePdfOutlined />{v}</span> },
    { title: 'Evaluaciones', dataIndex: 'total_evaluaciones', width: 110,
      render: (v) => <span className="flex items-center gap-1 text-purple-600"><TrophyOutlined />{v}</span> },
    { title: 'Asignados', dataIndex: 'total_asignados', width: 95,
      render: (v) => <span className="flex items-center gap-1 text-blue-600"><TeamOutlined />{v}</span> },
    {
      title: '', width: 110,
      render: (_, r) => (
        <Space>
          <Tooltip title="Ver detalle">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/inicio/modulos/${r.id}`)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModulo(r)} />
          </Tooltip>
          <Popconfirm title="¿Eliminar módulo?" onConfirm={() => handleDeleteModulo(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const estudiantesCols = [
    {
      title: 'Estudiante',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.nombre} {r.apellido}</div>
          <div className="text-xs text-gray-400">{r.numero_documento}</div>
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', render: (v) => <span className="text-xs">{v || '—'}</span> },
    { title: 'WhatsApp', dataIndex: 'telefono_whatsapp', render: (v) => <span className="text-xs">{v || '—'}</span> },
    { title: 'Estado matrícula', dataIndex: 'estado_matricula', width: 130,
      render: (v) => <Tag color={v === 'activo' ? 'green' : 'default'}>{v || '—'}</Tag> },
    {
      title: '', width: 110,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Evaluaciones del estudiante">
            <Button size="small" icon={<TrophyOutlined />} style={{ color: '#d97706', borderColor: '#d97706' }}
              onClick={() => openStudentEvals(r)} />
          </Tooltip>
          {r.telefono_whatsapp && (
            <Tooltip title="WhatsApp">
              <a href={`https://wa.me/${r.telefono_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                <Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366', borderColor: '#25D366' }} />
              </a>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const materiasCols = [
    { title: 'Materia', dataIndex: 'nombre', ellipsis: true },
    { title: 'Docente', dataIndex: 'docente_nombre', render: (v) => v || <span className="text-gray-300">Sin asignar</span> },
    { title: 'Estado', dataIndex: 'activa', width: 100,
      render: (v, r) => (
        <div className="flex items-center gap-2">
          <Tag color={v ? 'green' : 'red'}>{v ? 'Activa' : 'Inactiva'}</Tag>
          <Switch size="small" checked={v} onChange={(c) => handleStatusMateria(r, c)} />
        </div>
      ),
    },
    {
      title: '', width: 160,
      render: (_, r) => (
        <Space size={2}>
          <Tooltip title="Horarios"><Button type="text" size="small" icon={<ScheduleOutlined />} style={{ color: '#059669' }} onClick={() => setHorarioMateria(r)} /></Tooltip>
          <Tooltip title="Editar"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditMateria(r)} /></Tooltip>
          <Tooltip title="Mover"><Button type="text" size="small" icon={<SwapOutlined />} style={{ color: '#2563eb' }} onClick={() => { setTransferProgramaId(null); setTransferModal({ materia: r, mode: 'mover' }); }} /></Tooltip>
          <Tooltip title="Duplicar"><Button type="text" size="small" icon={<CopyOutlined />} style={{ color: PURPLE }} onClick={() => { setTransferProgramaId(null); setTransferModal({ materia: r, mode: 'duplicar' }); }} /></Tooltip>
          <Popconfirm title="¿Eliminar materia?" onConfirm={() => handleDeleteMateria(r.id)} okText="Sí" cancelText="No">
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const otrosProgramas = allProgramas.filter((p) => p.id !== parseInt(id));

  const terminoEstudiante = busquedaEstudiante.trim().toLowerCase();
  const estudiantesFiltrados = terminoEstudiante
    ? estudiantes.filter((e) => {
        const nombreCompleto = `${e.nombre ?? ''} ${e.apellido ?? ''}`.toLowerCase();
        const documento = String(e.numero_documento ?? '').toLowerCase();
        return nombreCompleto.includes(terminoEstudiante) || documento.includes(terminoEstudiante);
      })
    : estudiantes;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inicio/programas')} />
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #155153, #28a5a5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: '#fff', flexShrink: 0,
            }}
          >
            <BookOutlined />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Title level={4} style={{ margin: 0 }}>{programa.nombre}</Title>
              <Tag color="blue">{programa.tipo_programa}</Tag>
              <Tag color={programa.activo ? 'success' : 'error'}>
                {programa.activo ? 'Activo' : 'Inactivo'}
              </Tag>
            </div>
            <Text type="secondary" className="text-sm">
              {programa.duracion_meses} meses · {formatCurrency(programa.monto_total)} total
            </Text>
          </div>
        </div>
        <Button icon={<EditOutlined />} onClick={() => setEditProgramaOpen(true)}>
          Editar programa
        </Button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Estudiantes', value: estudiantes.length, icon: <TeamOutlined />, color: '#155153' },
          { label: 'Materias', value: materias.length, icon: <UnorderedListOutlined />, color: '#2563eb' },
          { label: 'Módulos', value: modulos.length, icon: <AppstoreAddOutlined />, color: PURPLE },
          { label: 'Evaluaciones', value: Object.values(evaluacionesByMateria).flat().length, icon: <TrophyOutlined />, color: '#d97706' },
          { label: 'Duración', value: `${programa.duracion_meses} m`, icon: <BookOutlined />, color: '#6b7280' },
        ].map((s) => (
          <Card key={s.label} size="small" className="rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0"
                style={{ backgroundColor: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultActiveKey="estudiantes" items={[

        // ── ESTUDIANTES ─────────────────────────────────────────────────────
        {
          key: 'estudiantes',
          label: <span><TeamOutlined /> Estudiantes <Badge count={estudiantes.length} /></span>,
          children: (
            <div className="space-y-3">
              <Input
                allowClear
                prefix={<TeamOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Buscar por nombre o número de documento..."
                value={busquedaEstudiante}
                onChange={(e) => setBusquedaEstudiante(e.target.value)}
                style={{ maxWidth: 380 }}
              />
              <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
                <Table columns={estudiantesCols} dataSource={estudiantesFiltrados} rowKey="id" size="middle"
                  pagination={{ pageSize: 15 }}
                  locale={{ emptyText: terminoEstudiante
                    ? 'No se encontraron estudiantes que coincidan con la búsqueda'
                    : 'No hay estudiantes inscritos en este programa' }} />
              </Card>
            </div>
          ),
        },

        // ── MATERIAS ────────────────────────────────────────────────────────
        {
          key: 'materias',
          label: <span><UnorderedListOutlined /> Materias <Badge count={materias.length} style={{ backgroundColor: '#2563eb' }} /></span>,
          children: (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateMateria}
                  style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
                  Nueva Materia
                </Button>
              </div>

              {materiaFormOpen && (
                <Card size="small" className="rounded-xl bg-gray-50 border-gray-200">
                  <Text strong>{editingMateria ? 'Editar materia' : 'Nueva materia'}</Text>
                  <Divider style={{ margin: '10px 0' }} />
                  <Form form={materiaForm} layout="vertical" onFinish={handleSaveMateria}>
                    <div className="grid grid-cols-2 gap-x-4">
                      <Form.Item name="nombre" label="Nombre" className="col-span-1"
                        rules={[{ required: true, message: 'Requerido' }]}>
                        <Input placeholder="Ej: Matemáticas Básicas" />
                      </Form.Item>
                      <Form.Item name="docente_id" label="Docente (opcional)" className="col-span-1">
                        <Select placeholder="Selecciona un docente" allowClear>
                          {docentes.map((d) => (
                            <Select.Option key={d.id} value={d.id}>{d.nombre_completo}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => { setMateriaFormOpen(false); setEditingMateria(null); materiaForm.resetFields(); }}>
                        Cancelar
                      </Button>
                      <Button type="primary" htmlType="submit" loading={savingMateria}
                        style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
                        {editingMateria ? 'Guardar cambios' : 'Crear materia'}
                      </Button>
                    </div>
                  </Form>
                </Card>
              )}

              <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
                <Spin spinning={loadingMaterias}>
                  <Table columns={materiasCols} dataSource={materias} rowKey="id" size="small"
                    pagination={false}
                    locale={{ emptyText: 'No hay materias en este programa' }} />
                </Spin>
              </Card>
            </div>
          ),
        },

        // ── MÓDULOS ─────────────────────────────────────────────────────────
        {
          key: 'modulos',
          label: <span><AppstoreAddOutlined /> Módulos <Badge count={modulos.length} style={{ backgroundColor: PURPLE }} /></span>,
          children: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Los módulos se crean por materia y se asignan automáticamente a los{' '}
                  <strong>{estudiantes.length}</strong> estudiantes del programa.
                </Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModulo()}
                  style={{ backgroundColor: PURPLE, borderColor: PURPLE }}>
                  Nuevo Módulo
                </Button>
              </div>

              {materias.length === 0 ? (
                <Empty description={
                  <div className="text-center py-6">
                    <UnorderedListOutlined style={{ fontSize: 32, color: '#d1d5db' }} />
                    <div className="mt-2 text-gray-500">Crea materias primero para poder agregar módulos</div>
                  </div>
                } />
              ) : (
                <Collapse
                  defaultActiveKey={materias.map((m) => String(m.id))}
                  expandIconPosition="start"
                  className="rounded-xl overflow-hidden"
                >
                  {materias.map((mat) => {
                    const mods = modulosByMateria[mat.id] || [];
                    return (
                      <Collapse.Panel
                        key={String(mat.id)}
                        header={
                          <div className="flex items-center gap-2">
                            <UnorderedListOutlined style={{ color: '#2563eb' }} />
                            <span className="font-semibold">{mat.nombre}</span>
                            {mat.docente_nombre && (
                              <span className="text-xs text-gray-400">· {mat.docente_nombre}</span>
                            )}
                            <Badge
                              count={mods.length}
                              style={{ backgroundColor: mods.length ? PURPLE : '#d1d5db', marginLeft: 4 }}
                              showZero
                            />
                          </div>
                        }
                        extra={
                          <Button
                            size="small"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={(e) => { e.stopPropagation(); openCreateModulo(mat.id); }}
                            style={{ backgroundColor: PURPLE, borderColor: PURPLE }}
                          >
                            Módulo
                          </Button>
                        }
                      >
                        {mods.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Sin módulos en esta materia"
                            style={{ margin: '12px 0' }}
                          >
                            <Button size="small" icon={<PlusOutlined />}
                              onClick={() => openCreateModulo(mat.id)}
                              style={{ backgroundColor: PURPLE, borderColor: PURPLE, color: '#fff' }}>
                              Crear módulo
                            </Button>
                          </Empty>
                        ) : (
                          <Table
                            columns={modulosCols}
                            dataSource={mods}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            style={{ marginTop: 4 }}
                          />
                        )}
                      </Collapse.Panel>
                    );
                  })}

                  {/* Módulos sin materia asignada */}
                  {(modulosByMateria['sin_materia'] || []).length > 0 && (
                    <Collapse.Panel
                      key="sin_materia"
                      header={
                        <div className="flex items-center gap-2">
                          <AppstoreAddOutlined style={{ color: '#9ca3af' }} />
                          <span className="text-gray-500">Sin materia asignada</span>
                          <Badge count={modulosByMateria['sin_materia'].length} style={{ backgroundColor: '#9ca3af' }} />
                        </div>
                      }
                    >
                      <Table
                        columns={modulosCols}
                        dataSource={modulosByMateria['sin_materia']}
                        rowKey="id"
                        size="small"
                        pagination={false}
                      />
                    </Collapse.Panel>
                  )}
                </Collapse>
              )}
            </div>
          ),
        },

        // ── EVALUACIONES ────────────────────────────────────────────────────
        {
          key: 'evaluaciones',
          label: (
            <span>
              <TrophyOutlined /> Evaluaciones{' '}
              <Badge count={Object.values(evaluacionesByMateria).flat().length} style={{ backgroundColor: '#d97706' }} />
            </span>
          ),
          children: (
            <div className="space-y-4">
              <Text type="secondary" className="text-sm">
                Evaluaciones asociadas a las materias de este programa.
              </Text>

              {materias.length === 0 ? (
                <Empty description="Crea materias primero para poder ver evaluaciones" />
              ) : (
                <Collapse
                  defaultActiveKey={materias.map((m) => String(m.id))}
                  expandIconPosition="start"
                  className="rounded-xl overflow-hidden"
                >
                  {materias.map((mat) => {
                    const evs = evaluacionesByMateria[mat.id] || [];
                    return (
                      <Collapse.Panel
                        key={String(mat.id)}
                        header={
                          <div className="flex items-center gap-2">
                            <TrophyOutlined style={{ color: '#d97706' }} />
                            <span className="font-semibold">{mat.nombre}</span>
                            {mat.docente_nombre && (
                              <span className="text-xs text-gray-400">· {mat.docente_nombre}</span>
                            )}
                            <Badge
                              count={evs.length}
                              style={{ backgroundColor: evs.length ? '#d97706' : '#d1d5db', marginLeft: 4 }}
                              showZero
                            />
                          </div>
                        }
                        extra={
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/inicio/evaluaciones`);
                            }}
                            style={{ borderColor: '#d97706', color: '#d97706' }}
                          >
                            Nueva
                          </Button>
                        }
                      >
                        {evs.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Sin evaluaciones en esta materia"
                            style={{ margin: '12px 0' }}
                          />
                        ) : (
                          <Table
                            columns={[
                              {
                                title: 'Evaluación',
                                dataIndex: 'titulo',
                                render: (t, r) => (
                                  <div>
                                    <div className="font-semibold text-sm">{t}</div>
                                    {r.descripcion && (
                                      <div className="text-xs text-gray-400 line-clamp-1">{r.descripcion}</div>
                                    )}
                                  </div>
                                ),
                              },
                              {
                                title: 'Preguntas',
                                dataIndex: 'total_preguntas',
                                width: 90,
                                align: 'center',
                                render: (v) => <Tag>{v || 0}</Tag>,
                              },
                              {
                                title: 'Estado',
                                dataIndex: 'activa',
                                width: 90,
                                render: (v) => (
                                  <Tag color={v ? 'green' : 'default'}>
                                    {v ? 'Activa' : 'Inactiva'}
                                  </Tag>
                                ),
                              },
                              {
                                title: '',
                                width: 60,
                                align: 'center',
                                render: (_, r) => (
                                  <Tooltip title="Ver / Editar">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => navigate(`/inicio/evaluaciones/${r.id}/builder`)}
                                    />
                                  </Tooltip>
                                ),
                              },
                            ]}
                            dataSource={evs}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            style={{ marginTop: 4 }}
                          />
                        )}
                      </Collapse.Panel>
                    );
                  })}

                  {/* Evaluaciones sin materia asignada */}
                  {(evaluacionesByMateria['sin_materia'] || []).length > 0 && (
                    <Collapse.Panel
                      key="sin_materia"
                      header={
                        <div className="flex items-center gap-2">
                          <TrophyOutlined style={{ color: '#9ca3af' }} />
                          <span className="text-gray-500">Sin materia asignada</span>
                          <Badge
                            count={evaluacionesByMateria['sin_materia'].length}
                            style={{ backgroundColor: '#9ca3af' }}
                          />
                        </div>
                      }
                    >
                      <Table
                        columns={[
                          { title: 'Evaluación', dataIndex: 'titulo' },
                          {
                            title: 'Estado', dataIndex: 'activa', width: 90,
                            render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activa' : 'Inactiva'}</Tag>,
                          },
                          {
                            title: '', width: 60, align: 'center',
                            render: (_, r) => (
                              <Button type="text" size="small" icon={<EyeOutlined />}
                                onClick={() => navigate(`/inicio/evaluaciones/${r.id}/builder`)} />
                            ),
                          },
                        ]}
                        dataSource={evaluacionesByMateria['sin_materia']}
                        rowKey="id"
                        size="small"
                        pagination={false}
                      />
                    </Collapse.Panel>
                  )}
                </Collapse>
              )}
            </div>
          ),
        },

        // ── INFO ────────────────────────────────────────────────────────────
        {
          key: 'info',
          label: <span><BookOutlined /> Información</span>,
          children: (
            <Card size="small" className="rounded-xl max-w-xl">
              <div className="space-y-3">
                {[
                  { label: 'Nombre', value: programa.nombre },
                  { label: 'Tipo de programa', value: programa.tipo_programa },
                  { label: 'Descripción', value: programa.descripcion || '—' },
                  { label: 'Duración', value: programa.duracion_meses ? `${programa.duracion_meses} meses` : '—' },
                  { label: 'Valor matrícula', value: formatCurrency(programa.valor_matricula) },
                  { label: 'Mensualidad', value: formatCurrency(programa.valor_mensualidad) },
                  { label: 'Derechos de grado', value: formatCurrency(programa.derechos_grado) },
                  { label: 'Total programa', value: <strong>{formatCurrency(programa.monto_total)}</strong> },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between border-b border-gray-100 pb-2 last:border-0">
                    <span className="text-sm text-gray-500 w-40 flex-shrink-0">{row.label}</span>
                    <span className="text-sm text-gray-800 text-right">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button icon={<EditOutlined />} onClick={() => setEditProgramaOpen(true)}>
                  Editar información
                </Button>
              </div>
            </Card>
          ),
        },
      ]} />

      {/* ── Drawer crear/editar módulo ────────────────────────────────────── */}
      <Drawer
        title={
          editingModulo
            ? 'Editar Módulo'
            : selectedMateriaId
              ? `Nuevo Módulo — ${materias.find((m) => m.id === selectedMateriaId)?.nombre || 'Materia'}`
              : `Nuevo Módulo — ${programa.nombre}`
        }
        open={moduloModalOpen}
        onClose={() => setModuloModalOpen(false)}
        destroyOnClose
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModuloModalOpen(false)}>Cancelar</Button>
            <Button
              type="primary"
              loading={savingModulo || uploadingPdf}
              style={{ backgroundColor: PURPLE, borderColor: PURPLE }}
              onClick={() => moduloForm.submit()}
            >
              {uploadingPdf ? 'Subiendo PDFs...' : savingModulo ? 'Guardando...' : editingModulo ? 'Guardar cambios' : 'Crear módulo'}
            </Button>
          </div>
        }
      >
        {!editingModulo && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-700">
            <AppstoreAddOutlined className="mr-2" />
            Se asignará automáticamente a los <strong>{estudiantes.length}</strong> estudiante{estudiantes.length !== 1 ? 's' : ''} del programa.
          </div>
        )}
        <Form form={moduloForm} layout="vertical" onFinish={handleSaveModulo}>
          <Form.Item
            name="materia_id"
            label="Materia"
            rules={[{ required: true, message: 'Selecciona una materia' }]}
          >
            <Select placeholder="Selecciona la materia del módulo" showSearch
              filterOption={(input, opt) => opt.children.toLowerCase().includes(input.toLowerCase())}>
              {materias.map((mat) => (
                <Select.Option key={mat.id} value={mat.id}>{mat.nombre}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Módulo 1 - Introducción" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción corta">
            <Input placeholder="Resumen breve del módulo" />
          </Form.Item>
          <Form.Item name="contenido" label="Contenido / Información">
            <TextArea rows={4} placeholder="Texto que verán los estudiantes al abrir el módulo..." />
          </Form.Item>
          <Form.Item
            name="evaluacion_id"
            label="Evaluación del módulo"
            tooltip="El estudiante debe aprobar esta evaluación (≥3.0) para completar el módulo"
            rules={[{ required: true, message: 'Selecciona una evaluación' }]}
          >
            <Select
              placeholder="Selecciona la evaluación de cierre"
              showSearch
              allowClear
              filterOption={(input, opt) =>
                (opt.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {evaluaciones.map((ev) => (
                <Select.Option key={ev.id} value={ev.id}>
                  {ev.titulo}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {/* PDFs ya subidos (solo en edición) */}
          {editingModulo && existingPdfs.length > 0 && (
            <Form.Item label={`PDFs actuales (${existingPdfs.length})`}>
              <div className="space-y-2">
                {existingPdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FilePdfOutlined style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span className="text-sm text-gray-700 truncate">{pdf.nombre}</span>
                    </div>
                    <Space size={4}>
                      <Tooltip title="Ver PDF">
                        <a href={pdf.pdf_url} target="_blank" rel="noreferrer">
                          <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#6b7280' }} />
                        </a>
                      </Tooltip>
                      <Popconfirm
                        title="¿Eliminar este PDF?"
                        onConfirm={() => handleDeleteExistingPdf(pdf.id)}
                        okText="Sí"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          loading={deletingPdfId === pdf.id}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                ))}
              </div>
            </Form.Item>
          )}

          <Form.Item label={editingModulo ? 'Agregar nuevos PDFs' : 'PDFs del módulo'}>
            <Dragger {...pdfUploadProps}>
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: PURPLE }} /></p>
              <p className="ant-upload-text text-sm">Arrastra PDFs aquí o haz clic para seleccionarlos</p>
              <p className="ant-upload-hint text-xs text-gray-400">
                Múltiples PDF · Máx. 20 MB · Se guardan en Google Cloud Storage
              </p>
            </Dragger>
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="orden" label="Orden">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="activa" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      {/* ── Modal editar programa ─────────────────────────────────────────── */}
      <CreateProgramModal
        isOpen={editProgramaOpen}
        onClose={() => setEditProgramaOpen(false)}
        onSuccess={fetchDetalle}
        programToEdit={programa}
      />

      {/* ── Modal mover/duplicar materia ──────────────────────────────────── */}
      <Modal
        open={!!transferModal}
        title={transferModal?.mode === 'mover'
          ? `Mover "${transferModal?.materia?.nombre}"`
          : `Duplicar "${transferModal?.materia?.nombre}"`}
        okText={transferModal?.mode === 'mover' ? 'Mover' : 'Duplicar'}
        cancelText="Cancelar"
        onOk={handleTransferConfirm}
        onCancel={() => setTransferModal(null)}
        confirmLoading={savingTransfer}
        okButtonProps={{ style: { backgroundColor: transferModal?.mode === 'mover' ? '#2563eb' : PURPLE } }}
      >
        <p className="text-sm text-gray-600 mb-3">
          {transferModal?.mode === 'mover'
            ? 'Selecciona el programa destino. Dejará de pertenecer a este programa.'
            : 'Selecciona el programa destino. El original se mantiene aquí.'}
        </p>
        <Select style={{ width: '100%' }} placeholder="Programa destino" value={transferProgramaId}
          onChange={setTransferProgramaId} showSearch
          filterOption={(i, o) => o.children.toLowerCase().includes(i.toLowerCase())}>
          {otrosProgramas.map((p) => <Select.Option key={p.id} value={p.id}>{p.nombre}</Select.Option>)}
        </Select>
      </Modal>

      {/* ── Modal evaluaciones del estudiante ─────────────────────────────── */}
      <Modal
        open={!!evalStudent}
        title={
          evalStudent
            ? `Evaluaciones de ${evalStudent.nombre} ${evalStudent.apellido || ''}`
            : 'Evaluaciones'
        }
        onCancel={() => setEvalStudent(null)}
        footer={<Button onClick={() => setEvalStudent(null)}>Cerrar</Button>}
        width={620}
        destroyOnClose
      >
        {/* Asignar nueva evaluación */}
        <div className="flex items-end gap-2 mb-4">
          <div className="flex-1">
            <Text type="secondary" className="text-xs">Asignar evaluación del programa</Text>
            <Select
              style={{ width: '100%' }}
              placeholder={evalsDisponibles.length ? 'Selecciona una evaluación' : 'No hay evaluaciones disponibles'}
              value={assignEvalId}
              onChange={setAssignEvalId}
              showSearch
              allowClear
              disabled={!evalsDisponibles.length}
              filterOption={(input, opt) => (opt.children || '').toLowerCase().includes(input.toLowerCase())}
            >
              {evalsDisponibles.map((ev) => (
                <Select.Option key={ev.id} value={ev.id}>{ev.titulo}</Select.Option>
              ))}
            </Select>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={assigningEval}
            disabled={!assignEvalId}
            onClick={handleAssignEval}
            style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
          >
            Asignar
          </Button>
        </div>

        <Divider style={{ margin: '8px 0 12px' }} />

        {/* Evaluaciones asignadas */}
        <Spin spinning={loadingStudentEvals}>
          {studentEvals.length === 0 && !loadingStudentEvals ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Este estudiante no tiene evaluaciones asignadas"
            />
          ) : (
            <List
              size="small"
              dataSource={studentEvals}
              renderItem={(ev) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="del"
                      title="¿Quitar esta evaluación al estudiante?"
                      onConfirm={() => handleRemoveAssignment(ev.evaluacion_id)}
                      okText="Sí"
                      cancelText="No"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        loading={removingEvalId === ev.evaluacion_id} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<TrophyOutlined style={{ color: '#d97706', fontSize: 18 }} />}
                    title={<span className="font-medium">{ev.titulo}</span>}
                    description={
                      <Space size={6} wrap>
                        <Tag color={ev.estado === 'finalizada' ? 'green' : 'gold'}>
                          {ev.estado === 'finalizada' ? 'Finalizada' : 'Pendiente'}
                        </Tag>
                        {ev.calificacion != null && (
                          <Tag color={Number(ev.calificacion) >= 3 ? 'green' : 'red'}>
                            Nota: {Number(ev.calificacion).toFixed(1)}
                          </Tag>
                        )}
                        <span className="text-xs text-gray-400">
                          Intentos: {ev.intentos_realizados ?? 0}
                          {ev.intentos_max ? ` / ${ev.intentos_max}` : ''}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Modal>

      {/* ── Horario drawer ────────────────────────────────────────────────── */}
      <HorarioDrawer
        materia={horarioMateria}
        programa={programa}
        onClose={() => setHorarioMateria(null)}
      />
    </div>
  );
}
