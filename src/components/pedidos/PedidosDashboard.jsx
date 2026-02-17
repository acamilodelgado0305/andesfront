import React, { useState, useEffect, useCallback } from "react";
import {
    Layout, Typography, Row, Col, Card, Button, Avatar, Badge,
    Spin, Modal, message, Statistic, Select, Table, List, Tag, Tabs, Input
} from "antd";
import {
    PlusOutlined, ShoppingCartOutlined, UserOutlined,
    CheckCircleOutlined, EditOutlined, FilePdfOutlined,
    AppstoreOutlined, PrinterOutlined, FileTextOutlined,
    ExclamationCircleOutlined, LockOutlined, HistoryOutlined, CalendarOutlined
} from "@ant-design/icons";

// SERVICIOS
import {
    getPedidos, updateEstadoPedido, getOrderStats, realizarCierre, getCierres, getPedidoById
} from "../../services/pedido/pedidoService";
import { getPersonaById } from "../../services/person/personaService";
import { cuentaOptions } from "../Certificados/options";

// COMPONENTES HIJOS
import POSModal from "./POSModal";

// LIBRERIAS PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Content } = Layout;
const { Title, Text } = Typography;

const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0';
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Estilos para que los Modales de AntD sean más amigables en móvil (Full width si es necesario)
const responsiveModalStyles = `
  @media (max-width: 768px) {
    .responsive-modal .ant-modal {
      max-width: 100vw;
      margin: 10px;
      padding-bottom: 0;
    }
    .responsive-modal .ant-modal-content {
      padding: 16px; 
    }
  }
`;

