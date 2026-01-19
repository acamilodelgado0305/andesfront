import React, { useState, useEffect } from "react";
import { Table, Button, Space, Popconfirm, message, Typography, Card, Tag, Input } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { getPrograms, deleteProgram } from "../../services/programs/programService";
import CreateProgramModal from "./addProgram";

const { Title } = Typography;

const ProgramsManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Estado para controlar qué programa se está editando
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

  // Abrir modal en modo CREAR
  const handleOpenCreate = () => {
    setEditingProgram(null); // Limpiamos edición
    setIsModalOpen(true);
  };

  // Abrir modal en modo EDITAR
  const handleOpenEdit = (program) => {
    setEditingProgram(program); // Cargamos datos
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchPrograms();
    // El mensaje de éxito ya lo maneja el Modal con Swal, pero si quieres usar antd message aquí puedes.
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
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value);
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      filteredValue: [searchText],
      onFilter: (value, record) =>
        record.nombre.toLowerCase().includes(value.toLowerCase()),
      width: '30%'
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo_programa',
      key: 'tipo',
      render: (type) => (
        <Tag color={type === 'Tecnico' ? 'blue' : 'green'}>{type}</Tag>
      )
    },
    {
      title: 'Duración',
      dataIndex: 'duracion_meses',
      key: 'duracion',
      render: (val) => val ? `${val} Meses` : '-'
    },
    {
      title: 'Mensualidad',
      dataIndex: 'valor_mensualidad',
      key: 'mensualidad',
      render: (val) => formatCurrency(val),
      responsive: ['md'] // Ocultar en móviles pequeños si es necesario
    },
    {
      title: 'Total Programa',
      dataIndex: 'monto_total',
      key: 'total',
      render: (val) => <span style={{ fontWeight: 'bold' }}>{formatCurrency(val)}</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (activo) => (
        <Tag color={activo ? 'success' : 'error'}>
          {activo ? 'Activo' : 'Inactivo'}
        </Tag>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {/* Botón Editar */}
          <Button
            icon={<EditOutlined />}
            type="primary"
            ghost
            onClick={() => handleOpenEdit(record)}
          />

          {/* Botón Eliminar */}
          <Popconfirm
            title="¿Eliminar programa?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteProgram(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card className="m-4 shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} style={{ margin: 0 }}>Programas Académicos</Title>
          <Typography.Text type="secondary">Gestiona la oferta educativa y sus costos</Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
          size="large"
        >
          Nuevo Programa
        </Button>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 400 }}>
        <Input
          placeholder="Buscar programa..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={programas}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 800 }} // Scroll horizontal en móviles
      />

      <CreateProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        programToEdit={editingProgram} // Pasamos el programa a editar (o null)
      />
    </Card>
  );
};

export default ProgramsManagement;