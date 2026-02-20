import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Typography, Space, Tooltip, ConfigProvider, theme } from 'antd';
import { PlusOutlined, DeleteOutlined, KeyOutlined, UserOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY_COLOR = '#155153';

const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { headers: { Authorization: `Bearer ${token}` } };
};

const UsersDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <Title level={3} style={{ color: PRIMARY_COLOR, margin: 0 }}>Usuarios del Negocio</Title>
                            <Text type="secondary">Administra los accesos y credenciales de los miembros de tu equipo.</Text>
                        </div>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsCreateModalOpen(true)}
                            size="large"
                            className="bg-[#155153] shadow-md shadow-[#155153]/20 border-none"
                        >
                            Nuevo Usuario
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <Table
                        dataSource={users}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        scroll={{ x: 600 }}
                    />
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
