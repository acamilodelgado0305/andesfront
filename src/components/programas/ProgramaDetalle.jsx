import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Tabs, Card, Button, Tag, Table, Typography, Spin, Empty, Badge,
  Modal, Drawer, Form, Input, Switch, InputNumber, Space, Tooltip, Popconfirm,
  message, Upload, Select, Divider, List, Collapse, Avatar, Progress, Radio
} from 'antd';
import {
  ArrowLeftOutlined, BookOutlined, TeamOutlined, EditOutlined,
  PlusOutlined, DeleteOutlined, FilePdfOutlined, FileTextOutlined,
  TrophyOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UnorderedListOutlined, WhatsAppOutlined, LinkOutlined, EyeOutlined,
  ScheduleOutlined, SwapOutlined, CopyOutlined, AppstoreAddOutlined,
  SolutionOutlined, MailOutlined, ReloadOutlined, UserOutlined,
  ClockCircleOutlined, BarChartOutlined, UserDeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import CreateProgramModal from './addProgram';
import HorarioDrawer from '../Horarios/HorarioDrawer';
import MateriaDetalle from '../materias/MateriaDetalle';
import useCurrency from '../../hooks/useCurrency';
import {
  getMateriasByPrograma, createMateria, updateMateria, deleteMateria, duplicarMateria
} from '../../services/materias/serviceMateria';
import {
  getAllDocentes, createDocente, getProgramaDocentes,
  addDocenteToPrograma, removeDocenteFromPrograma
} from '../../services/docentes/serviceDocente';
import {
  getEvaluations, getStudentAssignmentsAdmin,
  assignToSelectedStudents, removeAssignment
} from '../../services/evaluation/evaluationService';
import {
  getJoinLinks, createJoinLink, setJoinLinkEnabled,
  regenerateJoinLink, deleteJoinLink,
  getProgramaProgreso, getEstudianteProgresoPrograma,
  removeEstudianteDePrograma,
} from '../../services/programas/programasService';
import { archiveStudent, graduateStudent } from '../../services/student/studentService';
import { FaUserGraduate } from 'react-icons/fa';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const API = import.meta.env.VITE_API_BACKEND;
const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY = '#155153';
const PURPLE  = '#7c3aed';

// Motivos de archivado (mismos que en la tabla principal de estudiantes).
const ARCHIVE_REASONS = [
  'Retiro voluntario',
  'Problemas económicos',
  'Traslado a otra institución',
  'Inactividad prolongada',
  'Culminó el programa',
  'Incumplimiento de requisitos',
  'Otro motivo',
];

export default function ProgramaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const formatCurrency = useCurrency();

  const [loading, setLoading]   = useState(true);
  const [programa, setPrograma] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');

  // Acciones sobre estudiantes del programa (archivar / sacar del programa / graduar)
  const [removingEstudianteId, setRemovingEstudianteId] = useState(null);
  const [graduatingId, setGraduatingId] = useState(null);
  const [archiveModal, setArchiveModal] = useState({ open: false, studentId: null, studentName: '' });
  const [archiveReason, setArchiveReason] = useState(null);
  const [archiveCustomReason, setArchiveCustomReason] = useState('');
  const [archivingEstudiante, setArchivingEstudiante] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [aulaMateriaId, setAulaMateriaId] = useState(null);
  const [modulos, setModulos]   = useState([]);

  // Avance por estudiante (clases vistas / pendientes)
  const [progreso, setProgreso]                   = useState({ total_clases: 0, estudiantes: [] });
  const [loadingProgreso, setLoadingProgreso]     = useState(false);
  const [progresoStudent, setProgresoStudent]     = useState(null); // estudiante del drawer de detalle
  const [progresoDetalle, setProgresoDetalle]     = useState(null);
  const [loadingDetalle, setLoadingDetalle]       = useState(false);

  // Evaluaciones por estudiante
  const [evalStudent, setEvalStudent]             = useState(null); // estudiante seleccionado
  const [studentEvals, setStudentEvals]           = useState([]);
  const [loadingStudentEvals, setLoadingStudentEvals] = useState(false);
  const [assignEvalId, setAssignEvalId]           = useState(null);
  const [assigningEval, setAssigningEval]         = useState(false);
  const [removingEvalId, setRemovingEvalId]       = useState(null);

  // Editar programa
  const [editProgramaOpen, setEditProgramaOpen] = useState(false);

  // Enlaces de inscripción (varios por programa, uno por coordinador)
  const [joinModalOpen, setJoinModalOpen]           = useState(false);
  const [coordinadores, setCoordinadores]           = useState([]);
  const [loadingCoordinadores, setLoadingCoordinadores] = useState(false);
  const [joinCoordinadorId, setJoinCoordinadorId]   = useState(null);
  const [generatingJoinLink, setGeneratingJoinLink] = useState(false);
  const [joinLinks, setJoinLinks]                   = useState([]);
  const [loadingJoinLinks, setLoadingJoinLinks]     = useState(false);
  const [busyLinkId, setBusyLinkId]                 = useState(null); // enlace en proceso (toggle/regenerar/eliminar)

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

  // Docentes del programa (muchos a muchos)
  const [programaDocentes, setProgramaDocentes]         = useState([]);
  const [loadingProgramaDocentes, setLoadingProgramaDocentes] = useState(false);
  const [addDocenteId, setAddDocenteId]                 = useState(null);
  const [addingDocente, setAddingDocente]               = useState(false);
  const [removingDocenteId, setRemovingDocenteId]       = useState(null);
  const [docenteModalOpen, setDocenteModalOpen]         = useState(false);
  const [savingNewDocente, setSavingNewDocente]         = useState(false);
  const [docenteForm] = Form.useForm();

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

  // ─── Enlaces de inscripción (varios por programa, uno por coordinador) ──────
  const fetchCoordinadores = useCallback(async () => {
    if (coordinadores.length) return;
    setLoadingCoordinadores(true);
    try {
      const { data } = await axios.get(`${API_AUTH_URL}/api/businesses/my/users`, { headers });
      setCoordinadores(data || []);
    } catch {
      message.error('No se pudieron cargar los coordinadores.');
    } finally {
      setLoadingCoordinadores(false);
    }
  }, [coordinadores.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchJoinLinks = useCallback(async () => {
    setLoadingJoinLinks(true);
    try {
      setJoinLinks(await getJoinLinks(id));
    } catch {
      message.error('No se pudieron cargar los enlaces de inscripción.');
    } finally {
      setLoadingJoinLinks(false);
    }
  }, [id]);

  // Carga inicial de enlaces + coordinadores al entrar al programa.
  useEffect(() => {
    if (!id) return;
    fetchJoinLinks();
    fetchCoordinadores();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nombre legible del coordinador dueño de un enlace (los usuarios viven en el
  // auth-service; el backend de enlaces solo guarda el id).
  const coordinadorNombre = useCallback((coordinadorId) => {
    const u = coordinadores.find((c) => String(c.id) === String(coordinadorId));
    return u ? (u.name || u.email || `Coordinador #${coordinadorId}`) : `Coordinador #${coordinadorId}`;
  }, [coordinadores]);

  // Coordinadores que aún no tienen enlace en este programa (para el selector).
  const coordinadoresDisponibles = useMemo(
    () => coordinadores.filter((c) => !joinLinks.some((l) => String(l.coordinador_id) === String(c.id))),
    [coordinadores, joinLinks],
  );

  const openJoinModal = () => {
    setJoinCoordinadorId(null);
    setJoinModalOpen(true);
    fetchCoordinadores();
  };

  const handleCreateJoinLink = async () => {
    if (!joinCoordinadorId) {
      message.warning('Selecciona un coordinador para el enlace.');
      return;
    }
    setGeneratingJoinLink(true);
    try {
      const nuevo = await createJoinLink(id, joinCoordinadorId);
      setJoinLinks((prev) => [...prev, nuevo]);
      setJoinModalOpen(false);
      message.success('Enlace de inscripción generado.');
    } catch (err) {
      message.error(err.response?.data?.message || 'Error al generar el enlace.');
    } finally {
      setGeneratingJoinLink(false);
    }
  };

  const handleToggleJoinLink = async (link, enabled) => {
    setBusyLinkId(link.id);
    try {
      const upd = await setJoinLinkEnabled(id, link.id, enabled);
      setJoinLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, ...upd } : l)));
    } catch {
      message.error('Error al actualizar el enlace.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const handleRegenerateJoinLink = async (link) => {
    setBusyLinkId(link.id);
    try {
      const upd = await regenerateJoinLink(id, link.id);
      setJoinLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, ...upd } : l)));
      message.success('Enlace regenerado. El anterior dejó de funcionar.');
    } catch {
      message.error('Error al regenerar el enlace.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const handleDeleteJoinLink = async (link) => {
    setBusyLinkId(link.id);
    try {
      await deleteJoinLink(id, link.id);
      setJoinLinks((prev) => prev.filter((l) => l.id !== link.id));
      message.success('Enlace eliminado.');
    } catch {
      message.error('Error al eliminar el enlace.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const joinUrl = (tokenValue) => `${window.location.origin}/unirse/${tokenValue}`;
  const handleCopyJoinLink = (tokenValue) => {
    navigator.clipboard.writeText(joinUrl(tokenValue));
    message.success('Enlace copiado al portapapeles.');
  };

  const fetchMaterias = useCallback(async () => {
    setLoadingMaterias(true);
    try {
      const data = await getMateriasByPrograma(id);
      setMaterias(data);
    } catch { /* ignore */ }
    finally { setLoadingMaterias(false); }
  }, [id]);

  const fetchProgramaDocentes = useCallback(async () => {
    setLoadingProgramaDocentes(true);
    try {
      const data = await getProgramaDocentes(id);
      setProgramaDocentes(data);
    } catch { /* ignore */ }
    finally { setLoadingProgramaDocentes(false); }
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
    fetchProgramaDocentes();
    fetchDocentes();
    fetchAllProgramas();
    fetchEvaluaciones();
  }, [fetchDetalle, fetchMaterias, fetchProgramaDocentes]);

  // Solo auto-selecciona la primera materia una vez, al cargar el programa.
  // (si no, cada clic en otra pestaña —que limpia aulaMateriaId— volvería a
  // seleccionarla y el usuario quedaría "atrapado" en el aula)
  const autoSelectedMateria = useRef(false);
  useEffect(() => {
    if (!autoSelectedMateria.current && materias.length > 0) {
      autoSelectedMateria.current = true;
      setAulaMateriaId(materias[0].id);
    }
  }, [materias]);

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

  // ─── Avance por estudiante (clases vistas / pendientes) ────────────────────
  // IMPORTANTE: estos hooks van ANTES de los return condicionales de abajo.
  // Si se colocan después, en el primer render (loading=true) no se ejecutan y
  // al pasar a loading=false React lanza "Rendered more hooks than during the
  // previous render" → el ErrorBoundary muestra la página de error.
  const fetchProgreso = useCallback(async () => {
    setLoadingProgreso(true);
    try {
      setProgreso(await getProgramaProgreso(id));
    } catch { /* ignore */ }
    finally { setLoadingProgreso(false); }
  }, [id]);

  useEffect(() => { if (id) fetchProgreso(); }, [id, fetchProgreso]);

  // estudiante_id → { completadas, ultima_actividad } para pintar la barra en la tabla.
  const progresoMap = useMemo(() => {
    const m = {};
    (progreso.estudiantes || []).forEach((e) => { m[e.estudiante_id] = e; });
    return m;
  }, [progreso]);

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
    try {
      await deleteMateria(materiaId);
      message.success('Materia eliminada');
      // Si estábamos viendo el aula de la materia recién eliminada, cerrarla.
      if (aulaMateriaId === materiaId) setAulaMateriaId(null);
      fetchMaterias();
    }
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
        // Copia profunda: temas, clases, PDFs, presentaciones y evaluaciones.
        await duplicarMateria(materia.id, { programa_id_destino: transferProgramaId });
        message.success(`"${materia.nombre}" duplicada con todo su contenido`);
      }
      setTransferModal(null);
      fetchMaterias();
    } catch { message.error('Error al procesar la operación'); }
    finally { setSavingTransfer(false); }
  };

  // ─── Docentes del programa ─────────────────────────────────────────────────
  const handleAddDocente = async () => {
    if (!addDocenteId) return message.warning('Selecciona un docente.');
    setAddingDocente(true);
    try {
      await addDocenteToPrograma(id, addDocenteId);
      message.success('Docente asociado al programa');
      setAddDocenteId(null);
      fetchProgramaDocentes();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Error al asociar el docente');
    } finally {
      setAddingDocente(false);
    }
  };

  const handleRemoveDocente = async (docenteId) => {
    setRemovingDocenteId(docenteId);
    try {
      await removeDocenteFromPrograma(id, docenteId);
      message.success('Docente quitado del programa');
      fetchProgramaDocentes();
    } catch {
      message.error('Error al quitar el docente');
    } finally {
      setRemovingDocenteId(null);
    }
  };

  const openCreateDocente = () => { docenteForm.resetFields(); setDocenteModalOpen(true); };

  const handleCreateDocente = async (values) => {
    setSavingNewDocente(true);
    try {
      const nuevo = await createDocente(values);
      // Asociar automáticamente el docente recién creado a este programa
      try { await addDocenteToPrograma(id, nuevo.id); } catch { /* el docente se creó igual */ }
      message.success('Docente creado y asociado al programa');
      setDocenteModalOpen(false);
      docenteForm.resetFields();
      await Promise.all([fetchDocentes(), fetchProgramaDocentes()]);
    } catch (e) {
      // El docente ya existe (email duplicado) → asociar el existente en vez de fallar
      if (e?.response?.status === 409) {
        const emailNorm = (values.email || '').trim().toLowerCase();
        let existente = docentes.find((d) => (d.email || '').trim().toLowerCase() === emailNorm);
        if (!existente) {
          // Refrescar por si la lista local estaba desactualizada
          try {
            const fresh = await getAllDocentes();
            setDocentes(fresh);
            existente = fresh.find((d) => (d.email || '').trim().toLowerCase() === emailNorm);
          } catch { /* ignore */ }
        }
        if (existente) {
          if (programaDocentes.some((pd) => pd.id === existente.id)) {
            message.info('Ese docente ya existe y ya está asociado a este programa.');
            setDocenteModalOpen(false);
          } else {
            try {
              await addDocenteToPrograma(id, existente.id);
              message.success('Ese docente ya existía; lo asociamos a este programa.');
              setDocenteModalOpen(false);
              docenteForm.resetFields();
              await fetchProgramaDocentes();
            } catch {
              message.error('No se pudo asociar el docente existente. Usa el selector "Asociar docente existente".');
            }
          }
          return;
        }
      }
      message.error(e?.response?.data?.message || 'Error al crear el docente');
    } finally {
      setSavingNewDocente(false);
    }
  };

  const openProgresoDetalle = async (student) => {
    setProgresoStudent(student);
    setProgresoDetalle(null);
    setLoadingDetalle(true);
    try {
      setProgresoDetalle(await getEstudianteProgresoPrograma(id, student.id));
    } catch {
      message.error('Error al cargar el avance del estudiante');
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ─── Sacar / archivar estudiante ───────────────────────────────────────────
  // "Sacar del programa": lo desvincula solo de ESTE programa (sigue existiendo).
  const handleRemoveEstudianteDePrograma = async (student) => {
    setRemovingEstudianteId(student.id);
    try {
      await removeEstudianteDePrograma(id, student.id);
      setEstudiantes((prev) => prev.filter((e) => e.id !== student.id));
      message.success(`${student.nombre} ${student.apellido} fue sacado del programa`);
      fetchProgreso();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Error al sacar el estudiante del programa');
    } finally {
      setRemovingEstudianteId(null);
    }
  };

  // "Graduar": marca al estudiante como graduado y genera sus diplomas (aparecen
  // en el apartado de Certificados de su portal). Refresca la lista al terminar.
  const handleGraduateEstudiante = async (student) => {
    setGraduatingId(student.id);
    try {
      const res = await graduateStudent(student.id);
      const generados = res?.diplomas_generados ?? 0;
      message.success(
        generados > 0
          ? `${student.nombre} ${student.apellido} graduado. Se generaron ${generados} diploma(s) en Certificados.`
          : `${student.nombre} ${student.apellido} marcado como graduado.`
      );
      fetchDetalle();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Error al graduar el estudiante');
    } finally {
      setGraduatingId(null);
    }
  };

  // "Archivar": archiva al estudiante globalmente (misma acción que la tabla principal).
  const openArchiveEstudiante = (student) => {
    setArchiveReason(null);
    setArchiveCustomReason('');
    setArchiveModal({ open: true, studentId: student.id, studentName: `${student.nombre} ${student.apellido}` });
  };

  const confirmArchiveEstudiante = async () => {
    const finalReason = archiveReason === 'Otro motivo' ? archiveCustomReason.trim() : archiveReason;
    if (!finalReason) {
      message.warning('Selecciona o escribe la razón del archivado.');
      return;
    }
    setArchivingEstudiante(true);
    try {
      await archiveStudent(archiveModal.studentId, finalReason);
      setEstudiantes((prev) => prev.filter((e) => e.id !== archiveModal.studentId));
      message.success('Estudiante archivado correctamente');
      setArchiveModal({ open: false, studentId: null, studentName: '' });
      fetchProgreso();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Error al archivar el estudiante');
    } finally {
      setArchivingEstudiante(false);
    }
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
    {
      title: 'WhatsApp', dataIndex: 'telefono_whatsapp', width: 180,
      render: (v, r) => {
        const num = (v || r.telefono_llamadas || '').trim();
        if (!num) return <span className="text-gray-400 dark:text-[#a8a59e]">—</span>;
        let phone = num.replace(/\D/g, '');
        if (phone && !phone.startsWith('57')) phone = `57${phone}`;
        return (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium" style={{ color: '#25D366' }}>
            <WhatsAppOutlined /> {num}
          </a>
        );
      },
    },
    { title: 'Estado matrícula', dataIndex: 'estado_matricula', width: 130,
      render: (v) => <Tag color={v === 'activo' ? 'green' : 'default'}>{v || '—'}</Tag> },
    {
      title: 'Avance', width: 180,
      render: (_, r) => {
        const total = progreso.total_clases || 0;
        const done = progresoMap[r.id]?.completadas || 0;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return total === 0 ? (
          <span className="text-xs text-gray-400 dark:text-[#a8a59e]">Sin clases</span>
        ) : (
          <div style={{ minWidth: 150 }}>
            <Progress percent={pct} size="small"
              strokeColor={pct === 100 ? '#16a34a' : '#7c3aed'}
              format={() => <span className="text-xs">{done}/{total}</span>} />
          </div>
        );
      },
    },
    {
      title: 'Acciones', width: 220,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Ver avance de clases">
            <Button size="small" icon={<BarChartOutlined />} style={{ color: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={() => openProgresoDetalle(r)} />
          </Tooltip>
          <Tooltip title="Evaluaciones del estudiante">
            <Button size="small" icon={<TrophyOutlined />} style={{ color: '#d97706', borderColor: '#d97706' }}
              onClick={() => openStudentEvals(r)} />
          </Tooltip>
          {r.fecha_graduacion ? (
            <Tooltip title={`Graduado el ${new Date(r.fecha_graduacion).toLocaleDateString('es-CO')}`}>
              <Button size="small" icon={<FaUserGraduate />} disabled
                style={{ color: '#16a34a', borderColor: '#16a34a' }} />
            </Tooltip>
          ) : (
            <Popconfirm
              title="¿Marcar como graduado?"
              description={
                <span className="block max-w-[240px]">
                  Se generarán los diplomas de <strong>{r.nombre} {r.apellido}</strong> y
                  aparecerán en su apartado de Certificados. El estudiante quedará como graduado.
                </span>
              }
              okText="Sí, graduar" cancelText="Cancelar"
              onConfirm={() => handleGraduateEstudiante(r)}
            >
              <Tooltip title="Marcar como graduado">
                <Button size="small" icon={<FaUserGraduate />}
                  style={{ color: '#16a34a', borderColor: '#16a34a' }}
                  loading={graduatingId === r.id} />
              </Tooltip>
            </Popconfirm>
          )}
          <Tooltip title="Archivar estudiante">
            <Button size="small" icon={<InboxOutlined />} style={{ color: '#8c8c8c' }}
              onClick={() => openArchiveEstudiante(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Sacar del programa?"
            description={
              <span className="block max-w-[220px]">
                Se quitará a <strong>{r.nombre} {r.apellido}</strong> de este programa.
                El estudiante seguirá existiendo y en sus otros programas.
              </span>
            }
            okText="Sí, sacar" cancelText="Cancelar" okButtonProps={{ danger: true }}
            onConfirm={() => handleRemoveEstudianteDePrograma(r)}
          >
            <Tooltip title="Sacar del programa">
              <Button size="small" danger icon={<UserDeleteOutlined />}
                loading={removingEstudianteId === r.id} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const materiasCols = [
    { title: 'Materia', dataIndex: 'nombre', ellipsis: true,
      render: (v, r) => (
        <a className="font-medium" style={{ color: '#2563eb' }}
          onClick={() => navigate(`/inicio/programas/${id}/materias/${r.id}`)}>{v}</a>
      ),
    },
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
      title: '', width: 200,
      render: (_, r) => (
        <Space size={2}>
          <Tooltip title="Abrir aula de la materia"><Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#2563eb' }} onClick={() => navigate(`/inicio/programas/${id}/materias/${r.id}`)} /></Tooltip>
          <Tooltip title="Horarios"><Button type="text" size="small" icon={<ScheduleOutlined />} style={{ color: '#059669' }} onClick={() => setHorarioMateria(r)} /></Tooltip>
          <Tooltip title="Editar"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditMateria(r)} /></Tooltip>
          <Tooltip title="Mover"><Button type="text" size="small" icon={<SwapOutlined />} style={{ color: '#2563eb' }} onClick={() => { setTransferProgramaId(null); setTransferModal({ materia: r, mode: 'mover' }); }} /></Tooltip>
          <Popconfirm title="¿Eliminar materia?" onConfirm={() => handleDeleteMateria(r.id)} okText="Sí" cancelText="No">
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const docentesCols = [
    {
      title: 'Docente',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.nombre_completo}</div>
          {r.especialidad && <div className="text-xs text-gray-400">{r.especialidad}</div>}
        </div>
      ),
    },
    {
      title: 'Email', dataIndex: 'email',
      render: (v) => v
        ? <span className="text-xs flex items-center gap-1"><MailOutlined style={{ color: '#9ca3af' }} />{v}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      title: '', width: 70, align: 'center',
      render: (_, r) => (
        <Popconfirm title="¿Quitar docente del programa?" onConfirm={() => handleRemoveDocente(r.id)}
          okText="Sí" cancelText="No" okButtonProps={{ danger: true }}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />}
            loading={removingDocenteId === r.id} />
        </Popconfirm>
      ),
    },
  ];

  const otrosProgramas = allProgramas.filter((p) => p.id !== parseInt(id));

  const docentesDisponibles = docentes.filter(
    (d) => !programaDocentes.some((pd) => pd.id === d.id)
  );

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
      {/* Contenido: sidebar 20% / contenido 80% */}
      {(() => {
        const tabItems = [

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
                  { label: 'Intensidad horaria', value: programa.intensidad_horaria ? `${programa.intensidad_horaria} horas` : '—' },
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

        // ── ENLACE DE INSCRIPCIÓN ───────────────────────────────────────────
        {
          key: 'enlace',
          label: <span><LinkOutlined /> Enlaces de inscripción</span>,
          children: (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <Text type="secondary" className="text-sm dark:text-[#a8a59e] max-w-md">
                  Creá un enlace de inscripción por coordinador. Cada uno comparte el suyo y
                  recibe automáticamente a los estudiantes que se inscriben con ese enlace
                  (se registran si son nuevos o se unen si ya tienen cuenta).
                </Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={openJoinModal}
                  style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
                  Nuevo enlace
                </Button>
              </div>

              <Spin spinning={loadingJoinLinks}>
                {joinLinks.length === 0 ? (
                  <Card size="small" className="rounded-xl dark:bg-[#30302e] dark:border-[#403e3a]">
                    <Empty description="Aún no hay enlaces de inscripción" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openJoinModal}
                        style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
                        Crear el primer enlace
                      </Button>
                    </Empty>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {joinLinks.map((link) => (
                      <Card key={link.id} size="small" className="rounded-xl dark:bg-[#30302e] dark:border-[#403e3a]">
                        {/* Coordinador dueño del enlace + estado + eliminar */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <Avatar size="small" style={{ backgroundColor: PRIMARY }} icon={<UserOutlined />} />
                            <span className="font-semibold text-sm dark:text-[#faf9f5] truncate">
                              {coordinadorNombre(link.coordinador_id)}
                            </span>
                            <Tag color={link.enabled ? 'green' : 'default'}>
                              {link.enabled ? 'Activo' : 'Desactivado'}
                            </Tag>
                          </span>
                          <Popconfirm title="¿Eliminar este enlace?" okText="Sí, eliminar" cancelText="Cancelar"
                            okButtonProps={{ danger: true }} onConfirm={() => handleDeleteJoinLink(link)}>
                            <Tooltip title="Eliminar enlace">
                              <Button size="small" type="text" danger icon={<DeleteOutlined />} loading={busyLinkId === link.id} />
                            </Tooltip>
                          </Popconfirm>
                        </div>

                        {/* URL + copiar */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input readOnly value={joinUrl(link.token)} style={{ maxWidth: 360 }} />
                          <Button icon={<CopyOutlined />} onClick={() => handleCopyJoinLink(link.token)}>Copiar</Button>
                        </div>

                        {/* Activar/desactivar + regenerar */}
                        <div className="flex items-center gap-4 flex-wrap mt-2">
                          <span className="flex items-center gap-2">
                            <Switch size="small" checked={!!link.enabled} loading={busyLinkId === link.id}
                              onChange={(v) => handleToggleJoinLink(link, v)} />
                            <Text className="text-xs dark:text-[#a8a59e]">
                              {link.enabled ? 'Enlace activo' : 'Enlace desactivado'}
                            </Text>
                          </span>
                          <Popconfirm title="¿Regenerar el enlace? El actual dejará de funcionar."
                            okText="Sí, regenerar" cancelText="Cancelar" onConfirm={() => handleRegenerateJoinLink(link)}>
                            <Button size="small" icon={<ReloadOutlined />} loading={busyLinkId === link.id}>Regenerar</Button>
                          </Popconfirm>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Spin>
            </div>
          ),
        },

        // ── DOCENTES ────────────────────────────────────────────────────────
        {
          key: 'docentes',
          label: <span><SolutionOutlined /> Docentes</span>,
          children: (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Text type="secondary" className="text-sm">
                  Docentes asociados a este programa. Podés crear uno nuevo o asociar uno existente.
                </Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDocente}
                  style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
                  Nuevo docente
                </Button>
              </div>

              <Card size="small" className="rounded-xl">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Text type="secondary" className="text-xs">Asociar docente existente al programa</Text>
                    <Select
                      style={{ width: '100%' }}
                      placeholder={docentes.length === 0
                        ? 'Aún no hay docentes — crea el primero con "Nuevo docente"'
                        : docentesDisponibles.length
                          ? 'Selecciona un docente'
                          : 'Todos los docentes ya están asociados'}
                      value={addDocenteId}
                      onChange={setAddDocenteId}
                      showSearch
                      allowClear
                      disabled={!docentesDisponibles.length}
                      filterOption={(input, opt) => (opt.children || '').toLowerCase().includes(input.toLowerCase())}
                    >
                      {docentesDisponibles.map((d) => (
                        <Select.Option key={d.id} value={d.id}>{d.nombre_completo}</Select.Option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={addingDocente}
                    disabled={!addDocenteId}
                    onClick={handleAddDocente}
                    style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}
                  >
                    Asociar
                  </Button>
                </div>
              </Card>

              <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
                <Spin spinning={loadingProgramaDocentes}>
                  <Table columns={docentesCols} dataSource={programaDocentes} rowKey="id" size="small"
                    pagination={false}
                    locale={{ emptyText: 'No hay docentes asociados a este programa' }} />
                </Spin>
              </Card>
            </div>
          ),
        },

        // ── ESTUDIANTES ─────────────────────────────────────────────────────
        {
          key: 'estudiantes',
          label: <span><TeamOutlined /> Estudiantes</span>,
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
        ];
        const active = tabItems.find((t) => t.key === activeTab) || tabItems[0];
        return (
          <div className="flex flex-col md:flex-row gap-3 items-start">
            {/* Sidebar 20% (sin fondo) */}
            <div className="w-full md:w-[20%] md:flex-shrink-0">
              {/* Volver a programas (compacto, ahorra espacio) */}
              <button
                type="button"
                onClick={() => navigate('/inicio/programas')}
                className="flex items-center gap-1.5 mb-3 px-1 text-sm text-gray-500 dark:text-[#a8a59e] hover:text-gray-800 dark:hover:text-[#faf9f5] transition-colors"
              >
                <ArrowLeftOutlined /> Programas
              </button>

              {/* Apartados del programa */}
              <div className="flex flex-col gap-1 mb-4">
                {tabItems.map((t) => {
                  const isActive = !aulaMateriaId && t.key === active.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => { setActiveTab(t.key); setAulaMateriaId(null); }}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-[#155153] text-white font-semibold'
                          : 'text-gray-600 dark:text-[#a8a59e] hover:bg-gray-100 dark:hover:bg-[#3a3a38]'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Materias del programa — debajo de los apartados; clic abre el aula en el panel */}
              <div>
                <div className="flex items-center justify-between px-3 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
                    Materias
                  </span>
                  <Tooltip title="Nueva materia">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={openCreateMateria}
                    />
                  </Tooltip>
                </div>
                <div className="flex flex-col gap-0.5">
                  {materias.map((m) => {
                    const isSel = aulaMateriaId === m.id;
                    return (
                      <div key={m.id} className="group flex items-center gap-1">
                        <button
                          type="button"
                          title={m.nombre}
                          onClick={() => setAulaMateriaId(m.id)}
                          className={`flex-1 min-w-0 flex items-center gap-1.5 text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isSel
                              ? 'bg-[#155153] text-white font-semibold'
                              : 'text-gray-600 dark:text-[#a8a59e] hover:bg-gray-100 dark:hover:bg-[#3a3a38]'
                          }`}
                        >
                          <UnorderedListOutlined className={isSel ? 'text-white flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                          <span className="truncate">{m.nombre}</span>
                        </button>
                        <Popconfirm
                          title="¿Eliminar esta materia?"
                          description="Se eliminará la materia y su contenido (temas, clases, etc.)."
                          okText="Sí, eliminar"
                          cancelText="Cancelar"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDeleteMateria(m.id)}
                        >
                          <Tooltip title="Eliminar materia">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              className="flex-shrink-0 opacity-60 hover:opacity-100"
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    );
                  })}
                  {materias.length === 0 && (
                    <span className="px-3 py-1 text-xs text-gray-400">Sin materias aún</span>
                  )}
                </div>
              </div>
            </div>
            {/* Contenido 80% — apartado seleccionado o aula completa de la materia */}
            <div className="w-full md:flex-1 min-w-0 md:-mr-5 p-3 md:p-4 bg-white dark:bg-[#30302e] border border-gray-200 dark:border-[#403e3a] rounded-xl min-h-[60vh]">
              {aulaMateriaId ? (
                <MateriaDetalle
                  key={aulaMateriaId}
                  materiaId={aulaMateriaId}
                  programaId={id}
                  embedded
                  onBack={() => setAulaMateriaId(null)}
                  onChanged={fetchMaterias}
                />
              ) : (
                active.children
              )}
            </div>
          </div>
        );
      })()}

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

      {/* ── Modal crear/editar materia ────────────────────────────────────── */}
      <Modal
        title={editingMateria ? 'Editar materia' : 'Nueva materia'}
        open={materiaFormOpen}
        onCancel={() => { setMateriaFormOpen(false); setEditingMateria(null); materiaForm.resetFields(); }}
        onOk={() => materiaForm.submit()}
        okText={editingMateria ? 'Guardar cambios' : 'Crear materia'}
        confirmLoading={savingMateria}
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: PRIMARY, borderColor: PRIMARY } }}
      >
        <Form form={materiaForm} layout="vertical" onFinish={handleSaveMateria} style={{ marginTop: 8 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Matemáticas Básicas" />
          </Form.Item>
          <Form.Item name="docente_id" label="Docente (opcional)">
            <Select placeholder="Selecciona un docente" allowClear showSearch
              filterOption={(input, opt) => (opt.children || '').toLowerCase().includes(input.toLowerCase())}>
              {docentes.map((d) => (
                <Select.Option key={d.id} value={d.id}>{d.nombre_completo}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal editar programa ─────────────────────────────────────────── */}
      <CreateProgramModal
        isOpen={editProgramaOpen}
        onClose={() => setEditProgramaOpen(false)}
        onSuccess={fetchDetalle}
        programToEdit={programa}
      />

      {/* ── Modal nuevo enlace de inscripción ─────────────────────────────── */}
      <Modal
        open={joinModalOpen}
        title="Nuevo enlace de inscripción"
        okText="Generar enlace"
        cancelText="Cancelar"
        onOk={handleCreateJoinLink}
        onCancel={() => setJoinModalOpen(false)}
        confirmLoading={generatingJoinLink}
        okButtonProps={{ style: { backgroundColor: PRIMARY, borderColor: PRIMARY } }}
      >
        <p className="text-sm text-gray-600 dark:text-[#a8a59e] mb-3">
          Elegí el coordinador dueño de este enlace. Los estudiantes que se inscriban
          con él quedarán asignados a ese coordinador.
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder="Selecciona un coordinador"
          value={joinCoordinadorId}
          onChange={setJoinCoordinadorId}
          loading={loadingCoordinadores}
          showSearch
          filterOption={(input, opt) => (opt.children || '').toLowerCase().includes(input.toLowerCase())}
          notFoundContent={
            loadingCoordinadores ? 'Cargando...'
              : coordinadoresDisponibles.length === 0
                ? 'Todos los coordinadores ya tienen un enlace'
                : 'Sin coordinadores'
          }
        >
          {coordinadoresDisponibles.map((u) => (
            <Select.Option key={u.id} value={u.id}>{u.name} ({u.email})</Select.Option>
          ))}
        </Select>
      </Modal>

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
        <p className="text-sm text-gray-600 dark:text-[#a8a59e] mb-3">
          {transferModal?.mode === 'mover'
            ? 'Selecciona el programa destino. Dejará de pertenecer a este programa.'
            : 'Selecciona el programa destino. Se copiará la materia con todo su contenido (temas, clases, PDFs, presentaciones y evaluaciones). El original se mantiene aquí. Puede tardar unos segundos.'}
        </p>
        <Select style={{ width: '100%' }} placeholder="Programa destino" value={transferProgramaId}
          onChange={setTransferProgramaId} showSearch
          filterOption={(i, o) => o.children.toLowerCase().includes(i.toLowerCase())}>
          {otrosProgramas.map((p) => <Select.Option key={p.id} value={p.id}>{p.nombre}</Select.Option>)}
        </Select>
      </Modal>

      {/* ── Drawer avance del estudiante (clases vistas / pendientes) ─────── */}
      <Drawer
        open={!!progresoStudent}
        onClose={() => setProgresoStudent(null)}
        width={640}
        destroyOnClose
        title={progresoStudent
          ? `Avance — ${progresoStudent.nombre} ${progresoStudent.apellido || ''}`
          : 'Avance'}
      >
        <Spin spinning={loadingDetalle}>
          {progresoDetalle && (() => {
            const total = progresoDetalle.total_clases || 0;
            const done = progresoDetalle.completadas || 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const fmt = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
            return (
              <>
                <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-[#262624] border border-gray-100 dark:border-[#403e3a]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-[#faf9f5]">Progreso total</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-[#faf9f5]">{done}/{total} clases</span>
                  </div>
                  <Progress percent={pct} strokeColor={pct === 100 ? '#16a34a' : '#7c3aed'} />
                </div>

                {(!progresoDetalle.materias || progresoDetalle.materias.length === 0) ? (
                  <Empty description="Este programa aún no tiene clases" />
                ) : progresoDetalle.materias.map((mat) => (
                  <div key={mat.id ?? mat.nombre} className="mb-4">
                    <div className="font-semibold text-sm mb-2 text-gray-800 dark:text-[#faf9f5] flex items-center gap-2">
                      <BookOutlined style={{ color: '#2563eb' }} /> {mat.nombre}
                    </div>
                    <Collapse
                      items={mat.temas.map((tema) => {
                        const tDone = tema.clases.filter((c) => c.estado === 'completado').length;
                        const tTotal = tema.clases.length;
                        return {
                          key: String(tema.id),
                          label: (
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-medium truncate">{tema.titulo}</span>
                              <Tag color={tTotal > 0 && tDone === tTotal ? 'success' : 'default'}>{tDone}/{tTotal}</Tag>
                            </div>
                          ),
                          children: (
                            <List
                              size="small"
                              dataSource={tema.clases}
                              rowKey="id"
                              locale={{ emptyText: 'Sin clases' }}
                              renderItem={(c) => (
                                <List.Item>
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <span className="flex items-center gap-2 min-w-0">
                                      {c.estado === 'completado'
                                        ? <CheckCircleOutlined style={{ color: '#16a34a', flexShrink: 0 }} />
                                        : <ClockCircleOutlined style={{ color: '#9ca3af', flexShrink: 0 }} />}
                                      <span className={`truncate ${c.estado === 'completado' ? 'text-gray-700 dark:text-[#faf9f5]' : 'text-gray-500 dark:text-[#a8a59e]'}`}>
                                        {c.titulo}
                                      </span>
                                    </span>
                                    {c.estado === 'completado'
                                      ? <span className="text-xs text-green-600 flex-shrink-0 whitespace-nowrap">Vista{c.fecha_completado ? ` · ${fmt(c.fecha_completado)}` : ''}</span>
                                      : <Tag className="!m-0" color="default">Pendiente</Tag>}
                                  </div>
                                </List.Item>
                              )}
                            />
                          ),
                        };
                      })}
                    />
                  </div>
                ))}
              </>
            );
          })()}
        </Spin>
      </Drawer>

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

      {/* ── Modal crear docente ───────────────────────────────────────────── */}
      <Modal
        title="Nuevo docente"
        open={docenteModalOpen}
        onCancel={() => setDocenteModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className="mb-3 p-3 bg-teal-50 border border-teal-100 rounded-xl text-sm text-teal-700">
          <SolutionOutlined className="mr-2" />
          Al crearlo, el docente quedará <strong>asociado automáticamente</strong> a este programa.
        </div>
        <Form form={docenteForm} layout="vertical" onFinish={handleCreateDocente} style={{ marginTop: 8 }}>
          <Form.Item name="nombre_completo" label="Nombre completo"
            rules={[{ required: true, message: 'Ingresa el nombre completo' }]}>
            <Input prefix={<SolutionOutlined style={{ color: '#d1d5db' }} />} placeholder="Ej: Juan Pérez" />
          </Form.Item>
          <Form.Item name="email" label="Email"
            rules={[
              { required: true, message: 'Ingresa el email' },
              { type: 'email', message: 'El email no es válido' },
            ]}>
            <Input prefix={<MailOutlined style={{ color: '#d1d5db' }} />} placeholder="docente@correo.com" />
          </Form.Item>
          <Form.Item name="especialidad" label="Especialidad (opcional)">
            <Input placeholder="Ej: Matemáticas" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDocenteModalOpen(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={savingNewDocente}
              style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
              Crear y asociar
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Horario drawer ────────────────────────────────────────────────── */}
      <HorarioDrawer
        materia={horarioMateria}
        programa={programa}
        onClose={() => setHorarioMateria(null)}
      />

      {/* ── Modal razón de archivado (archiva al estudiante globalmente) ────── */}
      <Modal
        open={archiveModal.open}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
            <span>Archivar estudiante</span>
          </div>
        }
        okText="Archivar"
        cancelText="Cancelar"
        okButtonProps={{
          style: { background: '#fa8c16', borderColor: '#fa8c16' },
          disabled: !archiveReason || (archiveReason === 'Otro motivo' && !archiveCustomReason.trim()),
          loading: archivingEstudiante,
        }}
        onOk={confirmArchiveEstudiante}
        onCancel={() => setArchiveModal({ open: false, studentId: null, studentName: '' })}
      >
        <p className="mb-4 text-gray-600 dark:text-[#a8a59e]">
          ¿Por qué vas a archivar a <strong>{archiveModal.studentName}</strong>? El estudiante
          quedará archivado y saldrá de la lista de estudiantes activos.
        </p>

        <Radio.Group
          value={archiveReason}
          onChange={(e) => { setArchiveReason(e.target.value); setArchiveCustomReason(''); }}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {ARCHIVE_REASONS.map((reason) => (
              <Radio key={reason} value={reason} style={{ padding: '4px 0' }}>
                {reason}
              </Radio>
            ))}
          </Space>
        </Radio.Group>

        {archiveReason === 'Otro motivo' && (
          <Input.TextArea
            style={{ marginTop: 12 }}
            placeholder="Describe el motivo..."
            rows={3}
            maxLength={300}
            showCount
            value={archiveCustomReason}
            onChange={(e) => setArchiveCustomReason(e.target.value)}
            autoFocus
          />
        )}
      </Modal>
    </div>
  );
}
