import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, DatePicker, Input, Select, Skeleton, message } from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, AudioOutlined, BankOutlined, BarChartOutlined,
  CalendarOutlined, CloseOutlined, DownloadOutlined, FilterOutlined, LeftOutlined,
  MobileOutlined, MoreOutlined, PaperClipOutlined, PlusOutlined, ReloadOutlined,
  RightOutlined, SearchOutlined, TableOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import dayjs from 'dayjs';

import BottomSheet from '../../common/BottomSheet';
import RegistroRapido, { COLOR_TIPO } from './RegistroRapido';
import useDictado from './useDictado';
import { emojiInicial, normalizar } from './interpretarMovimiento';
import { EtiquetaChip } from '../components/EtiquetasSelector';
import EstadisticasMovimientos from '../EstadisticasMovimientos';
import useEnvioDocumentos from '../useEnvioDocumentos';
import { clienteDe, conceptoDe, itemsDe } from '../movimientos';
import { generarPdfMovimientos } from '../movimientosPdf';
import { cuentaOptions } from '../options';
import useCurrency, { useAmountShort, useTypedAmount } from '../../../hooks/useCurrency';
import { getAllEgresos, getEgresoCategorias } from '../../../services/controlapos/posService';
import { usePwaInstall } from '../../../services/pwa/pwa';
import { MOBILE_NAV_HEIGHT } from '../../Sidebar/MobileBottomNav';

// Alto de la barra de registro que flota sobre la barra de navegación.
const ALTO_BARRA = 58;
const SIN_ETIQUETA = 'sin';
const POR_PAGINA = 80;
const CLAVE_VISTA = 'qc-movimientos-mostrar';
const CLAVE_BANNER = 'qc-pwa-banner-oculto';

const leerLocal = (clave, porDefecto) => { try { return localStorage.getItem(clave) ?? porDefecto; } catch { return porDefecto; } };
const guardarLocal = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } };

const capitalizar = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ── Periodos ──────────────────────────────────────────────────────────────
// La semana va de lunes a domingo (isoWeek): no depende del locale de moment,
// que en desarrollo no carga (ver gotcha en TransactionTable).
const ATAJOS = [
  { key: 'hoy', label: 'Hoy', rango: () => [moment().startOf('day'), moment().endOf('day')] },
  { key: 'ayer', label: 'Ayer', rango: () => [moment().subtract(1, 'day').startOf('day'), moment().subtract(1, 'day').endOf('day')] },
  { key: 'semana', label: 'Esta semana', rango: () => [moment().startOf('isoWeek'), moment().endOf('isoWeek')] },
  { key: 'mes', label: 'Este mes', rango: () => [moment().startOf('month'), moment().endOf('month')] },
  { key: 'mes_pasado', label: 'Mes pasado', rango: () => [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')] },
  { key: 'anio', label: 'Este año', rango: () => [moment().startOf('year'), moment().endOf('year')] },
];

const UNIDADES = ['day', 'isoWeek', 'month', 'year'];
const unidadDe = ([a, b]) => UNIDADES.find((u) => (
  a.isSame(a.clone().startOf(u), 'second') && b.isSame(a.clone().endOf(u), 'second')
)) || null;

const fmt = (d, opciones) => new Intl.DateTimeFormat('es-CO', opciones).format(d.toDate()).replace(/\./g, '');
const fechaCorta = (d) => fmt(d, { day: 'numeric', month: 'short' });

const nombrePeriodo = (rango) => {
  const [a, b] = rango;
  const hoy = moment();
  switch (unidadDe(rango)) {
    case 'day':
      if (a.isSame(hoy, 'day')) return 'Hoy';
      if (a.isSame(hoy.clone().subtract(1, 'day'), 'day')) return 'Ayer';
      return capitalizar(fmt(a, { weekday: 'short', day: 'numeric', month: 'short' }));
    case 'isoWeek':
      return a.isSame(hoy, 'isoWeek') ? 'Esta semana' : `Semana del ${fechaCorta(a)}`;
    case 'month':
      return capitalizar(fmt(a, { month: 'long', year: 'numeric' }));
    case 'year':
      return String(a.year());
    default:
      return `${fechaCorta(a)} – ${fechaCorta(b)}`;
  }
};

const nombreDia = (d) => {
  const hoy = moment();
  if (d.isSame(hoy, 'day')) return 'Hoy';
  if (d.isSame(hoy.clone().subtract(1, 'day'), 'day')) return 'Ayer';
  const base = capitalizar(fmt(d, { weekday: 'long', day: 'numeric', month: 'short' }));
  return d.isSame(hoy, 'year') ? base : `${base} ${d.year()}`;
};

// ── Piezas visuales ───────────────────────────────────────────────────────
const Circulo = ({ fondo, color, children, size = 40 }) => (
  <span style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: fondo, color, fontSize: size * 0.42, fontWeight: 700, lineHeight: 1,
  }}>
    {children}
  </span>
);

// Ícono de una etiqueta: su emoji si el nombre empieza con uno ("🍔 Comida"),
// si no, la inicial sobre su color.
const IconoEtiqueta = ({ nombre, color, size = 40 }) => {
  const emoji = emojiInicial(nombre);
  if (emoji) return <Circulo fondo={`${color || '#475569'}26`} size={size}>{emoji}</Circulo>;
  const inicial = String(nombre || '').trim().charAt(0).toUpperCase() || '·';
  return <Circulo fondo={color || '#475569'} color="#fff" size={size}>{inicial}</Circulo>;
};

