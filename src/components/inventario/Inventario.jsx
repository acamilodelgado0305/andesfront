import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Typography, Row, Col, Spin, Alert, Empty,
  Button, Drawer, Form, Input, InputNumber,
  notification, Tooltip, Modal, Upload, Divider,
  Tag, Select, Table, Space, Statistic, Card,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  AppstoreAddOutlined, ReloadOutlined,
  InboxOutlined, BarcodeOutlined,
  ShoppingOutlined, ToolOutlined, WarningFilled,
  SearchOutlined, TagOutlined,
  ThunderboltOutlined, ShoppingCartOutlined,
  CameraOutlined, UploadOutlined,
  PercentageOutlined, CheckCircleOutlined,
} from "@ant-design/icons";

import {
  getInventario, createInventario, updateInventario, deleteInventario,
  getInventarioStats, uploadInventarioPhoto,
} from "../../services/inventario/inventarioService";
import RestockDrawer from "./RestockDrawer";
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

// ─── Categorías ────────────────────────────────────────────
const CATEGORIAS = [
  'Alimentos y bebidas','Tecnología y electrónica','Ropa y calzado',
  'Salud y belleza','Hogar y decoración','Papelería y oficina',
  'Herramientas y ferretería','Juguetes y entretenimiento','Deportes',
  'Automotriz','Mascotas','Servicios profesionales','Consultoría',
  'Diseño','Transporte','Educación','Construcción','Agropecuario','Otro',
];

// ─── Toggle button ──────────────────────────────────────────
const ToggleBtn = ({ active, onClick, icon, label, color = '#155153' }) => (
  <button type="button" onClick={onClick} style={{
    flex: 1, padding: '11px 16px', borderRadius: 10,
    border: `1.5px solid ${active ? color : '#e5e7eb'}`,
    background: active ? `${color}12` : '#fafafa',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 13,
    color: active ? color : '#64748b', transition: 'all 0.15s ease',
    boxShadow: active ? `0 2px 8px ${color}22` : 'none',
  }}>
    {icon}{label}
    {active && <span style={{ width:7, height:7, borderRadius:'50%', background:color, marginLeft:2 }} />}
  </button>
);

const normFile = (e) => Array.isArray(e) ? e : e?.fileList;

// ─── Margen badge ───────────────────────────────────────────
const MarginBadge = ({ compra, venta }) => {
  if (!venta || !compra || compra <= 0) return null;
  const pct = ((venta - compra) / venta) * 100;
  const [color, bg] = pct >= 30 ? ['#16a34a','#f0fdf4'] : pct >= 15 ? ['#d97706','#fffbeb'] : ['#dc2626','#fef2f2'];
  return (
    <span style={{ fontSize:12, fontWeight:700, color, background:bg,
      padding:'2px 8px', borderRadius:6, border:`1px solid ${color}33` }}>
      {pct.toFixed(1)}%
    </span>
  );
};


