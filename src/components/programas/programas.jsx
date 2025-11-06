import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, Input, Button, Space, Popconfirm, message, Typography, Card } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import CreateProgramModal from "./addProgram";
import { getPrograms, deleteProgram } from "../../services/programs/programService";

const { Title } = Typography;

const ProgramsManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

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

  const handleProgramAdded = () => {
    fetchPrograms();
    message.success('Programa añadido exitosamente');
  };

  const handleDeleteProgram = async (programId) => {
    try {
      const response = await deleteProgram(programId);
      if (response.ok) {
        message.success('El programa ha sido eliminado');
        fetchPrograms();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("Error al eliminar el programa:", error);
      message.error('No se pudo eliminar el programa');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      filteredValue: [searchText],
      onFilter: (value, record) =>
        record.nombre.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.monto - b.monto,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="¿Estás seguro de eliminar este programa?"
            onConfirm={() => handleDeleteProgram(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
          <Link to={`/edit-program/${record.id}`}>
            <Button icon={<EditOutlined />} type="primary" />
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <Card className="m-4">
      <div className="flex justify-between items-center mb-4">
        <Title level={2}>Gestión de Programas</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Crear Programa
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre del programa"
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={programas}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      <CreateProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProgramAdded={handleProgramAdded}
      />
    </Card>
  );
};

export default ProgramsManagement;