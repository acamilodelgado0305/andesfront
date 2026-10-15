import React, { useState, useEffect, useCallback } from "react";
import {
  Spin, Button, Drawer, Form, Input, InputNumber,
  Modal, Upload, Divider, Select, Row, Col, message,
} from "antd";
import {
  BarcodeOutlined, ShoppingOutlined, ToolOutlined,
  ThunderboltOutlined, CameraOutlined, UploadOutlined, CloseOutlined,
} from "@ant-design/icons";

import {
  getInventario, createInventario, updateInventario, deleteInventario, uploadInventarioPhoto,
} from "../../services/inventario/inventarioService";
import RestockDrawer from "./RestockDrawer";
import InventarioVista, { ChipCategoria, MargenChip } from "./InventarioVista";
import { CATEGORIAS } from "./categorias";
import { BotonPrincipal, ChipOpcion } from "../Certificados/mobile/piezas";
import useCurrency, { useCurrencyInput } from "../../hooks/useCurrency";
import useIsMobile from "../../hooks/useIsMobile";

// ─── EAN-13 generator ──────────────────────────────────────
const generateEAN13 = () => {
  const d = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return [...d, check].join('');
};

// ─── Opciones de impuesto ───────────────────────────────────
const TAX_OPTIONS = [
  { label: '0% — Exento',        value: 0   },
  { label: '5% — IVA reducido',  value: 5   },
  { label: '8%',                 value: 8   },
  { label: '12% — IVA Ecuador',  value: 12  },
  { label: '16% — IVA México',   value: 16  },
  { label: '18% — IVA Perú',     value: 18  },
  { label: '19% — IVA Colombia', value: 19  },
  { label: '21% — IVA Argentina',value: 21  },
];

