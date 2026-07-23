import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Typography, Spin, Empty, List, message, Tag, Drawer, Grid,
} from 'antd';
import {
  ArrowLeftOutlined, FilePdfOutlined, DownloadOutlined,
  ArrowRightOutlined, CheckCircleOutlined,
  MenuUnfoldOutlined, BookOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClaseByIdEstudiante, completarClase, getClaseOutlineEstudiante,
  getModuloExamenEstudiante,
} from '../../services/clases/serviceClase';
import { getSavedStudentData } from '../../services/auth/studentAuthService';
import { CourseSidebar, ProgressCard } from './CourseOutline';
import ClaseComentarios from './ClaseComentarios';
import ClaseExamen from './ClaseExamen';
import PresentacionViewer from './PresentacionViewer';

const { Title, Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

// Convierte un link de YouTube/Vimeo en su URL embebible; si no reconoce el
// proveedor devuelve null (se muestra con <video> nativo, útil para archivos subidos).
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

// Clases que el estudiante marcó como completadas en esta sesión de navegación.
// El backend ya persiste el progreso de un estudiante autenticado, pero al pulsar
// "Siguiente clase" navegamos de inmediato; recordar aquí lo recién completado
// permite pintar el chulito verde y avanzar la barra al instante, sin depender de
// que el re-fetch llegue "a tiempo" ni del round-trip. Se limpia al recargar la
// página (donde manda el backend).
const completadasEnSesion = new Set();

// Fusiona el progreso local (esta sesión) con el índice que devuelve el backend:
// marca como 'completado' cualquier clase que el estudiante ya completó y recalcula
// el contador global para la barra de progreso.
const mergeProgresoSesion = (outline) => {
  if (!outline?.temas?.length || completadasEnSesion.size === 0) return outline;
  let completadas = 0;
  const temas = outline.temas.map((tema) => {
    const clases = tema.clases.map((c) => (
      completadasEnSesion.has(String(c.id)) ? { ...c, estado: 'completado' } : c
    ));
    completadas += clases.filter((c) => c.estado === 'completado').length;
    return { ...tema, clases };
  });
  return { ...outline, temas, completadas };
};

// Puede usarse como página (ruta /portal/clases/:claseId) o embebido dentro del
// dashboard del estudiante (MateriaDetalle en modo readOnly). En modo embebido
// NO navega a rutas nuevas: usa los callbacks onBack / onNavigateClase para
// mantener al estudiante dentro del mismo espacio de contenido del dashboard.
export default function StudentClaseDetalle({
  claseId: claseIdProp,
  embedded = false,
  onBack,
  onNavigateClase,
} = {}) {
  const params = useParams();
  const claseId = claseIdProp ?? params.claseId;
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  // En modo embebido volvemos vía callback; como página, a la lista de módulos.
  const volverAMateria = () => (embedded ? onBack?.() : navigate('/portal/modulos'));

  const [loading, setLoading] = useState(true);
  const [clase, setClase] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [estado, setEstado] = useState('pendiente');
  const [siguienteClaseId, setSiguienteClaseId] = useState(null);
  const [outline, setOutline] = useState(null);
  const [avanzando, setAvanzando] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [studentInfo] = useState(() => getSavedStudentData());
  // Examen del tema mostrado tras terminar sus clases (null = mostrar la clase).
  const [examen, setExamen] = useState(null);
  // Tema (modulo_id) al que pertenece el examen abierto. Puede diferir del tema de
  // la clase actual si el examen se abrió desde el índice del curso ("Tomar examen").
  // Se usa para calcular el "tema siguiente" al aprobar y ofrecer continuar.
  const [examenModuloId, setExamenModuloId] = useState(null);

  const cerrarExamen = () => { setExamen(null); setExamenModuloId(null); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [data, outlineData] = await Promise.all([
        getClaseByIdEstudiante(claseId),
        getClaseOutlineEstudiante(claseId).catch(() => null),
      ]);
      setClase(data.clase);
      setPdfs(data.pdfs || []);
      setPresentaciones(data.presentaciones || []);
      setEstado(
        completadasEnSesion.has(String(claseId)) ? 'completado' : (data.estado || 'pendiente')
      );
      setSiguienteClaseId(data.siguienteClaseId || null);
      setOutline(outlineData?.ok ? mergeProgresoSesion(outlineData) : null);
    } catch {
      message.error('Error al cargar la clase');
    } finally {
      setLoading(false);
    }
  }, [claseId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const irAClase = (id) => {
    setDrawerOpen(false);
    if (embedded) onNavigateClase?.(id);
    else navigate(`/portal/clases/${id}`);
  };

  // Abre el examen de un tema desde el índice del curso (botón "Tomar examen").
  // Asegura la asignación del estudiante y lo muestra embebido en la misma vista.
  const abrirExamenDeTema = async (moduloId) => {
    try {
      const resp = await getModuloExamenEstudiante(moduloId);
      const ex = resp?.examen || null;
      if (ex?.asignacion_id) {
        setDrawerOpen(false);
        setExamenModuloId(moduloId);
        setExamen(ex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        message.info('El examen de este tema aún no está disponible.');
      }
    } catch {
      message.error('No se pudo abrir el examen.');
    }
  };

  const handleSiguiente = async () => {
    setAvanzando(true);
    try {
      await completarClase(claseId);
      // Recuerda esta clase como completada para pintar el avance al instante en la
      // siguiente pantalla (chulito verde en el sidebar + barra de progreso).
      completadasEnSesion.add(String(claseId));
      if (siguienteClaseId) {
        irAClase(siguienteClaseId);
        return;
      }

      // Última clase del tema: si el tema tiene examen pendiente, se muestra aquí
      // mismo para que el estudiante lo responda; si no, se vuelve a la materia.
      let examenData = null;
      try {
        const resp = await getModuloExamenEstudiante(clase.modulo_id);
        examenData = resp?.examen || null;
      } catch { /* si falla, seguimos el flujo normal */ }

      if (examenData?.asignacion_id && examenData.estado !== 'finalizada') {
        setExamenModuloId(clase.modulo_id);
        setExamen(examenData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        message.success('¡Completaste todas las clases de este tema!');
        volverAMateria();
      }
    } catch {
      message.error('No se pudo actualizar tu progreso');
    } finally {
      setAvanzando(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  }

  if (!clase) {
    return <Empty description="Clase no encontrada" className="mt-20" />;
  }

  const embedUrl = getEmbedUrl(clase.video_url);
  const hasOutline = !!outline?.temas?.length;

  // Primera clase del TEMA SIGUIENTE (por orden) al tema del examen que está
  // abierto. Sirve para ofrecer "Continuar con el siguiente tema" cuando el
  // estudiante aprueba el examen. null si es el último tema (o el siguiente no
  // tiene clases / el estudiante no tiene acceso a él).
  const siguienteTemaPrimeraClaseId = (() => {
    if (!outline?.temas?.length || examenModuloId == null) return null;
    const temas = [...outline.temas].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const idx = temas.findIndex((t) => String(t.id) === String(examenModuloId));
    if (idx < 0 || idx >= temas.length - 1) return null;
    const clases = [...(temas[idx + 1].clases || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return clases.length ? clases[0].id : null;
  })();

  const sidebarPanel = (
    <div className="lg:sticky lg:top-4 rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-4 lg:max-h-[calc(100vh-2rem)] overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <BookOutlined style={{ color: '#7c3aed' }} />
        <span className="font-semibold text-gray-800 dark:text-[#faf9f5] truncate">
          {outline?.materia?.nombre || 'Contenido del curso'}
        </span>
      </div>
      <CourseSidebar
        outline={outline}
        currentClaseId={claseId}
        onSelect={irAClase}
        onTakeExam={(tema) => abrirExamenDeTema(tema.id)}
      />
    </div>
  );

  return (
    <div className={embedded ? '' : 'max-w-6xl mx-auto p-4'}>
      {/* Header del estudiante (avatar + nombre + documento). Solo como página:
          embebido en el dashboard éste ya se muestra arriba. */}
      {!embedded && (
        <div className="flex items-center justify-start gap-3 py-4 mb-4 border-b border-gray-200 dark:border-[#403e3a]">
          <div className="w-9 h-9 rounded-full bg-[#155153] text-white flex items-center justify-center font-bold flex-shrink-0">
            {(studentInfo?.nombre || 'E').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="m-0 text-base font-semibold text-gray-800 dark:text-[#faf9f5] truncate">
              {studentInfo?.nombre_completo
                || `${studentInfo?.nombre || ''} ${studentInfo?.apellido || ''}`.trim()
                || 'Estudiante'}
            </h2>
            <p className="m-0 text-xs text-gray-500 dark:text-[#a8a59e]">
              Doc: {studentInfo?.documento || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Volver a la materia — esquina superior izquierda. */}
      <div className="mb-3">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => { cerrarExamen(); volverAMateria(); }}
          className="!px-2 text-gray-600 dark:text-[#a8a59e] hover:!text-purple-700"
        >
          Volver a la materia
        </Button>
      </div>

      {/* Móvil: botón para abrir el índice del curso */}
      {isMobile && hasOutline && (
        <Button
          className="mb-3"
          icon={<MenuUnfoldOutlined />}
          onClick={() => setDrawerOpen(true)}
          block
        >
          Contenido del curso
        </Button>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar izquierdo (desktop) — se mantiene también durante el examen */}
        {!isMobile && hasOutline && (
          <aside className="lg:w-72 lg:flex-shrink-0">{sidebarPanel}</aside>
        )}

        {/* Contenido central: la clase o, al terminar el tema, su examen (misma
            vista, mismo espacio — el estudiante no siente que fue enviado a otra
            página). */}
        <div className="flex-1 min-w-0 space-y-4">
          {examen ? (
            <ClaseExamen
              assignmentId={examen.asignacion_id}
              titulo={examen.titulo}
              descripcion={examen.descripcion}
              showBack={false}
              onBack={() => { cerrarExamen(); volverAMateria(); }}
              onContinuarTema={siguienteTemaPrimeraClaseId ? () => {
                cerrarExamen();
                irAClase(siguienteTemaPrimeraClaseId);
              } : undefined}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <Title level={3} className="!mb-0 !text-lg sm:!text-2xl">{clase.titulo}</Title>
                {estado === 'completado' && (
                  <Tag color="success" icon={<CheckCircleOutlined />} className="flex-shrink-0 mt-1">Completada</Tag>
                )}
              </div>

              {clase.video_url && (
                <div className="rounded-lg overflow-hidden bg-black">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={clase.titulo}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ width: '100%', aspectRatio: '16/9', border: 0 }}
                    />
                  ) : (
                    <video controls src={clase.video_url} style={{ width: '100%', maxHeight: 504 }} />
                  )}
                </div>
              )}

              {presentaciones.length > 0 && (
                <div className="qc-pres-fullbleed">
                  <PresentacionViewer presentaciones={presentaciones} />
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  type="primary"
                  size="large"
                  loading={avanzando}
                  icon={<ArrowRightOutlined />}
                  style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                  onClick={handleSiguiente}
                >
                  {siguienteClaseId ? 'Siguiente clase' : 'Finalizar tema'}
                </Button>
              </div>

              {clase.descripcion && (
                <Paragraph className="whitespace-pre-line">{clase.descripcion}</Paragraph>
              )}

              {!clase.video_url && !clase.descripcion && !presentaciones.length && (!pdfs || !pdfs.length) && (
                <Empty description="Esta clase solo tiene título" />
              )}

              {pdfs.length > 0 && (
                <div>
                  <Text strong className="block mb-1">PDFs</Text>
                  <List
                    size="small"
                    bordered
                    dataSource={pdfs}
                    rowKey="id"
                    renderItem={(pdf) => (
                      <List.Item
                        actions={[
                          <a key="dl" href={pdf.pdf_url} target="_blank" rel="noreferrer"><DownloadOutlined /> Descargar</a>,
                        ]}
                      >
                        <span className="flex items-center gap-1"><FilePdfOutlined style={{ color: '#ef4444' }} />{pdf.nombre}</span>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Columna derecha: la barra de progreso se mantiene siempre (también
            durante el examen); los comentarios solo aplican a la clase. */}
        <aside className="lg:w-80 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            {hasOutline && outline.totalClases > 0 && (
              <ProgressCard completadas={outline.completadas} totalClases={outline.totalClases} />
            )}
            {!examen && <ClaseComentarios claseId={claseId} />}
          </div>
        </aside>
      </div>

      {/* Índice del curso en Drawer (móvil) */}
      <Drawer
        title={outline?.materia?.nombre || 'Contenido del curso'}
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={300}
      >
        <CourseSidebar
          outline={outline}
          currentClaseId={claseId}
          onSelect={irAClase}
          onTakeExam={(tema) => abrirExamenDeTema(tema.id)}
        />
      </Drawer>
    </div>
  );
}
