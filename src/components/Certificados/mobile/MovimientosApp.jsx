import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button, DatePicker, Dropdown, Input, Popconfirm, Segmented, Select, Skeleton, Spin, Switch, Tooltip, message,
} from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, AudioOutlined, BankOutlined, BarChartOutlined,
  CalendarOutlined, CloseOutlined, DeleteOutlined, DownloadOutlined, EnterOutlined, FilterOutlined,
  FormOutlined, LeftOutlined, MailOutlined, MobileOutlined, PaperClipOutlined, PlusOutlined, ReloadOutlined,
  RightOutlined, SearchOutlined, SettingOutlined, TableOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import dayjs from 'dayjs';

import BottomSheet from '../../common/BottomSheet';
import RegistroRapido, { ultimaCuenta } from './RegistroRapido';
import {
  BotonCircular, ChipFiltro, ChipOpcion, Circulo, COLOR_SIGNO, CORAL, OpcionMenu, PuntoSigno, Seccion,
} from './piezas';
import useDictado from './useDictado';
import {
  emojiInicial, interpretarMovimiento, montoMinimoPara, normalizar, sugerirEtiqueta,
} from './interpretarMovimiento';
import { EtiquetaChip } from '../components/EtiquetasSelector';
import EtiquetaCell from '../components/EtiquetaCell';
import EstadisticasMovimientos from '../EstadisticasMovimientos';
import useEnvioDocumentos from '../useEnvioDocumentos';
import { clienteDe, conceptoDe, itemsDe } from '../movimientos';
import { generarPdfMovimientos } from '../movimientosPdf';
import { cuentaOptions } from '../options';
import useCurrency, { useAmountCompact, useAmountShort, useTypedAmount } from '../../../hooks/useCurrency';
import {
  deleteEgreso, deleteIngreso, getAllEgresos, getAllIngresos, getEgresoCategorias, updateFinanzasConfig,
} from '../../../services/controlapos/posService';
import useIsMobile from '../../../hooks/useIsMobile';
import { usePwaInstall } from '../../../services/pwa/pwa';
import { MOBILE_NAV_HEIGHT } from '../../Sidebar/MobileBottomNav';

const ALTO_BOTONES = 64;
const SIN_ETIQUETA = 'sin';            // gastos sin etiqueta
const SIN_ETIQUETA_INGRESO = 'sin-i';  // ingresos sin etiqueta
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

// Ícono de un movimiento: el emoji de su etiqueta ("🍔 Comida") o su inicial,
// sobre un tinte suave del color de la etiqueta (la letra va en el color del
// texto: un azul o un morado puros no se leen sobre fondo oscuro). Sin
// etiqueta, una flecha (abajo el gasto, arriba el ingreso).
const IconoMovimiento = ({ m }) => {
  const nombre = m.raw.categoria_nombre;
  if (!nombre) {
    return m.tipo === 'ingreso'
      ? <Circulo><ArrowUpOutlined style={{ fontSize: 18 }} /></Circulo>
      : <Circulo color="var(--qc-text-muted)"><ArrowDownOutlined style={{ fontSize: 18 }} /></Circulo>;
  }
  const emoji = emojiInicial(nombre);
  const color = m.raw.categoria_color;
  return (
    <Circulo fondo={color ? `${color}2b` : 'var(--qc-relleno)'}>
      {emoji || nombre.trim().charAt(0).toUpperCase()}
    </Circulo>
  );
};

/**
 * Movimientos al estilo de MonAi, en celular y en computador: el balance
 * grande, los totales de gastos e ingresos (que también filtran la vista),
 * barras por etiqueta y la lista por día.
 *
 * - Celular: abajo los botones para anotar (+), buscar y dictar; filtros,
 *   periodo y opciones en hojas inferiores.
 * - Computador (vistaEscritorio): barra de periodos con rangos, "anota un
 *   movimiento" a un lado del balance, filtros en línea, columnas de etiqueta
 *   (editable en la fila), cliente, cuenta y usuario, y el registro en un panel
 *   a la derecha. Estadísticas en su propia pestaña.
 *
 * Neutra a propósito: el único color es el signo de cada monto (− rojo, +
 * verde), el tono de cada etiqueta y el botón principal.
 *
 * No reemplaza funciones: filtros, PDF, estadísticas, saldo inicial, envío de
 * certificados y el formulario completo siguen aquí, y la vista clásica de
 * tabla queda a un toque.
 */
