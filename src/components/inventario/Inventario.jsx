import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Card,
  Spin,
  Alert,
  Statistic,
  Empty,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  notification,
  Tooltip,
  Modal,
  Tag
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreAddOutlined,
  CheckCircleFilled,
  ShoppingOutlined,
  ReloadOutlined
} from "@ant-design/icons";

// 🔹 Importamos los servicios estandarizados
import {
  getInventario,      // Usamos este que usa el token
  createInventario,
  updateInventario,
  deleteInventario,
} from "../../services/inventario/inventarioService";

const { Content } = Layout;
const { Title, Text } = Typography;

function Inventario() {
  // --- ESTADOS ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const [form] = Form.useForm();

  // --- CARGA DE DATOS ---
  const fetchInventario = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ya no necesitamos pasar userId, el servicio usa el token
      const data = await getInventario();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el inventario. Intenta recargar.");
      notification.error({
        message: "Error de conexión",
        description: "No pudimos conectar con el servidor de inventario."
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventario();
  }, [fetchInventario]);

  // --- EFECTO PARA EL FORMULARIO ---
  useEffect(() => {
    if (isDrawerOpen) {
      if (editingItem) {
        form.setFieldsValue({
          nombre: editingItem.nombre,
          monto: editingItem.monto,
          descripcion: editingItem.descripcion,
        });
      } else {
        form.resetFields();
      }
    }
  }, [isDrawerOpen, editingItem, form]);

  // --- MANEJADORES ---

  const handleCardClick = (e, item) => {
    // Evita seleccionar si se hace click en acciones
    if (e.target.closest(".ant-btn") || e.target.closest(".anticon-edit")) return;

    const newSelection = selectedItems.includes(item.id)
      ? selectedItems.filter((id) => id !== item.id)
      : [...selectedItems, item.id];
    setSelectedItems(newSelection);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        // ACTUALIZAR
        await updateInventario(editingItem.id, {
          nombre: values.nombre,
          monto: values.monto,
          descripcion: values.descripcion || "",
        });
        notification.success({ message: "Producto actualizado correctamente" });
      } else {
        // CREAR
        // No enviamos user_id, el backend lo toma del token
        await createInventario({
          nombre: values.nombre,
          monto: values.monto,
          descripcion: values.descripcion || "",
        });
        notification.success({ message: "Producto creado exitosamente" });
      }

      handleCloseDrawer();
      fetchInventario(); // Recargar lista
    } catch (err) {
      console.error(err);
      notification.error({
        message: "Operación fallida",
        description: err.response?.data?.message || "Ocurrió un error al guardar."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = () => {
    Modal.confirm({
      title: `¿Eliminar ${selectedItems.length} producto(s)?`,
      content: "Esta acción no se puede deshacer.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          // El servicio maneja arrays de IDs automáticamente
          await deleteInventario(selectedItems);
          notification.success({ message: "Productos eliminados" });
          setSelectedItems([]);
          fetchInventario();
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: "No se pudieron eliminar algunos productos."
          });
        }
      },
    });
  };

  // --- RENDER ---
  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        
        {/* ENCABEZADO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <Title level={3} style={{ margin: 0, color: '#155153' }}>
               Inventario de Servicios
            </Title>
            <Text type="secondary">Gestiona tus productos y precios</Text>
          </div>
          
          <div className="flex gap-2">
            <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchInventario} 
                loading={loading}
                shape="circle" 
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{ backgroundColor: '#155153', borderColor: '#155153' }}
              size="large"
            >
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* BARRA DE SELECCIÓN FLOTANTE */}
        <div
          className={`sticky top-4 z-50 bg-[#155153] text-white mb-5 flex justify-between items-center px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
            selectedItems.length > 0 ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0 pointer-events-none"
          }`}
        >
          <span className="font-semibold text-lg">
            {selectedItems.length} seleccionados
          </span>
          <div className="flex gap-2">
            <Button ghost size="small" onClick={() => setSelectedItems([])}>
              Cancelar
            </Button>
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={handleDeleteSelected}
            >
              Eliminar
            </Button>
          </div>
        </div>

        {/* CONTENIDO (GRID DE TARJETAS) */}
        <Spin spinning={loading} tip="Cargando inventario..." size="large">
          {error ? (
            <Alert message={error} type="error" showIcon />
          ) : items.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No tienes productos registrados aún."
            >
              <Button type="primary" onClick={handleOpenCreate} style={{ background: '#155153' }}>
                Crear el primero
              </Button>
            </Empty>
          ) : (
            <Row gutter={[24, 24]}>
              {items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.id}>
                    <Card
                      hoverable
                      onClick={(e) => handleCardClick(e, item)}
                      className={`h-full transition-all duration-300 border-2 ${
                        isSelected
                          ? "border-[#155153] bg-green-50 shadow-md"
                          : "border-transparent hover:border-gray-200 hover:shadow-lg"
                      }`}
                      bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                      {/* Check Icon cuando está seleccionado */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 text-[#155153]">
                           <CheckCircleFilled style={{ fontSize: '24px' }} />
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-[#155153]">
                           <ShoppingOutlined style={{ fontSize: '20px' }} />
                        </div>
                        <Text strong style={{ fontSize: '16px', color: '#333' }} ellipsis={{ tooltip: item.nombre }}>
                          {item.nombre}
                        </Text>
                      </div>

                      <div className="flex-grow">
                        <Text type="secondary" className="block mb-4 line-clamp-2 text-sm">
                          {item.descripcion || "Sin descripción adicional."}
                        </Text>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                         <div>
                            <Text type="secondary" className="text-xs block">Precio</Text>
                            <Statistic
                                value={item.monto}
                                prefix="$"
                                valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#155153' }}
                                groupSeparator="."
                            />
                         </div>
                         <Tooltip title="Editar">
                           <Button 
                             type="text" 
                             shape="circle" 
                             icon={<EditOutlined />} 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleOpenEdit(item);
                             }}
                           />
                         </Tooltip>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Spin>

        {/* DRAWER (Formulario lateral) */}
        <Drawer
          title={
            <div className="flex items-center text-[#155153]">
              <AppstoreAddOutlined className="mr-2" />
              <span>{editingItem ? "Editar Producto" : "Nuevo Producto"}</span>
            </div>
          }
          width={420}
          onClose={handleCloseDrawer}
          open={isDrawerOpen}
          destroyOnClose
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={handleCloseDrawer}>Cancelar</Button>
              <Button
                onClick={() => form.submit()}
                type="primary"
                loading={isSubmitting}
                style={{ backgroundColor: '#155153', borderColor: '#155153' }}
              >
                {editingItem ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </div>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item
              name="nombre"
              label="Nombre del Producto / Servicio"
              rules={[{ required: true, message: "Escribe un nombre." }]}
            >
              <Input placeholder="Ej: Asesoría Contable" size="large" />
            </Form.Item>

            <Form.Item
              name="monto"
              label="Precio Base"
              rules={[{ required: true, message: "Define un precio." }]}
            >
              <InputNumber
                className="w-full"
                size="large"
                prefix="$"
                placeholder="0"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(value) => value.replace(/\$\s?|(\.*)/g, "")}
              />
            </Form.Item>

            <Form.Item name="descripcion" label="Descripción (Opcional)">
              <Input.TextArea 
                rows={4} 
                placeholder="Detalles para referencia interna..." 
                showCount 
                maxLength={200}
              />
            </Form.Item>
          </Form>
        </Drawer>
      </Content>
    </Layout>
  );
}

export default Inventario;