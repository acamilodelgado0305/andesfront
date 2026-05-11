import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, InputNumber, Space,
  Tag, Tooltip, message, Popconfirm, Typography, Card, Upload
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  BookOutlined, TeamOutlined, FileTextOutlined, FilePdfOutlined,
  InboxOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const API = import.meta.env.VITE_API_BACKEND;

export default function ModulosPage() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);   // múltiples PDFs seleccionados
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [form] = Form.useForm();

  const token = localStorage.getItem('authToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchModulos = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/modulos`, { headers });
      setModulos(data.modulos || []);
    } catch {
      message.error('Error al cargar módulos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModulos(); }, []);

  const openCreate = () => {
    setEditingModulo(null);
    setPdfFiles([]);
    form.resetFields();
    form.setFieldsValue({ activa: true, orden: 0 });
    setModalOpen(true);
  };

  const openEdit = (modulo) => {
    setEditingModulo(modulo);
    setPdfFiles([]);
    form.setFieldsValue(modulo);
    setModalOpen(true);
  };

  // Subir PDFs pendientes a GCS
  const uploadPdfsPendientes = async (moduloId) => {
    if (!pdfFiles.length) return;
    setUploadingPdf(true);
    const formData = new FormData();
    pdfFiles.forEach((f) => formData.append('pdfs', f));
    try {
      await axios.post(`${API}/api/modulos/${moduloId}/pdfs`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
    } catch {
      message.warning('Módulo guardado, pero hubo un error al subir los PDFs.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      let moduloId;
      if (editingModulo) {
        await axios.put(`${API}/api/modulos/${editingModulo.id}`, values, { headers });
        moduloId = editingModulo.id;
        message.success('Módulo actualizado');
      } else {
        const { data } = await axios.post(`${API}/api/modulos`, values, { headers });
        moduloId = data.modulo.id;
        message.success('Módulo creado');
      }
      await uploadPdfsPendientes(moduloId);
      setModalOpen(false);
      fetchModulos();
    } catch {
      message.error('Error al guardar módulo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/modulos/${id}`, { headers });
      message.success('Módulo eliminado');
      fetchModulos();
    } catch {
      message.error('Error al eliminar módulo');
    }
  };

  // Dragger multi-archivo sin subida automática
  const uploadProps = {
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

  const columns = [
    {
      title: 'Orden',
      dataIndex: 'orden',
      width: 70,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: 'Título',
      dataIndex: 'titulo',
      render: (text, record) => (
        <div>
          <div className="font-semibold text-gray-800">{text}</div>
          {record.descripcion && (
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{record.descripcion}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activa',
      width: 90,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Evaluaciones',
      dataIndex: 'total_evaluaciones',
      width: 110,
      render: (v) => (
        <span className="flex items-center gap-1 text-purple-600">
          <FileTextOutlined /> {v}
        </span>
      ),
    },
    {
      title: 'Estudiantes',
      dataIndex: 'total_estudiantes',
      width: 110,
      render: (v) => (
        <span className="flex items-center gap-1 text-blue-600">
          <TeamOutlined /> {v}
        </span>
      ),
    },
    {
      title: 'PDFs',
      dataIndex: 'total_pdfs',
      width: 80,
      render: (v) => (
        <span className="flex items-center gap-1 text-red-500">
          <FilePdfOutlined /> {v}
        </span>
      ),
    },
    {
      title: 'Acciones',
      width: 130,
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalle">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/inicio/modulos/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este módulo?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí" cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookOutlined className="text-purple-600 text-lg" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>Módulos Educativos</Title>
            <Text type="secondary" className="text-xs">
              Contenido independiente con PDFs, información y evaluaciones
            </Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
        >
          Nuevo Módulo
        </Button>
      </div>

      <Card bodyStyle={{ padding: 0 }} className="rounded-xl overflow-hidden">
        <Table
          columns={columns}
          dataSource={modulos}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={editingModulo ? 'Editar Módulo' : 'Nuevo Módulo'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-3">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="titulo"
              label="Título"
              className="col-span-2"
              rules={[{ required: true, message: 'El título es requerido' }]}
            >
              <Input placeholder="Ej: Módulo 1 - Introducción" />
            </Form.Item>

            <Form.Item name="descripcion" label="Descripción corta" className="col-span-2">
              <Input placeholder="Resumen breve del módulo" />
            </Form.Item>

            <Form.Item name="contenido" label="Contenido / Información" className="col-span-2">
              <TextArea
                rows={4}
                placeholder="Texto informativo que verán los estudiantes al abrir el módulo..."
              />
            </Form.Item>

            {/* PDFs — subida múltiple a Google Cloud Storage */}
            <Form.Item label="PDFs del módulo" className="col-span-2">
              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#7c3aed' }} />
                </p>
                <p className="ant-upload-text text-sm">
                  Arrastra uno o varios PDFs aquí, o haz clic para seleccionarlos
                </p>
                <p className="ant-upload-hint text-xs text-gray-400">
                  Solo PDF · Máx. 20 MB por archivo · Se guardan en Google Cloud Storage
                </p>
              </Dragger>
              {pdfFiles.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {pdfFiles.length} archivo{pdfFiles.length !== 1 ? 's' : ''} seleccionado{pdfFiles.length !== 1 ? 's' : ''}
                </div>
              )}
              {editingModulo && (
                <p className="text-xs text-gray-400 mt-1">
                  Los PDFs nuevos se agregarán a los existentes. Para eliminar PDFs ve al detalle del módulo.
                </p>
              )}
            </Form.Item>

            <Form.Item name="orden" label="Orden">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>

            <Form.Item name="activa" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving || uploadingPdf}
              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
            >
              {uploadingPdf ? 'Subiendo PDFs...' : saving ? 'Guardando...' : editingModulo ? 'Guardar cambios' : 'Crear módulo'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
