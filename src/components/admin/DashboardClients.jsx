import React, { useState, useEffect, useCallback } from 'react';
import {
    Layout, Spin, Typography, Input, Form, Select, Button, Tag, message, Modal,
    Empty, Card, Drawer, Table, Space, InputNumber, Checkbox, Switch, Popconfirm,
    Tooltip, Grid, Divider, DatePicker, Statistic, Dropdown, Avatar
} from 'antd';
import {
    SearchOutlined, PlusOutlined, SaveOutlined, HistoryOutlined,
    CheckCircleFilled, ClockCircleOutlined, CalendarOutlined, SettingOutlined,
    EditOutlined, DeleteOutlined, ShopOutlined, AppstoreOutlined, MoreOutlined,
    ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, DollarOutlined,
    TeamOutlined, ToolOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { NumericFormat } from 'react-number-format';
import { adminService } from '../../services/adminService';
import useCurrency, { useCurrencyInput } from '../../hooks/useCurrency';

dayjs.locale('es');

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const PRIMARY_COLOR = '#155153';

// --- CONSTANTES ---
const MODULE_COLORS = {
    'POS': 'green',
    'ACADEMICO': 'blue',
    'INVENTARIO': 'cyan',
    'GENERACION': 'magenta',
    'ADMIN': 'red'
};

const MODULE_OPTIONS = ['POS', 'ACADEMICO', 'INVENTARIO', 'GENERACION', 'ADMIN'];

const POS_SUBMODULES = [
    { key: 'movimientos', label: 'Movimientos' },
    { key: 'facturas',    label: 'Facturas / Cotizaciones' },
    { key: 'contactos',   label: 'Contactos' },
    { key: 'crm',         label: 'CRM' },
    { key: 'inventario',  label: 'Inventario' },
    { key: 'pedidos',     label: 'Pedidos' },
];

function DashboardClients() {
    const screens = useBreakpoint();
    const formatCurrency = useCurrency();
    const { addonAfter: currSuffix } = useCurrencyInput();

    // ==========================================
    // 1. ESTADOS
    // ==========================================
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

    // Selección múltiple para borrado masivo
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Modal Asignar Suscripción
    const [isSubModalVisible, setIsSubModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subForm] = Form.useForm();
    const [publicPlans, setPublicPlans] = useState([]);

    // Modal Editar Suscripción
    const [isEditSubModalVisible, setIsEditSubModalVisible] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [editSubForm] = Form.useForm();

    // Modal Crear Negocio
    const [isCreateBusinessModalVisible, setIsCreateBusinessModalVisible] = useState(false);
    const [createBusinessForm] = Form.useForm();

    // Módulos ocultos por negocio
    const [modulosOcultos, setModulosOcultos] = useState([]);
    const [savingModules, setSavingModules] = useState(false);

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
            const data = await adminService.getSubscriptions();
            setClients(data); // el useEffect de búsqueda sincroniza filteredClients
        } catch (err) {
            console.error(err);
            message.error("Error al cargar negocios.");
        }
    }, []);

    const fetchPublicPlans = useCallback(async () => {
        try {
            const data = await adminService.getPublicPlans();
            setPublicPlans(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchAdminPlans = useCallback(async () => {
        setLoadingPlans(true);
        try {
            const data = await adminService.getAdminPlans();
            setAdminPlans(data);
        } catch (err) {
            message.error("Error cargando gestión de planes");
        } finally {
            setLoadingPlans(false);
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchClients(), fetchPublicPlans()]);
        setLoading(false);
    }, [fetchClients, fetchPublicPlans]);

    useEffect(() => { loadData(); }, [loadData]);

    // Mantener la lista filtrada sincronizada con clients + búsqueda
    useEffect(() => {
        const query = busqueda.toLowerCase().trim();
        if (!query) {
            setFilteredClients(clients);
            return;
        }
        setFilteredClients(clients.filter(c => {
            const nameMatch = c.name && c.name.toLowerCase().includes(query);
            const emailMatch = c.email && c.email.toLowerCase().includes(query);
            const planMatch = c.plan_name && c.plan_name.toLowerCase().includes(query);
            return nameMatch || emailMatch || planMatch;
        }));
    }, [busqueda, clients]);

    // ==========================================
    // 3. LÓGICA NEGOCIOS
    // ==========================================
    const handleOpenConfig = async (client) => {
        setSelectedClient(client);
        setClientDetails(null);
        setModulosOcultos([]);
        setConfigDrawerOpen(true);

        setLoadingDetails(true);
        try {
            const data = await adminService.getClientDetails(client.id);
            setClientDetails(data);
            setModulosOcultos(data.modulos_ocultos || []);
        } catch (err) {
            message.error("Error al cargar detalles del negocio.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const refreshSelectedClient = async () => {
        if (!selectedClient) return;
        try {
            const data = await adminService.getClientDetails(selectedClient.id);
            setClientDetails(data);
            setModulosOcultos(data.modulos_ocultos || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseConfig = () => {
        setConfigDrawerOpen(false);
        setSelectedClient(null);
        setClientDetails(null);
        setModulosOcultos([]);
    };

    const handleSaveModules = async () => {
        if (!selectedClient) return;
        setSavingModules(true);
        try {
            await adminService.updateBusinessModules(selectedClient.id, modulosOcultos);
            message.success('Configuración de módulos guardada.');
        } catch (err) {
            console.error(err);
            message.error('Error al guardar la configuración de módulos.');
        } finally {
            setSavingModules(false);
        }
    };

    const handleDeleteBusiness = async (business) => {
        try {
            await adminService.deleteBusiness(business.id);
            message.success(`Negocio "${business.name}" eliminado correctamente.`);
            setSelectedRowKeys(prev => prev.filter(k => k !== business.id));
            handleCloseConfig();
            await fetchClients();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "Error al eliminar el negocio.";
            message.error(errorMsg);
        }
    };

    const handleBulkDelete = () => {
        if (selectedRowKeys.length === 0) return;
        Modal.confirm({
            title: `¿Eliminar ${selectedRowKeys.length} negocio(s)?`,
            content: 'Se borrarán todas las suscripciones y usuarios de los negocios seleccionados. Esta acción es irreversible.',
            okText: `Sí, eliminar ${selectedRowKeys.length}`,
            okButtonProps: { danger: true },
            cancelText: 'Cancelar',
            onOk: async () => {
                setBulkDeleting(true);
                try {
                    const { message: msg } = await adminService.deleteBusinessesBulk(selectedRowKeys);
                    message.success(msg || 'Negocios eliminados correctamente.');
                    setSelectedRowKeys([]);
                    await fetchClients();
                } catch (err) {
                    console.error(err);
                    const errorMsg = err.response?.data?.error || 'Error al eliminar los negocios.';
                    message.error(errorMsg);
                } finally {
                    setBulkDeleting(false);
                }
            },
        });
    };

    const handleCreateBusiness = async (values) => {
        setIsSubmitting(true);
        try {
            await adminService.createBusiness({
                businessName: values.businessName,
                adminName: values.adminName,
                adminEmail: values.adminEmail,
                adminPassword: values.adminPassword,
                planId: values.planId,
            });
            message.success(`Negocio "${values.businessName}" creado exitosamente.`);
            setIsCreateBusinessModalVisible(false);
            createBusinessForm.resetFields();
            await fetchClients();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "Error al crear el negocio.";
            message.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubscriptionSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            const selectedPlan = publicPlans.find(p => p.id === values.planId);
            if (!selectedPlan) {
                message.error("Plan no válido.");
                return;
            }

            await adminService.createSubscription({
                businessId: selectedClient.id,
                planId: values.planId,
                amountPaid: selectedPlan.price,
                durationMonths: selectedPlan.duration_months,
                description: values.description
            });

            message.success(`Plan asignado a ${selectedClient.name} correctamente.`);
            setIsSubModalVisible(false);
            subForm.resetFields();
            await refreshSelectedClient();
            await fetchClients();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "Error al procesar suscripción.";
            message.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenEditSubscription = (sub) => {
        setSelectedSubscription(sub);
        editSubForm.setFieldsValue({
            planId: sub.plan_id,
            amountPaid: sub.amount_paid,
            description: sub.description,
            startDate: sub.start_date ? dayjs(sub.start_date) : null,
            endDate: sub.end_date ? dayjs(sub.end_date) : null,
        });
        setIsEditSubModalVisible(true);
    };

    const handleEditSubscriptionSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            const payload = {
                planId: values.planId,
                amountPaid: values.amountPaid,
                description: values.description,
                startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
                endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
            };
            await adminService.updateSubscription(selectedSubscription.id, payload);
            message.success("Suscripción actualizada correctamente.");
            setIsEditSubModalVisible(false);
            editSubForm.resetFields();
            await refreshSelectedClient();
            await fetchClients();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "Error al actualizar la suscripción.";
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
        planForm.setFieldsValue({ is_active: true, duration_months: 1, modules: [] });
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
                await adminService.updatePlan(editingPlan.id, values);
                message.success("Plan actualizado");
            } else {
                await adminService.createPlan(values);
                message.success("Plan creado");
            }
            setIsPlanFormVisible(false);
            await fetchAdminPlans();
            await fetchPublicPlans();
            await fetchClients();
            await refreshSelectedClient();
        } catch (error) {
            console.error(error);
            message.error("Error al guardar el plan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (plan) => {
        try {
            await adminService.togglePlanStatus(plan.id);
            message.success(`Plan ${plan.is_active ? 'desactivado' : 'activado'}`);
            await fetchAdminPlans();
            await fetchPublicPlans();
            await fetchClients();
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

    // ==========================================
    // 5. HELPERS DE RENDER
    // ==========================================
    const renderSubscriptionTag = (client) => {
        switch (client.subscription_status) {
            case 'active':
                return <Tag icon={<CheckCircleFilled />} color="green">Activo · vence {dayjs(client.end_date).format('DD MMM YYYY')}</Tag>;
            case 'expired':
                return <Tag icon={<ClockCircleOutlined />} color="red">Vencido {dayjs(client.end_date).format('DD MMM YYYY')}</Tag>;
            default:
                return <Tag color="default">Sin suscripción</Tag>;
        }
    };

    // ==========================================
    // 6. STATS
    // ==========================================
    const totalNegocios = clients.length;
    const activos = clients.filter(c => c.subscription_status === 'active').length;
    const vencidos = clients.filter(c => c.subscription_status === 'expired').length;
    const recaudado = clients.reduce((acc, c) => acc + Number(c.total_paid || 0), 0);

    // ==========================================
    // 7. COLUMNAS TABLA NEGOCIOS
    // ==========================================
    const clientColumns = [
        {
            title: 'Negocio',
            key: 'negocio',
            render: (_, rec) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        shape="square"
                        size={36}
                        style={{ background: PRIMARY_COLOR, flexShrink: 0, fontWeight: 700 }}
                    >
                        {(rec.name || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{rec.name}</div>
                        <div className="text-xs text-gray-400 truncate">{rec.email || 'Sin correo'}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Plan',
            dataIndex: 'plan_name',
            key: 'plan_name',
            responsive: ['md'],
            render: (plan) => plan
                ? <Tag color="blue">{plan}</Tag>
                : <Text type="secondary" className="text-xs">Sin plan</Text>,
        },
        {
            title: 'Estado',
            key: 'estado',
            render: (_, rec) => <div className="scale-90 origin-left">{renderSubscriptionTag(rec)}</div>,
        },
        {
            title: 'Total pagado',
            dataIndex: 'total_paid',
            key: 'total_paid',
            align: 'right',
            responsive: ['sm'],
            render: (val) => val
                ? <Text strong className="text-emerald-600">{formatCurrency(Number(val))}</Text>
                : <Text type="secondary" className="text-xs">—</Text>,
        },
        {
            title: '',
            key: 'acciones',
            align: 'center',
            width: 130,
            render: (_, rec) => (
                <Space size={4}>
                    <Button
                        size="small"
                        icon={<ToolOutlined />}
                        onClick={() => handleOpenConfig(rec)}
                        style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                    >
                        Configurar
                    </Button>
                    <Dropdown
                        trigger={['click']}
                        menu={{
                            items: [
                                {
                                    key: 'asignar',
                                    icon: <PlusOutlined />,
                                    label: 'Asignar / Renovar',
                                    onClick: () => { setSelectedClient(rec); setIsSubModalVisible(true); },
                                },
                                { type: 'divider' },
                                {
                                    key: 'eliminar',
                                    icon: <DeleteOutlined />,
                                    label: 'Eliminar negocio',
                                    danger: true,
                                    onClick: () => {
                                        Modal.confirm({
                                            title: `¿Eliminar "${rec.name}"?`,
                                            content: 'Se borrarán todas las suscripciones y usuarios del negocio. Esta acción es irreversible.',
                                            okText: 'Sí, eliminar',
                                            okButtonProps: { danger: true },
                                            cancelText: 'Cancelar',
                                            onOk: () => handleDeleteBusiness(rec),
                                        });
                                    },
                                },
                            ],
                        }}
                    >
                        <Button size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    // ==========================================
    // 8. RENDER
    // ==========================================
    return (
        <Content style={{ padding: '16px 20px' }}>

            {/* Encabezado */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <Title level={3} style={{ margin: 0 }}>Negocios</Title>
                    <Text type="secondary">Administra suscripciones, vencimientos y módulos de cada negocio</Text>
                </div>
                <Space wrap>
                    <Button
                        icon={<SettingOutlined />}
                        onClick={openPlanManager}
                    >
                        Gestionar Planes
                    </Button>
                    <Button
                        type="primary"
                        icon={<ShopOutlined />}
                        onClick={() => setIsCreateBusinessModalVisible(true)}
                        style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                        Crear Negocio
                    </Button>
                </Space>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Card size="small" bordered={false} className="shadow-sm">
                    <Statistic
                        title="Negocios"
                        value={totalNegocios}
                        prefix={<TeamOutlined style={{ color: PRIMARY_COLOR }} />}
                        valueStyle={{ color: PRIMARY_COLOR, fontSize: 18 }}
                    />
                </Card>
                <Card size="small" bordered={false} className="shadow-sm">
                    <Statistic
                        title="Activos"
                        value={activos}
                        prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                        valueStyle={{ color: '#16a34a', fontSize: 18 }}
                    />
                </Card>
                <Card size="small" bordered={false} className="shadow-sm">
                    <Statistic
                        title="Vencidos"
                        value={vencidos}
                        prefix={<CloseCircleOutlined style={{ color: '#dc2626' }} />}
                        valueStyle={{ color: '#dc2626', fontSize: 18 }}
                    />
                </Card>
                <Card size="small" bordered={false} className="shadow-sm">
                    <Statistic
                        title="Recaudado"
                        value={recaudado}
                        formatter={(v) => formatCurrency(Number(v))}
                        prefix={<DollarOutlined style={{ color: '#0891b2' }} />}
                        valueStyle={{ color: '#0891b2', fontSize: 15 }}
                    />
                </Card>
            </div>

            {/* Buscador */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <Input
                    placeholder="Buscar por negocio, correo o plan..."
                    prefix={<SearchOutlined />}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    allowClear
                    style={{ width: 300, maxWidth: '100%' }}
                />
                <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />

                {selectedRowKeys.length > 0 && (
                    <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        loading={bulkDeleting}
                        onClick={handleBulkDelete}
                    >
                        Eliminar ({selectedRowKeys.length})
                    </Button>
                )}
            </div>

            {/* Tabla */}
            <Table
                columns={clientColumns}
                dataSource={filteredClients}
                rowKey="id"
                loading={loading}
                size="small"
                rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                    columnWidth: 44,
                }}
                pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} negocios` }}
                scroll={{ x: 720 }}
                locale={{ emptyText: <Empty description="No se encontraron negocios" /> }}
            />

            {/* ============================================================= */}
            {/* DRAWER: CONFIGURAR NEGOCIO                                     */}
            {/* ============================================================= */}
            <Drawer
                title={
                    <Space>
                        <ShopOutlined style={{ color: PRIMARY_COLOR }} />
                        <span>{selectedClient?.name || 'Configurar negocio'}</span>
                    </Space>
                }
                placement="right"
                width={screens.md ? 600 : '100%'}
                onClose={handleCloseConfig}
                open={configDrawerOpen}
                styles={{ body: { background: '#f8fafc' } }}
            >
                {selectedClient && (
                    <div className="flex flex-col gap-4">
                        {/* Tarjeta resumen + acciones */}
                        <Card size="small" bordered={false} className="shadow-sm">
                            <div className="flex flex-col gap-3">
                                <div>
                                    <Text type="secondary" className="text-xs break-all">{selectedClient.email}</Text>
                                    <div className="mt-2">{renderSubscriptionTag(selectedClient)}</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIsSubModalVisible(true)}
                                        style={{ backgroundColor: PRIMARY_COLOR }}
                                    >
                                        Asignar / Renovar
                                    </Button>
                                    <Popconfirm
                                        title="Eliminar negocio"
                                        description={
                                            <span>
                                                Se borrarán <strong>todas las suscripciones y usuarios</strong>.<br />
                                                Esta acción es irreversible.
                                            </span>
                                        }
                                        okText="Sí, eliminar"
                                        okType="danger"
                                        cancelText="Cancelar"
                                        placement="bottomRight"
                                        onConfirm={() => handleDeleteBusiness(selectedClient)}
                                    >
                                        <Button danger icon={<DeleteOutlined />}>Eliminar</Button>
                                    </Popconfirm>
                                </div>
                            </div>
                        </Card>

                        {/* Módulos visibles (POS) */}
                        <Card size="small" bordered={false} className="shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AppstoreOutlined style={{ color: PRIMARY_COLOR }} /> Módulos visibles (POS)
                                </Title>
                                <Button
                                    type="primary"
                                    size="small"
                                    loading={savingModules}
                                    onClick={handleSaveModules}
                                    icon={<SaveOutlined />}
                                    style={{ backgroundColor: PRIMARY_COLOR }}
                                >
                                    Guardar
                                </Button>
                            </div>
                            <p className="text-xs text-gray-400 mt-0 mb-3">
                                Activa o desactiva qué secciones del módulo POS puede ver este negocio.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {POS_SUBMODULES.map(mod => {
                                    const isVisible = !modulosOcultos.includes(mod.key);
                                    return (
                                        <div
                                            key={mod.key}
                                            className="flex items-center justify-between px-3 py-2 rounded-lg border"
                                            style={{
                                                background: isVisible ? '#f0fdf4' : '#fafafa',
                                                borderColor: isVisible ? '#bbf7d0' : '#e5e7eb',
                                            }}
                                        >
                                            <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                                            <Switch
                                                size="small"
                                                checked={isVisible}
                                                checkedChildren="Visible"
                                                unCheckedChildren="Oculto"
                                                onChange={(visible) => {
                                                    if (visible) {
                                                        setModulosOcultos(prev => prev.filter(k => k !== mod.key));
                                                    } else {
                                                        setModulosOcultos(prev => [...prev, mod.key]);
                                                    }
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Historial de suscripciones */}
                        <Card size="small" bordered={false} className="shadow-sm">
                            <Title level={5} className="flex items-center gap-2" style={{ marginTop: 0 }}>
                                <HistoryOutlined style={{ color: PRIMARY_COLOR }} /> Historial de suscripciones
                            </Title>

                            {loadingDetails ? (
                                <div className="p-8 text-center"><Spin /></div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {clientDetails?.subscription_history?.length > 0 ? (
                                        clientDetails.subscription_history.map(sub => {
                                            const vigente = dayjs(sub.end_date).isAfter(dayjs());
                                            return (
                                                <div key={sub.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Text strong>{sub.plan_name || "Manual"}</Text>
                                                            <Tag color={vigente ? 'green' : 'default'}>
                                                                {vigente ? 'Vigente' : 'Finalizada'}
                                                            </Tag>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Text strong className="text-gray-700">
                                                                <NumericFormat value={sub.amount_paid} displayType={'text'} thousandSeparator="." decimalSeparator="," prefix="$ " />
                                                            </Text>
                                                            <Tooltip title="Editar plan, monto o fechas">
                                                                <Button
                                                                    type="text"
                                                                    size="small"
                                                                    icon={<EditOutlined />}
                                                                    onClick={() => handleOpenEditSubscription(sub)}
                                                                    className="text-blue-600 border border-blue-200"
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                        <CalendarOutlined />
                                                        {dayjs(sub.start_date).format('DD/MM/YY')} — {dayjs(sub.end_date).format('DD/MM/YY')}
                                                    </div>
                                                    {sub.description && (
                                                        <div className="mt-2 bg-blue-50 p-2 rounded text-blue-800 text-xs border border-blue-100 break-words">
                                                            <strong>Nota:</strong> {sub.description}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin historial." />
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </Drawer>

            {/* DRAWER: GESTIÓN DE PLANES */}
            <Drawer
                title="Gestión de Planes"
                placement="right"
                width={screens.md ? 720 : '100%'}
                onClose={() => setIsPlanDrawerVisible(false)}
                open={isPlanDrawerVisible}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreatePlan} size="small" style={{ backgroundColor: PRIMARY_COLOR }}>
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
                    scroll={{ x: 800 }}
                />
            </Drawer>

            {/* MODAL: FORMULARIO PLAN */}
            <Modal
                title={editingPlan ? "Editar Plan" : "Crear Plan"}
                open={isPlanFormVisible}
                onCancel={() => setIsPlanFormVisible(false)}
                footer={null}
                destroyOnClose
                width={screens.md ? 600 : '95%'}
                style={{ top: 20 }}
            >
                <Form form={planForm} layout="vertical" onFinish={handleSavePlan}>
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
                        <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<SaveOutlined />} style={{ backgroundColor: PRIMARY_COLOR }}>Guardar</Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: ASIGNAR SUSCRIPCIÓN */}
            <Modal
                title={<Space><PlusOutlined style={{ color: PRIMARY_COLOR }} /> Asignar Plan</Space>}
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
                        <Button type="primary" htmlType="submit" loading={isSubmitting} style={{ backgroundColor: PRIMARY_COLOR }}>Guardar</Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: EDITAR SUSCRIPCIÓN */}
            <Modal
                title="Editar Suscripción"
                open={isEditSubModalVisible}
                onCancel={() => setIsEditSubModalVisible(false)}
                footer={null}
                destroyOnClose
                width={screens.md ? 600 : '95%'}
                style={{ top: 20 }}
            >
                <Form form={editSubForm} layout="vertical" onFinish={handleEditSubscriptionSubmit}>
                    <Form.Item name="planId" label="Plan" rules={[{ required: true, message: 'Seleccione un plan' }]}>
                        <Select
                            placeholder="Elige..."
                            optionLabelProp="label"
                            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                            onChange={(value) => {
                                const newPlan = publicPlans.find(p => p.id === value);
                                if (newPlan) {
                                    editSubForm.setFieldsValue({ amountPaid: newPlan.price });
                                }
                            }}
                        >
                            {publicPlans.map(plan => (
                                <Option key={plan.id} value={plan.id} label={plan.name}>
                                    <div className="flex flex-col py-1 border-b border-gray-100 last:border-0">
                                        <div className="flex justify-between font-semibold">
                                            <span>{plan.name}</span>
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="amountPaid" label="Monto Pagado">
                        <InputNumber min={0} className="w-full" addonAfter={currSuffix} />
                    </Form.Item>

                    <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">
                        Vigencia
                    </Divider>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <Form.Item name="startDate" label="Fecha de inicio">
                            <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Inicio" />
                        </Form.Item>
                        <Form.Item
                            name="endDate"
                            label="Fecha de vencimiento"
                            rules={[{ required: true, message: 'Selecciona la fecha de vencimiento' }]}
                        >
                            <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Vencimiento" />
                        </Form.Item>
                    </div>
                    <p className="text-xs text-gray-400 -mt-2 mb-3">
                        Cambia la fecha de vencimiento para extender una prueba o ampliar el plazo de pago.
                        Si la fecha es futura, el negocio queda <strong>activo</strong> automáticamente.
                    </p>

                    <Form.Item name="description" label="Notas Adicionales">
                        <TextArea rows={2} />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsEditSubModalVisible(false)}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} style={{ backgroundColor: PRIMARY_COLOR }}>Guardar Cambios</Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: CREAR NEGOCIO */}
            <Modal
                title={<span className="flex items-center gap-2"><ShopOutlined /> Crear Nuevo Negocio</span>}
                open={isCreateBusinessModalVisible}
                onCancel={() => { setIsCreateBusinessModalVisible(false); createBusinessForm.resetFields(); }}
                footer={null}
                destroyOnClose
                width={screens.md ? 560 : '95%'}
                style={{ top: 20 }}
            >
                <Form form={createBusinessForm} layout="vertical" onFinish={handleCreateBusiness}>
                    <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">Datos del Negocio</Divider>
                    <Form.Item name="businessName" label="Nombre del Negocio" rules={[{ required: true, message: 'Ingresa el nombre del negocio' }]}>
                        <Input placeholder="Ej: Colegio Los Andes" />
                    </Form.Item>

                    <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">Administrador</Divider>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <Form.Item name="adminName" label="Nombre Completo" rules={[{ required: true, message: 'Ingresa el nombre del admin' }]}>
                            <Input placeholder="Ej: Carlos Gómez" />
                        </Form.Item>
                        <Form.Item
                            name="adminEmail"
                            label="Correo Electrónico"
                            rules={[
                                { required: true, message: 'Ingresa el correo' },
                                { type: 'email', message: 'Correo inválido' }
                            ]}
                        >
                            <Input placeholder="admin@negocio.com" />
                        </Form.Item>
                    </div>
                    <Form.Item
                        name="adminPassword"
                        label="Contraseña"
                        rules={[
                            { required: true, message: 'Ingresa la contraseña' },
                            { min: 6, message: 'Mínimo 6 caracteres' }
                        ]}
                    >
                        <Input.Password placeholder="Mínimo 6 caracteres" />
                    </Form.Item>

                    <Divider orientation="left" orientationMargin={0} className="text-xs text-gray-500">Plan Inicial</Divider>
                    <Form.Item name="planId" label="Plan" rules={[{ required: true, message: 'Selecciona un plan' }]}>
                        <Select placeholder="Elige un plan..." optionLabelProp="label" dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}>
                            {publicPlans.map(plan => (
                                <Option key={plan.id} value={plan.id} label={plan.name}>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="font-semibold">{plan.name}</span>
                                        <span className="text-emerald-600 text-sm">
                                            ${plan.price} / {plan.duration_months} mes(es)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 pb-1">
                                        {plan.modules?.map(m => <Tag key={m} color={MODULE_COLORS[m]} style={{ fontSize: '10px', lineHeight: '16px' }}>{m}</Tag>)}
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => { setIsCreateBusinessModalVisible(false); createBusinessForm.resetFields(); }}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<ShopOutlined />} style={{ backgroundColor: PRIMARY_COLOR }}>
                            Crear Negocio
                        </Button>
                    </div>
                </Form>
            </Modal>
        </Content>
    );
}

export default DashboardClients;
