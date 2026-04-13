import React from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Tag, Switch, Spin, Typography, Flex, Space, Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllMaterias, createMateria, updateMateria, deleteMateria } from '../../services/materias/serviceMateria';
import { getAllDocentes } from '../../services/docentes/serviceDocente';
import { getProgramas } from '../../services/programas/programasService';

const { Title } = Typography;
const { Option } = Select;
const PRIMARY_COLOR = '#155153';

function Materias() {
  const [materias, setMaterias] = React.useState([]);
  const [docentes, setDocentes] = React.useState([]);
  const [programas, setProgramas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [editingMateria, setEditingMateria] = React.useState(null);
  const [filterProgramaId, setFilterProgramaId] = React.useState(null);

  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [materiasData, docentesData, programasData] = await Promise.all([
        getAllMaterias(),
        getAllDocentes(),
        getProgramas(),
      ]);
      setMaterias(materiasData);
      setDocentes(docentesData);
      setProgramas(programasData);
    } catch (error) {
      message.error('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const showModal = () => {
    setEditingMateria(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (materia) => {
    setEditingMateria(materia);
    form.setFieldsValue({
      nombre: materia.nombre,
      programa_id: materia.programa_id,
      docente_id: materia.docente_id,
    });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingMateria(null);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (editingMateria) {
        await updateMateria(editingMateria.id, values);
        message.success('Materia actualizada exitosamente');
      } else {
        await createMateria(values);
        message.success('Materia creada exitosamente');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocurrió un error.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (materiaId) => {
    try {
      setLoading(true);
      await deleteMateria(materiaId);
      message.success('Materia eliminada exitosamente');
      fetchData();
    } catch (error) {
      message.error('Error al eliminar la materia.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (materia, nuevoEstado) => {
    try {
      setLoading(true);
      await updateMateria(materia.id, { ...materia, activa: nuevoEstado });
      message.success(`Estado de la materia "${materia.nombre}" actualizado.`);
      fetchData();
    } catch (error) {
      message.error('Error al cambiar el estado.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterias = filterProgramaId
    ? materias.filter((m) => m.programa_id === filterProgramaId)
    : materias;

  const columns = [
    {
      title: 'Programa',
      dataIndex: 'programa_nombre',
      key: 'programa_nombre',
      render: (text) => text || <span style={{ color: '#aaa' }}>Sin programa</span>,
    },
    {
      title: 'Materia',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Docente Asignado',
      dataIndex: 'docente_nombre',
      key: 'docente_nombre',
      render: (text) => text || <span style={{ color: '#aaa' }}>Sin asignar</span>,
    },
    {
      title: 'Tipo de Programa',
      dataIndex: 'tipo_programa',
      key: 'tipo_programa',
      render: (text) => text || '—',
    },
    {
      title: 'Estado',
      dataIndex: 'activa',
      key: 'activa',
      align: 'center',
      render: (activa, record) => (
        <Flex gap="small" align="center" justify="center">
          <Tag color={activa ? 'green' : 'red'}>{activa ? 'Activa' : 'Inactiva'}</Tag>
          <Switch
            checked={activa}
            onChange={(checked) => handleStatusChange(record, checked)}
            size="small"
          />
        </Flex>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="¿Estás seguro de eliminar esta materia?"
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
        <Title level={2} style={{ margin: 0 }}>Gestión de Materias</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showModal}
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          Crear Materia
        </Button>
      </Flex>

      <div style={{ marginBottom: '16px' }}>
        <Select
          allowClear
          placeholder="Filtrar por programa"
          style={{ width: 280 }}
          onChange={(val) => setFilterProgramaId(val ?? null)}
        >
          {programas.map((p) => (
            <Option key={p.id} value={p.id}>{p.nombre}</Option>
          ))}
        </Select>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredMaterias}
          rowKey="id"
          bordered
          pagination={{ pageSize: 10 }}
        />
      </Spin>

      <Modal
        title={editingMateria ? 'Editar Materia' : 'Crear Nueva Materia'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: '24px' }}>
          <Form.Item
            name="programa_id"
            label="Programa"
            rules={[{ required: true, message: 'Por favor, selecciona un programa' }]}
          >
            <Select placeholder="Selecciona el programa">
              {programas.map((p) => (
                <Option key={p.id} value={p.id}>{p.nombre}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="nombre"
            label="Nombre de la Materia"
            rules={[{ required: true, message: 'Por favor, ingresa el nombre' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="docente_id" label="Asignar Docente">
            <Select placeholder="Selecciona un docente (opcional)" allowClear>
              {docentes.map((docente) => (
                <Option key={docente.id} value={docente.id}>{docente.nombre_completo}</Option>
              ))}
            </Select>
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
                {editingMateria ? 'Guardar Cambios' : 'Crear Materia'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Materias;
