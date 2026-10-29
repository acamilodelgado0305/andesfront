import React, { useEffect } from 'react';
import { Drawer, Form, InputNumber, Input, Button, message } from 'antd';
import DatePicker from '../common/DatePicker';
import { CloseOutlined, InboxOutlined, WarningFilled } from '@ant-design/icons';
import dayjs from 'dayjs';

import { cuentaOptions } from '../Certificados/options';
import useCurrency, { useCurrencyInput } from '../../hooks/useCurrency';
import { restockInventario } from '../../services/inventario/inventarioService';
import useIsMobile from '../../hooks/useIsMobile';
import { BotonPrincipal, ChipOpcion, COLOR_SIGNO } from '../Certificados/mobile/piezas';

// Rótulo + campo (neutro: se lee en claro y en oscuro).
const FL = ({ label, hint, children }) => (
    <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
            {label}
        </div>
        {children}
        {hint && <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
);

// Cuenta de pago como chips (campo de Form: recibe value/onChange).
const CuentaChips = ({ value, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cuentaOptions.map((c) => (
            <ChipOpcion key={c.value} activo={value === c.value} onClick={() => onChange?.(c.value)}>{c.label}</ChipOpcion>
        ))}
    </div>
);

const RestockDrawer = ({ open, onClose, onSuccess, producto }) => {
    const [form] = Form.useForm();
    const isMobile = useIsMobile();
    const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser, precision: currPrecision, step: currStep } = useCurrencyInput();
    const fmt = useCurrency();

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

    const bajo = producto && Number(producto.stock_minimo) > 0 && Number(producto.cantidad ?? 0) <= Number(producto.stock_minimo);

    return (
        <Drawer
            title={<span style={{ fontSize: 17, fontWeight: 700 }}>Registrar compra</span>}
            placement="right"
            width={isMobile ? '100vw' : 420}
            open={open}
            onClose={onClose}
            destroyOnClose
            closable={false}
            extra={<Button type="text" shape="circle" icon={<CloseOutlined />} onClick={onClose} aria-label="Cerrar" />}
            rootStyle={isMobile ? { position: 'fixed', inset: 0 } : undefined}
            styles={{
                body: { padding: isMobile ? 16 : 24, overflowX: 'hidden' },
                wrapper: isMobile ? { height: '100%', width: '100%' } : {},
            }}
            footer={
                <div style={{ display: 'flex', gap: 8, padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))' }}>
                    <Button onClick={onClose} size="large" style={{ borderRadius: 14 }}>Cancelar</Button>
                    <BotonPrincipal onClick={handleSave} style={{ flex: 1, height: 44, borderRadius: 14, fontSize: 15 }}>
                        {conCosto ? 'Registrar compra' : 'Agregar stock'}
                    </BotonPrincipal>
                </div>
            }
        >
            <Form form={form} layout="vertical" requiredMark={false}>

                {/* Info del producto */}
                {producto && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 18,
                        borderRadius: 18, background: 'var(--qc-relleno)',
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                            background: 'var(--qc-relleno-fuerte)', color: 'var(--qc-text)', fontSize: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {producto.imagen_url
                                ? <img src={producto.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <InboxOutlined />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--qc-text)' }}>{producto.nombre}</div>
                            <div style={{ fontSize: 13, color: bajo ? COLOR_SIGNO.gasto : 'var(--qc-text-muted)', marginTop: 2 }}>
                                {bajo && <WarningFilled />} Stock actual {producto.cantidad ?? 0}
                                {producto.stock_minimo > 0 && ` · mínimo ${producto.stock_minimo}`}
                            </div>
                        </div>
                    </div>
                )}

                <FL label="Unidades a agregar">
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

                <FL label="Precio unitario de compra" hint="Déjalo en 0 para sumar stock sin registrar un gasto.">
                    <Form.Item name="precio_unitario_compra" noStyle>
                        <InputNumber
                            size="large"
                            min={0}
                            style={{ width: '100%' }}
                            addonAfter={currSuffix}
                            formatter={currFormatter}
                            parser={currParser}
                            precision={currPrecision}
                            step={currStep}
                            placeholder="0"
                        />
                    </Form.Item>
                </FL>

                {/* Qué pasa al guardar */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 16, marginBottom: 18,
                    border: '1px solid var(--qc-border)', background: 'var(--qc-surface)',
                    fontSize: 13.5, color: 'var(--qc-text-muted)',
                }}>
                    {conCosto ? (
                        <>
                            <span>Se registra como gasto</span>
                            <b style={{ fontSize: 16, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(valorTotal)}</b>
                        </>
                    ) : (
                        <span>Solo se suma al stock, sin gasto.</span>
                    )}
                </div>

                {/* Pago: solo si hay costo */}
                {conCosto && (
                    <>
                        <FL label="Pagado desde">
                            <Form.Item name="cuenta" noStyle rules={[{ required: true, message: 'Elige la cuenta' }]}>
                                <CuentaChips />
                            </Form.Item>
                        </FL>

                        <FL label="Fecha de compra">
                            <Form.Item name="fecha" noStyle rules={[{ required: true, message: 'Requerida' }]}>
                                <DatePicker
                                    size="large"
                                    format="DD/MM/YYYY"
                                    inputReadOnly={isMobile}
                                    style={{ width: '100%' }}
                                    disabledDate={c => c && c > dayjs().endOf('day')}
                                />
                            </Form.Item>
                        </FL>

                        <FL label="Descripción (opcional)">
                            <Form.Item name="descripcion" noStyle>
                                <Input size="large" placeholder={`Compra de inventario: ${producto?.nombre || ''}`} />
                            </Form.Item>
                        </FL>
                    </>
                )}

            </Form>
        </Drawer>
    );
};

export default RestockDrawer;
