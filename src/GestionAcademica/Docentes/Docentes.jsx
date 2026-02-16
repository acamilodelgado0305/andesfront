import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, message, Spin, Typography, Space, Popconfirm, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, IdcardOutlined,
  SearchOutlined, ReloadOutlined, MailOutlined, UserOutlined,
} from '@ant-design/icons';
import { getAllDocentes, createDocente, deleteDocente, updateDocente } from '../../services/docentes/serviceDocente';

const { Title, Text } = Typography;
const PRIMARY_COLOR = '#155153';

function Docentes() {
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDocente, setEditingDocente] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchDocentes = async () => {
    try {
      setLoading(true);
      const data = await getAllDocentes();
      setDocentes(data);
    } catch (error) {
      message.error('Error al cargar los docentes. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
  }, []);

  // Filtrado
  const filteredDocentes = useMemo(() => {
    if (!searchText.trim()) return docentes;
    const term = searchText.toLowerCase();
    return docentes.filter(
      (d) =>
        (d.nombre_completo || '').toLowerCase().includes(term) ||
        (d.email || '').toLowerCase().includes(term) ||
        (d.especialidad || '').toLowerCase().includes(term)
    );
  }, [docentes, searchText]);

  // Stats
  const totalDocentes = docentes.length;
  const withSpecialty = docentes.filter((d) => d.especialidad).length;

  // Modal handlers
  const showModal = () => {
    setEditingDocente(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (docente) => {
    setEditingDocente(docente);
    form.setFieldsValue(docente);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingDocente(null);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (editingDocente) {
        await updateDocente(editingDocente.id, values);
        message.success('Docente actualizado exitosamente');
      } else {
        await createDocente(values);
        message.success('Docente creado exitosamente');
      }
      setIsModalVisible(false);
      fetchDocentes();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocurrió un error. Intenta de nuevo.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docenteId) => {
    try {
      setLoading(true);
      await deleteDocente(docenteId);
      message.success('Docente eliminado exitosamente');
      fetchDocentes();
    } catch (error) {
      message.error('Error al eliminar el docente.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Nombre Completo',
      dataIndex: 'nombre_completo',
      key: 'nombre_completo',
      sorter: (a, b) => a.nombre_completo.localeCompare(b.nombre_completo),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => (
        <span style={{ color: '#6b7280' }}>{text || '—'}</span>
      ),
    },
    {
      title: 'Especialidad',
      dataIndex: 'especialidad',
      key: 'especialidad',
      render: (text) =>
        text ? (
          <span
            style={{
              background: '#e8f5f5',
              color: PRIMARY_COLOR,
              padding: '3px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {text}
          </span>
        ) : (
          <span style={{ color: '#d1d5db' }}>Sin especialidad</span>
        ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: PRIMARY_COLOR }}
            />
          </Tooltip>
          <Popconfirm
            title="¿Estás seguro de eliminar este docente?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statCards = [
    {
      label: 'Total Docentes',
      value: totalDocentes,
      icon: <IdcardOutlined />,
      gradient: 'linear-gradient(135deg, #155153, #28a5a5)',
      shadow: 'rgba(21, 81, 83, 0.25)',
    },
    {
      label: 'Con Especialidad',
      value: withSpecialty,
      icon: <UserOutlined />,
      gradient: 'linear-gradient(135deg, #2c3e50, #5390d9)',
      shadow: 'rgba(44, 62, 80, 0.25)',
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #155153, #28a5a5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#fff',
              boxShadow: '0 4px 12px rgba(21, 81, 83, 0.3)',
            }}
          >
            <IdcardOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a2e', letterSpacing: '-0.5px' }}>
              Gestión de Docentes
            </Title>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>
              Administra el equipo docente de tu institución
            </Text>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28, maxWidth: 500 }}>
        {statCards.map((card, i) => (
          <StatCard key={i} card={card} loading={loading} />
        ))}
      </div>

      {/* Search & Actions */}
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          marginBottom: 20, padding: '16px 20px',
          background: '#fff', borderRadius: 14,
          border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <Input
          placeholder="Buscar por nombre, email o especialidad..."
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: '1 1 300px', minWidth: 240, borderRadius: 10, height: 42 }}
          allowClear
          size="large"
        />
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchDocentes} loading={loading}
            style={{ height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            Recargar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={showModal}
            style={{
              height: 42, borderRadius: 10, background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR,
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(21, 81, 83, 0.3)',
            }}>
            Crear Docente
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredDocentes}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `Mostrando ${range[0]}-${range[1]} de ${total} docentes`,
              style: { padding: '12px 20px', margin: 0 },
            }}
            size="middle"
          />
        </Spin>
      </div>

      {/* Modal */}
      <Modal
        title={editingDocente ? 'Editar Docente' : 'Crear Nuevo Docente'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: '24px' }}>
          <Form.Item name="nombre_completo" label="Nombre Completo"
            rules={[{ required: true, message: 'Por favor, ingresa el nombre completo' }]}>
            <Input prefix={<UserOutlined style={{ color: '#d1d5db' }} />} />
          </Form.Item>
          <Form.Item name="email" label="Email"
            rules={[
              { required: true, message: 'Por favor, ingresa el email' },
              { type: 'email', message: 'El email no es válido' },
            ]}>
            <Input prefix={<MailOutlined style={{ color: '#d1d5db' }} />} />
          </Form.Item>
          <Form.Item name="especialidad" label="Especialidad">
            <Input />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={handleCancel}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={loading}
                style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}>
                {editingDocente ? 'Guardar Cambios' : 'Crear Docente'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th {
          background: #f8fafb !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: #4b5563 !important;
          border-bottom: 2px solid #e5e7eb !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #f0f7f7 !important;
        }
        .ant-table-tbody > tr {
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
}

/* ===== StatCard ===== */
function StatCard({ card, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, padding: '20px 22px', background: '#fff',
        border: '1px solid #e8ecf0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 28px ${card.shadow}` : '0 2px 8px rgba(0,0,0,0.05)',
        position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: card.gradient, borderRadius: '16px 16px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: card.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: '#fff', flexShrink: 0,
          transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}>
          {card.icon}
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
            {card.label}
          </div>
          {loading ? <Spin size="small" /> : (
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.1 }}>{card.value}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Docentes;