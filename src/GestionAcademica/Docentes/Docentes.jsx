import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, message, Spin, Typography, Flex, Space, Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllDocentes, createDocente, deleteDocente, updateDocente } from './serviceDocente';

const { Title } = Typography;
const PRIMARY_COLOR = '#155153';

function Docentes() {
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDocente, setEditingDocente] = useState(null);

  // Hook de Ant Design para controlar el formulario desde fuera
  const [form] = Form.useForm();

  // Función para cargar los datos desde la API
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

  // useEffect para cargar los datos cuando el componente se monta
  useEffect(() => {
    fetchDocentes();
  }, []);

  // Manejo del modal
  const showModal = () => {
    setEditingDocente(null);
    form.resetFields(); // Limpia el formulario para una nueva entrada
    setIsModalVisible(true);
  };

  const handleEdit = (docente) => {
    setEditingDocente(docente);
    form.setFieldsValue(docente); // Llena el formulario con los datos del docente a editar
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingDocente(null);
  };

  // Manejo del formulario (Crear y Actualizar)
  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (editingDocente) {
        // Actualizando un docente existente
        await updateDocente(editingDocente.id, values);
        message.success('Docente actualizado exitosamente');
      } else {
        // Creando un nuevo docente
        await createDocente(values);
        message.success('Docente creado exitosamente');
      }
      setIsModalVisible(false);
      fetchDocentes(); // Recarga la lista de docentes
    } catch (error) {
      // El backend ya nos da un mensaje específico para email duplicado
      const errorMessage = error.response?.data?.message || 'Ocurrió un error. Intenta de nuevo.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de la eliminación
  const handleDelete = async (docenteId) => {
    try {
      setLoading(true);
      await deleteDocente(docenteId);
      message.success('Docente eliminado exitosamente');
      fetchDocentes(); // Recarga la lista
    } catch (error) {
      message.error('Error al eliminar el docente.');
    } finally {
      setLoading(false);
    }
  };

  // Definición de las columnas para la tabla
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
    },
    {
      title: 'Especialidad',
      dataIndex: 'especialidad',
      key: 'especialidad',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="¿Estás seguro de eliminar este docente?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Gestión de Docentes</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showModal}
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          Crear Docente
        </Button>
      </Flex>
      
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={docentes}
          rowKey="id"
          bordered
          pagination={{ pageSize: 10 }}
        />
      </Spin>

      <Modal
        title={editingDocente ? 'Editar Docente' : 'Crear Nuevo Docente'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null} // El pie de página lo controlará el formulario
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="nombre_completo"
            label="Nombre Completo"
            rules={[{ required: true, message: 'Por favor, ingresa el nombre completo' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Por favor, ingresa el email' },
              { type: 'email', message: 'El email no es válido' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="especialidad"
            label="Especialidad"
          >
            <Input />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={handleCancel}>Cancelar</Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
              >
                {editingDocente ? 'Guardar Cambios' : 'Crear Docente'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Docentes;