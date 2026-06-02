import React, { useState, useEffect } from 'react';
import {
    Drawer, Form, Button, Input, Select, Typography, message,
    Row, Col, Statistic, Space, Dropdown, Menu,
    Avatar, Tag, Spin, Empty, InputNumber, Checkbox,
} from 'antd';
import {
    FileDoneOutlined, UserOutlined, ShoppingOutlined, WalletOutlined,
    EditOutlined, DownOutlined, FilePdfOutlined, SaveOutlined,
    SearchOutlined, UserAddOutlined, CloseCircleOutlined, PlusOutlined, CloseOutlined,
    MailOutlined,
} from '@ant-design/icons';

import { cuentaOptions } from '../options';
import { createIngreso, updateIngreso } from '../../../services/controlapos/posService';
import { getInventario } from '../../../services/inventario/inventarioService';
import { getPersonas } from '../../../services/person/personaService';
import PersonaFormDrawer from '../../personas/PersonaFormDrawer';
import { useCurrencyInput } from '../../../hooks/useCurrency';
import useIsMobile from '../../../hooks/useIsMobile';

const { Title, Text } = Typography;

// Backend académico (andesback) — donde viven los endpoints de certificados/carnets
const API_CERT_URL = import.meta.env.VITE_API_BACKEND;
const INTENSIDAD_HORARIA_DEFAULT = '10';

const SECTION = ({ icon, title, children }) => (
    <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e8e8e8', marginBottom: 14 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 14 }}>{icon} {title}</Title>
        {children}
    </div>
);

