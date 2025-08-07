import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Layout, Typography, Row, Col, Card, Spin, Alert, Statistic, Empty,
  Button, Drawer, Form, Input, InputNumber, notification, Tooltip,
  Modal
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreAddOutlined, CheckCircleFilled } from '@ant-design/icons';

// Componentes de Ant Design que usaremos
const { Content } = Layout;
const { Title, Text } = Typography;

// La URL de tu API desde las variables de entorno
const API_URL = import.meta.env.VITE_API_BACKEND;

function Inventario() {
  // --- ESTADOS DEL COMPONENTE ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [form] = Form.useForm();

  // --- LÓGICA DE DATOS ---
  const fetchInventario = useCallback(async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('Usuario no autenticado. Por favor, inicie sesión.');

      // Lógica de Token eliminada de la petición
      const response = await axios.get(`${API_URL}/inventario/user/${userId}`);
      setItems(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Ocurrió un error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventario();
  }, [fetchInventario]);

  // Efecto para popular el formulario al editar
  useEffect(() => {
    if (editingItem) {
      form.setFieldsValue(editingItem);
    } else {
      form.resetFields();
    }
  }, [editingItem, form]);

  // --- MANEJADORES DE EVENTOS ---

  const handleCardClick = (e, item) => {
    if (e.target.closest('.ant-btn-icon-only')) return;
    const newSelection = selectedItems.includes(item.id)
      ? selectedItems.filter(id => id !== item.id)
      : [...selectedItems, item.id];
    setSelectedItems(newSelection);
  };

  const handleOpenCreateDrawer = () => {
    setEditingItem(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (item) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    const isEditing = editingItem !== null;
    const url = isEditing ? `${API_URL}/inventario/${editingItem.id}` : `${API_URL}/inventario`;
    const method = isEditing ? 'put' : 'post';
    const payload = isEditing ? values : { ...values, user_id: parseInt(localStorage.getItem('userId'), 10) };

    try {
      // Lógica de Token eliminada de la petición
      const response = await axios[method](url, payload);
      notification.success({ message: '¡Éxito!', description: response.data.message });
      closeDrawer();
      await fetchInventario();
    } catch (err) {
      notification.error({ message: `Error al ${isEditing ? 'actualizar' : 'crear'}`, description: err.response?.data?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = () => {
    Modal.confirm({
      title: `¿Eliminar ${selectedItems.length} ítem(s)?`,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          // Lógica de Token eliminada de la petición
          await axios.delete(`${API_URL}/inventario`, { data: { ids: selectedItems } });
          notification.success({ message: 'Ítems eliminados con éxito' });
          await fetchInventario();
          setSelectedItems([]);
        } catch (err) {
          notification.error({ message: 'Error al eliminar', description: err.response?.data?.message });
        }
      },
    });
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Layout>
      <Content className="bg-gray-50 min-h-screen p-6">
        <Card className="shadow-md rounded-lg overflow-hidden" bordered={false}>



          {/* Barra de acciones flotante con nuevo tema y lógica de visibilidad corregida */}
          <div className={`sticky  z-50 bg-white    mb-5 flex justify-between items-center transition-all duration-300 ease-in-out ${selectedItems.length > 0 ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
            <Text strong className="text-{#155153}">{selectedItems.length} seleccionado(s)</Text>
            <div>
              <Button onClick={() => setSelectedItems([])} className="mr-2 text-{#155153} border-green-900">
                Deseleccionar todo
              </Button>
              <Button type="primary" danger icon={<DeleteOutlined />} onClick={handleDeleteSelected}>
                Eliminar
              </Button>
            </div>
          </div>

          {/* Cabecera */}
          <div className="flex justify-between items-center mb-6">
            <Title level={2} className="m-0">Mi Inventario 📋</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateDrawer}>Añadir Ítem</Button>
          </div>

          {/* Contenido principal */}
          <Spin spinning={loading} tip="Cargando..." size="large">
            {error && <Alert message="Error" description={error} type="error" showIcon className="mb-6" />}
            {!error && !loading && items.length === 0 && <Empty description="Tu inventario está vacío." />}

            <Row gutter={[16, 16]}>
              {items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                    <Card
                      onClick={(e) => handleCardClick(e, item)}
                      className={`relative cursor-pointer transition-all duration-200 ease-in-out border-2 hover:-translate-y-1 hover:shadow-xl ${isSelected ? 'border-green-900 bg-green-50' : 'border-transparent'}`}
                      title={<Text ellipsis={{ tooltip: item.nombre }}>{item.nombre}</Text>}
                      extra={
                        <Tooltip title="Editar">
                          <Button type="text" shape="circle" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenEditDrawer(item); }} />
                        </Tooltip>
                      }
                    >
                      {isSelected && <CheckCircleFilled className="absolute top-4 left-4 text-2xl text-{#155153}" />}
                      <p className="min-h-[40px] text-gray-600">{item.descripcion || 'Sin descripción.'}</p>
                      <Statistic value={item.monto} prefix="$" formatter={(value) => new Intl.NumberFormat('es-CO').format(value)} />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Spin>

        </Card>

        {/* Drawer para Crear/Editar */}
        <Drawer
          title={
            <div className="flex items-center">
              <AppstoreAddOutlined className="mr-2 text-blue-500" />
              <span>{editingItem ? 'Editar Ítem del Inventario' : 'Crear Nuevo Ítem'}</span>
            </div>
          }
          width={480}
          onClose={closeDrawer}
          open={isDrawerOpen}
          destroyOnClose
          footer={
            <div className="text-right">
              <Button onClick={closeDrawer} className="mr-2">Cancelar</Button>
              <Button onClick={() => form.submit()} type="primary" loading={isSubmitting}>
                {editingItem ? 'Guardar Cambios' : 'Crear Ítem'}
              </Button>
            </div>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item name="nombre" label="Nombre del Programa" rules={[{ required: true, message: 'El nombre es obligatorio.' }]}>
              <Input placeholder="Ej: Técnico en Sistemas" />
            </Form.Item>
            <Form.Item name="monto" label="Monto" rules={[{ required: true, message: 'El monto es obligatorio.' }]}>
              <InputNumber className="w-full" prefix="$" placeholder="Ej: 70000" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')} />
            </Form.Item>
            <Form.Item name="descripcion" label="Descripción (Opcional)">
              <Input.TextArea rows={4} placeholder="Detalles adicionales..." />
            </Form.Item>
          </Form>
        </Drawer>
      </Content>
    </Layout>
  );
}

export default Inventario;