const MovimientosApp = ({
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
  // En computador la misma vista aprovecha el ancho: columnas, filtros en
  // línea y el registro en un panel lateral (ver vistaEscritorio).
  const esEscritorio = !useIsMobile();
  // Computador angosto (768–1100 px): una sola columna arriba y menos columnas en la lista.
  const compacto = useIsMobile(1100);
  const [pestana, setPestana] = useState('movimientos'); // computador: movimientos | estadisticas
  const [textoRapido, setTextoRapido] = useState('');

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
  // Dos listas separadas: las de gastos y las de ingresos.
  const [etiquetas, setEtiquetas] = useState([]);
  const [etiquetasIngreso, setEtiquetasIngreso] = useState([]);
  const cargarEtiquetas = useCallback(() => {
    const comoLista = (d) => (Array.isArray(d) ? d : []);
    getEgresoCategorias({ tipo: 'gasto' })
      .then((d) => setEtiquetas(comoLista(d)))
      .catch(() => { /* sin etiquetas igual se registra */ });
    getEgresoCategorias({ tipo: 'ingreso' })
      .then((d) => setEtiquetasIngreso(comoLista(d)))
      .catch(() => { /* sin etiquetas igual se registra */ });
  }, []);
  useEffect(() => { cargarEtiquetas(); }, [cargarEtiquetas]);

  // Los movimientos del periodo en pantalla pueden ser pocos: la primera vez
  // que se abre el registro se piden los últimos 6 meses para sugerir mejor.
  const [historialLargo, setHistorialLargo] = useState({ egresos: [], ingresos: [] });
  const historialPedido = useRef(false);
  const cargarHistorial = () => {
    if (historialPedido.current) return;
    historialPedido.current = true;
    const rango = {
      fecha_inicio: moment().subtract(180, 'days').startOf('day').toISOString(),
      fecha_fin: moment().endOf('day').toISOString(),
      tz_offset: new Date().getTimezoneOffset(),
    };
    const comoLista = (d) => (Array.isArray(d) ? d : (d?.data || []));
    Promise.all([getAllEgresos(rango), getAllIngresos({ ...rango, limit: 3000 })])
      .then(([e, i]) => setHistorialLargo({ egresos: comoLista(e), ingresos: comoLista(i) }))
      .catch(() => { historialPedido.current = false; });
  };

  const historial = useMemo(
    () => [...egresos, ...historialLargo.egresos]
      .filter((e) => e?.descripcion)
      .map((e) => ({ descripcion: e.descripcion, categoria_id: e.categoria_id ?? null })),
    [egresos, historialLargo],
  );
  // En un ingreso lo que se "escribe" es el producto o concepto vendido.
  const historialIngresos = useMemo(
    () => [...ingresos, ...historialLargo.ingresos]
      .map((r) => ({ descripcion: conceptoDe(r) || r.descripcion || '', categoria_id: r.categoria_id ?? null }))
      .filter((r) => r.descripcion),
    [ingresos, historialLargo],
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
      // Un solo producto vendido varias veces: "Curso BPM × 3".
      const items = itemsDe(r);
      const veces = items.length === 1 ? Number(items[0].cantidad) || 1 : 1;
      const concepto = conceptoDe(r);
      return {
        tipo: 'ingreso',
        id: `i-${r._id}`,
        fecha: moment(r.createdAt),
        valor: Number(r.valor) || 0,
        titulo: (concepto && veces > 1 ? `${concepto} × ${veces}` : concepto) || cliente || 'Ingreso',
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
      // Cada etiqueta es de un solo tipo; "sin etiqueta" va por tipo también.
      const f = String(filtros.etiqueta);
      if (f === SIN_ETIQUETA || f === SIN_ETIQUETA_INGRESO) {
        if (m.tipo !== (f === SIN_ETIQUETA ? 'gasto' : 'ingreso') || r.categoria_id != null) return false;
      } else if (String(r.categoria_id) !== f) return false;
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

  // Barras: gastos por etiqueta. Viendo ingresos, ingresos por etiqueta si el
  // negocio ya los etiqueta; si no, por producto o concepto.
  const deIngresos = mostrar === 'ingresos';
  const ingresosEtiquetados = useMemo(
    () => filtrados.some((m) => m.tipo === 'ingreso' && m.raw.categoria_id != null),
    [filtrados],
  );
  const barrasPorConcepto = deIngresos && !ingresosEtiquetados;
  const barras = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach((m) => {
      if (deIngresos ? m.tipo !== 'ingreso' : m.tipo !== 'gasto') return;
      const r = m.raw;
      const sinEtiqueta = deIngresos ? SIN_ETIQUETA_INGRESO : SIN_ETIQUETA;
      const clave = barrasPorConcepto ? (conceptoDe(r) || 'Sin concepto') : String(r.categoria_id ?? sinEtiqueta);
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          nombre: barrasPorConcepto ? clave : (r.categoria_nombre || 'Sin etiqueta'),
          color: barrasPorConcepto || r.categoria_id == null ? null : (r.categoria_color || null),
          total: 0,
        });
      }
      mapa.get(clave).total += m.valor;
    });
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [filtrados, deIngresos, barrasPorConcepto]);
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
  // Algunos negocios (p. ej. los que siempre facturan a un cliente) registran
  // todo con el formulario completo: lo decide un administrador desde ⚙ y vale
  // para todos los usuarios del negocio (finanzas_config.registro_completo).
  const esAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [registroCompletoLocal, setRegistroCompletoLocal] = useState(null);
  useEffect(() => { setRegistroCompletoLocal(null); }, [saldo]);
  const registroCompleto = registroCompletoLocal ?? (saldo?.registro_completo === true);
  const puedeDictar = dictado.disponible && !registroCompleto;

  const cambiarRegistroCompleto = async (valor) => {
    setRegistroCompletoLocal(valor);
    try {
      await updateFinanzasConfig({ registro_completo: valor });
      message.success(valor ? 'Este negocio registra con el formulario completo' : 'Este negocio vuelve al registro rápido');
      onRefresh();
    } catch (e) {
      setRegistroCompletoLocal(null);
      message.error(e?.response?.data?.message || 'No se pudo guardar el cambio');
    }
  };

  // Lo escrito ("almuerzo 25000") llega ya repartido al formulario completo.
  const abrirFormularioCompleto = ({ tipo, texto = '', registro = null }) => {
    if (registro) { onEditarCompleto(registro.tipo, registro.raw); return; }
    const p = texto.trim() ? interpretarMovimiento(texto, { montoMinimo: montoMinimoPara(codigoMoneda) }) : null;
    const t = p?.tipo || tipo;
    const cuenta = ultimaCuenta(t) || 'Nequi';
    if (t === 'gasto') {
      const descripcion = p ? capitalizar(p.valor != null ? p.descripcion : texto.trim()) : '';
      const etiqueta = descripcion ? sugerirEtiqueta(descripcion, etiquetas, historial) : null;
      onEditarCompleto('gasto', {
        descripcion, cuenta, fecha: new Date().toISOString(),
        ...(p?.valor != null ? { valor: p.valor } : {}),
        ...(etiqueta != null ? { categoria_id: etiqueta } : {}),
      });
    } else {
      onEditarCompleto('ingreso', { cuenta, valor: p?.valor ?? 0 });
    }
  };

  const tipoPorDefecto = mostrar === 'ingresos' ? 'ingreso' : 'gasto';
  const abrirRegistro = ({ tipo, texto = '', registro = null, conDictado = false } = {}) => {
    if (registroCompleto) { abrirFormularioCompleto({ tipo: tipo || tipoPorDefecto, texto, registro }); return; }
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
    // Ventas con varios productos distintos: su edición vive en el formulario
    // completo (un producto con cantidad sí se edita en el registro rápido).
    if (m.tipo === 'ingreso' && itemsDe(m.raw).length > 1) {
      onEditarCompleto('ingreso', m.raw);
      return;
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
    if (barrasPorConcepto) setFiltros((f) => ({ ...f, concepto: f.concepto === d.clave ? null : d.clave }));
    else setFiltros((f) => ({ ...f, etiqueta: String(f.etiqueta) === d.clave ? null : d.clave }));
  };

  const alternarBusqueda = () => {
    if (busquedaAbierta) setBusqueda('');
    setBusquedaAbierta((v) => !v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hayFiltros = filtros.cuenta || filtros.etiqueta != null || filtros.concepto != null || filtros.usuario;
  const nombreEtiquetaFiltro = filtros.etiqueta === SIN_ETIQUETA
    ? 'Gastos sin etiqueta'
    : filtros.etiqueta === SIN_ETIQUETA_INGRESO
      ? 'Ingresos sin etiqueta'
      : ([...etiquetas, ...etiquetasIngreso].find((e) => String(e.id) === String(filtros.etiqueta))?.nombre
        || [...egresos, ...ingresos].find((e) => String(e.categoria_id) === String(filtros.etiqueta))?.categoria_nombre
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

  // Totales de gastos e ingresos: muestran el monto y filtran la vista.
  const totalesJsx = (
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
  );

  // Barras por etiqueta (o por concepto viendo ingresos): tocar = filtrar.
  const barrasJsx = (
    <div
      className="qc-sin-scrollbar"
      style={{
        display: 'flex', alignItems: 'flex-end', gap: 10, overflowX: 'auto',
        margin: esEscritorio ? '18px 0 0' : '18px -16px 0', padding: esEscritorio ? '0 0 4px' : '0 16px 4px',
      }}
    >
      {barras.map((d) => {
        const pct = totalBarras > 0 ? Math.round((d.total / totalBarras) * 100) : 0;
        const alto = 74 + Math.round((d.total / maxBarra) * 116);
        const activo = barrasPorConcepto ? filtros.concepto === d.clave : String(filtros.etiqueta) === d.clave;
        const emoji = emojiInicial(d.nombre);
        const sinNombre = d.clave === SIN_ETIQUETA || d.clave === SIN_ETIQUETA_INGRESO || d.nombre === 'Sin concepto';
        return (
          <button
            key={d.clave}
            type="button"
            onClick={() => alternarFiltroBarra(d)}
            aria-pressed={activo}
            title={d.nombre}
            style={{
              flexShrink: 0, width: esEscritorio ? 112 : 88, height: alto, borderRadius: 24, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              gap: 1, padding: '0 6px 12px',
              border: activo ? '2px solid var(--qc-text)' : '2px solid transparent',
              background: d.color ? `${d.color}2b` : 'var(--qc-relleno)',
              color: 'var(--qc-text)',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 700, color: emoji ? undefined : 'var(--qc-text)' }}>
              {barrasPorConcepto || d.clave === SIN_ETIQUETA_INGRESO
                ? <ArrowUpOutlined />
                : (emoji || (sinNombre ? '?' : d.nombre.trim().charAt(0).toUpperCase()))}
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
  );

  // Hojas y paneles que comparten el celular y el computador.
  const hojas = (
    <>
      {/* ── Registro rápido ── */}
      <RegistroRapido
        open={hoja.open}
        onClose={cerrarRegistro}
        tipoInicial={hoja.tipo}
        textoInicial={hoja.texto}
        registro={hoja.registro}
        etiquetas={etiquetas}
        historial={historial}
        etiquetasIngreso={etiquetasIngreso}
        historialIngresos={historialIngresos}
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
        lateral={esEscritorio}
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
        {esAdmin && (
          <OpcionMenu
            icon={<FormOutlined />}
            titulo="Siempre el formulario completo"
            detalle="Para todos los usuarios de este negocio, en lugar del registro rápido"
            onClick={() => cambiarRegistroCompleto(!registroCompleto)}
            extra={<Switch checked={registroCompleto} style={{ pointerEvents: 'none', flexShrink: 0 }} />}
          />
        )}
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

        {[
          { titulo: 'Etiqueta (gastos)', lista: etiquetas, sin: SIN_ETIQUETA },
          { titulo: 'Etiqueta (ingresos)', lista: etiquetasIngreso, sin: SIN_ETIQUETA_INGRESO },
        ].filter((g) => g.sin === SIN_ETIQUETA || g.lista.length > 0).map((g) => (
          <React.Fragment key={g.sin}>
            <Seccion>{g.titulo}</Seccion>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[...g.lista.map((e) => ({ id: String(e.id), nombre: e.nombre, color: e.color })),
                { id: g.sin, nombre: 'Sin etiqueta', color: '#9ca3af' }].map((e) => (
                  <EtiquetaChip
                    key={e.id}
                    sutil
                    nombre={e.nombre}
                    color={e.color}
                    selected={String(filtros.etiqueta) === e.id}
                    dimmed={filtros.etiqueta != null && String(filtros.etiqueta) !== e.id}
                    onClick={() => setFiltros((f) => ({ ...f, etiqueta: String(f.etiqueta) === e.id ? null : e.id }))}
                  />
              ))}
            </div>
          </React.Fragment>
        ))}

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
    </>
  );

  // ── Computador ─────────────────────────────────────────────────────────
  const eliminarMovimiento = async (m) => {
    try {
      if (m.tipo === 'gasto') await deleteEgreso(m.raw._id);
      else await deleteIngreso(m.raw._id);
      message.success('Registro eliminado');
      onRefresh();
    } catch {
      message.error('No se pudo eliminar');
    }
  };

  // "almuerzo 25000" + Enter abre el panel ya repartido (valor, descripción, etiqueta).
  const anotarDesdeTexto = (e) => {
    e.preventDefault();
    const texto = textoRapido.trim();
    setTextoRapido('');
    abrirRegistro(texto ? { texto } : {});
  };

  const vistaEscritorio = () => {
    const pickerValue = [dayjs(dateRange[0].toDate()), dayjs(dateRange[1].toDate())];
    const hora = (d) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(d.toDate());
    // "Registró" solo cuando el negocio tiene varios usuarios: con uno siempre diría lo mismo.
    const columnas = compacto
      ? 'minmax(140px, 2fr) minmax(120px, 1.2fr) 88px 120px'
      : `minmax(160px, 2.4fr) minmax(130px, 1.3fr) 100px ${variosUsuarios ? '130px ' : ''}96px 128px`;
    const opcionesDe = (lista, sin) => [
      ...lista.map((e) => ({ value: String(e.id), label: e.nombre, color: e.color })),
      { value: sin, label: 'Sin etiqueta', color: '#9ca3af' },
    ];
    const opcionesEtiqueta = etiquetasIngreso.length > 0
      ? [
        { label: 'Gastos', title: 'Gastos', options: opcionesDe(etiquetas, SIN_ETIQUETA) },
        { label: 'Ingresos', title: 'Ingresos', options: opcionesDe(etiquetasIngreso, SIN_ETIQUETA_INGRESO) },
      ]
      : opcionesDe(etiquetas, SIN_ETIQUETA);
    const verSaldoAnterior = saldoAnterior !== null && !ocultas.includes('saldo_anterior');

    return (
      // Fondo liso de borde a borde (sin el degradado del resto de la app).
      <div style={{ margin: '-24px', padding: '20px 32px 48px', background: 'var(--qc-bg)', minHeight: 'calc(100vh - 52px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          {/* ── Título · pestañas · ajustes ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--qc-text)', letterSpacing: -0.3 }}>Movimientos</h1>
            <span style={{ flex: 1 }} />
            <Segmented
              value={pestana}
              onChange={setPestana}
              options={[
                { label: 'Movimientos', value: 'movimientos' },
                { label: 'Estadísticas', value: 'estadisticas', icon: <BarChartOutlined /> },
              ]}
            />
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'saldo', icon: <BankOutlined />, label: 'Saldo inicial y tarjetas', onClick: onConfigurarSaldo },
                  { key: 'actualizar', icon: <ReloadOutlined />, label: 'Actualizar', onClick: () => onRefresh() },
                  ...(esAdmin ? [{
                    key: 'completo',
                    icon: <FormOutlined />,
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
                        <span>
                          Siempre el formulario completo
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--qc-text-muted)' }}>Para todo el negocio</span>
                        </span>
                        <Switch size="small" checked={registroCompleto} style={{ pointerEvents: 'none' }} />
                      </span>
                    ),
                    onClick: () => cambiarRegistroCompleto(!registroCompleto),
                  }] : []),
                  ...(ofrecerInstalar ? [{ key: 'instalar', icon: <MobileOutlined />, label: 'Instalar la app', onClick: instalar }] : []),
                  { type: 'divider' },
                  { key: 'clasica', icon: <TableOutlined />, label: 'Vista clásica (tabla)', onClick: onVistaClasica },
                ],
              }}
            >
              <span><BotonCircular label="Opciones"><SettingOutlined /></BotonCircular></span>
            </Dropdown>
          </div>

          {/* ── Periodo · rangos ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', height: 40, borderRadius: 20,
              border: '1px solid var(--qc-border)', background: 'var(--qc-surface)',
            }}>
              <button type="button" aria-label="Periodo anterior" onClick={() => moverPeriodo(-1)}
                style={{ width: 36, height: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--qc-text)' }}>
                <LeftOutlined />
              </button>
              <span style={{ minWidth: 130, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--qc-text)', whiteSpace: 'nowrap' }}>
                {periodo}
              </span>
              <button type="button" aria-label="Periodo siguiente" onClick={() => moverPeriodo(1)} disabled={!haySiguiente}
                style={{
                  width: 36, height: '100%', border: 'none', background: 'none', color: 'var(--qc-text)',
                  cursor: haySiguiente ? 'pointer' : 'not-allowed', opacity: haySiguiente ? 1 : 0.3,
                }}>
                <RightOutlined />
              </button>
            </div>
            {ATAJOS.map((a) => {
              const [ini, fin] = a.rango();
              const activo = dateRange[0].isSame(ini, 'second') && dateRange[1].isSame(fin, 'second');
              return (
                <ChipOpcion key={a.key} activo={activo} onClick={() => elegirAtajo(a)} style={{ minHeight: 36, padding: '0 14px', fontSize: 13 }}>
                  {a.label.replace('Esta ', '').replace('Este ', '').replace(/^./, (c) => c.toUpperCase())}
                </ChipOpcion>
              );
            })}
            <DatePicker.RangePicker
              value={pickerValue}
              allowClear={false}
              format="DD/MM/YY"
              onChange={(v) => {
                if (v?.length === 2) {
                  onDateRangeChange([moment(v[0].toDate()).startOf('day'), moment(v[1].toDate()).endOf('day')]);
                  setLimite(POR_PAGINA);
                }
              }}
              style={{ height: 36, borderRadius: 18, width: 230 }}
            />
          </div>

          {pestana === 'estadisticas' ? (
            <div style={{ marginTop: 20, borderRadius: 22, overflow: 'hidden', background: 'var(--qc-surface)', border: '1px solid var(--qc-border)' }}>
              <EstadisticasMovimientos />
            </div>
          ) : (
            <>
              {/* ── Balance y totales · anotar ── */}
              <div style={{ display: 'grid', gridTemplateColumns: compacto ? 'minmax(0, 1fr)' : 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 28, alignItems: 'center', marginTop: 26 }}>
                <div onTouchStart={alTocar} onTouchEnd={alSoltar}>
                  {mostrarSaldo && (
                    <div style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>
                      <b style={{ color: saldoFinal < 0 ? COLOR_SIGNO.gasto : 'var(--qc-text)' }}>
                        {saldoFinal < 0 ? '−' : ''}{montoCorto(Math.abs(saldoFinal))}
                      </b>{' '}Saldo acumulado
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, minWidth: 0 }}>
                    <PuntoSigno tipo={totales.balance < 0 ? 'gasto' : 'ingreso'} size={30} />
                    <span style={{
                      fontSize: 56, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, color: 'var(--qc-text)',
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {cargando ? '…' : montoCorto(Math.abs(totales.balance))}
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--qc-text-muted)', alignSelf: 'flex-end', paddingBottom: 8 }}>
                      {codigoMoneda}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>Balance de {periodo.toLowerCase()}</div>
                  <div style={{ maxWidth: 520, marginTop: 16 }}>{totalesJsx}</div>
                  {(verSaldoAnterior || mostrarSaldo) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 13, color: 'var(--qc-text-muted)' }}>
                      {verSaldoAnterior && (
                        <span>Saldo anterior <b style={{ color: 'var(--qc-text)' }}>{saldoAnterior < 0 ? '−' : ''}{montoCorto(Math.abs(saldoAnterior))}</b></span>
                      )}
                      {mostrarSaldo && (
                        <span>Saldo final <b style={{ color: saldoFinal < 0 ? COLOR_SIGNO.gasto : 'var(--qc-text)' }}>{saldoFinal < 0 ? '−' : ''}{montoCorto(Math.abs(saldoFinal))}</b></span>
                      )}
                      <Tooltip title="Saldo inicial y tarjetas">
                        <button type="button" onClick={onConfigurarSaldo} aria-label="Configurar saldo inicial"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--qc-text-muted)', padding: 0 }}>
                          <SettingOutlined />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div style={{ borderRadius: 22, padding: 20, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--qc-text)' }}>Anota un movimiento</div>
                  <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>
                    Escríbelo como lo dirías: “almuerzo 25000”, “uber 12.500”, “+ venta curso 80k”.
                  </div>
                  <form
                    onSubmit={anotarDesdeTexto}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '4px 4px 4px 16px', borderRadius: 18, background: 'var(--qc-relleno)' }}
                  >
                    <input
                      value={textoRapido}
                      onChange={(e) => setTextoRapido(e.target.value)}
                      placeholder="Ej: almuerzo 25.000"
                      aria-label="Escribe un movimiento"
                      style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15.5, padding: '11px 0', color: 'var(--qc-text)' }}
                    />
                    {puedeDictar && (
                      <Tooltip title="Dictar">
                        <button type="button" aria-label="Dictar un movimiento" onClick={() => abrirRegistro({ conDictado: true })}
                          style={{
                            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                            background: 'transparent', color: 'var(--qc-text)',
                          }}>
                          <AudioOutlined />
                        </button>
                      </Tooltip>
                    )}
                    <button type="submit" aria-label="Registrar"
                      style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        background: CORAL, color: '#fff',
                      }}>
                      <EnterOutlined />
                    </button>
                  </form>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <ChipOpcion onClick={() => abrirRegistro({ tipo: 'gasto' })}><PuntoSigno tipo="gasto" size={15} /> Nuevo gasto</ChipOpcion>
                    <ChipOpcion onClick={() => abrirRegistro({ tipo: 'ingreso' })}><PuntoSigno tipo="ingreso" size={15} /> Nuevo ingreso</ChipOpcion>
                  </div>
                </div>
              </div>

              {!cargando && barras.length > 0 && <div style={{ marginTop: 6 }}>{barrasJsx}</div>}

              {/* ── Filtros en línea ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
                <Input
                  allowClear
                  prefix={<SearchOutlined style={{ color: 'var(--qc-text-muted)' }} />}
                  placeholder="Buscar descripción, cliente, documento, referencia…"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA); }}
                  style={{ width: 300, borderRadius: 18 }}
                />
                <Select allowClear placeholder="Cuenta" value={filtros.cuenta ?? undefined} style={{ width: 140 }}
                  onChange={(v) => setFiltros((f) => ({ ...f, cuenta: v ?? null }))} options={cuentaOptions} />
                <Select allowClear showSearch optionFilterProp="label" placeholder="Etiqueta" style={{ width: 180 }}
                  value={filtros.etiqueta ?? undefined}
                  onChange={(v) => setFiltros((f) => ({ ...f, etiqueta: v ?? null }))}
                  options={opcionesEtiqueta}
                  optionRender={(o) => <EtiquetaChip sutil size="sm" nombre={o.data.label} color={o.data.color} />} />
                {conceptos.length > 0 && (
                  <Select allowClear showSearch placeholder="Producto / concepto" style={{ width: 210 }}
                    value={filtros.concepto ?? undefined}
                    onChange={(v) => setFiltros((f) => ({ ...f, concepto: v ?? null }))}
                    options={conceptos.map((c) => ({ value: c, label: c }))} />
                )}
                {variosUsuarios && (
                  <Select allowClear placeholder="Usuario" style={{ width: 160 }}
                    value={filtros.usuario ?? undefined}
                    onChange={(v) => setFiltros((f) => ({ ...f, usuario: v ?? null }))}
                    options={vendedores.map((u) => ({ value: String(u.id), label: u.name || u.nombre || `Usuario ${u.id}` }))} />
                )}
                {(hayFiltros || busqueda) && (
                  <Button type="link" onClick={() => { setFiltros({ cuenta: null, etiqueta: null, concepto: null, usuario: null }); setBusqueda(''); }}>
                    Limpiar
                  </Button>
                )}
                <span style={{ flex: 1 }} />
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  menu={{
                    items: [
                      { key: 'g', label: 'PDF de gastos', onClick: () => descargarPdf('egresos') },
                      { key: 'i', label: 'PDF de ingresos', onClick: () => descargarPdf('ingresos') },
                    ],
                  }}
                >
                  <Button icon={<DownloadOutlined />} style={{ borderRadius: 18 }}>PDF</Button>
                </Dropdown>
              </div>

              {/* ── Lista por día, con columnas ── */}
              {cargando ? (
                <div style={{ marginTop: 20 }}><Skeleton active avatar paragraph={{ rows: 3 }} /></div>
              ) : listados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--qc-text-muted)' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>
                    {hayFiltros || q ? 'Nada coincide con la búsqueda' : `Sin movimientos en ${periodo.toLowerCase()}`}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {hayFiltros || q ? 'Prueba quitando filtros.' : 'Anota el primero arriba.'}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: `46px ${columnas}`, gap: 14, padding: '0 12px 6px',
                    fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)',
                  }}>
                    <span />
                    <span>Movimiento</span>
                    <span>Etiqueta</span>
                    {!compacto && <span>Cuenta</span>}
                    {!compacto && variosUsuarios && <span>Registró</span>}
                    <span />
                    <span style={{ textAlign: 'right' }}>Valor</span>
                  </div>
                  {grupos.map((g) => {
                    const neto = mostrar === 'todos' ? g.ingresos - g.gastos : (mostrar === 'gastos' ? -g.gastos : g.ingresos);
                    return (
                      <div key={g.clave}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 12px 6px', fontSize: 14, color: 'var(--qc-text-muted)' }}>
                          <span>{capitalizar(nombreDia(g.fecha))}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {neto > 0 ? '+' : neto < 0 ? '−' : ''}{codigoMoneda} {montoCorto(Math.abs(neto))}
                          </span>
                        </div>
                        {g.items.map((m) => {
                          const r = m.raw;
                          const certificable = m.tipo === 'ingreso' && envio.puedeEnviar(r);
                          const documento = m.tipo === 'ingreso' && m.cliente
                            ? (r.cliente_documento && r.cliente_documento !== '0' ? `Doc ${r.cliente_documento}` : null)
                            : null;
                          // Las referencias POS- las pone el sistema; las demás (pagos web, Nequi) sí sirven.
                          const referencia = m.tipo === 'ingreso' && r.payment_reference && !String(r.payment_reference).startsWith('POS-')
                            ? `Ref ${r.payment_reference}` : null;
                          // En pantallas medianas la cuenta y quién registró pasan a esta línea.
                          const detalle = [
                            hora(m.fecha),
                            m.tipo === 'ingreso' && m.cliente && m.cliente !== m.titulo ? m.cliente : null,
                            documento, referencia,
                            compacto ? r.cuenta : null,
                            compacto && variosUsuarios ? userMap[String(r.usuario)] : null,
                          ].filter(Boolean).join(' · ');
                          return (
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => abrirMovimiento(m)}
                              onKeyDown={(e) => { if (e.key === 'Enter') abrirMovimiento(m); }}
                              className="qc-mov-fila"
                              style={{
                                display: 'grid', gridTemplateColumns: `46px ${columnas}`, gap: 14, alignItems: 'center',
                                padding: '8px 12px', borderRadius: 16, cursor: 'pointer',
                              }}
                            >
                              <IconoMovimiento m={m} />
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {m.titulo}
                                </span>
                                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {detalle}
                                </span>
                              </span>
                              {/* La etiqueta se cambia aquí mismo, sin abrir el movimiento */}
                              <span style={{ minWidth: 0 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                <EtiquetaCell sutil tipo={m.tipo} record={r} onSaved={() => onRefresh()} />
                              </span>
                              {!compacto && <span style={{ fontSize: 13.5, color: 'var(--qc-text)' }}>{r.cuenta || '—'}</span>}
                              {!compacto && variosUsuarios && (
                                <span style={{ fontSize: 13.5, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {userMap[String(r.usuario)] || (r.usuario ? `ID ${r.usuario}` : user?.name)}
                                </span>
                              )}
                              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                {r.comprobante_url && (
                                  <Tooltip title="Ver documento soporte">
                                    <Button type="text" shape="circle" size="small" icon={<PaperClipOutlined />} href={r.comprobante_url} target="_blank" rel="noopener noreferrer" />
                                  </Tooltip>
                                )}
                                {certificable && (
                                  <Tooltip title={`Enviar ${envio.documentosDe(r)} por correo`}>
                                    <Button type="text" shape="circle" size="small" icon={<MailOutlined />} loading={envio.enviandoId === r._id} onClick={() => envio.enviar(r)} />
                                  </Tooltip>
                                )}
                                <Popconfirm title="¿Borrar este registro?" okText="Borrar" okButtonProps={{ danger: true }} cancelText="Cancelar" onConfirm={() => eliminarMovimiento(m)}>
                                  <Tooltip title="Eliminar">
                                    <Button type="text" shape="circle" size="small" icon={<DeleteOutlined />} />
                                  </Tooltip>
                                </Popconfirm>
                              </span>
                              <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  padding: '6px 11px 6px 6px', borderRadius: 18, background: 'var(--qc-relleno)',
                                  fontSize: 14.5, fontWeight: 700, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                                }}>
                                  <PuntoSigno tipo={m.tipo} size={18} />
                                  {montoCorto(m.valor)}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {listados.length > limite && (
                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <Button onClick={() => setLimite((n) => n + POR_PAGINA)} style={{ borderRadius: 18 }}>
                        Ver más ({listados.length - limite})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {/* Campo puente (lo usa el registro rápido; en computador es inofensivo) */}
        <input ref={proxyRef} aria-hidden tabIndex={-1}
          style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, fontSize: 16, border: 0, padding: 0, pointerEvents: 'none' }} />
        {hojas}
      </div>
    );
  };

  if (esEscritorio) return vistaEscritorio();

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
      {totalesJsx}

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
      {!cargando && barras.length > 0 && barrasJsx}

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
                    r.categoria_nombre,
                    m.tipo === 'ingreso' && m.cliente && m.cliente !== m.titulo ? m.cliente : null,
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
          {puedeDictar && (
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
          aria-label={puedeDictar ? 'Dictar un movimiento' : (tipoPorDefecto === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto')}
          onClick={() => (puedeDictar ? abrirRegistro({ conDictado: true }) : abrirRegistro())}
          style={{
            pointerEvents: 'auto', width: ALTO_BOTONES, height: ALTO_BOTONES, borderRadius: '50%',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, background: CORAL, color: '#fff', boxShadow: '0 8px 22px rgba(240,86,92,0.45)',
          }}
        >
          {puedeDictar ? <AudioOutlined /> : <PlusOutlined />}
        </button>
      </div>

      {hojas}
    </div>
  );
};

export default MovimientosApp;
