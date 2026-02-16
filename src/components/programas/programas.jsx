import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Space, Popconfirm, message, Typography, Input, Tag, Tooltip, Spin } from 'antd';
import {
  DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined,
  ReloadOutlined, BookOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { getPrograms, deleteProgram } from "../../services/programs/programService";
import CreateProgramModal from "./addProgram";

const { Title, Text } = Typography;
const PRIMARY_COLOR = '#155153';

const ProgramsManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingProgram, setEditingProgram] = useState(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const data = await getPrograms();
      setProgramas(data);
    } catch (err) {
      console.error("Error fetching programs:", err);
      message.error('Error al cargar los programas');
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredProgramas = useMemo(() => {
    if (!searchText.trim()) return programas;
    const term = searchText.toLowerCase();
    return programas.filter(
      (p) =>
        (p.nombre || '').toLowerCase().includes(term) ||
        (p.tipo_programa || '').toLowerCase().includes(term)
    );
  }, [programas, searchText]);

  // Stats
  const totalPrograms = programas.length;
  const activePrograms = programas.filter((p) => p.activo).length;
  const techPrograms = programas.filter((p) => (p.tipo_programa || '').toLowerCase().includes('tecnico')).length;

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchPrograms();
  };

  const handleDeleteProgram = async (programId) => {
    try {
      const response = await deleteProgram(programId);
      if (response.ok) {
        message.success('Programa eliminado correctamente');
        fetchPrograms();
      } else {
        message.error(response.error || 'Error al eliminar');
      }
    } catch (error) {
      message.error('Error de conexión');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(value);
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      width: '28%',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo_programa',
      key: 'tipo',
      render: (type) => {
        const isTech = (type || '').toLowerCase().includes('tecnico');
        return (
          <span style={{
            background: isTech ? '#eaf0f8' : '#e8f5f5',
            color: isTech ? '#2c3e50' : PRIMARY_COLOR,
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          }}>
            {type}
          </span>
        );
      },
    },
    {
      title: 'Duración',
      dataIndex: 'duracion_meses',
      key: 'duracion',
      render: (val) => val ? `${val} Meses` : '—',
    },
    {
      title: 'Mensualidad',
      dataIndex: 'valor_mensualidad',
      key: 'mensualidad',
      render: (val) => <span style={{ color: '#6b7280' }}>{formatCurrency(val)}</span>,
      responsive: ['md'],
    },
    {
      title: 'Total Programa',
      dataIndex: 'monto_total',
      key: 'total',
      render: (val) => <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{formatCurrency(val)}</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (activo) => (
        <Tag
          icon={activo ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={activo ? 'success' : 'error'}
        >
          {activo ? 'Activo' : 'Inactivo'}
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
            <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}
              style={{ color: PRIMARY_COLOR }} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar programa?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteProgram(record.id)}
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
      label: 'Total Programas', value: totalPrograms,
      icon: <BookOutlined />,
      gradient: 'linear-gradient(135deg, #155153, #28a5a5)',
      shadow: 'rgba(21, 81, 83, 0.25)',
    },
    {
      label: 'Activos', value: activePrograms,
      icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(135deg, #0f9b0f, #4ecf4e)',
      shadow: 'rgba(15, 155, 15, 0.25)',
    },
    {
      label: 'Técnicos', value: techPrograms,
      icon: <BookOutlined />,
      gradient: 'linear-gradient(135deg, #2c3e50, #5390d9)',
      shadow: 'rgba(44, 62, 80, 0.25)',
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
            <BookOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a2e', letterSpacing: '-0.5px' }}>
              Programas Académicos
            </Title>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>
              Gestiona la oferta educativa y sus costos
            </Text>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28, maxWidth: 650 }}>
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
          placeholder="Buscar programa..."
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: '1 1 300px', minWidth: 240, borderRadius: 10, height: 42 }}
          allowClear size="large"
        />
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchPrograms} loading={loading}
            style={{ height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            Recargar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}
            style={{
              height: 42, borderRadius: 10, background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR,
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(21, 81, 83, 0.3)',
            }}>
            Nuevo Programa
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredProgramas}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `Mostrando ${range[0]}-${range[1]} de ${total} programas`,
              style: { padding: '12px 20px', margin: 0 },
            }}
            scroll={{ x: 800 }}
            size="middle"
          />
        </Spin>
      </div>

      <CreateProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        programToEdit={editingProgram}
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

export default ProgramsManagement;