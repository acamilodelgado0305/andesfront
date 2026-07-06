import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Typography, Spin, Empty, List, message, Drawer, Grid,
} from 'antd';
import {
  ArrowLeftOutlined, FilePdfOutlined, DownloadOutlined, ArrowRightOutlined,
  MenuUnfoldOutlined, BookOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getClaseByIdEstudiante, getClaseOutlineEstudiante } from '../../services/clases/serviceClase';
import { CourseSidebar, ProgressCard } from './CourseOutline';

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

// Vista de PREVISUALIZACIÓN (admin) de una clase. No marca progreso real de
// estudiante — para eso existe StudentClaseDetalle en /portal/clases/:claseId.
// Muestra el índice del curso (sidebar) y la barra de progreso igual que el portal.
export default function ClaseDetalle() {
  const { claseId } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const [loading, setLoading] = useState(true);
  const [clase, setClase] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [siguienteClaseId, setSiguienteClaseId] = useState(null);
  const [outline, setOutline] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [data, outlineData] = await Promise.all([
        getClaseByIdEstudiante(claseId),
        getClaseOutlineEstudiante(claseId).catch(() => null),
      ]);
      setClase(data.clase);
      setPdfs(data.pdfs || []);
      setSiguienteClaseId(data.siguienteClaseId || null);
      setOutline(outlineData?.ok ? outlineData : null);
    } catch {
      message.error('Error al cargar la clase');
    } finally {
      setLoading(false);
    }
  }, [claseId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const irAClase = (id) => {
    setDrawerOpen(false);
    navigate(`/inicio/clases/${id}`);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  }

  if (!clase) {
    return <Empty description="Clase no encontrada" className="mt-20" />;
  }

  const embedUrl = getEmbedUrl(clase.video_url);
  const hasOutline = !!outline?.temas?.length;

  const sidebarPanel = (
    <div className="lg:sticky lg:top-4 rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-4 lg:max-h-[calc(100vh-2rem)] overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <BookOutlined style={{ color: '#7c3aed' }} />
        <span className="font-semibold text-gray-800 dark:text-[#faf9f5] truncate">
          {outline?.materia?.nombre || 'Contenido del curso'}
        </span>
      </div>
      <CourseSidebar outline={outline} currentClaseId={claseId} onSelect={irAClase} />
    </div>
  );

  return (
    <div className="max-w-6xl p-4">
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
        {/* Sidebar izquierdo (desktop) */}
        {!isMobile && hasOutline && (
          <aside className="lg:w-72 lg:flex-shrink-0">{sidebarPanel}</aside>
        )}

        {/* Contenido central de la clase */}
        <div className="flex-1 min-w-0 space-y-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Volver</Button>

          <Title level={3} className="!mb-0">{clase.titulo}</Title>

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

          {siguienteClaseId && (
            <div className="flex justify-center">
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                onClick={() => navigate(`/inicio/clases/${siguienteClaseId}`)}
              >
                Siguiente clase
              </Button>
            </div>
          )}

          {clase.descripcion && (
            <Paragraph className="whitespace-pre-line">{clase.descripcion}</Paragraph>
          )}

          {!clase.video_url && !clase.descripcion && (!pdfs || !pdfs.length) && (
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
        </div>

        {/* Barra de progreso (derecha en desktop, arriba en móvil) */}
        {hasOutline && outline.totalClases > 0 && (
          <aside className="lg:w-60 lg:flex-shrink-0 order-first lg:order-none">
            <div className="lg:sticky lg:top-4">
              <ProgressCard completadas={outline.completadas} totalClases={outline.totalClases} />
            </div>
          </aside>
        )}
      </div>

      {/* Índice del curso en Drawer (móvil) */}
      <Drawer
        title={outline?.materia?.nombre || 'Contenido del curso'}
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={300}
      >
        <CourseSidebar outline={outline} currentClaseId={claseId} onSelect={irAClase} />
      </Drawer>
    </div>
  );
}