const IconoMovimiento = ({ m }) => {
  if (m.tipo === 'gasto') {
    return m.raw.categoria_nombre
      ? <IconoEtiqueta nombre={m.raw.categoria_nombre} color={m.raw.categoria_color} />
      : <Circulo fondo="var(--qc-surface-2)" color="var(--qc-text-muted)"><ArrowDownOutlined /></Circulo>;
  }
  return <Circulo fondo="rgba(22,163,74,0.14)" color="#16a34a"><ArrowUpOutlined /></Circulo>;
};

const BotonIcono = ({ onClick, label, children, activo }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    style={{
      width: 38, height: 38, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
      border: `1px solid ${activo ? 'var(--qc-azul)' : 'var(--qc-border)'}`,
      background: activo ? 'var(--qc-azul-suave)' : 'var(--qc-surface)',
      color: activo ? 'var(--qc-azul)' : 'var(--qc-text)',
    }}
  >
    {children}
  </button>
);

const OpcionMenu = ({ icon, titulo, detalle, onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className="qc-mov-fila"
    style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 4px',
      border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderRadius: 10,
    }}
  >
    <span style={{
      width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 17,
      background: color ? `${color}1a` : 'var(--qc-azul-suave)', color: color || 'var(--qc-azul)',
    }}>
      {icon}
    </span>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>{titulo}</span>
      {detalle && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{detalle}</span>}
    </span>
  </button>
);

const ChipFiltro = ({ children, onQuitar }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 6px 0 12px',
    borderRadius: 15, fontSize: 13, fontWeight: 600, flexShrink: 0,
    background: 'var(--qc-azul-suave)', color: 'var(--qc-azul)',
  }}>
    {children}
    <button
      type="button"
      onClick={onQuitar}
      aria-label="Quitar filtro"
      style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 2, display: 'flex' }}
    >
      <CloseOutlined style={{ fontSize: 11 }} />
    </button>
  </span>
);

/**
 * Movimientos en el celular, pensado para anotar ingresos y gastos al instante
 * (como MonAi): resumen del periodo, en qué se fue la plata, la lista por día y
 * una barra abajo para escribir o dictar "almuerzo 25000".
 *
 * No reemplaza funciones: filtros, búsqueda, PDF, estadísticas, saldo inicial,
 * envío de certificados y el formulario completo siguen aquí (menú ⋯), y la
 * vista clásica de tabla queda a un toque.
 */
