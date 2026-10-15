import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Button, Dropdown, Input, List, Modal, Skeleton, Spin, Table, Tabs, Tooltip, message,
} from "antd";
import {
    CalendarOutlined, CheckOutlined, ClockCircleOutlined, CloseOutlined, EditOutlined,
    ExclamationCircleOutlined, FilePdfOutlined, FileTextOutlined, HistoryOutlined, LockOutlined,
    PlusOutlined, PrinterOutlined, ReloadOutlined, SettingOutlined,
} from "@ant-design/icons";
import moment from "moment";

import {
    getPedidos, updateEstadoPedido, getOrderStats, realizarCierre, getCierres, getPedidoById
} from "../../services/pedido/pedidoService";
import { getPersonaById } from "../../services/person/personaService";
import { cuentaOptions } from "../Certificados/options";
import PedidoDrawer from "./PedidoDrawer";
import BottomSheet from "../common/BottomSheet";
import {
    Barras, BotonCircular, BotonesFlotantes, BotonPrincipal, ChipFiltro, ChipOpcion, Circulo, COLOR_SIGNO,
    FondoApp, inicialDe, NumeroGrande, OpcionMenu, PastillaMonto, PildorasFiltro, Seccion, TituloPantalla,
} from "../Certificados/mobile/piezas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import useCurrency, { useAmountShort, useTypedAmount } from "../../hooks/useCurrency";
import useIsMobile from "../../hooks/useIsMobile";

const POR_PAGINA = 80;
const CLAVE_CUENTA = 'qc-pedidos-cuenta';

// ── Lectura de un pedido ──────────────────────────────────────────────────
const itemsDe = (p) => {
    try { return typeof p.items_detalle === 'string' ? JSON.parse(p.items_detalle) : (p.items_detalle || []); }
    catch { return []; }
};
const nombreProducto = (i) => i.producto || i.nombre || 'Producto';
const clienteDe = (p) => `${p.cliente_nombre || ''} ${p.cliente_apellido || ''}`.trim() || 'Cliente general';
const fechaDe = (p) => moment(p.created_at || p.fecha_creacion);
const esCompletado = (p) => p.estado === 'ENTREGADO' || p.estado === 'PAGADO';
const resumenItems = (items) => items.map((i) => `${nombreProducto(i)} × ${i.cantidad}`).join(', ');

const ESTADOS = {
    PENDIENTE: { label: 'Pendiente', color: '#d97706' },
    ENTREGADO: { label: 'Completado', color: COLOR_SIGNO.ingreso },
    PAGADO: { label: 'Pagado', color: COLOR_SIGNO.ingreso },
    ANULADO: { label: 'Anulado', color: '#9ca3af' },
};

const leerLocal = (clave, porDefecto) => { try { return localStorage.getItem(clave) ?? porDefecto; } catch { return porDefecto; } };
const guardarLocal = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } };

const fmtFecha = (d, opciones) => new Intl.DateTimeFormat('es-CO', opciones).format(d.toDate()).replace(/\./g, '');
const hora = (d) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(d.toDate());
// "Hoy", "Ayer" o "10 de octubre" (con el año si no es el actual).
const nombreDia = (d) => {
    const hoy = moment();
    if (d.isSame(hoy, 'day')) return 'Hoy';
    if (d.isSame(hoy.clone().subtract(1, 'day'), 'day')) return 'Ayer';
    return fmtFecha(d, d.isSame(hoy, 'year') ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
};

const EstadoChip = ({ estado }) => {
    const e = ESTADOS[estado] || { label: estado, color: '#9ca3af' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px 2px 8px', borderRadius: 12,
            background: 'var(--qc-relleno)', fontSize: 12.5, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap',
        }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
            {e.label}
        </span>
    );
};

const IconoPedido = ({ p, size = 46 }) => {
    if (p.estado === 'ANULADO') return <Circulo size={size} color="var(--qc-text-muted)"><CloseOutlined style={{ fontSize: 17 }} /></Circulo>;
    if (esCompletado(p)) return <Circulo size={size} fondo={`${COLOR_SIGNO.ingreso}2b`}><CheckOutlined style={{ fontSize: 18 }} /></Circulo>;
    return <Circulo size={size}><ClockCircleOutlined style={{ fontSize: 18 }} /></Circulo>;
};

/**
 * Pedidos con el estilo de Movimientos: el total abierto grande, Pendientes |
 * Completados que filtran, barras con las unidades por producto (lo que hay
 * que preparar) y la lista por día. Tocar un pedido abre su detalle; el ✓
 * de la fila lo marca completado eligiendo a qué cuenta entró el pago.
 */
