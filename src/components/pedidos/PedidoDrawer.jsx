import React, { useState, useEffect, useMemo } from 'react';
import {
    Drawer, Button, Select, InputNumber, Typography, message,
    Space, Avatar, Input, Tag, Spin, Empty, Divider,
} from 'antd';
import {
    ShoppingCartOutlined, UserOutlined, PlusOutlined,
    DeleteOutlined, SearchOutlined, UserAddOutlined,
    CloseCircleOutlined, SaveOutlined, ShopOutlined,
    FileTextOutlined,
} from '@ant-design/icons';

import { getInventario } from '../../services/inventario/inventarioService';
import { getPersonas } from '../../services/person/personaService';
import { createPedido, updatePedido, getPedidoById } from '../../services/pedido/pedidoService';
import PersonaFormDrawer from '../personas/PersonaFormDrawer';
import useCurrency from '../../hooks/useCurrency';
import useIsMobile from '../../hooks/useIsMobile';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SECTION = ({ icon, title, children }) => (
    <div style={{
        background: '#fff', padding: 20, borderRadius: 8,
        border: '1px solid #e8e8e8', marginBottom: 14,
    }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 14 }}>{icon} {title}</Title>
        {children}
    </div>
);

const PedidoDrawer = ({ open, onClose, onSuccess, orderIdToEdit }) => {
    const formatCurrency = useCurrency();
    const isMobile = useIsMobile();

    const [inventario, setInventario] = useState([]);
    const [loadingInventario, setLoadingInventario] = useState(false);
    const [saving, setSaving] = useState(false);

    // ── Cliente ───────────────────────────────────────────────
    const [personaSearch, setPersonaSearch] = useState('');
    const [personas, setPersonas] = useState([]);
    const [loadingPersonas, setLoadingPersonas] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);

    // ── Productos (carrito) ───────────────────────────────────
    const [items, setItems] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidadInput, setCantidadInput] = useState(1);

    // ── Observaciones ─────────────────────────────────────────
    const [observaciones, setObservaciones] = useState('');

    const total = useMemo(
        () => items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0),
        [items]
    );

    // ── Cargar inventario ─────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        setLoadingInventario(true);
        getInventario()
            .then(data => setInventario(Array.isArray(data) ? data : []))
            .catch(() => message.error('No se pudo cargar el inventario.'))
            .finally(() => setLoadingInventario(false));
    }, [open]);

    // ── Reset / cargar pedido al abrir ───────────────────────
    useEffect(() => {
        if (!open) {
            setItems([]);
            setSelectedPersona(null);
            setPersonaSearch('');
            setPersonas([]);
            setObservaciones('');
            setProductoSeleccionado(null);
            setCantidadInput(1);
            return;
        }

        if (orderIdToEdit) {
            getPedidoById(orderIdToEdit)
                .then(data => {
                    const pedido = data.pedido || data;
                    const itemsData = data.items || [];

                    if (pedido.persona_id) {
                        setSelectedPersona({
                            id: pedido.persona_id,
                            nombre: pedido.cliente_nombre || '',
                            apellido: pedido.cliente_apellido || '',
                            tipo_documento: pedido.tipo_documento || '',
                            numero_documento: pedido.numero_documento || '',
                        });
                    }
                    setObservaciones(pedido.observaciones || '');
                    setItems(itemsData.map(i => ({
                        inventario_id: i.inventario_id,
                        nombre: i.producto_nombre || i.nombre,
                        precio_unitario: Number(i.precio_unitario || i.monto),
                        cantidad: Number(i.cantidad),
                    })));
                })
                .catch(() => message.error('Error cargando pedido'));
        }
    }, [open, orderIdToEdit]);

    // ── Búsqueda de personas con debounce ────────────────────
    useEffect(() => {
        if (personaSearch.length < 2) { setPersonas([]); return; }
        const t = setTimeout(async () => {
            setLoadingPersonas(true);
            try {
                const data = await getPersonas({ q: personaSearch });
                setPersonas(Array.isArray(data) ? data : (data?.personas || []));
            } catch { /* silencioso */ }
            finally { setLoadingPersonas(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [personaSearch]);

    const inventarioOptions = inventario.map(p => ({
        label: `${p.nombre} — ${formatCurrency(p.monto)}`,
        value: p.id,
    }));

    // ── Agregar producto al carrito ───────────────────────────
    const agregarProducto = () => {
        if (!productoSeleccionado) { message.warning('Selecciona un producto'); return; }
        const prod = inventario.find(p => p.id === productoSeleccionado);
        if (!prod) return;

        setItems(prev => {
            const existe = prev.find(i => i.inventario_id === prod.id);
            if (existe) {
                return prev.map(i =>
                    i.inventario_id === prod.id
                        ? { ...i, cantidad: i.cantidad + cantidadInput }
                        : i
                );
            }
            return [...prev, {
                inventario_id: prod.id,
                nombre: prod.nombre,
                precio_unitario: Number(prod.monto),
                cantidad: cantidadInput,
            }];
        });

        setProductoSeleccionado(null);
        setCantidadInput(1);
    };

    const cambiarCantidad = (inventario_id, nuevaCantidad) => {
        if (!nuevaCantidad || nuevaCantidad < 1) return;
        setItems(prev => prev.map(i =>
            i.inventario_id === inventario_id ? { ...i, cantidad: nuevaCantidad } : i
        ));
    };

    const eliminarItem = (inventario_id) => {
        setItems(prev => prev.filter(i => i.inventario_id !== inventario_id));
    };

    // ── Guardar ───────────────────────────────────────────────
    const handleGuardar = async () => {
        if (!selectedPersona) { message.warning('Selecciona un cliente'); return; }
        if (items.length === 0) { message.warning('Agrega al menos un producto'); return; }

        setSaving(true);
        try {
            const payload = {
                persona_id: selectedPersona.id,
                items: items.map(i => ({ inventario_id: i.inventario_id, cantidad: i.cantidad })),
                observaciones,
            };

            if (orderIdToEdit) {
                await updatePedido(orderIdToEdit, payload);
                message.success('Pedido actualizado correctamente');
            } else {
                await createPedido(payload);
                message.success('Pedido creado exitosamente');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            message.error(err.response?.data?.message || 'Error al guardar el pedido');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <ShoppingCartOutlined />
                        <Text strong>
                            {orderIdToEdit ? `Editar Pedido #${orderIdToEdit}` : 'Nuevo Pedido'}
                        </Text>
                    </Space>
                }
                placement="right"
                width={isMobile ? '100%' : 540}
                onClose={onClose}
                open={open}
                styles={{ body: { background: '#f5f5f5', padding: '18px' } }}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 0' }}>
                        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={handleGuardar}
                            style={{ background: '#155153' }}
                        >
                            {orderIdToEdit ? 'Actualizar Pedido' : 'Crear Pedido'}
                        </Button>
                    </div>
                }
            >

                {/* ── CLIENTE ──────────────────────────────────── */}
                <SECTION icon={<UserOutlined />} title="Cliente">
                    {selectedPersona ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: '#f0faf9', border: '2px solid #155153',
                            borderRadius: 8, padding: '10px 14px',
                        }}>
                            <Avatar style={{ background: '#155153', flexShrink: 0 }} icon={<UserOutlined />} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>
                                    {selectedPersona.nombre} {selectedPersona.apellido || ''}
                                </div>
                                {selectedPersona.numero_documento && (
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                        {selectedPersona.tipo_documento}: {selectedPersona.numero_documento}
                                    </div>
                                )}
                            </div>
                            <Button
                                type="text" size="small"
                                icon={<CloseCircleOutlined style={{ color: '#94a3b8' }} />}
                                onClick={() => setSelectedPersona(null)}
                            />
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <Input
                                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                                    placeholder="Buscar por nombre o documento..."
                                    value={personaSearch}
                                    onChange={e => setPersonaSearch(e.target.value)}
                                    allowClear
                                />
                                <Button
                                    icon={<UserAddOutlined />}
                                    onClick={() => setPersonaDrawerOpen(true)}
                                    style={{ flexShrink: 0, color: '#155153', borderColor: '#155153' }}
                                >
                                    Crear
                                </Button>
                            </div>

                            {loadingPersonas && (
                                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                    <Spin size="small" />
                                </div>
                            )}

                            {!loadingPersonas && personaSearch.length >= 2 && personas.length === 0 && (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    style={{ margin: '6px 0' }}
                                    description={
                                        <span style={{ fontSize: 12 }}>
                                            Sin resultados —{' '}
                                            <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: '#155153' }}>
                                                crear contacto
                                            </a>
                                        </span>
                                    }
                                />
                            )}

                            {personas.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                                    {personas.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => { setSelectedPersona(p); setPersonaSearch(''); setPersonas([]); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                                border: '1.5px solid #e5e7eb', background: '#fff',
                                                transition: 'border-color 0.12s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#155153'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                                        >
                                            <Avatar size="small" style={{ background: '#155153' }} icon={<UserOutlined />} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {p.nombre} {p.apellido || ''}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {p.tipo_documento}: {p.numero_documento}
                                                </div>
                                            </div>
                                            <Tag color={p.tipo === 'CLIENTE' ? 'green' : 'blue'} style={{ fontSize: 11 }}>
                                                {p.tipo}
                                            </Tag>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {personaSearch.length === 0 && (
                                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                    Escribe para buscar · Si no está,{' '}
                                    <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: '#155153' }}>
                                        créalo aquí
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </SECTION>

                {/* ── PRODUCTOS ────────────────────────────────── */}
                <SECTION icon={<ShopOutlined />} title="Productos">
                    {/* Fila de selección */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <Select
                            showSearch
                            placeholder={loadingInventario ? 'Cargando inventario...' : 'Buscar producto...'}
                            options={inventarioOptions}
                            loading={loadingInventario}
                            disabled={loadingInventario}
                            value={productoSeleccionado}
                            onChange={setProductoSeleccionado}
                            filterOption={(input, opt) =>
                                (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            style={{ flex: 1, minWidth: 0 }}
                        />
                        <InputNumber
                            min={1}
                            value={cantidadInput}
                            onChange={val => setCantidadInput(val || 1)}
                            style={{ width: 72 }}
                            placeholder="Cant."
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={agregarProducto}
                            style={{ background: '#155153', flexShrink: 0 }}
                        >
                            Agregar
                        </Button>
                    </div>

                    {/* Lista de items agregados */}
                    {items.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px 0', fontSize: 13 }}>
                            Aún no has agregado productos
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {items.map(item => (
                                    <div
                                        key={item.inventario_id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            background: '#f8fafc', border: '1px solid #e2e8f0',
                                            borderRadius: 8, padding: '10px 12px',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 600, fontSize: 13, color: '#1e293b',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {item.nombre}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                                {formatCurrency(item.precio_unitario)} c/u
                                                {' · '}
                                                <span style={{ fontWeight: 700, color: '#155153' }}>
                                                    {formatCurrency(item.precio_unitario * item.cantidad)}
                                                </span>
                                            </div>
                                        </div>
                                        <InputNumber
                                            min={1}
                                            value={item.cantidad}
                                            onChange={val => cambiarCantidad(item.inventario_id, val)}
                                            style={{ width: 72 }}
                                            size="small"
                                        />
                                        <Button
                                            type="text" danger size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => eliminarItem(item.inventario_id)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <Divider style={{ margin: '12px 0 8px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                                <Text style={{ color: '#64748b' }}>
                                    {items.length} {items.length === 1 ? 'producto' : 'productos'} ·{' '}
                                    {items.reduce((a, i) => a + i.cantidad, 0)} unidades
                                </Text>
                                <Text strong style={{ fontSize: 20, color: '#155153' }}>
                                    {formatCurrency(total)}
                                </Text>
                            </div>
                        </>
                    )}
                </SECTION>

                {/* ── OBSERVACIONES ────────────────────────────── */}
                <SECTION icon={<FileTextOutlined />} title="Observaciones">
                    <TextArea
                        placeholder="Instrucciones especiales, notas de entrega..."
                        rows={3}
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        maxLength={250}
                        showCount
                    />
                </SECTION>

            </Drawer>

            {/* ── SUB-DRAWER CREAR CONTACTO ──────────────────── */}
            <PersonaFormDrawer
                open={personaDrawerOpen}
                onClose={() => setPersonaDrawerOpen(false)}
                onSuccess={persona => { setSelectedPersona(persona); setPersonaDrawerOpen(false); }}
                defaultTipo="CLIENTE"
            />
        </>
    );
};

export default PedidoDrawer;
