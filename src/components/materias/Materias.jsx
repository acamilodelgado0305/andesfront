import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, Input, Button, Space, Popconfirm, message, Typography, Card } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { getSubjects,deleteSubject, addSubject  } from "../../services/studentService";
import CreateMateriaModal from "./addMateria";

const { Title } = Typography;

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
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      sorter: (a, b) => a.codigo.localeCompare(b.codigo),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
    },
    {
      title: 'ID del Programa',
      dataIndex: 'program_id',
      key: 'program_id',
      sorter: (a, b) => a.program_id - b.program_id,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="¿Estás seguro de eliminar esta materia?"
            onConfirm={() => handleDeleteMateria(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
          <Link to={`/edit-materia/${record.id}`}>
            <Button icon={<EditOutlined />} type="primary" />
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <Card className="m-4">
      <div className="flex justify-between items-center mb-4">
        <Title level={2}>Gestión de Materias</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Crear Materia
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre de la materia"
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={materias}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      <CreateMateriaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMateriaAdded={handleMateriaAdded}
      />
    </Card>
  );
};

export default Materias;