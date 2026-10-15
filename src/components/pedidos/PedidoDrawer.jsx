import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Drawer, Button, Typography, message,
    Input, Spin, Empty, Divider,
} from 'antd';
import {
    UserOutlined, DeleteOutlined, UserAddOutlined, SearchOutlined,
    CloseCircleOutlined, ShopOutlined, FileTextOutlined, CloseOutlined,
} from '@ant-design/icons';

import { getInventario } from '../../services/inventario/inventarioService';
import { getPersonas } from '../../services/person/personaService';
import { createPedido, updatePedido, getPedidoById } from '../../services/pedido/pedidoService';
import PersonaFormDrawer from '../personas/PersonaFormDrawer';
import useCurrency from '../../hooks/useCurrency';
import useIsMobile from '../../hooks/useIsMobile';
import { BotonPrincipal, Circulo, Stepper, inicialDe } from '../Certificados/mobile/piezas';

const { Text } = Typography;
const { TextArea } = Input;

// Bloque del formulario (neutro: se lee en claro y en oscuro).
const SECTION = ({ icon, title, children }) => (
    <div style={{
        background: 'var(--qc-surface)', padding: 18, borderRadius: 20,
        border: '1px solid var(--qc-border)', marginBottom: 14,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {icon} {title}
        </div>
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
    // clienteInput: texto libre que escribe el usuario
    // selectedPersona: cliente asociado (vía @mención)
    const [clienteInput, setClienteInput] = useState('');
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [sugerencias, setSugerencias] = useState([]);
    const [loadingSugerencias, setLoadingSugerencias] = useState(false);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);
    const inputRef = useRef(null);

    // Modo @ activo cuando el texto empieza con @
    const mentionMode = clienteInput.startsWith('@');
    const mentionQuery = mentionMode ? clienteInput.slice(1) : '';

    // ── Productos (carrito) ───────────────────────────────────
    const [items, setItems] = useState([]);
    const [busquedaProducto, setBusquedaProducto] = useState('');

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
            setClienteInput('');
            setSugerencias([]);
            setObservaciones('');
            setBusquedaProducto('');
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
                        setClienteInput('');
                    } else if (pedido.cliente_nombre) {
                        setClienteInput(pedido.cliente_nombre);
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

    // ── Búsqueda de personas al escribir @ ──────────────────
    useEffect(() => {
        if (!mentionMode) { setSugerencias([]); return; }
        if (mentionQuery.length < 1) { setSugerencias([]); return; }

        const t = setTimeout(async () => {
            setLoadingSugerencias(true);
            try {
                const data = await getPersonas({ q: mentionQuery });
                setSugerencias(Array.isArray(data) ? data : (data?.personas || []));
            } catch { /* silencioso */ }
            finally { setLoadingSugerencias(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [clienteInput, mentionMode, mentionQuery]);

    const seleccionarPersona = (p) => {
        setSelectedPersona(p);
        setClienteInput('');
        setSugerencias([]);
    };

    const limpiarCliente = () => {
        setSelectedPersona(null);
        setClienteInput('');
        setSugerencias([]);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    // ── Tap en card del catálogo ──────────────────────────────
    const tocarProducto = (prod) => {
        setItems(prev => {
            const existe = prev.find(i => i.inventario_id === prod.id);
            if (existe) {
                return prev.map(i =>
                    i.inventario_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
                );
            }
            return [...prev, {
                inventario_id: prod.id,
                nombre: prod.nombre,
                precio_unitario: Number(prod.monto),
                cantidad: 1,
                imagen_url: prod.imagen_url || null,
            }];
        });
    };

    const productosFiltrados = inventario.filter(p =>
        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
    );
    const productosVisibles = busquedaProducto.trim()
        ? productosFiltrados
        : productosFiltrados.slice(0, 5);

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
        if (items.length === 0) { message.warning('Agrega al menos un producto'); return; }

        setSaving(true);
        try {
            const payload = {
                items: items.map(i => ({ inventario_id: i.inventario_id, cantidad: i.cantidad })),
                observaciones,
            };

            if (selectedPersona) {
                payload.persona_id = selectedPersona.id;
            } else if (clienteInput.trim()) {
                payload.cliente_nombre = clienteInput.trim();
            }

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

    // ── Nombre a mostrar en el chip de persona seleccionada ──
    const nombrePersona = selectedPersona
        ? `${selectedPersona.nombre} ${selectedPersona.apellido || ''}`.trim()
        : '';

    return (
        <>
            <Drawer
                title={<span style={{ fontSize: 17, fontWeight: 700 }}>{orderIdToEdit ? `Editar pedido #${orderIdToEdit}` : 'Nuevo pedido'}</span>}
                closable={false}
                extra={<Button type="text" shape="circle" icon={<CloseOutlined />} onClick={onClose} aria-label="Cerrar" />}
                placement="right"
                width={isMobile ? '100%' : 540}
                onClose={onClose}
                open={open}
                styles={{ body: { background: 'var(--qc-bg)', padding: '16px' } }}
                footer={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))' }}>
                        <Button onClick={onClose} disabled={saving} size="large" style={{ borderRadius: 14 }}>Cancelar</Button>
                        <BotonPrincipal onClick={handleGuardar} cargando={saving} style={{ flex: 1, height: 44, borderRadius: 14, fontSize: 15 }}>
                            {orderIdToEdit ? 'Guardar pedido' : 'Crear pedido'}{total > 0 ? ` · ${formatCurrency(total)}` : ''}
                        </BotonPrincipal>
                    </div>
                }
            >

                {/* ── CLIENTE ──────────────────────────────────── */}
                <SECTION icon={<UserOutlined />} title="Referencia (opcional)">

                    {/* Chip cuando hay persona seleccionada vía @ */}
                    {selectedPersona ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: 'var(--qc-relleno)', borderRadius: 16, padding: '10px 12px',
                        }}>
                            <Circulo size={38}>{inicialDe(nombrePersona)}</Circulo>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{nombrePersona}</div>
                                {selectedPersona.numero_documento && (
                                    <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>
                                        {selectedPersona.tipo_documento}: {selectedPersona.numero_documento}
                                    </div>
                                )}
                            </div>
                            <Button
                                type="text" size="small"
                                icon={<CloseCircleOutlined style={{ color: 'var(--qc-text-muted)' }} />}
                                onClick={limpiarCliente}
                            />
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            {/* Campo de texto libre + hint */}
                            <Input
                                ref={inputRef}
                                prefix={
                                    mentionMode
                                        ? <span style={{ color: 'var(--qc-text)', fontWeight: 700, fontSize: 14 }}>@</span>
                                        : <UserOutlined style={{ color: 'var(--qc-text-muted)' }} />
                                }
                                placeholder="Referencia o @ para buscar persona registrada..."
                                value={clienteInput}
                                onChange={e => setClienteInput(e.target.value)}
                                allowClear
                                suffix={
                                    !clienteInput && (
                                        <span style={{ fontSize: 11, color: 'var(--qc-text-muted)', userSelect: 'none' }}>
                                            @ para buscar
                                        </span>
                                    )
                                }
                            />

                            {/* Dropdown de sugerencias al escribir @ */}
                            {mentionMode && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
                                    borderRadius: '0 0 14px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                    zIndex: 100, marginTop: 2,
                                }}>
                                    {loadingSugerencias && (
                                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                            <Spin size="small" />
                                        </div>
                                    )}

                                    {!loadingSugerencias && mentionQuery.length >= 1 && sugerencias.length === 0 && (
                                        <div style={{ padding: '10px 14px' }}>
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                style={{ margin: '4px 0' }}
                                                description={
                                                    <span style={{ fontSize: 12 }}>
                                                        Sin resultados —{' '}
                                                        <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: 'var(--qc-text)', fontWeight: 600, textDecoration: 'underline' }}>
                                                            crear contacto
                                                        </a>
                                                    </span>
                                                }
                                            />
                                        </div>
                                    )}

                                    {!loadingSugerencias && mentionQuery.length < 1 && (
                                        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--qc-text-muted)' }}>
                                            Escribe el nombre a buscar...
                                        </div>
                                    )}

                                    {sugerencias.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => seleccionarPersona(p)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '9px 14px', cursor: 'pointer',
                                                borderTop: '1px solid var(--qc-border)',
                                                transition: 'background 0.1s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--qc-relleno)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Circulo size={30}>{inicialDe(p.nombre)}</Circulo>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {p.nombre} {p.apellido || ''}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--qc-text-muted)' }}>
                                                    {p.tipo_documento}: {p.numero_documento}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: 'var(--qc-relleno)', color: 'var(--qc-text-muted)' }}>
                                                {String(p.tipo || '').toLowerCase()}
                                            </span>
                                        </div>
                                    ))}

                                    {sugerencias.length > 0 && (
                                        <div
                                            style={{ padding: '8px 14px', borderTop: '1px solid var(--qc-border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--qc-text)', display: 'flex', alignItems: 'center', gap: 6 }}
                                            onClick={() => setPersonaDrawerOpen(true)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--qc-relleno)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <UserAddOutlined /> Crear nuevo contacto
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hint debajo del input */}
                    {!selectedPersona && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--qc-text-muted)' }}>
                            Escribe una referencia, o usa <strong>@</strong> para vincular a una persona registrada.
                        </div>
                    )}
                </SECTION>

                {/* ── PRODUCTOS ────────────────────────────────── */}
                <SECTION icon={<ShopOutlined />} title="Productos">

                    {/* Buscador */}
                    <Input
                        prefix={<SearchOutlined style={{ color: 'var(--qc-text-muted)' }} />}
                        placeholder="Buscar producto..."
                        value={busquedaProducto}
                        onChange={e => setBusquedaProducto(e.target.value)}
                        allowClear
                        style={{ marginBottom: 12 }}
                    />

                    {/* Catálogo en grid */}
                    {loadingInventario ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            maxHeight: 320,
                            overflowY: 'auto',
                            paddingRight: 2,
                        }}>
                            {productosVisibles.map(prod => {
                                const enCarrito = items.find(i => i.inventario_id === prod.id);
                                return (
                                    <div
                                        key={prod.id}
                                        onClick={() => tocarProducto(prod)}
                                        style={{
                                            position: 'relative',
                                            background: enCarrito ? 'var(--qc-relleno-fuerte)' : 'var(--qc-surface)',
                                            border: enCarrito ? '2px solid var(--qc-text)' : '1.5px solid var(--qc-border)',
                                            borderRadius: 16,
                                            padding: 8,
                                            cursor: 'pointer',
                                            transition: 'border-color 0.15s, transform 0.1s',
                                            userSelect: 'none',
                                        }}
                                        onMouseEnter={e => { if (!enCarrito) e.currentTarget.style.borderColor = 'var(--qc-text-muted)'; }}
                                        onMouseLeave={e => { if (!enCarrito) e.currentTarget.style.borderColor = 'var(--qc-border)'; }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        {/* Badge cantidad */}
                                        {enCarrito && (
                                            <div style={{
                                                position: 'absolute', top: 5, right: 5,
                                                background: 'var(--qc-text)', color: 'var(--qc-bg)',
                                                fontSize: 11, fontWeight: 700,
                                                width: 20, height: 20, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                                zIndex: 1,
                                            }}>
                                                {enCarrito.cantidad}
                                            </div>
                                        )}

                                        {/* Imagen o icono */}
                                        <div style={{
                                            aspectRatio: '1',
                                            background: 'var(--qc-relleno)',
                                            borderRadius: 11,
                                            marginBottom: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}>
                                            {prod.imagen_url
                                                ? <img src={prod.imagen_url} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--qc-text-muted)' }}>{inicialDe(prod.nombre)}</span>
                                            }
                                        </div>

                                        {/* Nombre */}
                                        <div style={{
                                            fontSize: 11.5, fontWeight: 600, color: 'var(--qc-text)',
                                            lineHeight: 1.3,
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            marginBottom: 3, minHeight: 28,
                                        }}>
                                            {prod.nombre}
                                        </div>

                                        {/* Precio */}
                                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--qc-text)' }}>
                                            {formatCurrency(prod.monto)}
                                        </div>
                                    </div>
                                );
                            })}
                            {productosFiltrados.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--qc-text-muted)', padding: '20px 0', fontSize: 13 }}>
                                    Sin productos
                                </div>
                            )}
                            {!busquedaProducto.trim() && productosFiltrados.length > 5 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', paddingTop: 4 }}>
                                    <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>
                                        +{productosFiltrados.length - 5} más — busca por nombre para filtrar
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Carrito */}
                    {items.length > 0 && (
                        <>
                            <Divider style={{ margin: '14px 0 10px' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {items.map(item => (
                                    <div
                                        key={item.inventario_id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            background: 'var(--qc-relleno)', borderRadius: 14, padding: '8px 8px 8px 12px',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.nombre}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>
                                                {formatCurrency(item.precio_unitario)} c/u · <span style={{ fontWeight: 700, color: 'var(--qc-text)' }}>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                                            </div>
                                        </div>
                                        <Stepper valor={item.cantidad} onCambiar={val => cambiarCantidad(item.inventario_id, val)} size={30} />
                                        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => eliminarItem(item.inventario_id)} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: '0 2px' }}>
                                <Text style={{ color: 'var(--qc-text-muted)', fontSize: 12.5 }}>
                                    {items.reduce((a, i) => a + i.cantidad, 0)} unidades
                                </Text>
                                <Text strong style={{ fontSize: 22, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>
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

            <PersonaFormDrawer
                open={personaDrawerOpen}
                onClose={() => setPersonaDrawerOpen(false)}
                onSuccess={persona => { seleccionarPersona(persona); setPersonaDrawerOpen(false); }}
                defaultTipo="CLIENTE"
            />
        </>
    );
};

export default PedidoDrawer;
