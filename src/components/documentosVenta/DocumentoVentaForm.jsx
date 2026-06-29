import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer, Form, Input, InputNumber, Button, Select, DatePicker,
  Space, Typography, Tooltip, message, Tag, AutoComplete,
  Avatar, Spin, Empty,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, UserOutlined,
  FileTextOutlined, FileDoneOutlined,
  CalendarOutlined, SearchOutlined, UserAddOutlined, CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { createDocumentoVenta, updateDocumentoVenta } from '../../services/documentoVenta/documentoVentaService';
import { getPersonas } from '../../services/person/personaService';
import { getInventario } from '../../services/inventario/inventarioService';
import PersonaFormDrawer from '../personas/PersonaFormDrawer';
import FacturaViewer from './FacturaViewer';
import useCurrency from '../../hooks/useCurrency';

const { Text } = Typography;
const { TextArea } = Input;

// ─── Ítem vacío ───────────────────────────────────────────────────────────────
const itemVacio = () => ({
  key: Date.now() + Math.random(),
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  descuento: 0,
  impuesto: 0,
  total: 0,
});

const calcularTotalLinea = (item) => {
  const base    = Number(item.cantidad || 1) * Number(item.precio_unitario || 0);
  const dto     = base * (Number(item.descuento || 0) / 100);
  const baseDto = base - dto;
  const imp     = baseDto * (Number(item.impuesto || 0) / 100);
  return Math.round((baseDto + imp) * 100) / 100;
};

// ─── Input de descripción con @ ──────────────────────────────────────────────
const DescripcionInput = ({ item, inventario, onUpdate, formatCurrency }) => {
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);

  const handleChange = (val) => {
    onUpdate(item.key, 'descripcion', val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx !== -1) {
      const query = val.slice(atIdx + 1).toLowerCase();
      const filtered = inventario
        .filter((p) => p.nombre.toLowerCase().includes(query))
        .slice(0, 8)
        .map((p) => ({
          value: p.nombre,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontWeight: 500 }}>{p.nombre}</span>
              <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 600 }}>{formatCurrency(p.monto)}</span>
            </div>
          ),
          product: p,
        }));
      setOpts(filtered);
      setOpen(filtered.length > 0);
    } else {
      setOpts([]);
      setOpen(false);
    }
  };

  const handleSelect = (_, option) => {
    const prod = option.product;
    onUpdate(item.key, '_batch', {
      descripcion:     prod.nombre,
      precio_unitario: Number(prod.monto) || 0,
      inventario_id:   prod.id,
    });
    setOpts([]);
    setOpen(false);
  };

  return (
    <AutoComplete
      value={item.descripcion}
      options={opts}
      open={open}
      onChange={handleChange}
      onSelect={handleSelect}
      onBlur={() => setOpen(false)}
      style={{ width: '100%' }}
      dropdownStyle={{ minWidth: 280 }}
    >
      <Input placeholder="Descripción... escribe @ para buscar inventario" style={{ borderRadius: 6 }} />
    </AutoComplete>
  );
};

