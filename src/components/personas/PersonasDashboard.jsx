import React, { useState, useEffect, useCallback } from "react";
import {
    Typography,
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
    Table,
    Space,
    Row,
    Col,
    Divider,
    Statistic,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserAddOutlined,
    UserOutlined,
    ReloadOutlined,
    SearchOutlined,
    ContactsOutlined,
    ShopOutlined,
    MailOutlined,
    GlobalOutlined,
    CheckCircleOutlined,
    BulbOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    HistoryOutlined,
    DollarOutlined,
    ShoppingCartOutlined,
} from "@ant-design/icons";

import {
    getPersonas,
    createPersona,
    updatePersona,
    deletePersona,
    getPersonaVentas,
} from "../../services/person/personaService";
import useCurrency from "../../hooks/useCurrency";

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Paleta por tipo de contacto ───────────────────────────
const TIPO_CONFIG = {
    CLIENTE:   { bg: '#155153', tag: 'blue',   label: 'Cliente'   },
    PROVEEDOR: { bg: '#ea580c', tag: 'orange', label: 'Proveedor' },
    LEAD:      { bg: '#7c3aed', tag: 'purple', label: 'Lead'      },
    EMPLEADO:  { bg: '#0369a1', tag: 'cyan',   label: 'Empleado'  }, // compat. con registros viejos
};

// ─── Doc types según entidad ────────────────────────────────
const DOC_PERSONA  = ['CC', 'CE', 'TI', 'PASAPORTE'];
const DOC_EMPRESA  = ['NIT', 'RUC', 'RUT'];
const DOC_LABELS   = { CC: 'C.C.', CE: 'C.E.', TI: 'T.I.', PASAPORTE: 'Pasaporte', NIT: 'NIT', RUC: 'RUC', RUT: 'RUT' };

// ─── Botón toggle reutilizable ──────────────────────────────
const ToggleBtn = ({ active, onClick, icon, label, color = '#155153' }) => (
    <button
        type="button"
        onClick={onClick}
        style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            border: `1.5px solid ${active ? color : '#e5e7eb'}`,
            background: active ? `${color}12` : '#fafafa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            fontWeight: 600,
            fontSize: 13,
            color: active ? color : '#64748b',
            transition: 'all 0.15s ease',
            boxShadow: active ? `0 2px 8px ${color}22` : 'none',
            position: 'relative',
        }}
    >
        {icon}
        {label}
        {active && (
            <span style={{
                position: 'absolute', top: 4, right: 6,
                width: 7, height: 7, borderRadius: '50%',
                background: color,
            }} />
        )}
    </button>
);

// ─── Wrapper de campo con label ─────────────────────────────
const FieldLabel = ({ label, required, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: '#475569', marginBottom: 5,
        }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {children}
    </div>
);

