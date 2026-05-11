import React, { useState, useEffect } from 'react';
import {
  Card, Tag, Button, Spin, Typography, Alert, Modal, List
} from 'antd';
import {
  BookOutlined, FilePdfOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TrophyOutlined, LinkOutlined, ArrowRightOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const API = import.meta.env.VITE_API_BACKEND;

export default function StudentModulosPage() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState({});
  const [loadingDetalle, setLoadingDetalle] = useState({});
  const [pdfViewer, setPdfViewer] = useState(null); // { url, nombre }

  const getToken = () =>
    localStorage.getItem('student_portal_token') || localStorage.getItem('authToken');

  const fetchModulos = async () => {
    const token = getToken();
    if (!token) return setLoading(false);

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const estudianteId = payload.studentId || payload.sub;
      if (!estudianteId) return setLoading(false);

      const { data } = await axios.get(
        `${API}/api/modulos/estudiante/${estudianteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModulos(data.modulos || []);
    } catch {
      setModulos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetalle = async (moduloId) => {
    if (detalles[moduloId]) return;
    const token = getToken();
    setLoadingDetalle((p) => ({ ...p, [moduloId]: true }));
    try {
      const { data } = await axios.get(
        `${API}/api/modulos/${moduloId}/estudiante`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetalles((p) => ({ ...p, [moduloId]: data }));
    } catch {
      setDetalles((p) => ({ ...p, [moduloId]: { error: true } }));
    } finally {
      setLoadingDetalle((p) => ({ ...p, [moduloId]: false }));
    }
  };

  useEffect(() => { fetchModulos(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Cargando módulos..." />
      </div>
    );
  }

  if (!modulos.length) {
    return null;
  }

  const completados = modulos.filter((m) => m.estado === 'completado').length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <BookOutlined className="text-purple-600 text-xl" />
        </div>
        <div>
          <Title level={4} style={{ margin: 0 }}>Mis Módulos</Title>
          <Text type="secondary" className="text-sm">
            {completados} de {modulos.length} completados
          </Text>
        </div>
      </div>

      {/* Lista de módulos */}
      <div className="space-y-4">
        {modulos.map((modulo) => (
          <Card
            key={modulo.id}
            className="rounded-2xl shadow-sm"
            bodyStyle={{ padding: 0 }}
          >
            {/* Cabecera del módulo */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-2xl"
              onClick={() => fetchDetalle(modulo.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOutlined className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{modulo.titulo}</div>
                    {modulo.descripcion && (
                      <div className="text-sm text-gray-500 mt-0.5">{modulo.descripcion}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Tag
                        icon={modulo.estado === 'completado' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                        color={modulo.estado === 'completado' ? 'success' : 'processing'}
                      >
                        {modulo.estado === 'completado' ? 'Completado' : 'En progreso'}
                      </Tag>
                      {Number(modulo.total_pdfs) > 0 && (
                        <Tag icon={<FilePdfOutlined />} color="red">
                          {modulo.total_pdfs} PDF{Number(modulo.total_pdfs) !== 1 ? 's' : ''}
                        </Tag>
                      )}
                      {Number(modulo.total_evaluaciones) > 0 && (
                        <Tag icon={<TrophyOutlined />} color="purple">
                          {modulo.total_evaluaciones} evaluación{Number(modulo.total_evaluaciones) !== 1 ? 'es' : ''}
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<ArrowRightOutlined />}
                  onClick={(e) => { e.stopPropagation(); fetchDetalle(modulo.id); }}
                />
              </div>
            </div>

            {/* Loader */}
            {loadingDetalle[modulo.id] && (
              <div className="px-4 pb-4 flex items-center gap-2 text-gray-400 text-sm">
                <Spin size="small" /> Cargando contenido...
              </div>
            )}

            {/* Detalle expandido */}
            {detalles[modulo.id] && !detalles[modulo.id].error && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-5">

                {/* Contenido textual */}
                {detalles[modulo.id].modulo?.contenido && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <FileTextOutlined /> Información del módulo
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <Paragraph
                        style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 14, color: '#374151' }}
                        ellipsis={{ rows: 5, expandable: true, symbol: 'Ver más' }}
                      >
                        {detalles[modulo.id].modulo.contenido}
                      </Paragraph>
                    </div>
                  </div>
                )}

                {/* PDFs múltiples */}
                {detalles[modulo.id].pdfs?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FilePdfOutlined /> Materiales PDF ({detalles[modulo.id].pdfs.length})
                    </div>
                    <List
                      dataSource={detalles[modulo.id].pdfs}
                      renderItem={(pdf) => (
                        <List.Item
                          className="!px-3 !py-2 bg-red-50 rounded-xl mb-2 border border-red-100"
                          actions={[
                            <Button
                              key="ver"
                              size="small"
                              icon={<EyeOutlined />}
                              style={{ color: '#ef4444', borderColor: '#ef4444' }}
                              onClick={() => setPdfViewer({ url: pdf.pdf_url, nombre: pdf.nombre })}
                            >
                              Ver
                            </Button>,
                            <a key="link" href={pdf.pdf_url} target="_blank" rel="noreferrer">
                              <Button size="small" icon={<LinkOutlined />}>Abrir</Button>
                            </a>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<FilePdfOutlined style={{ fontSize: 20, color: '#ef4444' }} />}
                            title={<span className="text-sm font-medium text-gray-800">{pdf.nombre}</span>}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}

                {/* Evaluaciones */}
                {detalles[modulo.id].evaluaciones?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <TrophyOutlined /> Evaluaciones
                    </div>
                    <div className="space-y-2">
                      {detalles[modulo.id].evaluaciones.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
                        >
                          <div>
                            <div className="font-medium text-sm text-gray-800">{ev.titulo}</div>
                            {ev.descripcion && (
                              <div className="text-xs text-gray-400">{ev.descripcion}</div>
                            )}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {ev.es_requerida && <Tag color="orange" style={{ fontSize: 10 }}>Requerida</Tag>}
                              {ev.estado_asignacion && (
                                <Tag
                                  color={ev.estado_asignacion === 'finalizada' ? 'success' : 'processing'}
                                  style={{ fontSize: 10 }}
                                >
                                  {ev.estado_asignacion === 'finalizada'
                                    ? `Completada${ev.calificacion != null ? ` · ${Number(ev.calificacion).toFixed(1)}` : ''}`
                                    : 'Pendiente'}
                                </Tag>
                              )}
                            </div>
                          </div>
                          {ev.asignacion_id && ev.estado_asignacion !== 'finalizada' && (
                            <Button
                              type="primary"
                              size="small"
                              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                              onClick={() => navigate(`/evaluaciones/asignacion/${ev.asignacion_id}`)}
                            >
                              Resolver
                            </Button>
                          )}
                          {ev.estado_asignacion === 'finalizada' && (
                            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!detalles[modulo.id].modulo?.contenido &&
                 !detalles[modulo.id].pdfs?.length &&
                 !detalles[modulo.id].evaluaciones?.length && (
                  <Alert type="info" message="Este módulo aún no tiene contenido cargado." showIcon />
                )}
              </div>
            )}

            {detalles[modulo.id]?.error && (
              <div className="px-4 pb-4 pt-2">
                <Alert type="error" message="Error al cargar el contenido del módulo." showIcon />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Visor de PDF en modal */}
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
        width="85vw"
        style={{ top: 16 }}
        destroyOnClose
      >
        {pdfViewer && (
          <iframe
            src={pdfViewer.url}
            title={pdfViewer.nombre}
            width="100%"
            height="75vh"
            style={{ border: 'none', borderRadius: 8, display: 'block' }}
          />
        )}
      </Modal>
    </div>
  );
}