const PedidosDashboard = () => {
    const formatCurrency = useCurrency();
    const montoCorto = useAmountShort();
    const { codigo } = useTypedAmount();
    const esEscritorio = !useIsMobile();
    const compacto = useIsMobile(1100);

    const [pedidos, setPedidos] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filtros de la vista
    const [vista, setVista] = useState(null);          // null | 'pendientes' | 'completados'
    const [producto, setProducto] = useState(null);    // nombre de producto (barras)
    const [busqueda, setBusqueda] = useState("");
    const [busquedaAbierta, setBusquedaAbierta] = useState(false);
    const [limite, setLimite] = useState(POR_PAGINA);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [detalleId, setDetalleId] = useState(null);

    const [isPosOpen, setIsPosOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);

    const [modalConsolidadoOpen, setModalConsolidadoOpen] = useState(false);
    const [listaConsolidada, setListaConsolidada] = useState([]);

    const [pedidoAEntregar, setPedidoAEntregar] = useState(null);
    const [cuentaDestino, setCuentaDestino] = useState(() => leerLocal(CLAVE_CUENTA, 'Efectivo'));
    const [loadingEntrega, setLoadingEntrega] = useState(false);

    const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
    const [listaCierres, setListaCierres] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const [modalDetalleCierreOpen, setModalDetalleCierreOpen] = useState(false);
    const [pedidosHistoricos, setPedidosHistoricos] = useState([]);
    const [consolidadoHistorico, setConsolidadoHistorico] = useState([]);
    const [totalHistorico, setTotalHistorico] = useState(0);
    const [infoCierreSeleccionado, setInfoCierreSeleccionado] = useState(null);
    const [loadingPedidosHistoricos, setLoadingPedidosHistoricos] = useState(false);

    const calcularConsolidadoDesdePedidos = (listaPedidos) => {
        const mapaProductos = {};
        let sumaTotal = 0;
        listaPedidos.forEach(p => {
            if (p.estado !== 'ANULADO') sumaTotal += Number(p.total);
            itemsDe(p).forEach(item => {
                const nombre = item.producto || item.nombre;
                mapaProductos[nombre] = (mapaProductos[nombre] || 0) + Number(item.cantidad);
            });
        });
        const arrayConsolidado = Object.keys(mapaProductos).map((key, index) => ({ key: index, nombre: key, cantidad: mapaProductos[key] }));
        return { consolidado: arrayConsolidado.sort((a, b) => b.cantidad - a.cantidad), total: sumaTotal };
    };

    const cargarTodo = useCallback(async () => {
        setLoading(true);
        try {
            const [pedidosRes, statsRes] = await Promise.all([getPedidos(), getOrderStats()]);
            const pedidosData = pedidosRes.data || pedidosRes || [];
            setPedidos(pedidosData);
            setStats(statsRes.data || statsRes);
            const { consolidado } = calcularConsolidadoDesdePedidos(pedidosData);
            setListaConsolidada(consolidado);
        } catch (error) {
            message.error("Error al cargar los pedidos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarTodo(); }, [cargarTodo]);

    const abrirHistorial = async () => {
        setMenuAbierto(false);
        setModalHistorialOpen(true);
        setLoadingHistorial(true);
        try {
            const res = await getCierres();
            setListaCierres(res.data || []);
        } catch { message.error("Error cargando historial"); }
        finally { setLoadingHistorial(false); }
    };

    const verDetalleCierre = async (cierre) => {
        setInfoCierreSeleccionado(cierre);
        setModalDetalleCierreOpen(true);
        setLoadingPedidosHistoricos(true);
        try {
            const res = await getPedidos({ cierre_id: cierre.id });
            const pedidosData = res.data || [];
            setPedidosHistoricos(pedidosData);
            const { consolidado, total } = calcularConsolidadoDesdePedidos(pedidosData);
            setConsolidadoHistorico(consolidado);
            setTotalHistorico(total);
        } catch { message.error("Error cargando detalles"); }
        finally { setLoadingPedidosHistoricos(false); }
    };

    const handleCerrarCaja = () => {
        setMenuAbierto(false);
        Modal.confirm({
            title: '¿Cerrar caja y empezar de cero?',
            icon: <ExclamationCircleOutlined />,
            content: 'Los pedidos de ahora se archivan en el historial de cierres y el tablero queda limpio.',
            okText: 'Sí, cerrar', okType: 'danger', cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await realizarCierre("Cierre manual");
                    message.success("Caja cerrada");
                    cargarTodo();
                } catch { message.error("Error al cerrar caja"); }
            },
        });
    };

    const abrirEntrega = (id) => { setDetalleId(null); setPedidoAEntregar(id); };
    const confirmarEntrega = async () => {
        if (!pedidoAEntregar) return;
        setLoadingEntrega(true);
        try {
            await updateEstadoPedido(pedidoAEntregar, { nuevo_estado: 'ENTREGADO', cuenta_destino: cuentaDestino });
            guardarLocal(CLAVE_CUENTA, cuentaDestino);
            message.success("Pedido completado");
            setPedidoAEntregar(null);
            cargarTodo();
        } catch { message.error("No se pudo completar el pedido"); }
        finally { setLoadingEntrega(false); }
    };

    const editarPedido = (id) => { setDetalleId(null); setEditingOrderId(id); setIsPosOpen(true); };
    const nuevoPedido = () => { setEditingOrderId(null); setIsPosOpen(true); };

    const generarPDFHistorico = () => {
        if (!infoCierreSeleccionado) return;
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text(`Cierre #${infoCierreSeleccionado.id}`, 105, 20, null, null, "center");
        doc.setFontSize(12); doc.text(`Fecha: ${new Date(infoCierreSeleccionado.fecha_cierre).toLocaleString()}`, 105, 30, null, null, "center");
        doc.text(`Total Recaudado: ${formatCurrency(totalHistorico)}`, 14, 45);
        autoTable(doc, { startY: 55, head: [['Producto', 'Cant.']], body: consolidadoHistorico.map(i => [i.nombre, i.cantidad]), theme: 'grid' });
        doc.addPage();
        doc.text("Detalle de Pedidos", 14, 20);
        autoTable(doc, { startY: 25, head: [['ID', 'Cliente', 'Estado', 'Total']], body: pedidosHistoricos.map(p => [`#${p.id}`, `${p.cliente_nombre}`, p.estado, formatCurrency(p.total)]) });
        doc.save(`Cierre_${infoCierreSeleccionado.id}.pdf`);
    };

    const generarReciboPDF = async (pedidoResumen) => {
        const loadingMsg = message.loading("Generando factura...", 0);
        try {
            const dataPedido = await getPedidoById(pedidoResumen.id);
            const pedidoCompleto = dataPedido.pedido || dataPedido;
            const items = dataPedido.items || dataPedido.items_detalle || [];
            let clienteNombre = pedidoCompleto.cliente_nombre || "Cliente General";
            let clienteTelefono = pedidoCompleto.cliente_telefono || "";
            let clienteDireccion = "";
            let clienteDocumento = "";
            if (pedidoCompleto.persona_id) {
                try {
                    const persona = await getPersonaById(pedidoCompleto.persona_id);
                    if (persona) {
                        clienteNombre = `${persona.nombre || ""} ${persona.apellido || ""}`.trim() || clienteNombre;
                        clienteTelefono = persona.celular || clienteTelefono;
                        clienteDocumento = persona.numero_documento || "";
                        clienteDireccion = persona.direccion || "";
                    }
                } catch { /* sin datos extra del cliente */ }
            }
            const doc = new jsPDF();
            doc.setFontSize(22); doc.setTextColor(21, 81, 83);
            doc.text("FACTURA DE VENTA", 105, 20, null, null, "center");
            doc.setFontSize(10); doc.setTextColor(100, 100, 100);
            doc.text("Documento Oficial de Transacción", 105, 26, null, null, "center");
            doc.setDrawColor(21, 81, 83); doc.setLineWidth(0.5); doc.line(20, 32, 190, 32);
            const startY = 40;
            doc.setFontSize(11); doc.setTextColor(21, 81, 83); doc.setFont(undefined, 'bold');
            doc.text("DATOS DEL CLIENTE", 20, startY);
            doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
            doc.text(`Nombre: ${clienteNombre}`, 20, startY + 7);
            if (clienteDocumento) doc.text(`CC/NIT: ${clienteDocumento}`, 20, startY + 12);
            if (clienteTelefono) doc.text(`Teléfono: ${clienteTelefono}`, 20, startY + 17);
            if (clienteDireccion) doc.text(`Dirección: ${clienteDireccion}`, 20, startY + 22);
            doc.setFontSize(11); doc.setTextColor(21, 81, 83); doc.setFont(undefined, 'bold');
            doc.text("DETALLES DE FACTURA", 120, startY);
            doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
            const fechaValida = pedidoCompleto.fecha_creacion || pedidoCompleto.created_at
                ? new Date(pedidoCompleto.fecha_creacion || pedidoCompleto.created_at) : new Date();
            const fechaStr = fechaValida.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
            const horaStr = fechaValida.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            doc.text(`N° Factura:`, 120, startY + 7); doc.text(`#${pedidoCompleto.id}`, 155, startY + 7);
            doc.text(`Fecha:`, 120, startY + 12); doc.text(fechaStr, 155, startY + 12);
            doc.text(`Hora:`, 120, startY + 17); doc.text(horaStr, 155, startY + 17);
            doc.text(`Estado:`, 120, startY + 22);
            doc.setTextColor(pedidoCompleto.estado === 'PAGADO' ? 'green' : (pedidoCompleto.estado === 'ANULADO' ? 'red' : 'black'));
            doc.text(pedidoCompleto.estado || 'PENDIENTE', 155, startY + 22); doc.setTextColor(0, 0, 0);
            const productosParaTabla = items.map((item, index) => {
                const nombre = item.producto_nombre || item.producto || item.nombre || 'Producto';
                const cantidad = Number(item.cantidad) || 0;
                const precioUnitario = Number(item.precio_unitario || item.precio || item.monto) || 0;
                return [index + 1, nombre, cantidad, formatCurrency(precioUnitario), formatCurrency(cantidad * precioUnitario)];
            });
            autoTable(doc, {
                startY: startY + 35,
                head: [['#', 'Descripción', 'Cant.', 'Precio Unit.', 'Total']],
                body: productosParaTabla, theme: 'grid',
                headStyles: { fillColor: [21, 81, 83], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 80 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 35, halign: 'right' }, 4: { cellWidth: 35, halign: 'right' } },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
            const finalY = doc.lastAutoTable.finalY || 100;
            let currentY = finalY + 10;
            const total = Number(pedidoCompleto.total) || 0;
            doc.setFillColor(240, 240, 240); doc.rect(125, currentY - 5, 70, 30, 'F');
            doc.setFontSize(10);
            doc.text("Subtotal:", 130, currentY); doc.text(formatCurrency(total), 190, currentY, null, null, "right");
            currentY += 10; doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(21, 81, 83);
            doc.text("TOTAL A PAGAR:", 130, currentY); doc.text(formatCurrency(total), 190, currentY, null, null, "right");
            if (pedidoCompleto.observaciones) {
                doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'bold');
                doc.text("Observaciones:", 20, finalY + 10); doc.setFont(undefined, 'normal'); doc.setTextColor(80, 80, 80);
                doc.text(doc.splitTextToSize(pedidoCompleto.observaciones, 100), 20, finalY + 16);
            }
            doc.setDrawColor(200, 200, 200); doc.line(20, 275, 190, 275);
            doc.setFontSize(9); doc.setTextColor(150, 150, 150);
            doc.text("¡Gracias por su preferencia!", 105, 280, null, null, "center");
            doc.text("Generado automáticamente por el sistema", 105, 285, null, null, "center");
            doc.save(`Factura_${pedidoCompleto.id}_${clienteNombre.replace(/\s+/g, '_')}.pdf`);
            message.success('Factura generada');
        } catch (error) {
            message.error("Error al generar la factura. Intente nuevamente.");
        } finally { loadingMsg(); }
    };

    const generarReporteControlActual = () => {
        const doc = new jsPDF();
        const totalAcumulado = stats?.general?.total_ingresos || 0;
        doc.setFontSize(16); doc.text("Reporte del pedido actual", 105, 15, null, null, "center");
        doc.setDrawColor(21, 81, 83); doc.line(10, 20, 200, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 28);
        doc.text(`Total acumulado: ${formatCurrency(totalAcumulado)}`, 10, 34);
        doc.text(`Pedidos: ${pedidos.length}`, 120, 28);
        doc.text(`Unidades consolidadas: ${listaConsolidada.reduce((acc, i) => acc + Number(i.cantidad || 0), 0)}`, 120, 34);
        autoTable(doc, { startY: 42, head: [['Producto', 'Cantidad']], body: listaConsolidada.map(i => [i.nombre, i.cantidad]), theme: 'grid', headStyles: { fillColor: [21, 81, 83] } });
        const nextY = (doc.lastAutoTable?.finalY || 42) + 8;
        autoTable(doc, { startY: nextY, head: [['Cliente', 'Total pedido']], body: pedidos.map(p => [p.cliente_nombre || '-', formatCurrency(p.total)]), theme: 'grid', headStyles: { fillColor: [21, 81, 83] } });
        let detalleY = (doc.lastAutoTable?.finalY || nextY) + 10;
        pedidos.forEach((p) => {
            const items = itemsDe(p);
            if (detalleY > 260) { doc.addPage(); detalleY = 20; }
            doc.setFontSize(12); doc.text(`Pedido #${p.id} - ${p.cliente_nombre || 'Cliente'}`, 10, detalleY);
            doc.setFontSize(10); doc.text(`Total: ${formatCurrency(p.total)}`, 10, detalleY + 6);
            autoTable(doc, { startY: detalleY + 10, head: [['Producto', 'Cantidad']], body: items.map(i => [i.producto || i.nombre || '-', i.cantidad || 0]), theme: 'striped', headStyles: { fillColor: [21, 81, 83] } });
            detalleY = (doc.lastAutoTable?.finalY || (detalleY + 10)) + 10;
        });
        doc.save("Consolidado_Actual.pdf");
    };

    // ── Datos de la vista ────────────────────────────────────────
    const activos = useMemo(() => pedidos.filter((p) => p.estado !== 'ANULADO'), [pedidos]);
    const pendientes = useMemo(() => pedidos.filter((p) => p.estado === 'PENDIENTE'), [pedidos]);
    const completados = useMemo(() => pedidos.filter(esCompletado), [pedidos]);
    const anulados = pedidos.length - activos.length;
    const suma = (lista) => lista.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const totalAbierto = suma(activos);
    const unidades = activos.reduce((s, p) => s + itemsDe(p).reduce((a, i) => a + (Number(i.cantidad) || 0), 0), 0);

    // Todo menos el producto (las barras muestran a cuál cambiar).
    const q = busqueda.trim().toLowerCase();
    const base = useMemo(() => pedidos.filter((p) => {
        if (vista === 'pendientes' && p.estado !== 'PENDIENTE') return false;
        if (vista === 'completados' && !esCompletado(p)) return false;
        if (q) {
            const texto = [clienteDe(p), `#${p.id}`, String(p.id), resumenItems(itemsDe(p)), p.observaciones].filter(Boolean).join(' ').toLowerCase();
            if (!texto.includes(q)) return false;
        }
        return true;
    }), [pedidos, vista, q]);

    const filtrados = useMemo(
        () => (producto ? base.filter((p) => itemsDe(p).some((i) => nombreProducto(i) === producto)) : base),
        [base, producto],
    );

    // Unidades por producto de lo que se ve (sin anulados): lo que hay que preparar.
    const barras = useMemo(() => {
        const mapa = new Map();
        base.forEach((p) => {
            if (p.estado === 'ANULADO') return;
            itemsDe(p).forEach((i) => {
                const nombre = nombreProducto(i);
                if (!mapa.has(nombre)) mapa.set(nombre, { clave: nombre, nombre, valor: 0, icono: inicialDe(nombre) });
                mapa.get(nombre).valor += Number(i.cantidad) || 0;
            });
        });
        return [...mapa.values()].map((d) => ({ ...d, texto: `×${d.valor}` })).sort((a, b) => b.valor - a.valor);
    }, [base]);

    const grupos = useMemo(() => {
        const mapa = new Map();
        filtrados.slice(0, limite).forEach((p) => {
            const f = fechaDe(p);
            const clave = f.isValid() ? f.format('YYYY-MM-DD') : 'sin-fecha';
            if (!mapa.has(clave)) mapa.set(clave, { clave, fecha: f, items: [], total: 0 });
            const g = mapa.get(clave);
            g.items.push(p);
            if (p.estado !== 'ANULADO') g.total += Number(p.total) || 0;
        });
        return [...mapa.values()];
    }, [filtrados, limite]);

    const detalle = pedidos.find((p) => p.id === detalleId) || null;
    const aEntregar = pedidos.find((p) => p.id === pedidoAEntregar) || null;
    const cargando = loading && pedidos.length === 0;
    const hayFiltros = vista || producto || q;
    const limpiar = () => { setVista(null); setProducto(null); setBusqueda(''); setLimite(POR_PAGINA); };

    // ── Piezas compartidas celular / computador ──────────────────
    const encabezado = (
        <>
            <span style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>
                {activos.length === 0 ? 'Sin pedidos desde el último cierre' : `${activos.length} ${activos.length === 1 ? 'pedido' : 'pedidos'} desde el último cierre`}
            </span>
            <div style={{ marginTop: 4 }}>
                <NumeroGrande valor={cargando ? '…' : montoCorto(totalAbierto)} codigo={codigo} escritorio={esEscritorio} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>
                Total en pedidos{unidades > 0 ? ` · ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}` : ''}{anulados > 0 ? ` · ${anulados} anulado${anulados === 1 ? '' : 's'}` : ''}
            </div>
        </>
    );

    const textoPildora = (icono, n, label, total) => (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15, minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{icono} {n} <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{label}</span></span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{montoCorto(total)}</span>
        </span>
    );
    const pildoras = (
        <PildorasFiltro
            activo={vista}
            onCambiar={(v) => { setVista(v); setLimite(POR_PAGINA); }}
            opciones={[
                { valor: 'pendientes', label: `Pendientes: ${pendientes.length}`, contenido: textoPildora(<ClockCircleOutlined />, pendientes.length, 'Pendientes', suma(pendientes)) },
                { valor: 'completados', label: `Completados: ${completados.length}`, contenido: textoPildora(<CheckOutlined />, completados.length, 'Completados', suma(completados)) },
            ]}
        />
    );

    const barrasJsx = !cargando && barras.length > 0 && (
        <Barras
            datos={barras}
            activo={producto}
            escritorio={esEscritorio}
            onTocar={(d) => { setProducto((x) => (x === d.clave ? null : d.clave)); setLimite(POR_PAGINA); }}
        />
    );

    const opcionesMenu = [
        { key: 'reporte', icon: <FileTextOutlined />, titulo: 'Reporte de la caja actual', detalle: 'Unidades por producto y por cliente, en PDF', onClick: () => { setMenuAbierto(false); setModalConsolidadoOpen(true); } },
        { key: 'historial', icon: <HistoryOutlined />, titulo: 'Historial de cierres', detalle: 'Cajas anteriores con su detalle', onClick: abrirHistorial },
        { key: 'cerrar', icon: <LockOutlined />, titulo: 'Cerrar caja', detalle: 'Archiva los pedidos y deja el tablero limpio', onClick: handleCerrarCaja, peligro: true },
        { key: 'actualizar', icon: <ReloadOutlined />, titulo: 'Actualizar', onClick: () => { setMenuAbierto(false); cargarTodo(); } },
    ];

    const vacio = (
        <div style={{ textAlign: 'center', padding: '44px 16px', color: 'var(--qc-text-muted)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--qc-text)' }}>
                {hayFiltros ? 'Nada coincide con la búsqueda' : 'Todo limpio. ¡Listo para nuevas ventas!'}
            </div>
            <div style={{ fontSize: 13, margin: '4px 0 14px' }}>
                {hayFiltros ? 'Prueba quitando filtros.' : 'Los pedidos nuevos aparecen aquí hasta que cierres caja.'}
            </div>
            {hayFiltros
                ? <Button type="link" onClick={limpiar}>Quitar filtros</Button>
                : <BotonPrincipal onClick={nuevoPedido} style={{ height: 44, padding: '0 20px', borderRadius: 22 }}><PlusOutlined /> Nuevo pedido</BotonPrincipal>}
        </div>
    );

    const verMas = filtrados.length > limite && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
            <Button onClick={() => setLimite((n) => n + POR_PAGINA)} style={{ borderRadius: 18 }}>Ver más ({filtrados.length - limite})</Button>
        </div>
    );

    const botonCompletar = (p, size = 36) => (
        <Tooltip title="Marcar completado">
            <button
                type="button"
                aria-label={`Marcar completado el pedido #${p.id}`}
                onClick={(e) => { e.stopPropagation(); abrirEntrega(p.id); }}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                    width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    background: 'var(--qc-relleno)', color: 'var(--qc-text)',
                }}
            >
                <CheckOutlined />
            </button>
        </Tooltip>
    );

    // ── Hojas (celular y computador) ─────────────────────────────
    const detalleItems = detalle ? itemsDe(detalle) : [];
    const hojas = (
        <>
            {/* Detalle del pedido */}
            <BottomSheet
                open={!!detalle}
                onClose={() => setDetalleId(null)}
                lateral={esEscritorio}
                width={460}
                title={detalle ? `Pedido #${detalle.id}` : ''}
                subtitle={detalle ? [fechaDe(detalle).isValid() ? `${nombreDia(fechaDe(detalle))}, ${hora(fechaDe(detalle))}` : null, ESTADOS[detalle.estado]?.label].filter(Boolean).join(' · ') : ''}
                extra={detalle?.estado === 'PENDIENTE' && <BotonCircular label="Editar" onClick={() => editarPedido(detalle.id)}><EditOutlined /></BotonCircular>}
            >
                {detalle && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Circulo size={42}>{inicialDe(clienteDe(detalle))}</Circulo>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--qc-text)' }}>{clienteDe(detalle)}</div>
                                <EstadoChip estado={detalle.estado} />
                            </div>
                        </div>

                        <Seccion>Productos</Seccion>
                        {detalleItems.length === 0 && <div style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>Sin productos.</div>}
                        {detalleItems.map((i, k) => (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--qc-border)' }}>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--qc-text)' }}>{nombreProducto(i)}</span>
                                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
                                        × {i.cantidad}{Number(i.precio) > 0 ? ` · ${montoCorto(i.precio)} c/u` : ''}
                                    </span>
                                </span>
                                {Number(i.precio) > 0 && (
                                    <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>
                                        {montoCorto(Number(i.precio) * Number(i.cantidad))}
                                    </span>
                                )}
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 }}>
                            <span style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>Total</span>
                            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>
                                {montoCorto(detalle.total)} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--qc-text-muted)' }}>{codigo}</span>
                            </span>
                        </div>

                        {detalle.observaciones && (
                            <>
                                <Seccion>Observaciones</Seccion>
                                <div style={{ fontSize: 14, color: 'var(--qc-text)', lineHeight: 1.5 }}>{detalle.observaciones}</div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
                            {detalle.estado === 'PENDIENTE' && (
                                <ChipOpcion activo onClick={() => abrirEntrega(detalle.id)} style={{ minHeight: 44 }}><CheckOutlined /> Marcar completado</ChipOpcion>
                            )}
                            {detalle.estado === 'PENDIENTE' && (
                                <ChipOpcion onClick={() => editarPedido(detalle.id)} style={{ minHeight: 44 }}><EditOutlined /> Editar</ChipOpcion>
                            )}
                            <ChipOpcion onClick={() => generarReciboPDF(detalle)} style={{ minHeight: 44 }}><PrinterOutlined /> Factura PDF</ChipOpcion>
                        </div>
                    </>
                )}
            </BottomSheet>

            {/* Completar: a qué cuenta entró el pago */}
            <BottomSheet
                open={!!aEntregar}
                onClose={() => setPedidoAEntregar(null)}
                lateral={esEscritorio}
                width={420}
                title="¿Dónde entró el pago?"
                subtitle={aEntregar ? `Pedido #${aEntregar.id} · ${clienteDe(aEntregar)} · ${formatCurrency(aEntregar.total)}` : ''}
                footer={(
                    <BotonPrincipal onClick={confirmarEntrega} cargando={loadingEntrega} style={{ width: '100%', height: 50, borderRadius: 16, fontSize: 15.5 }}>
                        <CheckOutlined /> Marcar completado
                    </BotonPrincipal>
                )}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {cuentaOptions.map((c) => (
                        <ChipOpcion key={c.value} activo={cuentaDestino === c.value} onClick={() => setCuentaDestino(c.value)} style={{ minHeight: 48, borderRadius: 14 }}>
                            {c.label}
                        </ChipOpcion>
                    ))}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', marginTop: 12 }}>
                    El pedido queda completado y la venta se registra como ingreso en esa cuenta.
                </div>
            </BottomSheet>

            {/* Opciones (celular) */}
            <BottomSheet open={menuAbierto} onClose={() => setMenuAbierto(false)} title="Pedidos">
                {opcionesMenu.map((o) => (
                    <OpcionMenu key={o.key} icon={o.icon} titulo={o.titulo} detalle={o.detalle} onClick={o.onClick} />
                ))}
            </BottomSheet>
        </>
    );

    // ── Computador ───────────────────────────────────────────────
    const vistaEscritorio = () => {
        const columnas = compacto
            ? 'minmax(170px, 1.6fr) minmax(160px, 1.6fr) 110px 100px'
            : 'minmax(190px, 1.6fr) minmax(200px, 2fr) 120px 108px 124px';
        return (
            <FondoApp escritorio>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TituloPantalla escritorio>Pedidos</TituloPantalla>
                    <span style={{ flex: 1 }} />
                    <Input
                        allowClear
                        placeholder="Buscar cliente, #pedido o producto…"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA); }}
                        style={{ width: 280, borderRadius: 18 }}
                    />
                    <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        menu={{
                            items: opcionesMenu.map((o) => ({
                                key: o.key, icon: o.icon, label: o.titulo, danger: o.peligro, onClick: o.onClick,
                            })),
                        }}
                    >
                        <span><BotonCircular label="Opciones"><SettingOutlined /></BotonCircular></span>
                    </Dropdown>
                    <BotonPrincipal onClick={nuevoPedido} style={{ height: 42, padding: '0 18px', borderRadius: 21, fontSize: 14.5 }}>
                        <PlusOutlined /> Nuevo pedido
                    </BotonPrincipal>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: compacto ? 'minmax(0, 1fr)' : 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 28, alignItems: 'center', marginTop: 22 }}>
                    <div>
                        {encabezado}
                        <div style={{ maxWidth: 520, marginTop: 16 }}>{pildoras}</div>
                    </div>
                    <div style={{ borderRadius: 22, padding: 20, background: 'var(--qc-surface)', border: '1px solid var(--qc-border)' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--qc-text)' }}>Caja actual</div>
                        <div style={{ fontSize: 13, color: 'var(--qc-text-muted)', marginTop: 2 }}>
                            Al cerrar caja, los pedidos pasan al historial con su reporte.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                            {[
                                { t: 'Pedidos', v: activos.length },
                                { t: 'Unidades', v: unidades },
                                { t: 'Por completar', v: pendientes.length },
                            ].map((d) => (
                                <div key={d.t} style={{ padding: '10px 12px', borderRadius: 14, background: 'var(--qc-relleno)' }}>
                                    <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{d.t}</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums' }}>{d.v}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                            <ChipOpcion onClick={() => setModalConsolidadoOpen(true)} style={{ minHeight: 36, fontSize: 13 }}><FileTextOutlined /> Reporte</ChipOpcion>
                            <ChipOpcion onClick={abrirHistorial} style={{ minHeight: 36, fontSize: 13 }}><HistoryOutlined /> Historial</ChipOpcion>
                            <ChipOpcion onClick={handleCerrarCaja} style={{ minHeight: 36, fontSize: 13, color: COLOR_SIGNO.gasto }}><LockOutlined /> Cerrar caja</ChipOpcion>
                        </div>
                    </div>
                </div>

                {barrasJsx}

                {(producto || q) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                        {producto && <ChipFiltro onQuitar={() => setProducto(null)}>{producto}</ChipFiltro>}
                        <Button type="link" onClick={limpiar}>Limpiar</Button>
                    </div>
                )}

                {cargando ? (
                    <div style={{ marginTop: 20 }}><Skeleton active avatar paragraph={{ rows: 3 }} /></div>
                ) : filtrados.length === 0 ? vacio : (
                    <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `46px ${columnas}`, gap: 14, padding: '0 12px 6px', fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)' }}>
                            <span />
                            <span>Cliente</span>
                            <span>Productos</span>
                            {!compacto && <span>Estado</span>}
                            <span />
                            <span style={{ textAlign: 'right' }}>Total</span>
                        </div>
                        {grupos.map((g) => (
                            <div key={g.clave}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 12px 6px', fontSize: 14, color: 'var(--qc-text-muted)' }}>
                                    <span>{g.fecha.isValid() ? nombreDia(g.fecha).replace(/^./, (c) => c.toUpperCase()) : 'Sin fecha'}</span>
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{codigo} {montoCorto(g.total)}</span>
                                </div>
                                {g.items.map((p) => {
                                    const items = itemsDe(p);
                                    const f = fechaDe(p);
                                    const anulado = p.estado === 'ANULADO';
                                    return (
                                        <div
                                            key={p.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setDetalleId(p.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setDetalleId(p.id); }}
                                            className="qc-mov-fila"
                                            style={{
                                                display: 'grid', gridTemplateColumns: `46px ${columnas}`, gap: 14, alignItems: 'center',
                                                padding: '8px 12px', borderRadius: 16, cursor: 'pointer', opacity: anulado ? 0.55 : 1,
                                            }}
                                        >
                                            <IconoPedido p={p} />
                                            <span style={{ minWidth: 0 }}>
                                                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clienteDe(p)}</span>
                                                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
                                                    #{p.id}{f.isValid() ? ` · ${hora(f)}` : ''}{compacto ? ` · ${ESTADOS[p.estado]?.label || p.estado}` : ''}
                                                </span>
                                            </span>
                                            <span style={{ minWidth: 0, fontSize: 13.5, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {items.length ? resumenItems(items) : <span style={{ color: 'var(--qc-text-muted)' }}>—</span>}
                                            </span>
                                            {!compacto && <span><EstadoChip estado={p.estado} /></span>}
                                            <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                                <Tooltip title="Factura PDF">
                                                    <Button type="text" shape="circle" size="small" icon={<PrinterOutlined />} onClick={() => generarReciboPDF(p)} />
                                                </Tooltip>
                                                {p.estado === 'PENDIENTE' && (
                                                    <Tooltip title="Editar">
                                                        <Button type="text" shape="circle" size="small" icon={<EditOutlined />} onClick={() => editarPedido(p.id)} />
                                                    </Tooltip>
                                                )}
                                                {p.estado === 'PENDIENTE' && botonCompletar(p, 30)}
                                            </span>
                                            <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <PastillaMonto apagado={anulado}>{montoCorto(p.total)}</PastillaMonto>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {verMas}
                    </div>
                )}
                {hojas}
            </FondoApp>
        );
    };

    // ── Celular ──────────────────────────────────────────────────
    const vistaCelular = () => (
        <FondoApp>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TituloPantalla>Pedidos</TituloPantalla>
                <span style={{ flex: 1 }} />
                <BotonCircular label="Historial de cierres" onClick={abrirHistorial}><HistoryOutlined /></BotonCircular>
                <BotonCircular label="Opciones" onClick={() => setMenuAbierto(true)}><SettingOutlined /></BotonCircular>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 0 18px' }}>{encabezado}</div>

            {pildoras}

            {busquedaAbierta && (
                <Input
                    autoFocus
                    allowClear
                    size="large"
                    placeholder="Buscar cliente, #pedido o producto…"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setLimite(POR_PAGINA); }}
                    style={{ marginTop: 12, borderRadius: 22, fontSize: 16 }}
                />
            )}
            {producto && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <ChipFiltro onQuitar={() => setProducto(null)}>{producto}</ChipFiltro>
                </div>
            )}
            {barrasJsx}

            {cargando ? (
                <div style={{ marginTop: 20 }}>
                    {[0, 1, 2, 3].map((i) => <div key={i} style={{ padding: '10px 0' }}><Skeleton active avatar paragraph={{ rows: 1 }} title={false} /></div>)}
                </div>
            ) : filtrados.length === 0 ? vacio : (
                <div style={{ marginTop: 10 }}>
                    {grupos.map((g) => (
                        <div key={g.clave}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 2px 4px' }}>
                                <span style={{ fontSize: 14, color: 'var(--qc-text-muted)' }}>{g.fecha.isValid() ? nombreDia(g.fecha) : 'Sin fecha'}</span>
                                <span style={{ fontSize: 14, color: 'var(--qc-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{codigo} {montoCorto(g.total)}</span>
                            </div>
                            {g.items.map((p) => {
                                const items = itemsDe(p);
                                const anulado = p.estado === 'ANULADO';
                                const sub = [items.length ? resumenItems(items) : null, `#${p.id}`].filter(Boolean).join(' · ');
                                return (
                                    <div
                                        key={p.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setDetalleId(p.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalleId(p.id); } }}
                                        className="qc-mov-fila"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', margin: '0 -4px',
                                            borderRadius: 16, cursor: 'pointer', opacity: anulado ? 0.55 : 1,
                                        }}
                                    >
                                        <IconoPedido p={p} />
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clienteDe(p)}</span>
                                            <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
                                        </span>
                                        {p.estado === 'PENDIENTE' && botonCompletar(p)}
                                        <PastillaMonto apagado={anulado}>{montoCorto(p.total)}</PastillaMonto>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    {verMas}
                </div>
            )}

            <BotonesFlotantes
                onBuscar={() => { if (busquedaAbierta) setBusqueda(''); setBusquedaAbierta((v) => !v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                buscando={busquedaAbierta}
                onPrincipal={nuevoPedido}
                labelPrincipal="Nuevo pedido"
            />
            {hojas}
        </FondoApp>
    );

    const totalAcumulado = stats?.general?.total_ingresos || 0;

    return (
        <>
            {esEscritorio ? vistaEscritorio() : vistaCelular()}

            {/* ── MODALES ── */}
            <PedidoDrawer open={isPosOpen} onClose={() => { setIsPosOpen(false); setEditingOrderId(null); }} onSuccess={cargarTodo} orderIdToEdit={editingOrderId} />

            <Modal
                title="Reporte de la caja actual"
                open={modalConsolidadoOpen}
                onCancel={() => setModalConsolidadoOpen(false)}
                footer={null}
                width={Math.min(600, window.innerWidth - 16)}
            >
                <div style={{ background: 'var(--qc-relleno)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                        {[
                            { label: 'Fecha', value: new Date().toLocaleString() },
                            { label: 'Total acumulado', value: formatCurrency(totalAcumulado) },
                            { label: 'Pedidos', value: pedidos.length },
                            { label: 'Unidades consolidadas', value: listaConsolidada.reduce((acc, i) => acc + Number(i.cantidad || 0), 0) },
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ color: 'var(--qc-text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>{item.label}</div>
                                <div style={{ fontWeight: 600, color: 'var(--qc-text)' }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <Table dataSource={listaConsolidada} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center', width: 80 }]} pagination={false} size="small" scroll={{ y: 220 }} />
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)', marginBottom: 6 }}>Detalle por cliente</div>
                <Table dataSource={pedidos} columns={[{ title: 'Cliente', dataIndex: 'cliente_nombre', ellipsis: true }, { title: 'Total', dataIndex: 'total', align: 'right', render: (val) => formatCurrency(val), width: 120 }]} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
                <BotonPrincipal onClick={generarReporteControlActual} style={{ width: '100%', height: 44, borderRadius: 14, marginTop: 16 }}>
                    <FilePdfOutlined /> Descargar PDF
                </BotonPrincipal>
            </Modal>

            <Modal
                title="Historial de cierres"
                open={modalHistorialOpen}
                onCancel={() => setModalHistorialOpen(false)}
                footer={null}
                width={Math.min(560, window.innerWidth - 16)}
            >
                <List
                    loading={loadingHistorial}
                    dataSource={listaCierres}
                    locale={{ emptyText: 'Aún no has cerrado caja.' }}
                    renderItem={item => (
                        <List.Item actions={[<Button key="v" type="link" onClick={() => verDetalleCierre(item)}>Ver detalle</Button>]}>
                            <List.Item.Meta
                                avatar={<Circulo size={40}><CalendarOutlined style={{ fontSize: 16 }} /></Circulo>}
                                title={<span style={{ fontWeight: 600 }}>Cierre #{item.id}</span>}
                                description={`${new Date(item.fecha_cierre).toLocaleDateString()} — ${formatCurrency(item.total_ingresos)}`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            <Modal
                title={infoCierreSeleccionado ? `Cierre #${infoCierreSeleccionado.id}` : 'Detalle'}
                open={modalDetalleCierreOpen}
                onCancel={() => setModalDetalleCierreOpen(false)}
                footer={null}
                width={Math.min(860, window.innerWidth - 16)}
            >
                <Spin spinning={loadingPedidosHistoricos}>
                    <div style={{ background: 'var(--qc-relleno)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                            <div style={{ color: 'var(--qc-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total recaudado</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--qc-text)' }}>{formatCurrency(totalHistorico)}</div>
                        </div>
                        <BotonPrincipal onClick={generarPDFHistorico} style={{ height: 40, padding: '0 16px', borderRadius: 14 }}>
                            <FilePdfOutlined /> Descargar PDF
                        </BotonPrincipal>
                    </div>
                    <Tabs defaultActiveKey="1" items={[
                        {
                            key: '1', label: 'Consolidado',
                            children: <Table dataSource={consolidadoHistorico} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center', width: 80, sorter: (a, b) => a.cantidad - b.cantidad }]} pagination={false} size="small" scroll={{ y: 300 }} />
                        },
                        {
                            key: '2', label: 'Pedidos',
                            children: <Table dataSource={pedidosHistoricos} columns={[{ title: '#', dataIndex: 'id', width: 60, render: (id) => `#${id}` }, { title: 'Cliente', dataIndex: 'cliente_nombre', ellipsis: true }, { title: 'Estado', dataIndex: 'estado', width: 130, render: (e) => <EstadoChip estado={e} /> }, { title: 'Total', dataIndex: 'total', render: (val) => formatCurrency(val), width: 120, align: 'right' }]} rowKey="id" pagination={{ pageSize: 8 }} size="small" scroll={{ x: 'max-content' }} />
                        }
                    ]} />
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setModalDetalleCierreOpen(false)}>Cerrar</Button>
                    </div>
                </Spin>
            </Modal>
        </>
    );
};

export default PedidosDashboard;
