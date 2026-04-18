import React, { useEffect, useState } from 'react';
import {
    Drawer, Form, Button, Input, Select, DatePicker,
    Typography, Space, Row, Col, Divider, Avatar,
    Tag, Spin, Empty, message, InputNumber,
} from 'antd';
import {
    EditOutlined, FileProtectOutlined, SaveOutlined,
    CalendarOutlined, DollarCircleOutlined, UserOutlined,
    SearchOutlined, UserAddOutlined, CloseCircleOutlined,
    CheckCircleOutlined, ShopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { cuentaOptions } from '../options';
import { useCurrencyInput } from '../../../hooks/useCurrency';
import { createEgreso, updateEgreso } from '../../../services/controlapos/posService';
import { getPersonas } from '../../../services/person/personaService';
import PersonaFormDrawer from '../../personas/PersonaFormDrawer';

const { Text } = Typography;

const FL = ({ label, required, children }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
        {children}
    </div>
);

const EgresoDrawer = ({ open, onClose, onSuccess, userName, initialValues }) => {
    const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser } = useCurrencyInput();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    // ── Contacto proveedor ────────────────────────────────────
    const [personaSearch, setPersonaSearch]         = useState('');
    const [personas, setPersonas]                   = useState([]);
    const [loadingPersonas, setLoadingPersonas]     = useState(false);
    const [selectedPersona, setSelectedPersona]     = useState(null);
    const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);

    // ── Reset al abrir ────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        if (initialValues) {
            form.setFieldsValue({
                ...initialValues,
                fecha: initialValues.fecha ? dayjs(initialValues.fecha) : dayjs(),
                valor: Number(initialValues.valor) || 0,
            });
            setSelectedPersona(
                initialValues.persona_id
                    ? {
                        id: initialValues.persona_id,
                        nombre: initialValues.proveedor_nombre || '',
                        apellido: initialValues.proveedor_apellido || '',
                        tipo: 'PROVEEDOR',
                    }
                    : null
            );
        } else {
            form.resetFields();
            form.setFieldsValue({ vendedor: userName, fecha: dayjs(), cuenta: 'Nequi', valor: 0 });
            setSelectedPersona(null);
            setPersonaSearch('');
            setPersonas([]);
        }
    }, [open, initialValues, form, userName]);

    // ── Búsqueda de proveedores (debounce) ────────────────────
    useEffect(() => {
        if (personaSearch.length < 2) { setPersonas([]); return; }
        const t = setTimeout(async () => {
            setLoadingPersonas(true);
            try {
                const data = await getPersonas({ q: personaSearch, tipo: 'PROVEEDOR' });
                const list = Array.isArray(data) ? data : (data?.personas || []);
                // filtrar solo proveedores en caso que el backend no lo haga
                setPersonas(list.filter(p => p.tipo === 'PROVEEDOR'));
            } catch { /* silencioso */ }
            finally { setLoadingPersonas(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [personaSearch]);

    // ── Guardar ───────────────────────────────────────────────
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload = {
                ...values,
                fecha: values.fecha ? values.fecha.toISOString() : new Date().toISOString(),
                valor: Number(values.valor),
                persona_id: selectedPersona?.id || null,
                vendedor: userName,
            };

            if (initialValues?._id) {
                await updateEgreso(initialValues._id, payload);
                message.success('Egreso actualizado correctamente');
            } else {
                await createEgreso(payload);
                message.success('Egreso registrado exitosamente');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            if (!err.errorFields) message.error('Error al guardar el egreso.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Drawer
                title={
                    <Space>
                        {initialValues ? <EditOutlined /> : <FileProtectOutlined />}
                        <Text strong>{initialValues ? 'Editar Egreso' : 'Registrar Gasto'}</Text>
                    </Space>
                }
                placement="right"
                width={500}
                onClose={onClose}
                open={open}
                destroyOnClose
                styles={{ body: { background: '#f9fafb', padding: '24px' } }}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 0' }}>
                        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                        <Button
                            type="primary"
                            danger
                            loading={saving}
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                        >
                            {initialValues ? 'Actualizar' : 'Guardar Gasto'}
                        </Button>
                    </div>
                }
            >
                <Form form={form} layout="vertical" requiredMark={false}>

                    {/* ── CONTACTO PROVEEDOR ──────────────────── */}
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <ShopOutlined style={{ color: '#ea580c' }} />
                            <Text strong style={{ fontSize: 13, color: '#1e293b' }}>Proveedor (opcional)</Text>
                        </div>

                        {selectedPersona ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: '#fff7ed', border: '2px solid #ea580c',
                                borderRadius: 8, padding: '10px 14px',
                            }}>
                                <Avatar style={{ background: '#ea580c', flexShrink: 0 }} icon={<ShopOutlined />} />
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
                                        placeholder="Buscar proveedor por nombre..."
                                        value={personaSearch}
                                        onChange={e => setPersonaSearch(e.target.value)}
                                        allowClear
                                    />
                                    <Button
                                        icon={<UserAddOutlined />}
                                        onClick={() => setPersonaDrawerOpen(true)}
                                        style={{ flexShrink: 0, color: '#ea580c', borderColor: '#ea580c' }}
                                    >
                                        Crear
                                    </Button>
                                </div>

                                {loadingPersonas && (
                                    <div style={{ textAlign: 'center', padding: '8px 0' }}><Spin size="small" /></div>
                                )}

                                {!loadingPersonas && personaSearch.length >= 2 && personas.length === 0 && (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        style={{ margin: '6px 0' }}
                                        description={
                                            <span style={{ fontSize: 12 }}>
                                                Sin proveedores —{' '}
                                                <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: '#ea580c' }}>crear proveedor</a>
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
                                                onMouseEnter={e => e.currentTarget.style.borderColor = '#ea580c'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                                            >
                                                <Avatar size="small" style={{ background: '#ea580c' }} icon={<ShopOutlined />} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre} {p.apellido || ''}</div>
                                                    {p.numero_documento && (
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.tipo_documento}: {p.numero_documento}</div>
                                                    )}
                                                </div>
                                                <Tag color="orange" style={{ fontSize: 11 }}>Proveedor</Tag>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {personaSearch.length === 0 && (
                                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                        Escribe para buscar · Si no está,{' '}
                                        <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: '#ea580c' }}>créalo aquí</a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── DETALLES DEL GASTO ──────────────────── */}
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <CalendarOutlined style={{ color: '#155153' }} />
                            <Text strong style={{ fontSize: 13, color: '#1e293b' }}>Detalles del Gasto</Text>
                        </div>

                        <FL label="Descripción / Motivo" required>
                            <Form.Item name="descripcion" noStyle rules={[{ required: true, message: 'La descripción es requerida' }]}>
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Ej: Pago de servicios, compra de insumos..."
                                    style={{ borderRadius: 8 }}
                                />
                            </Form.Item>
                        </FL>

                        <FL label="Fecha" required>
                            <Form.Item name="fecha" noStyle rules={[{ required: true, message: 'Requerida' }]}>
                                <DatePicker
                                    size="large"
                                    format="DD/MM/YYYY"
                                    style={{ width: '100%', borderRadius: 8 }}
                                    disabledDate={c => c && c > dayjs().endOf('day')}
                                />
                            </Form.Item>
                        </FL>
                    </div>

                    {/* ── MONTO Y CUENTA ──────────────────────── */}
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <DollarCircleOutlined style={{ color: '#155153' }} />
                            <Text strong style={{ fontSize: 13, color: '#1e293b' }}>Monto</Text>
                        </div>

                        <Row gutter={12}>
                            <Col span={13}>
                                <FL label="Valor del gasto" required>
                                    <Form.Item name="valor" noStyle rules={[{ required: true, message: 'Requerido' }]}>
                                        <InputNumber
                                            size="large"
                                            style={{ width: '100%' }}
                                            min={0}
                                            placeholder="0"
                                            addonAfter={currSuffix}
                                            formatter={currFormatter}
                                            parser={currParser}
                                        />
                                    </Form.Item>
                                </FL>
                            </Col>
                            <Col span={11}>
                                <FL label="Cuenta de salida" required>
                                    <Form.Item name="cuenta" noStyle rules={[{ required: true, message: 'Requerida' }]}>
                                        <Select
                                            size="large"
                                            placeholder="Seleccionar"
                                            options={cuentaOptions}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </FL>
                            </Col>
                        </Row>
                    </div>

                    <Form.Item name="vendedor" hidden><Input /></Form.Item>
                </Form>
            </Drawer>

            {/* ── SUB-DRAWER CREAR PROVEEDOR ────────────────── */}
            <PersonaFormDrawer
                open={personaDrawerOpen}
                onClose={() => setPersonaDrawerOpen(false)}
                onSuccess={persona => { setSelectedPersona(persona); setPersonaDrawerOpen(false); }}
                defaultTipo="PROVEEDOR"
            />
        </>
    );
};

export default EgresoDrawer;
