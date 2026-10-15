import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Checkbox, Dropdown, Input, InputNumber, Popconfirm, Select, Skeleton, Spin, Tooltip, Upload, message,
} from 'antd';
import {
  CameraOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined,
  SettingOutlined, ShoppingCartOutlined, ShoppingOutlined, TagOutlined, ToolOutlined, WarningFilled,
} from '@ant-design/icons';

import BottomSheet from '../common/BottomSheet';
import {
  Barras, BotonCircular, BotonesFlotantes, BotonPrincipal, ChipFiltro, ChipOpcion, Circulo, COLOR_SIGNO,
  FondoApp, inicialDe, NumeroGrande, OpcionMenu, PastillaMonto, PildorasFiltro, Seccion, TituloPantalla,
} from '../Certificados/mobile/piezas';
import { CATEGORIAS, hexCategoria } from './categorias';
import {
  ajustarCategoriaInventario, ajustarStockInventario, getInventarioStats, uploadInventarioPhoto,
} from '../../services/inventario/inventarioService';
import useCurrency, { useAmountShort, useTypedAmount } from '../../hooks/useCurrency';
import useIsMobile from '../../hooks/useIsMobile';

const SIN_CATEGORIA = '__sin';
const POR_PAGINA = 80;

export const esServicio = (it) => it?.tipo_item === 'servicio';
export const esStockBajo = (it) =>
  !esServicio(it) && Number(it.stock_minimo) > 0 && Number(it.cantidad ?? 0) <= Number(it.stock_minimo);

// ── Piezas ────────────────────────────────────────────────────────────────

/** Categoría como chip neutro con el punto de su color. */
export const ChipCategoria = ({ nombre }) => (nombre ? (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%', padding: '2px 10px 2px 8px',
    borderRadius: 12, background: 'var(--qc-relleno)', fontSize: 12.5, fontWeight: 600,
    color: 'var(--qc-text)', whiteSpace: 'nowrap', lineHeight: '20px',
  }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: hexCategoria(nombre), flexShrink: 0 }} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</span>
  </span>
) : (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, lineHeight: '20px', padding: '0 8px',
    borderRadius: 6, border: '1px dashed var(--qc-border)', color: 'var(--qc-text-muted)', whiteSpace: 'nowrap',
  }}>
    <TagOutlined /> Sin categoría
  </span>
));

/** Margen sobre el precio de venta: verde ≥ 30 %, ámbar ≥ 15 %, rojo por debajo. */
export const MargenChip = ({ compra, venta }) => {
  if (!venta || !compra || compra <= 0) return null;
  const pct = ((venta - compra) / venta) * 100;
  const color = pct >= 30 ? COLOR_SIGNO.ingreso : pct >= 15 ? '#d97706' : COLOR_SIGNO.gasto;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700,
      padding: '2px 9px', borderRadius: 12, background: 'var(--qc-relleno)', color: 'var(--qc-text)',
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {pct.toFixed(1)}%
    </span>
  );
};

/** Foto del ítem en círculo; sin foto, su inicial sobre el tinte de la categoría. */
const IconoItem = ({ it, size = 46 }) => {
  if (it.imagen_url) {
    return (
      <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--qc-relleno)' }}>
        <img src={it.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </span>
    );
  }
  const color = hexCategoria(it.categoria);
  return (
    <Circulo size={size} fondo={color ? `${color}2b` : 'var(--qc-relleno)'}>
      {esServicio(it) && !it.categoria ? <ToolOutlined style={{ fontSize: size * 0.4 }} /> : inicialDe(it.nombre)}
    </Circulo>
  );
};

