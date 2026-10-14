import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, DatePicker, Input, Select, Skeleton, Spin, message } from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, AudioOutlined, BankOutlined, BarChartOutlined,
  CalendarOutlined, CloseOutlined, DownloadOutlined, FilterOutlined, LeftOutlined,
  MailOutlined, MobileOutlined, PaperClipOutlined, PlusOutlined, ReloadOutlined,
  RightOutlined, SearchOutlined, SettingOutlined, TableOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import dayjs from 'dayjs';

import BottomSheet from '../../common/BottomSheet';
import RegistroRapido from './RegistroRapido';
import { ChipOpcion, COLOR_SIGNO, CORAL, PuntoSigno } from './piezas';
import useDictado from './useDictado';
import { emojiInicial, normalizar } from './interpretarMovimiento';
import { EtiquetaChip } from '../components/EtiquetasSelector';
import EstadisticasMovimientos from '../EstadisticasMovimientos';
import useEnvioDocumentos from '../useEnvioDocumentos';
import { clienteDe, conceptoDe, itemsDe } from '../movimientos';
import { generarPdfMovimientos } from '../movimientosPdf';
import { cuentaOptions } from '../options';
import useCurrency, { useAmountCompact, useAmountShort, useTypedAmount } from '../../../hooks/useCurrency';
import { getAllEgresos, getEgresoCategorias } from '../../../services/controlapos/posService';
import { usePwaInstall } from '../../../services/pwa/pwa';
import { MOBILE_NAV_HEIGHT } from '../../Sidebar/MobileBottomNav';

const ALTO_BOTONES = 64;
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
      return capitalizar(fmt(a, { month: 'long', year: 'numeric' })).replace(' de ', ' ');
    case 'year':
      return String(a.year());
    default:
      return `${fechaCorta(a)} – ${fechaCorta(b)}`;
  }
};

// "Hoy", "Ayer" o "10 de octubre" (con el año si no es el actual).
const nombreDia = (d) => {
  const hoy = moment();
  if (d.isSame(hoy, 'day')) return 'Hoy';
  if (d.isSame(hoy.clone().subtract(1, 'day'), 'day')) return 'Ayer';
  return fmt(d, d.isSame(hoy, 'year') ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
};

// ── Piezas visuales (neutras: sirven igual en claro y en oscuro) ──────────

const Circulo = ({ children, size = 46, fondo = 'var(--qc-relleno)', color = 'var(--qc-text)' }) => (
  <span style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: fondo, color, fontSize: size * 0.42, fontWeight: 700, lineHeight: 1,
  }}>
    {children}
  </span>
);

// Ícono de un movimiento: el emoji de su etiqueta ("🍔 Comida") o su inicial,
// sobre un tinte suave del color de la etiqueta (la letra va en el color del
// texto: un azul o un morado puros no se leen sobre fondo oscuro). Los
// ingresos, una flecha hacia arriba.
const IconoMovimiento = ({ m }) => {
  if (m.tipo === 'ingreso') return <Circulo><ArrowUpOutlined style={{ fontSize: 18 }} /></Circulo>;
  const nombre = m.raw.categoria_nombre;
  if (!nombre) return <Circulo color="var(--qc-text-muted)"><ArrowDownOutlined style={{ fontSize: 18 }} /></Circulo>;
  const emoji = emojiInicial(nombre);
  const color = m.raw.categoria_color;
  return (
    <Circulo fondo={color ? `${color}2b` : 'var(--qc-relleno)'}>
      {emoji || nombre.trim().charAt(0).toUpperCase()}
    </Circulo>
  );
};

const BotonCircular = ({ onClick, label, children, activo = false, size = 44 }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    style={{
      width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
      border: `1px solid ${activo ? 'var(--qc-text)' : 'var(--qc-border)'}`,
      background: activo ? 'var(--qc-relleno-fuerte)' : 'var(--qc-surface)',
      color: 'var(--qc-text)',
    }}
  >
    {children}
  </button>
);

const OpcionMenu = ({ icon, titulo, detalle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="qc-mov-fila"
    style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 4px',
      border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderRadius: 12,
    }}
  >
    <Circulo size={40}><span style={{ fontSize: 17 }}>{icon}</span></Circulo>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>{titulo}</span>
      {detalle && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)' }}>{detalle}</span>}
    </span>
  </button>
);

