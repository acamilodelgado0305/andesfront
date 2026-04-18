import React, { useState, useEffect, useCallback } from "react";
import {
    Layout, Typography, Button, Spin, Modal, message,
    Statistic, Select, Table, List, Tag, Tabs, Input, Avatar, Card, Tooltip
} from "antd";
import {
    PlusOutlined, ShoppingCartOutlined, UserOutlined,
    CheckCircleOutlined, EditOutlined, FilePdfOutlined,
    PrinterOutlined, FileTextOutlined, ReloadOutlined,
    ExclamationCircleOutlined, LockOutlined, HistoryOutlined,
    CalendarOutlined, SearchOutlined, DollarOutlined
} from "@ant-design/icons";

import {
    getPedidos, updateEstadoPedido, getOrderStats, realizarCierre, getCierres, getPedidoById
} from "../../services/pedido/pedidoService";
import { getPersonaById } from "../../services/person/personaService";
import { cuentaOptions } from "../Certificados/options";
import POSModal from "./POSModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import useCurrency, { useCurrencyInput } from "../../hooks/useCurrency";
import useIsMobile from "../../hooks/useIsMobile";

const { Content } = Layout;
const { Title, Text } = Typography;

const estadoColor = { PENDIENTE: 'orange', ENTREGADO: 'green', PAGADO: 'green', ANULADO: 'red' };

