import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tabs, Card, Button, Tag, Table, Typography, Spin, Empty, Badge, Collapse, Radio,
  Modal, Drawer, Form, Input, Switch, InputNumber, Space, Tooltip, Popconfirm,
  message, Upload, Select, Divider, List, Avatar, DatePicker, Dropdown, Progress, Grid
} from 'antd';
import {
  ArrowLeftOutlined, BookOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  FilePdfOutlined, EyeOutlined,
  CommentOutlined, SendOutlined, TeamOutlined, BuildOutlined, SolutionOutlined,
  UserOutlined, ClockCircleOutlined, UnorderedListOutlined,
  MoreOutlined, ScheduleOutlined, SwapOutlined, CopyOutlined,
  CheckCircleOutlined, StopOutlined, PictureOutlined,
  PaperClipOutlined, LinkOutlined, CameraOutlined, CloseOutlined,
  FileWordOutlined, FileExcelOutlined, FileZipOutlined, FileImageOutlined,
  FileOutlined, DownloadOutlined, PlayCircleOutlined, VideoCameraOutlined,
  UploadOutlined, TrophyOutlined, FundProjectionScreenOutlined, FilePptOutlined,
  Html5Outlined, ArrowRightOutlined, ReloadOutlined, LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import {
  getMateriaDetalle, updateMateria, deleteMateria, createMateria, duplicarMateria, uploadMateriaBanner,
  getMateriaProgresoEstudiante
} from '../../services/materias/serviceMateria';
import { getAllDocentes } from '../../services/docentes/serviceDocente';
import HorarioDrawer from '../Horarios/HorarioDrawer';
import { getForoPosts, createForoPost, deleteForoPost } from '../../services/foro/serviceForo';
import {
  getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation,
  assignByStudentPrograms, getStudentAssignments
} from '../../services/evaluation/evaluationService';
import {
  getClasesByModulo, getClaseById, createClase, updateClase, deleteClase,
  uploadClaseVideo, uploadClasePdfs, deleteClasePdf,
  uploadClasePresentaciones, deleteClasePresentacion
} from '../../services/clases/serviceClase';
import { decodeJwt } from '../../utils/jwt.js';
import StudentClaseDetalle from '../Clases/StudentClaseDetalle';
import ClaseExamen from '../Clases/ClaseExamen';
import EvaluationQuestionsDrawer from '../Evaluations/Admin/EvaluationQuestionsDrawer';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const API = import.meta.env.VITE_API_BACKEND;
const API_AUTH = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY = '#155153';
const PURPLE  = '#7c3aed';
const AMBER   = '#d97706';

const AUTOR_META = {
  admin:      { color: '#155153', label: 'Admin' },
  docente:    { color: '#2563eb', label: 'Docente' },
  estudiante: { color: '#7c3aed', label: 'Estudiante' },
};

// Avatar del autor de una publicación: si tiene foto de perfil se muestra; si no,
// iniciales del nombre (estilo Microsoft) en un círculo con color por persona.
const initialsFromName = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
const AVATAR_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#dc2626', '#4f46e5', '#0891b2', '#ca8a04'];
const colorFromName = (name) => {
  const s = name || '?';
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// Presentaciones que ve el estudiante en el visor 16:9 (PDF/PPTX/SVG/HTML).
const PRES_EXT = /\.(pdf|pptx|ppt|svg|html?)$/i;
const presTipoIcon = (tipo) => {
  if (tipo === 'pdf') return <FilePdfOutlined style={{ color: '#ef4444', flexShrink: 0 }} />;
  if (tipo === 'svg') return <FileImageOutlined style={{ color: '#0ea5e9', flexShrink: 0 }} />;
  if (tipo === 'html') return <Html5Outlined style={{ color: '#6366f1', flexShrink: 0 }} />;
  return <FilePptOutlined style={{ color: '#ea580c', flexShrink: 0 }} />; // pptx / ppt
};

export default function MateriaDetalle({
  materiaId: materiaIdProp,
  programaId: programaIdProp,
  embedded = false,
  readOnly = false,
  onBack,
  onChanged,
  onImmersiveChange,
} = {}) {
  const params = useParams();
  const navigate = useNavigate();
  const materiaId = materiaIdProp ?? params.materiaId;
  const programaId = programaIdProp ?? params.id;

  // En móvil (< md) condensamos las acciones de cada tema en un menú para que
  // el encabezado del tema no se desborde en pantallas angostas.
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [materia, setMateria] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Foro ───────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState([]);
  const [viewer, setViewer] = useState(null);
  // Mapa autor_id → avatar_url (foto de perfil) de los usuarios del negocio.
  // Solo se puede consultar con token admin; los estudiantes ven iniciales.
  const [avatarMap, setAvatarMap] = useState({});
  const [loadingForo, setLoadingForo] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingLinks, setPendingLinks] = useState([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkForm] = Form.useForm();

  // ─── Banner ─────────────────────────────────────────────────────────────
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // ─── Temas (módulos) ────────────────────────────────────────────────────
  const [modulos, setModulos] = useState([]);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [moduloDrawerOpen, setModuloDrawerOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState(null);
  const [savingModulo, setSavingModulo] = useState(false);
  const [moduloForm] = Form.useForm();

  // ─── Clase abierta por el estudiante (readOnly) ────────────────────────────
  // En modo estudiante, abrir una clase NO navega a otra ruta: se muestra el
  // contenido de la clase embebido aquí mismo (dentro del área de contenido del
  // dashboard). null = mostrar la materia (temas/foro/evaluaciones).
  const [studentClaseId, setStudentClaseId] = useState(null);

  // Examen abierto por el estudiante (readOnly): igual que una clase, se muestra
  // embebido aquí mismo (sin navegar a /evaluaciones/asignacion/:id). null = no hay
  // examen abierto. Guarda { asignacion_id, titulo, descripcion, estado, calificacion, moduloId }.
  const [studentExamen, setStudentExamen] = useState(null);

  // Progreso del estudiante en la materia (nivel clase) para el botón
  // "Iniciar materia" / "Continuar · Clase N" del dashboard. Solo readOnly.
  const [materiaProgreso, setMateriaProgreso] = useState(null);

  // Al abrir/cerrar una clase o examen (estudiante) avisamos al portal para ocultar
  // el sidebar y dar vista inmersiva; al desmontar la materia lo restauramos.
  useEffect(() => {
    if (!readOnly) return undefined;
    onImmersiveChange?.(!!studentClaseId || !!studentExamen);
    return () => onImmersiveChange?.(false);
  }, [readOnly, studentClaseId, studentExamen, onImmersiveChange]);

  // ─── Clases (dentro de cada Tema, en el Collapse) ──────────────────────────
  const [clasesByModulo, setClasesByModulo] = useState({});
  const [loadingClasesModulo, setLoadingClasesModulo] = useState(null);
  const [claseDrawerOpen, setClaseDrawerOpen] = useState(false);
  const [activeModuloId, setActiveModuloId] = useState(null);
  const [editingClase, setEditingClase] = useState(null);
  const [savingClase, setSavingClase] = useState(false);
  const [claseVideoMode, setClaseVideoMode] = useState('ninguno');
  const [claseVideoFile, setClaseVideoFile] = useState(null);
  const [claseForm] = Form.useForm();
  const [clasePdfFiles, setClasePdfFiles] = useState([]);
  const [existingClasePdfs, setExistingClasePdfs] = useState([]);
  const [clasePresFiles, setClasePresFiles] = useState([]);
  const [existingClasePres, setExistingClasePres] = useState([]);
  const [deletingClasePresId, setDeletingClasePresId] = useState(null);

  // ─── Exámenes de un Tema (se muestran siempre al final de sus clases) ──────
  const [evalsByModulo, setEvalsByModulo] = useState({});
  const [examenModalOpen, setExamenModalOpen] = useState(false);
  const [examenTargetModuloId, setExamenTargetModuloId] = useState(null);
  const [examenMode, setExamenMode] = useState('nueva'); // 'nueva' | 'existente'
  const [savingExamen, setSavingExamen] = useState(false);
  const [examenForm] = Form.useForm();

  // ─── Evaluaciones ───────────────────────────────────────────────────────
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [savingEval, setSavingEval] = useState(false);
  const [assigningEvalId, setAssigningEvalId] = useState(null);
  const [evalForm] = Form.useForm();

  // Drawer de preguntas: se abre desde la tabla de evaluaciones y desde los
  // exámenes de un tema, para ver/editar las preguntas SIN salir del programa.
  // Guarda { id, moduloId? } — moduloId permite refrescar el tema al cambiar.
  const [questionsDrawerEval, setQuestionsDrawerEval] = useState(null);

  // ─── Gestión de la materia (menú ⋯) ─────────────────────────────────────
  const [docentes, setDocentes] = useState([]);
  const [allProgramas, setAllProgramas] = useState([]);
  const [editMateriaOpen, setEditMateriaOpen] = useState(false);
  const [savingMateriaEdit, setSavingMateriaEdit] = useState(false);
  const [materiaEditForm] = Form.useForm();
  const [transferModal, setTransferModal] = useState(null); // { mode: 'mover' | 'duplicar' }
  const [transferProgramaId, setTransferProgramaId] = useState(null);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [horarioOpen, setHorarioOpen] = useState(false);

  const token = localStorage.getItem('authToken');
  const headers = { Authorization: `Bearer ${token}` };

  // En modo solo-lectura (portal de estudiante) no hay authToken de admin —
  // usamos el token del estudiante y su id (del propio JWT) para las llamadas
  // *_estudiante, que son las únicas a las que un estudiante tiene acceso.
  const studentToken = localStorage.getItem('student_portal_token');
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };
  const studentId = readOnly ? decodeJwt(studentToken)?.studentId : null;

  // ─── Fetchers ─────────────────────────────────────────────────────────────
  const fetchMateria = useCallback(async () => {
    setLoading(true);
    try {
      // En modo admin (readOnly=false) se envía el token de admin; en el portal
      // del estudiante (readOnly=true) se envía el token de estudiante. Así el
      // backend scopea por business_id o por inscripción según corresponda.
      const data = await getMateriaDetalle(materiaId, { asStudent: readOnly });
      setMateria(data);
    } catch {
      message.error('Error al cargar la materia');
    } finally {
      setLoading(false);
    }
  }, [materiaId, readOnly]);

  const fetchForo = useCallback(async () => {
    setLoadingForo(true);
    try {
      const data = await getForoPosts(materiaId);
      setPosts(data.posts || []);
      setViewer(data.viewer || null);
    } catch { /* ignore */ }
    finally { setLoadingForo(false); }
  }, [materiaId]);

  // Cargar las fotos de perfil de los usuarios del negocio (para las publicaciones
  // de autores admin/docente). Solo si el que ve es admin: el endpoint requiere
  // token de negocio; con token de estudiante daría 401 → se quedan las iniciales.
  useEffect(() => {
    if (viewer?.tipo !== 'admin' || !API_AUTH) return;
    let cancel = false;
    axios.get(`${API_AUTH}/api/businesses/my/users`, { headers })
      .then(({ data }) => {
        if (cancel) return;
        const map = {};
        (data || []).forEach((u) => { if (u.avatar_url) map[String(u.id)] = u.avatar_url; });
        setAvatarMap(map);
      })
      .catch(() => { /* silencioso: se muestran iniciales */ });
    return () => { cancel = true; };
  }, [viewer?.tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchModulos = useCallback(async () => {
    setLoadingModulos(true);
    try {
      if (readOnly) {
        if (!studentId) return setModulos([]);
        const { data } = await axios.get(`${API}/api/modulos/estudiante/${studentId}`, { headers: studentHeaders });
        const all = data.modulos || [];
        setModulos(all.filter((m) => String(m.materia_id) === String(materiaId)));
      } else {
        const { data } = await axios.get(`${API}/api/modulos`, { headers });
        const all = data.modulos || [];
        setModulos(all.filter((m) => String(m.materia_id) === String(materiaId)));
      }
    } catch { /* ignore */ }
    finally { setLoadingModulos(false); }
  }, [materiaId, readOnly, studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvaluaciones = useCallback(async () => {
    setLoadingEvals(true);
    try {
      if (readOnly) {
        if (!studentId) return setEvaluaciones([]);
        const data = await getStudentAssignments(studentId);
        const all = data.asignaciones || (Array.isArray(data) ? data : []);
        setEvaluaciones(all.filter((e) => String(e.materia_id) === String(materiaId)));
      } else {
        const data = await getEvaluations({ materia_id: materiaId });
        setEvaluaciones(Array.isArray(data) ? data : (data.evaluaciones || []));
      }
    } catch { /* ignore */ }
    finally { setLoadingEvals(false); }
  }, [materiaId, readOnly, studentId]);

  useEffect(() => {
    fetchMateria();
    fetchForo();
    fetchModulos();
    fetchEvaluaciones();
  }, [fetchMateria, fetchForo, fetchModulos, fetchEvaluaciones]);

  // Progreso a nivel clase (solo readOnly): alimenta el botón iniciar/continuar.
  const fetchProgresoMateria = useCallback(async () => {
    if (!readOnly) return;
    try { setMateriaProgreso(await getMateriaProgresoEstudiante(materiaId)); }
    catch { /* ignore */ }
  }, [materiaId, readOnly]);

  // Refresca el progreso al entrar al dashboard y al volver de una clase/examen
  // (studentClaseId/studentExamen vuelven a null), para reflejar el avance.
  useEffect(() => {
    if (readOnly && !studentClaseId && !studentExamen) fetchProgresoMateria();
  }, [readOnly, studentClaseId, studentExamen, fetchProgresoMateria]);

  // Catálogos para el menú de gestión (docentes + programas destino) — solo
  // aplica al admin; el estudiante nunca ve ese menú.
  useEffect(() => {
    if (readOnly) return;
    getAllDocentes().then(setDocentes).catch(() => {});
    axios.get(`${API}/api/programas`, { headers })
      .then(({ data }) => setAllProgramas(data || []))
      .catch(() => {});
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Foro: acciones ─────────────────────────────────────────────────────
  const canPublish = newPost.trim() || pendingFiles.length > 0 || pendingLinks.length > 0;

  const handlePublish = async () => {
    if (!canPublish) return;
    setPosting(true);
    try {
      await createForoPost(materiaId, {
        contenido: newPost.trim(),
        archivos: pendingFiles,
        enlaces: pendingLinks,
      });
      setNewPost('');
      setPendingFiles([]);
      setPendingLinks([]);
      fetchForo();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo publicar');
    } finally {
      setPosting(false);
    }
  };

  const handleAddLink = (values) => {
    setPendingLinks((prev) => [...prev, { url: values.url.trim(), titulo: values.titulo?.trim() }]);
    linkForm.resetFields();
    setLinkModalOpen(false);
  };

  const fileIconFor = (nombre = '') => {
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ef4444' }} />;
    if (['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#2563eb' }} />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined style={{ color: '#16a34a' }} />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileZipOutlined style={{ color: '#d97706' }} />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <FileImageOutlined style={{ color: '#7c3aed' }} />;
    return <FileOutlined style={{ color: '#6b7280' }} />;
  };

  // ─── Banner: acciones ───────────────────────────────────────────────────
  const handleBannerChange = async (file) => {
    if (!file.type.startsWith('image/')) { message.error('Selecciona una imagen.'); return false; }
    if (file.size > 8 * 1024 * 1024) { message.error('La imagen supera 8 MB.'); return false; }
    setUploadingBanner(true);
    try {
      await uploadMateriaBanner(materiaId, file);
      message.success('Banner actualizado');
      fetchMateria();
    } catch {
      message.error('Error al subir el banner');
    } finally {
      setUploadingBanner(false);
    }
    return false;
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await createForoPost(materiaId, { contenido: replyText.trim(), parent_id: parentId });
      setReplyText('');
      setReplyTo(null);
      fetchForo();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo responder');
    } finally {
      setPosting(false);
    }
  };

  const canDelete = (post) => {
    if (!viewer) return false;
    if (viewer.tipo === 'admin') return true;
    return post.autor_tipo === 'estudiante' && Number(post.autor_id) === Number(viewer.id);
  };

  const handleDeletePost = async (postId) => {
    setDeletingPostId(postId);
    try {
      await deleteForoPost(postId);
      fetchForo();
    } catch (e) {
      message.error(e?.response?.data?.message || 'No se pudo eliminar');
    } finally {
      setDeletingPostId(null);
    }
  };

  // ─── Temas (módulos): agrupadores de clases; solo título, evaluación de
  // cierre, orden y estado — el contenido real vive en las Clases del tema. ──
  const openCreateModulo = () => {
    setEditingModulo(null);
    moduloForm.resetFields();
    moduloForm.setFieldsValue({ orden: modulos.length });
    setModuloDrawerOpen(true);
  };

  const openEditModulo = (m) => {
    setEditingModulo(m);
    moduloForm.setFieldsValue(m);
    setModuloDrawerOpen(true);
  };

  const handleSaveModulo = async (values) => {
    setSavingModulo(true);
    try {
      let moduloId;
      if (editingModulo) {
        await axios.put(`${API}/api/modulos/${editingModulo.id}`, { ...values, activa: true }, { headers });
        moduloId = editingModulo.id;
        message.success('Tema actualizado');
      } else {
        const { data } = await axios.post(
          `${API}/api/modulos`,
          { ...values, materia_id: parseInt(materiaId) },
          { headers }
        );
        moduloId = data.modulo.id;
        message.success('Tema creado y asignado a los estudiantes de la materia');
      }
      setModuloDrawerOpen(false);
      fetchModulos();
    } catch { message.error('Error al guardar el tema'); }
    finally { setSavingModulo(false); }
  };

  const handleDeleteModulo = async (moduloId) => {
    try {
      await axios.delete(`${API}/api/modulos/${moduloId}`, { headers });
      message.success('Tema eliminado');
      fetchModulos();
    } catch { message.error('Error al eliminar el tema'); }
  };

  // ─── Clases (dentro de cada Tema) ──────────────────────────────────────────
  // En modo solo-lectura, un solo endpoint (*_estudiante) trae clases +
  // exámenes del tema a la vez, así que también llena evalsByModulo aquí.
  const fetchClasesDeModulo = async (moduloId) => {
    setLoadingClasesModulo(moduloId);
    try {
      if (readOnly) {
        const { data } = await axios.get(`${API}/api/modulos/${moduloId}/estudiante`, { headers: studentHeaders });
        setClasesByModulo((prev) => ({ ...prev, [moduloId]: data.clases || [] }));
        setEvalsByModulo((prev) => ({ ...prev, [moduloId]: data.evaluaciones || [] }));
      } else {
        const clases = await getClasesByModulo(moduloId);
        setClasesByModulo((prev) => ({ ...prev, [moduloId]: clases }));
      }
    } catch { /* ignore */ }
    finally { setLoadingClasesModulo(null); }
  };

  const handleCollapseChange = (keys) => {
    const opened = Array.isArray(keys) ? keys : [keys];
    opened.forEach((k) => {
      if (clasesByModulo[k] === undefined) fetchClasesDeModulo(k);
      if (!readOnly && evalsByModulo[k] === undefined) fetchEvalsDeModulo(k);
    });
  };

  const openCreateClase = (moduloId) => {
    setEditingClase(null);
    setActiveModuloId(moduloId);
    setClaseVideoMode('ninguno');
    setClaseVideoFile(null);
    setClasePdfFiles([]);
    setExistingClasePdfs([]);
    setClasePresFiles([]);
    setExistingClasePres([]);
    claseForm.resetFields();
    setClaseDrawerOpen(true);
  };

  const openEditClase = async (moduloId, clase) => {
    setEditingClase(clase);
    setActiveModuloId(moduloId);
    setClaseVideoMode(clase.video_url ? 'enlace' : 'ninguno');
    setClaseVideoFile(null);
    setClasePdfFiles([]);
    setExistingClasePdfs([]);
    setClasePresFiles([]);
    setExistingClasePres([]);
    claseForm.setFieldsValue(clase);
    setClaseDrawerOpen(true);
    try {
      const { pdfs, presentaciones } = await getClaseById(clase.id);
      setExistingClasePdfs(pdfs || []);
      setExistingClasePres(presentaciones || []);
    } catch { /* ignore */ }
  };

  const handleSaveClase = async (values) => {
    setSavingClase(true);
    try {
      const payload = {
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        video_url: claseVideoMode === 'enlace' ? (values.video_url || null) : null,
      };
      let claseId;
      if (editingClase) {
        await updateClase(editingClase.id, payload);
        claseId = editingClase.id;
      } else {
        const nueva = await createClase(activeModuloId, {
          ...payload,
          orden: clasesByModulo[activeModuloId]?.length || 0,
        });
        claseId = nueva.id;
      }
      if (claseVideoMode === 'archivo' && claseVideoFile) {
        await uploadClaseVideo(claseId, claseVideoFile);
      }
      if (clasePdfFiles.length) {
        await uploadClasePdfs(claseId, clasePdfFiles);
      }
      if (clasePresFiles.length) {
        await uploadClasePresentaciones(claseId, clasePresFiles);
      }
      message.success(editingClase ? 'Clase actualizada' : 'Clase creada');
      setClaseDrawerOpen(false);
      fetchClasesDeModulo(activeModuloId);
      fetchModulos(); // refresca total_clases → mantiene la numeración continua correcta
    } catch { message.error('Error al guardar la clase'); }
    finally { setSavingClase(false); }
  };

  const handleDeleteExistingPdf = async (claseId, pdfId) => {
    try {
      await deleteClasePdf(claseId, pdfId);
      setExistingClasePdfs((prev) => prev.filter((p) => p.id !== pdfId));
    } catch { message.error('Error al eliminar el PDF'); }
  };

  const handleDeleteExistingPres = async (claseId, presId) => {
    setDeletingClasePresId(presId);
    try {
      await deleteClasePresentacion(claseId, presId);
      setExistingClasePres((prev) => prev.filter((p) => p.id !== presId));
      message.success('Presentación eliminada');
    } catch { message.error('Error al eliminar la presentación'); }
    finally { setDeletingClasePresId(null); }
  };

  const handleDeleteClase = async (moduloId, claseId) => {
    try {
      await deleteClase(claseId);
      message.success('Clase eliminada');
      fetchClasesDeModulo(moduloId);
      fetchModulos(); // refresca total_clases → mantiene la numeración continua correcta
    } catch { message.error('Error al eliminar la clase'); }
  };

  // ─── Exámenes de un Tema: se vinculan vía modulo_evaluaciones y siempre se
  // renderizan después de las clases del tema (lista aparte, concatenada al final). ─
  const fetchEvalsDeModulo = async (moduloId) => {
    try {
      const { data } = await axios.get(`${API}/api/modulos/${moduloId}`, { headers });
      setEvalsByModulo((prev) => ({ ...prev, [moduloId]: data.evaluaciones || [] }));
    } catch { /* ignore */ }
  };

  const openAddExamen = (moduloId) => {
    setExamenTargetModuloId(moduloId);
    setExamenMode('nueva');
    examenForm.resetFields();
    examenForm.setFieldsValue({ activa: true });
    setExamenModalOpen(true);
  };

  const handleSaveExamen = async (values) => {
    setSavingExamen(true);
    try {
      let evaluacionId = values.evaluacion_id;
      if (examenMode === 'nueva') {
        const payload = {
          titulo: values.titulo,
          descripcion: values.descripcion || null,
          programa_ids: materia?.programa_id ? [materia.programa_id] : [],
          materia_id: parseInt(materiaId),
          intentos_max: values.intentos_max || null,
          tiempo_limite_min: values.tiempo_limite_min || null,
          activa: values.activa ?? true,
        };
        if (values.rango_fechas?.length === 2) {
          payload.fecha_inicio = values.rango_fechas[0].toISOString();
          payload.fecha_fin = values.rango_fechas[1].toISOString();
        }
        const { evaluacion } = await createEvaluation(payload);
        evaluacionId = evaluacion.id;
        fetchEvaluaciones();
      }
      await axios.post(
        `${API}/api/modulos/${examenTargetModuloId}/evaluaciones`,
        { evaluacion_id: evaluacionId },
        { headers }
      );
      message.success('Examen agregado al final del tema');
      setExamenModalOpen(false);
      fetchEvalsDeModulo(examenTargetModuloId);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.response?.data?.error || 'Error al agregar el examen');
    } finally {
      setSavingExamen(false);
    }
  };

  const handleRemoveExamenDeModulo = async (moduloId, evalId) => {
    try {
      await axios.delete(`${API}/api/modulos/${moduloId}/evaluaciones/${evalId}`, { headers });
      message.success('Examen quitado del tema');
      fetchEvalsDeModulo(moduloId);
    } catch { message.error('Error al quitar el examen'); }
  };

  // ─── Evaluaciones: acciones ───────────────────────────────────────────────
  const openCreateEval = () => {
    setEditingEval(null);
    evalForm.resetFields();
    evalForm.setFieldsValue({ activa: true });
    setEvalModalOpen(true);
  };

  const openEditEval = (ev) => {
    setEditingEval(ev);
    evalForm.setFieldsValue({
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      intentos_max: ev.intentos_max || undefined,
      tiempo_limite_min: ev.tiempo_limite_min || undefined,
      activa: ev.activa,
      rango_fechas: ev.fecha_inicio && ev.fecha_fin
        ? [dayjs(ev.fecha_inicio), dayjs(ev.fecha_fin)] : undefined,
    });
    setEvalModalOpen(true);
  };

  const handleSaveEval = async (values) => {
    setSavingEval(true);
    try {
      const payload = {
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        programa_ids: materia?.programa_id ? [materia.programa_id] : [],
        materia_id: parseInt(materiaId),
        intentos_max: values.intentos_max || null,
        tiempo_limite_min: values.tiempo_limite_min || null,
        activa: values.activa,
      };
      if (values.rango_fechas?.length === 2) {
        payload.fecha_inicio = values.rango_fechas[0].toISOString();
        payload.fecha_fin = values.rango_fechas[1].toISOString();
      } else {
        payload.fecha_inicio = null;
        payload.fecha_fin = null;
      }
      if (editingEval) {
        await updateEvaluation(editingEval.id, payload);
        message.success('Evaluación actualizada');
      } else {
        await createEvaluation(payload);
        message.success('Evaluación creada en la materia');
      }
      setEvalModalOpen(false);
      evalForm.resetFields();
      setEditingEval(null);
      fetchEvaluaciones();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Error al guardar la evaluación');
    } finally {
      setSavingEval(false);
    }
  };

  const handleDeleteEval = async (evalId) => {
    try {
      await deleteEvaluation(evalId);
      message.success('Evaluación eliminada');
      fetchEvaluaciones();
    } catch { message.error('Error al eliminar la evaluación'); }
  };

  const handleAssignEval = async (ev) => {
    if (!materia?.programa_id) return message.warning('La materia no tiene programa asociado.');
    setAssigningEvalId(ev.id);
    try {
      await assignByStudentPrograms(ev.id, { programa_id: materia.programa_id });
      message.success('Evaluación asignada a los estudiantes del programa');
    } catch {
      message.error('Error al asignar la evaluación');
    } finally {
      setAssigningEvalId(null);
    }
  };

  // ─── Gestión de la materia (acciones del menú ⋯) ──────────────────────────
  const openEditMateria = () => {
    materiaEditForm.setFieldsValue({ nombre: materia.nombre, docente_id: materia.docente_id || undefined });
    setEditMateriaOpen(true);
  };

  const handleSaveMateriaEdit = async (values) => {
    setSavingMateriaEdit(true);
    try {
      await updateMateria(materia.id, {
        nombre: values.nombre,
        docente_id: values.docente_id || null,
        programa_id: materia.programa_id,
        activa: materia.activa,
      });
      message.success('Materia actualizada');
      setEditMateriaOpen(false);
      fetchMateria();
      onChanged?.();
    } catch { message.error('Error al actualizar la materia'); }
    finally { setSavingMateriaEdit(false); }
  };

  const handleToggleActiva = async () => {
    try {
      await updateMateria(materia.id, {
        nombre: materia.nombre,
        docente_id: materia.docente_id || null,
        programa_id: materia.programa_id,
        activa: !materia.activa,
      });
      message.success(materia.activa ? 'Materia desactivada' : 'Materia activada');
      fetchMateria();
      onChanged?.();
    } catch { message.error('Error al cambiar el estado'); }
  };

  const handleTransferConfirm = async () => {
    if (!transferProgramaId) return message.warning('Selecciona un programa destino.');
    setSavingTransfer(true);
    try {
      if (transferModal.mode === 'mover') {
        await updateMateria(materia.id, {
          nombre: materia.nombre, programa_id: transferProgramaId,
          docente_id: materia.docente_id || null, activa: materia.activa,
        });
        message.success(`"${materia.nombre}" movida`);
        setTransferModal(null);
        onChanged?.();
        if (embedded && onBack) onBack(); else navigate(`/inicio/programas/${transferProgramaId}`);
      } else {
        // Copia profunda: temas, clases, videos, PDFs, presentaciones y evaluaciones.
        await duplicarMateria(materia.id, { programa_id_destino: transferProgramaId });
        message.success(`"${materia.nombre}" duplicada con todo su contenido`);
        setTransferModal(null);
        onChanged?.();
      }
    } catch { message.error('Error al procesar la operación'); }
    finally { setSavingTransfer(false); }
  };

  const handleDeleteMateria = () => {
    Modal.confirm({
      title: 'Eliminar materia',
      content: `¿Seguro que deseas eliminar "${materia.nombre}"? Esta acción no se puede deshacer.`,
      okText: 'Sí, eliminar', cancelText: 'Cancelar', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMateria(materia.id);
          message.success('Materia eliminada');
          onChanged?.();
          if (embedded && onBack) onBack(); else navigate(`/inicio/programas/${programaId}`);
        } catch { message.error('Error al eliminar la materia'); }
      },
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spin size="large" /></div>;
  if (!materia) return <Empty description="Materia no encontrada" />;

  const otrosProgramas = allProgramas.filter((p) => p.id !== materia.programa_id);

  const materiaMenuItems = [
    { key: 'editar', icon: <EditOutlined />, label: 'Editar materia', onClick: openEditMateria },
    { key: 'estado', icon: materia.activa ? <StopOutlined /> : <CheckCircleOutlined />,
      label: materia.activa ? 'Desactivar' : 'Activar', onClick: handleToggleActiva },
    { key: 'horarios', icon: <ScheduleOutlined />, label: 'Horarios', onClick: () => setHorarioOpen(true) },
    { key: 'mover', icon: <SwapOutlined />, label: 'Mover a otro programa',
      onClick: () => { setTransferProgramaId(null); setTransferModal({ mode: 'mover' }); } },
    { key: 'duplicar', icon: <CopyOutlined />, label: 'Duplicar',
      onClick: () => { setTransferProgramaId(null); setTransferModal({ mode: 'duplicar' }); } },
    { type: 'divider' },
    { key: 'eliminar', icon: <DeleteOutlined />, label: 'Eliminar materia', danger: true, onClick: handleDeleteMateria },
  ];

  // Numeración CONTINUA de clases a través de los temas: Tema 1 = Clase 1..N,
  // Tema 2 sigue en N+1, etc. El offset de cada tema es la suma de total_clases
  // de los temas anteriores (mismo orden en que se muestran, por m.orden).
  const claseOffsetPorTema = {};
  {
    let acc = 0;
    modulos.forEach((m) => {
      claseOffsetPorTema[m.id] = acc;
      acc += Number(m.total_clases) || 0;
    });
  }

  // ─── Panel de un Tema dentro del Collapse (título + acciones + sus clases) ─
  const temasCollapseItems = modulos.map((m) => {
    const clases = clasesByModulo[m.id];
    const examenes = evalsByModulo[m.id] || [];
    // Tema completado (vista estudiante): completó todas sus clases o su estado
    // en el backend ya es 'completado' (p. ej. tras aprobar el examen del tema).
    const totalClasesTema = Number(m.total_clases) || 0;
    const clasesCompletadasTema = Number(m.clases_completadas) || 0;
    const temaCompletado = readOnly && (
      (totalClasesTema > 0 && clasesCompletadasTema >= totalClasesTema)
      || m.estado === 'completado'
    );
    // Los exámenes del tema se concatenan DESPUÉS de las clases, así siempre
    // quedan al final de la lista sin importar el orden en que se agregaron.
    let claseNum = claseOffsetPorTema[m.id] || 0;
    const items = [
      ...(clases || []).map((c) => ({ ...c, _tipo: 'clase', _num: (claseNum += 1) })),
      ...examenes.map((e) => ({ ...e, _tipo: 'examen' })),
    ];
    return {
      key: String(m.id),
      label: (
        <div className="flex items-center gap-2 min-w-0">
          <Tag>{m.orden}</Tag>
          <span className="font-semibold truncate">{m.titulo}</span>
          {temaCompletado ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>Completado</Tag>
          ) : (
            readOnly
              ? (totalClasesTema > 0 && (
                  <Tag color="processing">{clasesCompletadasTema}/{totalClasesTema} clases</Tag>
                ))
              : <Tag color={m.activa ? 'green' : 'default'}>{m.activa ? 'Activo' : 'Inactivo'}</Tag>
          )}
        </div>
      ),
      extra: readOnly ? null : (
        isMobile ? (
          // Móvil: todas las acciones en un solo menú para no desbordar el encabezado.
          <span onClick={(e) => e.stopPropagation()}>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'clase', icon: <PlayCircleOutlined />, label: 'Agregar clase', onClick: () => openCreateClase(m.id) },
                  { key: 'examen', icon: <TrophyOutlined />, label: 'Agregar examen', onClick: () => openAddExamen(m.id) },
                  { type: 'divider' },
                  { key: 'ver', icon: <EyeOutlined />, label: 'Ver detalle', onClick: () => navigate(`/inicio/modulos/${m.id}`) },
                  { key: 'editar', icon: <EditOutlined />, label: 'Editar tema', onClick: () => openEditModulo(m) },
                  { key: 'eliminar', icon: <DeleteOutlined />, danger: true, label: 'Eliminar tema', onClick: () => handleDeleteModulo(m.id) },
                ],
              }}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </span>
        ) : (
          <Space onClick={(e) => e.stopPropagation()}>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'clase', icon: <PlayCircleOutlined />, label: 'Agregar clase', onClick: () => openCreateClase(m.id) },
                  { key: 'examen', icon: <TrophyOutlined />, label: 'Agregar examen', onClick: () => openAddExamen(m.id) },
                ],
              }}
            >
              <Button size="small" type="primary" icon={<PlusOutlined />}
                style={{ backgroundColor: PURPLE, borderColor: PURPLE }} />
            </Dropdown>
            <Tooltip title="Ver detalle"><Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/inicio/modulos/${m.id}`)} /></Tooltip>
            <Tooltip title="Editar tema"><Button size="small" icon={<EditOutlined />} onClick={() => openEditModulo(m)} /></Tooltip>
            <Popconfirm title="¿Eliminar tema?" onConfirm={() => handleDeleteModulo(m.id)} okText="Sí" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      ),
      children: (
        <Spin spinning={loadingClasesModulo === m.id}>
          {!items.length ? (
            <Empty description="Este tema aún no tiene clases" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={items}
              rowKey={(it) => `${it._tipo}-${it.id}`}
              renderItem={(it) => (it._tipo === 'examen' ? (
                <List.Item
                  actions={readOnly ? [] : [
                    <Tooltip title="Preguntas" key="preguntas">
                      <Button size="small" icon={<BuildOutlined />} onClick={() => setQuestionsDrawerEval({ id: it.id, moduloId: m.id })} />
                    </Tooltip>,
                    <Popconfirm key="del" title="¿Quitar el examen de este tema?" onConfirm={() => handleRemoveExamenDeModulo(m.id, it.id)} okText="Sí" cancelText="No">
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<TrophyOutlined style={{ fontSize: 20, color: AMBER }} />}
                    title={
                      readOnly ? (
                        <span
                          className={it.asignacion_id ? 'cursor-pointer hover:text-amber-600' : ''}
                          onClick={() => it.asignacion_id && setStudentExamen({
                            asignacion_id: it.asignacion_id,
                            titulo: it.titulo,
                            descripcion: it.descripcion,
                            estado: it.estado_asignacion,
                            calificacion: it.calificacion,
                            moduloId: m.id,
                          })}
                        >
                          {it.titulo}
                        </span>
                      ) : (
                        <span className="cursor-pointer hover:text-amber-600" onClick={() => setQuestionsDrawerEval({ id: it.id, moduloId: m.id })}>
                          {it.titulo}
                        </span>
                      )
                    }
                    description={
                      <span className="flex items-center gap-2 flex-wrap">
                        <Tag color="gold">Examen</Tag>
                        {readOnly ? (
                          <Tag color={it.estado_asignacion === 'finalizada' ? 'success' : 'processing'}>
                            {it.estado_asignacion === 'finalizada'
                              ? `Completado${it.calificacion != null ? ` · ${Number(it.calificacion).toFixed(1)}` : ''}`
                              : 'Pendiente'}
                          </Tag>
                        ) : (
                          !it.activa && <Tag color="default">Inactivo</Tag>
                        )}
                        {it.descripcion && <span className="text-xs text-gray-400 truncate">{it.descripcion}</span>}
                      </span>
                    }
                  />
                </List.Item>
              ) : (
                <List.Item
                  actions={readOnly ? [] : [
                    <Tooltip title="Editar clase" key="edit">
                      <Button size="small" icon={<EditOutlined />} onClick={() => openEditClase(m.id, it)} />
                    </Tooltip>,
                    <Popconfirm key="del" title="¿Eliminar clase?" onConfirm={() => handleDeleteClase(m.id, it.id)} okText="Sí" cancelText="No">
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      readOnly ? (
                        it.estado === 'completado'
                          ? <CheckCircleOutlined style={{ fontSize: 20, color: '#16a34a' }} />
                          : <PlayCircleOutlined style={{ fontSize: 20, color: PURPLE }} />
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white flex-shrink-0"
                          style={{ background: PURPLE }}
                          title={`Clase ${it._num}`}
                        >
                          {it._num}
                        </span>
                      )
                    }
                    title={
                      <span
                        className="cursor-pointer hover:text-purple-600"
                        // Estudiante: abre la vista inmersiva de la clase.
                        // Admin: NO entra a la clase (esa visualización es solo del
                        // portal del estudiante); el clic abre la edición de la clase.
                        onClick={() => (readOnly ? setStudentClaseId(it.id) : openEditClase(m.id, it))}
                      >
                        {!readOnly && <span className="text-gray-400 dark:text-[#a8a59e] font-normal mr-1">Clase {it._num}:</span>}
                        {it.titulo}
                      </span>
                    }
                    description={
                      <span className="flex items-center gap-2 flex-wrap">
                        {it.video_url && <Tag color="purple" icon={<VideoCameraOutlined />}>Video</Tag>}
                        {it.total_pdfs > 0 && <Tag color="red" icon={<FilePdfOutlined />}>{it.total_pdfs} PDF{it.total_pdfs > 1 ? 's' : ''}</Tag>}
                        {it.descripcion && <span className="text-xs text-gray-400 truncate">{it.descripcion}</span>}
                        {!it.video_url && !it.total_pdfs && !it.descripcion && <span className="text-xs text-gray-400">Solo título</span>}
                      </span>
                    }
                  />
                </List.Item>
              ))}
            />
          )}
        </Spin>
      ),
    };
  });

  // ─── Columnas de Evaluaciones ─────────────────────────────────────────────
  const evalsCols = [
    {
      title: 'Evaluación', dataIndex: 'titulo',
      render: (t, r) => (
        <div>
          <div className="font-semibold text-sm">{t}</div>
          {r.descripcion && <div className="text-xs text-gray-400 line-clamp-1">{r.descripcion}</div>}
        </div>
      ),
    },
    { title: 'Preguntas', dataIndex: 'total_preguntas', width: 90, align: 'center', render: (v) => <Tag>{v || 0}</Tag> },
    { title: 'Estado', dataIndex: 'activa', width: 90,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activa' : 'Inactiva'}</Tag> },
    {
      title: '', width: 230,
      render: (_, r) => (
        <Space size={2} wrap>
          <Tooltip title="Preguntas">
            <Button size="small" icon={<BuildOutlined />} onClick={() => setQuestionsDrawerEval({ id: r.id })}>Preguntas</Button>
          </Tooltip>
          <Tooltip title="Asignar a estudiantes del programa">
            <Button size="small" icon={<SendOutlined />} loading={assigningEvalId === r.id}
              style={{ color: AMBER, borderColor: AMBER }} onClick={() => handleAssignEval(r)} />
          </Tooltip>
          <Tooltip title="Editar"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditEval(r)} /></Tooltip>
          <Popconfirm title="¿Eliminar evaluación?" onConfirm={() => handleDeleteEval(r.id)} okText="Sí" cancelText="No">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Columnas de Evaluaciones (estudiante, solo-lectura) ──────────────────
  const evalsColsEstudiante = [
    {
      title: 'Evaluación', dataIndex: 'titulo',
      render: (t, r) => (
        <div>
          <div className="font-semibold text-sm">{t}</div>
          {r.descripcion && <div className="text-xs text-gray-400 line-clamp-1">{r.descripcion}</div>}
        </div>
      ),
    },
    {
      title: 'Estado', dataIndex: 'estado', width: 140,
      render: (v) => (
        <Tag color={v === 'finalizada' ? 'success' : 'processing'}>
          {v === 'finalizada' ? 'Completada' : 'Pendiente'}
        </Tag>
      ),
    },
    {
      title: '', width: 140,
      render: (_, r) => (
        r.estado === 'finalizada' ? (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircleOutlined /> {r.calificacion != null ? Number(r.calificacion).toFixed(1) : ''}
          </span>
        ) : (
          <Button
            type="primary" size="small"
            style={{ backgroundColor: AMBER, borderColor: AMBER }}
            onClick={() => setStudentExamen({
              asignacion_id: r.asignacion_id,
              titulo: r.titulo,
              descripcion: r.descripcion,
              estado: r.estado,
              calificacion: r.calificacion,
              moduloId: r.modulo_id,
            })}
          >
            Resolver
          </Button>
        )
      ),
    },
  ];

  // ─── Render de un post del foro ───────────────────────────────────────────
  const renderPost = (post, isReply = false) => {
    const meta = AUTOR_META[post.autor_tipo] || AUTOR_META.admin;
    // Foto de perfil del autor (solo usuarios admin/docente la tienen); si no,
    // iniciales del nombre estilo Microsoft.
    const avatarSrc = post.autor_tipo !== 'estudiante' ? avatarMap[String(post.autor_id)] : null;
    return (
      <div key={post.id} className={isReply ? 'ml-10 mt-3' : ''}>
        <div className="flex gap-3">
          <Avatar
            src={avatarSrc || undefined}
            style={{ backgroundColor: avatarSrc ? 'transparent' : colorFromName(post.autor_nombre), flexShrink: 0, fontWeight: 600 }}
          >
            {initialsFromName(post.autor_nombre)}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{post.autor_nombre || 'Anónimo'}</span>
              <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>{meta.label}</Tag>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ClockCircleOutlined /> {dayjs(post.created_at).fromNow()}
              </span>
            </div>
            {post.contenido && (
              <div className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--qc-text, #374151)' }}>
                {post.contenido}
              </div>
            )}

            {post.adjuntos?.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {post.adjuntos.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border w-fit max-w-full"
                    style={{ borderColor: 'var(--qc-border, #e5e7eb)', background: 'var(--qc-surface-2, #f9fafb)' }}>
                    {a.tipo === 'enlace' ? <LinkOutlined style={{ color: '#2563eb' }} /> : fileIconFor(a.nombre)}
                    <span className="text-sm truncate max-w-xs" style={{ color: 'var(--qc-text, #374151)' }}>{a.nombre}</span>
                    {a.tipo === 'archivo' && <DownloadOutlined style={{ color: '#9ca3af', flexShrink: 0 }} />}
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-1">
              {!isReply && (
                <Button type="link" size="small" className="!px-0" icon={<CommentOutlined />}
                  onClick={() => { setReplyTo(replyTo === post.id ? null : post.id); setReplyText(''); }}>
                  Responder
                </Button>
              )}
              {canDelete(post) && (
                <Popconfirm title="¿Eliminar mensaje?" onConfirm={() => handleDeletePost(post.id)} okText="Sí" cancelText="No" okButtonProps={{ danger: true }}>
                  <Button type="link" size="small" danger className="!px-0" icon={<DeleteOutlined />}
                    loading={deletingPostId === post.id}>Eliminar</Button>
                </Popconfirm>
              )}
            </div>

            {/* Caja de respuesta */}
            {replyTo === post.id && (
              <div className="mt-2 flex gap-2">
                <TextArea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe una respuesta..." style={{ flex: 1 }} />
                <div className="flex flex-col gap-1">
                  <Button type="primary" size="small" icon={<SendOutlined />} loading={posting}
                    disabled={!replyText.trim()} onClick={() => handleReply(post.id)}
                    style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }} />
                  <Button size="small" onClick={() => { setReplyTo(null); setReplyText(''); }}>✕</Button>
                </div>
              </div>
            )}

            {/* Respuestas */}
            {post.respuestas?.map((r) => renderPost(r, true))}
          </div>
        </div>
        {!isReply && <Divider style={{ margin: '14px 0' }} />}
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  // Estudiante viendo una clase: se muestra el contenido de la clase embebido en
  // este mismo espacio (sin cambiar de ruta ni salir del dashboard).
  if (readOnly && studentClaseId) {
    return (
      <StudentClaseDetalle
        claseId={studentClaseId}
        embedded
        onBack={() => setStudentClaseId(null)}
        onNavigateClase={setStudentClaseId}
      />
    );
  }

  // Estudiante resolviendo (o revisando) el examen de un tema: se muestra embebido
  // aquí mismo, sin navegar al enlace del examen. Si ya está finalizado, ClaseExamen
  // muestra el resumen "completado" con la calificación.
  if (readOnly && studentExamen) {
    return (
      <div className="max-w-3xl mx-auto">
        <ClaseExamen
          assignmentId={studentExamen.asignacion_id}
          titulo={studentExamen.titulo}
          descripcion={studentExamen.descripcion}
          onBack={() => {
            const { moduloId } = studentExamen;
            setStudentExamen(null);
            // Refrescar el estado para reflejar "Completado" tras responder.
            fetchEvaluaciones();
            if (moduloId != null && clasesByModulo[moduloId] !== undefined) {
              fetchClasesDeModulo(moduloId);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Banner de la materia */}
      <div
        className="relative w-full rounded-xl overflow-hidden mb-3 group"
        style={{
          height: 190,
          background: materia.banner_url
            ? `center / cover no-repeat url(${materia.banner_url})`
            : 'linear-gradient(135deg, #155153 0%, #2563eb 55%, #60a5fa 100%)',
        }}
      >
        {!materia.banner_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <PictureOutlined style={{ fontSize: 40, color: 'rgba(255,255,255,0.35)' }} />
          </div>
        )}
        <Button
          icon={<ArrowLeftOutlined />}
          shape="circle"
          onClick={() => (embedded && onBack ? onBack() : navigate(`/inicio/programas/${programaId}`))}
          style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.9)', border: 'none' }}
        />
        {!readOnly && (
          <Dropdown menu={{ items: materiaMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              icon={<MoreOutlined />}
              shape="circle"
              style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', border: 'none' }}
            />
          </Dropdown>
        )}
        {!readOnly && (
          <Upload accept="image/*" showUploadList={false} beforeUpload={handleBannerChange}>
            <Button
              icon={<CameraOutlined />}
              loading={uploadingBanner}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none' }}
            >
              Cambiar foto
            </Button>
          </Upload>
        )}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-start gap-2 px-4 py-3 pr-20"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        >
          <UnorderedListOutlined style={{ color: '#fff', fontSize: 26, flexShrink: 0, marginTop: 4 }} />
          <span
            className="font-semibold min-w-0 line-clamp-2"
            style={{ fontSize: 28, lineHeight: 1.25, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            title={materia.nombre}
          >
            {materia.nombre}
          </span>
        </div>
      </div>

      {/* CTA del estudiante: iniciar la materia o continuar en la clase donde se
          quedó. Siempre visible en el dashboard de la materia (solo readOnly). */}
      {readOnly && materiaProgreso && materiaProgreso.totalClases > 0 && (() => {
        const { iniciada, siguienteClase, clasesCompletadas, totalClases, primeraClaseId } = materiaProgreso;
        const todas = clasesCompletadas >= totalClases || !siguienteClase;
        const pct = totalClases ? Math.round((clasesCompletadas / totalClases) * 100) : 0;
        let titulo; let sub; let label; let icon; let target; let color;
        if (todas) {
          titulo = '¡Materia completada!';
          sub = `Completaste las ${totalClases} clases`;
          label = 'Repasar materia'; icon = <ReloadOutlined />; target = primeraClaseId; color = '#16a34a';
        } else if (!iniciada) {
          titulo = 'Aún no has iniciado esta materia';
          sub = `${totalClases} clase${totalClases > 1 ? 's' : ''} por ver`;
          label = 'Iniciar materia'; icon = <PlayCircleOutlined />; target = siguienteClase.id; color = PURPLE;
        } else {
          titulo = 'Continúa donde lo dejaste';
          sub = `Clase ${siguienteClase.numero}: ${siguienteClase.titulo}`;
          label = `Continuar · Clase ${siguienteClase.numero}`; icon = <ArrowRightOutlined />; target = siguienteClase.id; color = PURPLE;
        }
        return (
          <div className="mb-4 rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-[#30302e] border-gray-200 dark:border-[#403e3a]">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-800 dark:text-[#faf9f5]">{titulo}</div>
              <div className="text-xs text-gray-500 dark:text-[#a8a59e] truncate">{sub}</div>
              <div className="mt-2 flex items-center gap-2 max-w-xs">
                <Progress percent={pct} size="small" showInfo={false}
                  strokeColor={todas ? '#16a34a' : PURPLE} style={{ flex: 1, margin: 0 }} />
                <span className="text-xs text-gray-500 dark:text-[#a8a59e] whitespace-nowrap tabular-nums">
                  {clasesCompletadas}/{totalClases}
                </span>
              </div>
            </div>
            <Button
              type="primary" size="large" icon={icon} disabled={!target}
              onClick={() => target && setStudentClaseId(target)}
              style={{ backgroundColor: color, borderColor: color }}
            >
              {label}
            </Button>
          </div>
        );
      })()}

      {/* Tabs debajo del banner */}
      <Tabs
        defaultActiveKey="temas"
        items={[

        // ── TEMAS (módulos) ─────────────────────────────────────────────────
        {
          key: 'temas',
          label: 'Temas',
          children: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {readOnly
                    ? 'Temas de esta materia: cada uno agrupa sus clases y, al final, su examen.'
                    : 'Los temas agrupan las clases del curso (Clase 1, Clase 2...). Se asignan '
                      + 'automáticamente a los estudiantes de la materia; usa el botón "+" de cada tema '
                      + 'para agregarle clases directamente.'}
                </Text>
                {!readOnly && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModulo}
                    style={{ backgroundColor: PURPLE, borderColor: PURPLE }}>
                    Nuevo Tema
                  </Button>
                )}
              </div>
              <Spin spinning={loadingModulos}>
                {!modulos.length ? (
                  <Card className="rounded-xl">
                    <Empty description="Esta materia aún no tiene temas" />
                  </Card>
                ) : (
                  <Collapse items={temasCollapseItems} onChange={handleCollapseChange} />
                )}
              </Spin>
            </div>
          ),
        },

        // ── FORO ───────────────────────────────────────────────────────────
        {
          key: 'foro',
          label: 'Publicaciones',
          children: (
            <div className="w-full">
              <Card size="small" className="rounded-xl mb-4">
                <TextArea rows={3} value={newPost} onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Escribe un mensaje para la materia (anuncio, pregunta, recurso)..." />

                {(pendingFiles.length > 0 || pendingLinks.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pendingFiles.map((f, i) => (
                      <Tag key={`f-${i}`} closable onClose={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}>
                        {fileIconFor(f.name)} <span className="ml-1">{f.name}</span>
                      </Tag>
                    ))}
                    {pendingLinks.map((l, i) => (
                      <Tag key={`l-${i}`} icon={<LinkOutlined />} color="blue"
                        closable onClose={() => setPendingLinks((p) => p.filter((_, idx) => idx !== i))}>
                        {l.titulo || l.url}
                      </Tag>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <Space>
                    <Upload multiple showUploadList={false}
                      beforeUpload={(file) => { setPendingFiles((p) => [...p, file]); return false; }}>
                      <Tooltip title="Adjuntar archivo">
                        <Button type="text" icon={<PaperClipOutlined />} />
                      </Tooltip>
                    </Upload>
                    <Tooltip title="Adjuntar enlace">
                      <Button type="text" icon={<LinkOutlined />} onClick={() => setLinkModalOpen(true)} />
                    </Tooltip>
                  </Space>
                  <Button type="primary" icon={<SendOutlined />} loading={posting} disabled={!canPublish}
                    onClick={handlePublish} style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>
                    Publicar
                  </Button>
                </div>
              </Card>

              <Spin spinning={loadingForo}>
                {posts.length === 0 ? (
                  <Empty description="Aún no hay publicaciones en esta materia" />
                ) : (
                  <Card bodyStyle={{ padding: '16px 20px' }} className="rounded-xl">
                    {posts.map((p) => renderPost(p))}
                  </Card>
                )}
              </Spin>
            </div>
          ),
        },

        // ── EVALUACIONES ────────────────────────────────────────────────────
        // Oculta para el estudiante (readOnly): él solo presenta las evaluaciones
        // desde la clase (examen al final del tema), para no saltarse el contenido.
        !readOnly && {
          key: 'evaluaciones',
          label: 'Evaluaciones',
          children: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {readOnly ? (
                    <>Evaluaciones de esta materia.</>
                  ) : (
                    <>Evaluaciones de esta materia. Se asignan a los estudiantes del programa
                      <strong> {materia.programa_nombre}</strong>.</>
                  )}
                </Text>
                {!readOnly && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateEval}
                    style={{ backgroundColor: AMBER, borderColor: AMBER }}>
                    Nueva Evaluación
                  </Button>
                )}
              </div>
              <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
                <Spin spinning={loadingEvals}>
                  {readOnly ? (
                    <Table columns={evalsColsEstudiante} dataSource={evaluaciones} rowKey="asignacion_id" size="small" pagination={false}
                      locale={{ emptyText: 'Esta materia aún no tiene evaluaciones' }} />
                  ) : (
                    <Table columns={evalsCols} dataSource={evaluaciones} rowKey="id" size="small" pagination={false}
                      locale={{ emptyText: 'Esta materia aún no tiene evaluaciones' }} />
                  )}
                </Spin>
              </Card>
            </div>
          ),
        },
      ].filter(Boolean)} />

      {/* ── Drawer crear/editar Tema (módulo) ─────────────────────────────── */}
      <Drawer
        title={editingModulo ? 'Editar Tema' : `Nuevo Tema — ${materia.nombre}`}
        open={moduloDrawerOpen}
        onClose={() => setModuloDrawerOpen(false)}
        destroyOnClose
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModuloDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={savingModulo}
              style={{ backgroundColor: PURPLE, borderColor: PURPLE }} onClick={() => moduloForm.submit()}>
              {savingModulo ? 'Guardando...' : editingModulo ? 'Guardar cambios' : 'Crear tema'}
            </Button>
          </div>
        }
      >
        <Form form={moduloForm} layout="vertical" onFinish={handleSaveModulo}>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Tema 1 - Introducción" />
          </Form.Item>
          <Form.Item name="orden" label="Orden"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Drawer>

      {/* ── Drawer crear/editar Clase (dentro de un Tema) ───────────────────── */}
      <Drawer
        title={editingClase ? 'Editar Clase' : 'Nueva Clase'}
        open={claseDrawerOpen}
        onClose={() => setClaseDrawerOpen(false)}
        destroyOnClose
        width={480}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setClaseDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={savingClase}
              style={{ backgroundColor: PURPLE, borderColor: PURPLE }} onClick={() => claseForm.submit()}>
              {savingClase ? 'Guardando...' : editingClase ? 'Guardar cambios' : 'Crear clase'}
            </Button>
          </div>
        }
      >
        <Form form={claseForm} layout="vertical" onFinish={handleSaveClase}>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Clase 1 - Introducción" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <TextArea rows={3} placeholder="Resumen breve de la clase" />
          </Form.Item>
          <Form.Item
            label="Video (opcional)"
            tooltip="Puedes combinar texto, video y PDFs en la misma clase. Esto solo define cómo agregas el video."
          >
            <Radio.Group value={claseVideoMode} onChange={(e) => setClaseVideoMode(e.target.value)} className="mb-2">
              <Radio.Button value="ninguno">Sin video</Radio.Button>
              <Radio.Button value="enlace"><LinkOutlined /> Enlace</Radio.Button>
              <Radio.Button value="archivo"><VideoCameraOutlined /> Subir archivo</Radio.Button>
            </Radio.Group>
            {claseVideoMode === 'enlace' && (
              <Form.Item name="video_url" rules={[{ type: 'url', message: 'Ingresa una URL válida' }]} noStyle>
                <Input placeholder="https://..." />
              </Form.Item>
            )}
            {claseVideoMode === 'archivo' && (
              <Upload
                accept="video/*"
                maxCount={1}
                beforeUpload={(file) => { setClaseVideoFile(file); return false; }}
                onRemove={() => setClaseVideoFile(null)}
              >
                <Button icon={<UploadOutlined />}>Seleccionar video</Button>
              </Upload>
            )}
          </Form.Item>

          <Form.Item label="PDFs adjuntos (opcional)">
            {existingClasePdfs.length > 0 && (
              <div className="mb-2 space-y-1">
                {existingClasePdfs.map((pdf) => (
                  <div key={pdf.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1 truncate"><FilePdfOutlined style={{ color: '#ef4444' }} />{pdf.nombre}</span>
                    <Button size="small" danger type="text" icon={<DeleteOutlined />}
                      onClick={() => handleDeleteExistingPdf(editingClase.id, pdf.id)} />
                  </div>
                ))}
              </div>
            )}
            <Upload
              accept="application/pdf"
              multiple
              fileList={clasePdfFiles.map((f, i) => ({ uid: String(i), name: f.name, status: 'done' }))}
              beforeUpload={(file) => { setClasePdfFiles((prev) => [...prev, file]); return false; }}
              onRemove={(file) => setClasePdfFiles((prev) => prev.filter((_, i) => String(i) !== file.uid))}
            >
              <Button icon={<UploadOutlined />}>Agregar PDF</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            label="Presentación (PDF, PPTX, SVG o HTML)"
            tooltip="Se muestra como diapositivas en el visor 16:9, en el mismo espacio del video. El HTML se renderiza aislado (cargan fuentes, íconos, imágenes y animaciones)."
          >
            {existingClasePres.length > 0 && (
              <div className="mb-2 space-y-1">
                {existingClasePres.map((pres) => (
                  <div key={pres.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1 truncate min-w-0">
                      {presTipoIcon(pres.tipo)}
                      <span className="truncate">{pres.nombre}</span>
                      <Tag className="!m-0 uppercase" color="orange">{pres.tipo}</Tag>
                    </span>
                    <Button size="small" danger type="text" icon={<DeleteOutlined />}
                      loading={deletingClasePresId === pres.id}
                      onClick={() => handleDeleteExistingPres(editingClase.id, pres.id)} />
                  </div>
                ))}
              </div>
            )}
            <Upload
              accept=".pdf,.pptx,.ppt,.svg,.html,.htm"
              multiple
              fileList={clasePresFiles.map((f, i) => ({ uid: String(i), name: f.name, status: 'done' }))}
              beforeUpload={(file) => {
                if (!PRES_EXT.test(file.name)) { message.error(`"${file.name}" no es PDF, PPTX, SVG ni HTML.`); return Upload.LIST_IGNORE; }
                if (file.size > 50 * 1024 * 1024) { message.error(`"${file.name}" supera 50 MB.`); return Upload.LIST_IGNORE; }
                setClasePresFiles((prev) => [...prev, file]);
                return false;
              }}
              onRemove={(file) => setClasePresFiles((prev) => prev.filter((_, i) => String(i) !== file.uid))}
            >
              <Button icon={<FundProjectionScreenOutlined />}>Agregar presentación (HTML / PDF / PPTX / SVG)</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── Modal crear/editar Evaluación ─────────────────────────────────── */}
      <Modal
        title={editingEval ? 'Editar Evaluación' : 'Nueva Evaluación'}
        open={evalModalOpen}
        onCancel={() => { setEvalModalOpen(false); setEditingEval(null); }}
        onOk={() => evalForm.submit()}
        okText={editingEval ? 'Guardar cambios' : 'Crear evaluación'}
        confirmLoading={savingEval}
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: AMBER, borderColor: AMBER } }}
      >
        <Form form={evalForm} layout="vertical" onFinish={handleSaveEval} style={{ marginTop: 8 }}>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Ingresa un título' }]}>
            <Input placeholder="Ej: Evaluación final" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <TextArea rows={2} placeholder="Descripción general de la evaluación..." />
          </Form.Item>
          <Form.Item name="rango_fechas" label="Rango de fechas (opcional)">
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="intentos_max" label="Intentos máx."><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="tiempo_limite_min" label="Tiempo (min)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="activa" label="Activa" valuePropName="checked">
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* ── Modal agregar examen a un Tema (queda al final de sus clases) ──── */}
      <Modal
        title="Agregar examen al tema"
        open={examenModalOpen}
        onCancel={() => setExamenModalOpen(false)}
        onOk={() => examenForm.submit()}
        okText={examenMode === 'existente' ? 'Vincular examen' : 'Crear y agregar'}
        confirmLoading={savingExamen}
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: AMBER, borderColor: AMBER } }}
      >
        <Radio.Group value={examenMode} onChange={(e) => setExamenMode(e.target.value)} className="mb-3">
          <Radio.Button value="nueva">Examen nuevo</Radio.Button>
          <Radio.Button value="existente">Examen existente</Radio.Button>
        </Radio.Group>
        <Form form={examenForm} layout="vertical" onFinish={handleSaveExamen}>
          {examenMode === 'existente' ? (
            <Form.Item name="evaluacion_id" label="Evaluación" rules={[{ required: true, message: 'Selecciona una evaluación' }]}>
              <Select placeholder="Selecciona una evaluación de la materia" showSearch
                filterOption={(input, opt) => (opt.children || '').toLowerCase().includes(input.toLowerCase())}
                notFoundContent="No hay evaluaciones de la materia disponibles para vincular">
                {evaluaciones
                  .filter((e) => !(evalsByModulo[examenTargetModuloId] || []).some((le) => le.id === e.id))
                  .map((e) => <Select.Option key={e.id} value={e.id}>{e.titulo}</Select.Option>)}
              </Select>
            </Form.Item>
          ) : (
            <>
              <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Ingresa un título' }]}>
                <Input placeholder="Ej: Examen final del tema" />
              </Form.Item>
              <Form.Item name="descripcion" label="Descripción">
                <TextArea rows={2} placeholder="Descripción general del examen..." />
              </Form.Item>
              <Form.Item name="rango_fechas" label="Rango de fechas (opcional)">
                <RangePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <div className="grid grid-cols-3 gap-x-4">
                <Form.Item name="intentos_max" label="Intentos máx."><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="tiempo_limite_min" label="Tiempo (min)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="activa" label="Activa" valuePropName="checked">
                  <Switch checkedChildren="Sí" unCheckedChildren="No" />
                </Form.Item>
              </div>
            </>
          )}
        </Form>
      </Modal>

      {/* ── Modal editar materia ──────────────────────────────────────────── */}
      <Modal
        title="Editar materia"
        open={editMateriaOpen}
        onCancel={() => setEditMateriaOpen(false)}
        onOk={() => materiaEditForm.submit()}
        okText="Guardar cambios"
        confirmLoading={savingMateriaEdit}
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: PRIMARY, borderColor: PRIMARY } }}
      >
        <Form form={materiaEditForm} layout="vertical" onFinish={handleSaveMateriaEdit} style={{ marginTop: 8 }}>
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

      {/* ── Modal mover/duplicar materia ──────────────────────────────────── */}
      <Modal
        open={!!transferModal}
        title={savingTransfer && transferModal?.mode === 'duplicar'
          ? null
          : transferModal?.mode === 'mover'
            ? `Mover "${materia.nombre}"`
            : `Duplicar "${materia.nombre}"`}
        okText={transferModal?.mode === 'mover' ? 'Mover' : 'Duplicar'}
        cancelText="Cancelar"
        onOk={handleTransferConfirm}
        onCancel={() => setTransferModal(null)}
        confirmLoading={savingTransfer}
        // Mientras duplica (proceso largo) ocultamos el footer y bloqueamos el cierre:
        // el loader del cuerpo comunica el progreso y evitamos cancelar a media copia.
        footer={savingTransfer && transferModal?.mode === 'duplicar' ? null : undefined}
        closable={!savingTransfer}
        maskClosable={!savingTransfer}
        keyboard={!savingTransfer}
        okButtonProps={{ style: { backgroundColor: transferModal?.mode === 'mover' ? '#2563eb' : PURPLE } }}
      >
        {savingTransfer && transferModal?.mode === 'duplicar' ? (
          <div className="flex flex-col items-center justify-center text-center py-6 px-2">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 42, color: PURPLE }} spin />} />
            <div className="mt-5 text-base font-semibold text-gray-800 dark:text-[#faf9f5]">
              Duplicando la materia…
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-[#a8a59e]">
              Copiando temas, clases, evaluaciones y archivos.
            </div>
            <div className="mt-6 max-w-xs text-xs leading-relaxed text-gray-400 dark:text-[#8a8780]">
              Este proceso está tardando un poco más de lo esperado, ya que este tipo de
              operaciones puede demorar unos segundos en completarse. Por favor no cierres esta ventana.
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-[#a8a59e] mb-3">
              {transferModal?.mode === 'mover'
                ? 'Selecciona el programa destino. La materia dejará de pertenecer a este programa.'
                : 'Selecciona el programa destino. Se copiará la materia con todo su contenido (temas, clases, evaluaciones y archivos). El original se mantiene aquí.'}
            </p>
            <Select style={{ width: '100%' }} placeholder="Programa destino" value={transferProgramaId}
              onChange={setTransferProgramaId} showSearch
              filterOption={(i, o) => (o.children || '').toLowerCase().includes(i.toLowerCase())}>
              {otrosProgramas.map((p) => <Select.Option key={p.id} value={p.id}>{p.nombre}</Select.Option>)}
            </Select>
          </>
        )}
      </Modal>

      {/* ── Modal adjuntar enlace (foro) ───────────────────────────────────── */}
      <Modal
        title="Adjuntar enlace"
        open={linkModalOpen}
        onCancel={() => setLinkModalOpen(false)}
        onOk={() => linkForm.submit()}
        okText="Agregar"
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: PRIMARY, borderColor: PRIMARY } }}
      >
        <Form form={linkForm} layout="vertical" onFinish={handleAddLink} style={{ marginTop: 8 }}>
          <Form.Item name="url" label="URL" rules={[{ required: true, message: 'Ingresa la URL' }, { type: 'url', message: 'URL no válida' }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="titulo" label="Título (opcional)">
            <Input placeholder="Ej: Guía de estudio" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Horario drawer ────────────────────────────────────────────────── */}
      {horarioOpen && (
        <HorarioDrawer
          materia={materia}
          programa={{ nombre: materia.programa_nombre }}
          onClose={() => setHorarioOpen(false)}
        />
      )}

      {/* ── Drawer de preguntas de una evaluación (gestión inline, sin salir
             del programa). Reemplaza la navegación al builder standalone. ──── */}
      <EvaluationQuestionsDrawer
        evaluationId={questionsDrawerEval?.id}
        open={!!questionsDrawerEval}
        onClose={() => setQuestionsDrawerEval(null)}
        onChanged={() => {
          fetchEvaluaciones();
          const moduloId = questionsDrawerEval?.moduloId;
          if (moduloId != null && evalsByModulo[moduloId] !== undefined) {
            fetchEvalsDeModulo(moduloId);
          }
        }}
      />
    </div>
  );
}