/** Categoría editable en el sitio: tocar → elegir y guarda al instante. */
export const CategoriaCell = ({ item, onSaved }) => {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const original = item.categoria || null;

  const guardar = async (valor) => {
    const nueva = valor || null;
    if (nueva === original) { setEditando(false); return; }
    setGuardando(true);
    try {
      await ajustarCategoriaInventario(item.id, nueva);
      message.success(nueva ? 'Categoría actualizada' : 'Categoría quitada');
      setEditando(false);
      await onSaved?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'No se pudo cambiar la categoría');
    } finally { setGuardando(false); }
  };

  if (editando) {
    return (
      <span onClick={(e) => e.stopPropagation()} style={{ display: 'block' }}>
        <Select
          autoFocus
          defaultOpen
          showSearch
          allowClear
          size="small"
          style={{ width: '100%', minWidth: 150 }}
          placeholder="Sin categoría"
          value={original || undefined}
          loading={guardando}
          disabled={guardando}
          options={CATEGORIAS.map((c) => ({ label: c, value: c }))}
          optionRender={(o) => <ChipCategoria nombre={o.value} />}
          filterOption={(input, o) => o.label.toLowerCase().includes(input.toLowerCase())}
          onChange={guardar}
          onClear={() => guardar(null)}
          onBlur={() => setEditando(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditando(false); } }}
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      title="Cambiar la categoría"
      onClick={(e) => { e.stopPropagation(); setEditando(true); }}
      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', maxWidth: '100%', display: 'inline-flex' }}
    >
      <ChipCategoria nombre={original} />
    </button>
  );
};

