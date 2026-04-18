import React, { useState, useEffect } from 'react';
import {
    Drawer, Form, Input, Select, Button, Row, Col, Divider, notification,
} from 'antd';
import {
    UserOutlined, UserAddOutlined, ShopOutlined, MailOutlined,
    GlobalOutlined, PhoneOutlined, EnvironmentOutlined, CheckCircleOutlined, BulbOutlined,
} from '@ant-design/icons';

import { createPersona, updatePersona } from '../../services/person/personaService';
import useIsMobile from '../../hooks/useIsMobile';

const { Option } = Select;

const DOC_PERSONA = ['CC', 'CE', 'TI', 'PASAPORTE'];
const DOC_EMPRESA = ['NIT', 'RUC', 'RUT'];
const DOC_LABELS  = { CC: 'C.C.', CE: 'C.E.', TI: 'T.I.', PASAPORTE: 'Pasaporte', NIT: 'NIT', RUC: 'RUC', RUT: 'RUT' };

const ToggleBtn = ({ active, onClick, icon, label, color = '#155153' }) => (
    <button
        type="button"
        onClick={onClick}
        style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: `1.5px solid ${active ? color : '#e5e7eb'}`,
            background: active ? `${color}12` : '#fafafa',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 7, fontWeight: 600, fontSize: 13,
            color: active ? color : '#64748b', transition: 'all 0.15s ease',
            position: 'relative',
        }}
    >
        {icon}{label}
        {active && <span style={{ position: 'absolute', top: 4, right: 6, width: 7, height: 7, borderRadius: '50%', background: color }} />}
    </button>
);

