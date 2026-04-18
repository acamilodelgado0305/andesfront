import React, { useEffect } from 'react';
import {
    Drawer, Form, InputNumber, Select, DatePicker,
    Button, Typography, Space, Tag, message,
} from 'antd';
import {
    ShoppingCartOutlined, SaveOutlined, InboxOutlined,
    CheckCircleOutlined, DollarCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { cuentaOptions } from '../Certificados/options';
import { useCurrencyInput } from '../../hooks/useCurrency';
import { restockInventario } from '../../services/inventario/inventarioService';
import useIsMobile from '../../hooks/useIsMobile';

const { Text } = Typography;

const FL = ({ label, required, hint, children }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
        {children}
        {hint && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{hint}</div>}
    </div>
);

const RestockDrawer = ({ open, onClose, onSuccess, producto }) => {
    const [form] = Form.useForm();
    const isMobile = useIsMobile();
    const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser } = useCurrencyInput();

    const cantidad   = Form.useWatch('cantidad_a_agregar', form) || 0;
    const precioUnit = Form.useWatch('precio_unitario_compra', form) || 0;
    const valorTotal = cantidad * precioUnit;
    const conCosto   = valorTotal > 0;

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        form.setFieldsValue({
            fecha: dayjs(),
            precio_unitario_compra: producto?.precio_compra_unitario || 0,
        });
    }, [open, producto, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const res = await restockInventario(producto.id, {
                ...values,
                fecha: values.fecha?.toISOString(),
            });
            message.success(res.message || `+${values.cantidad_a_agregar} unidades agregadas`);
            onSuccess?.();
            onClose();
        } catch (err) {
            if (!err.errorFields) {
                message.error(err.response?.data?.message || 'Error al registrar.');
            }
        }
    };

    return (
        <Drawer
            title={
                <Space>
                    <ShoppingCartOutlined style={{ color: '#155153' }} />
                    <Text strong>Registrar Compra</Text>
                </Space>
            }
            placement="right"
            width={isMobile ? '100%' : 420}
            open={open}
            onClose={onClose}
            destroyOnClose
            styles={{ body: { background: '#f9fafb', padding: 24 } }}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 0' }}>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        style={{ background: '#155153', borderColor: '#155153' }}
                    >
                        {conCosto ? 'Registrar Compra' : 'Agregar Stock'}
                    </Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" requiredMark={false}>

                {/* Info del producto */}
                {producto && (
                    <div style={{
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                        padding: '14px 16px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: '#ecfdf5', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 20, flexShrink: 0,
                        }}>
                            <InboxOutlined style={{ color: '#059669' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                                {producto.nombre}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                Stock actual:{' '}
                                <Tag color={producto.stock_bajo ? 'red' : 'green'} style={{ fontSize: 11 }}>
                                    {producto.cantidad ?? 0} und
                                </Tag>
                                {producto.stock_minimo > 0 && (
                                    <span style={{ color: '#9ca3af' }}>· mín {producto.stock_minimo}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Cantidad */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                    <FL label="Unidades a agregar" required>
                        <Form.Item
                            name="cantidad_a_agregar"
                            noStyle
                            rules={[
                                { required: true, message: 'Ingresa la cantidad' },
                                { type: 'number', min: 1, message: 'Debe ser mayor a 0' },
                            ]}
                        >
                            <InputNumber size="large" min={1} style={{ width: '100%' }} placeholder="Ej: 10" />
                        </Form.Item>
                    </FL>

                    <FL
                        label="Precio unitario de compra"
                        hint="Déjalo en 0 para agregar stock sin registrar un gasto"
                    >
                        <Form.Item name="precio_unitario_compra" noStyle>
                            <InputNumber
                                size="large"
                                min={0}
                                style={{ width: '100%' }}
                                addonAfter={currSuffix}
                                formatter={currFormatter}
                                parser={currParser}
                                placeholder="0"
                            />
                        </Form.Item>
                    </FL>

                    {/* Indicador dinámico */}
                    <div style={{
                        borderRadius: 8, padding: '10px 14px', marginTop: 4,
                        background: conCosto ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${conCosto ? '#bbf7d0' : '#e2e8f0'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        {conCosto ? (
                            <>
                                <Space size={6}>
                                    <DollarCircleOutlined style={{ color: '#166534' }} />
                                    <Text style={{ fontSize: 13, color: '#166534' }}>Se registrará un egreso</Text>
                                </Space>
                                <Text strong style={{ fontSize: 15, color: '#166534' }}>
                                    ${valorTotal.toLocaleString('es-CO')}
                                </Text>
                            </>
                        ) : (
                            <Space size={6}>
                                <CheckCircleOutlined style={{ color: '#64748b' }} />
                                <Text style={{ fontSize: 13, color: '#64748b' }}>Solo se actualizará el stock, sin egreso</Text>
                            </Space>
                        )}
                    </div>
                </div>

                {/* Pago — solo visible si hay costo */}
                {conCosto && (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                        <FL label="Cuenta de pago" required>
                            <Form.Item name="cuenta" noStyle rules={[{ required: true, message: 'Selecciona la cuenta' }]}>
                                <Select size="large" options={cuentaOptions} style={{ width: '100%' }} placeholder="Seleccionar" />
                            </Form.Item>
                        </FL>

                        <FL label="Fecha de compra" required>
                            <Form.Item name="fecha" noStyle rules={[{ required: true, message: 'Requerida' }]}>
                                <DatePicker
                                    size="large"
                                    format="DD/MM/YYYY"
                                    style={{ width: '100%' }}
                                    disabledDate={c => c && c > dayjs().endOf('day')}
                                />
                            </Form.Item>
                        </FL>

                        <FL label="Descripción (opcional)">
                            <Form.Item name="descripcion" noStyle>
                                <input
                                    style={{
                                        width: '100%', padding: '8px 12px', fontSize: 14,
                                        border: '1px solid #d9d9d9', borderRadius: 6,
                                        outline: 'none', boxSizing: 'border-box',
                                    }}
                                    placeholder={`Compra de inventario: ${producto?.nombre || ''}`}
                                    onChange={e => form.setFieldValue('descripcion', e.target.value)}
                                />
                            </Form.Item>
                        </FL>
                    </div>
                )}

            </Form>
        </Drawer>
    );
};

export default RestockDrawer;
