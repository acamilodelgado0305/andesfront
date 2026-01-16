import React, { useState, useEffect, useCallback } from 'react';
import {
    Spin, Typography, Input, Form, Select, Button, Tag, message, Modal,
    Empty, Card, Drawer, Table, Space, InputNumber, Checkbox, Switch, Popconfirm, Tooltip, Grid
} from 'antd';
import {
    UserOutlined, SearchOutlined, PlusOutlined, SaveOutlined,
    HistoryOutlined, CheckCircleFilled, ClockCircleOutlined,
    CalendarOutlined, SettingOutlined, EditOutlined, DeleteOutlined,
    ArrowLeftOutlined // Nuevo icono para volver atrás en móvil
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { NumericFormat } from 'react-number-format';

dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid; // Hook para detectar tamaño de pantalla

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

const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { headers: { Authorization: `Bearer ${token}` } };
};

function DashboardClients() {
    // Detectar tamaño de pantalla (md = true si es tablet/desktop)
    const screens = useBreakpoint();

    // ==========================================
    // 1. ESTADOS
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
    const [publicPlans, setPublicPlans] = useState([]);

    // Gestión de Planes
    const [isPlanDrawerVisible, setIsPlanDrawerVisible] = useState(false);
    const [isPlanFormVisible, setIsPlanFormVisible] = useState(false);
    const [adminPlans, setAdminPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [planForm] = Form.useForm();

    // ==========================================
    // 2. CARGA DE DATOS
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

    const fetchPublicPlans = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/plans`, getAuthHeaders());
            setPublicPlans(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchAdminPlans = useCallback(async () => {
        setLoadingPlans(true);
        try {
            const { data } = await axios.get(`${API_URL}/api/plans-admin`, getAuthHeaders());
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
    // 3. LÓGICA CLIENTES
    // ==========================================
    const handleSelectClient = async (client) => {
        setSelectedClient(client);
        // Si estamos en móvil, el usuario "navega" al detalle, así que hacemos scroll top
        if (!screens.md) window.scrollTo(0, 0);

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

    const handleBackToClients = () => {
        setSelectedClient(null);
        setClientDetails(null);
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setFilteredClients(clients.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query)
        ));
    };

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
            if (selectedClient) {
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
    // 4. LÓGICA PLANES
    // ==========================================
    const openPlanManager = () => {
        setIsPlanDrawerVisible(true);
        fetchAdminPlans();
    };

    const handleOpenCreatePlan = () => {
        setEditingPlan(null);
        planForm.resetFields();
        planForm.setFieldsValue({
            is_active: true,
            duration_months: 1,
            modules: []
        });
        setIsPlanFormVisible(true);
    };

    const handleOpenEditPlan = (plan) => {
        setEditingPlan(plan);
        planForm.setFieldsValue({
            name: plan.name,
            price: plan.price,
            duration_months: plan.duration_months,
            modules: plan.modules || [],
            description: plan.description,
            is_active: plan.is_active
        });
        setIsPlanFormVisible(true);
    };

    const handleSavePlan = async (values) => {
        setIsSubmitting(true);
        try {
            if (editingPlan) {
                await axios.put(`${API_URL}/api/plans/${editingPlan.id}`, values, getAuthHeaders());
                message.success("Plan actualizado");
            } else {
                await axios.post(`${API_URL}/api/plans`, values, getAuthHeaders());
                message.success("Plan creado");
            }
            setIsPlanFormVisible(false);
            fetchAdminPlans();
            fetchPublicPlans();
        } catch (error) {
            console.error(error);
            message.error("Error al guardar el plan");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const planColumns = [
        {
            title: 'Nombre', dataIndex: 'name', key: 'name', fixed: 'left',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Precio', dataIndex: 'price', key: 'price',
            render: (val) => <NumericFormat value={val} displayType={'text'} thousandSeparator="." decimalSeparator="," prefix="$ " />
        },
        {
            title: 'Duración', dataIndex: 'duration_months', key: 'duration',
            render: (val) => `${val} mes(es)`
        },
        {
            title: 'Módulos', dataIndex: 'modules', key: 'modules',
            render: (modules) => (
                <div className="flex flex-wrap gap-1">
                    {modules?.map(tag => <Tag key={tag} color={MODULE_COLORS[tag]} style={{ fontSize: '10px' }}>{tag}</Tag>)}
                </div>
            )
        },
        {
            title: 'Estado', dataIndex: 'is_active', key: 'is_active',
            render: (active, record) => (
                <Switch checked={active} onChange={() => handleToggleStatus(record)} size="small" />
            )
        },
        {
            title: 'Acción', key: 'action', fixed: 'right',
            render: (_, record) => (
                <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEditPlan(record)} className="text-blue-600" />
            )
        }
    ];

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

    // ==========================================
    // 5. RENDERIZADO RESPONSIVE
    // ==========================================

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 font-sans overflow-hidden relative">

            {/* ----------------------------------------------------------------- */}
            {/* SIDEBAR (LISTA DE CLIENTES) */}
            {/* Lógica: Visible si es Desktop (screens.md) O si NO hay cliente seleccionado en móvil */}
            {/* ----------------------------------------------------------------- */}
            <aside
                className={`
                    flex flex-col bg-white border-r border-slate-200 shadow-sm z-10 transition-all
                    w-full md:w-1/3 max-w-none md:max-w-sm
                    ${(!selectedClient || screens.md) ? 'flex' : 'hidden'}
                `}
            >
                {/* Header del Sidebar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2 flex-col">
                    <Button
                        icon={<SettingOutlined />}
                        onClick={openPlanManager}
                        className="w-full mb-2 border-dashed border-emerald-600 text-emerald-700 hover:text-emerald-500"
                    >
                        Gestionar Planes
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
                                    ${selectedClient?.id === client.id && screens.md ? 'bg-[#155153] bg-opacity-10 border-l-4 border-l-[#155153]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="truncate pr-2">
                                        <p className="font-semibold text-gray-800 m-0 truncate">{client.name}</p>
                                        <p className="text-xs text-gray-400 m-0 truncate">{client.email}</p>
                                    </div>
                                    <div className="text-right whitespace-nowrap">
                                        <Text strong className="text-emerald-600 block">
                                            <NumericFormat value={client.total_paid || 0} displayType={'text'} thousandSeparator="." decimalSeparator="," prefix="$" decimalScale={0} />
                                        </Text>
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1 justify-between items-center">
                                    <div className="scale-90 origin-left">{renderSubscriptionTag(client)}</div>
                                    {client.plan_name && <Tag color="blue" className="mr-0 text-[10px]">{client.plan_name}</Tag>}
                                </div>
                            </div>
                        ))
                    )}
                    {filteredClients.length === 0 && !loading && <Empty description="No encontrado" className="mt-10" />}
                </div>
            </aside>

            {/* ----------------------------------------------------------------- */}
            {/* MAIN CONTENT (DETALLE CLIENTE) */}
            {/* Lógica: Visible si es Desktop (screens.md) O si HAY cliente seleccionado en móvil */}
            {/* ----------------------------------------------------------------- */}
            <main
                className={`
                    flex-grow flex-col bg-slate-50
                    w-full md:w-2/3 
                    ${(selectedClient || screens.md) ? 'flex' : 'hidden'}
                `}
            >
                {!selectedClient ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <UserOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                        <Title level={4} type="secondary" className="text-center px-4">Selecciona un cliente para ver detalles</Title>
                    </div>
                ) : (
                    <div className="p-4 md:p-8 overflow-y-auto h-full">
                        {/* Botón VOLVER (Solo Móvil) */}
                        <div className="md:hidden mb-4">
                            <Button icon={<ArrowLeftOutlined />} onClick={handleBackToClients} type="text">
                                Volver a la lista
                            </Button>
                        </div>

                        {/* Header Cliente */}
                        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="w-full">
                                <Title level={3} style={{ margin: 0, color: '#155153' }} className="break-words">{selectedClient.name}</Title>
                                <Text type="secondary" className="text-sm md:text-lg break-all">{selectedClient.email}</Text>
                                <div className="mt-2 scale-90 md:scale-100 origin-left">{renderSubscriptionTag(selectedClient)}</div>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setIsSubModalVisible(true)}
                                size="large"
                                style={{ backgroundColor: '#155153' }}
                                className="w-full md:w-auto"
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
                            <div className="space-y-4 pb-10">
                                {clientDetails?.subscription_history?.length > 0 ? (
                                    clientDetails.subscription_history.map(sub => (
                                        <Card key={sub.id} size="small" className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex flex-col md:flex-row justify-between md:items-center mb-2 gap-2">
                                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                                    <Text strong className="text-base md:text-lg">{sub.plan_name || "Manual"}</Text>
                                                    <Tag className="w-fit" color={dayjs(sub.end_date).isAfter(dayjs()) ? 'green' : 'default'}>
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
                                                    {dayjs(sub.start_date).format('DD/MM/YY')} — {dayjs(sub.end_date).format('DD/MM/YY')}
                                                </span>
                                            </div>
                                            {sub.description && (
                                                <div className="mt-3 bg-blue-50 p-2 rounded text-blue-800 text-xs border border-blue-100 break-words">
                                                    <strong>Nota:</strong> {sub.description}
                                                </div>
                                            )}
                                        </Card>
                                    ))
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin historial." />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* DRAWER: GESTIÓN DE PLANES */}
            <Drawer
                title="Gestión de Planes"
                placement="right"
                width={screens.md ? 720 : '100%'} // Ancho 100% en móvil
                onClose={() => setIsPlanDrawerVisible(false)}
                open={isPlanDrawerVisible}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreatePlan} size="small">
                        Nuevo
                    </Button>
                }
            >
                <Table
                    columns={planColumns}
                    dataSource={adminPlans}
                    rowKey="id"
                    loading={loadingPlans}
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }} // Habilita scroll horizontal en móvil
                />
            </Drawer>

            {/* MODAL: FORMULARIO PLAN */}
            <Modal
                title={editingPlan ? "Editar Plan" : "Crear Plan"}
                open={isPlanFormVisible}
                onCancel={() => setIsPlanFormVisible(false)}
                footer={null}
                destroyOnClose
                width={screens.md ? 600 : '95%'} // Modal responsive
                style={{ top: 20 }}
            >
                <Form form={planForm} layout="vertical" onFinish={handleSavePlan}>
                    {/* Campos simplificados visualmente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="price" label="Precio" rules={[{ required: true }]}>
                            <InputNumber className="w-full" />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <Form.Item name="duration_months" label="Duración (Meses)" rules={[{ required: true }]}>
                            <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item name="is_active" label="Estado" valuePropName="checked">
                            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                        </Form.Item>
                    </div>
                    <Form.Item name="modules" label="Módulos" rules={[{ required: true }]}>
                        <Checkbox.Group>
                            <div className="grid grid-cols-2 gap-2">
                                {MODULE_OPTIONS.map(mod => (
                                    <Checkbox key={mod} value={mod}><span className="text-xs">{mod}</span></Checkbox>
                                ))}
                            </div>
                        </Checkbox.Group>
                    </Form.Item>
                    <Form.Item name="description" label="Descripción">
                        <TextArea rows={2} />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setIsPlanFormVisible(false)}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<SaveOutlined />}>Guardar</Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: ASIGNAR SUSCRIPCIÓN */}
            <Modal
                title="Asignar Plan"
                open={isSubModalVisible}
                onCancel={() => setIsSubModalVisible(false)}
                footer={null}
                destroyOnClose
                width={screens.md ? 600 : '95%'}
                style={{ top: 20 }}
            >
                <Form form={subForm} layout="vertical" onFinish={handleSubscriptionSubmit}>
                    <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
                        <Select placeholder="Elige..." optionLabelProp="label" dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}>
                            {publicPlans.map(plan => (
                                <Option key={plan.id} value={plan.id} label={plan.name}>
                                    <div className="flex flex-col py-1 border-b border-gray-100 last:border-0">
                                        <div className="flex justify-between font-semibold">
                                            <span>{plan.name}</span>
                                            <span className="text-emerald-600">${plan.price}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{plan.duration_months} mes(es)</div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Notas">
                        <TextArea rows={2} />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsSubModalVisible(false)}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} style={{ backgroundColor: '#155153' }}>Guardar</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

export default DashboardClients;