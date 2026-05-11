import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Tag, Table, Select, message, Popconfirm, Tooltip, Spin,
  Typography, Tabs, Card, Empty, Badge, Modal, Form, Input, Switch,
  InputNumber, Space, Upload, List
} from 'antd';
import {
  ArrowLeftOutlined, WhatsAppOutlined, PlusOutlined, DeleteOutlined,
  FilePdfOutlined, BookOutlined, TeamOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, EditOutlined, LinkOutlined,
  InboxOutlined, TrophyOutlined, EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const API = import.meta.env.VITE_API_BACKEND;

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

  const token = localStorage.getItem('authToken');
  const headers = { Authorization: `Bearer ${token}` };

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
  }, [fetchDetalle]);

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

      <Tabs defaultActiveKey="contenido" items={[
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
    </div>
  );
}