const PedidosDashboard = () => {
    const formatCurrency = useCurrency();
    const { prefix: currPrefix } = useCurrencyInput();
    const isMobile = useIsMobile();

    const [pedidos, setPedidos] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busquedaPedido, setBusquedaPedido] = useState("");

    const [isPosOpen, setIsPosOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);

    const [modalConsolidadoOpen, setModalConsolidadoOpen] = useState(false);
    const [listaConsolidada, setListaConsolidada] = useState([]);

    const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
    const [pedidoAEntregar, setPedidoAEntregar] = useState(null);
    const [cuentaDestino, setCuentaDestino] = useState('Efectivo');
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
            let items = [];
            try { items = typeof p.items_detalle === 'string' ? JSON.parse(p.items_detalle) : (p.items_detalle || []); } catch (e) { items = []; }
            items.forEach(item => {
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
            message.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarTodo(); }, [cargarTodo]);

    const abrirHistorial = async () => {
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
        Modal.confirm({
            title: '¿Cerrar Caja y Reiniciar?',
            icon: <ExclamationCircleOutlined />,
            content: 'Esta acción limpiará el tablero actual y archivará los pedidos.',
            okText: 'Sí, Cerrar', okType: 'danger', cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await realizarCierre("Cierre manual");
                    message.success("Caja cerrada exitosamente.");
                    cargarTodo();
                } catch { message.error("Error al cerrar caja"); }
            },
        });
    };

    const confirmarEntrega = async () => {
        if (!pedidoAEntregar) return;
        setLoadingEntrega(true);
        try {
            await updateEstadoPedido(pedidoAEntregar, { nuevo_estado: 'ENTREGADO', cuenta_destino: cuentaDestino });
            message.success("Entregado"); setModalEntregaOpen(false); cargarTodo();
        } catch { message.error("Error"); }
        finally { setLoadingEntrega(false); }
    };

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
                } catch { }
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
            const fechaValida = pedidoCompleto.fecha_creacion ? new Date(pedidoCompleto.fecha_creacion) : new Date();
            const fechaStr = fechaValida.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
            const horaStr = fechaValida.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            doc.text(`N° Factura:`, 120, startY + 7); doc.text(`#${pedidoCompleto.id}`, 155, startY + 7);
            doc.text(`Fecha:`, 120, startY + 12); doc.text(fechaStr, 155, startY + 12);
            doc.text(`Hora:`, 120, startY + 17); doc.text(horaStr, 155, startY + 17);
            doc.text(`Estado:`, 120, startY + 22);
            doc.setTextColor(pedidoCompleto.estado === 'PAGADO' ? 'green' : (pedidoCompleto.estado === 'ANULADO' ? 'red' : 'black'));
            doc.text(pedidoCompleto.estado || 'PENDIENTE', 155, startY + 22); doc.setTextColor(0, 0, 0);
            const productosParaTabla = items.map((item, index) => {
                const nombreProducto = item.producto_nombre || item.producto || item.nombre || 'Producto';
                const cantidad = Number(item.cantidad) || 0;
                const precioUnitario = Number(item.precio_unitario || item.precio || item.monto) || 0;
                return [index + 1, nombreProducto, cantidad, formatCurrency(precioUnitario), formatCurrency(cantidad * precioUnitario)];
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
            message.success('Factura generada exitosamente');
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
            let items = [];
            try { items = typeof p.items_detalle === 'string' ? JSON.parse(p.items_detalle) : (p.items_detalle || []); } catch { items = []; }
            if (detalleY > 260) { doc.addPage(); detalleY = 20; }
            doc.setFontSize(12); doc.text(`Pedido #${p.id} - ${p.cliente_nombre || 'Cliente'}`, 10, detalleY);
            doc.setFontSize(10); doc.text(`Total: ${formatCurrency(p.total)}`, 10, detalleY + 6);
            autoTable(doc, { startY: detalleY + 10, head: [['Producto', 'Cantidad']], body: items.map(i => [i.producto || i.nombre || '-', i.cantidad || 0]), theme: 'striped', headStyles: { fillColor: [21, 81, 83] } });
            detalleY = (doc.lastAutoTable?.finalY || (detalleY + 10)) + 10;
        });
        doc.save("Consolidado_Actual.pdf");
    };

    const pedidosFiltrados = pedidos.filter(p => {
        if (!busquedaPedido.trim()) return true;
        return (p.cliente_nombre || "").toLowerCase().includes(busquedaPedido.trim().toLowerCase());
    });

    const totalAcumulado = stats?.general?.total_ingresos || 0;
    const totalPendientes = stats?.por_estado?.find(e => e.name === 'PENDIENTE')?.value || 0;

    // ─── Chips de estadísticas (estilo Inventario) ──────────
    const statChips = [
        { label: `${pedidos.length} pedidos`, color: 'default' },
        { label: `${totalPendientes} pendientes`, color: 'orange' },
        ...(pedidos.filter(p => p.estado === 'ENTREGADO' || p.estado === 'PAGADO').length > 0
            ? [{ label: `${pedidos.filter(p => p.estado === 'ENTREGADO' || p.estado === 'PAGADO').length} entregados`, color: 'green' }]
            : []),
    ];

    // ─── Columnas de la tabla ────────────────────────────────
    const columns = [
        {
            title: 'Estado',
            dataIndex: 'estado',
            width: 110,
            render: (estado) => (
                <Tag color={estadoColor[estado] || 'default'} style={{ fontWeight: 600, fontSize: 11 }}>
                    {estado}
                </Tag>
            ),
            filters: [
                { text: 'Pendiente', value: 'PENDIENTE' },
                { text: 'Entregado', value: 'ENTREGADO' },
                { text: 'Pagado', value: 'PAGADO' },
                { text: 'Anulado', value: 'ANULADO' },
            ],
            onFilter: (value, record) => record.estado === value,
        },
        {
            title: 'Cliente',
            dataIndex: 'cliente_nombre',
            render: (nombre, record) => {
                const inicial = (nombre || 'C')[0].toUpperCase();
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar style={{ background: '#155153', borderRadius: 8, width: 34, height: 34, lineHeight: '34px', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {inicial}
                        </Avatar>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {nombre || 'Cliente General'}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>#{record.id}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Productos',
            dataIndex: 'items_detalle',
            render: (items_detalle) => {
                let items = [];
                try { items = typeof items_detalle === 'string' ? JSON.parse(items_detalle) : (items_detalle || []); } catch { items = []; }
                if (items.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                return (
                    <div style={{ fontSize: 12, color: '#475569' }}>
                        {items.slice(0, 2).map((i, k) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{i.producto || i.nombre}</span>
                                <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: '#94a3b8' }}>×{i.cantidad}</span>
                            </div>
                        ))}
                        {items.length > 2 && <div style={{ color: '#94a3b8', fontSize: 11 }}>+{items.length - 2} más</div>}
                    </div>
                );
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            width: 130,
            align: 'right',
            sorter: (a, b) => Number(a.total) - Number(b.total),
            render: (val) => (
                <span style={{ fontWeight: 800, color: '#155153', fontSize: 14 }}>{formatCurrency(val)}</span>
            ),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha_creacion',
            width: 110,
            render: (fecha) => fecha
                ? <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                : '—',
            sorter: (a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 110,
            align: 'center',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <Tooltip title="Imprimir factura">
                        <Button size="small" icon={<PrinterOutlined />} onClick={() => generarReciboPDF(record)} />
                    </Tooltip>
                    <Tooltip title="Editar">
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingOrderId(record.id); setIsPosOpen(true); }} disabled={record.estado !== 'PENDIENTE'} />
                    </Tooltip>
                    {record.estado === 'PENDIENTE' && (
                        <Tooltip title="Marcar entregado">
                            <Button size="small" type="primary" style={{ background: '#155153' }} icon={<CheckCircleOutlined />} onClick={() => { setPedidoAEntregar(record.id); setModalEntregaOpen(true); }} />
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ];

    // ─── Mobile card renderer ────────────────────────────────
    const renderMobileCard = (record) => {
        let items = [];
        try { items = typeof record.items_detalle === 'string' ? JSON.parse(record.items_detalle) : (record.items_detalle || []); } catch { items = []; }

        const productosText = items.length > 0
            ? items.slice(0, 3).map(i => `${i.producto || i.nombre} × ${i.cantidad}`).join(', ') + (items.length > 3 ? ` +${items.length - 3} más` : '')
            : '—';

        const fecha = record.fecha_creacion
            ? new Date(record.fecha_creacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            : '—';

        return (
            <div
                key={record.id}
                className={record.estado === 'ANULADO' ? 'opacity-40' : ''}
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    padding: 16,
                    marginBottom: 12,
                }}
            >
                {/* Row 1: Estado + ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Tag color={estadoColor[record.estado] || 'default'} style={{ fontWeight: 600, fontSize: 11, margin: 0 }}>
                        {record.estado}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>#{record.id}</span>
                </div>

                {/* Row 2: Cliente */}
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>
                    {record.cliente_nombre || 'Cliente General'}
                </div>

                {/* Row 3: Productos */}
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
                    {productosText}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 10 }} />

                {/* Row 4: Fecha + Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{fecha}</span>
                    <span style={{ fontWeight: 800, color: '#155153', fontSize: 15 }}>{formatCurrency(record.total)}</span>
                </div>

                {/* Row 5: Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="small" icon={<PrinterOutlined />} onClick={() => generarReciboPDF(record)}>
                        Factura
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => { setEditingOrderId(record.id); setIsPosOpen(true); }}
                        disabled={record.estado !== 'PENDIENTE'}
                    >
                        Editar
                    </Button>
                    {record.estado === 'PENDIENTE' && (
                        <Button
                            size="small"
                            type="primary"
                            style={{ background: '#155153', borderColor: '#155153' }}
                            icon={<CheckCircleOutlined />}
                            onClick={() => { setPedidoAEntregar(record.id); setModalEntregaOpen(true); }}
                        >
                            Entregar
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Layout className="min-h-screen" style={{ background: 'transparent' }}>
            <Content style={{ padding: isMobile ? '12px' : '24px', paddingBottom: 80 }}>

                {/* ── HEADER ── */}
                <Card style={{ borderRadius: 12, marginBottom: 20, border: '1px solid #e2e8f0' }} bodyStyle={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(21,81,83,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ShoppingCartOutlined style={{ fontSize: 22, color: '#155153' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, color: '#155153', lineHeight: 1.2 }}>Pedidos</Title>
                                <Text type="secondary" style={{ fontSize: 13 }}>Gestiona los pedidos activos del día</Text>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Button icon={<ReloadOutlined />} onClick={cargarTodo} loading={loading} />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                style={{ background: '#155153', borderColor: '#155153' }}
                                onClick={() => { setEditingOrderId(null); setIsPosOpen(true); }}
                            >
                                Nuevo Pedido
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* ── STATS + ACCIONES ── */}
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'flex-start' : 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 12,
                    marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {statChips.map((chip, i) => (
                            <Tag key={i} color={chip.color} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>{chip.label}</Tag>
                        ))}
                        {stats && (
                            <Tag color="blue" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
                                <DollarOutlined style={{ marginRight: 4 }} />
                                {formatCurrency(totalAcumulado)}
                            </Tag>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                        <Button size="small" icon={<HistoryOutlined />} onClick={abrirHistorial} style={isMobile ? { flex: 1 } : {}}>Historial</Button>
                        <Button size="small" icon={<FileTextOutlined />} style={{ background: '#f97316', color: '#fff', borderColor: '#f97316', ...(isMobile ? { flex: 1 } : {}) }} onClick={() => setModalConsolidadoOpen(true)}>Reporte</Button>
                        <Button size="small" danger icon={<LockOutlined />} onClick={handleCerrarCaja} style={isMobile ? { flex: 1 } : {}}>Cerrar caja</Button>
                    </div>
                </div>

                {/* ── BARRA DE BÚSQUEDA ── */}
                <div style={{ marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="Buscar por nombre de cliente..."
                        allowClear
                        value={busquedaPedido}
                        onChange={(e) => setBusquedaPedido(e.target.value)}
                        style={isMobile ? { width: '100%' } : { maxWidth: 340 }}
                    />
                </div>

                {/* ── TABLA / CARDS ── */}
                {isMobile ? (
                    <div>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                <Spin />
                            </div>
                        ) : pedidosFiltrados.length === 0 ? (
                            <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
                                <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                                <p style={{ margin: 0 }}>Todo limpio. ¡Listo para nuevas ventas!</p>
                            </div>
                        ) : (
                            pedidosFiltrados.map(record => renderMobileCard(record))
                        )}
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <Table
                            dataSource={pedidosFiltrados}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            size="middle"
                            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `${total} pedidos` }}
                            scroll={{ x: 700 }}
                            locale={{
                                emptyText: (
                                    <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
                                        <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                                        <p style={{ margin: 0 }}>Todo limpio. ¡Listo para nuevas ventas!</p>
                                    </div>
                                )
                            }}
                            rowClassName={(record) => record.estado === 'ANULADO' ? 'opacity-40' : ''}
                        />
                    </div>
                )}

                {/* ── MODALES ── */}
                <POSModal visible={isPosOpen} onClose={() => setIsPosOpen(false)} onSaved={cargarTodo} orderIdToEdit={editingOrderId} />

                <Modal
                    title="Consolidado Actual"
                    open={modalConsolidadoOpen}
                    onCancel={() => setModalConsolidadoOpen(false)}
                    footer={null}
                    width={Math.min(600, window.innerWidth - 16)}
                >
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                            {[
                                { label: 'Fecha', value: new Date().toLocaleString() },
                                { label: 'Total acumulado', value: formatCurrency(totalAcumulado) },
                                { label: 'Pedidos', value: pedidos.length },
                                { label: 'Unidades consolidadas', value: listaConsolidada.reduce((acc, i) => acc + Number(i.cantidad || 0), 0) },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>{item.label}</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Table dataSource={listaConsolidada} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center', width: 80 }]} pagination={false} size="small" scroll={{ y: 220 }} />
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Detalle por cliente</div>
                    <Table dataSource={pedidos} columns={[{ title: 'Cliente', dataIndex: 'cliente_nombre', ellipsis: true }, { title: 'Total', dataIndex: 'total', align: 'right', render: (val) => formatCurrency(val), width: 120 }]} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
                    <Button type="primary" danger block icon={<FilePdfOutlined />} onClick={generarReporteControlActual} style={{ marginTop: 16 }}>Descargar PDF</Button>
                </Modal>

                <Modal
                    title="Confirmar Entrega"
                    open={modalEntregaOpen}
                    onCancel={() => setModalEntregaOpen(false)}
                    onOk={confirmarEntrega}
                    confirmLoading={loadingEntrega}
                    okText="Confirmar"
                >
                    <p style={{ marginBottom: 12, color: '#64748b' }}>Selecciona la cuenta de destino para el pago:</p>
                    <Select className="w-full" size="large" value={cuentaDestino} onChange={setCuentaDestino} options={cuentaOptions} />
                </Modal>

                <Modal
                    title="Historial de Cierres"
                    open={modalHistorialOpen}
                    onCancel={() => setModalHistorialOpen(false)}
                    footer={null}
                    width={Math.min(560, window.innerWidth - 16)}
                >
                    <List
                        loading={loadingHistorial}
                        dataSource={listaCierres}
                        renderItem={item => (
                            <List.Item actions={[<Button key="v" type="link" style={{ color: '#155153' }} onClick={() => verDetalleCierre(item)}>Ver detalle</Button>]}>
                                <List.Item.Meta
                                    avatar={<Avatar icon={<CalendarOutlined />} style={{ background: '#155153' }} />}
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
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Recaudado</div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: '#155153' }}>{formatCurrency(totalHistorico)}</div>
                            </div>
                            <Button type="primary" danger icon={<FilePdfOutlined />} onClick={generarPDFHistorico} style={{ fontWeight: 700 }}>
                                Descargar PDF
                            </Button>
                        </div>
                        <Tabs defaultActiveKey="1" items={[
                            {
                                key: '1', label: 'Consolidado',
                                children: <Table dataSource={consolidadoHistorico} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center', width: 80, sorter: (a, b) => a.cantidad - b.cantidad }]} pagination={false} size="small" scroll={{ y: 300 }} />
                            },
                            {
                                key: '2', label: 'Pedidos',
                                children: <Table dataSource={pedidosHistoricos} columns={[{ title: '#', dataIndex: 'id', width: 60, render: (id) => `#${id}` }, { title: 'Cliente', dataIndex: 'cliente_nombre', ellipsis: true }, { title: 'Estado', dataIndex: 'estado', width: 110, render: (e) => <Tag color={estadoColor[e] || 'default'}>{e}</Tag> }, { title: 'Total', dataIndex: 'total', render: (val) => formatCurrency(val), width: 120, align: 'right' }]} rowKey="id" pagination={{ pageSize: 8 }} size="small" scroll={{ x: 'max-content' }} />
                            }
                        ]} />
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setModalDetalleCierreOpen(false)}>Cerrar</Button>
                        </div>
                    </Spin>
                </Modal>

            </Content>
        </Layout>
    );
};

export default PedidosDashboard;
