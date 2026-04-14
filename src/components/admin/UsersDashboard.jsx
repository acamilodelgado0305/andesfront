import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Typography, Space, Tooltip, ConfigProvider, theme, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, KeyOutlined, UserOutlined, MailOutlined, SafetyCertificateOutlined, EditOutlined, SaveOutlined, CloseOutlined, WarningOutlined, ShopOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY_COLOR = '#155153';

const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { headers: { Authorization: `Bearer ${token}` } };
};

const UsersDashboard = () => {
    const { user, login } = useContext(AuthContext);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Business config
    const [nameForm] = Form.useForm();
    const [editingName, setEditingName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingBusiness, setDeletingBusiness] = useState(false);
    const DELETE_KEYWORD = 'ELIMINAR';

    const handleRenameSubmit = async (values) => {
        setSavingName(true);
        try {
            await axios.put(`${API_AUTH_URL}/api/businesses/my`, { name: values.name }, getAuthHeaders());
            message.success('Nombre actualizado correctamente.');
            setEditingName(false);
            const { switchBusiness } = await import('../../services/auth/authService');
            const response = await switchBusiness(user.bid);
            if (response.token) {
                login(response.token, response.user);
                window.location.replace('/inicio/usuarios-negocio');
            }
        } catch (err) {
            message.error(err.response?.data?.error || 'Error al actualizar el nombre.');
            setSavingName(false);
        }
    };

    const handleDeleteBusiness = async () => {
        if (deleteConfirmText !== DELETE_KEYWORD) return;
        setDeletingBusiness(true);
        try {
            await axios.delete(`${API_AUTH_URL}/api/businesses/my`, getAuthHeaders());
            message.success('Negocio eliminado.');
            const { logout } = await import('../../services/auth/authService');
            logout();
            window.location.replace('/login');
        } catch (err) {
            message.error(err.response?.data?.error || 'Error al eliminar el negocio.');
            setDeletingBusiness(false);
        }
    };

    // Create User Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm] = Form.useForm();

    // Change Password Modal
    const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
    const [isChangingPwd, setIsChangingPwd] = useState(false);
    const [pwdForm] = Form.useForm();
    const [selectedUserId, setSelectedUserId] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_AUTH_URL}/api/businesses/my/users`, getAuthHeaders());
            setUsers(data);
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            message.error("No se pudieron cargar los usuarios.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateSubmit = async (values) => {
        setIsCreating(true);
        try {
            await axios.post(`${API_AUTH_URL}/api/businesses/my/users`, values, getAuthHeaders());
            message.success("Usuario agregado correctamente.");
            setIsCreateModalOpen(false);
            createForm.resetFields();
            fetchUsers();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || "Error al agregar usuario.";
            message.error(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleRemoveUser = async (userId) => {
        try {
            await axios.delete(`${API_AUTH_URL}/api/businesses/my/users/${userId}`, getAuthHeaders());
            message.success("Usuario eliminado del negocio.");
            fetchUsers();
        } catch (error) {
            const msg = error.response?.data?.error || "Error al eliminar usuario.";
            message.error(msg);
        }
    };

    const handleOpenPwdModal = (userId) => {
        setSelectedUserId(userId);
        pwdForm.resetFields();
        setIsPwdModalOpen(true);
    };

    const handlePwdSubmit = async (values) => {
        setIsChangingPwd(true);
        try {
            await axios.put(`${API_AUTH_URL}/api/businesses/my/users/${selectedUserId}/password`, { newPassword: values.newPassword }, getAuthHeaders());
            message.success("Contraseña actualizada exitosamente.");
            setIsPwdModalOpen(false);
        } catch (error) {
            const msg = error.response?.data?.error || "Error al cambiar la contraseña.";
            message.error(msg);
        } finally {
            setIsChangingPwd(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axios.put(`${API_AUTH_URL}/api/businesses/my/users/${userId}/role`, { role: newRole }, getAuthHeaders());
            message.success("Rol actualizado exitosamente.");
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || "Error al cambiar el rol del usuario.";
            message.error(msg);
            fetchUsers(); // Rollback en caso de error
        }
    };

    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Correo (Email)',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Rol en Negocio',
            dataIndex: 'role',
            key: 'role',
            render: (role, record) => (
                <Select
                    defaultValue={role}
                    style={{ width: 150 }}
                    onChange={(val) => handleRoleChange(record.id, val)}
                    size="small"
                    className="font-medium"
                >
                    <Option value="user">Colaborador</Option>
                    <Option value="admin">Administrador</Option>
                </Select>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Cambiar Contraseña">
                        <Button
                            type="dashed"
                            icon={<KeyOutlined />}
                            onClick={() => handleOpenPwdModal(record.id)}
                            size="small"
                        />
                    </Tooltip>
                    <Popconfirm
                        title="¿Eliminar usuario del negocio?"
                        description="Este usuario perderá el acceso a la plataforma con esta empresa."
                        onConfirm={() => handleRemoveUser(record.id)}
                        okText="Sí, Eliminar"
                        cancelText="Cancelar"
                    >
                        <Tooltip title="Eliminar del Negocio">
                            <Button danger type="text" icon={<DeleteOutlined />} size="small" />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: PRIMARY_COLOR } }}>
            <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-[calc(100vh-64px)] overflow-auto relative">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <Title level={3} style={{ color: PRIMARY_COLOR, margin: 0 }}>Administra tu Negocio</Title>
                    <Text type="secondary">Gestiona los accesos, credenciales y configuración de tu negocio.</Text>
                </div>

                {/* ── Nombre del negocio ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <ShopOutlined style={{ color: PRIMARY_COLOR }} />
                        <span className="font-semibold text-gray-700">Nombre del Negocio</span>
                    </div>
                    <Text type="secondary" className="block text-sm mb-4">
                        Nombre que aparece en la plataforma para este negocio.
                    </Text>
                    <Form
                        form={nameForm}
                        layout="inline"
                        initialValues={{ name: user?.business_name || '' }}
                        onFinish={handleRenameSubmit}
                    >
                        <Form.Item
                            name="name"
                            rules={[{ required: true, message: 'Ingresa un nombre' }]}
                            style={{ flex: 1, minWidth: 220 }}
                        >
                            <Input
                                disabled={!editingName}
                                style={{ backgroundColor: editingName ? '#fff' : '#f9fafb', color: '#111827', cursor: editingName ? 'text' : 'default' }}
                            />
                        </Form.Item>
                        <Form.Item>
                            {!editingName ? (
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => setEditingName(true)}
                                >
                                    Editar
                                </Button>
                            ) : (
                                <Space>
                                    <Button
                                        icon={<CloseOutlined />}
                                        onClick={() => {
                                            setEditingName(false);
                                            nameForm.setFieldsValue({ name: user?.business_name || '' });
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<SaveOutlined />}
                                        loading={savingName}
                                        style={{ backgroundColor: PRIMARY_COLOR }}
                                    >
                                        Guardar
                                    </Button>
                                </Space>
                            )}
                        </Form.Item>
                    </Form>
                </div>

                {/* ── Tabla de usuarios ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <Table
                        dataSource={users}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        scroll={{ x: 600 }}
                        title={() => (
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700 flex items-center gap-2">
                                    <UserOutlined style={{ color: PRIMARY_COLOR }} /> Usuarios
                                </span>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => setIsCreateModalOpen(true)}
                                    style={{ backgroundColor: PRIMARY_COLOR }}
                                >
                                    Nuevo Usuario
                                </Button>
                            </div>
                        )}
                    />
                </div>

                {/* ── Zona de Peligro: eliminar negocio ── */}
                <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <WarningOutlined className="text-red-500" />
                        <span className="font-semibold text-red-600">Zona de Peligro</span>
                    </div>
                    <Text type="secondary" className="block text-sm mb-4">
                        Eliminar el negocio es <strong>irreversible</strong>. Se borrarán todas las suscripciones y vínculos de usuarios.
                        Escribe <strong className="text-red-600">{DELETE_KEYWORD}</strong> para confirmar.
                    </Text>
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                            placeholder={DELETE_KEYWORD}
                            style={{ width: 180 }}
                            status={deleteConfirmText && deleteConfirmText !== DELETE_KEYWORD ? 'error' : ''}
                        />
                        <Button
                            danger
                            type="primary"
                            icon={<DeleteOutlined />}
                            disabled={deleteConfirmText !== DELETE_KEYWORD}
                            loading={deletingBusiness}
                            onClick={handleDeleteBusiness}
                        >
                            Eliminar Negocio Permanentemente
                        </Button>
                    </div>
                </div>

                {/* MODAL CREAR USUARIO */}
                <Modal
                    title={<span className="text-gray-800 text-lg flex items-center gap-2"><UserOutlined /> Agregar Miembro Completo</span>}
                    open={isCreateModalOpen}
                    onCancel={() => setIsCreateModalOpen(false)}
                    footer={null}
                    destroyOnClose
                >
                    <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit} className="mt-4">
                        <Form.Item name="name" label="Nombre Completo" rules={[{ required: true }]}>
                            <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Ej. Juan Pérez" size="large" />
                        </Form.Item>
                        <Form.Item name="email" label="Correo Electrónico" rules={[{ required: true, type: 'email' }]}>
                            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="juan@empresa.com" size="large" />
                        </Form.Item>
                        <Form.Item name="password" label="Contraseña Provisional" rules={[{ required: true, min: 6 }]}>
                            <Input.Password prefix={<KeyOutlined className="text-gray-400" />} placeholder="Mínimo 6 caracteres" size="large" />
                        </Form.Item>
                        <Form.Item name="role" label="Rol Asignado" rules={[{ required: true }]}>
                            <Select placeholder="Selecciona el nivel de acceso" size="large">
                                <Option value="user">Colaborador / Usuario Regular</Option>
                                <Option value="admin">Administrador del Negocio</Option>
                            </Select>
                        </Form.Item>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button size="large" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                            <Button size="large" type="primary" htmlType="submit" loading={isCreating} className="bg-[#155153]">Guardar Usuario</Button>
                        </div>
                    </Form>
                </Modal>

                {/* MODAL CAMBIO CONTRASEÑA */}
                <Modal
                    title={<span className="text-gray-800 flex items-center gap-2"><SafetyCertificateOutlined /> Restaurar Contraseña</span>}
                    open={isPwdModalOpen}
                    onCancel={() => setIsPwdModalOpen(false)}
                    footer={null}
                    destroyOnClose
                    width={400}
                >
                    <Form form={pwdForm} layout="vertical" onFinish={handlePwdSubmit} className="mt-4">
                        <Form.Item name="newPassword" label="Nueva Contraseña" rules={[{ required: true, min: 6, message: 'La contraseña debe tener mínimo 6 caracteres.' }]}>
                            <Input.Password prefix={<KeyOutlined className="text-gray-400" />} size="large" placeholder="Escribe la nueva contraseña" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button onClick={() => setIsPwdModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isChangingPwd} className="bg-[#155153]">Guardar / Aplicar</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </ConfigProvider>
    );
};

export default UsersDashboard;