// ───────────────────────────────────────────────────────────
function PersonasDashboard() {

    const formatCurrency = useCurrency();

    // ── ESTADOS GLOBALES ──
    const [items, setItems]           = useState([]);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem]   = useState(null);
    const [searchTerm, setSearchTerm]     = useState("");
    const [form] = Form.useForm();

    // ── ESTADOS DEL DRAWER ──
    const [entidadTipo, setEntidadTipo] = useState('PERSONA');  // 'PERSONA' | 'EMPRESA'
    const [tipoContacto, setTipoContacto] = useState('CLIENTE'); // 'CLIENTE' | 'PROVEEDOR' | 'LEAD'

    // ── ESTADOS HISTORIAL DE VENTAS ──
    const [ventasModalOpen, setVentasModalOpen]   = useState(false);
    const [ventasPersona, setVentasPersona]       = useState(null);
    const [ventasPedidos, setVentasPedidos]       = useState([]);
    const [ventasStats, setVentasStats]           = useState(null);
    const [loadingVentas, setLoadingVentas]       = useState(false);

    // ── CARGA DE DATOS ──
    const fetchPersonas = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPersonas(search ? { q: search } : {});
            setItems(data || []);
        } catch {
            setError("No se pudieron cargar los contactos.");
            notification.error({ message: "Error de conexión", description: "No pudimos conectar con el servidor." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

    // Debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => fetchPersonas(searchTerm), 500);
        return () => clearTimeout(t);
    }, [searchTerm, fetchPersonas]);

    // Inicializar formulario al abrir
    useEffect(() => {
        if (!isDrawerOpen) return;

        if (editingItem) {
            const isEmpresa = ['NIT', 'RUC', 'RUT'].includes(editingItem.tipo_documento);
            setEntidadTipo(isEmpresa ? 'EMPRESA' : 'PERSONA');
            setTipoContacto(editingItem.tipo || 'CLIENTE');
            form.setFieldsValue({
                nombre:           editingItem.nombre,
                apellido:         editingItem.apellido || '',
                tipo_documento:   editingItem.tipo_documento,
                numero_documento: editingItem.numero_documento,
                celular:          editingItem.celular || '',
                email:            editingItem.email || '',
                direccion:        editingItem.direccion || '',
                sitio_web:        editingItem.sitio_web || '',
            });
        } else {
            setEntidadTipo('PERSONA');
            setTipoContacto('CLIENTE');
            form.resetFields();
            form.setFieldsValue({ tipo_documento: 'CC' });
        }
    }, [isDrawerOpen, editingItem, form]);

    // ── CAMBIAR ENTIDAD ──
    const handleEntidadChange = (tipo) => {
        setEntidadTipo(tipo);
        // Resetear tipo_documento al default del nuevo tipo
        form.setFieldsValue({
            tipo_documento: tipo === 'EMPRESA' ? 'NIT' : 'CC',
            apellido: '',
        });
    };

    // ── MANEJADORES ──
    const handleOpenCreate  = () => { setEditingItem(null); setIsDrawerOpen(true); };
    const handleOpenEdit    = (item) => { setEditingItem(item); setIsDrawerOpen(true); };
    const handleCloseDrawer = () => { setIsDrawerOpen(false); setEditingItem(null); form.resetFields(); };

    const handleFormSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...values,
                tipo: tipoContacto,
                entidad_tipo: entidadTipo,
                // apellido solo aplica a personas
                apellido: entidadTipo === 'PERSONA' ? (values.apellido || '') : '',
            };

            if (editingItem) {
                await updatePersona(editingItem.id, payload);
                notification.success({ message: "Contacto actualizado correctamente" });
            } else {
                await createPersona(payload);
                notification.success({ message: "Contacto registrado exitosamente" });
            }
            handleCloseDrawer();
            fetchPersonas(searchTerm);
        } catch (err) {
            notification.error({
                message: "Operación fallida",
                description: err.response?.data?.message || "Ocurrió un error al guardar."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (item) => {
        Modal.confirm({
            title: `¿Eliminar a ${item.nombre}?`,
            content: "Si este contacto tiene registros asociados, no se podrá eliminar.",
            okText: "Eliminar",
            okType: "danger",
            cancelText: "Cancelar",
            onOk: async () => {
                try {
                    await deletePersona(item.id);
                    notification.success({ message: "Contacto eliminado" });
                    fetchPersonas(searchTerm);
                } catch (err) {
                    notification.error({
                        message: "No se pudo eliminar",
                        description: err.response?.data?.message || "El contacto tiene historiales activos."
                    });
                }
            },
        });
    };

    // ── VER VENTAS DE UN CONTACTO ──
    const handleVerVentas = async (persona) => {
        setVentasPersona(persona);
        setVentasModalOpen(true);
        setLoadingVentas(true);
        try {
            const data = await getPersonaVentas(persona.id);
            setVentasPedidos(data.pedidos || []);
            setVentasStats(data.stats || null);
        } catch {
            notification.error({ message: "No se pudo cargar el historial de ventas" });
        } finally {
            setLoadingVentas(false);
        }
    };

    const cfg = (tipo) => TIPO_CONFIG[tipo] || TIPO_CONFIG.CLIENTE;

    // ── COLUMNAS DE LA TABLA ──
    const columns = [
        {
            title: 'Nombre',
            key: 'nombre',
            render: (_, r) => (
                <div className="flex items-center gap-2">
                    <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: cfg(r.tipo).bg, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14, flexShrink: 0,
                    }}>
                        {r.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span className="font-semibold text-gray-800">
                            {r.nombre} {r.apellido || ''}
                        </span>
                        {r.email && (
                            <div className="text-xs text-gray-400">{r.email}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'Tipo',
            key: 'tipo',
            width: 110,
            render: (_, r) => {
                const c = cfg(r.tipo);
                return <Tag color={c.tag} className="text-[10px]">{c.label}</Tag>;
            },
            filters: [
                { text: 'Cliente', value: 'CLIENTE' },
                { text: 'Proveedor', value: 'PROVEEDOR' },
                { text: 'Lead', value: 'LEAD' },
            ],
            onFilter: (v, r) => r.tipo === v,
        },
        {
            title: 'Documento',
            key: 'documento',
            width: 180,
            render: (_, r) => (
                <span className="text-sm">
                    <span className="text-gray-400 mr-1">{r.tipo_documento}:</span>
                    <span className="text-gray-700 font-medium">{r.numero_documento}</span>
                </span>
            ),
        },
        {
            title: 'Teléfono',
            dataIndex: 'celular',
            key: 'celular',
            width: 140,
            render: v => v
                ? <span className="text-sm text-gray-600">{v}</span>
                : <span className="text-gray-300">—</span>,
        },
        {
            title: 'Dirección',
            dataIndex: 'direccion',
            key: 'direccion',
            width: 200,
            ellipsis: true,
            render: v => v
                ? <span className="text-sm text-gray-600">{v}</span>
                : <span className="text-gray-300">—</span>,
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 120,
            align: 'center',
            render: (_, r) => (
                <Space size={4}>
                    {r.tipo === 'CLIENTE' && (
                        <Tooltip title="Ver historial de ventas">
                            <Button size="small" icon={<HistoryOutlined />}
                                onClick={e => { e.stopPropagation(); handleVerVentas(r); }}
                                style={{ color: '#155153', borderColor: '#15515333' }} />
                        </Tooltip>
                    )}
                    <Tooltip title="Editar">
                        <Button size="small" icon={<EditOutlined />}
                            onClick={e => { e.stopPropagation(); handleOpenEdit(r); }}
                            style={{ color: '#155153', borderColor: '#15515333' }} />
                    </Tooltip>
                    <Tooltip title="Eliminar">
                        <Button size="small" danger icon={<DeleteOutlined />}
                            onClick={e => { e.stopPropagation(); handleDelete(r); }} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // ── RENDER ──
    return (
        <div className="p-6">

            {/* ── HEADER ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#155153]/10 flex items-center justify-center">
                        <ContactsOutlined className="text-[#155153] text-xl" />
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>Contactos</Title>
                        <Text type="secondary" className="text-xs">Clientes, Proveedores y Leads</Text>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Buscar por nombre o documento..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 rounded-lg"
                        allowClear
                    />
                    <Tooltip title="Recargar">
                        <Button icon={<ReloadOutlined />} onClick={() => fetchPersonas(searchTerm)} loading={loading} shape="circle" />
                    </Tooltip>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreate}
                        style={{ backgroundColor: '#155153', borderColor: '#155153' }}
                    >
                        Nuevo
                    </Button>
                </div>
            </div>

            {/* ── TABLA ── */}
            {error ? (
                <Alert message={error} type="error" showIcon />
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <Spin spinning={loading}>
                        <Table
                            dataSource={items}
                            columns={columns}
                            rowKey="id"
                            size="middle"
                            locale={{ emptyText: (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No se encontraron contactos registrados.">
                                    <Button type="primary" onClick={handleOpenCreate} style={{ background: '#155153' }}>
                                        Registrar el primero
                                    </Button>
                                </Empty>
                            )}}
                            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} de ${t}` }}
                            scroll={{ x: 800 }}
                        />
                    </Spin>
                </div>
            )}

            {/* ── MODAL HISTORIAL DE VENTAS ── */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(21,81,83,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <HistoryOutlined style={{ color: '#155153', fontSize: 18 }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, color: '#155153', lineHeight: 1.2 }}>
                                Historial de ventas
                            </div>
                            {ventasPersona && (
                                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
                                    {ventasPersona.nombre} {ventasPersona.apellido || ''}
                                </div>
                            )}
                        </div>
                    </div>
                }
                open={ventasModalOpen}
                onCancel={() => { setVentasModalOpen(false); setVentasPersona(null); setVentasPedidos([]); setVentasStats(null); }}
                footer={null}
                width={760}
                destroyOnClose
            >
                <Spin spinning={loadingVentas}>
                    {/* Stats resumen */}
                    {ventasStats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
                                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                    <DollarOutlined style={{ marginRight: 4 }} />Total comprado
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#155153' }}>
                                    {formatCurrency(ventasStats.total_gastado)}
                                </div>
                            </div>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px' }}>
                                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                    <ShoppingCartOutlined style={{ marginRight: 4 }} />Pedidos totales
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>
                                    {ventasStats.total_pedidos}
                                </div>
                            </div>
                            <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                    <CheckCircleOutlined style={{ marginRight: 4 }} />Entregados
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                                    {ventasStats.pedidos_entregados}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabla de pedidos */}
                    <Table
                        dataSource={ventasPedidos}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 8, showTotal: (t) => `${t} pedidos` }}
                        locale={{ emptyText: <Empty description="Este cliente no tiene ventas registradas" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        expandable={{
                            expandedRowRender: (record) => {
                                let items = [];
                                try { items = typeof record.items === 'string' ? JSON.parse(record.items) : (record.items || []); } catch { items = []; }
                                return (
                                    <Table
                                        dataSource={items}
                                        rowKey={(i, idx) => idx}
                                        size="small"
                                        pagination={false}
                                        columns={[
                                            { title: 'Producto', dataIndex: 'producto', ellipsis: true },
                                            { title: 'Cant.', dataIndex: 'cantidad', width: 60, align: 'center' },
                                            { title: 'Precio unit.', dataIndex: 'precio', width: 120, align: 'right', render: v => formatCurrency(v) },
                                            { title: 'Subtotal', dataIndex: 'subtotal', width: 120, align: 'right', render: v => <span style={{ fontWeight: 700, color: '#155153' }}>{formatCurrency(v)}</span> },
                                        ]}
                                        style={{ background: '#fafafa' }}
                                    />
                                );
                            },
                            rowExpandable: (record) => {
                                const items = typeof record.items === 'string' ? JSON.parse(record.items || '[]') : (record.items || []);
                                return items.length > 0;
                            },
                        }}
                        columns={[
                            {
                                title: '#',
                                dataIndex: 'id',
                                width: 60,
                                render: id => <span style={{ color: '#94a3b8', fontSize: 12 }}>#{id}</span>
                            },
                            {
                                title: 'Fecha',
                                dataIndex: 'created_at',
                                width: 110,
                                render: f => f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                            },
                            {
                                title: 'Estado',
                                dataIndex: 'estado',
                                width: 110,
                                render: estado => {
                                    const colores = { PENDIENTE: 'orange', ENTREGADO: 'green', ANULADO: 'red' };
                                    return <Tag color={colores[estado] || 'default'} style={{ fontWeight: 600, fontSize: 11 }}>{estado}</Tag>;
                                },
                            },
                            {
                                title: 'Total',
                                dataIndex: 'total',
                                align: 'right',
                                render: v => <span style={{ fontWeight: 800, color: '#155153' }}>{formatCurrency(v)}</span>,
                            },
                        ]}
                    />
                </Spin>
            </Modal>

            {/* ── DRAWER ── */}
            <Drawer
                title={
                    <div className="flex items-center gap-2" style={{ color: '#155153' }}>
                        {editingItem ? <UserOutlined /> : <UserAddOutlined />}
                        <span>{editingItem ? "Editar Contacto" : "Nuevo Contacto"}</span>
                    </div>
                }
                width={440}
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
                            icon={<CheckCircleOutlined />}
                            style={{ backgroundColor: '#155153', borderColor: '#155153' }}
                        >
                            {editingItem ? "Guardar Cambios" : "Registrar"}
                        </Button>
                    </div>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleFormSubmit} requiredMark={false}>

                    {/* ── 1. NOMBRE ── */}
                    <Form.Item
                        name="nombre"
                        label={<span className="text-xs font-semibold text-slate-500">Nombre {entidadTipo === 'EMPRESA' ? '/ Razón Social' : ''} <span className="text-red-400">*</span></span>}
                        rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                        style={{ marginBottom: 14 }}
                    >
                        <Input
                            size="large"
                            placeholder={entidadTipo === 'EMPRESA' ? 'Mi Empresa S.A.S.' : 'Juan David Pérez'}
                            prefix={entidadTipo === 'EMPRESA' ? <ShopOutlined className="text-gray-400" /> : <UserOutlined className="text-gray-400" />}
                        />
                    </Form.Item>

                    {/* ── 2. NÚMERO DE IDENTIFICACIÓN ── */}
                    <FieldLabel label="Número de identificación" required>
                        <Input.Group compact style={{ display: 'flex' }}>
                            <Form.Item name="tipo_documento" noStyle rules={[{ required: true }]}>
                                <Select size="large" style={{ width: 110, flexShrink: 0 }}>
                                    {(entidadTipo === 'EMPRESA' ? DOC_EMPRESA : DOC_PERSONA).map(d => (
                                        <Option key={d} value={d}>{DOC_LABELS[d]}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                name="numero_documento"
                                noStyle
                                rules={[
                                    { required: true, message: 'Requerido' },
                                    { min: 5, message: 'Mínimo 5 caracteres' },
                                ]}
                            >
                                <Input
                                    size="large"
                                    style={{ flex: 1 }}
                                    placeholder={entidadTipo === 'EMPRESA' ? '900.123.456-7' : '1090456789'}
                                />
                            </Form.Item>
                        </Input.Group>
                    </FieldLabel>

                    {/* ── 3. PERSONA / EMPRESA ── */}
                    <FieldLabel label="¿Persona o empresa?">
                        <div style={{ display: 'flex', gap: 10 }}>
                            <ToggleBtn
                                active={entidadTipo === 'PERSONA'}
                                onClick={() => handleEntidadChange('PERSONA')}
                                icon={<UserOutlined />}
                                label="Persona"
                            />
                            <ToggleBtn
                                active={entidadTipo === 'EMPRESA'}
                                onClick={() => handleEntidadChange('EMPRESA')}
                                icon={<ShopOutlined />}
                                label="Empresa"
                            />
                        </div>
                    </FieldLabel>

                    {/* Apellido solo para personas */}
                    {entidadTipo === 'PERSONA' && (
                        <Form.Item
                            name="apellido"
                            label={<span className="text-xs font-semibold text-slate-500">Apellidos</span>}
                            style={{ marginBottom: 14 }}
                        >
                            <Input size="large" placeholder="Ej: Pérez Rodríguez" />
                        </Form.Item>
                    )}

                    <Divider style={{ margin: '16px 0 18px' }} />

                    {/* ── 4. DATOS DE CONTACTO ── */}
                    <Form.Item
                        name="direccion"
                        label={<span className="text-xs font-semibold text-slate-500">Dirección</span>}
                        style={{ marginBottom: 14 }}
                    >
                        <Input
                            size="large"
                            prefix={<EnvironmentOutlined className="text-gray-400" />}
                            placeholder="Calle 123 # 45-67, Barrio..."
                        />
                    </Form.Item>

                    <Row gutter={12} style={{ marginBottom: 14 }}>
                        <Col span={12}>
                            <Form.Item
                                name="email"
                                label={<span className="text-xs font-semibold text-slate-500">Correo</span>}
                                rules={[{ type: 'email', message: 'Email inválido' }]}
                                style={{ marginBottom: 0 }}
                            >
                                <Input size="large" prefix={<MailOutlined className="text-gray-400" />} placeholder="correo@ejemplo.com" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="celular"
                                label={<span className="text-xs font-semibold text-slate-500">Teléfono</span>}
                                style={{ marginBottom: 0 }}
                            >
                                <Input size="large" prefix={<PhoneOutlined className="text-gray-400" />} placeholder="300 123 4567" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="sitio_web"
                        label={<span className="text-xs font-semibold text-slate-500">Sitio web</span>}
                        style={{ marginBottom: 0 }}
                    >
                        <Input size="large" prefix={<GlobalOutlined className="text-gray-400" />} placeholder="www.ejemplo.com" />
                    </Form.Item>

                    <Divider style={{ margin: '16px 0 18px' }} />

                    {/* ── 5. TIPO DE CONTACTO ── */}
                    <FieldLabel label="Tipo de contacto" required>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <ToggleBtn
                                active={tipoContacto === 'CLIENTE'}
                                onClick={() => setTipoContacto('CLIENTE')}
                                icon={<UserOutlined />}
                                label="Cliente"
                                color="#155153"
                            />
                            <ToggleBtn
                                active={tipoContacto === 'PROVEEDOR'}
                                onClick={() => setTipoContacto('PROVEEDOR')}
                                icon={<ShopOutlined />}
                                label="Proveedor"
                                color="#ea580c"
                            />
                            <ToggleBtn
                                active={tipoContacto === 'LEAD'}
                                onClick={() => setTipoContacto('LEAD')}
                                icon={<BulbOutlined />}
                                label="Lead"
                                color="#7c3aed"
                            />
                        </div>
                    </FieldLabel>

                </Form>
            </Drawer>

        </div>
    );
}

export default PersonasDashboard;
