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
  Upload,
  Divider,
  Tag
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreAddOutlined,
  CheckCircleFilled,
  ShoppingOutlined,
  ReloadOutlined,
  InboxOutlined,
  BarcodeOutlined,
  UploadOutlined,
  FileImageOutlined
} from "@ant-design/icons";

import {
  getInventario,
  createInventario,
  updateInventario,
  deleteInventario,
} from "../../services/inventario/inventarioService";

const { Content } = Layout;
const { Title, Text } = Typography;

// Helper para manejar la carga de archivos en Ant Design Forms
const normFile = (e) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

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
      const data = await getInventario();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el inventario.");
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
        // MODO EDICIÓN
        form.setFieldsValue({
          nombre: editingItem.nombre,
          monto: editingItem.monto,
          descripcion: editingItem.descripcion,
          costo_compra: editingItem.costo_compra,
          unidades_por_caja: editingItem.unidades_por_caja,
          codigo_barras: editingItem.codigo_barras,
          stock_inicial_empaques: editingItem.cantidad
          // Nota: No seteamos la imagen aquí, la imagen ya subida se muestra aparte
        });
      } else {
        // MODO CREACIÓN (Valores por defecto)
        form.resetFields();
        form.setFieldsValue({
          unidades_por_caja: 1,
          stock_inicial_empaques: 0
        });
      }
    }
  }, [isDrawerOpen, editingItem, form]);

  // --- MANEJADORES ---

  const handleCardClick = (e, item) => {
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

  // 🔹 AQUI ESTÁ LA MAGIA DEL FORMDATA
  // 🔹 AQUI ESTÁ LA MAGIA DEL FORMDATA (CORREGIDA)
  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // 2. Agregamos campos de texto
      formData.append('nombre', values.nombre);
      formData.append('monto', values.monto);
      formData.append('descripcion', values.descripcion || "");
      formData.append('costo_compra', values.costo_compra || 0);
      formData.append('unidades_por_caja', values.unidades_por_caja || 1);
      formData.append('codigo_barras', values.codigo_barras || "");

      // --- 🔥 CORRECCIÓN DE SEGURIDAD AQUÍ 🔥 ---
      // 1. Eliminamos el "if (!editingItem)" para que SIEMPRE se envíe.
      // 2. Usamos (|| 0) para que si el usuario borró el número (null), se envíe un 0.
      const stockSeguro = values.stock_inicial_empaques !== undefined && values.stock_inicial_empaques !== null
        ? values.stock_inicial_empaques
        : 0;

      formData.append('stock_inicial_empaques', stockSeguro);
      // ------------------------------------------

      // 4. Imagen
      if (values.imagen && values.imagen.length > 0) {
        formData.append('imagen', values.imagen[0].originFileObj);
      }

      // 5. Enviar al backend
      if (editingItem) {
        await updateInventario(editingItem.id, formData);
        notification.success({ message: "Producto actualizado correctamente" });
      } else {
        await createInventario(formData);
        notification.success({ message: "Producto creado exitosamente" });
      }

      handleCloseDrawer();
      fetchInventario();
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
              Inventario
            </Title>
            <Text type="secondary">Gestiona productos, precios y existencias</Text>
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
          className={`sticky top-4 z-50 bg-[#155153] text-white mb-5 flex justify-between items-center px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${selectedItems.length > 0 ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0 pointer-events-none"
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

        {/* GRID DE PRODUCTOS */}
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
                      // 1. Quitamos overflow-hidden para evitar cortes inesperados
                      className={`h-full transition-all duration-300 border-2 ${isSelected
                        ? "border-[#155153] bg-green-50 shadow-md"
                        : "border-transparent hover:border-gray-200 hover:shadow-lg"
                        }`}
                      // 2. Usamos 'actions' para poner la barra de botones fija al final
                      actions={[
                        <Tooltip title="Editar producto" key="edit">
                          <Button
                            type="text"
                            block // Ocupa todo el espacio del botón
                            icon={<EditOutlined style={{ fontSize: '18px', color: '#155153' }} />}
                            onClick={(e) => {
                              e.stopPropagation(); // Evita seleccionar la tarjeta al editar
                              handleOpenEdit(item);
                            }}
                          >
                            Editar
                          </Button>
                        </Tooltip>
                      ]}
                      onClick={(e) => handleCardClick(e, item)}
                      bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }} // flex: 1 asegura que el cuerpo ocupe el espacio
                      cover={
                        item.imagen_url ? (
                          <div className="h-48 w-full overflow-hidden relative group">
                            <img
                              alt={item.nombre}
                              src={item.imagen_url}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#155153] bg-opacity-20 flex items-center justify-center">
                                <CheckCircleFilled style={{ fontSize: '32px', color: '#fff' }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-300">
                            {isSelected ? <CheckCircleFilled style={{ fontSize: '32px', color: '#155153' }} /> : <FileImageOutlined style={{ fontSize: '48px' }} />}
                          </div>
                        )
                      }
                    >
                      {/* CONTENIDO DE LA TARJETA */}
                      <div className="flex flex-col h-full">
                        <div className="mb-2">
                          <div className="flex justify-between items-start">
                            <Text strong style={{ fontSize: '16px', color: '#333' }} className="line-clamp-1 mr-2">
                              {item.nombre}
                            </Text>
                            <Tag color="blue">{item.cantidad} Und.</Tag>
                          </div>
                          <Text type="secondary" className="text-xs block mb-1">
                            {item.codigo_barras || "Sin código"}
                          </Text>
                        </div>

                        <div className="flex-grow">
                          <Text type="secondary" className="block mb-2 line-clamp-2 text-sm">
                            {item.descripcion || "Sin descripción."}
                          </Text>
                        </div>

                        {/* PRECIO (El botón de editar ya no va aquí, ahora está en la barra actions abajo) */}
                        <div className="mt-auto pt-3 border-t border-gray-100">
                          <Text type="secondary" className="text-xs block">Precio Venta</Text>
                          <Statistic
                            value={item.monto}
                            prefix="$"
                            valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: '#155153' }}
                            groupSeparator="."
                          />
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Spin>

        {/* DRAWER (FORMULARIO) */}
        <Drawer
          title={
            <div className="flex items-center text-[#155153]">
              <AppstoreAddOutlined className="mr-2" />
              <span>{editingItem ? "Editar Producto" : "Nuevo Producto"}</span>
            </div>
          }
          width={480}
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

            {/* 1. SECCIÓN PRINCIPAL */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="imagen"
                  label="Foto del Producto"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                >
                  <Upload
                    listType="picture-card"
                    maxCount={1}
                    beforeUpload={() => false} // Evita carga automática, esperamos al submit
                    accept="image/*"
                  >
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Subir</div>
                    </div>
                  </Upload>
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="nombre"
                  label="Nombre del Producto"
                  rules={[{ required: true, message: "Escribe un nombre." }]}
                >
                  <Input placeholder="Ej: Coca Cola 350ml" size="large" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item name="codigo_barras" label="Código de Barras">
                  <Input prefix={<BarcodeOutlined />} placeholder="Escanea o escribe..." />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Precios</Divider>

            {/* 2. SECCIÓN PRECIOS */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="monto"
                  label="Precio Venta (Unitario)"
                  rules={[{ required: true, message: "Requerido" }]}
                >
                  <InputNumber
                    className="w-full"
                    prefix="$"
                    placeholder="0"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    parser={(value) => value.replace(/\$\s?|(\.*)/g, "")}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="costo_compra"
                  label="Costo Compra (Total)"
                  tooltip="Cuánto te costó comprar la caja o el paquete"
                >
                  <InputNumber
                    className="w-full"
                    prefix="$"
                    placeholder="0"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    parser={(value) => value.replace(/\$\s?|(\.*)/g, "")}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Inventario</Divider>

            {/* 3. SECCIÓN INVENTARIO (LÓGICA DE CAJAS) */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="unidades_por_caja"
                  label="Unidades por Empaque"
                  tooltip="Si compras por cajas, ¿cuántas unidades trae?"
                >
                  <InputNumber min={1} className="w-full" placeholder="Ej: 24" />
                </Form.Item>
              </Col>

              {/* Solo mostramos stock inicial al crear, para evitar errores de edición masiva */}

              <Col span={12}>
                <Form.Item
                  name="stock_inicial_empaques"
                  label="Stock Inicial (Empaques)"
                  tooltip="Cantidad de cajas/paquetes que tienes ahora"
                >
                  <InputNumber min={0} className="w-full" placeholder="Ej: 2" prefix={<InboxOutlined />} />
                </Form.Item>
              </Col>

            </Row>

            <Form.Item name="descripcion" label="Descripción">
              <Input.TextArea rows={3} placeholder="Detalles adicionales..." />
            </Form.Item>

          </Form>
        </Drawer>
      </Content>
    </Layout>
  );
}

export default Inventario;