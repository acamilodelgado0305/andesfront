import React, { useState, useEffect, useCallback } from 'react';
import {
    Spin, Typography, Input, Form, Select, Button, Tag, message, Modal,
    Empty, Card, Drawer, Table, Space, InputNumber, Checkbox, Switch, Popconfirm, Tooltip
} from 'antd';
import {
    UserOutlined, SearchOutlined, PlusOutlined, SaveOutlined,
    HistoryOutlined, CheckCircleFilled, ClockCircleOutlined,
    CalendarOutlined, SettingOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { NumericFormat } from 'react-number-format';

dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const API_URL = import.meta.env.VITE_API_BACKEND;

// --- CONSTANTES ---
const MODULE_COLORS = {
    'POS': 'green',
    'ACADEMICO': 'blue',
    'INVENTARIO': 'cyan',
    'GENERACION': 'magenta',
    'ADMIN': 'red'
};

const MODULE_OPTIONS = ['POS', 'ACADEMICO', 'INVENTARIO', 'GENERACION', 'ADMIN'];

// Helper Auth
const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { headers: { Authorization: `Bearer ${token}` } };
};

function DashboardClients() {
    // ==========================================
    // 1. ESTADOS: GESTIÓN DE CLIENTES (Existente)
    // ==========================================
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Modal Asignar Suscripción
    const [isSubModalVisible, setIsSubModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subForm] = Form.useForm();
    const [publicPlans, setPublicPlans] = useState([]); // Planes para el dropdown de asignar

    // ==========================================
    // 2. ESTADOS: GESTIÓN DE PLANES (Nuevo)
    // ==========================================
    const [isPlanDrawerVisible, setIsPlanDrawerVisible] = useState(false); // Drawer lista
    const [isPlanFormVisible, setIsPlanFormVisible] = useState(false);     // Modal formulario
    const [adminPlans, setAdminPlans] = useState([]);                      // Lista completa para admin
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);                  // Plan siendo editado
    const [planForm] = Form.useForm();

    // ==========================================
    // 3. CARGA INICIAL DE DATOS
    // ==========================================
    const fetchClients = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/subscriptions`, getAuthHeaders());
            setClients(data);
            setFilteredClients(data);
        } catch (err) {
            console.error(err);
            message.error("Error al cargar clientes.");
        }
    }, []);

    // Carga planes SOLO activos para el dropdown de asignar
    const fetchPublicPlans = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/plans`, getAuthHeaders());
            setPublicPlans(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    // Carga TODOS los planes (Admin) para el Drawer de gestión
    const fetchAdminPlans = useCallback(async () => {
        setLoadingPlans(true);
        try {
            const { data } = await axios.get(`${API_URL}/api/plans-admin`, getAuthHeaders()); // Usando tu nueva ruta
            setAdminPlans(data);
        } catch (err) {
            message.error("Error cargando gestión de planes");
        } finally {
            setLoadingPlans(false);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchClients(), fetchPublicPlans()]);
            setLoading(false);
        };
        loadData();
    }, [fetchClients, fetchPublicPlans]);

    // ==========================================
    // 4. LÓGICA DE CLIENTES
    // ==========================================
    const handleSelectClient = async (client) => {
        setSelectedClient(client);
        if (client.subscription_status === 'no_subscription') {
            setClientDetails(null);
            return;
        }
        setLoadingDetails(true);
        try {
            const { data } = await axios.get(`${API_URL}/api/client-details/${client.id}`, getAuthHeaders());
            setClientDetails(data);
        } catch (err) {
            message.error("Error al cargar historial.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setFilteredClients(clients.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query)
        ));
    };

    // Asignar suscripción
    const handleSubscriptionSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/api/subscriptions/renew`, {
                userId: selectedClient.id,
                planId: values.planId,
                description: values.description
            }, getAuthHeaders());

            message.success(`Plan asignado a ${selectedClient.name} correctamente.`);
            setIsSubModalVisible(false);
            await fetchClients();
            // Refrescar detalle si el cliente sigue seleccionado
            if (selectedClient) {
                // Truco rápido: Actualizar el estado local para reflejar cambio inmediato
                const updated = clients.find(c => c.id === selectedClient.id);
                if (updated) setSelectedClient({ ...updated });
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al procesar suscripción.";
            message.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 5. LÓGICA DE GESTIÓN DE PLANES (NUEVA)
    // ==========================================

    // Abrir el Drawer
    const openPlanManager = () => {
        setIsPlanDrawerVisible(true);
        fetchAdminPlans();
    };

    // Abrir Modal para CREAR
    const handleOpenCreatePlan = () => {
        setEditingPlan(null);
        planForm.resetFields();
        // Valores por defecto
        planForm.setFieldsValue({
            is_active: true,
            duration_months: 1,
            modules: []
        });
        setIsPlanFormVisible(true);
    };

    // Abrir Modal para EDITAR
    const handleOpenEditPlan = (plan) => {
        setEditingPlan(plan);
        // Mapear valores al form
        planForm.setFieldsValue({
            name: plan.name,
            price: plan.price,
            duration_months: plan.duration_months,
            modules: plan.modules || [], // Asegurar array
            description: plan.description,
            is_active: plan.is_active
        });
        setIsPlanFormVisible(true);
    };

    // Guardar (Crear o Actualizar)
    const handleSavePlan = async (values) => {
        setIsSubmitting(true);
        try {
            if (editingPlan) {
                // UPDATE
                await axios.put(`${API_URL}/api/plans/${editingPlan.id}`, values, getAuthHeaders());
                message.success("Plan actualizado correctamente");
            } else {
                // CREATE
                await axios.post(`${API_URL}/api/plans`, values, getAuthHeaders());
                message.success("Plan creado correctamente");
            }
            setIsPlanFormVisible(false);
            fetchAdminPlans();  // Recargar tabla admin
            fetchPublicPlans(); // Recargar dropdown de asignación
        } catch (error) {
            console.error(error);
            message.error("Error al guardar el plan");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cambiar Estado (Activo/Inactivo) desde la tabla
    const handleToggleStatus = async (plan) => {
        try {
            await axios.patch(`${API_URL}/api/plans/${plan.id}/status`, {}, getAuthHeaders());
            message.success(`Plan ${plan.is_active ? 'desactivado' : 'activado'}`);
            fetchAdminPlans();
            fetchPublicPlans();
        } catch (error) {
            message.error("Error al cambiar estado");
        }
    };

    // --- COLUMNAS DE LA TABLA DE PLANES ---
    const planColumns = [
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Precio',
            dataIndex: 'price',
            key: 'price',
            render: (val) => (
                <NumericFormat
                    value={val} displayType={'text'}
                    thousandSeparator="." decimalSeparator="," prefix="$ "
                />
            )
        },
        {
            title: 'Duración',
            dataIndex: 'duration_months',
            key: 'duration',
            render: (val) => `${val} mes(es)`
        },
        {
            title: 'Módulos',
            dataIndex: 'modules',
            key: 'modules',
            render: (modules) => (
                <>
                    {modules?.map(tag => (
                        <Tag color={MODULE_COLORS[tag] || 'default'} key={tag} style={{ fontSize: '10px' }}>
                            {tag}
                        </Tag>
                    ))}
                </>
            )
        },
        {
            title: 'Estado',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active, record) => (
                <Switch
                    checked={active}
                    onChange={() => handleToggleStatus(record)}
                    checkedChildren="Activo"
                    unCheckedChildren="Inactivo"
                    size="small"
                />
            )
        },
        {
            title: 'Acción',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenEditPlan(record)}
                    className="text-blue-600 hover:text-blue-800"
                >
                    Editar
                </Button>
            )
        }
    ];

    // ==========================================
    // 6. RENDERIZADO VISUAL
    // ==========================================

    const renderSubscriptionTag = (client) => {
        switch (client.subscription_status) {
            case 'active':
                return <Tag icon={<CheckCircleFilled />} color="green">Activo hasta {dayjs(client.end_date).format('DD MMM YYYY')}</Tag>;
            case 'expired':
                return <Tag icon={<ClockCircleOutlined />} color="red">Vencido {dayjs(client.end_date).format('DD MMM YYYY')}</Tag>;
            default:
                return <Tag color="default">Sin Suscripción</Tag>;
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 font-sans overflow-hidden">
            {/* SIDEBAR LISTA CLIENTES */}
            <aside className="w-1/3 max-w-sm flex flex-col bg-white border-r border-slate-200 shadow-sm z-10">
                {/* Header del Sidebar con botón de Gestionar Planes */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2 flex-col">
                    <Button
                        icon={<SettingOutlined />}
                        onClick={openPlanManager}
                        className="w-full mb-2 border-dashed border-emerald-600 text-emerald-700 hover:text-emerald-500 hover:border-emerald-500"
                    >
                        Gestionar Planes y Precios
                    </Button>
                    <Input
                        placeholder="Buscar cliente..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        onChange={handleSearch}
                        size="large"
                        className="rounded-lg"
                    />
                </div>

                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center"><Spin tip="Cargando..." /></div>
                    ) : (
                        filteredClients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => handleSelectClient(client)}
                                className={`p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 
                                    ${selectedClient?.id === client.id ? 'bg-[#155153] bg-opacity-10 border-l-4 border-l-[#155153]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <p className="font-semibold text-gray-800 m-0">{client.name}</p>
                                        <p className="text-xs text-gray-400 m-0">{client.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <Text strong className="text-emerald-600 block">
                                            <NumericFormat value={client.total_paid || 0} displayType={'text'} thousandSeparator="." decimalSeparator="," prefix="$" decimalScale={0} />
                                        </Text>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                    {renderSubscriptionTag(client)}
                                    {client.plan_name && <Tag color="blue" className="mr-0">{client.plan_name}</Tag>}
                                </div>
                            </div>
                        ))
                    )}
                    {filteredClients.length === 0 && !loading && <Empty description="No encontrado" className="mt-10" />}
                </div>
            </aside>

            {/* MAIN CONTENT DETALLE CLIENTE */}
            <main className="w-2/3 flex-grow flex flex-col bg-slate-50">
                {!selectedClient ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <UserOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                        <Title level={4} type="secondary">Selecciona un cliente</Title>
                    </div>
                ) : (
                    <div className="p-8 overflow-y-auto h-full">
                        {/* Header Cliente */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex justify-between items-start">
                            <div>
                                <Title level={3} style={{ margin: 0, color: '#155153' }}>{selectedClient.name}</Title>
                                <Text type="secondary" className="text-lg">{selectedClient.email}</Text>
                                <div className="mt-2">{renderSubscriptionTag(selectedClient)}</div>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setIsSubModalVisible(true)}
                                size="large"
                                style={{ backgroundColor: '#155153' }}
                            >
                                Asignar / Renovar
                            </Button>
                        </div>

                        <Title level={5} className="flex items-center gap-2 text-gray-600">
                            <HistoryOutlined /> Historial de Suscripciones
                        </Title>

                        {loadingDetails ? (
                            <div className="p-10 text-center"><Spin size="large" /></div>
                        ) : (
                            <div className="space-y-4">
                                {clientDetails?.subscription_history?.length > 0 ? (
                                    clientDetails.subscription_history.map(sub => (
                                        <Card key={sub.id} size="small" className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Text strong className="text-lg">{sub.plan_name || "Suscripción Manual"}</Text>
                                                    <Tag color={dayjs(sub.end_date).isAfter(dayjs()) ? 'green' : 'default'}>
                                                        {dayjs(sub.end_date).isAfter(dayjs()) ? 'Vigente' : 'Finalizada'}
                                                    </Tag>
                                                </div>
                                                <Text strong className="text-lg text-gray-700">
                                                    <NumericFormat value={sub.amount_paid} displayType={'text'} thousandSeparator="." decimalSeparator="," prefix="$ " />
                                                </Text>
                                            </div>
                                            <div className="flex justify-between text-gray-500 text-sm">
                                                <span className="flex items-center gap-1">
                                                    <CalendarOutlined />
                                                    {dayjs(sub.start_date).format('DD/MM/YYYY')} — {dayjs(sub.end_date).format('DD/MM/YYYY')}
                                                </span>
                                            </div>
                                            {sub.description && (
                                                <div className="mt-3 bg-blue-50 p-2 rounded text-blue-800 text-xs border border-blue-100">
                                                    <strong>Nota:</strong> {sub.description}
                                                </div>
                                            )}
                                        </Card>
                                    ))
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin historial de pagos." />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ======================================================== */}
            {/* DRAWER: GESTIÓN DE PLANES (CRUD) */}
            {/* ======================================================== */}
            <Drawer
                title="Gestión de Planes y Servicios"
                placement="right"
                width={720}
                onClose={() => setIsPlanDrawerVisible(false)}
                open={isPlanDrawerVisible}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreatePlan}>
                        Nuevo Plan
                    </Button>
                }
            >
                <div className="mb-4 text-gray-500 text-sm">
                    Administra los planes disponibles en el sistema. Los planes "Inactivos" no aparecerán para asignación.
                </div>
                <Table
                    columns={planColumns}
                    dataSource={adminPlans}
                    rowKey="id"
                    loading={loadingPlans}
                    pagination={false}
                    size="small"
                />
            </Drawer>

            {/* ======================================================== */}
            {/* MODAL: FORMULARIO CREAR/EDITAR PLAN */}
            {/* ======================================================== */}
            <Modal
                title={editingPlan ? `Editar Plan: ${editingPlan.name}` : "Crear Nuevo Plan"}
                open={isPlanFormVisible}
                onCancel={() => setIsPlanFormVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={planForm} layout="vertical" onFinish={handleSavePlan}>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="name"
                            label="Nombre del Plan"
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <Input placeholder="Ej: Plan Oro Mensual" />
                        </Form.Item>
                        <Form.Item
                            name="price"
                            label="Precio (COP)"
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <InputNumber
                                className="w-full"
                                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={value => value.replace(/\$\s?|(\.*)/g, '')}
                                placeholder="0"
                            />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="duration_months"
                            label="Duración (Meses)"
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <InputNumber min={1} max={36} className="w-full" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Estado Inicial"
                            valuePropName="checked"
                        >
                            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="modules"
                        label="Módulos Incluidos"
                        rules={[{ required: true, message: 'Selecciona al menos uno' }]}
                    >
                        <Checkbox.Group>
                            <div className="grid grid-cols-2 gap-2">
                                {MODULE_OPTIONS.map(mod => (
                                    <Checkbox key={mod} value={mod} style={{ marginLeft: 0 }}>
                                        <Tag color={MODULE_COLORS[mod]}>{mod}</Tag>
                                    </Checkbox>
                                ))}
                            </div>
                        </Checkbox.Group>
                    </Form.Item>

                    <Form.Item name="description" label="Descripción (Visible para ventas)">
                        <TextArea rows={3} placeholder="Detalles adicionales..." />
                    </Form.Item>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setIsPlanFormVisible(false)}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<SaveOutlined />}>
                            {editingPlan ? "Actualizar Plan" : "Crear Plan"}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ======================================================== */}
            {/* MODAL: ASIGNAR SUSCRIPCIÓN (EXISTENTE) */}
            {/* ======================================================== */}
            <Modal
                title={`Gestionar Plan para ${selectedClient?.name}`}
                open={isSubModalVisible}
                onCancel={() => setIsSubModalVisible(false)}
                footer={null}
                destroyOnClose
                width={600}
            >
                <div className="bg-blue-50 p-4 rounded mb-4 text-blue-800 text-sm">
                    ⚠️ Al asignar un nuevo plan, la fecha de inicio será <strong>inmediata</strong> si la suscripción anterior ya venció, o se <strong>acumulará</strong>.
                </div>
                <Form form={subForm} layout="vertical" onFinish={handleSubscriptionSubmit}>
                    <Form.Item name="planId" label="Seleccionar Plan" rules={[{ required: true, message: 'Selecciona un plan.' }]}>
                        <Select placeholder="Elige un plan..." size="large" optionLabelProp="label">
                            {publicPlans.map(plan => (
                                <Option key={plan.id} value={plan.id} label={plan.name}>
                                    <div className="flex flex-col py-1">
                                        <div className="flex justify-between font-semibold">
                                            <span>{plan.name}</span>
                                            <NumericFormat value={plan.price} displayType={'text'} thousandSeparator="." decimalSeparator="," prefix="$" className="text-emerald-600" />
                                        </div>
                                        <div className="text-xs text-gray-500 mb-1">Duración: {plan.duration_months} meses</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {plan.modules && plan.modules.map(mod => (
                                                <Tag key={mod} color={MODULE_COLORS[mod] || 'default'} style={{ fontSize: '10px', lineHeight: '16px' }}>{mod}</Tag>
                                            ))}
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Notas Internas">
                        <TextArea rows={2} placeholder="Ej: Pago realizado por transferencia..." />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsSubModalVisible(false)}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<SaveOutlined />} style={{ backgroundColor: '#155153' }}>
                            Guardar y Activar
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

export default DashboardClients;