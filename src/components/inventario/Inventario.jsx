// src/pages/Inventario.jsx (o donde lo tengas)
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreAddOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

// 🔹 Servicios del front (ajusta la ruta según tu estructura)
import {
  getInventarioByUser,
  createInventario,
  updateInventario,
  deleteInventario,
} from "../../services/inventario/inventarioService";

// Componentes de Ant Design que usaremos
const { Content } = Layout;
const { Title, Text } = Typography;

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
      const userId = localStorage.getItem("userId");

      if (!userId) {
        throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
      }

      const data = await getInventarioByUser(userId);
      setItems(data);
      setError(null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Ocurrió un error al cargar los datos.";
      setError(msg);
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
      // Solo seteamos los campos que usamos en el form
      form.setFieldsValue({
        nombre: editingItem.nombre,
        monto: editingItem.monto,
        descripcion: editingItem.descripcion,
      });
    } else {
      form.resetFields();
    }
  }, [editingItem, form]);

  // --- MANEJADORES DE EVENTOS ---

  const handleCardClick = (e, item) => {
    // Evitar que el click en el botón de editar dispare selección
    if (e.target.closest(".ant-btn-icon-only")) return;

    const newSelection = selectedItems.includes(item.id)
      ? selectedItems.filter((id) => id !== item.id)
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

    try {
      if (isEditing) {
        const resp = await updateInventario(editingItem.id, {
          nombre: values.nombre,
          monto: values.monto,
          descripcion: values.descripcion || null,
        });

        notification.success({
          message: "¡Éxito!",
          description: resp.message || "Ítem actualizado correctamente.",
        });
      } else {
        const userId = localStorage.getItem("userId");
        const payload = {
          nombre: values.nombre,
          monto: values.monto,
          descripcion: values.descripcion || null,
          user_id: parseInt(userId, 10),
        };

        const resp = await createInventario(payload);

        notification.success({
          message: "¡Éxito!",
          description: resp.message || "Ítem creado correctamente.",
        });
      }

      closeDrawer();
      await fetchInventario();
    } catch (err) {
      notification.error({
        message: `Error al ${isEditing ? "actualizar" : "crear"}`,
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Ocurrió un error en la operación.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = () => {
    Modal.confirm({
      title: `¿Eliminar ${selectedItems.length} ítem(s)?`,
      content: "Esta acción no se puede deshacer.",
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          const resp = await deleteInventario(selectedItems);

          notification.success({
            message: "Ítems eliminados con éxito",
            description: resp.message || "",
          });

          await fetchInventario();
          setSelectedItems([]);
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description:
              err?.response?.data?.message ||
              err?.message ||
              "Ocurrió un error al eliminar.",
          });
        }
      },
    });
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Layout>
      <Content className="bg-gray-50 min-h-screen p-6">
        <Card className="shadow-md rounded-lg overflow-hidden" bordered={false}>
          {/* Barra de acciones flotante */}
          <div
            className={`sticky top-0 z-50 bg-white mb-5 flex justify-between items-center px-4 py-2 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
              selectedItems.length > 0
                ? "translate-y-0 opacity-100"
                : "-translate-y-full opacity-0"
            }`}
          >
            <Text strong className="text-[#155153]">
              {selectedItems.length} seleccionado(s)
            </Text>
            <div>
              <Button
                onClick={() => setSelectedItems([])}
                className="mr-2 border-green-900 text-[#155153]"
              >
                Deseleccionar todo
              </Button>
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={handleDeleteSelected}
                disabled={selectedItems.length === 0}
              >
                Eliminar
              </Button>
            </div>
          </div>

          {/* Cabecera */}
          <div className="flex justify-between items-center mb-6">
            <Title level={2} className="m-0">
              Mi Inventario 📋
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateDrawer}
            >
              Añadir Ítem
            </Button>
          </div>

          {/* Contenido principal */}
          <Spin spinning={loading} tip="Cargando..." size="large">
            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                className="mb-6"
              />
            )}

            {!error && !loading && items.length === 0 && (
              <Empty description="Tu inventario está vacío." />
            )}

            <Row gutter={[16, 16]}>
              {items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                    <Card
                      onClick={(e) => handleCardClick(e, item)}
                      className={`relative cursor-pointer transition-all duration-200 ease-in-out border-2 hover:-translate-y-1 hover:shadow-xl ${
                        isSelected
                          ? "border-green-900 bg-green-50"
                          : "border-transparent"
                      }`}
                      title={
                        <Text ellipsis={{ tooltip: item.nombre }}>
                          {item.nombre}
                        </Text>
                      }
                      extra={
                        <Tooltip title="Editar">
                          <Button
                            type="text"
                            shape="circle"
                            icon={<EditOutlined />}
                            className="ant-btn-icon-only"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDrawer(item);
                            }}
                          />
                        </Tooltip>
                      }
                    >
                      {isSelected && (
                        <CheckCircleFilled className="absolute top-4 left-4 text-2xl text-[#155153]" />
                      )}
                      <p className="min-h-[40px] text-gray-600">
                        {item.descripcion || "Sin descripción."}
                      </p>
                      <Statistic
                        value={item.monto}
                        prefix="$"
                        formatter={(value) =>
                          new Intl.NumberFormat("es-CO").format(value)
                        }
                      />
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
              <span>
                {editingItem
                  ? "Editar Ítem del Inventario"
                  : "Crear Nuevo Ítem"}
              </span>
            </div>
          }
          width={480}
          onClose={closeDrawer}
          open={isDrawerOpen}
          destroyOnClose
          footer={
            <div className="text-right">
              <Button onClick={closeDrawer} className="mr-2">
                Cancelar
              </Button>
              <Button
                onClick={() => form.submit()}
                type="primary"
                loading={isSubmitting}
              >
                {editingItem ? "Guardar Cambios" : "Crear Ítem"}
              </Button>
            </div>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item
              name="nombre"
              label="Nombre del Ítem"
              rules={[{ required: true, message: "El nombre es obligatorio." }]}
            >
              <Input placeholder="Ej: Computador portátil" />
            </Form.Item>

            <Form.Item
              name="monto"
              label="Monto"
              rules={[{ required: true, message: "El monto es obligatorio." }]}
            >
              <InputNumber
                className="w-full"
                prefix="$"
                placeholder="Ej: 700000"
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              />
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