const MovimientosMobile = ({
  user,
  loading,
  ingresos = [],
  egresos = [],
  saldo,
  dateRange,
  onDateRangeChange,
  onRefresh,
  inventario = [],
  vendedores = [],
  onEditarCompleto,
  onConfigurarSaldo,
  onVistaClasica,
}) => {
  const fmtMoneda = useCurrency();
  const montoCorto = useAmountShort();
  const { codigo: codigoMoneda } = useTypedAmount();
  const location = useLocation();
  const navigate = useNavigate();
  const pwa = usePwaInstall();
  const dictado = useDictado();
  const envio = useEnvioDocumentos(inventario);

  const [mostrar, setMostrar] = useState(() => leerLocal(CLAVE_VISTA, 'todos'));
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({ cuenta: null, etiqueta: null, concepto: null, usuario: null });
  const [limite, setLimite] = useState(POR_PAGINA);
  const [verDesglose, setVerDesglose] = useState(false);
  const [hoja, setHoja] = useState({ open: false, tipo: 'gasto', texto: '', registro: null });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [periodoAbierto, setPeriodoAbierto] = useState(false);
  const [estadisticasAbiertas, setEstadisticasAbiertas] = useState(false);
  const [pasosIOS, setPasosIOS] = useState(false);
  const [bannerOculto, setBannerOculto] = useState(() => leerLocal(CLAVE_BANNER, '') === '1');
  const [rangoLibre, setRangoLibre] = useState([null, null]);

  const proxyRef = useRef(null);
  const receptorDictado = useRef(null);
  const toque = useRef(null);

  const cambiarMostrar = (v) => { setMostrar(v); guardarLocal(CLAVE_VISTA, v); setLimite(POR_PAGINA); };

  // ── Etiquetas del negocio e historial para sugerir (aprende del uso) ──
  const [etiquetas, setEtiquetas] = useState([]);
  const cargarEtiquetas = useCallback(() => {
    getEgresoCategorias()
      .then((d) => setEtiquetas(Array.isArray(d) ? d : []))
      .catch(() => { /* sin etiquetas igual se registra */ });
  }, []);
  useEffect(() => { cargarEtiquetas(); }, [cargarEtiquetas]);

  // Los gastos del periodo en pantalla pueden ser pocos: la primera vez que se
  // abre el registro se piden los últimos 6 meses para sugerir mejor.
  const [historialLargo, setHistorialLargo] = useState([]);
  const historialPedido = useRef(false);
  const cargarHistorial = () => {
    if (historialPedido.current) return;
    historialPedido.current = true;
    getAllEgresos({
      fecha_inicio: moment().subtract(180, 'days').startOf('day').toISOString(),
      fecha_fin: moment().endOf('day').toISOString(),
      tz_offset: new Date().getTimezoneOffset(),
    })
      .then((d) => setHistorialLargo(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => { historialPedido.current = false; });
  };

  const historial = useMemo(
    () => [...egresos, ...historialLargo]
      .filter((e) => e?.descripcion)
      .map((e) => ({ descripcion: e.descripcion, categoria_id: e.categoria_id ?? null })),
    [egresos, historialLargo],
  );

  // Productos más vendidos primero en el registro de ingresos.
  const usoProductos = useMemo(() => {
    const uso = {};
    ingresos.forEach((r) => itemsDe(r).forEach((it) => {
      if (it.inventario_id != null) uso[it.inventario_id] = (uso[it.inventario_id] || 0) + 1;
    }));
    return uso;
  }, [ingresos]);

  const userMap = useMemo(() => {
    const map = {};
    vendedores.forEach((u) => { map[String(u.id)] = u.name || u.nombre || `Usuario ${u.id}`; });
    return map;
  }, [vendedores]);
  const variosUsuarios = vendedores.length > 1;

  // ── Movimientos unificados (ingresos + gastos) ──
  const movimientos = useMemo(() => {
    const ing = ingresos.map((r) => {
      // "Cliente General" es el relleno de una venta sin cliente: no se muestra.
      const cliente = r.persona_id != null || (r.numeroDeDocumento && r.numeroDeDocumento !== '0') ? clienteDe(r) : '';
      return {
        tipo: 'ingreso',
        id: `i-${r._id}`,
        fecha: moment(r.createdAt),
        valor: Number(r.valor) || 0,
        titulo: conceptoDe(r) || cliente || 'Ingreso',
        cliente,
        raw: r,
      };
    });
    const egr = egresos.map((r) => ({
      tipo: 'gasto',
      id: `e-${r._id}`,
      fecha: moment(r.fecha),
      valor: Number(r.valor) || 0,
      titulo: r.descripcion || 'Gasto',
      raw: r,
    }));
    return [...ing, ...egr].sort((a, b) => b.fecha.valueOf() - a.fecha.valueOf());
  }, [ingresos, egresos]);

  // Búsqueda y filtros (valen para los totales y para la lista).
  const q = normalizar(busqueda);
  const filtrados = useMemo(() => movimientos.filter((m) => {
    const r = m.raw;
    if (filtros.cuenta && r.cuenta !== filtros.cuenta) return false;
    if (filtros.usuario && String(r.usuario) !== String(filtros.usuario)) return false;
    if (filtros.etiqueta != null) {
      if (m.tipo !== 'gasto') return false;
      if (String(r.categoria_id ?? SIN_ETIQUETA) !== String(filtros.etiqueta)) return false;
    }
    if (filtros.concepto != null) {
      if (m.tipo !== 'ingreso') return false;
      if ((conceptoDe(r) || 'Sin concepto') !== filtros.concepto) return false;
    }
    if (q) {
      const texto = normalizar([
        m.titulo, r.descripcion, r.categoria_nombre, clienteDe(r), r.cliente_documento,
        r.numeroDeDocumento, r.payment_reference, r.cuenta,
      ].filter(Boolean).join(' '));
      if (!texto.includes(q)) return false;
    }
    return true;
  }), [movimientos, filtros, q]);

  const totales = useMemo(() => {
    let ing = 0; let gas = 0; let nIng = 0; let nGas = 0;
    filtrados.forEach((m) => {
      if (m.tipo === 'ingreso') { ing += m.valor; nIng += 1; } else { gas += m.valor; nGas += 1; }
    });
    return { ingresos: ing, gastos: gas, balance: ing - gas, nIng, nGas };
  }, [filtrados]);

  const listados = useMemo(
    () => (mostrar === 'todos' ? filtrados : filtrados.filter((m) => m.tipo === (mostrar === 'gastos' ? 'gasto' : 'ingreso'))),
    [filtrados, mostrar],
  );

  // Por día, con el total de cada día en el encabezado.
  const grupos = useMemo(() => {
    const mapa = new Map();
    listados.slice(0, limite).forEach((m) => {
      const clave = m.fecha.format('YYYY-MM-DD');
      if (!mapa.has(clave)) mapa.set(clave, { clave, fecha: m.fecha, items: [], ingresos: 0, gastos: 0 });
      const g = mapa.get(clave);
      g.items.push(m);
      if (m.tipo === 'ingreso') g.ingresos += m.valor; else g.gastos += m.valor;
    });
    return [...mapa.values()];
  }, [listados, limite]);

  // En qué se fue la plata (gastos por etiqueta) o de dónde entró (ingresos por concepto).
  const desglose = useMemo(() => {
    const deIngresos = mostrar === 'ingresos';
    const mapa = new Map();
    filtrados.forEach((m) => {
      if (deIngresos ? m.tipo !== 'ingreso' : m.tipo !== 'gasto') return;
      const r = m.raw;
      const clave = deIngresos ? (conceptoDe(r) || 'Sin concepto') : String(r.categoria_id ?? SIN_ETIQUETA);
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          nombre: deIngresos ? clave : (r.categoria_nombre || 'Sin etiqueta'),
          color: deIngresos ? '#16a34a' : (r.categoria_id != null ? (r.categoria_color || '#475569') : '#9ca3af'),
          conEtiqueta: !deIngresos && r.categoria_id != null,
          total: 0,
          n: 0,
        });
      }
      const d = mapa.get(clave);
      d.total += m.valor;
      d.n += 1;
    });
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [filtrados, mostrar]);
  const totalDesglose = desglose.reduce((s, d) => s + d.total, 0);

  // Saldo acumulado (lo que viene de meses anteriores + este periodo).
  const saldoAnterior = saldo && saldo.saldo_anterior != null ? Number(saldo.saldo_anterior) : null;
  const ocultas = saldo?.tarjetas_ocultas || [];
  const mostrarSaldo = saldoAnterior !== null && !ocultas.includes('saldo_final');
  const saldoFinal = mostrarSaldo ? saldoAnterior + totales.balance : null;

  // ── Periodo ──
  const unidad = unidadDe(dateRange);
  const moverPeriodo = (delta) => {
    const u = unidad || 'month';
    const paso = u === 'isoWeek' ? 'week' : u;
    const inicio = dateRange[0].clone().add(delta, paso).startOf(u);
    if (delta > 0 && inicio.isAfter(moment())) return;
    onDateRangeChange([inicio, inicio.clone().endOf(u)]);
    setLimite(POR_PAGINA);
  };
  const haySiguiente = !dateRange[0].clone().add(1, unidad === 'isoWeek' ? 'week' : (unidad || 'month')).startOf(unidad || 'month').isAfter(moment());
  const elegirAtajo = (a) => { onDateRangeChange(a.rango()); setPeriodoAbierto(false); setLimite(POR_PAGINA); };
  const aplicarRangoLibre = () => {
    const [a, b] = rangoLibre;
    if (!a || !b) { message.info('Elige las dos fechas'); return; }
    const [ini, fin] = a.isAfter(b) ? [b, a] : [a, b];
    onDateRangeChange([moment(ini.toDate()).startOf('day'), moment(fin.toDate()).endOf('day')]);
    setPeriodoAbierto(false);
    setLimite(POR_PAGINA);
  };

  // Deslizar el resumen a los lados cambia de periodo.
  const alTocar = (e) => { const t = e.touches[0]; toque.current = { x: t.clientX, y: t.clientY }; };
  const alSoltar = (e) => {
    const ini = toque.current;
    toque.current = null;
    if (!ini) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) moverPeriodo(dx < 0 ? 1 : -1);
  };

  // ── Registro ──
  const tipoPorDefecto = mostrar === 'ingresos' ? 'ingreso' : 'gasto';
  const abrirRegistro = ({ tipo, texto = '', registro = null, conDictado = false } = {}) => {
    // iPhone: el teclado solo abre si algo se enfoca dentro del toque. Se enfoca
    // un campo invisible ya mismo y la hoja pasa el foco a su campo al abrir.
    if (!registro && !conDictado) proxyRef.current?.focus({ preventScroll: true });
    cargarHistorial();
    setHoja({ open: true, tipo: tipo || tipoPorDefecto, texto, registro });
    if (conDictado) dictado.iniciar((t) => receptorDictado.current?.(t));
  };
  const cerrarRegistro = () => {
    dictado.detener();
    setHoja((h) => ({ ...h, open: false }));
  };

  const abrirMovimiento = (m) => {
    // Ventas con varios productos o cantidades: su edición vive en el formulario completo.
    if (m.tipo === 'ingreso') {
      const items = itemsDe(m.raw);
      if (items.length > 1 || items.some((it) => Number(it.cantidad) > 1)) {
        onEditarCompleto('ingreso', m.raw);
        return;
      }
    }
    abrirRegistro({ registro: { tipo: m.tipo, raw: m.raw } });
  };

  // Accesos directos del ícono instalado: /inicio/certificados?nuevo=gasto
  useEffect(() => {
    const nuevo = new URLSearchParams(location.search).get('nuevo');
    if (nuevo === 'gasto' || nuevo === 'ingreso') {
      abrirRegistro({ tipo: nuevo });
      navigate(location.pathname, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const descargarPdf = (type) => {
    const registros = filtrados
      .filter((m) => m.tipo === (type === 'ingresos' ? 'ingreso' : 'gasto'))
      .map((m) => m.raw);
    if (!registros.length) { message.info(`No hay ${type === 'ingresos' ? 'ingresos' : 'gastos'} para exportar`); return; }
    generarPdfMovimientos({ type, registros, dateRange, userMap, fmt: fmtMoneda });
    setMenuAbierto(false);
  };

  const instalar = async () => {
    setMenuAbierto(false);
    if (pwa.puedeInstalar) {
      const ok = await pwa.instalar();
      if (ok) message.success('¡Listo! Rapictrl quedó en tu pantalla de inicio');
    } else if (pwa.necesitaPasosIOS) {
      setPasosIOS(true);
    }
  };
  const ocultarBanner = () => { setBannerOculto(true); guardarLocal(CLAVE_BANNER, '1'); };

  const alternarFiltroDesglose = (d) => {
    if (mostrar === 'ingresos') setFiltros((f) => ({ ...f, concepto: f.concepto === d.clave ? null : d.clave }));
    else setFiltros((f) => ({ ...f, etiqueta: String(f.etiqueta) === d.clave ? null : d.clave }));
  };

  const hayFiltros = filtros.cuenta || filtros.etiqueta != null || filtros.concepto != null || filtros.usuario;
  const nombreEtiquetaFiltro = filtros.etiqueta === SIN_ETIQUETA
    ? 'Sin etiqueta'
    : (etiquetas.find((e) => String(e.id) === String(filtros.etiqueta))?.nombre
      || egresos.find((e) => String(e.categoria_id) === String(filtros.etiqueta))?.categoria_nombre
      || 'Etiqueta');

  const conceptos = useMemo(
    () => [...new Set(ingresos.map((r) => conceptoDe(r) || 'Sin concepto'))].sort((a, b) => a.localeCompare(b, 'es')),
    [ingresos],
  );

  const ofrecerInstalar = !pwa.instalada && (pwa.puedeInstalar || pwa.necesitaPasosIOS);
  const periodo = nombrePeriodo(dateRange);
  // Al recargar tras guardar, la lista se queda donde estaba (sin "cargando"
  // que la encoja y la mande arriba): el esqueleto es solo para la primera carga.
  const cargando = loading && movimientos.length === 0;

  // ── Resumen (tarjeta principal) ──
  const hero = (() => {
    if (mostrar === 'gastos') {
      return { titulo: `Gastos · ${periodo}`, valor: totales.gastos, signo: '', pie: `${totales.nGas} gasto${totales.nGas === 1 ? '' : 's'}` };
    }
    if (mostrar === 'ingresos') {
      return { titulo: `Ingresos · ${periodo}`, valor: totales.ingresos, signo: '', pie: `${totales.nIng} ingreso${totales.nIng === 1 ? '' : 's'}` };
    }
    return { titulo: `Balance · ${periodo}`, valor: Math.abs(totales.balance), signo: totales.balance < 0 ? '−' : '', pie: null };
  })();

  return (
    <div style={{ paddingBottom: ALTO_BARRA + 20 }}>
      {/* Campo invisible para abrir el teclado del iPhone desde el toque (ver abrirRegistro) */}
      <input
        ref={proxyRef}
        aria-hidden
        tabIndex={-1}
        readOnly={false}
        style={{
          position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0,
          fontSize: 16, border: 0, padding: 0, pointerEvents: 'none',
        }}
      />

      {/* ── Instalar como app ── */}
      {ofrecerInstalar && !bannerOculto && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 14px', marginBottom: 12,
          borderRadius: 16, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
        }}>
          <img src="/icons/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--qc-text)' }}>Instala Rapictrl en tu celular</div>
            <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>Ábrela como app y anota tus gastos en segundos.</div>
          </div>
          <Button type="primary" shape="round" onClick={instalar}>Instalar</Button>
          <button
            type="button"
            onClick={ocultarBanner}
            aria-label="No mostrar más"
            style={{ border: 'none', background: 'none', color: 'var(--qc-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <CloseOutlined />
          </button>
        </div>
      )}

      {/* ── Periodo + acciones ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, height: 40, borderRadius: 12,
          background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
        }}>
          <button type="button" aria-label="Periodo anterior" onClick={() => moverPeriodo(-1)}
            style={{ width: 38, height: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--qc-text)' }}>
            <LeftOutlined />
          </button>
          <button type="button" onClick={() => setPeriodoAbierto(true)}
            style={{
              flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
            {periodo}
          </button>
          <button type="button" aria-label="Periodo siguiente" onClick={() => moverPeriodo(1)} disabled={!haySiguiente}
            style={{
              width: 38, height: '100%', border: 'none', background: 'none', color: 'var(--qc-text)',
              cursor: haySiguiente ? 'pointer' : 'not-allowed', opacity: haySiguiente ? 1 : 0.3,
            }}>
            <RightOutlined />
          </button>
        </div>
        <BotonIcono label="Buscar" activo={busquedaAbierta || !!busqueda} onClick={() => { setBusquedaAbierta((v) => !v); if (busquedaAbierta) setBusqueda(''); }}>
          <SearchOutlined />
        </BotonIcono>
        <BotonIcono label="Más opciones" onClick={() => setMenuAbierto(true)}>
          <MoreOutlined />
        </BotonIcono>
      </div>

      {busquedaAbierta && (
        <Input
          autoFocus
          allowClear
          size="large"
          prefix={<SearchOutlined style={{ color: 'var(--qc-text-muted)' }} />}
          placeholder="Buscar descripción, cliente, etiqueta…"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA); }}
          style={{ marginBottom: 12, borderRadius: 12, fontSize: 16 }}
        />
      )}

      {hayFiltros && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
          {filtros.cuenta && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, cuenta: null }))}>{filtros.cuenta}</ChipFiltro>}
          {filtros.etiqueta != null && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, etiqueta: null }))}>{nombreEtiquetaFiltro}</ChipFiltro>}
          {filtros.concepto != null && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, concepto: null }))}>{filtros.concepto}</ChipFiltro>}
          {filtros.usuario && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, usuario: null }))}>{userMap[String(filtros.usuario)] || 'Usuario'}</ChipFiltro>}
        </div>
      )}

      {/* ── Todos / Gastos / Ingresos ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4, marginBottom: 12,
        borderRadius: 14, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
      }}>
        {[['todos', 'Todos'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos']].map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => cambiarMostrar(v)}
            aria-pressed={mostrar === v}
            style={{
              height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: mostrar === v ? '#1d4ed8' : 'transparent',
              color: mostrar === v ? '#fff' : 'var(--qc-text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Resumen del periodo (se desliza para cambiar de periodo) ── */}
      <div
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
        style={{
          borderRadius: 20, padding: '18px 18px 16px', marginBottom: 14, color: '#fff',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)',
          boxShadow: '0 10px 30px rgba(29,78,216,0.25)',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>{hero.titulo}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4, minWidth: 0 }}>
          <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 700 }}>{codigoMoneda}</span>
          <span style={{
            fontSize: 34, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: hero.signo ? '#fecaca' : '#fff',
          }}>
            {cargando ? '…' : `${hero.signo}${montoCorto(hero.valor)}`}
          </span>
        </div>

        {mostrar === 'todos' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            {[
              { label: 'Ingresos', valor: totales.ingresos, icon: <ArrowUpOutlined />, color: '#86efac', ir: 'ingresos' },
              { label: 'Gastos', valor: totales.gastos, icon: <ArrowDownOutlined />, color: '#fca5a5', ir: 'gastos' },
            ].map((x) => (
              <button
                key={x.label}
                type="button"
                onClick={() => cambiarMostrar(x.ir)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.12)', color: '#fff', minWidth: 0,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: x.color }}>{x.icon}</span>{x.label}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {montoCorto(x.valor)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{hero.pie}</div>
        )}

        {mostrarSaldo && (
          <button
            type="button"
            onClick={onConfigurarSaldo}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
              marginTop: 12, paddingTop: 10, border: 'none', borderTop: '1px solid rgba(255,255,255,0.18)',
              background: 'none', color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            <span style={{ opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}><BankOutlined /> Saldo acumulado</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: saldoFinal < 0 ? '#fecaca' : '#fff' }}>
              {saldoFinal < 0 ? '−' : ''}{montoCorto(Math.abs(saldoFinal))}
            </span>
          </button>
        )}
      </div>

      {/* ── En qué se fue / de dónde entró ── */}
      {!cargando && desglose.length > 0 && (mostrar !== 'todos' || totales.nGas > 0) && (
        <div style={{
          borderRadius: 18, padding: '14px 14px 8px', marginBottom: 6,
          background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--qc-text)' }}>
              {mostrar === 'ingresos' ? 'De dónde entró' : 'En qué se fue'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>Toca para filtrar</span>
          </div>
          {desglose.slice(0, verDesglose ? undefined : 5).map((d) => {
            const pct = totalDesglose > 0 ? Math.round((d.total / totalDesglose) * 100) : 0;
            const activo = mostrar === 'ingresos' ? filtros.concepto === d.clave : String(filtros.etiqueta) === d.clave;
            return (
              <button
                key={d.clave}
                type="button"
                onClick={() => alternarFiltroDesglose(d)}
                className="qc-mov-fila"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 4px',
                  border: 'none', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                  background: activo ? 'var(--qc-azul-suave)' : 'transparent',
                }}
              >
                {mostrar === 'ingresos'
                  ? <Circulo fondo="rgba(22,163,74,0.14)" color="#16a34a" size={34}><ArrowUpOutlined /></Circulo>
                  : d.conEtiqueta
                    ? <IconoEtiqueta nombre={d.nombre} color={d.color} size={34} />
                    : <Circulo fondo="var(--qc-surface-2)" color="var(--qc-text-muted)" size={34}>?</Circulo>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.nombre}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {montoCorto(d.total)}
                    </span>
                  </span>
                  <span style={{ display: 'block', height: 6, borderRadius: 3, marginTop: 6, background: 'var(--qc-surface-2)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: 3, background: d.color }} />
                  </span>
                </span>
                <span style={{ width: 36, textAlign: 'right', fontSize: 12, color: 'var(--qc-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {pct}%
                </span>
              </button>
            );
          })}
          {desglose.length > 5 && (
            <Button type="link" block onClick={() => setVerDesglose((v) => !v)}>
              {verDesglose ? 'Ver menos' : `Ver todo (${desglose.length})`}
            </Button>
          )}
        </div>
      )}

      {/* ── Lista por día ── */}
      {cargando ? (
        <div style={{ marginTop: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ background: 'var(--qc-surface)', borderRadius: 16, padding: 14, marginBottom: 10, border: '1px solid var(--qc-border)' }}>
              <Skeleton active avatar paragraph={{ rows: 1 }} title={false} />
            </div>
          ))}
        </div>
      ) : listados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--qc-text-muted)' }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>
            {hayFiltros || q ? 'Nada coincide con la búsqueda' : `Sin movimientos en ${periodo.toLowerCase()}`}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {hayFiltros || q ? 'Prueba quitando filtros.' : 'Registra el primero con la barra de abajo.'}
          </div>
        </div>
      ) : (
        <>
          {grupos.map((g) => {
            const neto = mostrar === 'todos' ? g.ingresos - g.gastos : (mostrar === 'gastos' ? -g.gastos : g.ingresos);
            return (
              <div key={g.clave}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 4px 6px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--qc-text-muted)' }}>{nombreDia(g.fecha)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: neto > 0 ? '#16a34a' : 'var(--qc-text-muted)' }}>
                    {neto > 0 ? '+' : neto < 0 ? '−' : ''}{montoCorto(Math.abs(neto))}
                  </span>
                </div>
                <div style={{ background: 'var(--qc-surface)', borderRadius: 16, border: '1px solid var(--qc-border)', overflow: 'hidden' }}>
                  {g.items.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => abrirMovimiento(m)}
                      className="qc-mov-fila"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px',
                        border: 'none', borderTop: i > 0 ? '1px solid var(--qc-border)' : 'none',
                        background: 'transparent', textAlign: 'left', cursor: 'pointer',
                      }}
                    >
                      <IconoMovimiento m={m} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {m.titulo}
                        </span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12.5,
                          color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden',
                        }}>
                          {m.tipo === 'gasto' && m.raw.categoria_nombre && (
                            <EtiquetaChip nombre={m.raw.categoria_nombre} color={m.raw.categoria_color} size="sm" />
                          )}
                          {m.tipo === 'ingreso' && m.cliente && m.cliente !== m.titulo && (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.cliente}</span>
                          )}
                          <span>{m.raw.cuenta}</span>
                          {variosUsuarios && userMap[String(m.raw.usuario)] && (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>· {userMap[String(m.raw.usuario)]}</span>
                          )}
                          {m.raw.comprobante_url && <PaperClipOutlined />}
                        </span>
                      </span>
                      <span style={{
                        fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                        color: m.tipo === 'ingreso' ? COLOR_TIPO.ingreso : 'var(--qc-text)',
                      }}>
                        {m.tipo === 'ingreso' ? '+' : '−'}{montoCorto(m.valor)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {listados.length > limite && (
            <Button block size="large" onClick={() => setLimite((n) => n + POR_PAGINA)} style={{ marginTop: 14, borderRadius: 12 }}>
              Ver más ({listados.length - limite})
            </Button>
          )}
        </>
      )}

      {/* ── Barra para registrar (sobre la navegación inferior) ── */}
      <div style={{
        position: 'fixed', left: 12, right: 12, zIndex: 995,
        bottom: `calc(${MOBILE_NAV_HEIGHT + 10}px + env(safe-area-inset-bottom, 0px))`,
        height: ALTO_BARRA, display: 'flex', alignItems: 'center', gap: 6, padding: '0 7px',
        borderRadius: ALTO_BARRA / 2, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
      }}>
        {dictado.disponible && (
          <button
            type="button"
            aria-label="Dictar un movimiento"
            onClick={() => abrirRegistro({ conDictado: true })}
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
              background: 'var(--qc-surface-2)', color: 'var(--qc-text)',
            }}
          >
            <AudioOutlined />
          </button>
        )}
        <button
          type="button"
          onClick={() => abrirRegistro()}
          style={{
            flex: 1, minWidth: 0, height: 44, border: 'none', background: 'transparent', cursor: 'text',
            textAlign: 'left', padding: dictado.disponible ? '0 4px' : '0 12px', fontSize: 15,
            color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {mostrar === 'ingresos' ? 'Ej: venta curso 80.000' : 'Ej: almuerzo 25.000'}
        </button>
        <button
          type="button"
          aria-label={tipoPorDefecto === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'}
          onClick={() => abrirRegistro()}
          style={{
            width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            background: '#1d4ed8', color: '#fff', boxShadow: '0 4px 12px rgba(29,78,216,0.4)',
          }}
        >
          <PlusOutlined />
        </button>
      </div>

      {/* ── Registro rápido ── */}
      <RegistroRapido
        open={hoja.open}
        onClose={cerrarRegistro}
        tipoInicial={hoja.tipo}
        textoInicial={hoja.texto}
        registro={hoja.registro}
        etiquetas={etiquetas}
        historial={historial}
        inventario={inventario}
        usoProductos={usoProductos}
        userName={user?.name}
        onGuardado={() => onRefresh()}
        onEtiquetasCambiaron={() => { cargarEtiquetas(); onRefresh(); }}
        onAbrirCompleto={(tipo, valores) => { cerrarRegistro(); onEditarCompleto(tipo, valores); }}
        envio={envio}
        dictado={dictado}
        receptorDictado={receptorDictado}
        entradaPrevia={proxyRef}
      />
      {envio.modal}

      {/* ── Periodo ── */}
      <BottomSheet open={periodoAbierto} onClose={() => setPeriodoAbierto(false)} title="Periodo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ATAJOS.map((a) => {
            const [ini, fin] = a.rango();
            const activo = dateRange[0].isSame(ini, 'second') && dateRange[1].isSame(fin, 'second');
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => elegirAtajo(a)}
                style={{
                  height: 46, borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `1.5px solid ${activo ? 'var(--qc-azul)' : 'var(--qc-border)'}`,
                  background: activo ? 'var(--qc-azul-suave)' : 'var(--qc-surface)',
                  color: activo ? 'var(--qc-azul)' : 'var(--qc-text)',
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', margin: '18px 0 8px' }}>
          Personalizado
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <DatePicker
            inputReadOnly
            placeholder="Desde"
            format="DD/MM/YYYY"
            value={rangoLibre[0]}
            onChange={(d) => setRangoLibre(([, b]) => [d, b])}
            style={{ flex: 1, height: 42, borderRadius: 12 }}
          />
          <DatePicker
            inputReadOnly
            placeholder="Hasta"
            format="DD/MM/YYYY"
            value={rangoLibre[1]}
            onChange={(d) => setRangoLibre(([a]) => [a, d])}
            disabledDate={(d) => d && d.isAfter(dayjs().endOf('day'))}
            style={{ flex: 1, height: 42, borderRadius: 12 }}
          />
        </div>
        <Button block type="primary" size="large" icon={<CalendarOutlined />} onClick={aplicarRangoLibre} style={{ marginTop: 10, borderRadius: 12 }}>
          Ver ese rango
        </Button>
      </BottomSheet>

      {/* ── Menú ⋯ ── */}
      <BottomSheet open={menuAbierto} onClose={() => setMenuAbierto(false)} title="Movimientos">
        <OpcionMenu icon={<FilterOutlined />} titulo="Filtrar" detalle="Por cuenta, etiqueta, concepto o usuario"
          onClick={() => { setMenuAbierto(false); setFiltrosAbiertos(true); }} />
        <OpcionMenu icon={<BarChartOutlined />} titulo="Estadísticas" detalle="Gráficas de ingresos y gastos" color="#7c3aed"
          onClick={() => { setMenuAbierto(false); setEstadisticasAbiertas(true); }} />
        <OpcionMenu icon={<DownloadOutlined />} titulo="PDF de gastos" detalle={`${periodo} · con los filtros aplicados`} color="#dc2626"
          onClick={() => descargarPdf('egresos')} />
        <OpcionMenu icon={<DownloadOutlined />} titulo="PDF de ingresos" detalle={`${periodo} · con los filtros aplicados`} color="#16a34a"
          onClick={() => descargarPdf('ingresos')} />
        <OpcionMenu icon={<BankOutlined />} titulo="Saldo inicial y tarjetas" detalle="Punto de partida del saldo acumulado" color="#0891b2"
          onClick={() => { setMenuAbierto(false); onConfigurarSaldo(); }} />
        <OpcionMenu icon={<ReloadOutlined />} titulo="Actualizar" color="#475569"
          onClick={() => { setMenuAbierto(false); onRefresh(); }} />
        {ofrecerInstalar && (
          <OpcionMenu icon={<MobileOutlined />} titulo="Instalar la app" detalle="Ícono en tu pantalla de inicio" color="#ea580c" onClick={instalar} />
        )}
        <OpcionMenu icon={<TableOutlined />} titulo="Vista clásica" detalle="Tabla con todas las columnas" color="#475569"
          onClick={() => { setMenuAbierto(false); onVistaClasica(); }} />
      </BottomSheet>

      {/* ── Filtros ── */}
      <BottomSheet
        open={filtrosAbiertos}
        onClose={() => setFiltrosAbiertos(false)}
        title="Filtrar"
        extra={hayFiltros && (
          <Button type="link" onClick={() => setFiltros({ cuenta: null, etiqueta: null, concepto: null, usuario: null })}>Limpiar</Button>
        )}
        footer={<Button block type="primary" size="large" onClick={() => setFiltrosAbiertos(false)} style={{ borderRadius: 12 }}>Ver resultados</Button>}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', margin: '4px 0 8px' }}>Cuenta</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cuentaOptions.map((c) => {
            const activo = filtros.cuenta === c.value;
            return (
              <button key={c.value} type="button" onClick={() => setFiltros((f) => ({ ...f, cuenta: activo ? null : c.value }))}
                style={{
                  height: 38, padding: '0 14px', borderRadius: 19, cursor: 'pointer', fontSize: 14, fontWeight: activo ? 700 : 500,
                  border: `1.5px solid ${activo ? 'var(--qc-azul)' : 'var(--qc-border)'}`,
                  background: activo ? 'var(--qc-azul-suave)' : 'var(--qc-surface)', color: activo ? 'var(--qc-azul)' : 'var(--qc-text)',
                }}>
                {c.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', margin: '18px 0 8px' }}>Etiqueta (gastos)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {etiquetas.map((e) => (
            <EtiquetaChip
              key={e.id}
              nombre={e.nombre}
              color={e.color}
              selected={String(filtros.etiqueta) === String(e.id)}
              dimmed={filtros.etiqueta != null && String(filtros.etiqueta) !== String(e.id)}
              onClick={() => setFiltros((f) => ({ ...f, etiqueta: String(f.etiqueta) === String(e.id) ? null : String(e.id) }))}
            />
          ))}
          <EtiquetaChip
            nombre="Sin etiqueta"
            color="#9ca3af"
            selected={filtros.etiqueta === SIN_ETIQUETA}
            dimmed={filtros.etiqueta != null && filtros.etiqueta !== SIN_ETIQUETA}
            onClick={() => setFiltros((f) => ({ ...f, etiqueta: f.etiqueta === SIN_ETIQUETA ? null : SIN_ETIQUETA }))}
          />
        </div>

        {conceptos.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', margin: '18px 0 8px' }}>Concepto (ingresos)</div>
            <Select
              allowClear
              showSearch
              size="large"
              placeholder="Todos los conceptos"
              value={filtros.concepto ?? undefined}
              onChange={(v) => setFiltros((f) => ({ ...f, concepto: v ?? null }))}
              options={conceptos.map((c) => ({ value: c, label: c }))}
              style={{ width: '100%' }}
            />
          </>
        )}

        {variosUsuarios && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', margin: '18px 0 8px' }}>Registrado por</div>
            <Select
              allowClear
              size="large"
              placeholder="Todos los usuarios"
              value={filtros.usuario ?? undefined}
              onChange={(v) => setFiltros((f) => ({ ...f, usuario: v ?? null }))}
              options={vendedores.map((u) => ({ value: String(u.id), label: u.name || u.nombre || `Usuario ${u.id}` }))}
              style={{ width: '100%' }}
            />
          </>
        )}
      </BottomSheet>

      {/* ── Estadísticas ── */}
      <BottomSheet
        open={estadisticasAbiertas}
        onClose={() => setEstadisticasAbiertas(false)}
        title="Estadísticas"
        height="92%"
        maxHeight="none"
        extra={<Button shape="circle" icon={<CloseOutlined />} onClick={() => setEstadisticasAbiertas(false)} />}
        bodyStyle={{ padding: '0 0 calc(18px + env(safe-area-inset-bottom, 0px))' }}
      >
        <EstadisticasMovimientos />
      </BottomSheet>

      {/* ── Pasos para instalar en iPhone ── */}
      <BottomSheet open={pasosIOS} onClose={() => setPasosIOS(false)} title="Instalar en el iPhone">
        <ol style={{ paddingLeft: 20, margin: 0, color: 'var(--qc-text)', fontSize: 15, lineHeight: 1.7 }}>
          <li>Abre <b>app.rapictrl.com</b> en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
          <li>Elige <b>“Agregar a inicio”</b> y luego <b>Agregar</b>.</li>
          <li>Abre Rapictrl desde el ícono: entra directo a Movimientos.</li>
        </ol>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--qc-text-muted)' }}>
          La primera vez que la abras desde el ícono te pedirá iniciar sesión una sola vez.
        </div>
        <Button block type="primary" size="large" onClick={() => setPasosIOS(false)} style={{ marginTop: 16, borderRadius: 12 }}>
          Entendido
        </Button>
      </BottomSheet>
    </div>
  );
};

export default MovimientosMobile;