// ─── Formulario principal ─────────────────────────────────────────────────────
const DocumentoVentaForm = ({ open, onClose, onSaved, editingDoc, defaultTipo = 'COTIZACION' }) => {
  const formatCurrency = useCurrency();
  const [form] = Form.useForm();

  const [tipo, setTipo]       = useState(defaultTipo);
  const [items, setItems]     = useState([itemVacio()]);
  const [saving, setSaving]   = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc]   = useState(null);

  // ── Cliente ────────────────────────────────────────────────────────────────
  const [personaSearch, setPersonaSearch]         = useState('');
  const [personasResult, setPersonasResult]       = useState([]);
  const [loadingPersonas, setLoadingPersonas]     = useState(false);
  const [selectedPersona, setSelectedPersona]     = useState(null);
  const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);

  // ── Inventario ─────────────────────────────────────────────────────────────
  const [inventario, setInventario] = useState([]);

  // ─── Apertura / cierre ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setTipo('FACTURA');
    getInventario().then((d) => setInventario(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
    if (editingDoc) {
      rellenarFormulario(editingDoc);
    } else {
      form.resetFields();
      setItems([itemVacio()]);
      setSelectedPersona(null);
      setPersonaSearch('');
      setPersonasResult([]);
    }
  }, [open, editingDoc, defaultTipo]);

  // ─── Búsqueda de personas con debounce ───────────────────────────────────
  useEffect(() => {
    if (personaSearch.length < 2) { setPersonasResult([]); return; }
    const t = setTimeout(async () => {
      setLoadingPersonas(true);
      try {
        const data = await getPersonas({ q: personaSearch });
        setPersonasResult(Array.isArray(data) ? data : (data?.personas || []));
      } catch { /* silencioso */ }
      finally { setLoadingPersonas(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [personaSearch]);

  const rellenarFormulario = (doc) => {
    const parsed = Array.isArray(doc.items)
      ? doc.items
      : (typeof doc.items === 'string' ? JSON.parse(doc.items) : []);
    setItems(parsed.length ? parsed.map((it, i) => ({ ...it, key: i })) : [itemVacio()]);
    if (doc.persona_id) {
      setSelectedPersona({ id: doc.persona_id, nombre: doc.cliente_nombre || '', numero_documento: doc.cliente_identificacion || '' });
    }
    form.setFieldsValue({
      fecha_emision:          doc.fecha_emision        ? dayjs(doc.fecha_emision)        : dayjs(),
      fecha_vencimiento:      doc.fecha_vencimiento    ? dayjs(doc.fecha_vencimiento)    : null,
      cliente_nombre:         doc.cliente_nombre        || '',
      cliente_identificacion: doc.cliente_identificacion || '',
      cliente_email:          doc.cliente_email         || '',
      cliente_telefono:       doc.cliente_telefono      || '',
      notas:                  doc.notas                 || '',
      condiciones:            doc.condiciones           || '',
    });
  };

  // ─── Totales ──────────────────────────────────────────────────────────────
  const calcularTotales = useCallback((lista) => {
    let sub = 0, imp = 0;
    lista.forEach((it) => {
      const base    = Number(it.cantidad || 1) * Number(it.precio_unitario || 0);
      const dto     = base * (Number(it.descuento || 0) / 100);
      const baseDto = base - dto;
      sub += baseDto;
      imp += baseDto * (Number(it.impuesto || 0) / 100);
    });
    return {
      subtotal:         Math.round(sub * 100) / 100,
      descuento_global: 0,
      impuesto_total:   Math.round(imp * 100) / 100,
      total:            Math.round((sub + imp) * 100) / 100,
    };
  }, []);

  const totales = calcularTotales(items);

  // ─── Items ────────────────────────────────────────────────────────────────
  const agregarItem  = () => setItems((p) => [...p, itemVacio()]);
  const eliminarItem = (key) => items.length > 1 && setItems((p) => p.filter((it) => it.key !== key));

  const actualizarItem = (key, campo, valor) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        if (campo === '_batch') {
          const updated = { ...it, ...valor };
          updated.total = calcularTotalLinea(updated);
          return updated;
        }
        const updated = { ...it, [campo]: valor };
        updated.total = calcularTotalLinea(updated);
        return updated;
      })
    );
  };

  // ─── Preview ─────────────────────────────────────────────────────────────
  const handlePreview = () => {
    const values = form.getFieldsValue();
    const totales = calcularTotales(items);
    setPreviewDoc({
      numero:                 editingDoc?.numero || 'BORRADOR',
      tipo,
      estado:                 editingDoc?.estado || 'EMITIDA',
      persona_id:             selectedPersona?.id || null,
      cliente_nombre:         selectedPersona?.nombre || values.cliente_nombre || null,
      cliente_identificacion: selectedPersona?.numero_documento || values.cliente_identificacion || null,
      cliente_email:          values.cliente_email || null,
      cliente_telefono:       values.cliente_telefono || null,
      items,
      ...totales,
      notas:             values.notas || null,
      condiciones:       values.condiciones || null,
      fecha_emision:     values.fecha_emision     ? values.fecha_emision.format('YYYY-MM-DD')     : dayjs().format('YYYY-MM-DD'),
      fecha_vencimiento: values.fecha_vencimiento ? values.fecha_vencimiento.format('YYYY-MM-DD') : null,
    });
    setPreviewOpen(true);
  };

  // ─── Guardar ──────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const itemsLimpios = items.map(({ key, ...r }) => ({
        ...r,
        cantidad:        Number(r.cantidad        || 1),
        precio_unitario: Number(r.precio_unitario || 0),
        descuento:       Number(r.descuento       || 0),
        impuesto:        Number(r.impuesto        || 0),
        total:           Number(r.total           || 0),
      }));
      const payload = {
        tipo,
        persona_id:             selectedPersona?.id    || null,
        cliente_nombre:         selectedPersona?.nombre || values.cliente_nombre || null,
        cliente_identificacion: selectedPersona?.numero_documento || values.cliente_identificacion || null,
        cliente_email:          values.cliente_email          || null,
        cliente_telefono:       values.cliente_telefono       || null,
        items: itemsLimpios,
        ...calcularTotales(itemsLimpios),
        notas:             values.notas             || null,
        condiciones:       values.condiciones       || null,
        fecha_emision:     values.fecha_emision     ? values.fecha_emision.format('YYYY-MM-DD')     : null,
        fecha_vencimiento: values.fecha_vencimiento ? values.fecha_vencimiento.format('YYYY-MM-DD') : null,
      };
      if (editingDoc) {
        await updateDocumentoVenta(editingDoc.id, payload);
        message.success('Documento actualizado');
      } else {
        await createDocumentoVenta(payload);
        message.success(`${tipo === 'FACTURA' ? 'Factura' : 'Cotización'} creada`);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      if (err?.errorFields) return;
      message.error('Error al guardar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const isFactura   = tipo === 'FACTURA';
  const accentColor = isFactura ? '#1d4ed8' : '#7c3aed';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: isFactura ? '#eff6ff' : '#f5f3ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isFactura
                ? <FileDoneOutlined style={{ color: '#1d4ed8', fontSize: 16 }} />
                : <FileTextOutlined style={{ color: '#7c3aed', fontSize: 16 }} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                {editingDoc ? 'Editar' : 'Nueva'} {isFactura ? 'Factura' : 'Cotización'}
              </div>
              {editingDoc && (
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>{editingDoc.numero}</div>
              )}
            </div>
          </div>
        }
        placement="right"
        width={Math.min(window.innerWidth, 720)}
        open={open}
        onClose={onClose}
        maskClosable={false}
        styles={{ body: { padding: '20px 24px', background: 'var(--qc-bg)' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total:{' '}
              <strong style={{ color: accentColor, fontSize: 15 }}>
                {formatCurrency(totales.total)}
              </strong>
            </Text>
            <Space>
              <Button onClick={onClose}>Cancelar</Button>
              <Button icon={<EyeOutlined />} onClick={handlePreview}>
                Vista previa
              </Button>
              <Button
                type="primary" loading={saving} onClick={handleGuardar}
                style={{ background: accentColor, borderColor: accentColor }}
              >
                {editingDoc ? 'Guardar cambios' : `Crear ${isFactura ? 'Factura' : 'Cotización'}`}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" size="middle">


          {/* ── FECHAS ── */}
          <div style={{ background: 'var(--qc-surface)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid var(--qc-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <CalendarOutlined style={{ color: accentColor }} />
              <Text strong style={{ fontSize: 13 }}>Fechas</Text>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item label="Fecha emisión" name="fecha_emision" initialValue={dayjs()} style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item label="Fecha vencimiento" name="fecha_vencimiento" style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </div>
          </div>

          {/* ── CLIENTE ── */}
          <div style={{ background: 'var(--qc-surface)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid var(--qc-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserOutlined style={{ color: accentColor }} />
                <Text strong style={{ fontSize: 13 }}>Cliente</Text>
              </div>
            </div>

            {/* Persona seleccionada → tarjeta */}
            {selectedPersona ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: isFactura ? '#eff6ff' : '#f5f3ff',
                border: `2px solid ${accentColor}`,
                borderRadius: 10, padding: '10px 14px',
              }}>
                <Avatar style={{ background: accentColor, flexShrink: 0 }} icon={<UserOutlined />} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedPersona.nombre} {selectedPersona.apellido || ''}</div>
                  {selectedPersona.numero_documento && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {selectedPersona.tipo_documento ? `${selectedPersona.tipo_documento}: ` : ''}{selectedPersona.numero_documento}
                    </div>
                  )}
                  {selectedPersona.email && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>{selectedPersona.email}</div>
                  )}
                </div>
                <Button
                  type="text" size="small"
                  icon={<CloseCircleOutlined style={{ color: '#94a3b8' }} />}
                  onClick={() => {
                    setSelectedPersona(null);
                    setPersonaSearch('');
                    form.setFieldsValue({ cliente_email: '', cliente_telefono: '' });
                  }}
                />
              </div>
            ) : (
              <>
                {/* Barra de búsqueda + botón crear */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Buscar por nombre o documento..."
                    value={personaSearch}
                    onChange={(e) => setPersonaSearch(e.target.value)}
                    allowClear
                  />
                  <Button
                    icon={<UserAddOutlined />}
                    onClick={() => setPersonaDrawerOpen(true)}
                    style={{ flexShrink: 0, color: accentColor, borderColor: accentColor }}
                  >
                    Crear
                  </Button>
                </div>

                {/* Spinner */}
                {loadingPersonas && (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Spin size="small" />
                  </div>
                )}

                {/* Sin resultados */}
                {!loadingPersonas && personaSearch.length >= 2 && personasResult.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '6px 0' }}
                    description={
                      <span style={{ fontSize: 12 }}>
                        Sin resultados —{' '}
                        <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: accentColor }}>
                          crear contacto
                        </a>
                      </span>
                    }
                  />
                )}

                {/* Lista de resultados */}
                {personasResult.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {personasResult.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPersona(p);
                          setPersonaSearch('');
                          setPersonasResult([]);
                          form.setFieldsValue({
                            cliente_email:    p.email    || '',
                            cliente_telefono: p.celular  || '',
                          });
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '1.5px solid var(--qc-border)', background: 'var(--qc-surface)',
                          transition: 'border-color 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentColor)}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                      >
                        <Avatar size="small" style={{ background: accentColor }} icon={<UserOutlined />} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre} {p.apellido || ''}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {p.tipo_documento}: {p.numero_documento}
                          </div>
                        </div>
                        {p.tipo && (
                          <Tag color={p.tipo === 'CLIENTE' ? 'green' : 'blue'} style={{ fontSize: 11 }}>
                            {p.tipo}
                          </Tag>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hint cuando no se ha escrito nada */}
                {personaSearch.length === 0 && (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingTop: 2 }}>
                    Escribe para buscar · Si no está,{' '}
                    <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: accentColor }}>
                      créalo aquí
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Campos extra visibles siempre (email / teléfono) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <Form.Item label="Email" name="cliente_email" style={{ marginBottom: 0 }}>
                <Input placeholder="correo@empresa.com" />
              </Form.Item>
              <Form.Item label="Teléfono" name="cliente_telefono" style={{ marginBottom: 0 }}>
                <Input placeholder="300 123 4567" />
              </Form.Item>
            </div>
          </div>

          {/* ── ÍTEMS ── */}
          <div style={{ background: 'var(--qc-surface)', borderRadius: 12, border: '1px solid var(--qc-border)', marginBottom: 16, overflow: 'hidden' }}>

            {/* Header de la sección */}
            <div style={{
              padding: '14px 18px 12px',
              borderBottom: '1px solid var(--qc-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text strong style={{ fontSize: 13 }}>Productos / Servicios</Text>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(124,58,237,0.15)', borderRadius: 20,
                padding: '3px 10px', fontSize: 11, color: '#7c3aed',
              }}>
                <span style={{ fontWeight: 700 }}>@</span>
                <span>Escribe @ para buscar en inventario</span>
              </div>
            </div>

            {/* Cabecera columnas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 130px 64px 64px 110px 36px',
              gap: 6, padding: '8px 14px',
              background: 'var(--qc-bg)', borderBottom: '1px solid var(--qc-border)',
            }}>
              {['Descripción', 'Cant.', 'Precio unit.', 'Dto.%', 'IVA%', 'Total', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textAlign: i >= 2 ? 'right' : 'left' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Filas */}
            <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item) => (
                <div
                  key={item.key}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 72px 130px 64px 64px 110px 36px', gap: 6, alignItems: 'center' }}
                >
                  <DescripcionInput item={item} inventario={inventario} onUpdate={actualizarItem} formatCurrency={formatCurrency} />

                  <InputNumber min={1} style={{ width: '100%' }}
                    value={item.cantidad} onChange={(v) => actualizarItem(item.key, 'cantidad', v)} />

                  <InputNumber min={0} style={{ width: '100%' }}
                    value={item.precio_unitario}
                    formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                    onChange={(v) => actualizarItem(item.key, 'precio_unitario', v)} />

                  <InputNumber min={0} max={100} style={{ width: '100%' }}
                    value={item.descuento} suffix="%" onChange={(v) => actualizarItem(item.key, 'descuento', v)} />

                  <InputNumber min={0} max={100} style={{ width: '100%' }}
                    value={item.impuesto} suffix="%" onChange={(v) => actualizarItem(item.key, 'impuesto', v)} />

                  <div style={{ textAlign: 'right', fontWeight: 700, color: accentColor, fontSize: 13 }}>
                    {formatCurrency(item.total)}
                  </div>

                  <Tooltip title="Eliminar línea">
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}
                      onClick={() => eliminarItem(item.key)}
                      disabled={items.length === 1}
                      style={{ opacity: items.length === 1 ? 0.3 : 1 }} />
                  </Tooltip>
                </div>
              ))}
            </div>

            {/* Botón agregar */}
            <div style={{ padding: '8px 14px 14px' }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={agregarItem} block
                style={{ borderColor: '#d1d5db', color: '#6b7280', borderRadius: 8 }}>
                Agregar línea
              </Button>
            </div>

            {/* Totales */}
            <div style={{ borderTop: '1px solid var(--qc-border)', padding: '14px 18px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 280 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <Text type="secondary">Subtotal</Text>
                  <Text>{formatCurrency(totales.subtotal)}</Text>
                </div>
                {totales.impuesto_total > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <Text type="secondary">IVA</Text>
                    <Text>{formatCurrency(totales.impuesto_total)}</Text>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0 4px', marginTop: 4,
                  borderTop: `2px solid ${accentColor}`,
                }}>
                  <Text strong style={{ fontSize: 15 }}>Total</Text>
                  <Text strong style={{ fontSize: 17, color: accentColor }}>{formatCurrency(totales.total)}</Text>
                </div>
              </div>
            </div>
          </div>

          {/* ── NOTAS ── */}
          <div style={{ background: 'var(--qc-surface)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--qc-border)' }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>Notas y condiciones</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item label="Notas para el cliente" name="notas" style={{ marginBottom: 0 }}>
                <TextArea rows={3} placeholder="Observaciones, instrucciones de entrega..." />
              </Form.Item>
              <Form.Item label="Condiciones de pago" name="condiciones" style={{ marginBottom: 0 }}>
                <TextArea rows={3} placeholder="Ej: Pago a 30 días, 50% anticipado..." />
              </Form.Item>
            </div>
          </div>

        </Form>
      </Drawer>

      {/* ── Sub-drawer: crear contacto ── */}
      <PersonaFormDrawer
        open={personaDrawerOpen}
        onClose={() => setPersonaDrawerOpen(false)}
        onSuccess={(persona) => {
          setSelectedPersona(persona);
          setPersonaDrawerOpen(false);
          form.setFieldsValue({
            cliente_email:    persona.email   || '',
            cliente_telefono: persona.celular || '',
          });
        }}
        defaultTipo="CLIENTE"
      />

      {/* ── Vista previa antes de guardar ── */}
      <FacturaViewer
        open={previewOpen}
        doc={previewDoc}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};

export default DocumentoVentaForm;