/** Stock editable en el sitio: tocar el número → escribir → Enter (0 lo reinicia). */
export const StockCell = ({ item, onSaved, grande = false }) => {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(item.cantidad ?? 0);
  const [guardando, setGuardando] = useState(false);
  // Enter dispara onPressEnter y además el onBlur al desmontarse: evita el doble PUT.
  const enCurso = useRef(false);
  const original = Number(item.cantidad ?? 0);
  const bajo = esStockBajo(item);

  const guardar = async () => {
    if (enCurso.current) return;
    const nuevo = Number(valor);
    if (!Number.isFinite(nuevo) || nuevo < 0) { message.error('El stock no puede ser negativo'); return; }
    if (nuevo === original) { setEditando(false); return; }
    enCurso.current = true;
    setGuardando(true);
    try {
      await ajustarStockInventario(item.id, nuevo);
      message.success('Stock actualizado');
      setEditando(false);
      await onSaved?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'No se pudo ajustar el stock');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <InputNumber
        autoFocus
        size={grande ? 'large' : 'small'}
        min={0}
        precision={0}
        style={{ width: grande ? 120 : 84 }}
        value={valor}
        onChange={(v) => setValor(v ?? 0)}
        disabled={guardando}
        onClick={(e) => e.stopPropagation()}
        onPressEnter={guardar}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditando(false); } }}
      />
    );
  }
  return (
    <Tooltip title={`Tocar para ajustar (0 lo reinicia)${item.stock_minimo > 0 ? ` · alerta en ${item.stock_minimo}` : ''}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setValor(original); setEditando(true); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
          padding: grande ? '2px 0' : '3px 10px', borderRadius: 14, fontVariantNumeric: 'tabular-nums',
          background: grande ? 'none' : 'var(--qc-relleno)',
          color: bajo ? COLOR_SIGNO.gasto : 'var(--qc-text)',
          fontSize: grande ? 26 : 14, fontWeight: 800,
        }}
      >
        {bajo && <WarningFilled style={{ fontSize: grande ? 18 : 12 }} />}
        {original}
        <EditOutlined style={{ fontSize: grande ? 13 : 10, opacity: 0.5 }} />
      </button>
    </Tooltip>
  );
};

const Dato = ({ titulo, children }) => (
  <div style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--qc-relleno)', minWidth: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', marginBottom: 4 }}>{titulo}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--qc-text)', minWidth: 0 }}>{children}</div>
  </div>
);

// ── Ficha del producto (antes "Informe"): datos, acciones y ventas ──────────

const FichaProducto = ({ item, open, onClose, onEditar, onRestock, onEliminar, onFotoActualizada, onGuardado, lateral }) => {
  const fmt = useCurrency();
  const montoCorto = useAmountShort();
  const { codigo } = useTypedAmount();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const id = item?.id;

  useEffect(() => {
    if (!open || !id) return;
    let cancelado = false;
    setCargando(true);
    setStats(null);
    getInventarioStats(id)
      .then((d) => { if (!cancelado) setStats(d); })
      .catch(() => { if (!cancelado) message.error('No se pudieron cargar las ventas'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [open, id]);

  if (!item) return null;
  const servicio = esServicio(item);

  const subirFoto = async (file) => {
    setSubiendo(true);
    try {
      const r = await uploadInventarioPhoto(item.id, file);
      message.success('Foto actualizada');
      onFotoActualizada(item.id, r.imagen_url);
    } catch {
      message.error('No se pudo subir la foto');
    } finally { setSubiendo(false); }
    return false; // sin subida automática de antd
  };

  const ventas = stats?.stats || {};
  const recientes = stats?.recent_sales || [];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      lateral={lateral}
      width={480}
      height="92%"
      maxHeight="none"
      title={item.nombre}
      subtitle={[servicio ? 'Servicio' : 'Producto', item.sku ? `SKU ${item.sku}` : null, item.codigo_barras || null].filter(Boolean).join(' · ')}
      extra={<BotonCircular label="Editar" onClick={onEditar}><EditOutlined /></BotonCircular>}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 104, height: 104, borderRadius: 22, overflow: 'hidden', background: 'var(--qc-relleno)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--qc-text-muted)', fontSize: 34,
          }}>
            {item.imagen_url
              ? <img src={item.imagen_url} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (servicio ? <ToolOutlined /> : <ShoppingOutlined />)}
          </div>
          <Upload showUploadList={false} beforeUpload={subirFoto} accept="image/*">
            <button
              type="button"
              aria-label={item.imagen_url ? 'Cambiar foto' : 'Agregar foto'}
              title={item.imagen_url ? 'Cambiar foto' : 'Agregar foto'}
              style={{
                position: 'absolute', right: -6, bottom: -6, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                border: '2px solid var(--qc-surface)', background: 'var(--qc-text)', color: 'var(--qc-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              {subiendo ? <Spin size="small" /> : <CameraOutlined />}
            </button>
          </Upload>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>Precio de venta</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--qc-text)', letterSpacing: -0.8, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {montoCorto(item.monto)} <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{codigo}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <MargenChip compra={Number(item.precio_compra_unitario)} venta={Number(item.monto)} />
            {Number(item.impuesto) > 0 && (
              <span style={{ fontSize: 12.5, fontWeight: 600, padding: '2px 9px', borderRadius: 12, background: 'var(--qc-relleno)', color: 'var(--qc-text)' }}>
                IVA {Number(item.impuesto)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
        {!servicio && (
          <Dato titulo={esStockBajo(item) ? `Stock (mínimo ${item.stock_minimo})` : 'Stock'}>
            <StockCell item={item} onSaved={onGuardado} grande />
          </Dato>
        )}
        <Dato titulo="Precio de compra">
          {Number(item.precio_compra_unitario) > 0 ? fmt(item.precio_compra_unitario) : <span style={{ color: 'var(--qc-text-muted)', fontWeight: 500 }}>—</span>}
        </Dato>
        <Dato titulo="Categoría"><CategoriaCell item={item} onSaved={onGuardado} /></Dato>
        {servicio && <Dato titulo="Tipo">Servicio (sin stock)</Dato>}
      </div>

      {item.descripcion && (
        <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--qc-text-muted)', lineHeight: 1.5 }}>{item.descripcion}</div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        {!servicio && (
          <ChipOpcion activo onClick={onRestock} style={{ minHeight: 44 }}>
            <ShoppingCartOutlined /> Registrar compra
          </ChipOpcion>
        )}
        <ChipOpcion onClick={onEditar} style={{ minHeight: 44 }}><EditOutlined /> Editar</ChipOpcion>
        <Popconfirm title="¿Eliminar este ítem?" description="No se puede deshacer." okText="Eliminar" okButtonProps={{ danger: true }} cancelText="Cancelar" onConfirm={onEliminar}>
          <span style={{ display: 'inline-flex' }}>
            <ChipOpcion style={{ minHeight: 44, color: COLOR_SIGNO.gasto }}><DeleteOutlined /> Eliminar</ChipOpcion>
          </span>
        </Popconfirm>
      </div>

      <Seccion>Ventas</Seccion>
      {cargando ? <Skeleton active paragraph={{ rows: 2 }} title={false} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <Dato titulo="Pedidos">{ventas.total_pedidos || 0}</Dato>
            <Dato titulo="Unidades">{ventas.unidades_vendidas || 0}</Dato>
            <Dato titulo="Ingresos">{montoCorto(ventas.ingresos_totales || 0)}</Dato>
          </div>
          {recientes.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              {recientes.map((v, i) => (
                <div key={`${v.pedido_id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--qc-border)' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {`${v.cliente_nombre || ''} ${v.cliente_apellido || ''}`.trim() || 'Cliente general'}
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
                      {new Date(v.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })} · Pedido #{v.pedido_id} · {v.cantidad} und · {String(v.estado || '').toLowerCase()}
                    </span>
                  </span>
                  <PastillaMonto>{montoCorto(v.subtotal)}</PastillaMonto>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 10 }}>Aún no se ha vendido en un pedido.</div>
          )}
        </>
      )}
    </BottomSheet>
  );
};