const ChipFiltro = ({ children, onQuitar }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 6px 0 12px',
    borderRadius: 16, fontSize: 13, fontWeight: 600, flexShrink: 0,
    background: 'var(--qc-relleno-fuerte)', color: 'var(--qc-text)',
  }}>
    {children}
    <button
      type="button"
      onClick={onQuitar}
      aria-label="Quitar filtro"
      style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 3, display: 'flex' }}
    >
      <CloseOutlined style={{ fontSize: 11 }} />
    </button>
  </span>
);

const Seccion = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 0 8px' }}>
    {children}
  </div>
);

/**
 * Movimientos en el celular, al estilo de MonAi: el balance grande, los totales
 * de gastos e ingresos (que también filtran la vista), barras por etiqueta, la
 * lista por día y abajo los botones para anotar (+), buscar y dictar.
 *
 * Neutra a propósito: el único color es el signo de cada monto (− rojo, +
 * verde), el tono de cada etiqueta y el botón principal.
 *
 * No reemplaza funciones: filtros, PDF, estadísticas, saldo inicial, envío de
 * certificados y el formulario completo siguen en el menú (⚙) o al tocar un
 * movimiento, y la vista clásica de tabla queda a un toque.
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
  const montoCompacto = useAmountCompact();
  const { codigo: codigoMoneda } = useTypedAmount();
  const location = useLocation();
  const navigate = useNavigate();
  const pwa = usePwaInstall();
  const dictado = useDictado();
  const envio = useEnvioDocumentos(inventario);

  // 'todos' | 'gastos' | 'ingresos': lo eligen los totales de arriba.
  const [mostrar, setMostrar] = useState(() => leerLocal(CLAVE_VISTA, 'todos'));
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({ cuenta: null, etiqueta: null, concepto: null, usuario: null });
  const [limite, setLimite] = useState(POR_PAGINA);
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

  // Tocar el total de gastos (o de ingresos) muestra solo esos; tocarlo otra
  // vez vuelve a mostrar todo.
  const alternarMostrar = (v) => {
    const siguiente = mostrar === v ? 'todos' : v;
    setMostrar(siguiente);
    guardarLocal(CLAVE_VISTA, siguiente);
    setLimite(POR_PAGINA);
  };

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
    let ing = 0; let gas = 0;
    filtrados.forEach((m) => { if (m.tipo === 'ingreso') ing += m.valor; else gas += m.valor; });
    return { ingresos: ing, gastos: gas, balance: ing - gas };
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

  // Barras: gastos por etiqueta (o, viendo ingresos, ingresos por concepto).
  const deIngresos = mostrar === 'ingresos';
  const barras = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach((m) => {
      if (deIngresos ? m.tipo !== 'ingreso' : m.tipo !== 'gasto') return;
      const r = m.raw;
      const clave = deIngresos ? (conceptoDe(r) || 'Sin concepto') : String(r.categoria_id ?? SIN_ETIQUETA);
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          nombre: deIngresos ? clave : (r.categoria_nombre || 'Sin etiqueta'),
          color: deIngresos ? null : (r.categoria_id != null ? (r.categoria_color || null) : null),
          total: 0,
        });
      }
      mapa.get(clave).total += m.valor;
    });
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [filtrados, deIngresos]);
  const totalBarras = barras.reduce((s, d) => s + d.total, 0);
  const maxBarra = barras[0]?.total || 1;

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

  // Deslizar el balance a los lados cambia de periodo.
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

  const alternarFiltroBarra = (d) => {
    if (deIngresos) setFiltros((f) => ({ ...f, concepto: f.concepto === d.clave ? null : d.clave }));
    else setFiltros((f) => ({ ...f, etiqueta: String(f.etiqueta) === d.clave ? null : d.clave }));
  };

  const alternarBusqueda = () => {
    if (busquedaAbierta) setBusqueda('');
    setBusquedaAbierta((v) => !v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  // En los totales los montos grandes van compactos para que quepan los dos.
  const montoTotal = (v) => (v >= 10_000_000 ? montoCompacto(v) : montoCorto(v));

  // Alto de lo fijo de abajo (barra de navegación + botones flotantes).
  const altoAbajo = `calc(${MOBILE_NAV_HEIGHT + ALTO_BOTONES + 34}px + env(safe-area-inset-bottom, 0px))`;

  return (
    // Fondo liso de borde a borde (sin el degradado del resto de la app).
    <div style={{
      margin: '-16px -16px -28px',
      padding: '14px 16px 0',
      paddingBottom: altoAbajo,
      background: 'var(--qc-bg)',
      minHeight: 'calc(100vh - 52px)',
    }}>
      {/* Campo invisible para abrir el teclado del iPhone desde el toque (ver abrirRegistro) */}
      <input
        ref={proxyRef}
        aria-hidden
        tabIndex={-1}
        style={{
          position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0,
          fontSize: 16, border: 0, padding: 0, pointerEvents: 'none',
        }}
      />

      {/* ── Instalar como app ── */}
      {ofrecerInstalar && !bannerOculto && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 12px', marginBottom: 14,
          borderRadius: 18, background: 'var(--qc-relleno)',
        }}>
          <img src="/icons/icon-192.png" alt="" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--qc-text)' }}>Instala Rapictrl</div>
            <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>Ábrela como app desde tu inicio.</div>
          </div>
          <ChipOpcion activo onClick={instalar} style={{ minHeight: 36 }}>Instalar</ChipOpcion>
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

      {/* ── Periodo · calendario · ajustes ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', height: 44, borderRadius: 22, minWidth: 0,
          border: '1px solid var(--qc-border)', background: 'var(--qc-surface)',
        }}>
          <button type="button" aria-label="Periodo anterior" onClick={() => moverPeriodo(-1)}
            style={{ width: 38, height: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--qc-text)' }}>
            <LeftOutlined />
          </button>
          <button type="button" onClick={() => setPeriodoAbierto(true)}
            style={{
              minWidth: 0, height: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px',
              fontSize: 15.5, fontWeight: 700, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
        <span style={{ flex: 1 }} />
        <BotonCircular label="Periodo" onClick={() => setPeriodoAbierto(true)}><CalendarOutlined /></BotonCircular>
        <BotonCircular label="Opciones" onClick={() => setMenuAbierto(true)} activo={!!hayFiltros}><SettingOutlined /></BotonCircular>
      </div>

      {/* ── Balance (se desliza para cambiar de periodo) ── */}
      <div onTouchStart={alTocar} onTouchEnd={alSoltar} style={{ textAlign: 'center', padding: '22px 0 18px' }}>
        {mostrarSaldo && (
          <button
            type="button"
            onClick={onConfigurarSaldo}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 14, color: 'var(--qc-text-muted)' }}
          >
            <b style={{ color: saldoFinal < 0 ? COLOR_SIGNO.gasto : 'var(--qc-text)' }}>
              {saldoFinal < 0 ? '−' : ''}{montoCompacto(Math.abs(saldoFinal))}
            </b>
            {' '}Saldo acumulado
          </button>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2, minWidth: 0,
        }}>
          <PuntoSigno tipo={totales.balance < 0 ? 'gasto' : 'ingreso'} size={26} />
          <span style={{
            fontSize: 46, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, color: 'var(--qc-text)',
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {cargando ? '…' : montoCorto(Math.abs(totales.balance))}
          </span>
          <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--qc-text-muted)', alignSelf: 'flex-end', paddingBottom: 6 }}>
            {codigoMoneda}
          </span>
        </div>
      </div>

      {/* ── Totales que filtran: gastos | ingresos ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4,
        borderRadius: 30, border: '1px solid var(--qc-border)', background: 'var(--qc-surface)',
      }}>
        {[
          { tipo: 'gasto', vista: 'gastos', valor: totales.gastos, label: 'Gastos' },
          { tipo: 'ingreso', vista: 'ingresos', valor: totales.ingresos, label: 'Ingresos' },
        ].map((x) => {
          const activo = mostrar === x.vista;
          return (
            <button
              key={x.vista}
              type="button"
              onClick={() => alternarMostrar(x.vista)}
              aria-pressed={activo}
              aria-label={`${x.label}: ${montoCorto(x.valor)}. ${activo ? 'Toca para ver todo' : `Toca para ver solo ${x.label.toLowerCase()}`}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0,
                height: 50, borderRadius: 26, border: 'none', cursor: 'pointer',
                background: activo ? 'var(--qc-relleno-fuerte)' : 'transparent',
                color: 'var(--qc-text)', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              }}
            >
              <PuntoSigno tipo={x.tipo} size={17} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cargando ? '…' : montoTotal(x.valor)}
              </span>
            </button>
          );
        })}
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
          style={{ marginTop: 12, borderRadius: 22, fontSize: 16 }}
        />
      )}

      {hayFiltros && (
        <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12 }}>
          {filtros.cuenta && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, cuenta: null }))}>{filtros.cuenta}</ChipFiltro>}
          {filtros.etiqueta != null && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, etiqueta: null }))}>{nombreEtiquetaFiltro}</ChipFiltro>}
          {filtros.concepto != null && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, concepto: null }))}>{filtros.concepto}</ChipFiltro>}
          {filtros.usuario && <ChipFiltro onQuitar={() => setFiltros((f) => ({ ...f, usuario: null }))}>{userMap[String(filtros.usuario)] || 'Usuario'}</ChipFiltro>}
        </div>
      )}

      {/* ── Barras por etiqueta (tocar = filtrar) ── */}
      {!cargando && barras.length > 0 && (
        <div
          className="qc-sin-scrollbar"
          style={{
            display: 'flex', alignItems: 'flex-end', gap: 10, overflowX: 'auto',
            margin: '18px -16px 0', padding: '0 16px 4px',
          }}
        >
          {barras.map((d) => {
            const pct = totalBarras > 0 ? Math.round((d.total / totalBarras) * 100) : 0;
            const alto = 74 + Math.round((d.total / maxBarra) * 116);
            const activo = deIngresos ? filtros.concepto === d.clave : String(filtros.etiqueta) === d.clave;
            const emoji = emojiInicial(d.nombre);
            const sinNombre = d.clave === SIN_ETIQUETA || d.nombre === 'Sin concepto';
            return (
              <button
                key={d.clave}
                type="button"
                onClick={() => alternarFiltroBarra(d)}
                aria-pressed={activo}
                title={d.nombre}
                style={{
                  flexShrink: 0, width: 88, height: alto, borderRadius: 24, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                  gap: 1, padding: '0 6px 12px',
                  border: activo ? '2px solid var(--qc-text)' : '2px solid transparent',
                  background: d.color ? `${d.color}2b` : 'var(--qc-relleno)',
                  color: 'var(--qc-text)',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 700, color: emoji ? undefined : 'var(--qc-text)' }}>
                  {deIngresos ? <ArrowUpOutlined /> : (emoji || (sinNombre ? '?' : d.nombre.trim().charAt(0).toUpperCase()))}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{montoCompacto(d.total)}</span>
                <span style={{ fontSize: 12, color: 'var(--qc-text-muted)', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {alto > 120 ? (emoji ? d.nombre.replace(emoji, '').trim() : d.nombre) : `${pct}%`}
                </span>
                {alto > 120 && <span style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{pct}%</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Lista por día ── */}
      {cargando ? (
        <div style={{ marginTop: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '10px 0' }}>
              <Skeleton active avatar paragraph={{ rows: 1 }} title={false} />
            </div>
          ))}
        </div>
      ) : listados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--qc-text-muted)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>
            {hayFiltros || q ? 'Nada coincide con la búsqueda' : `Sin movimientos en ${periodo.toLowerCase()}`}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {hayFiltros || q ? 'Prueba quitando filtros.' : 'Anota el primero con + o con el micrófono.'}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          {grupos.map((g) => {
            const neto = mostrar === 'todos' ? g.ingresos - g.gastos : (mostrar === 'gastos' ? -g.gastos : g.ingresos);
            return (
              <div key={g.clave}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 2px 4px' }}>
                  <span style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>{nombreDia(g.fecha)}</span>
                  <span style={{ fontSize: 14, color: 'var(--qc-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {neto > 0 ? '+' : neto < 0 ? '−' : ''}{codigoMoneda} {montoCorto(Math.abs(neto))}
                  </span>
                </div>
                {g.items.map((m) => {
                  const r = m.raw;
                  const certificable = m.tipo === 'ingreso' && envio.puedeEnviar(r);
                  const subtitulo = [
                    m.tipo === 'gasto' ? r.categoria_nombre : (m.cliente && m.cliente !== m.titulo ? m.cliente : null),
                    r.cuenta,
                    variosUsuarios ? userMap[String(r.usuario)] : null,
                  ].filter(Boolean).join(' · ');
                  return (
                    <div
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => abrirMovimiento(m)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirMovimiento(m); } }}
                      className="qc-mov-fila"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px',
                        margin: '0 -4px', borderRadius: 16, cursor: 'pointer',
                      }}
                    >
                      <IconoMovimiento m={m} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontSize: 15.5, fontWeight: 600, color: 'var(--qc-text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {m.titulo}
                        </span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 13,
                          color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden',
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitulo}</span>
                          {r.comprobante_url && <PaperClipOutlined />}
                        </span>
                      </span>
                      {certificable && (
                        <button
                          type="button"
                          aria-label={`Enviar ${envio.documentosDe(r)} por correo`}
                          title={`Enviar ${envio.documentosDe(r)} por correo`}
                          onClick={(e) => { e.stopPropagation(); envio.enviar(r); }}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{
                            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                            background: 'var(--qc-relleno)', color: 'var(--qc-text)',
                          }}
                        >
                          {envio.enviandoId === r._id ? <Spin size="small" /> : <MailOutlined />}
                        </button>
                      )}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        padding: '6px 10px 6px 6px', borderRadius: 18, background: 'var(--qc-relleno)',
                        fontSize: 14.5, fontWeight: 700, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        <PuntoSigno tipo={m.tipo} size={18} />
                        {montoCorto(m.valor)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {listados.length > limite && (
            <Button block size="large" onClick={() => setLimite((n) => n + POR_PAGINA)} style={{ marginTop: 14, borderRadius: 22 }}>
              Ver más ({listados.length - limite})
            </Button>
          )}
        </div>
      )}

      {/* ── Botones flotantes: anotar (+), buscar · dictar ── */}
      <div style={{
        position: 'fixed', left: 16, right: 16, zIndex: 995, pointerEvents: 'none',
        bottom: `calc(${MOBILE_NAV_HEIGHT + 12}px + env(safe-area-inset-bottom, 0px))`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 2, padding: 5,
          borderRadius: 32, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
          {dictado.disponible && (
            <button
              type="button"
              aria-label={tipoPorDefecto === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'}
              onClick={() => abrirRegistro()}
              style={{
                width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                background: 'transparent', color: 'var(--qc-text)',
              }}
            >
              <PlusOutlined />
            </button>
          )}
          <button
            type="button"
            aria-label="Buscar"
            onClick={alternarBusqueda}
            style={{
              width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
              background: busquedaAbierta ? 'var(--qc-relleno-fuerte)' : 'transparent', color: 'var(--qc-text)',
            }}
          >
            <SearchOutlined />
          </button>
        </div>

        {/* Con dictado: el botón grande es el micrófono. Sin él, es el +. */}
        <button
          type="button"
          aria-label={dictado.disponible ? 'Dictar un movimiento' : (tipoPorDefecto === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto')}
          onClick={() => (dictado.disponible ? abrirRegistro({ conDictado: true }) : abrirRegistro())}
          style={{
            pointerEvents: 'auto', width: ALTO_BOTONES, height: ALTO_BOTONES, borderRadius: '50%',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, background: CORAL, color: '#fff', boxShadow: '0 8px 22px rgba(240,86,92,0.45)',
          }}
        >
          {dictado.disponible ? <AudioOutlined /> : <PlusOutlined />}
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
              <ChipOpcion key={a.key} activo={activo} onClick={() => elegirAtajo(a)} style={{ minHeight: 46, borderRadius: 14 }}>
                {a.label}
              </ChipOpcion>
            );
          })}
        </div>
        <Seccion>Personalizado</Seccion>
        <div style={{ display: 'flex', gap: 8 }}>
          <DatePicker
            inputReadOnly
            placeholder="Desde"
            format="DD/MM/YYYY"
            value={rangoLibre[0]}
            onChange={(d) => setRangoLibre(([, b]) => [d, b])}
            style={{ flex: 1, height: 44, borderRadius: 14 }}
          />
          <DatePicker
            inputReadOnly
            placeholder="Hasta"
            format="DD/MM/YYYY"
            value={rangoLibre[1]}
            onChange={(d) => setRangoLibre(([a]) => [a, d])}
            disabledDate={(d) => d && d.isAfter(dayjs().endOf('day'))}
            style={{ flex: 1, height: 44, borderRadius: 14 }}
          />
        </div>
        <ChipOpcion activo onClick={aplicarRangoLibre} style={{ width: '100%', marginTop: 10, minHeight: 48, borderRadius: 14 }}>
          Ver ese rango
        </ChipOpcion>
      </BottomSheet>

      {/* ── Ajustes (⚙) ── */}
      <BottomSheet open={menuAbierto} onClose={() => setMenuAbierto(false)} title="Movimientos">
        <OpcionMenu icon={<FilterOutlined />} titulo="Filtrar" detalle="Por cuenta, etiqueta, concepto o usuario"
          onClick={() => { setMenuAbierto(false); setFiltrosAbiertos(true); }} />
        <OpcionMenu icon={<BarChartOutlined />} titulo="Estadísticas" detalle="Gráficas de ingresos y gastos"
          onClick={() => { setMenuAbierto(false); setEstadisticasAbiertas(true); }} />
        <OpcionMenu icon={<DownloadOutlined />} titulo="PDF de gastos" detalle={`${periodo} · con los filtros aplicados`}
          onClick={() => descargarPdf('egresos')} />
        <OpcionMenu icon={<DownloadOutlined />} titulo="PDF de ingresos" detalle={`${periodo} · con los filtros aplicados`}
          onClick={() => descargarPdf('ingresos')} />
        <OpcionMenu icon={<BankOutlined />} titulo="Saldo inicial y tarjetas" detalle="Punto de partida del saldo acumulado"
          onClick={() => { setMenuAbierto(false); onConfigurarSaldo(); }} />
        <OpcionMenu icon={<ReloadOutlined />} titulo="Actualizar"
          onClick={() => { setMenuAbierto(false); onRefresh(); }} />
        {ofrecerInstalar && (
          <OpcionMenu icon={<MobileOutlined />} titulo="Instalar la app" detalle="Ícono en tu pantalla de inicio" onClick={instalar} />
        )}
        <OpcionMenu icon={<TableOutlined />} titulo="Vista clásica" detalle="Tabla con todas las columnas"
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
        footer={(
          <ChipOpcion activo onClick={() => setFiltrosAbiertos(false)} style={{ width: '100%', minHeight: 48, borderRadius: 14 }}>
            Ver resultados
          </ChipOpcion>
        )}
      >
        <Seccion>Cuenta</Seccion>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cuentaOptions.map((c) => (
            <ChipOpcion
              key={c.value}
              activo={filtros.cuenta === c.value}
              onClick={() => setFiltros((f) => ({ ...f, cuenta: f.cuenta === c.value ? null : c.value }))}
            >
              {c.label}
            </ChipOpcion>
          ))}
        </div>

        <Seccion>Etiqueta (gastos)</Seccion>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {etiquetas.map((e) => (
            <EtiquetaChip
              key={e.id}
              sutil
              nombre={e.nombre}
              color={e.color}
              selected={String(filtros.etiqueta) === String(e.id)}
              dimmed={filtros.etiqueta != null && String(filtros.etiqueta) !== String(e.id)}
              onClick={() => setFiltros((f) => ({ ...f, etiqueta: String(f.etiqueta) === String(e.id) ? null : String(e.id) }))}
            />
          ))}
          <EtiquetaChip
            sutil
            nombre="Sin etiqueta"
            color="#9ca3af"
            selected={filtros.etiqueta === SIN_ETIQUETA}
            dimmed={filtros.etiqueta != null && filtros.etiqueta !== SIN_ETIQUETA}
            onClick={() => setFiltros((f) => ({ ...f, etiqueta: f.etiqueta === SIN_ETIQUETA ? null : SIN_ETIQUETA }))}
          />
        </div>

        {conceptos.length > 0 && (
          <>
            <Seccion>Concepto (ingresos)</Seccion>
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
            <Seccion>Registrado por</Seccion>
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
        <ChipOpcion activo onClick={() => setPasosIOS(false)} style={{ width: '100%', marginTop: 16, minHeight: 48, borderRadius: 14 }}>
          Entendido
        </ChipOpcion>
      </BottomSheet>
    </div>
  );
};

export default MovimientosMobile;
