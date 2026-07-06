import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Tag, Table, Select, message, Popconfirm, Tooltip, Spin,
  Typography, Tabs, Card, Empty, Badge, Modal, Form, Input, Switch,
  InputNumber, Space, Upload, List, Drawer, Radio
} from 'antd';
import {
  ArrowLeftOutlined, WhatsAppOutlined, PlusOutlined, DeleteOutlined,
  FilePdfOutlined, BookOutlined, TeamOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, EditOutlined, LinkOutlined,
  InboxOutlined, TrophyOutlined, EyeOutlined, PlayCircleOutlined,
  VideoCameraOutlined, FundProjectionScreenOutlined, FilePptOutlined,
  FileImageOutlined, Html5Outlined
} from '@ant-design/icons';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClasesByModulo, getClaseById, createClase, updateClase, deleteClase,
  uploadClaseVideo, uploadClasePdfs, deleteClasePdf,
  uploadClasePresentaciones, deleteClasePresentacion,
} from '../../services/clases/serviceClase';
import PresentacionViewer from '../Clases/PresentacionViewer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const API = import.meta.env.VITE_API_BACKEND;
const PURPLE = '#7c3aed';

// Icono por tipo de presentación (pdf/pptx/svg).
const presTipoIcon = (tipo) => {
  if (tipo === 'pdf') return <FilePdfOutlined style={{ color: '#ef4444', flexShrink: 0 }} />;
  if (tipo === 'svg') return <FileImageOutlined style={{ color: '#0ea5e9', flexShrink: 0 }} />;
  if (tipo === 'html') return <Html5Outlined style={{ color: '#6366f1', flexShrink: 0 }} />;
  return <FilePptOutlined style={{ color: '#ea580c', flexShrink: 0 }} />; // pptx / ppt
};

// Convierte un link de YouTube/Vimeo en su URL embebible; si no reconoce el
// proveedor devuelve null (se muestra como enlace normal en vez de iframe).
const getEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  } catch { /* ignore */ }
  return null;
};