const HDR = { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' };

const emptyLine = () => ({ name: '', qty: 1 });

const IngresoDrawer = ({ open, onClose, onSuccess, userName, initialValues }) => {
    const { prefix: currPrefix } = useCurrencyInput();
    const isMobile = useIsMobile();
    const [form] = Form.useForm();
    const [inventario, setInventario]               = useState([]);
    const [loadingInventario, setLoadingInventario] = useState(false);
    const [saving, setSaving]                       = useState(false);
    const [lineItems, setLineItems]                 = useState([emptyLine()]);

    // ── Contacto ──────────────────────────────────────────────
    const [personaSearch, setPersonaSearch]         = useState('');
    const [personas, setPersonas]                   = useState([]);
    const [loadingPersonas, setLoadingPersonas]     = useState(false);
    const [selectedPersona, setSelectedPersona]     = useState(null);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);
    const [editingPersona, setEditingPersona]       = useState(null);

    // Abrir el sub-drawer en modo crear o editar
    const abrirCrearPersona = () => { setEditingPersona(null); setPersonaDrawerOpen(true); };
    const abrirEditarPersona = () => { setEditingPersona(selectedPersona); setPersonaDrawerOpen(true); };
    const cerrarPersonaDrawer = () => { setPersonaDrawerOpen(false); setEditingPersona(null); };

    // ── Envío de certificado por correo ───────────────────────
    const [enviarCorreo, setEnviarCorreo]           = useState(false);

    // Ítems seleccionados marcados con send_mail en el inventario
    const itemsConCorreo = lineItems.filter(li => {
        const inv = inventario.find(i => i.nombre === li.name);
        return li.name && inv?.send_mail === true;
    });
    const algunItemEnviaCorreo = itemsConCorreo.length > 0;
    const clienteTieneCorreo   = !!selectedPersona?.email;

    // Total derivado de las líneas
    const valorTotal = lineItems.reduce((sum, li) => {
        const inv = inventario.find(i => i.nombre === li.name);
        return sum + (li.name ? parseFloat(inv?.monto || 0) * (li.qty || 1) : 0);
    }, 0);

    // Sincronizar total al campo oculto del form
    useEffect(() => {
        form.setFieldsValue({ valor: valorTotal });
    }, [valorTotal]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cargar inventario ─────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        setLoadingInventario(true);
        getInventario()
            .then(data => setInventario(Array.isArray(data) ? data : []))
            .catch(() => message.error('No se pudo cargar el inventario.'))
            .finally(() => setLoadingInventario(false));
    }, [open]);

    // ── Reset / poblar al abrir ───────────────────────────────
    useEffect(() => {
        if (!open) return;
        setEnviarCorreo(false);
        if (!initialValues) {
            form.resetFields();
            form.setFieldsValue({ vendedor: userName, valor: 0 });
            setSelectedPersona(null);
            setPersonaSearch('');
            setPersonas([]);
            setLineItems([emptyLine()]);
        } else {
            form.setFieldsValue({ ...initialValues });
            setSelectedPersona(
                initialValues.persona_id
                    ? {
                        id: initialValues.persona_id,
                        nombre: initialValues.cliente_nombre || initialValues.nombre,
                        apellido: initialValues.cliente_apellido || initialValues.apellido,
                        tipo_documento: initialValues.cliente_tipo_doc,
                        numero_documento: initialValues.cliente_documento,
                    }
                    : null
            );
            // Reconstruir líneas desde items existentes
            if (Array.isArray(initialValues.items_detalle) && initialValues.items_detalle.length > 0) {
                setLineItems(initialValues.items_detalle.map(it => ({
                    name: it.descripcion || it.nombre_producto || '',
                    qty:  Number(it.cantidad) || 1,
                })));
            } else if (initialValues.producto) {
                const names = initialValues.producto.includes(',')
                    ? initialValues.producto.split(',').map(s => s.trim())
                    : [initialValues.producto];
                setLineItems(names.map(n => ({ name: n, qty: 1 })));
            } else {
                setLineItems([emptyLine()]);
            }
        }
    }, [open, initialValues, userName, form]);

    // ── Búsqueda de personas (debounce) ───────────────────────
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

    // ── Helpers de líneas ─────────────────────────────────────
    const setLine = (idx, patch) =>
        setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, ...patch } : li));

    const removeLine = (idx) =>
        setLineItems(prev => prev.filter((_, i) => i !== idx));

    const addLine = () =>
        setLineItems(prev => [...prev, emptyLine()]);

    // ── Envío de certificado + carnet por correo ──────────────
    const enviarDocumentosPorCorreo = async () => {
        const body = {
            nombre: `${selectedPersona.nombre} ${selectedPersona.apellido || ''}`.trim(),
            numeroDocumento: selectedPersona.numero_documento || '0',
            tipoDocumento: selectedPersona.tipo_documento || 'C.C.',
            intensidadHoraria: INTENSIDAD_HORARIA_DEFAULT,
            email: selectedPersona.email,
        };

        const res = await fetch(`${API_CERT_URL}/api/enviar-documentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            message.success(`Certificado y carnet enviados a ${selectedPersona.email}`);
        } else {
            message.warning('La venta se guardó, pero falló el envío de los documentos por correo.');
        }
    };

    // ── Guardar ───────────────────────────────────────────────
    const handleSave = async (generatePdf = false) => {
        const validLines = lineItems.filter(li => li.name);
        if (validLines.length === 0) {
            message.warning('Selecciona al menos un producto.');
            return;
        }
        try {
            const values = await form.validateFields();
            setSaving(true);

            const items = validLines.map(li => {
                const inv = inventario.find(i => i.nombre === li.name);
                return {
                    inventario_id:   inv?.id || null,
                    descripcion:     li.name,
                    cantidad:        li.qty || 1,
                    precio_unitario: parseFloat(inv?.monto || 0),
                };
            });

            const payload = {
                ...values,
                items,
                tipo: validLines.map(li => li.name),
                persona_id: selectedPersona?.id || null,
                vendedor: userName,
                ...(selectedPersona
                    ? {
                        nombre: selectedPersona.nombre,
                        apellido: selectedPersona.apellido || '',
                        numeroDeDocumento: selectedPersona.numero_documento || '0',
                        tipoDocumento: selectedPersona.tipo_documento || 'CC',
                    }
                    : {
                        nombre: 'Cliente',
                        apellido: 'General',
                        numeroDeDocumento: '0',
                        tipoDocumento: 'N/A',
                    }
                ),
            };
            delete payload.nombreCompleto;

            if (initialValues?._id) {
                await updateIngreso(initialValues._id, payload);
                message.success('Venta actualizada correctamente');
            } else {
                await createIngreso(payload);
                message.success('Venta registrada exitosamente');
            }

            // Envío de certificado + carnet por correo (si aplica y se marcó la opción)
            if (enviarCorreo && algunItemEnviaCorreo && clienteTieneCorreo) {
                try {
                    await enviarDocumentosPorCorreo();
                } catch (mailErr) {
                    console.error('Error enviando documentos por correo:', mailErr);
                    message.warning('La venta se guardó, pero no se pudieron enviar los documentos por correo.');
                }
            }

            if (generatePdf) message.info('Generando factura PDF...');
            onSuccess?.();
            onClose();
        } catch (err) {
            if (err.response?.data?.message) {
                message.error(`Error: ${err.response.data.message}`);
            } else if (!err.errorFields) {
                message.error('Ocurrió un error inesperado.');
            }
        } finally {
            setSaving(false);
        }
    };

    const menu = (
        <Menu onClick={() => handleSave(true)}>
            <Menu.Item key="1" icon={<FilePdfOutlined />}>Guardar y Generar Factura</Menu.Item>
        </Menu>
    );

    // Opciones del select inline (nombre visible en trigger, precio+tipo en dropdown)
    const invOpts = inventario.map(i => ({
        label: i.nombre,
        value: i.nombre,
        precio: parseFloat(i.monto || 0),
        tipo: i.tipo || 'producto',
    }));

    return (
        <>
            <Drawer
                title={
                    <Space>
                        {initialValues ? <EditOutlined /> : <FileDoneOutlined />}
                        <Text strong>{initialValues ? 'Editar Ingreso' : 'Registrar Nueva Venta'}</Text>
                    </Space>
                }
                placement="right"
                width={isMobile ? '100vw' : 520}
                onClose={onClose}
                open={open}
                closable={false}
                extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} />}
                rootStyle={isMobile ? { position: 'fixed', inset: 0 } : undefined}
                styles={{
                    body: { background: '#f5f5f5', padding: isMobile ? '14px' : '18px', overflowX: 'hidden' },
                    wrapper: isMobile ? { height: '100%', width: '100%' } : {},
                }}
                footer={
                    <div style={{ textAlign: 'right', padding: '10px 0' }}>
                        <Button onClick={onClose} style={{ marginRight: 8 }} disabled={saving}>Cancelar</Button>
                        <Dropdown.Button
                            type="primary"
                            loading={saving}
                            onClick={() => handleSave(false)}
                            overlay={menu}
                            icon={<DownOutlined />}
                            style={{ '--ant-color-primary': '#155153' }}
                        >
                            <SaveOutlined /> {initialValues ? 'Actualizar' : 'Guardar Venta'}
                        </Dropdown.Button>
                    </div>
                }
            >
                <Form form={form} layout="vertical">

                    {/* ── CONTACTO ─────────────────────────────── */}
                    <SECTION icon={<UserOutlined />} title="Contacto (opcional)">
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
                                    {selectedPersona.email && (
                                        <div style={{ fontSize: 12, color: '#64748b' }}>
                                            <MailOutlined style={{ marginRight: 4 }} />{selectedPersona.email}
                                        </div>
                                    )}
                                </div>
                                <Button type="text" size="small"
                                    icon={<EditOutlined style={{ color: '#155153' }} />}
                                    onClick={abrirEditarPersona}
                                    title="Editar contacto"
                                />
                                <Button type="text" size="small"
                                    icon={<CloseCircleOutlined style={{ color: '#94a3b8' }} />}
                                    onClick={() => setSelectedPersona(null)}
                                    title="Quitar contacto"
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
                                        onClick={abrirCrearPersona}
                                        style={{ flexShrink: 0, color: '#155153', borderColor: '#155153' }}
                                    >
                                        Crear
                                    </Button>
                                </div>

                                {loadingPersonas && <div style={{ textAlign: 'center', padding: '8px 0' }}><Spin size="small" /></div>}

                                {!loadingPersonas && personaSearch.length >= 2 && personas.length === 0 && (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        style={{ margin: '6px 0' }}
                                        description={
                                            <span style={{ fontSize: 12 }}>
                                                Sin resultados —{' '}
                                                <a onClick={abrirCrearPersona} style={{ color: '#155153' }}>crear contacto</a>
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
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre} {p.apellido || ''}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.tipo_documento}: {p.numero_documento}</div>
                                                </div>
                                                <Tag color={p.tipo === 'CLIENTE' ? 'green' : 'blue'} style={{ fontSize: 11 }}>{p.tipo}</Tag>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {personaSearch.length === 0 && (
                                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                        Escribe para buscar · Si no está,{' '}
                                        <a onClick={abrirCrearPersona} style={{ color: '#155153' }}>créalo aquí</a>
                                    </div>
                                )}
                            </>
                        )}
                    </SECTION>

                    {/* ── TABLA DE PRODUCTOS (tipo factura) ────── */}
                    <SECTION icon={<ShoppingOutlined />} title="Productos">

                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>

                            {/* Encabezado columnas */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 72px 82px 28px',
                                gap: 6,
                                background: '#f1f5f9',
                                padding: '6px 10px',
                                borderBottom: '1px solid #e5e7eb',
                            }}>
                                <span style={HDR}>Descripción</span>
                                <span style={{ ...HDR, textAlign: 'center' }}>Cant.</span>
                                <span style={{ ...HDR, textAlign: 'right' }}>Total</span>
                                <span />
                            </div>

                            {/* Filas de línea */}
                            {lineItems.map((li, idx) => {
                                const inv  = inventario.find(i => i.nombre === li.name);
                                const sub  = parseFloat(inv?.monto || 0) * (li.qty || 1);
                                const bajo = inv && inv.cantidad != null && inv.cantidad < (li.qty || 1);

                                return (
                                    <div key={idx} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 72px 82px 28px',
                                        gap: 6,
                                        alignItems: 'start',
                                        padding: '8px 10px',
                                        borderBottom: idx < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        background: idx % 2 === 0 ? '#fff' : '#fafafa',
                                    }}>

                                        {/* Descripción: select + precio unitario */}
                                        <div style={{ minWidth: 0 }}>
                                            <Select
                                                size="small"
                                                showSearch
                                                placeholder={loadingInventario ? 'Cargando...' : 'Producto…'}
                                                value={li.name || undefined}
                                                loading={loadingInventario}
                                                options={invOpts}
                                                filterOption={(input, opt) =>
                                                    (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                                optionRender={opt => (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.data.label}</span>
                                                        <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                                                            ${opt.data.precio?.toLocaleString('es-CO')}
                                                        </span>
                                                    </div>
                                                )}
                                                onChange={val => setLine(idx, { name: val })}
                                                style={{ width: '100%' }}
                                                dropdownStyle={{ minWidth: 240 }}
                                            />
                                            {/* Altura siempre reservada para no saltar el layout */}
                                            <div style={{ fontSize: 10, marginTop: 2, height: 13, lineHeight: '13px', overflow: 'hidden',
                                                color: bajo ? '#f59e0b' : '#94a3b8' }}>
                                                {li.name
                                                    ? inv?.tipo === 'servicio'
                                                        ? `$${parseFloat(inv.monto || 0).toLocaleString('es-CO')} c/u`
                                                        : `$${parseFloat(inv?.monto || 0).toLocaleString('es-CO')} c/u${bajo ? ` · stock: ${inv.cantidad}` : ''}`
                                                    : ' '}
                                            </div>
                                        </div>

                                        {/* Cantidad */}
                                        <InputNumber
                                            min={1}
                                            value={li.qty || 1}
                                            onChange={val => setLine(idx, { qty: val || 1 })}
                                            size="small"
                                            controls
                                            style={{ width: '100%' }}
                                        />

                                        {/* Total fila — marginTop para centrar con el select */}
                                        <div style={{
                                            fontSize: 12, fontWeight: 700, textAlign: 'right',
                                            color: li.name ? '#155153' : '#d1d5db',
                                            marginTop: 4,
                                        }}>
                                            {li.name ? `$${sub.toLocaleString('es-CO')}` : '—'}
                                        </div>

                                        {/* Eliminar fila */}
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CloseCircleOutlined />}
                                            onClick={() => removeLine(idx)}
                                            disabled={lineItems.length === 1}
                                            style={{ color: '#cbd5e1', padding: 0, minWidth: 'auto', marginTop: 2 }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Agregar línea */}
                        <Button
                            type="dashed"
                            block
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={addLine}
                            style={{ marginTop: 8, color: '#155153', borderColor: '#b2d8d8' }}
                        >
                            Agregar línea
                        </Button>
                    </SECTION>

                    {/* ── PAGO ─────────────────────────────────── */}
                    <SECTION icon={<WalletOutlined />} title="Detalles del Pago">
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Form.Item
                                    label="Cuenta de Destino"
                                    name="cuenta"
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Select size="large" placeholder="Ej: Nequi" options={cuentaOptions} style={{ width: '100%' }} />
                                </Form.Item>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <Statistic
                                    title="Total a Pagar"
                                    value={valorTotal}
                                    prefix={currPrefix}
                                    groupSeparator="."
                                    precision={0}
                                    valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                                />
                                <Form.Item name="valor" hidden><Input /></Form.Item>
                            </div>
                        </div>
                    </SECTION>

                    {/* ── ENVÍO DE CERTIFICADO POR CORREO ──────── */}
                    {algunItemEnviaCorreo && (
                        <SECTION icon={<MailOutlined />} title="Certificación">
                            <Checkbox
                                checked={enviarCorreo}
                                disabled={!clienteTieneCorreo}
                                onChange={e => setEnviarCorreo(e.target.checked)}
                            >
                                Enviar certificado y carnet al correo del cliente
                            </Checkbox>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                {clienteTieneCorreo ? (
                                    <span>Se enviarán a <Text strong>{selectedPersona.email}</Text> al guardar.</span>
                                ) : (
                                    <span style={{ color: '#d97706' }}>
                                        El cliente seleccionado no tiene correo. Edítalo o elige otro para habilitar el envío.
                                    </span>
                                )}
                            </div>
                        </SECTION>
                    )}

                    <Form.Item name="vendedor" hidden><Input /></Form.Item>
                </Form>
            </Drawer>

            {/* ── SUB-DRAWER CREAR / EDITAR CONTACTO ─────────── */}
            <PersonaFormDrawer
                open={personaDrawerOpen}
                onClose={cerrarPersonaDrawer}
                onSuccess={persona => {
                    // Al editar, conserva id/datos previos por si el backend devuelve parcial
                    setSelectedPersona(prev => editingPersona
                        ? { ...editingPersona, ...persona, id: persona?.id ?? editingPersona.id }
                        : persona);
                    cerrarPersonaDrawer();
                }}
                editingItem={editingPersona}
                defaultTipo="CLIENTE"
            />
        </>
    );
};

export default IngresoDrawer;
