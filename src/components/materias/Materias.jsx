import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Table, Input, Button, Space, Popconfirm, message, Typography, Tooltip, Spin, Tag } from 'antd';
import {
  DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined,
  ReloadOutlined, ReadOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { getSubjects, deleteSubject, addSubject } from "../../services/studentService";
import CreateMateriaModal from "./addMateria";

const { Title, Text } = Typography;
const PRIMARY_COLOR = '#155153';

const Materias = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchMaterias();
  }, []);

  const fetchMaterias = async () => {
    setLoading(true);
    try {
      const data = await getSubjects();
      setMaterias(data);
    } catch (err) {
      console.error("Error fetching materias:", err);
      message.error('Error al cargar las materias');
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredMaterias = useMemo(() => {
    if (!searchText.trim()) return materias;
    const term = searchText.toLowerCase();
    return materias.filter(
      (m) =>
        (m.nombre || '').toLowerCase().includes(term) ||
        (m.codigo || '').toLowerCase().includes(term) ||
        (m.descripcion || '').toLowerCase().includes(term)
    );
  }, [materias, searchText]);

  // Stats
  const totalMaterias = materias.length;
  const activeMaterias = materias.filter((m) => m.activa).length;

  const handleMateriaAdded = () => {
    fetchMaterias();
    message.success('Materia añadida exitosamente');
  };

  const handleDeleteMateria = async (materiaId) => {
    try {
      const response = await addSubject(materiaId);
      if (response.ok) {
        message.success('La materia ha sido eliminada');
        fetchMaterias();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("Error al eliminar la materia:", error);
      message.error('No se pudo eliminar la materia');
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => (a.nombre || '').localeCompare(b.nombre || ''),
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      render: (text) =>
        text ? (
          <span style={{
            background: '#f3f4f6', color: '#374151',
            padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace',
          }}>
            {text}
          </span>
        ) : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ color: '#6b7280' }}>{text || '—'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Programa',
      dataIndex: 'tipo_programa',
      key: 'tipo_programa',
      render: (text) =>
        text ? (
          <span style={{
            background: '#e8f5f5', color: PRIMARY_COLOR,
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          }}>
            {text}
          </span>
        ) : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'activa',
      key: 'activa',
      width: 110,
      render: (activa) => (
        <Tag
          icon={activa ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={activa ? 'success' : 'default'}
        >
          {activa ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Link to={`/edit-materia/${record.id}`}>
              <Button type="text" icon={<EditOutlined />} style={{ color: PRIMARY_COLOR }} />
            </Link>
          </Tooltip>
          <Popconfirm
            title="¿Estás seguro de eliminar esta materia?"
            onConfirm={() => handleDeleteMateria(record.id)}
            okText="Sí" cancelText="No"
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
      label: 'Total Materias', value: totalMaterias,
      icon: <ReadOutlined />,
      gradient: 'linear-gradient(135deg, #155153, #28a5a5)',
      shadow: 'rgba(21, 81, 83, 0.25)',
    },
    {
      label: 'Activas', value: activeMaterias,
      icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(135deg, #0f9b0f, #4ecf4e)',
      shadow: 'rgba(15, 155, 15, 0.25)',
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #155153, #28a5a5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff',
            boxShadow: '0 4px 12px rgba(21, 81, 83, 0.3)',
          }}>
            <ReadOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a2e', letterSpacing: '-0.5px' }}>
              Gestión de Materias
            </Title>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>
              Administra las materias y asignaturas de tus programas
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
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        marginBottom: 20, padding: '16px 20px',
        background: '#fff', borderRadius: 14,
        border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <Input
          placeholder="Buscar por nombre, código o descripción..."
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: '1 1 300px', minWidth: 240, borderRadius: 10, height: 42 }}
          allowClear size="large"
        />
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchMaterias} loading={loading}
            style={{ height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            Recargar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}
            style={{
              height: 42, borderRadius: 10, background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR,
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(21, 81, 83, 0.3)',
            }}>
            Crear Materia
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredMaterias}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `Mostrando ${range[0]}-${range[1]} de ${total} materias`,
              style: { padding: '12px 20px', margin: 0 },
            }}
            size="middle"
          />
        </Spin>
      </div>

      <CreateMateriaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMateriaAdded={handleMateriaAdded}
      />

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
};

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

export default Materias;