const FieldLabel = ({ label, required, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {children}
    </div>
);

/**
 * Drawer reutilizable para crear/editar una persona.
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   onSuccess   – (persona) => void
 *   editingItem – objeto persona para edición (null = crear)
 *   defaultTipo – 'CLIENTE' | 'PROVEEDOR' | 'LEAD'
 */
const PersonaFormDrawer = ({ open, onClose, onSuccess, editingItem = null, defaultTipo = 'CLIENTE' }) => {
    const [form] = Form.useForm();
    const isMobile = useIsMobile();
    const [submitting, setSubmitting]      = useState(false);
    const [entidadTipo, setEntidadTipo]    = useState('PERSONA');
    const [tipoContacto, setTipoContacto] = useState(defaultTipo);

    useEffect(() => {
        if (!open) return;
        if (editingItem) {
            const isEmpresa = ['NIT', 'RUC', 'RUT'].includes(editingItem.tipo_documento);
            setEntidadTipo(isEmpresa ? 'EMPRESA' : 'PERSONA');
            setTipoContacto(editingItem.tipo || defaultTipo);
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
            setTipoContacto(defaultTipo);
            form.resetFields();
            form.setFieldsValue({ tipo_documento: 'CC' });
        }
    }, [open, editingItem, defaultTipo, form]);

    const handleEntidadChange = (tipo) => {
        setEntidadTipo(tipo);
        form.setFieldsValue({ tipo_documento: tipo === 'EMPRESA' ? 'NIT' : 'CC', apellido: '' });
    };

    const handleFinish = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                tipo: tipoContacto,
                entidad_tipo: entidadTipo,
                apellido: entidadTipo === 'PERSONA' ? (values.apellido || '') : '',
            };
            let result;
            if (editingItem) {
                result = await updatePersona(editingItem.id, payload);
                notification.success({ message: 'Contacto actualizado' });
            } else {
                result = await createPersona(payload);
                notification.success({ message: 'Contacto registrado' });
            }
            onSuccess?.(result?.data || result?.persona || result || { ...payload });
            onClose();
        } catch (err) {
            notification.error({
                message: 'Error al guardar',
                description: err.response?.data?.message || 'Ocurrió un error.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#155153' }}>
                    {editingItem ? <UserOutlined /> : <UserAddOutlined />}
                    <span>{editingItem ? 'Editar Contacto' : 'Nuevo Contacto'}</span>
                </div>
            }
            width={isMobile ? '100%' : 440}
            open={open}
            onClose={onClose}
            destroyOnClose
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        icon={<CheckCircleOutlined />}
                        onClick={() => form.submit()}
                        style={{ background: '#155153', borderColor: '#155153' }}
                    >
                        {editingItem ? 'Guardar Cambios' : 'Registrar'}
                    </Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>

                {/* Nombre */}
                <Form.Item
                    name="nombre"
                    label={<span className="text-xs font-semibold text-slate-500">
                        Nombre {entidadTipo === 'EMPRESA' ? '/ Razón Social' : ''} <span style={{ color: '#ef4444' }}>*</span>
                    </span>}
                    rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                    style={{ marginBottom: 14 }}
                >
                    <Input
                        size="large"
                        placeholder={entidadTipo === 'EMPRESA' ? 'Mi Empresa S.A.S.' : 'Juan David'}
                        prefix={entidadTipo === 'EMPRESA'
                            ? <ShopOutlined className="text-gray-400" />
                            : <UserOutlined className="text-gray-400" />}
                    />
                </Form.Item>

                {/* Apellido — solo personas, justo debajo de nombre */}
                {entidadTipo === 'PERSONA' && (
                    <Form.Item
                        name="apellido"
                        label={<span className="text-xs font-semibold text-slate-500">Apellidos</span>}
                        style={{ marginBottom: 14 }}
                    >
                        <Input size="large" placeholder="Pérez Rodríguez" />
                    </Form.Item>
                )}

                {/* Documento */}
                <FieldLabel label="Número de identificación">
                    <Input.Group compact style={{ display: 'flex' }}>
                        <Form.Item name="tipo_documento" noStyle>
                            <Select size="large" style={{ width: 110, flexShrink: 0 }}>
                                {(entidadTipo === 'EMPRESA' ? DOC_EMPRESA : DOC_PERSONA).map(d => (
                                    <Option key={d} value={d}>{DOC_LABELS[d]}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="numero_documento" noStyle>
                            <Input
                                size="large"
                                style={{ flex: 1 }}
                                placeholder={entidadTipo === 'EMPRESA' ? '900.123.456-7' : '1090456789'}
                            />
                        </Form.Item>
                    </Input.Group>
                </FieldLabel>

                {/* Persona / Empresa */}
                <FieldLabel label="¿Persona o empresa?">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <ToggleBtn active={entidadTipo === 'PERSONA'} onClick={() => handleEntidadChange('PERSONA')} icon={<UserOutlined />} label="Persona" />
                        <ToggleBtn active={entidadTipo === 'EMPRESA'} onClick={() => handleEntidadChange('EMPRESA')} icon={<ShopOutlined />} label="Empresa" />
                    </div>
                </FieldLabel>

                <Divider style={{ margin: '16px 0 18px' }} />

                {/* Dirección */}
                <Form.Item
                    name="direccion"
                    label={<span className="text-xs font-semibold text-slate-500">Dirección</span>}
                    style={{ marginBottom: 14 }}
                >
                    <Input size="large" prefix={<EnvironmentOutlined className="text-gray-400" />} placeholder="Calle 123 # 45-67, Barrio..." />
                </Form.Item>

                {/* Email + Teléfono */}
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

                {/* Sitio web */}
                <Form.Item
                    name="sitio_web"
                    label={<span className="text-xs font-semibold text-slate-500">Sitio web</span>}
                    style={{ marginBottom: 0 }}
                >
                    <Input size="large" prefix={<GlobalOutlined className="text-gray-400" />} placeholder="www.ejemplo.com" />
                </Form.Item>

                <Divider style={{ margin: '16px 0 18px' }} />

                {/* Tipo de contacto */}
                <FieldLabel label="Tipo de contacto" required>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <ToggleBtn active={tipoContacto === 'CLIENTE'}   onClick={() => setTipoContacto('CLIENTE')}   icon={<UserOutlined />}  label="Cliente"   color="#155153" />
                        <ToggleBtn active={tipoContacto === 'PROVEEDOR'} onClick={() => setTipoContacto('PROVEEDOR')} icon={<ShopOutlined />}  label="Proveedor" color="#ea580c" />
                        <ToggleBtn active={tipoContacto === 'LEAD'}      onClick={() => setTipoContacto('LEAD')}      icon={<BulbOutlined />}  label="Lead"      color="#7c3aed" />
                    </div>
                </FieldLabel>

            </Form>
        </Drawer>
    );
};

export default PersonaFormDrawer;
