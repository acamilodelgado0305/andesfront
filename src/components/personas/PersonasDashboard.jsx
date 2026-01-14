import React, { useState, useEffect, useCallback } from "react";
import {
    Layout,
    Typography,
    Row,
    Col,
    Card,
    Spin,
    Alert,
    Empty,
    Button,
    Drawer,
    Form,
    Input,
    Select,
    notification,
    Tooltip,
    Modal,
    Tag,
    Avatar
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserAddOutlined,
    UserOutlined,
    ReloadOutlined,
    SearchOutlined,
    PhoneOutlined,
    IdcardOutlined,
    EnvironmentOutlined
} from "@ant-design/icons";

import {
    getPersonas,
    createPersona,
    updatePersona,
    deletePersona,
} from "../../services/person/personaService"; // Ajusta la ruta según tu estructura

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

function PersonasDashboard() {
    // --- ESTADOS ---
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [form] = Form.useForm();

    // --- CARGA DE DATOS ---
    const fetchPersonas = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            // Enviamos el parámetro 'q' si existe búsqueda
            const params = search ? { q: search } : {};
            const data = await getPersonas(params);
            setItems(data || []);
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los clientes.");
            notification.error({
                message: "Error de conexión",
                description: "No pudimos conectar con el servidor."
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Carga inicial
    useEffect(() => {
        fetchPersonas();
    }, [fetchPersonas]);

    // Manejo del Buscador (Debounce manual simple)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== "") fetchPersonas(searchTerm);
            else fetchPersonas();
        }, 500); // Espera 500ms después de escribir para buscar
        return () => clearTimeout(timer);
    }, [searchTerm, fetchPersonas]);

    // --- EFECTO PARA EL FORMULARIO ---
    useEffect(() => {
        if (isDrawerOpen) {
            if (editingItem) {
                // MODO EDICIÓN: Llenamos el formulario con los datos existentes
                form.setFieldsValue({
                    nombre: editingItem.nombre,
                    apellido: editingItem.apellido,
                    tipo_documento: editingItem.tipo_documento,
                    numero_documento: editingItem.numero_documento,
                    celular: editingItem.celular,
                    email: editingItem.email,
                    direccion: editingItem.direccion,
                    tipo: editingItem.tipo,
                });
            } else {
                // MODO CREACIÓN: Valores por defecto
                form.resetFields();
                form.setFieldsValue({
                    tipo_documento: 'CC',
                    tipo: 'CLIENTE'
                });
            }
        }
    }, [isDrawerOpen, editingItem, form]);

    // --- MANEJADORES ---

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
            // A diferencia de inventario, aquí enviamos JSON puro (no hay fotos)
            if (editingItem) {
                await updatePersona(editingItem.id, values);
                notification.success({ message: "Cliente actualizado correctamente" });
            } else {
                await createPersona(values);
                notification.success({ message: "Cliente registrado exitosamente" });
            }

            handleCloseDrawer();
            fetchPersonas(searchTerm); // Recargamos la lista
        } catch (err) {
            console.error(err);
            // Manejo de errores específicos del backend (ej: duplicados)
            const errorMsg = err.response?.data?.message || "Ocurrió un error al guardar.";
            notification.error({
                message: "Operación fallida",
                description: errorMsg
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (item) => {
        Modal.confirm({
            title: `¿Eliminar a ${item.nombre}?`,
            content: "Si este cliente tiene ventas asociadas, no se podrá eliminar.",
            okText: "Eliminar",
            okType: "danger",
            cancelText: "Cancelar",
            onOk: async () => {
                try {
                    await deletePersona(item.id);
                    notification.success({ message: "Cliente eliminado" });
                    fetchPersonas(searchTerm);
                } catch (err) {
                    notification.error({
                        message: "No se pudo eliminar",
                        description: err.response?.data?.message || "El cliente tiene historiales activos."
                    });
                }
            },
        });
    };

    // --- RENDER ---
    return (
        <Layout className="min-h-screen bg-gray-50">
            <Content className="p-6">

                {/* ENCABEZADO Y BUSCADOR */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>
                            Personas
                        </Title>
                        <Text type="secondary">Directorio de Clientes, Proveedores y Empleados</Text>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {/* Buscador */}
                        <Input
                            placeholder="Buscar por nombre o cédula..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 rounded-lg"
                            allowClear
                        />

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchPersonas(searchTerm)}
                            loading={loading}
                            shape="circle"
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleOpenCreate}
                            style={{ backgroundColor: '#155153', borderColor: '#155153' }}
                            size="middle"
                        >
                            Nuevo
                        </Button>
                    </div>
                </div>

                {/* GRID DE PERSONAS */}
                <Spin spinning={loading} tip="Cargando directorio..." size="large">
                    {error ? (
                        <Alert message={error} type="error" showIcon />
                    ) : items.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No se encontraron personas registradas."
                        >
                            <Button type="primary" onClick={handleOpenCreate} style={{ background: '#155153' }}>
                                Registrar el primero
                            </Button>
                        </Empty>
                    ) : (
                        <Row gutter={[16, 16]}>
                            {items.map((item) => (
                                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.id}>
                                    <Card
                                        hoverable
                                        className="h-full border-transparent hover:border-gray-200 hover:shadow-lg transition-all duration-300"
                                        actions={[
                                            <Tooltip title="Editar">
                                                <EditOutlined key="edit" className="text-[#155153]" onClick={() => handleOpenEdit(item)} />
                                            </Tooltip>,
                                            <Tooltip title="Eliminar">
                                                <DeleteOutlined key="delete" className="text-red-500" onClick={() => handleDelete(item)} />
                                            </Tooltip>
                                        ]}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Avatar con iniciales */}
                                            <Avatar
                                                size={48}
                                                style={{ backgroundColor: item.tipo === 'PROVEEDOR' ? '#f56a00' : '#155153', verticalAlign: 'middle' }}
                                            >
                                                {item.nombre.charAt(0).toUpperCase()}
                                            </Avatar>

                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between items-center mb-1">
                                                    <Text strong className="text-lg truncate block" title={`${item.nombre} ${item.apellido || ''}`}>
                                                        {item.nombre} {item.apellido}
                                                    </Text>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <Tag color={item.tipo === 'CLIENTE' ? 'blue' : 'orange'} className="w-fit text-[10px] mb-2">
                                                        {item.tipo}
                                                    </Tag>

                                                    <Text type="secondary" className="text-xs flex items-center gap-2">
                                                        <IdcardOutlined /> {item.tipo_documento}: {item.numero_documento}
                                                    </Text>
                                                    <Text type="secondary" className="text-xs flex items-center gap-2">
                                                        <PhoneOutlined /> {item.celular}
                                                    </Text>
                                                    {item.direccion && (
                                                        <Text type="secondary" className="text-xs flex items-center gap-2 truncate">
                                                            <EnvironmentOutlined /> {item.direccion}
                                                        </Text>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Spin>

                {/* DRAWER (FORMULARIO) */}
                <Drawer
                    title={
                        <div className="flex items-center text-[#155153]">
                            {editingItem ? <UserOutlined className="mr-2" /> : <UserAddOutlined className="mr-2" />}
                            <span>{editingItem ? "Editar Persona" : "Nueva Persona"}</span>
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
                                {editingItem ? "Guardar Cambios" : "Registrar"}
                            </Button>
                        </div>
                    }
                >
                    <Form form={form} layout="vertical" onFinish={handleFormSubmit}>

                        {/* TIPO DE PERSONA */}
                        <Form.Item name="tipo" label="Tipo de Relación" rules={[{ required: true }]}>
                            <Select placeholder="Selecciona el rol">
                                <Option value="CLIENTE">Cliente</Option>
                                <Option value="PROVEEDOR">Proveedor</Option>
                                <Option value="EMPLEADO">Empleado</Option>
                            </Select>
                        </Form.Item>

                        {/* DOCUMENTO */}
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item
                                    name="tipo_documento"
                                    label="Tipo Doc"
                                    rules={[{ required: true, message: 'Requerido' }]}
                                >
                                    <Select>
                                        <Option value="CC">C.C.</Option>
                                        <Option value="NIT">NIT</Option>
                                        <Option value="CE">C.E.</Option>
                                        <Option value="TI">T.I.</Option>
                                        <Option value="PASAPORTE">Pasaporte</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={16}>
                                <Form.Item
                                    name="numero_documento"
                                    label="Número Documento"
                                    rules={[
                                        { required: true, message: 'El número es obligatorio' },
                                        { min: 5, message: 'Mínimo 5 caracteres' }
                                    ]}
                                >
                                    <Input placeholder="Ej: 1090456..." />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* NOMBRES */}
                        <Form.Item
                            name="nombre"
                            label="Nombres / Razón Social"
                            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                        >
                            <Input placeholder="Ej: Juan David / Empresa SAS" />
                        </Form.Item>

                        <Form.Item name="apellido" label="Apellidos (Opcional)">
                            <Input placeholder="Ej: Pérez Rodríguez" />
                        </Form.Item>

                        {/* CONTACTO */}
                        <Form.Item
                            name="celular"
                            label="Celular / Teléfono"
                            rules={[{ required: true, message: 'El celular es vital para contactar' }]}
                        >
                            <Input prefix={<PhoneOutlined />} placeholder="Ej: 300 123 4567" />
                        </Form.Item>

                        <Form.Item name="email" label="Correo Electrónico" rules={[{ type: 'email', message: 'Email inválido' }]}>
                            <Input placeholder="cliente@correo.com" />
                        </Form.Item>

                        <Form.Item name="direccion" label="Dirección Física">
                            <Input.TextArea rows={2} placeholder="Calle 123 # 45 - 67, Barrio..." />
                        </Form.Item>

                    </Form>
                </Drawer>

            </Content>
        </Layout>
    );
}

export default PersonasDashboard;