// ═══════════════════════════════════════════════════════════
// MODAL DE INFORME DEL PRODUCTO
// ═══════════════════════════════════════════════════════════
const ProductoInformeModal = ({ item, onClose, onPhotoUpdated, fmt }) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!item) return;
    setLoadingStats(true);
    getInventarioStats(item.id)
      .then(d => setStats(d))
      .catch(() => notification.error({ message: 'No se pudieron cargar las estadísticas' }))
      .finally(() => setLoadingStats(false));
  }, [item]);

  if (!item) return null;

  const esServicio = item.tipo_item === 'servicio';
  const margen = item.precio_compra_unitario > 0 && item.monto > 0
    ? ((item.monto - item.precio_compra_unitario) / item.monto * 100).toFixed(1)
    : null;

  const handlePhotoUpload = async (file) => {
    setUploadingPhoto(true);
    try {
      const result = await uploadInventarioPhoto(item.id, file);
      notification.success({ message: 'Foto actualizada' });
      onPhotoUpdated(item.id, result.imagen_url);
    } catch {
      notification.error({ message: 'Error al subir la foto' });
    } finally { setUploadingPhoto(false); }
    return false; // evitar upload automático de antd
  };

  const statsCols = [
    { title: 'Fecha', dataIndex: 'created_at', key: 'date',
      render: v => new Date(v).toLocaleDateString('es', { day:'2-digit', month:'short', year:'2-digit' }) },
    { title: 'Pedido', dataIndex: 'pedido_id', key: 'id', render: v => `#${v}` },
    { title: 'Cliente', key: 'cliente',
      render: r => `${r.cliente_nombre || ''} ${r.cliente_apellido || ''}`.trim() || '—' },
    { title: 'Und.', dataIndex: 'cantidad', key: 'qty', align: 'center' },
    { title: 'Subtotal', dataIndex: 'subtotal', key: 'sub', align: 'right',
      render: v => fmt(v) },
    { title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: v => <Tag color={v==='ENTREGADO'?'green':'blue'} className="text-[10px]">{v}</Tag> },
  ];

  return (
    <Modal
      open={!!item}
      onCancel={onClose}
      footer={null}
      width={Math.min(720, window.innerWidth - 16)}
      title={
        <div className="flex items-center gap-2" style={{ color:'#155153' }}>
          <AppstoreAddOutlined />
          <span>Informe — {item.nombre}</span>
        </div>
      }
    >
      {/* ── Foto + Info básica ── */}
      <div className="flex gap-4 mb-6">
        {/* Foto */}
        <div style={{ width:120, flexShrink:0 }}>
          <div style={{
            width:120, height:120, borderRadius:12, overflow:'hidden',
            background: esServicio ? '#f5f3ff' : '#f1f5f9',
            border:'1px solid #e5e7eb',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {item.imagen_url
              ? <img src={item.imagen_url} alt={item.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : (esServicio
                  ? <ToolOutlined style={{ fontSize:36, color:'#7c3aed', opacity:.4 }}/>
                  : <ShoppingOutlined style={{ fontSize:36, color:'#94a3b8' }}/>)
            }
          </div>
          <Upload showUploadList={false} beforeUpload={handlePhotoUpload} accept="image/*">
            <Button
              size="small" block icon={uploadingPhoto ? <Spin size="small"/> : <CameraOutlined/>}
              style={{ marginTop:6, fontSize:11 }}
            >
              {item.imagen_url ? 'Cambiar foto' : 'Agregar foto'}
            </Button>
          </Upload>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-2">
            <Tag color={esServicio?'purple':'blue'} icon={esServicio?<ToolOutlined/>:<ShoppingOutlined/>}>
              {esServicio?'Servicio':'Producto'}
            </Tag>
            {item.categoria && <Tag icon={<TagOutlined/>}>{item.categoria}</Tag>}
            {item.impuesto > 0 && <Tag color="gold" icon={<PercentageOutlined/>}>IVA {item.impuesto}%</Tag>}
          </div>
          {item.sku && <p style={{ margin:'0 0 4px', fontSize:12, color:'#94a3b8' }}>SKU: {item.sku}</p>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', marginTop:8 }}>
            {item.precio_compra_unitario > 0 && (
              <div>
                <span style={{ fontSize:11, color:'#94a3b8', display:'block' }}>Precio compra</span>
                <span style={{ fontWeight:700, color:'#374151' }}>{fmt(item.precio_compra_unitario)}</span>
              </div>
            )}
            <div>
              <span style={{ fontSize:11, color:'#94a3b8', display:'block' }}>Precio venta</span>
              <span style={{ fontWeight:700, color:'#155153', fontSize:16 }}>{fmt(item.monto)}</span>
            </div>
            {margen && (
              <div>
                <span style={{ fontSize:11, color:'#94a3b8', display:'block' }}>Margen</span>
                <MarginBadge compra={item.precio_compra_unitario} venta={item.monto}/>
              </div>
            )}
            {!esServicio && (
              <div>
                <span style={{ fontSize:11, color:'#94a3b8', display:'block' }}>Stock actual</span>
                <span style={{
                  fontWeight:700,
                  color: (item.stock_minimo > 0 && item.cantidad <= item.stock_minimo) ? '#ef4444' : '#374151'
                }}>
                  {item.cantidad ?? 0} und.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Divider style={{ margin:'0 0 16px' }}/>

      {/* ── Stats de ventas ── */}
      <Spin spinning={loadingStats}>
        {stats && (
          <>
            <Row gutter={16} style={{ marginBottom:20 }}>
              {[
                { title:'Pedidos', value: stats.stats?.total_pedidos   || 0, suffix:'' },
                { title:'Unidades vendidas', value: stats.stats?.unidades_vendidas || 0, suffix:'und.' },
                { title:'Ingresos totales', value: fmt(stats.stats?.ingresos_totales || 0), isText:true },
              ].map(s => (
                <Col span={8} key={s.title}>
                  <Card styles={{ body:{ padding:'12px 16px' } }}
                    style={{ border:'1px solid #e5e7eb', borderRadius:10, textAlign:'center' }}>
                    {s.isText
                      ? <><div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>{s.title}</div>
                          <div style={{ fontSize:18, fontWeight:800, color:'#155153' }}>{s.value}</div></>
                      : <Statistic title={s.title} value={s.value} suffix={s.suffix}
                          valueStyle={{ fontSize:20, fontWeight:800, color:'#155153' }}/>
                    }
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Últimas ventas */}
            <p style={{ fontWeight:700, fontSize:13, color:'#374151', marginBottom:8 }}>
              Últimas ventas
            </p>
            {stats.recent_sales?.length > 0
              ? <Table
                  dataSource={stats.recent_sales}
                  columns={statsCols}
                  rowKey="pedido_id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 500 }}
                />
              : <Empty description="Sin ventas registradas aún" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
            }
          </>
        )}
      </Spin>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
function Inventario() {
  const fmt = useCurrency();
  const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser } = useCurrencyInput();
  const isMobile = useIsMobile();

  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [restockItem, setRestockItem]   = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterTipo, setFilterTipo]     = useState('todos');
  const [informeItem, setInformeItem]   = useState(null);
  const [form] = Form.useForm();

  // Drawer state
  const [tipoItem, setTipoItem]         = useState('producto');
  const [precioCompra, setPrecioCompra] = useState(0);
  const [precioVenta, setPrecioVenta]   = useState(0);
  const [barcodeValue, setBarcodeValue] = useState('');

  // ── Carga ──
  const fetchInventario = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems((await getInventario()) || []); }
    catch { setError('No se pudo cargar el inventario.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInventario(); }, [fetchInventario]);

  // ── Filtros ──
  const rows = useMemo(() => items.filter(it => {
    const matchT = filterTipo === 'todos' || it.tipo_item === filterTipo;
    const q = searchTerm.toLowerCase();
    const matchQ = !q || it.nombre?.toLowerCase().includes(q)
      || it.sku?.toLowerCase().includes(q)
      || it.codigo_barras?.toLowerCase().includes(q)
      || it.categoria?.toLowerCase().includes(q);
    return matchT && matchQ;
  }), [items, filterTipo, searchTerm]);

  const stats = useMemo(() => ({
    total:     items.length,
    productos: items.filter(i => i.tipo_item !== 'servicio').length,
    servicios: items.filter(i => i.tipo_item === 'servicio').length,
    stockBajo: items.filter(i => i.tipo_item !== 'servicio' && i.stock_minimo > 0 && (i.cantidad ?? 0) <= i.stock_minimo).length,
  }), [items]);

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
      form.setFieldsValue({ unidades_por_caja:1, stock_inicial_empaques:0, stock_minimo:5, impuesto:19 });
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
      }).forEach(([k,v]) => fd.append(k, v));

      if (tipoItem === 'producto') {
        fd.append('unidades_por_caja', values.unidades_por_caja || 1);
        fd.append('stock_inicial_empaques', values.stock_inicial_empaques ?? 0);
      }

      if (editingItem) {
        await updateInventario(editingItem.id, fd);
        notification.success({ message: `${tipoItem === 'servicio' ? 'Servicio' : 'Producto'} actualizado` });
      } else {
        await createInventario(fd);
        notification.success({ message: `${tipoItem === 'servicio' ? 'Servicio' : 'Producto'} creado` });
      }
      handleCloseDrawer(); fetchInventario();
    } catch (err) {
      notification.error({ message:'Operación fallida', description: err.response?.data?.message || 'Error al guardar.' });
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = (ids) => {
    Modal.confirm({
      title: `¿Eliminar ${ids.length} elemento(s)?`,
      content: 'Esta acción no se puede deshacer.',
      okText:'Eliminar', okType:'danger', cancelText:'Cancelar',
      onOk: async () => {
        try {
          await deleteInventario(ids);
          notification.success({ message:'Eliminado correctamente' });
          setSelectedKeys([]);
          fetchInventario();
        } catch (error) { notification.error({ message:'Error al eliminar', description: error.response?.data?.message || 'Hubo un problema.' }); }
      },
    });
  };

  // Actualizar foto en el estado local (sin recargar todo)
  const handlePhotoUpdated = (id, url) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, imagen_url: url } : i));
    if (informeItem?.id === id) setInformeItem(prev => ({ ...prev, imagen_url: url }));
  };

  const esStockBajo = (item) =>
    item.tipo_item !== 'servicio' && item.stock_minimo > 0 && (item.cantidad ?? 0) <= item.stock_minimo;

  // ── Columnas de la tabla ──
  const columns = [
    {
      title: 'Tipo',
      key: 'tipo',
      width: 100,
      render: (_, r) => (
        <Tag color={r.tipo_item==='servicio'?'purple':'blue'} className="text-[10px]"
          icon={r.tipo_item==='servicio'?<ToolOutlined/>:<ShoppingOutlined/>}>
          {r.tipo_item==='servicio'?'Servicio':'Producto'}
        </Tag>
      ),
      filters:[{text:'Producto',value:'producto'},{text:'Servicio',value:'servicio'}],
      onFilter:(v,r)=>r.tipo_item===v,
    },
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.nombre}</span>
          {r.sku && <span className="text-xs text-gray-400 ml-2">#{r.sku}</span>}
          {r.descripcion && (
            <div className="text-xs text-gray-400 mt-0.5 leading-tight" style={{ maxWidth:260 }}>
              {r.descripcion.length > 80 ? r.descripcion.slice(0,80) + '…' : r.descripcion}
            </div>
          )}
          {r.codigo_barras && <div className="text-xs text-gray-300">{r.codigo_barras}</div>}
        </div>
      ),
    },
    {
      title: 'Categoría', dataIndex:'categoria', key:'categoria', width:140,
      render: v => v ? <Tag icon={<TagOutlined/>} color="default" className="text-[10px]">{v}</Tag> : <span className="text-gray-300">—</span>,
    },
    {
      title: 'Stock', key:'stock', width:110, align:'center',
      render: (_,r) => r.tipo_item==='servicio'
        ? <span className="text-gray-300 text-xs">N/A</span>
        : (
          <span style={{ color: esStockBajo(r)?'#ef4444':'#374151', fontWeight:600 }}>
            {esStockBajo(r) && <WarningFilled style={{ marginRight:4 }}/>}
            {r.cantidad ?? 0}
            {r.stock_minimo>0 && <span className="text-gray-400 font-normal"> / {r.stock_minimo}</span>}
          </span>
        ),
    },
    {
      title: 'Precio compra', key:'pcompra', width:130, align:'right',
      render: (_,r) => r.precio_compra_unitario > 0
        ? <span className="text-gray-500 text-sm">{fmt(r.precio_compra_unitario)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      title: 'Precio venta', dataIndex:'monto', key:'pventa', width:130, align:'right',
      render: v => <span style={{ fontWeight:700, color:'#155153' }}>{fmt(v)}</span>,
    },
    {
      title: 'Margen', key:'margen', width:90, align:'center',
      render: (_,r) => <MarginBadge compra={r.precio_compra_unitario} venta={r.monto}/>,
    },
    {
      title: 'IVA', dataIndex:'impuesto', key:'impuesto', width:80, align:'center',
      render: v => v > 0
        ? <Tag color="gold" className="text-[10px]">{v}%</Tag>
        : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      title: 'Acciones', key:'acciones', width:120, align:'center',
      render: (_,r) => (
        <Space size={4}>
          {r.tipo_item !== 'servicio' && (
            <Tooltip title="Registrar compra">
              <Button size="small" icon={<ShoppingCartOutlined/>}
                onClick={e => { e.stopPropagation(); setRestockItem(r); }}
                style={{ color:'#059669', borderColor:'#05996933' }}/>
            </Tooltip>
          )}
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined/>}
              onClick={e => { e.stopPropagation(); handleOpenEdit(r); }}
              style={{ color:'#155153', borderColor:'#15515333' }}/>
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button size="small" danger icon={<DeleteOutlined/>}
              onClick={e => { e.stopPropagation(); handleDelete([r.id]); }}/>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Mobile card list ──
  const MobileCardList = () => {
    if (loading) return <div style={{ textAlign:'center', padding:32 }}><Spin/></div>;
    if (!rows.length) return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin elementos aún." style={{ margin:'32px 0' }}>
        <Button type="primary" onClick={handleOpenCreate} style={{ background:'#155153' }}>
          Crear el primero
        </Button>
      </Empty>
    );
    return (
      <div>
        {rows.map(r => (
          <div
            key={r.id}
            onClick={() => setInformeItem(r)}
            style={{
              background: esStockBajo(r) ? '#fff5f5' : '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '14px',
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            {/* Type tag */}
            <div style={{ marginBottom: 6 }}>
              <Tag
                color={r.tipo_item === 'servicio' ? 'purple' : 'blue'}
                icon={r.tipo_item === 'servicio' ? <ToolOutlined/> : <ShoppingOutlined/>}
                style={{ fontSize: 10 }}
              >
                {r.tipo_item === 'servicio' ? 'Servicio' : 'Producto'}
              </Tag>
            </div>

            {/* Name row + edit/delete buttons */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: 8, marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 15, display:'block' }}>{r.nombre}</span>
                {r.sku && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>SKU: {r.sku}</span>
                )}
              </div>
              <div style={{ display:'flex', gap: 6, flexShrink: 0 }}>
                {r.tipo_item !== 'servicio' && (
                  <Tooltip title="Registrar compra">
                    <Button
                      size="small"
                      icon={<ShoppingCartOutlined/>}
                      onClick={e => { e.stopPropagation(); setRestockItem(r); }}
                      style={{ color:'#059669', borderColor:'#05996933' }}
                    />
                  </Tooltip>
                )}
                <Button
                  size="small"
                  icon={<EditOutlined/>}
                  onClick={e => { e.stopPropagation(); handleOpenEdit(r); }}
                  style={{ color:'#155153', borderColor:'#15515333' }}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined/>}
                  onClick={e => { e.stopPropagation(); handleDelete([r.id]); }}
                />
              </div>
            </div>

            {/* Category */}
            {r.categoria && (
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                <TagOutlined style={{ marginRight: 4 }}/>{r.categoria}
              </div>
            )}

            <div style={{ height: 1, background: '#e5e7eb', margin: '8px 0' }}/>

            {/* Stock + Precio */}
            <div style={{ display:'flex', alignItems:'center', gap: 16 }}>
              {r.tipo_item !== 'servicio' && (
                <div style={{ fontSize: 13, color: esStockBajo(r) ? '#ef4444' : '#374151', fontWeight: 600 }}>
                  {esStockBajo(r) && <WarningFilled style={{ marginRight: 4, color: '#ef4444' }}/>}
                  Stock: {r.cantidad ?? 0}
                  {r.stock_minimo > 0 && (
                    <span style={{ fontWeight: 400, color: '#9ca3af' }}> / {r.stock_minimo}</span>
                  )}
                </div>
              )}
              <div style={{ fontWeight: 700, color: '#155153', fontSize: 14 }}>
                Precio: {fmt(r.monto)}
              </div>
            </div>

            {/* Low stock warning */}
            {esStockBajo(r) && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                <WarningFilled style={{ marginRight: 4 }}/>Stock bajo — revisar
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── RENDER ──
  return (
    <div className="p-3 md:p-6">

      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#155153]/10 flex items-center justify-center">
            <AppstoreAddOutlined className="text-[#155153] text-xl"/>
          </div>
          <div>
            <p className="m-0 font-bold text-lg" style={{ color:'#155153' }}>Inventario</p>
            <p className="m-0 text-xs text-gray-400">Productos y servicios</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined/>} onClick={fetchInventario} loading={loading} shape="circle"/>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined/>} onClick={handleOpenCreate}
            style={{ backgroundColor:'#155153', borderColor:'#155153' }}>
            Nuevo
          </Button>
        </div>
      </div>

      {/* STATS CHIPS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label:`${stats.total} en total`,      color:'default' },
          { label:`${stats.productos} productos`, color:'blue'    },
          { label:`${stats.servicios} servicios`, color:'purple'  },
          ...(stats.stockBajo > 0 ? [{ label:`⚠️ ${stats.stockBajo} stock bajo`, color:'error' }] : []),
        ].map(s => (
          <Tag key={s.label} color={s.color} className="rounded-full px-3 py-0.5 text-xs font-medium">{s.label}</Tag>
        ))}
      </div>

      {/* FILTROS */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} gap-2 mb-4`}>
        <Input
          placeholder="Buscar nombre, SKU, código de barras..."
          prefix={<SearchOutlined className="text-gray-400"/>}
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          allowClear className={isMobile ? 'w-full' : 'w-full md:w-72'}
        />
        <div className={`flex gap-1 ${isMobile ? 'w-full' : ''}`}>
          {['todos','producto','servicio'].map(t => (
            <button key={t} type="button" onClick={() => setFilterTipo(t)} style={{
              flex: isMobile ? 1 : undefined,
              padding:'6px 14px', borderRadius:8, border:'none',
              background: filterTipo===t ? '#155153' : '#f3f4f6',
              color: filterTipo===t ? '#fff' : '#64748b',
              fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.15s',
            }}>
              {t==='todos'?'Todos':t==='producto'?'Productos':'Servicios'}
            </button>
          ))}
        </div>
        {!isMobile && selectedKeys.length > 0 && (
          <Button danger icon={<DeleteOutlined/>} onClick={() => handleDelete(selectedKeys)}>
            Eliminar {selectedKeys.length} seleccionados
          </Button>
        )}
      </div>

      {/* TABLA / CARDS */}
      {error ? <Alert message={error} type="error" showIcon/> : (
        isMobile ? (
          <MobileCardList/>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Spin spinning={loading}>
              <Table
                dataSource={rows}
                columns={columns}
                rowKey="id"
                size="middle"
                rowSelection={{
                  selectedRowKeys: selectedKeys,
                  onChange: setSelectedKeys,
                }}
                onRow={r => ({
                  onClick: () => setInformeItem(r),
                  style: {
                    background: esStockBajo(r) ? '#fff5f5' : undefined,
                    cursor: 'pointer',
                  },
                })}
                locale={{ emptyText: (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin elementos aún.">
                    <Button type="primary" onClick={handleOpenCreate} style={{ background:'#155153' }}>
                      Crear el primero
                    </Button>
                  </Empty>
                )}}
                pagination={{ pageSize:20, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} de ${t}` }}
                scroll={{ x:900 }}
              />
            </Spin>
          </div>
        )
      )}

      {/* ── RESTOCK DRAWER ── */}
      <RestockDrawer
        open={!!restockItem}
        onClose={() => setRestockItem(null)}
        producto={restockItem}
        onSuccess={() => { setRestockItem(null); fetchInventario(); }}
      />

      {/* ── MODAL INFORME ── */}
      <ProductoInformeModal
        item={informeItem}
        onClose={() => setInformeItem(null)}
        onPhotoUpdated={handlePhotoUpdated}
        fmt={fmt}
      />

      {/* ═══════════════════════════════════════
          DRAWER — CREAR / EDITAR
      ═══════════════════════════════════════ */}
      <Drawer
        title={
          <div className="flex items-center gap-2" style={{ color:'#155153' }}>
            <AppstoreAddOutlined/>
            <span>{editingItem ? `Editar ${tipoItem}` : 'Nuevo elemento'}</span>
          </div>
        }
        width={isMobile ? '100%' : 500} onClose={handleCloseDrawer} open={isDrawerOpen} destroyOnClose
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseDrawer}>Cancelar</Button>
            <Button onClick={() => form.submit()} type="primary" loading={isSubmitting}
              icon={<CheckCircleOutlined/>}
              style={{ backgroundColor:'#155153', borderColor:'#155153' }}>
              {editingItem ? 'Guardar cambios' : `Crear ${tipoItem}`}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} requiredMark={false}>

          {/* 1. TIPO */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:8 }}>
              ¿Qué tipo de elemento es? <span style={{ color:'#ef4444' }}>*</span>
            </label>
            <div style={{ display:'flex', gap:10 }}>
              <ToggleBtn active={tipoItem==='producto'} onClick={() => setTipoItem('producto')}
                icon={<ShoppingOutlined/>} label="Producto" color="#155153"/>
              <ToggleBtn active={tipoItem==='servicio'} onClick={() => setTipoItem('servicio')}
                icon={<ToolOutlined/>} label="Servicio" color="#7c3aed"/>
            </div>
            <p style={{ margin:'6px 0 0', fontSize:11, color:'#94a3b8' }}>
              {tipoItem==='producto' ? 'Los productos llevan control de stock mediante compras.' : 'Los servicios no requieren control de stock.'}
            </p>
          </div>

          <Divider style={{ margin:'0 0 18px' }}/>

          {/* 2. NOMBRE + SKU */}
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="nombre"
                label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Nombre *</span>}
                rules={[{required:true, message:'El nombre es obligatorio'}]}
                style={{ marginBottom:14 }}>
                <Input size="large" placeholder={tipoItem==='servicio'?'Ej: Consultoría web':'Ej: Coca Cola 350ml'}/>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="sku"
                label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>SKU</span>}
                style={{ marginBottom:14 }}>
                <Input size="large" placeholder="PROD-001"/>
              </Form.Item>
            </Col>
          </Row>

          {/* 3. CÓDIGO DE BARRAS (solo productos) */}
          {tipoItem === 'producto' && (
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                Código de barras
              </label>
              <Form.Item name="codigo_barras" noStyle>
                <Input size="large"
                  prefix={<BarcodeOutlined className="text-gray-400"/>}
                  placeholder="Escanea o escribe..."
                  value={barcodeValue}
                  onChange={e => { setBarcodeValue(e.target.value); form.setFieldsValue({codigo_barras:e.target.value}); }}
                  allowClear onClear={() => { setBarcodeValue(''); form.setFieldsValue({codigo_barras:''}); }}
                />
              </Form.Item>
              {!barcodeValue && (
                <button type="button"
                  onClick={() => { const c=generateEAN13(); setBarcodeValue(c); form.setFieldsValue({codigo_barras:c}); }}
                  style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:6,
                    padding:'6px 14px', borderRadius:8, border:'1.5px dashed #155153',
                    background:'#f0fafa', color:'#155153', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                  <ThunderboltOutlined/> Generar código EAN-13 automático
                </button>
              )}
            </div>
          )}

          {/* 4. CATEGORÍA */}
          <Form.Item name="categoria"
            label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Categoría</span>}
            style={{ marginBottom:14 }}>
            <Select showSearch allowClear placeholder="Selecciona o escribe..." size="large"
              options={CATEGORIAS.map(c=>({label:c,value:c}))}
              filterOption={(i,o)=>o.label.toLowerCase().includes(i.toLowerCase())}/>
          </Form.Item>

          <Divider orientation="left" style={{ fontSize:12, fontWeight:700, color:'#155153', margin:'4px 0 16px' }}>
            Precios e impuestos
          </Divider>

          {/* 5. PRECIOS */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="precio_compra_unitario"
                label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Precio de compra</span>}
                style={{ marginBottom:14 }}>
                <InputNumber size="large" className="w-full" placeholder="0" min={0}
                  addonAfter={currSuffix} formatter={currFormatter} parser={currParser}
                  onChange={v=>setPrecioCompra(v||0)}/>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monto"
                label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Precio de venta *</span>}
                rules={[{required:true, message:'Requerido'}]}
                style={{ marginBottom:14 }}>
                <InputNumber size="large" className="w-full" placeholder="0" min={0}
                  addonAfter={currSuffix} formatter={currFormatter} parser={currParser}
                  onChange={v=>setPrecioVenta(v||0)}/>
              </Form.Item>
            </Col>
          </Row>

          {/* Margen */}
          <div style={{ marginBottom:14, minHeight:28 }}>
            <MarginBadge compra={precioCompra} venta={precioVenta}/>
          </div>

          {/* 6. IMPUESTO */}
          <Form.Item name="impuesto"
            label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Impuesto (IVA)</span>}
            style={{ marginBottom:16 }}>
            <Select size="large" placeholder="Selecciona el impuesto..."
              options={TAX_OPTIONS}
              optionRender={o => (
                <span style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>{o.label}</span>
                  {o.data.value > 0 && (
                    <span style={{ fontSize:11, color:'#94a3b8' }}>
                      +{fmt((precioVenta * o.data.value / 100) || 0)}
                    </span>
                  )}
                </span>
              )}
            />
          </Form.Item>

          {/* 7. STOCK MÍNIMO (solo productos) */}
          {tipoItem === 'producto' && (
            <>
              <Divider orientation="left" style={{ fontSize:12, fontWeight:700, color:'#155153', margin:'4px 0 16px' }}>
                Alerta de stock
              </Divider>
              <Form.Item name="stock_minimo"
                label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Stock mínimo ⚠️</span>}
                tooltip="Recibirás una alerta cuando el stock llegue a este número"
                style={{ marginBottom:14 }}>
                <InputNumber min={0} size="large" className="w-full" placeholder="Ej: 5"/>
              </Form.Item>
            </>
          )}

          {/* 8. DESCRIPCIÓN */}
          <Form.Item name="descripcion"
            label={<span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Descripción</span>}>
            <Input.TextArea rows={3} placeholder="Detalles adicionales..."/>
          </Form.Item>

        </Form>
      </Drawer>
    </div>
  );
}

export default Inventario;