const PedidosDashboard = () => {
    // --- ESTADOS PRINCIPALES ---
    const [pedidos, setPedidos] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- ESTADOS MODALES ---
    const [isPosOpen, setIsPosOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);

    const [modalConsolidadoOpen, setModalConsolidadoOpen] = useState(false);
    const [listaConsolidada, setListaConsolidada] = useState([]);

    const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
    const [pedidoAEntregar, setPedidoAEntregar] = useState(null);
    const [cuentaDestino, setCuentaDestino] = useState('Efectivo');
    const [loadingEntrega, setLoadingEntrega] = useState(false);

    // --- ESTADOS HISTORIAL ---
    const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
    const [listaCierres, setListaCierres] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [busquedaPedido, setBusquedaPedido] = useState("");

    // --- ESTADOS DETALLE HISTORICO ---
    const [modalDetalleCierreOpen, setModalDetalleCierreOpen] = useState(false);
    const [pedidosHistoricos, setPedidosHistoricos] = useState([]);
    const [consolidadoHistorico, setConsolidadoHistorico] = useState([]);
    const [totalHistorico, setTotalHistorico] = useState(0);
    const [infoCierreSeleccionado, setInfoCierreSeleccionado] = useState(null);
    const [loadingPedidosHistoricos, setLoadingPedidosHistoricos] = useState(false);

    // --- CARGA DE DATOS ---
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
            console.error(error);
            message.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarTodo(); }, [cargarTodo]);

    // --- LÓGICA CONSOLIDADO (FRONTEND) ---
    const calcularConsolidadoDesdePedidos = (listaPedidos) => {
        const mapaProductos = {};
        let sumaTotal = 0;

        listaPedidos.forEach(p => {
            if (p.estado !== 'ANULADO') sumaTotal += Number(p.total);
            let items = [];
            try { items = typeof p.items_detalle === 'string' ? JSON.parse(p.items_detalle) : (p.items_detalle || []); } catch (e) { items = []; }

            items.forEach(item => {
                const nombre = item.producto || item.nombre;
                const cantidad = Number(item.cantidad);
                mapaProductos[nombre] = (mapaProductos[nombre] || 0) + cantidad;
            });
        });

        const arrayConsolidado = Object.keys(mapaProductos).map((key, index) => ({
            key: index, nombre: key, cantidad: mapaProductos[key]
        }));

        return { consolidado: arrayConsolidado.sort((a, b) => b.cantidad - a.cantidad), total: sumaTotal };
    };

    // --- FUNCIONES HISTORIAL ---
    const abrirHistorial = async () => {
        setModalHistorialOpen(true);
        setLoadingHistorial(true);
        try {
            const res = await getCierres();
            setListaCierres(res.data || []);
        } catch (error) {
            message.error("Error cargando historial");
        } finally {
            setLoadingHistorial(false);
        }
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
        } catch (error) {
            message.error("Error cargando detalles");
        } finally {
            setLoadingPedidosHistoricos(false);
        }
    };

    // --- ACCIONES ---
    const handleCerrarCaja = () => {
        Modal.confirm({
            title: '¿Cerrar Caja y Reiniciar?',
            icon: <ExclamationCircleOutlined />,
            content: 'Esta acción limpiará el tablero actual y archivará los pedidos.',
            okText: 'Sí, Cerrar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await realizarCierre("Cierre manual");
                    message.success("Caja cerrada exitosamente.");
                    cargarTodo();
                } catch (error) { message.error("Error al cerrar caja"); }
            },
        });
    };

    const confirmarEntrega = async () => {
        if (!pedidoAEntregar) return;
        setLoadingEntrega(true);
        try {
            await updateEstadoPedido(pedidoAEntregar, { nuevo_estado: 'ENTREGADO', cuenta_destino: cuentaDestino });
            message.success("Entregado"); setModalEntregaOpen(false); cargarTodo();
        } catch (error) { message.error("Error"); } finally { setLoadingEntrega(false); }
    };

    // --- PDFS ---
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
            // 1. Obtener detalles completos del pedido (para asegurar items y observaciones)
            const dataPedido = await getPedidoById(pedidoResumen.id);
            const pedidoCompleto = dataPedido.pedido || dataPedido; // Ajuste según respuesta del backend
            const items = dataPedido.items || dataPedido.items_detalle || []; // Ajuste según respuesta

            // 2. Obtener datos del cliente (Nombre completo)
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
                } catch (error) {
                    console.warn("No se pudo obtener datos extra del cliente", error);
                }
            }

            const doc = new jsPDF();

            // ENCABEZADO
            doc.setFontSize(22);
            doc.setTextColor(21, 81, 83); // Color corporativo
            doc.text("FACTURA DE VENTA", 105, 20, null, null, "center");

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("Documento Oficial de Transacción", 105, 26, null, null, "center");

            // Línea separadora
            doc.setDrawColor(21, 81, 83);
            doc.setLineWidth(0.5);
            doc.line(20, 32, 190, 32);

            // DATOS GENERALES (2 columnas)
            const startY = 40;

            // Columna Izquierda: Datos del Cliente
            doc.setFontSize(11);
            doc.setTextColor(21, 81, 83);
            doc.setFont(undefined, 'bold');
            doc.text("DATOS DEL CLIENTE", 20, startY);

            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text(`Nombre: ${clienteNombre}`, 20, startY + 7);
            if (clienteDocumento) doc.text(`CC/NIT: ${clienteDocumento}`, 20, startY + 12);
            if (clienteTelefono) doc.text(`Teléfono: ${clienteTelefono}`, 20, startY + 17);
            if (clienteDireccion) doc.text(`Dirección: ${clienteDireccion}`, 20, startY + 22);

            // Columna Derecha: Datos de la Factura
            doc.setFontSize(11);
            doc.setTextColor(21, 81, 83);
            doc.setFont(undefined, 'bold');
            doc.text("DETALLES DE FACTURA", 120, startY);

            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);

            const fechaValida = pedidoCompleto.fecha_creacion ? new Date(pedidoCompleto.fecha_creacion) : new Date();
            const fechaStr = fechaValida.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
            const horaStr = fechaValida.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

            doc.text(`N° Factura:`, 120, startY + 7);
            doc.text(`#${pedidoCompleto.id}`, 155, startY + 7);

            doc.text(`Fecha:`, 120, startY + 12);
            doc.text(fechaStr, 155, startY + 12);

            doc.text(`Hora:`, 120, startY + 17);
            doc.text(horaStr, 155, startY + 17);

            doc.text(`Estado:`, 120, startY + 22);
            doc.setTextColor(pedidoCompleto.estado === 'PAGADO' ? 'green' : (pedidoCompleto.estado === 'ANULADO' ? 'red' : 'black'));
            doc.text(pedidoCompleto.estado || 'PENDIENTE', 155, startY + 22);
            doc.setTextColor(0, 0, 0); // Reset color

            // TABLA DE PRODUCTOS
            const productosParaTabla = items.map((item, index) => {
                // Ajustar acceso a propiedades dependiendo de si viene de items o items_detalle string
                const nombreProducto = item.producto_nombre || item.producto || item.nombre || 'Producto';
                const cantidad = Number(item.cantidad) || 0;
                const precioUnitario = Number(item.precio_unitario || item.precio || item.monto) || 0;
                const subtotal = cantidad * precioUnitario;

                return [
                    index + 1,
                    nombreProducto,
                    cantidad,
                    formatCurrency(precioUnitario),
                    formatCurrency(subtotal)
                ];
            });

            autoTable(doc, {
                startY: startY + 35,
                head: [['#', 'Descripción', 'Cant.', 'Precio Unit.', 'Total']],
                body: productosParaTabla,
                theme: 'grid',
                headStyles: {
                    fillColor: [21, 81, 83],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 35, halign: 'right' },
                    4: { cellWidth: 35, halign: 'right' }
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    valign: 'middle'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                }
            });

            // TOTALES Y OBSERVACIONES
            const finalY = doc.lastAutoTable.finalY || 100;
            let currentY = finalY + 10;

            // Totales a la derecha
            const subtotal = Number(pedidoCompleto.total) || 0;
            const iva = 0; // Ajustar si hay lógica de impuestos
            const total = subtotal + iva;

            const startXTotales = 130;

            // Fondo gris para totales
            doc.setFillColor(240, 240, 240);
            doc.rect(startXTotales - 5, currentY - 5, 70, 30, 'F');

            doc.setFontSize(10);
            doc.text("Subtotal:", startXTotales, currentY);
            doc.text(formatCurrency(subtotal), 190, currentY, null, null, "right");

            /* Si hubiera IVA
            currentY += 7;
            doc.text("IVA (19%):", startXTotales, currentY);
            doc.text(formatCurrency(iva), 190, currentY, null, null, "right");
            */

            currentY += 10;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(21, 81, 83);
            doc.text("TOTAL A PAGAR:", startXTotales, currentY);
            doc.text(formatCurrency(total), 190, currentY, null, null, "right");

            // Observaciones a la izquierda (si existen)
            if (pedidoCompleto.observaciones) {
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'bold');
                doc.text("Observaciones:", 20, finalY + 10);

                doc.setFont(undefined, 'normal');
                doc.setTextColor(80, 80, 80);
                const splitObservaciones = doc.splitTextToSize(pedidoCompleto.observaciones, 100);
                doc.text(splitObservaciones, 20, finalY + 16);
            }

            // PIE DE PÁGINA
            const footerY = 280;
            doc.setDrawColor(200, 200, 200);
            doc.line(20, footerY - 5, 190, footerY - 5);

            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text("¡Gracias por su preferencia!", 105, footerY, null, null, "center");
            doc.text("Generado automáticamente por el sistema", 105, footerY + 5, null, null, "center");

            // Guardar PDF
            doc.save(`Factura_${pedidoCompleto.id}_${clienteNombre.replace(/\s+/g, '_')}.pdf`);
            message.success('Factura generada exitosamente');

        } catch (error) {
            console.error(error);
            message.error("Error al generar la factura. Intente nuevamente.");
        } finally {
            loadingMsg(); // Cerrar loading message
        }
    };

    const generarReporteControlActual = () => {
        const doc = new jsPDF();
        const fechaActual = new Date();
        const totalAcumulado = stats?.general?.total_ingresos || 0;
        const totalPedidos = pedidos.length;
        const totalProductosConsolidados = listaConsolidada.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);

        doc.setFontSize(16);
        doc.text("Reporte del pedido actual", 105, 15, null, null, "center");
        doc.setDrawColor(21, 81, 83);
        doc.line(10, 20, 200, 20);

        doc.setFontSize(10);
        doc.text(`Fecha: ${fechaActual.toLocaleString()}`, 10, 28);
        doc.text(`Total acumulado: ${formatCurrency(totalAcumulado)}`, 10, 34);
        doc.text(`Pedidos: ${totalPedidos}`, 120, 28);
        doc.text(`Unidades consolidadas: ${totalProductosConsolidados}`, 120, 34);

        autoTable(doc, {
            startY: 42,
            head: [['Producto', 'Cantidad']],
            body: listaConsolidada.map(i => [i.nombre, i.cantidad]),
            theme: 'grid',
            headStyles: { fillColor: [21, 81, 83] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        const nextY = (doc.lastAutoTable?.finalY || 42) + 8;
        autoTable(doc, {
            startY: nextY,
            head: [['Cliente', 'Total pedido']],
            body: pedidos.map(p => [p.cliente_nombre || '-', formatCurrency(p.total)]),
            theme: 'grid',
            headStyles: { fillColor: [21, 81, 83] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        let detalleY = (doc.lastAutoTable?.finalY || nextY) + 10;
        pedidos.forEach((p, idx) => {
            let items = [];
            try {
                items = typeof p.items_detalle === 'string'
                    ? JSON.parse(p.items_detalle)
                    : (p.items_detalle || []);
            } catch (e) {
                items = [];
            }

            if (detalleY > 260) {
                doc.addPage();
                detalleY = 20;
            }

            doc.setFontSize(12);
            doc.text(`Pedido #${p.id} - ${p.cliente_nombre || 'Cliente'}`, 10, detalleY);
            doc.setFontSize(10);
            doc.text(`Total: ${formatCurrency(p.total)}`, 10, detalleY + 6);

            autoTable(doc, {
                startY: detalleY + 10,
                head: [['Producto', 'Cantidad']],
                body: items.map(i => [i.producto || i.nombre || '-', i.cantidad || 0]),
                theme: 'striped',
                headStyles: { fillColor: [21, 81, 83] },
                styles: { fontSize: 9, cellPadding: 2 }
            });

            detalleY = (doc.lastAutoTable?.finalY || (detalleY + 10)) + 10;
        });
        doc.save("Consolidado_Actual.pdf");
    };

    const pedidosFiltrados = pedidos.filter(p => {
        if (!busquedaPedido.trim()) return true;
        const nombre = (p.cliente_nombre || "").toString().toLowerCase();
        return nombre.includes(busquedaPedido.trim().toLowerCase());
    });

    return (
        <Layout className="min-h-screen bg-gray-50">
            <style>{responsiveModalStyles}</style>

            <Content className="p-3 md:p-6 pb-20 md:pb-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="w-full md:w-auto">
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>Dashboard de Pedidos</Title>
                        <Text type="secondary">Pedidos actuales</Text>
                    </div>
                    <div className="w-full md:max-w-sm">
                        <Input
                            placeholder="Buscar por nombre de cliente"
                            allowClear
                            value={busquedaPedido}
                            onChange={(e) => setBusquedaPedido(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <Button type="primary" className="bg-[#155153] w-full md:w-auto h-10" icon={<PlusOutlined />} size="large" onClick={() => { setEditingOrderId(null); setIsPosOpen(true); }}>Nuevo Pedido</Button>
                    </div>
                </div>

                {/* WIDGETS */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Card className="shadow-sm border-l-4 border-green-500 rounded-lg">
                            <Statistic title="Total acumulado en pedidos" value={stats.general?.total_ingresos || 0} prefix="$" groupSeparator="." precision={0} />
                        </Card>
                        <Card className="shadow-sm border-l-4 border-orange-400 rounded-lg">
                            <Statistic title="Pedidos pendientes" value={stats.por_estado?.find(e => e.name === 'PENDIENTE')?.value || 0} prefix={<ShoppingCartOutlined />} />
                        </Card>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 w-full mb-6 justify-start">
                    <Button icon={<HistoryOutlined />} onClick={abrirHistorial} className="h-8 px-3 text-xs">Historial de pedidos</Button>
                    <Button danger icon={<LockOutlined />} onClick={handleCerrarCaja} className="h-8 px-3 text-xs">Cerrar pedido actual</Button>
                    <Button className="bg-orange-500 text-white border-none h-8 px-3 text-xs" icon={<FileTextOutlined />} onClick={() => setModalConsolidadoOpen(true)}>Reporte del pedido</Button>
                </div>

                {/* LISTADO ACTUAL */}
                {loading ? <div className="text-center py-20"><Spin size="large" /></div> : (
                    pedidosFiltrados.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <CheckCircleOutlined className="text-6xl mb-4 opacity-20" />
                            <p>Todo limpio. ¡Listo para nuevas ventas!</p>
                        </div>
                    ) : (
                        <Row gutter={[12, 12]}>
                            {pedidosFiltrados.map(p => (
                                <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
                                    <Badge.Ribbon text={p.estado} color={p.estado === 'PENDIENTE' ? 'orange' : 'green'}>
                                        <Card hoverable className="rounded-xl shadow-sm border-gray-200" bodyStyle={{ padding: '12px' }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar icon={<UserOutlined />} className="bg-gray-100 text-gray-500" />
                                                    <div className="overflow-hidden max-w-[140px]">
                                                        <div className="font-bold truncate text-sm">{p.cliente_nombre}</div>
                                                        <div className="text-[10px] text-gray-400">#{p.id}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded p-2 mb-2 text-xs text-gray-600 min-h-[50px]">
                                                {p.items_detalle && JSON.parse(JSON.stringify(p.items_detalle)).slice(0, 3).map((i, k) => (
                                                    <div key={k} className="flex justify-between border-b border-gray-100 last:border-0 py-1">
                                                        <span className="truncate pr-2">{i.producto}</span>
                                                        <span className="font-bold whitespace-nowrap">x{i.cantidad}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="font-extrabold text-[#155153] text-base">{formatCurrency(p.total)}</span>
                                                <div className="flex gap-1">
                                                    <Button size="small" icon={<PrinterOutlined />} onClick={() => generarReciboPDF(p)} />
                                                    <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingOrderId(p.id); setIsPosOpen(true); }} disabled={p.estado !== 'PENDIENTE'} />
                                                    {p.estado === 'PENDIENTE' && <Button size="small" type="primary" className="bg-[#155153]" icon={<CheckCircleOutlined />} onClick={() => { setPedidoAEntregar(p.id); setModalEntregaOpen(true); }} />}
                                                </div>
                                            </div>
                                        </Card>
                                    </Badge.Ribbon>
                                </Col>
                            ))}
                        </Row>
                    )
                )}

                {/* MODALES HIJOS */}
                <POSModal visible={isPosOpen} onClose={() => setIsPosOpen(false)} onSaved={cargarTodo} orderIdToEdit={editingOrderId} />

                <Modal title="Consolidado Actual" open={modalConsolidadoOpen} onCancel={() => setModalConsolidadoOpen(false)} footer={null} wrapClassName="responsive-modal">
                    <div className="bg-white border border-gray-200 rounded-md p-4 text-xs text-gray-700 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                                <div className="text-gray-400 uppercase tracking-wide">Fecha</div>
                                <div className="font-semibold">{new Date().toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 uppercase tracking-wide">Total acumulado</div>
                                <div className="font-semibold">{formatCurrency(stats?.general?.total_ingresos || 0)}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 uppercase tracking-wide">Pedidos</div>
                                <div className="font-semibold">{pedidos.length}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 uppercase tracking-wide">Unidades consolidadas</div>
                                <div className="font-semibold">{listaConsolidada.reduce((acc, item) => acc + Number(item.cantidad || 0), 0)}</div>
                            </div>
                        </div>
                    </div>
                    <Table dataSource={listaConsolidada} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center' }]} pagination={false} size="small" scroll={{ y: 260 }} />
                    <div className="mt-3 text-xs font-semibold text-gray-600">Detalle por cliente</div>
                    <Table
                        dataSource={pedidos}
                        columns={[
                            { title: 'Cliente', dataIndex: 'cliente_nombre', ellipsis: true },
                            { title: 'Total', dataIndex: 'total', align: 'right', render: (val) => formatCurrency(val), width: 120 },
                        ]}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                        scroll={{ y: 200 }}
                    />
                    <Button type="primary" danger block icon={<FilePdfOutlined />} onClick={generarReporteControlActual} className="mt-4">Descargar PDF</Button>
                </Modal>

                <Modal title="Confirmar Entrega" open={modalEntregaOpen} onCancel={() => setModalEntregaOpen(false)} onOk={confirmarEntrega} confirmLoading={loadingEntrega}>
                    <Select className="w-full" size="large" value={cuentaDestino} onChange={setCuentaDestino} options={cuentaOptions} />
                </Modal>

                <Modal title="Historial Cierres" open={modalHistorialOpen} onCancel={() => setModalHistorialOpen(false)} footer={null} wrapClassName="responsive-modal">
                    <List loading={loadingHistorial} dataSource={listaCierres} renderItem={item => (
                        <List.Item actions={[<Button key="v" type="link" onClick={() => verDetalleCierre(item)}>Ver</Button>]}>
                            <List.Item.Meta avatar={<Avatar icon={<CalendarOutlined />} className="bg-[#155153]" />} title={`Cierre #${item.id}`} description={`${new Date(item.fecha_cierre).toLocaleDateString()} - ${formatCurrency(item.total_ingresos)}`} />
                        </List.Item>
                    )} />
                </Modal>

                {/* --- MODAL DETALLE DE CIERRE (AQUÍ ESTABA EL PROBLEMA) --- */}
                <Modal
                    title={infoCierreSeleccionado ? `Cierre #${infoCierreSeleccionado.id}` : 'Detalle'}
                    open={modalDetalleCierreOpen}
                    onCancel={() => setModalDetalleCierreOpen(false)}
                    footer={null} // Quitamos footer por defecto para manejarlo nosotros si queremos
                    width={900} // Ancho máximo en escritorio
                    wrapClassName="responsive-modal" // Clase para forzar ancho en móvil
                >
                    <Spin spinning={loadingPedidosHistoricos}>

                        {/* CORRECCIÓN RESPONSIVE:
                            - flex-col en móvil (uno debajo de otro)
                            - md:flex-row en desktop (lado a lado)
                        */}
                        <div className="bg-gray-100 p-4 rounded-lg mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-center md:text-left">
                                <div className="text-gray-500 text-xs uppercase tracking-wide">Total Recaudado</div>
                                <div className="text-3xl font-black text-[#155153]">{formatCurrency(totalHistorico)}</div>
                            </div>

                            {/* Botón ancho completo en móvil (w-full), auto en desktop */}
                            <Button
                                type="primary"
                                danger
                                icon={<FilePdfOutlined />}
                                onClick={generarPDFHistorico}
                                className="w-full md:w-auto h-10 font-bold shadow-md"
                            >
                                Descargar PDF Completo
                            </Button>
                        </div>

                        <Tabs defaultActiveKey="1" items={[
                            {
                                key: '1',
                                label: 'Consolidado',
                                children: (
                                    <Table
                                        dataSource={consolidadoHistorico}
                                        columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center', sorter: (a, b) => a.cantidad - b.cantidad }]}
                                        pagination={false}
                                        size="small"
                                        scroll={{ y: 300 }} // Scroll vertical si es muy largo
                                    />
                                )
                            },
                            {
                                key: '2',
                                label: 'Pedidos',
                                children: (
                                    <Table
                                        dataSource={pedidosHistoricos}
                                        columns={[
                                            { title: 'ID', dataIndex: 'id', width: 60 },
                                            { title: 'Cliente', dataIndex: 'cliente_nombre', ellipsis: true }, // Ellipsis para nombres largos en móvil
                                            { title: 'Total', dataIndex: 'total', render: (val) => formatCurrency(val), width: 100 },
                                        ]}
                                        rowKey="id"
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                        scroll={{ x: 'max-content' }} // Scroll horizontal si la tabla es ancha
                                    />
                                )
                            }
                        ]} />

                        <div className="mt-4 flex justify-end">
                            <Button onClick={() => setModalDetalleCierreOpen(false)}>Cerrar</Button>
                        </div>

                    </Spin>
                </Modal>

            </Content>
        </Layout>
    );
};

export default PedidosDashboard;