export default function ModuloDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [modulo, setModulo] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);

  // Para agregar evaluaciones
  const [allEvals, setAllEvals] = useState([]);
  const [selectedEval, setSelectedEval] = useState(null);
  const [addingEval, setAddingEval] = useState(false);

  // Para asignar estudiantes
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [addingStudents, setAddingStudents] = useState(false);

  // PDFs pendientes de subir
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deletingPdfId, setDeletingPdfId] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null); // { url, nombre }

  // Modal editar módulo
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm();

  // ─── Clases (dentro del tema) ───────────────────────────────────────────────
  const [clases, setClases] = useState([]);
  const [loadingClases, setLoadingClases] = useState(false);
  const [claseDrawerOpen, setClaseDrawerOpen] = useState(false);
  const [editingClase, setEditingClase] = useState(null);
  const [savingClase, setSavingClase] = useState(false);
  const [claseVideoMode, setClaseVideoMode] = useState('enlace'); // 'enlace' | 'archivo'
  const [claseVideoFile, setClaseVideoFile] = useState(null);
  const [claseVideoActual, setClaseVideoActual] = useState(null); // { video_url, video_gcs_path }
  const [clasePdfFiles, setClasePdfFiles] = useState([]);
  const [existingClasePdfs, setExistingClasePdfs] = useState([]);
  const [deletingClasePdfId, setDeletingClasePdfId] = useState(null);
  const [clasePresFiles, setClasePresFiles] = useState([]);
  const [existingClasePres, setExistingClasePres] = useState([]);
  const [deletingClasePresId, setDeletingClasePresId] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null); // { url, titulo }
  const [presPreview, setPresPreview] = useState(null); // { titulo, presentaciones: [] }
  const [claseForm] = Form.useForm();

  const token = localStorage.getItem('authToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchClases = useCallback(async () => {
    setLoadingClases(true);
    try {
      setClases(await getClasesByModulo(id));
    } catch { /* ignore */ }
    finally { setLoadingClases(false); }
  }, [id]);

  const fetchDetalle = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/modulos/${id}`, { headers });
      setModulo(data.modulo);
      setPdfs(data.pdfs || []);
      setEvaluaciones(data.evaluaciones || []);
      setEstudiantes(data.estudiantes || []);
    } catch {
      message.error('Error al cargar el módulo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAllEvals = async () => {
    try {
      const { data } = await axios.get(`${API}/api/evaluaciones`, { headers });
      setAllEvals(data.evaluaciones || data || []);
    } catch { /* ignore */ }
  };

  const fetchAllStudents = async () => {
    try {
      const { data } = await axios.get(`${API}/api/students`, { headers });
      setAllStudents(data.students || data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchDetalle();
    fetchAllEvals();
    fetchAllStudents();
    fetchClases();
  }, [fetchDetalle, fetchClases]);

  // ─── PDFs ──────────────────────────────────────────────────────────────────
  const pdfUploadProps = {
    name: 'pdfs',
    accept: '.pdf,application/pdf',
    multiple: true,
    beforeUpload: (file) => {
      if (file.type !== 'application/pdf') {
        message.error(`"${file.name}" no es un PDF.`);
        return Upload.LIST_IGNORE;
      }
      if (file.size > 20 * 1024 * 1024) {
        message.error(`"${file.name}" supera los 20 MB.`);
        return Upload.LIST_IGNORE;
      }
      setPdfFiles((prev) => [...prev, file]);
      return false;
    },
    onRemove: (file) => setPdfFiles((prev) => prev.filter((f) => f.uid !== file.uid)),
    fileList: pdfFiles,
  };

  const handleUploadPdfs = async () => {
    if (!pdfFiles.length) return message.warning('Selecciona al menos un PDF.');
    setUploadingPdf(true);
    const formData = new FormData();
    pdfFiles.forEach((f) => formData.append('pdfs', f));
    try {
      await axios.post(`${API}/api/modulos/${id}/pdfs`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      message.success(`${pdfFiles.length} PDF${pdfFiles.length !== 1 ? 's' : ''} subido${pdfFiles.length !== 1 ? 's' : ''} correctamente`);
      setPdfFiles([]);
      fetchDetalle();
    } catch {
      message.error('Error al subir los PDFs');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeletePdf = async (pdfId) => {
    setDeletingPdfId(pdfId);
    try {
      await axios.delete(`${API}/api/modulos/${id}/pdfs/${pdfId}`, { headers });
      message.success('PDF eliminado');
      fetchDetalle();
    } catch {
      message.error('Error al eliminar el PDF');
    } finally {
      setDeletingPdfId(null);
    }
  };

  // ─── Clases ───────────────────────────────────────────────────────────────
  const openCreateClase = () => {
    setEditingClase(null);
    setClaseVideoMode('enlace');
    setClaseVideoFile(null);
    setClaseVideoActual(null);
    setClasePdfFiles([]);
    setExistingClasePdfs([]);
    setClasePresFiles([]);
    setExistingClasePres([]);
    claseForm.resetFields();
    claseForm.setFieldsValue({ orden: clases.length });
    setClaseDrawerOpen(true);
  };

  const openEditClase = async (clase) => {
    setEditingClase(clase);
    setClaseVideoMode(clase.video_gcs_path ? 'archivo' : 'enlace');
    setClaseVideoFile(null);
    setClaseVideoActual({ video_url: clase.video_url, video_gcs_path: clase.video_gcs_path });
    setClasePdfFiles([]);
    setExistingClasePdfs([]);
    setClasePresFiles([]);
    setExistingClasePres([]);
    claseForm.setFieldsValue({
      titulo: clase.titulo, descripcion: clase.descripcion,
      video_url: clase.video_gcs_path ? undefined : clase.video_url,
      orden: clase.orden, activa: clase.activa,
    });
    try {
      const { pdfs, presentaciones } = await getClaseById(clase.id);
      setExistingClasePdfs(pdfs || []);
      setExistingClasePres(presentaciones || []);
    } catch { /* ignore */ }
    setClaseDrawerOpen(true);
  };

  const claseVideoUploadProps = {
    accept: 'video/*',
    multiple: false,
    beforeUpload: (file) => {
      if (!file.type.startsWith('video/')) { message.error('Selecciona un archivo de video.'); return Upload.LIST_IGNORE; }
      if (file.size > 500 * 1024 * 1024) { message.error('El video supera 500 MB.'); return Upload.LIST_IGNORE; }
      setClaseVideoFile(file);
      return false;
    },
    onRemove: () => setClaseVideoFile(null),
    fileList: claseVideoFile ? [claseVideoFile] : [],
  };

  const clasePdfUploadProps = {
    accept: '.pdf,application/pdf', multiple: true,
    beforeUpload: (file) => {
      if (file.type !== 'application/pdf') { message.error(`"${file.name}" no es PDF.`); return Upload.LIST_IGNORE; }
      if (file.size > 20 * 1024 * 1024) { message.error(`"${file.name}" supera 20 MB.`); return Upload.LIST_IGNORE; }
      setClasePdfFiles((p) => [...p, file]);
      return false;
    },
    onRemove: (file) => setClasePdfFiles((p) => p.filter((f) => f.uid !== file.uid)),
    fileList: clasePdfFiles,
  };

  const handleDeleteExistingClasePdf = async (pdfId) => {
    setDeletingClasePdfId(pdfId);
    try {
      await deleteClasePdf(editingClase.id, pdfId);
      setExistingClasePdfs((prev) => prev.filter((p) => p.id !== pdfId));
      message.success('PDF eliminado');
    } catch { message.error('Error al eliminar el PDF'); }
    finally { setDeletingClasePdfId(null); }
  };

  // Presentaciones (PDF/PPTX/SVG/HTML) que el estudiante ve en el visor 16:9.
  const PRES_EXT = /\.(pdf|pptx|ppt|svg|html?)$/i;
  const clasePresUploadProps = {
    accept: '.pdf,.pptx,.ppt,.svg,.html,.htm', multiple: true,
    beforeUpload: (file) => {
      if (!PRES_EXT.test(file.name)) { message.error(`"${file.name}" no es PDF, PPTX, SVG ni HTML.`); return Upload.LIST_IGNORE; }
      if (file.size > 50 * 1024 * 1024) { message.error(`"${file.name}" supera 50 MB.`); return Upload.LIST_IGNORE; }
      setClasePresFiles((p) => [...p, file]);
      return false;
    },
    onRemove: (file) => setClasePresFiles((p) => p.filter((f) => f.uid !== file.uid)),
    fileList: clasePresFiles,
  };

  const handleDeleteExistingClasePres = async (presId) => {
    setDeletingClasePresId(presId);
    try {
      await deleteClasePresentacion(editingClase.id, presId);
      setExistingClasePres((prev) => prev.filter((p) => p.id !== presId));
      message.success('Presentación eliminada');
    } catch { message.error('Error al eliminar la presentación'); }
    finally { setDeletingClasePresId(null); }
  };

  const handleSaveClase = async (values) => {
    setSavingClase(true);
    try {
      const payload = {
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        orden: values.orden ?? 0,
        activa: values.activa ?? true,
        video_url: claseVideoMode === 'enlace' ? (values.video_url || null) : undefined,
      };

      let clase;
      if (editingClase) {
        clase = await updateClase(editingClase.id, payload);
      } else {
        clase = await createClase(id, payload);
      }

      if (claseVideoMode === 'archivo' && claseVideoFile) {
        await uploadClaseVideo(clase.id, claseVideoFile);
      }
      if (clasePdfFiles.length) {
        await uploadClasePdfs(clase.id, clasePdfFiles);
      }
      if (clasePresFiles.length) {
        await uploadClasePresentaciones(clase.id, clasePresFiles);
      }

      message.success(editingClase ? 'Clase actualizada' : 'Clase creada');
      setClaseDrawerOpen(false);
      fetchClases();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Error al guardar la clase');
    } finally {
      setSavingClase(false);
    }
  };

  const handleDeleteClase = async (claseId) => {
    try {
      await deleteClase(claseId);
      message.success('Clase eliminada');
      fetchClases();
    } catch { message.error('Error al eliminar la clase'); }
  };

  // Previsualiza la presentación de una clase en el visor (misma experiencia que
  // verá el estudiante). Trae la lista real de archivos y abre el modal.
  const openPresPreview = async (clase) => {
    try {
      const { presentaciones } = await getClaseById(clase.id);
      if (!presentaciones?.length) return message.info('Esta clase no tiene presentación.');
      setPresPreview({ titulo: clase.titulo, presentaciones });
    } catch { message.error('No se pudo cargar la presentación'); }
  };

  // ─── Evaluaciones ─────────────────────────────────────────────────────────
  const handleAddEval = async () => {
    if (!selectedEval) return message.warning('Selecciona una evaluación');
    setAddingEval(true);
    try {
      await axios.post(`${API}/api/modulos/${id}/evaluaciones`, { evaluacion_id: selectedEval }, { headers });
      message.success('Evaluación vinculada');
      setSelectedEval(null);
      fetchDetalle();
    } catch {
      message.error('Error al vincular evaluación');
    } finally {
      setAddingEval(false);
    }
  };

  const handleRemoveEval = async (evalId) => {
    try {
      await axios.delete(`${API}/api/modulos/${id}/evaluaciones/${evalId}`, { headers });
      message.success('Evaluación desvinculada');
      fetchDetalle();
    } catch {
      message.error('Error al desvincular');
    }
  };

  // ─── Estudiantes ──────────────────────────────────────────────────────────
  const handleAddStudents = async () => {
    if (!selectedStudents.length) return message.warning('Selecciona al menos un estudiante');
    setAddingStudents(true);
    try {
      await axios.post(`${API}/api/modulos/${id}/estudiantes`, { estudiante_ids: selectedStudents }, { headers });
      message.success('Estudiantes asignados');
      setSelectedStudents([]);
      fetchDetalle();
    } catch {
      message.error('Error al asignar estudiantes');
    } finally {
      setAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (estId) => {
    try {
      await axios.delete(`${API}/api/modulos/${id}/estudiantes/${estId}`, { headers });
      message.success('Estudiante removido');
      fetchDetalle();
    } catch {
      message.error('Error al remover estudiante');
    }
  };

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  const sendWhatsApp = async (est) => {
    const celular = est.celular?.replace(/\D/g, '');
    if (!celular) return message.warning('El estudiante no tiene número de celular registrado');

    const portalUrl = `${window.location.origin}/portal/modulos`;
    const mensaje = encodeURIComponent(
      `Hola ${est.nombre}, tienes acceso al módulo: *${modulo.titulo}*.\n\n` +
      `Ingresa al portal de estudiantes aquí: ${portalUrl}\n\n` +
      `Allí encontrarás el contenido, materiales PDF y evaluaciones disponibles para ti.`
    );
    window.open(`https://wa.me/${celular}?text=${mensaje}`, '_blank');

    try {
      await axios.patch(`${API}/api/modulos/${id}/estudiantes/${est.id}/whatsapp`, {}, { headers });
      fetchDetalle();
    } catch { /* no crítico */ }
  };

  // ─── Editar módulo ────────────────────────────────────────────────────────
  const openEdit = () => {
    editForm.setFieldsValue(modulo);
    setEditOpen(true);
  };

  const handleSaveEdit = async (values) => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/modulos/${id}`, values, { headers });
      message.success('Módulo actualizado');
      setEditOpen(false);
      fetchDetalle();
    } catch {
      message.error('Error al actualizar módulo');
    } finally {
      setSaving(false);
    }
  };

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const linkedEvalIds = new Set(evaluaciones.map((e) => e.id));
  const availableEvals = allEvals.filter((e) => !linkedEvalIds.has(e.id));
  const linkedStudentIds = new Set(estudiantes.map((e) => e.id));
  const availableStudents = allStudents.filter((s) => !linkedStudentIds.has(s.id));

  // ─── Columnas ─────────────────────────────────────────────────────────────
  const evalColumns = [
    {
      title: 'Evaluación',
      dataIndex: 'titulo',
      render: (text, r) => (
        <div>
          <div className="font-medium">{text}</div>
          {r.descripcion && <div className="text-xs text-gray-400">{r.descripcion}</div>}
        </div>
      ),
    },
    { title: 'Activa', dataIndex: 'activa', width: 80,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: 'Requerida', dataIndex: 'es_requerida', width: 100,
      render: (v) => <Tag color={v ? 'purple' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: '', width: 50,
      render: (_, r) => (
        <Popconfirm title="¿Desvincular?" onConfirm={() => handleRemoveEval(r.id)} okText="Sí" cancelText="No">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const studentColumns = [
    {
      title: 'Estudiante',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.nombre} {r.apellido}</div>
          <div className="text-xs text-gray-400">{r.email}</div>
        </div>
      ),
    },
    { title: 'Estado', dataIndex: 'estado', width: 110,
      render: (v) => (
        <Tag icon={v === 'completado' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          color={v === 'completado' ? 'success' : 'processing'}>
          {v === 'completado' ? 'Completado' : 'Pendiente'}
        </Tag>
      ),
    },
    { title: 'WhatsApp', dataIndex: 'whatsapp_enviado', width: 100,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Enviado' : '—'}</Tag> },
    {
      title: 'Acciones', width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<WhatsAppOutlined />}
            style={{ color: '#25D366', borderColor: '#25D366' }}
            onClick={() => sendWhatsApp(r)}>
            Enviar
          </Button>
          <Popconfirm title="¿Quitar estudiante?" onConfirm={() => handleRemoveStudent(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><Spin size="large" /></div>;
  if (!modulo) return <Empty description="Módulo no encontrado" />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inicio/modulos')} />
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <BookOutlined className="text-purple-600 text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Title level={4} style={{ margin: 0 }}>{modulo.titulo}</Title>
              <Tag color={modulo.activa ? 'success' : 'default'}>{modulo.activa ? 'Activo' : 'Inactivo'}</Tag>
            </div>
            {modulo.descripcion && <Text type="secondary">{modulo.descripcion}</Text>}
          </div>
        </div>
        <Button icon={<EditOutlined />} onClick={openEdit}>Editar módulo</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'PDFs cargados',       value: pdfs.length,          icon: <FilePdfOutlined />, color: 'red' },
          { label: 'Evaluaciones',         value: evaluaciones.length,  icon: <FileTextOutlined />, color: 'purple' },
          { label: 'Estudiantes',          value: estudiantes.length,   icon: <TeamOutlined />,    color: 'blue' },
          { label: 'Con WhatsApp enviado', value: estudiantes.filter(e => e.whatsapp_enviado).length, icon: <WhatsAppOutlined />, color: 'green' },
        ].map((s) => (
          <Card key={s.label} size="small" className="rounded-xl">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-${s.color}-100 flex items-center justify-center text-${s.color}-600`}>
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

      <Tabs defaultActiveKey="clases" items={[
        // ── PESTAÑA CLASES ───────────────────────────────────────────────────
        {
          key: 'clases',
          label: (
            <span>Clases <Badge count={clases.length} style={{ backgroundColor: PURPLE }} /></span>
          ),
          children: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Las clases son el contenido secuencial del tema: título, una grabación corta y una descripción.
                </Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateClase}
                  style={{ backgroundColor: PURPLE, borderColor: PURPLE }}>
                  Nueva clase
                </Button>
              </div>

              <Spin spinning={loadingClases}>
                {clases.length === 0 ? (
                  <Empty description="Este tema aún no tiene clases" />
                ) : (
                  <div className="space-y-2">
                    {clases.map((c, i) => (
                      <Card key={c.id} size="small" className="rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <Tag color="purple" className="mt-0.5 flex-shrink-0">Clase {i + 1}</Tag>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm">{c.titulo}</div>
                              {c.descripcion && (
                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.descripcion}</div>
                              )}
                              <div className="flex items-center gap-3 mt-1.5">
                                {c.video_url ? (
                                  <Button size="small" type="link" className="!px-0" icon={<PlayCircleOutlined />}
                                    onClick={() => setVideoPreview({ url: c.video_url, titulo: c.titulo })}>
                                    Ver grabación
                                  </Button>
                                ) : (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <VideoCameraOutlined /> Sin grabación
                                  </span>
                                )}
                                {c.total_presentaciones > 0 && (
                                  <Button size="small" type="link" className="!px-0" icon={<FundProjectionScreenOutlined />}
                                    onClick={() => openPresPreview(c)}>
                                    Ver presentación
                                  </Button>
                                )}
                                {c.total_pdfs > 0 && (
                                  <span className="text-xs text-red-500 flex items-center gap-1">
                                    <FilePdfOutlined /> {c.total_pdfs}
                                  </span>
                                )}
                                {!c.activa && <Tag className="!m-0">Inactiva</Tag>}
                              </div>
                            </div>
                          </div>
                          <Space size={4} className="flex-shrink-0">
                            <Tooltip title="Editar">
                              <Button size="small" icon={<EditOutlined />} onClick={() => openEditClase(c)} />
                            </Tooltip>
                            <Popconfirm title="¿Eliminar esta clase?" onConfirm={() => handleDeleteClase(c.id)} okText="Sí" cancelText="No">
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Spin>
            </div>
          ),
        },

        // ── PESTAÑA CONTENIDO ───────────────────────────────────────────────
        {
          key: 'contenido',
          label: 'Contenido',
          children: (
            <div className="space-y-4">
              {modulo.contenido ? (
                <Card title="Información del módulo" size="small" className="rounded-xl">
                  <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{modulo.contenido}</Paragraph>
                </Card>
              ) : (
                <Empty description="No hay texto de contenido cargado" />
              )}
            </div>
          ),
        },

        // ── PESTAÑA PDFs ────────────────────────────────────────────────────
        {
          key: 'pdfs',
          label: (
            <span>PDFs <Badge count={pdfs.length} style={{ backgroundColor: '#ef4444' }} /></span>
          ),
          children: (
            <div className="space-y-4">
              {/* Zona de subida */}
              <Card size="small" className="rounded-xl bg-red-50 border-red-200">
                <Dragger {...pdfUploadProps} style={{ background: 'transparent', border: 'none' }}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: '#ef4444', fontSize: 28 }} />
                  </p>
                  <p className="ant-upload-text text-sm">Arrastra PDFs aquí o haz clic para seleccionarlos</p>
                  <p className="ant-upload-hint text-xs text-gray-400">
                    Puedes subir varios a la vez · Máx. 20 MB por archivo
                  </p>
                </Dragger>
                {pdfFiles.length > 0 && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {pdfFiles.length} archivo{pdfFiles.length !== 1 ? 's' : ''} listo{pdfFiles.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      loading={uploadingPdf}
                      onClick={handleUploadPdfs}
                      style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                    >
                      Subir a GCS
                    </Button>
                  </div>
                )}
              </Card>

              {/* Lista de PDFs existentes */}
              {pdfs.length === 0 ? (
                <Empty description="No hay PDFs cargados en este módulo" />
              ) : (
                <List
                  dataSource={pdfs}
                  renderItem={(pdf) => (
                    <List.Item
                      className="!px-4 !py-3 bg-white rounded-xl mb-2 border border-gray-100 shadow-sm"
                      actions={[
                        <Tooltip title="Ver PDF" key="ver">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => setPdfViewer({ url: pdf.pdf_url, nombre: pdf.nombre })}
                          />
                        </Tooltip>,
                        <a href={pdf.pdf_url} target="_blank" rel="noreferrer" key="link">
                          <Button size="small" icon={<LinkOutlined />} />
                        </a>,
                        <Popconfirm
                          key="del"
                          title="¿Eliminar este PDF?"
                          onConfirm={() => handleDeletePdf(pdf.id)}
                          okText="Sí" cancelText="No"
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingPdfId === pdf.id}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FilePdfOutlined style={{ fontSize: 24, color: '#ef4444' }} />}
                        title={<span className="text-sm font-medium">{pdf.nombre}</span>}
                        description={<span className="text-xs text-gray-400">Guardado en Google Cloud Storage</span>}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          ),
        },

        // ── PESTAÑA EVALUACIONES ────────────────────────────────────────────
        {
          key: 'evaluaciones',
          label: (
            <span>Evaluaciones <Badge count={evaluaciones.length} style={{ backgroundColor: '#7c3aed' }} /></span>
          ),
          children: (
            <div className="space-y-4">
              <Card size="small" className="rounded-xl bg-purple-50 border-purple-200">
                <div className="flex gap-2 items-center flex-wrap">
                  <Select
                    showSearch
                    placeholder="Buscar y vincular evaluación existente..."
                    style={{ flex: 1, minWidth: 220 }}
                    value={selectedEval}
                    onChange={setSelectedEval}
                    options={availableEvals.map((e) => ({ value: e.id, label: e.titulo }))}
                    filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                    allowClear
                  />
                  <Button type="primary" icon={<LinkOutlined />} loading={addingEval} onClick={handleAddEval}
                    style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}>
                    Vincular
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={() => navigate('/inicio/evaluaciones')}>
                    Crear nueva
                  </Button>
                </div>
              </Card>
              <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
                <Table columns={evalColumns} dataSource={evaluaciones} rowKey="id" size="small"
                  pagination={false} locale={{ emptyText: 'No hay evaluaciones vinculadas' }} />
              </Card>
            </div>
          ),
        },

        // ── PESTAÑA ESTUDIANTES ─────────────────────────────────────────────
        {
          key: 'estudiantes',
          label: (
            <span>Estudiantes <Badge count={estudiantes.length} /></span>
          ),
          children: (
            <div className="space-y-4">
              <Card size="small" className="rounded-xl bg-blue-50 border-blue-200">
                <div className="flex gap-2 items-start flex-wrap">
                  <Select
                    mode="multiple" showSearch
                    placeholder="Buscar y seleccionar estudiantes..."
                    style={{ flex: 1, minWidth: 280 }}
                    value={selectedStudents}
                    onChange={setSelectedStudents}
                    options={availableStudents.map((s) => ({
                      value: s.id,
                      label: `${s.nombre} ${s.apellido}`,
                    }))}
                    filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                    allowClear
                  />
                  <Button type="primary" icon={<PlusOutlined />} loading={addingStudents} onClick={handleAddStudents}>
                    Asignar
                  </Button>
                </div>
                <Text type="secondary" className="text-xs mt-2 block">
                  Después de asignar puedes enviarles el enlace del portal por WhatsApp.
                </Text>
              </Card>
              <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
                <Table columns={studentColumns} dataSource={estudiantes} rowKey="id" size="small"
                  pagination={{ pageSize: 20 }}
                  locale={{ emptyText: 'No hay estudiantes asignados' }} />
              </Card>
            </div>
          ),
        },
      ]} />

      {/* Modal editar módulo */}
      <Modal
        title="Editar Módulo"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit} className="mt-3">
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción corta">
            <Input />
          </Form.Item>
          <Form.Item name="contenido" label="Contenido / Información">
            <TextArea rows={5} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="orden" label="Orden">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="activa" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Para gestionar los PDFs del módulo ve a la pestaña "PDFs".
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}
              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}>
              Guardar cambios
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Drawer crear/editar Clase */}
      <Drawer
        title={editingClase ? `Editar ${editingClase.titulo}` : 'Nueva clase'}
        open={claseDrawerOpen}
        onClose={() => setClaseDrawerOpen(false)}
        destroyOnClose
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setClaseDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={savingClase}
              style={{ backgroundColor: PURPLE, borderColor: PURPLE }} onClick={() => claseForm.submit()}>
              {editingClase ? 'Guardar cambios' : 'Crear clase'}
            </Button>
          </div>
        }
      >
        <Form form={claseForm} layout="vertical" onFinish={handleSaveClase}>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Clase 1 - Introducción" />
          </Form.Item>

          <Form.Item label="Grabación">
            <Radio.Group value={claseVideoMode} onChange={(e) => setClaseVideoMode(e.target.value)} className="mb-2">
              <Radio.Button value="enlace">Enlace</Radio.Button>
              <Radio.Button value="archivo">Subir archivo</Radio.Button>
            </Radio.Group>

            {claseVideoMode === 'enlace' ? (
              <Form.Item name="video_url" noStyle
                rules={[{ type: 'url', message: 'URL no válida' }]}>
                <Input placeholder="https://youtube.com/... o Vimeo/Loom/Drive" />
              </Form.Item>
            ) : (
              <div>
                {claseVideoActual?.video_gcs_path && !claseVideoFile && (
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <VideoCameraOutlined /> Ya hay un video subido — sube uno nuevo para remplazarlo.
                  </div>
                )}
                <Upload {...claseVideoUploadProps}>
                  <Button icon={<InboxOutlined />}>Seleccionar video (máx. 500 MB, 10-20 min)</Button>
                </Upload>
              </div>
            )}
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción">
            <TextArea rows={4} placeholder="Texto que verán los estudiantes debajo de la grabación..." />
          </Form.Item>

          <Form.Item label="Presentación (PDF, PPTX, SVG o HTML)">
            {existingClasePres.length > 0 && (
              <div className="space-y-2 mb-2">
                {existingClasePres.map((pres) => (
                  <div key={pres.id} className="flex items-center justify-between bg-orange-50 dark:bg-[#3a3a38] border border-orange-100 dark:border-[#403e3a] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {presTipoIcon(pres.tipo)}
                      <span className="text-sm text-gray-700 dark:text-[#faf9f5] truncate">{pres.nombre}</span>
                      <Tag className="!m-0 uppercase" color="orange">{pres.tipo}</Tag>
                    </div>
                    <Space size={4}>
                      <a href={pres.url} target="_blank" rel="noreferrer">
                        <Button type="text" size="small" icon={<EyeOutlined />} />
                      </a>
                      <Popconfirm title="¿Eliminar esta presentación?" onConfirm={() => handleDeleteExistingClasePres(pres.id)}
                        okText="Sí" cancelText="No" okButtonProps={{ danger: true }}>
                        <Button type="text" size="small" icon={<DeleteOutlined />} danger loading={deletingClasePresId === pres.id} />
                      </Popconfirm>
                    </Space>
                  </div>
                ))}
              </div>
            )}
            <Dragger {...clasePresUploadProps}>
              <p className="ant-upload-drag-icon"><FundProjectionScreenOutlined style={{ color: PURPLE }} /></p>
              <p className="ant-upload-text text-sm">Arrastra PDF, PPTX, SVG o HTML aquí o haz clic para seleccionarlos</p>
              <p className="ant-upload-hint text-xs text-gray-400">
                Se verá como presentación en el reproductor 16:9 · Máx. 50 MB por archivo
              </p>
            </Dragger>
          </Form.Item>

          {editingClase && (
            <Form.Item label={`PDFs de la clase (${existingClasePdfs.length})`}>
              {existingClasePdfs.length > 0 && (
                <div className="space-y-2 mb-2">
                  {existingClasePdfs.map((pdf) => (
                    <div key={pdf.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FilePdfOutlined style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span className="text-sm text-gray-700 truncate">{pdf.nombre}</span>
                      </div>
                      <Space size={4}>
                        <a href={pdf.pdf_url} target="_blank" rel="noreferrer">
                          <Button type="text" size="small" icon={<EyeOutlined />} />
                        </a>
                        <Popconfirm title="¿Eliminar este PDF?" onConfirm={() => handleDeleteExistingClasePdf(pdf.id)}
                          okText="Sí" cancelText="No" okButtonProps={{ danger: true }}>
                          <Button type="text" size="small" icon={<DeleteOutlined />} danger loading={deletingClasePdfId === pdf.id} />
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
              <Dragger {...clasePdfUploadProps}>
                <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: PURPLE }} /></p>
                <p className="ant-upload-text text-sm">Arrastra PDFs aquí o haz clic para seleccionarlos</p>
              </Dragger>
            </Form.Item>
          )}

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="orden" label="Orden"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="activa" label="Estado" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      {/* Modal ver grabación de una clase */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <PlayCircleOutlined style={{ color: PURPLE }} />
            {videoPreview?.titulo}
          </span>
        }
        open={!!videoPreview}
        onCancel={() => setVideoPreview(null)}
        footer={[
          <a key="open" href={videoPreview?.url} target="_blank" rel="noreferrer">
            <Button icon={<LinkOutlined />}>Abrir en nueva pestaña</Button>
          </a>,
          <Button key="close" onClick={() => setVideoPreview(null)}>Cerrar</Button>,
        ]}
        width={720}
        destroyOnClose
      >
        {videoPreview && (
          getEmbedUrl(videoPreview.url) ? (
            <iframe
              src={getEmbedUrl(videoPreview.url)}
              title={videoPreview.titulo}
              width="100%" height={400}
              style={{ border: 'none', borderRadius: 8 }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={videoPreview.url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 400 }} />
          )
        )}
      </Modal>

      {/* Modal visor de PDF */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <FilePdfOutlined style={{ color: '#ef4444' }} />
            {pdfViewer?.nombre}
          </span>
        }
        open={!!pdfViewer}
        onCancel={() => setPdfViewer(null)}
        footer={[
          <a key="open" href={pdfViewer?.url} target="_blank" rel="noreferrer">
            <Button icon={<LinkOutlined />}>Abrir en nueva pestaña</Button>
          </a>,
          <Button key="close" onClick={() => setPdfViewer(null)}>Cerrar</Button>,
        ]}
        width="80vw"
        style={{ top: 20 }}
        destroyOnClose
      >
        {pdfViewer && (
          <iframe
            src={pdfViewer.url}
            title={pdfViewer.nombre}
            width="100%"
            height="70vh"
            style={{ border: 'none', borderRadius: 8, display: 'block' }}
          />
        )}
      </Modal>

      {/* Modal previsualizar presentación (misma experiencia que el estudiante) */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <FundProjectionScreenOutlined style={{ color: PURPLE }} />
            {presPreview?.titulo}
          </span>
        }
        open={!!presPreview}
        onCancel={() => setPresPreview(null)}
        footer={[<Button key="close" onClick={() => setPresPreview(null)}>Cerrar</Button>]}
        width="80vw"
        style={{ top: 20 }}
        destroyOnClose
      >
        {presPreview && <PresentacionViewer presentaciones={presPreview.presentaciones} />}
      </Modal>
    </div>
  );
}