// Rótulo de campo del formulario (neutro: se lee en claro y en oscuro).
const Rotulo = ({ children }) => (
  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
    {children}
  </span>
);

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
function Inventario() {
  const fmt = useCurrency();
  const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser, precision: currPrecision, step: currStep } = useCurrencyInput();
  const isMobile = useIsMobile();

  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [restockItem, setRestockItem]   = useState(null);
  const [form] = Form.useForm();

  // Drawer state
  const [tipoItem, setTipoItem]         = useState('producto');
  const [precioCompra, setPrecioCompra] = useState(0);
  const [precioVenta, setPrecioVenta]   = useState(0);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Carga ──
  const fetchInventario = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems((await getInventario()) || []); }
    catch { setError('No se pudo cargar el inventario.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInventario(); }, [fetchInventario]);

  // ── Init drawer ──
  useEffect(() => {
    if (!isDrawerOpen) return;
    if (editingItem) {
      const tipo = editingItem.tipo_item || 'producto';
      setTipoItem(tipo);
      setPrecioCompra(Number(editingItem.precio_compra_unitario) || 0);
      setPrecioVenta(Number(editingItem.monto) || 0);
      setBarcodeValue(editingItem.codigo_barras || '');
      form.setFieldsValue({
        nombre:                 editingItem.nombre,
        sku:                    editingItem.sku || '',
        monto:                  Number(editingItem.monto),
        precio_compra_unitario: Number(editingItem.precio_compra_unitario) || 0,
        descripcion:            editingItem.descripcion || '',
        unidades_por_caja:      editingItem.unidades_por_caja || 1,
        stock_inicial_empaques: editingItem.cantidad || 0,
        stock_minimo:           editingItem.stock_minimo || 0,
        codigo_barras:          editingItem.codigo_barras || '',
        categoria:              editingItem.categoria || undefined,
        impuesto:               Number(editingItem.impuesto) || 0,
      });
    } else {
      setTipoItem('producto'); setPrecioCompra(0); setPrecioVenta(0); setBarcodeValue('');
      form.resetFields();
      form.setFieldsValue({
        unidades_por_caja:1, stock_inicial_empaques:0, stock_minimo:5, impuesto:19,
      });
    }
  }, [isDrawerOpen, editingItem, form]);

  const handleOpenCreate  = () => { setEditingItem(null); setIsDrawerOpen(true); };
  const handleOpenEdit    = (item) => { setEditingItem(item); setIsDrawerOpen(true); };
  const handleCloseDrawer = () => { setIsDrawerOpen(false); setEditingItem(null); form.resetFields(); };

  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries({
        nombre: values.nombre, monto: values.monto,
        descripcion: values.descripcion || '',
        tipo_item: tipoItem, sku: values.sku || '',
        precio_compra_unitario: values.precio_compra_unitario || 0,
        costo_compra: values.precio_compra_unitario || 0,
        codigo_barras: values.codigo_barras || '',
        categoria: values.categoria || '',
        stock_minimo: values.stock_minimo || 0,
        impuesto: values.impuesto ?? 0,
        // send_mail / plantilla_correo / intensidad_horaria NO se envían: el envío
        // de documentos se activa solo en BD para servicios puntuales, y al no
        // mandarlos el backend conserva lo que ya tenga el ítem.
      }).forEach(([k,v]) => fd.append(k, v));

      if (tipoItem === 'producto') {
        fd.append('unidades_por_caja', values.unidades_por_caja || 1);
        fd.append('stock_inicial_empaques', values.stock_inicial_empaques ?? 0);
      }

      if (editingItem) {
        await updateInventario(editingItem.id, fd);
        message.success(`${tipoItem === 'servicio' ? 'Servicio' : 'Producto'} actualizado`);
      } else {
        await createInventario(fd);
        message.success(`${tipoItem === 'servicio' ? 'Servicio' : 'Producto'} creado`);
      }
      handleCloseDrawer(); fetchInventario();
    } catch (err) {
      message.error(err.response?.data?.message || 'No se pudo guardar');
    } finally { setIsSubmitting(false); }
  };

  // `confirmado`: la vista ya preguntó (Popconfirm en la fila o en la ficha).
  const handleDelete = (ids, alTerminar, { confirmado = false } = {}) => {
    const borrar = async () => {
      try {
        await deleteInventario(ids);
        message.success(ids.length === 1 ? 'Eliminado' : `${ids.length} eliminados`);
        alTerminar?.();
        fetchInventario();
      } catch (err) { message.error(err.response?.data?.message || 'No se pudo eliminar'); }
    };
    if (confirmado) { borrar(); return; }
    Modal.confirm({
      title: `¿Eliminar ${ids.length} ${ids.length === 1 ? 'elemento' : 'elementos'}?`,
      content: 'Esta acción no se puede deshacer.',
      okText:'Eliminar', okType:'danger', cancelText:'Cancelar',
      onOk: borrar,
    });
  };

  // Actualizar foto en el estado local (sin recargar todo)
  const handlePhotoUpdated = (id, url) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, imagen_url: url } : i));
  };

  // Subir foto desde el drawer de edición
  const handleDrawerPhotoUpload = async (file) => {
    if (!editingItem) return false;
    setUploadingPhoto(true);
    try {
      const result = await uploadInventarioPhoto(editingItem.id, file);
      message.success('Foto actualizada');
      handlePhotoUpdated(editingItem.id, result.imagen_url);
      setEditingItem(prev => ({ ...prev, imagen_url: result.imagen_url }));
    } catch {
      message.error('No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
    return false;
  };

  const nombreTipo = tipoItem === 'servicio' ? 'servicio' : 'producto';

  // ── RENDER ──
  return (
    <>
      <InventarioVista
        items={items}
        loading={loading}
        error={error}
        onRecargar={fetchInventario}
        onNuevo={handleOpenCreate}
        onEditar={handleOpenEdit}
        onRestock={setRestockItem}
        onEliminar={handleDelete}
        onFotoActualizada={handlePhotoUpdated}
      />

      {/* ── COMPRA (REABASTECER) ── */}
      <RestockDrawer
        open={!!restockItem}
        onClose={() => setRestockItem(null)}
        producto={restockItem}
        onSuccess={() => { setRestockItem(null); fetchInventario(); }}
      />

      {/* ═══════════════════════════════════════
          DRAWER — CREAR / EDITAR
      ═══════════════════════════════════════ */}
      <Drawer
        title={<span style={{ fontSize: 17, fontWeight: 700 }}>{editingItem ? `Editar ${nombreTipo}` : 'Nuevo producto o servicio'}</span>}
        width={isMobile ? '100vw' : 500} onClose={handleCloseDrawer} open={isDrawerOpen} destroyOnClose
        closable={false}
        extra={<Button type="text" shape="circle" icon={<CloseOutlined />} onClick={handleCloseDrawer} aria-label="Cerrar" />}
        rootStyle={isMobile ? { position: 'fixed', inset: 0 } : undefined}
        styles={{ wrapper: isMobile ? { height: '100%', width: '100%' } : {}, body: { overflowX: 'hidden' } }}
        footer={
          <div style={{ display: 'flex', gap: 8, padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))' }}>
            <Button onClick={handleCloseDrawer} size="large" style={{ borderRadius: 14 }}>Cancelar</Button>
            <BotonPrincipal onClick={() => form.submit()} cargando={isSubmitting} style={{ flex: 1, height: 44, borderRadius: 14, fontSize: 15 }}>
              {editingItem ? 'Guardar cambios' : `Crear ${nombreTipo}`}
            </BotonPrincipal>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} requiredMark={false}>

          {/* FOTO — solo en modo edición */}
          {editingItem && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 88, height: 88, borderRadius: 20, overflow: 'hidden', flexShrink: 0,
                background: 'var(--qc-relleno)', color: 'var(--qc-text-muted)', fontSize: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {editingItem.imagen_url
                  ? <img src={editingItem.imagen_url} alt={editingItem.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <CameraOutlined />}
              </div>
              <div>
                <Upload showUploadList={false} beforeUpload={handleDrawerPhotoUpload} accept="image/*">
                  <ChipOpcion>
                    {uploadingPhoto ? <Spin size="small" /> : <UploadOutlined />}
                    {editingItem.imagen_url ? 'Cambiar foto' : 'Subir foto'}
                  </ChipOpcion>
                </Upload>
                <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginTop: 6 }}>JPG, PNG o WEBP · máx. 5 MB</div>
              </div>
            </div>
          )}

          {/* 1. TIPO */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 8 }}><Rotulo>¿Qué es?</Rotulo></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ChipOpcion activo={tipoItem === 'producto'} onClick={() => setTipoItem('producto')} style={{ flex: 1, minHeight: 46, borderRadius: 14 }}>
                <ShoppingOutlined /> Producto
              </ChipOpcion>
              <ChipOpcion activo={tipoItem === 'servicio'} onClick={() => setTipoItem('servicio')} style={{ flex: 1, minHeight: 46, borderRadius: 14 }}>
                <ToolOutlined /> Servicio
              </ChipOpcion>
            </div>
            <div style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--qc-text-muted)' }}>
              {tipoItem === 'producto' ? 'Los productos llevan control de stock con las compras.' : 'Los servicios no llevan stock.'}
            </div>
          </div>

          {/* 2. NOMBRE + SKU (el SKU solo aplica a productos) */}
          <Row gutter={12}>
            <Col span={tipoItem === 'producto' ? 14 : 24}>
              <Form.Item name="nombre" label={<Rotulo>Nombre</Rotulo>}
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                style={{ marginBottom: 14 }}>
                <Input size="large" placeholder={tipoItem === 'servicio' ? 'Ej: Consultoría web' : 'Ej: Coca Cola 350ml'} />
              </Form.Item>
            </Col>
            {tipoItem === 'producto' && (
              <Col span={10}>
                <Form.Item name="sku" label={<Rotulo>SKU</Rotulo>} style={{ marginBottom: 14 }}>
                  <Input size="large" placeholder="PROD-001" />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* 3. CÓDIGO DE BARRAS (solo productos) */}
          {tipoItem === 'producto' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 6 }}><Rotulo>Código de barras</Rotulo></div>
              <Form.Item name="codigo_barras" noStyle>
                <Input size="large"
                  prefix={<BarcodeOutlined style={{ color: 'var(--qc-text-muted)' }} />}
                  placeholder="Escanea o escribe…"
                  value={barcodeValue}
                  onChange={e => { setBarcodeValue(e.target.value); form.setFieldsValue({ codigo_barras: e.target.value }); }}
                  allowClear onClear={() => { setBarcodeValue(''); form.setFieldsValue({ codigo_barras: '' }); }}
                />
              </Form.Item>
              {!barcodeValue && (
                <button type="button"
                  onClick={() => { const c = generateEAN13(); setBarcodeValue(c); form.setFieldsValue({ codigo_barras: c }); }}
                  style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 16,
                    border: '1px dashed var(--qc-border)', background: 'var(--qc-relleno)', color: 'var(--qc-text)',
                    fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                  }}>
                  <ThunderboltOutlined /> Generar código EAN-13
                </button>
              )}
            </div>
          )}

          {/* 4. CATEGORÍA */}
          <Form.Item name="categoria" label={<Rotulo>Categoría</Rotulo>} style={{ marginBottom: 14 }}>
            <Select showSearch allowClear placeholder="Selecciona o escribe…" size="large"
              options={CATEGORIAS.map(c => ({ label: c, value: c }))}
              optionRender={o => <ChipCategoria nombre={o.value} />}
              filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())} />
          </Form.Item>

          <Divider style={{ margin: '6px 0 16px' }} />

          {/* 5. PRECIOS */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="precio_compra_unitario" label={<Rotulo>Precio de compra</Rotulo>} style={{ marginBottom: 14 }}>
                <InputNumber size="large" className="w-full" placeholder="0" min={0}
                  addonAfter={currSuffix} formatter={currFormatter} parser={currParser}
                  precision={currPrecision} step={currStep}
                  onChange={v => setPrecioCompra(v || 0)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monto" label={<Rotulo>Precio de venta</Rotulo>}
                rules={[{ required: true, message: 'Requerido' }]}
                style={{ marginBottom: 14 }}>
                <InputNumber size="large" className="w-full" placeholder="0" min={0}
                  addonAfter={currSuffix} formatter={currFormatter} parser={currParser}
                  precision={currPrecision} step={currStep}
                  onChange={v => setPrecioVenta(v || 0)} />
              </Form.Item>
            </Col>
          </Row>

          {/* Margen */}
          {precioCompra > 0 && precioVenta > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: 'var(--qc-text-muted)' }}>
              Margen <MargenChip compra={precioCompra} venta={precioVenta} /> · ganas {fmt(precioVenta - precioCompra)} por unidad
            </div>
          )}

          {/* 6. IMPUESTO */}
          <Form.Item name="impuesto" label={<Rotulo>Impuesto (IVA)</Rotulo>} style={{ marginBottom: 16 }}>
            <Select size="large" placeholder="Selecciona el impuesto…"
              options={TAX_OPTIONS}
              optionRender={o => (
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{o.label}</span>
                  {o.data.value > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--qc-text-muted)' }}>
                      +{fmt((precioVenta * o.data.value / 100) || 0)}
                    </span>
                  )}
                </span>
              )}
            />
          </Form.Item>

          {/* 7. STOCK MÍNIMO (solo productos) */}
          {tipoItem === 'producto' && (
            <Form.Item name="stock_minimo" label={<Rotulo>Avisar cuando el stock llegue a</Rotulo>}
              tooltip="Aparece en «Stock bajo» cuando el stock llega a este número"
              style={{ marginBottom: 14 }}>
              <InputNumber min={0} size="large" className="w-full" placeholder="Ej: 5" />
            </Form.Item>
          )}

          {/* 8. DESCRIPCIÓN */}
          <Form.Item name="descripcion" label={<Rotulo>Descripción</Rotulo>}>
            <Input.TextArea rows={3} placeholder="Detalles adicionales…" />
          </Form.Item>

        </Form>
      </Drawer>
    </>
  );
}

export default Inventario;