// ── Vista principal ─────────────────────────────────────────────────────

/**
 * Inventario con el estilo de Movimientos: el valor del stock grande,
 * Productos | Servicios que filtran, barras por categoría y la lista. En el
 * celular, buscar y "+" abajo; en computador, columnas con stock, precios y
 * margen editables y la ficha como panel a la derecha.
 */
const InventarioVista = ({
  items = [],
  loading,
  error,
  onRecargar,
  onNuevo,
  onEditar,
  onRestock,
  onEliminar,
  onFotoActualizada,
}) => {
  const montoCorto = useAmountShort();
  const { codigo } = useTypedAmount();
  const esEscritorio = !useIsMobile();
  const compacto = useIsMobile(1100);

  const [tipo, setTipo] = useState(null);          // null | 'producto' | 'servicio'
  const [soloBajo, setSoloBajo] = useState(false);
  const [categoria, setCategoria] = useState(null); // nombre | SIN_CATEGORIA
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [fichaId, setFichaId] = useState(null);
  const [seleccion, setSeleccion] = useState([]);

  const ficha = items.find((i) => i.id === fichaId) || null;

  const productos = useMemo(() => items.filter((i) => !esServicio(i)), [items]);
  const servicios = useMemo(() => items.filter(esServicio), [items]);
  const bajos = useMemo(() => productos.filter(esStockBajo), [productos]);
  const valorVenta = productos.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.monto) || 0), 0);
  const valorCosto = productos.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.precio_compra_unitario) || 0), 0);

  // Todo menos la categoría (las barras muestran a cuál cambiar).
  const q = busqueda.trim().toLowerCase();
  const sinCategoria = useMemo(() => items.filter((it) => {
    if (tipo && (tipo === 'servicio') !== esServicio(it)) return false;
    if (soloBajo && !esStockBajo(it)) return false;
    if (q) {
      const texto = [it.nombre, it.sku, it.codigo_barras, it.categoria, it.descripcion].filter(Boolean).join(' ').toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  }), [items, tipo, soloBajo, q]);

  const filtrados = useMemo(() => sinCategoria
    .filter((it) => categoria == null || (categoria === SIN_CATEGORIA ? !it.categoria : it.categoria === categoria))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es')), [sinCategoria, categoria]);

  const barras = useMemo(() => {
    const mapa = new Map();
    sinCategoria.forEach((it) => {
      const clave = it.categoria || SIN_CATEGORIA;
      if (!mapa.has(clave)) {
        const nombre = it.categoria || 'Sin categoría';
        mapa.set(clave, { clave, nombre, valor: 0, color: hexCategoria(it.categoria), icono: it.categoria ? inicialDe(nombre) : '?' });
      }
      mapa.get(clave).valor += 1;
    });
    return [...mapa.values()].map((d) => ({ ...d, texto: `${d.valor}` })).sort((a, b) => b.valor - a.valor);
  }, [sinCategoria]);
  const verBarras = barras.length > 1 || (barras.length === 1 && barras[0].clave !== SIN_CATEGORIA);

  // Por categoría, con la cantidad en el encabezado ("Sin categoría" al final).
  const grupos = useMemo(() => {
    const mapa = new Map();
    filtrados.slice(0, limite).forEach((it) => {
      const clave = it.categoria || SIN_CATEGORIA;
      if (!mapa.has(clave)) mapa.set(clave, { clave, nombre: it.categoria || 'Sin categoría', items: [] });
      mapa.get(clave).items.push(it);
    });
    return [...mapa.values()].sort((a, b) => (
      (a.clave === SIN_CATEGORIA) - (b.clave === SIN_CATEGORIA) || a.nombre.localeCompare(b.nombre, 'es')
    ));
  }, [filtrados, limite]);
  const totalPorCategoria = useMemo(() => {
    const t = {};
    filtrados.forEach((it) => { const c = it.categoria || SIN_CATEGORIA; t[c] = (t[c] || 0) + 1; });
    return t;
  }, [filtrados]);

  const hayFiltros = tipo || soloBajo || categoria != null || q;
  const limpiar = () => { setTipo(null); setSoloBajo(false); setCategoria(null); setBusqueda(''); setLimite(POR_PAGINA); };
  const cargando = loading && items.length === 0;

  const eliminarSeleccion = () => onEliminar(seleccion, () => setSeleccion([]));
  const alternarSeleccion = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ── Encabezado: valor del stock (o cuántos servicios hay) ──
  const resumen = productos.length > 0 ? (
    <>
      <NumeroGrande valor={cargando ? '…' : montoCorto(valorVenta)} codigo={codigo} escritorio={esEscritorio} />
      <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>Valor del stock a precio de venta</div>
      {valorCosto > 0 && (
        <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>
          Costo <b style={{ color: 'var(--qc-text)' }}>{montoCorto(valorCosto)}</b>
          {' · '}Ganancia posible <b style={{ color: valorVenta - valorCosto < 0 ? COLOR_SIGNO.gasto : 'var(--qc-text)' }}>{montoCorto(valorVenta - valorCosto)}</b>
        </div>
      )}
    </>
  ) : (
    <>
      <NumeroGrande valor={cargando ? '…' : servicios.length} codigo={servicios.length === 1 ? 'servicio' : 'servicios'} escritorio={esEscritorio} />
      <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>en tu catálogo</div>
    </>
  );

  const avisoStock = bajos.length > 0 ? (
    <button
      type="button"
      onClick={() => setSoloBajo((v) => !v)}
      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 600, color: COLOR_SIGNO.gasto }}
    >
      <WarningFilled /> {bajos.length} con stock bajo{soloBajo ? ' · ver todos' : ''}
    </button>
  ) : (
    <span style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>
      {productos.length} {productos.length === 1 ? 'producto' : 'productos'} · {servicios.length} {servicios.length === 1 ? 'servicio' : 'servicios'}
    </span>
  );

  const pildoras = (
    <PildorasFiltro
      activo={tipo}
      onCambiar={(v) => { setTipo(v); setLimite(POR_PAGINA); }}
      opciones={[
        { valor: 'producto', label: `Productos: ${productos.length}`, contenido: <><ShoppingOutlined /> {productos.length} <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--qc-text-muted)' }}>Productos</span></> },
        { valor: 'servicio', label: `Servicios: ${servicios.length}`, contenido: <><ToolOutlined /> {servicios.length} <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--qc-text-muted)' }}>Servicios</span></> },
      ]}
    />
  );

  const chipsFiltro = (soloBajo || categoria != null) && (
    <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12 }}>
      {soloBajo && <ChipFiltro onQuitar={() => setSoloBajo(false)}>Stock bajo</ChipFiltro>}
      {categoria != null && <ChipFiltro onQuitar={() => setCategoria(null)}>{categoria === SIN_CATEGORIA ? 'Sin categoría' : categoria}</ChipFiltro>}
    </div>
  );

  const barrasJsx = verBarras && !cargando && (
    <Barras
      datos={barras}
      activo={categoria}
      escritorio={esEscritorio}
      onTocar={(d) => { setCategoria((c) => (c === d.clave ? null : d.clave)); setLimite(POR_PAGINA); }}
    />
  );

  const vacio = (
    <div style={{ textAlign: 'center', padding: '44px 16px', color: 'var(--qc-text-muted)' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>
        {items.length === 0 ? 'Aún no tienes productos ni servicios' : 'Nada coincide con la búsqueda'}
      </div>
      <div style={{ fontSize: 13, margin: '4px 0 14px' }}>
        {items.length === 0 ? 'Crea el primero y úsalo en tus ventas y pedidos.' : 'Prueba quitando filtros.'}
      </div>
      {items.length === 0
        ? <BotonPrincipal onClick={onNuevo} style={{ height: 44, padding: '0 20px', borderRadius: 22 }}><PlusOutlined /> Crear el primero</BotonPrincipal>
        : <Button type="link" onClick={limpiar}>Quitar filtros</Button>}
    </div>
  );

  const errorJsx = error && (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: COLOR_SIGNO.gasto }}>{error}</div>
      <Button type="link" onClick={onRecargar}>Reintentar</Button>
    </div>
  );

  const verMas = filtrados.length > limite && (
    <div style={{ textAlign: 'center', marginTop: 14 }}>
      <Button onClick={() => setLimite((n) => n + POR_PAGINA)} style={{ borderRadius: 18 }}>Ver más ({filtrados.length - limite})</Button>
    </div>
  );

  const fichaJsx = (
    <FichaProducto
      item={ficha}
      open={!!ficha}
      onClose={() => setFichaId(null)}
      lateral={esEscritorio}
      onEditar={() => { const it = ficha; setFichaId(null); onEditar(it); }}
      onRestock={() => { const it = ficha; setFichaId(null); onRestock(it); }}
      onEliminar={() => { const it = ficha; onEliminar([it.id], () => setFichaId(null), { confirmado: true }); }}
      onFotoActualizada={onFotoActualizada}
      onGuardado={onRecargar}
    />
  );

  // ── Computador ─────────────────────────────────────────────────────────
  if (esEscritorio) {
    const columnas = compacto
      ? '28px 46px minmax(160px, 2.4fr) minmax(130px, 1.3fr) 96px 120px 104px'
      : '28px 46px minmax(180px, 2.6fr) minmax(140px, 1.3fr) 96px 120px 120px 84px 104px';
    const todosMarcados = filtrados.length > 0 && filtrados.every((it) => seleccion.includes(it.id));

    return (
      <FondoApp escritorio>
        {/* ── Título · buscar · ajustes · nuevo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TituloPantalla escritorio>Inventario</TituloPantalla>
          <span style={{ flex: 1 }} />
          <Input
            allowClear
            placeholder="Buscar nombre, SKU, código de barras…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA); }}
            style={{ width: 300, borderRadius: 18 }}
          />
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{ items: [{ key: 'r', icon: <ReloadOutlined />, label: 'Actualizar', onClick: onRecargar }] }}
          >
            <span><BotonCircular label="Opciones"><SettingOutlined /></BotonCircular></span>
          </Dropdown>
          <BotonPrincipal onClick={onNuevo} style={{ height: 42, padding: '0 18px', borderRadius: 21, fontSize: 14.5 }}>
            <PlusOutlined /> Nuevo
          </BotonPrincipal>
        </div>

        {/* ── Resumen · stock bajo ── */}
        <div style={{ display: 'grid', gridTemplateColumns: compacto ? 'minmax(0, 1fr)' : 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 28, alignItems: 'center', marginTop: 22 }}>
          <div>
            {avisoStock}
            <div style={{ marginTop: 4 }}>{resumen}</div>
            <div style={{ maxWidth: 520, marginTop: 16 }}>{pildoras}</div>
          </div>

          <div style={{ borderRadius: 22, padding: 20, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--qc-text)' }}>Stock bajo</div>
              {bajos.length > 0 && <span style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>{bajos.length} {bajos.length === 1 ? 'producto' : 'productos'}</span>}
            </div>
            {bajos.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 4 }}>
                {productos.length === 0
                  ? 'Cuando tengas productos con stock mínimo, aquí verás los que toca reponer.'
                  : 'Todo en orden: ningún producto llegó a su stock mínimo.'}
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                {bajos.slice(0, 4).map((it) => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <IconoItem it={it} size={36} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nombre}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: COLOR_SIGNO.gasto }}>Quedan {Number(it.cantidad ?? 0)} · mínimo {it.stock_minimo}</span>
                    </span>
                    <ChipOpcion onClick={() => onRestock(it)} style={{ minHeight: 34, padding: '0 12px', fontSize: 13 }}>
                      <ShoppingCartOutlined /> Comprar
                    </ChipOpcion>
                  </div>
                ))}
                {bajos.length > 4 && (
                  <Button type="link" style={{ padding: 0 }} onClick={() => setSoloBajo(true)}>Ver los {bajos.length}</Button>
                )}
              </div>
            )}
          </div>
        </div>

        {barrasJsx}

        {/* ── Filtros en línea ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
          <Select
            allowClear
            showSearch
            placeholder="Categoría"
            style={{ width: 220 }}
            value={categoria ?? undefined}
            onChange={(v) => { setCategoria(v ?? null); setLimite(POR_PAGINA); }}
            options={[
              ...barras.filter((b) => b.clave !== SIN_CATEGORIA).map((b) => ({ value: b.clave, label: b.nombre })),
              { value: SIN_CATEGORIA, label: 'Sin categoría' },
            ]}
            optionRender={(o) => <ChipCategoria nombre={o.value === SIN_CATEGORIA ? null : o.value} />}
          />
          {bajos.length > 0 && (
            <ChipOpcion activo={soloBajo} onClick={() => setSoloBajo((v) => !v)} style={{ minHeight: 32, fontSize: 13 }}>
              <WarningFilled /> Stock bajo
            </ChipOpcion>
          )}
          {hayFiltros && <Button type="link" onClick={limpiar}>Limpiar</Button>}
          <span style={{ flex: 1 }} />
          {seleccion.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={eliminarSeleccion} style={{ borderRadius: 18 }}>
              Eliminar {seleccion.length}
            </Button>
          )}
        </div>

        {/* ── Lista por categoría, con columnas ── */}
        {errorJsx || (cargando ? (
          <div style={{ marginTop: 20 }}><Skeleton active avatar paragraph={{ rows: 3 }} /></div>
        ) : filtrados.length === 0 ? vacio : (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: columnas, gap: 14, alignItems: 'center', padding: '0 12px 6px', fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)' }}>
              <Checkbox
                checked={todosMarcados}
                indeterminate={!todosMarcados && seleccion.length > 0}
                onChange={(e) => setSeleccion(e.target.checked ? filtrados.map((it) => it.id) : [])}
                aria-label="Seleccionar todos"
              />
              <span />
              <span>Nombre</span>
              <span>Categoría</span>
              <span>Stock</span>
              {!compacto && <span style={{ textAlign: 'right' }}>Compra</span>}
              <span style={{ textAlign: 'right' }}>Venta</span>
              {!compacto && <span>Margen</span>}
              <span />
            </div>
            {grupos.map((g) => (
              <div key={g.clave}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 12px 6px', fontSize: 14, color: 'var(--qc-text-muted)' }}>
                  <span>{g.nombre}</span>
                  <span>{totalPorCategoria[g.clave]}</span>
                </div>
                {g.items.map((it) => {
                  const detalle = [it.sku ? `SKU ${it.sku}` : null, it.codigo_barras, esServicio(it) ? 'Servicio' : null].filter(Boolean).join(' · ');
                  return (
                    <div
                      key={it.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setFichaId(it.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setFichaId(it.id); }}
                      className="qc-mov-fila"
                      style={{
                        display: 'grid', gridTemplateColumns: columnas, gap: 14, alignItems: 'center',
                        padding: '8px 12px', borderRadius: 16, cursor: 'pointer',
                      }}
                    >
                      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Checkbox checked={seleccion.includes(it.id)} onChange={() => alternarSeleccion(it.id)} aria-label={`Seleccionar ${it.nombre}`} />
                      </span>
                      <IconoItem it={it} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nombre}</span>
                        {detalle && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detalle}</span>}
                      </span>
                      <span style={{ minWidth: 0 }}><CategoriaCell item={it} onSaved={onRecargar} /></span>
                      <span>
                        {esServicio(it)
                          ? <span style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>—</span>
                          : <StockCell item={it} onSaved={onRecargar} />}
                      </span>
                      {!compacto && (
                        <span style={{ textAlign: 'right', fontSize: 13.5, color: 'var(--qc-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {Number(it.precio_compra_unitario) > 0 ? montoCorto(it.precio_compra_unitario) : '—'}
                        </span>
                      )}
                      <span style={{ display: 'flex', justifyContent: 'flex-end' }}><PastillaMonto>{montoCorto(it.monto)}</PastillaMonto></span>
                      {!compacto && <span><MargenChip compra={Number(it.precio_compra_unitario)} venta={Number(it.monto)} /></span>}
                      <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        {!esServicio(it) && (
                          <Tooltip title="Registrar compra">
                            <Button type="text" shape="circle" size="small" icon={<ShoppingCartOutlined />} onClick={() => onRestock(it)} />
                          </Tooltip>
                        )}
                        <Tooltip title="Editar">
                          <Button type="text" shape="circle" size="small" icon={<EditOutlined />} onClick={() => onEditar(it)} />
                        </Tooltip>
                        <Popconfirm title="¿Eliminar este ítem?" okText="Eliminar" okButtonProps={{ danger: true }} cancelText="Cancelar" onConfirm={() => onEliminar([it.id], null, { confirmado: true })}>
                          <Tooltip title="Eliminar">
                            <Button type="text" shape="circle" size="small" icon={<DeleteOutlined />} />
                          </Tooltip>
                        </Popconfirm>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {verMas}
          </div>
        ))}
        {fichaJsx}
      </FondoApp>
    );
  }

  // ── Celular ────────────────────────────────────────────────────────────
  return (
    <FondoApp>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TituloPantalla>Inventario</TituloPantalla>
        <span style={{ flex: 1 }} />
        <BotonCircular label="Opciones" onClick={() => setMenuAbierto(true)} activo={!!hayFiltros}><SettingOutlined /></BotonCircular>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0 18px' }}>
        {avisoStock}
        <div style={{ marginTop: 2 }}>{resumen}</div>
      </div>

      {pildoras}

      {busquedaAbierta && (
        <Input
          autoFocus
          allowClear
          size="large"
          placeholder="Buscar nombre, SKU, código…"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA); }}
          style={{ marginTop: 12, borderRadius: 22, fontSize: 16 }}
        />
      )}
      {chipsFiltro}
      {barrasJsx}

      {errorJsx || (cargando ? (
        <div style={{ marginTop: 20 }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ padding: '10px 0' }}><Skeleton active avatar paragraph={{ rows: 1 }} title={false} /></div>)}
        </div>
      ) : filtrados.length === 0 ? vacio : (
        <div style={{ marginTop: 10 }}>
          {grupos.map((g) => (
            <div key={g.clave}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 2px 4px', fontSize: 14, color: 'var(--qc-text-muted)' }}>
                <span>{g.nombre}</span>
                <span>{totalPorCategoria[g.clave]}</span>
              </div>
              {g.items.map((it) => {
                const bajo = esStockBajo(it);
                return (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFichaId(it.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFichaId(it.id); } }}
                    className="qc-mov-fila"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', margin: '0 -4px', borderRadius: 16, cursor: 'pointer' }}
                  >
                    <IconoItem it={it} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nombre}</span>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {esServicio(it) ? 'Servicio' : (
                          <span style={{ color: bajo ? COLOR_SIGNO.gasto : undefined, fontWeight: bajo ? 600 : 400 }}>
                            {bajo && <WarningFilled />} Stock {Number(it.cantidad ?? 0)}
                          </span>
                        )}
                        {it.sku ? ` · ${it.sku}` : ''}
                      </span>
                    </span>
                    <PastillaMonto>{montoCorto(it.monto)}</PastillaMonto>
                  </div>
                );
              })}
            </div>
          ))}
          {verMas}
        </div>
      ))}

      <BotonesFlotantes
        onBuscar={() => { if (busquedaAbierta) setBusqueda(''); setBusquedaAbierta((v) => !v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        buscando={busquedaAbierta}
        onPrincipal={onNuevo}
        labelPrincipal="Nuevo producto o servicio"
      />

      <BottomSheet open={menuAbierto} onClose={() => setMenuAbierto(false)} title="Inventario">
        {bajos.length > 0 && (
          <OpcionMenu icon={<WarningFilled />} titulo={soloBajo ? 'Ver todo el inventario' : 'Ver solo stock bajo'} detalle={`${bajos.length} por reponer`}
            onClick={() => { setSoloBajo((v) => !v); setMenuAbierto(false); }} />
        )}
        {hayFiltros && <OpcionMenu icon={<TagOutlined />} titulo="Quitar filtros" onClick={() => { limpiar(); setMenuAbierto(false); }} />}
        <OpcionMenu icon={<ReloadOutlined />} titulo="Actualizar" onClick={() => { setMenuAbierto(false); onRecargar(); }} />
      </BottomSheet>

      {fichaJsx}
    </FondoApp>
  );
};

export default InventarioVista;
