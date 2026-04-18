import React, { useState, useEffect } from 'react';
import {
    Drawer, Form, Button, Input, Select, Typography, message,
    Row, Col, Statistic, Space, Dropdown, Menu,
    Avatar, Tag, Spin, Empty,
} from 'antd';
import {
    FileDoneOutlined, UserOutlined, ShoppingOutlined, WalletOutlined,
    EditOutlined, DownOutlined, FilePdfOutlined, SaveOutlined,
    SearchOutlined, UserAddOutlined, CloseCircleOutlined,
} from '@ant-design/icons';

import { cuentaOptions } from '../options';
import { createIngreso, updateIngreso } from '../../../services/controlapos/posService';
import { getInventario } from '../../../services/inventario/inventarioService';
import { getPersonas } from '../../../services/person/personaService';
import PersonaFormDrawer from '../../personas/PersonaFormDrawer';
import { useCurrencyInput } from '../../../hooks/useCurrency';

const { Title, Text } = Typography;

const SECTION = ({ icon, title, children }) => (
    <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e8e8e8', marginBottom: 14 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 14 }}>{icon} {title}</Title>
        {children}
    </div>
);

const IngresoDrawer = ({ open, onClose, onSuccess, userName, initialValues }) => {
    const { prefix: currPrefix } = useCurrencyInput();
    const [form] = Form.useForm();
    const [inventario, setInventario]               = useState([]);
    const [loadingInventario, setLoadingInventario] = useState(false);
    const [saving, setSaving]                       = useState(false);

    // ── Contacto ──────────────────────────────────────────────
    const [personaSearch, setPersonaSearch]         = useState('');
    const [personas, setPersonas]                   = useState([]);
    const [loadingPersonas, setLoadingPersonas]     = useState(false);
    const [selectedPersona, setSelectedPersona]     = useState(null);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);

    const valorTotal = Form.useWatch('valor', form) || 0;

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
        if (!initialValues) {
            form.resetFields();
            form.setFieldsValue({ vendedor: userName, valor: 0 });
            setSelectedPersona(null);
            setPersonaSearch('');
            setPersonas([]);
        } else {
            // Modo edición
            let tipoValue = initialValues.producto;
            if (typeof tipoValue === 'string' && tipoValue.includes(',')) {
                tipoValue = tipoValue.split(',').map(s => s.trim());
            } else if (typeof tipoValue === 'string') {
                tipoValue = [tipoValue];
            }
            form.setFieldsValue({ ...initialValues, tipo: tipoValue });
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

    // ── Cálculo automático del total ──────────────────────────
    const handleValuesChange = (changed, all) => {
        if (changed.tipo !== undefined) {
            const selected = Array.isArray(all.tipo) ? all.tipo : [all.tipo];
            const total = selected.reduce((sum, name) => {
                const item = inventario.find(i => i.nombre === name);
                return sum + (item ? parseFloat(item.monto || 0) : 0);
            }, 0);
            form.setFieldsValue({ valor: total });
        }
    };

    const inventarioOptions = inventario.map(i => ({
        label: `${i.nombre} — ($${parseFloat(i.monto || 0).toLocaleString('es-CO')})`,
        value: i.nombre,
    }));

    // ── Guardar ───────────────────────────────────────────────
    const handleSave = async (generatePdf = false) => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload = {
                ...values,
                persona_id: selectedPersona?.id || null,
                vendedor: userName,
                // legado para compatibilidad
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
                width={520}
                onClose={onClose}
                open={open}
                styles={{ body: { background: '#f5f5f5', padding: '18px' } }}
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
                <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>

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
                                </div>
                                <Button type="text" size="small"
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

                                {loadingPersonas && <div style={{ textAlign: 'center', padding: '8px 0' }}><Spin size="small" /></div>}

                                {!loadingPersonas && personaSearch.length >= 2 && personas.length === 0 && (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        style={{ margin: '6px 0' }}
                                        description={
                                            <span style={{ fontSize: 12 }}>
                                                Sin resultados —{' '}
                                                <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: '#155153' }}>crear contacto</a>
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
                                        <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: '#155153' }}>créalo aquí</a>
                                    </div>
                                )}
                            </>
                        )}
                    </SECTION>

                    {/* ── PRODUCTOS ────────────────────────────── */}
                    <SECTION icon={<ShoppingOutlined />} title="Selecciona los Productos">
                        <Form.Item
                            name="tipo"
                            rules={[{ required: true, message: 'Seleccione al menos un producto' }]}
                            style={{ marginBottom: 0 }}
                        >
                            <Select
                                mode="multiple"
                                size="large"
                                placeholder={loadingInventario ? 'Cargando inventario...' : 'Buscar productos...'}
                                options={inventarioOptions}
                                loading={loadingInventario}
                                disabled={loadingInventario}
                                showSearch
                                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </SECTION>

                    {/* ── PAGO ─────────────────────────────────── */}
                    <SECTION icon={<WalletOutlined />} title="Detalles del Pago">
                        <Row gutter={16} align="middle">
                            <Col span={12}>
                                <Form.Item
                                    label="Cuenta de Destino"
                                    name="cuenta"
                                    rules={[{ required: true, message: 'Requerido' }]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Select size="large" placeholder="Ej: Nequi" options={cuentaOptions} />
                                </Form.Item>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Statistic
                                    title="Total a Pagar"
                                    value={valorTotal}
                                    prefix={currPrefix}
                                    groupSeparator="."
                                    precision={0}
                                    valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                                />
                                <Form.Item name="valor" hidden><Input /></Form.Item>
                            </Col>
                        </Row>
                    </SECTION>

                    <Form.Item name="vendedor" hidden><Input /></Form.Item>
                </Form>
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

export default IngresoDrawer;
