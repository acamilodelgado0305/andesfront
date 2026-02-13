import React, { useState, useEffect, useCallback, useContext } from "react";
import {
    Layout,
    Typography,
    Table,
    Spin,
    Alert,
    Empty,
    Button,
    Drawer,
    Form,
    Input,
    Select,
    notification,
    Tag,
    Avatar,
    Modal,
    Tooltip,
    Space,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    UserAddOutlined,
    UserOutlined,
    ReloadOutlined,
    SearchOutlined,
    MailOutlined,
    TeamOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";

import { AuthContext } from "../../AuthContext";
import {
    getOrganizationUsers,
    createOrganizationUser,
    removeOrganizationUser,
} from "../../services/organizations/organizationUsersService";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY_COLOR = "#155153";

function OrganizationUsers() {
    const { user } = useContext(AuthContext);
    const organizationId = user?.organization?.id;
    const organizationName = user?.organization?.name || "Organización";

    // --- ESTADOS ---
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 50,
        total: 0,
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form] = Form.useForm();

    // --- CARGA DE DATOS ---
    const fetchUsers = useCallback(
        async (page = 1, limit = 50, search = "") => {
            if (!organizationId) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getOrganizationUsers(organizationId, {
                    page,
                    limit,
                    search: search || undefined,
                });
                setUsers(data.users || []);
                setPagination({
                    current: data.pagination?.page || 1,
                    pageSize: data.pagination?.limit || 50,
                    total: data.pagination?.total || 0,
                });
            } catch (err) {
                console.error(err);
                setError("No se pudieron cargar los usuarios de la organización.");
                notification.error({
                    message: "Error de conexión",
                    description: "No pudimos conectar con el servidor.",
                });
            } finally {
                setLoading(false);
            }
        },
        [organizationId]
    );

    // Carga inicial
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounce búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(1, pagination.pageSize, searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- MANEJADORES ---
    const handleTableChange = (pag) => {
        fetchUsers(pag.current, pag.pageSize, searchTerm);
    };

    const handleOpenCreate = () => {
        form.resetFields();
        form.setFieldsValue({ role: "user" });
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        form.resetFields();
    };

    const handleFormSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            await createOrganizationUser(organizationId, values);
            notification.success({
                message: "Usuario agregado",
                description: `Se ha agregado a ${values.name} a la organización.`,
            });
            handleCloseDrawer();
            fetchUsers(1, pagination.pageSize, searchTerm);
        } catch (err) {
            console.error(err);
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Ocurrió un error al agregar el usuario.";
            notification.error({
                message: "Operación fallida",
                description: errorMsg,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveUser = (record) => {
        if (record.id === user?.id) {
            notification.warning({
                message: "Acción no permitida",
                description: "No puedes removerte a ti mismo de la organización.",
            });
            return;
        }

        Modal.confirm({
            title: "¿Remover usuario?",
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>
                        Estás a punto de remover a <strong>{record.name}</strong> ({record.email}) de la organización.
                    </p>
                    <p style={{ color: "#666", fontSize: 13 }}>
                        El usuario no será eliminado del sistema, solo se quitará de esta organización.
                    </p>
                </div>
            ),
            okText: "Remover",
            okType: "danger",
            cancelText: "Cancelar",
            onOk: async () => {
                try {
                    await removeOrganizationUser(organizationId, record.id);
                    notification.success({
                        message: "Usuario removido",
                        description: `${record.name} ha sido removido de la organización.`,
                    });
                    fetchUsers(pagination.current, pagination.pageSize, searchTerm);
                } catch (err) {
                    const errorMsg =
                        err.response?.data?.message ||
                        err.response?.data?.error ||
                        "No se pudo remover al usuario.";
                    notification.error({
                        message: "Error",
                        description: errorMsg,
                    });
                }
            },
        });
    };

    // --- ROLE TAG ---
    const getRoleTag = (role) => {
        const roleMap = {
            superadmin: { color: "red", label: "Super Admin" },
            admin: { color: "volcano", label: "Administrador" },
            user: { color: "blue", label: "Usuario" },
            docente: { color: "green", label: "Docente" },
        };
        const config = roleMap[role] || { color: "default", label: role };
        return <Tag color={config.color}>{config.label}</Tag>;
    };

    // --- COLUMNAS DE LA TABLA ---
    const columns = [
        {
            title: "Usuario",
            key: "user",
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size={40}
                        style={{
                            backgroundColor: PRIMARY_COLOR,
                            fontSize: 16,
                            fontWeight: 600,
                        }}
                    >
                        {record.name ? record.name.charAt(0).toUpperCase() : "U"}
                    </Avatar>
                    <div className="flex flex-col">
                        <Text strong style={{ fontSize: 14 }}>
                            {record.name || "Sin nombre"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <MailOutlined style={{ marginRight: 4 }} />
                            {record.email}
                        </Text>
                    </div>
                </div>
            ),
            responsive: ["xs", "sm", "md", "lg", "xl"],
        },
        {
            title: "Rol",
            dataIndex: "role",
            key: "role",
            width: 150,
            render: (role) => getRoleTag(role),
            responsive: ["sm", "md", "lg", "xl"],
        },
        {
            title: "Predeterminado",
            dataIndex: "is_default",
            key: "is_default",
            width: 130,
            align: "center",
            render: (val) =>
                val ? (
                    <Tag color="green">Sí</Tag>
                ) : (
                    <Tag color="default">No</Tag>
                ),
            responsive: ["md", "lg", "xl"],
        },
        {
            title: "Acciones",
            key: "actions",
            width: 100,
            align: "center",
            render: (_, record) => (
                <Space>
                    <Tooltip title="Remover de la organización">
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveUser(record)}
                            disabled={record.id === user?.id}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // --- SIN ORGANIZACIÓN ---
    if (!organizationId) {
        return (
            <Layout className="min-h-screen bg-gray-50">
                <Content className="p-6">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No tienes una organización activa. Selecciona o crea una organización primero."
                    />
                </Content>
            </Layout>
        );
    }

    // --- RENDER PRINCIPAL ---
    return (
        <Layout className="min-h-screen bg-gray-50">
            <Content className="p-6">
                {/* ENCABEZADO */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center rounded-lg"
                                style={{
                                    width: 44,
                                    height: 44,
                                    backgroundColor: `${PRIMARY_COLOR}15`,
                                }}
                            >
                                <TeamOutlined
                                    style={{ fontSize: 22, color: PRIMARY_COLOR }}
                                />
                            </div>
                            <div className="flex flex-col">
                                <Title level={3} style={{ margin: 0, color: PRIMARY_COLOR }}>
                                    Usuarios
                                </Title>
                                <Text type="secondary">
                                    Gestión de usuarios de{" "}
                                    <strong>{organizationName}</strong>
                                </Text>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <Input
                                placeholder="Buscar por nombre o email..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 rounded-lg"
                                allowClear
                            />

                            <Tooltip title="Recargar">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={() =>
                                        fetchUsers(
                                            pagination.current,
                                            pagination.pageSize,
                                            searchTerm
                                        )
                                    }
                                    loading={loading}
                                    shape="circle"
                                />
                            </Tooltip>

                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleOpenCreate}
                                style={{
                                    backgroundColor: PRIMARY_COLOR,
                                    borderColor: PRIMARY_COLOR,
                                }}
                            >
                                Agregar
                            </Button>
                        </div>
                    </div>

                    {/* Stats rápido */}
                    <div className="mt-4 flex gap-4 flex-wrap">
                        <div
                            className="px-4 py-2 rounded-lg"
                            style={{ backgroundColor: `${PRIMARY_COLOR}08` }}
                        >
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Total usuarios
                            </Text>
                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: PRIMARY_COLOR,
                                }}
                            >
                                {pagination.total}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLA */}
                {error ? (
                    <Alert message={error} type="error" showIcon className="mb-4" />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <Table
                            columns={columns}
                            dataSource={users}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                                total: pagination.total,
                                showSizeChanger: true,
                                pageSizeOptions: ["10", "25", "50", "100"],
                                showTotal: (total, range) =>
                                    `${range[0]}-${range[1]} de ${total} usuarios`,
                            }}
                            onChange={handleTableChange}
                            locale={{
                                emptyText: (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="No hay usuarios en esta organización"
                                    >
                                        <Button
                                            type="primary"
                                            onClick={handleOpenCreate}
                                            style={{
                                                background: PRIMARY_COLOR,
                                            }}
                                        >
                                            Agregar el primero
                                        </Button>
                                    </Empty>
                                ),
                            }}
                            scroll={{ x: 600 }}
                        />
                    </div>
                )}

                {/* DRAWER - AGREGAR USUARIO */}
                <Drawer
                    title={
                        <div className="flex items-center gap-2" style={{ color: PRIMARY_COLOR }}>
                            <UserAddOutlined />
                            <span>Agregar Usuario a la Organización</span>
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
                                style={{
                                    backgroundColor: PRIMARY_COLOR,
                                    borderColor: PRIMARY_COLOR,
                                }}
                            >
                                Agregar Usuario
                            </Button>
                        </div>
                    }
                >
                    <div
                        className="mb-4 p-3 rounded-lg"
                        style={{
                            backgroundColor: "#e6f7ff",
                            border: "1px solid #91d5ff",
                        }}
                    >
                        <Text style={{ fontSize: 13 }}>
                            💡 Si el email ya existe en el sistema, el usuario será asociado
                            automáticamente a esta organización. Si no existe, se creará uno
                            nuevo.
                        </Text>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFormSubmit}
                        initialValues={{ role: "user" }}
                    >
                        <Form.Item
                            name="name"
                            label="Nombre Completo"
                            rules={[
                                {
                                    required: true,
                                    message: "El nombre es obligatorio",
                                },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined className="text-gray-400" />}
                                placeholder="Ej: Juan Pérez"
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Correo Electrónico"
                            rules={[
                                {
                                    required: true,
                                    message: "El email es obligatorio",
                                },
                                {
                                    type: "email",
                                    message: "Ingresa un email válido",
                                },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined className="text-gray-400" />}
                                placeholder="Ej: juan@ejemplo.com"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Contraseña"
                            rules={[
                                {
                                    required: true,
                                    message: "La contraseña es obligatoria",
                                },
                                {
                                    min: 6,
                                    message: "Mínimo 6 caracteres",
                                },
                            ]}
                            extra={
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Si el usuario ya existe, la contraseña será ignorada.
                                </Text>
                            }
                        >
                            <Input.Password placeholder="Mínimo 6 caracteres" />
                        </Form.Item>

                        <Form.Item name="role" label="Rol en la Organización">
                            <Select>
                                <Option value="user">Usuario</Option>
                                <Option value="admin">Administrador</Option>
                                <Option value="docente">Docente</Option>
                            </Select>
                        </Form.Item>
                    </Form>
                </Drawer>
            </Content>
        </Layout>
    );
}

export default OrganizationUsers;
