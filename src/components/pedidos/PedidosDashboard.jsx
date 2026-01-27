import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Layout, Typography, Row, Col, Card, Button, Input, List, Avatar, Badge, Select,
    Spin, Empty, Modal, notification, message, Tooltip, Tag, Segmented, Table, Statistic
} from "antd";
import {
    PlusOutlined, SearchOutlined, ShoppingCartOutlined, UserOutlined, DeleteOutlined,
    CheckCircleOutlined, CloseCircleOutlined, ShopOutlined, EditOutlined,
    EnvironmentOutlined, FilePdfOutlined, CloseOutlined,
    AppstoreOutlined, DollarCircleOutlined, FileTextOutlined, PrinterOutlined
} from "@ant-design/icons";

// LIBRERIAS PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// SERVICIOS
import { getPedidos, createPedido, updatePedido, updateEstadoPedido, getPedidoById, getOrderStats } from "../../services/pedido/pedidoService";
import { getInventario } from "../../services/inventario/inventarioService";
import { getPersonas } from "../../services/person/personaService";
import { cuentaOptions } from "../Certificados/options";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// --- UTILS ---
const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0';
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(value);
};

const PedidosDashboard = () => {
    // --- ESTADOS DE DATOS ---
    const [pedidos, setPedidos] = useState([]);
    const [stats, setStats] = useState(null);
    const [listaConsolidada, setListaConsolidada] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- ESTADOS INTERFAZ ---
    const [modalConsolidadoOpen, setModalConsolidadoOpen] = useState(false);
    const [isPosOpen, setIsPosOpen] = useState(false);
    const [viewMobile, setViewMobile] = useState("catalogo");
    const [editingOrderId, setEditingOrderId] = useState(null);

    // --- POS & AUX ---
    const [productos, setProductos] = useState([]);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [busquedaProducto, setBusquedaProducto] = useState("");

    const [carrito, setCarrito] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [observaciones, setObservaciones] = useState("");
    const [procesandoVenta, setProcesandoVenta] = useState(false);

    const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
    const [pedidoAEntregar, setPedidoAEntregar] = useState(null);
    const [cuentaDestino, setCuentaDestino] = useState('Efectivo');
    const [loadingEntrega, setLoadingEntrega] = useState(false);

    // --- CARGA INICIAL ---
    const cargarTodo = useCallback(async () => {
        setLoading(true);
        try {
            const [pedidosRes, statsRes] = await Promise.all([
                getPedidos(),
                getOrderStats()
            ]);

            setPedidos(pedidosRes.data || pedidosRes || []);

            const dataStats = statsRes.data || statsRes;
            setStats(dataStats);

            if (dataStats && dataStats.top_productos) {
                const mappedProducts = dataStats.top_productos.map((item, idx) => ({
                    key: idx,
                    nombre: item.name,
                    cantidad: item.cantidad,
                    total_ingresos: 0
                }));
                setListaConsolidada(mappedProducts);
            } else {
                setListaConsolidada([]);
            }

        } catch (error) {
            console.error(error);
            message.error("Error al actualizar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarTodo(); }, [cargarTodo]);

    // --- 1. PDF RECIBO (Original) ---
    const generarReciboPDF = (pedido) => {
        const doc = new jsPDF();
        doc.setFillColor(21, 81, 83);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("RECIBO DE PEDIDO", 105, 20, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Orden #${pedido.id}`, 105, 30, null, null, "center");

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text("DATOS DEL CLIENTE:", 14, 50);
        doc.setFontSize(11);
        doc.text(`Nombre: ${pedido.cliente_nombre} ${pedido.cliente_apellido}`, 14, 58);
        doc.text(`Documento: ${pedido.numero_documento || 'N/A'}`, 14, 64);
        doc.text(`Dirección: ${pedido.cliente_direccion || 'N/A'}`, 14, 70);

        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date(pedido.created_at).toLocaleDateString()}`, 150, 58);
        doc.text(`Estado: ${pedido.estado}`, 150, 64);

        let items = [];
        try { items = typeof pedido.items_detalle === 'string' ? JSON.parse(pedido.items_detalle) : pedido.items_detalle; } catch (e) { items = []; }

        const tableBody = items.map(item => {
            const precioRaw = item.precio_unitario || item.monto || item.precio || 0;
            const precio = Number(precioRaw);
            const subtotal = precio * Number(item.cantidad);
            return [item.producto || item.nombre, item.cantidad, formatCurrency(precio), formatCurrency(subtotal)];
        });

        autoTable(doc, {
            startY: 80,
            head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [21, 81, 83] },
            styles: { fontSize: 10 },
        });

        const finalY = (doc.lastAutoTable?.finalY || 80) + 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL A PAGAR: ${formatCurrency(pedido.total)}`, 140, finalY);

        if (pedido.observaciones) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text("Observaciones:", 14, finalY);
            doc.text(pedido.observaciones, 14, finalY + 6);
        }
        doc.save(`Pedido_${pedido.id}.pdf`);
    };

    // --- 2. PDF REPORTE CONTROL ---
    const generarReporteControl = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString();
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("REPORTE DE CONTROL", 105, 20, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Fecha: ${fecha}`, 105, 30, null, null, "center");

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("1. Resumen", 14, 50);
        doc.setFontSize(10);
        doc.setTextColor(80);
        if (stats && stats.general) {
            doc.text(`Total Recaudado: ${formatCurrency(stats.general.total_ingresos)}`, 14, 60);
            doc.text(`Total Pedidos: ${stats.general.total_pedidos}`, 14, 66);
            doc.text(`Total Unidades: ${stats.general.total_unidades}`, 14, 72);
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("2. Lista de Alistamiento", 14, 85);

        const rowsConsolidado = listaConsolidada.map(it => [it.nombre, it.cantidad]);
        autoTable(doc, {
            startY: 90,
            head: [['Producto', 'Cant. Requerida']],
            body: rowsConsolidado,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } }
        });

        let finalY = doc.lastAutoTable.finalY + 15;
        if (finalY > 250) { doc.addPage(); finalY = 20; }
        doc.setFontSize(14);
        doc.text("3. Pedidos Activos", 14, finalY);

        const rowsPedidos = pedidos.map(p => [`#${p.id}`, `${p.cliente_nombre} ${p.cliente_apellido}`, p.estado, formatCurrency(p.total)]);
        autoTable(doc, {
            startY: finalY + 5,
            head: [['ID', 'Cliente', 'Estado', 'Valor']],
            body: rowsPedidos,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });
        doc.save(`Reporte_Control_${fecha.replace(/\//g, '-')}.pdf`);
    };

    // --- POS LOGIC ---
    const cargarDatosAuxiliares = async () => {
        setLoadingProductos(true);
        try {
            const [resInv, resClientes] = await Promise.all([getInventario(), getPersonas("")]);
            setProductos(Array.isArray(resInv) ? resInv : (resInv.data || []));
            setClientes(Array.isArray(resClientes) ? resClientes : (resClientes.data || []));
        } catch (error) { message.error("Error datos POS"); }
        finally { setLoadingProductos(false); }
    };

    const abrirPosCrear = async () => {
        setEditingOrderId(null); setCarrito([]); setClienteSeleccionado(null); setObservaciones("");
        setViewMobile("catalogo"); setIsPosOpen(true); await cargarDatosAuxiliares();
    };

    const abrirPosEditar = async (pedidoResumen) => {
        try {
            await cargarDatosAuxiliares();
            const data = await getPedidoById(pedidoResumen.id);
            const pedido = data.pedido || data;
            const items = data.items || data.items_detalle || [];

            const carritoMap = items.map(i => ({
                id: i.inventario_id,
                nombre: i.producto_nombre || i.nombre,
                monto: Number(i.precio_unitario || i.monto),
                cantidad: Number(i.cantidad),
                imagen_url: null
            }));

            setEditingOrderId(pedido.id); setCarrito(carritoMap); setClienteSeleccionado(pedido.persona_id);
            setObservaciones(pedido.observaciones || ""); setViewMobile("carrito"); setIsPosOpen(true);
        } catch (error) { message.error("Error cargando pedido"); }
    };

    // --- CARRITO ---
    const agregarAlCarrito = (prod) => {
        setCarrito(prev => {
            const existe = prev.find(i => i.id === prod.id);
            return existe
                ? prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)
                : [...prev, { ...prod, cantidad: 1, monto: Number(prod.monto) }];
        });
        message.success("Agregado");
    };

    const restarDelCarrito = (id) => setCarrito(prev => prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i).filter(i => i.cantidad > 0));
    const eliminarDelCarrito = (id) => setCarrito(prev => prev.filter(i => i.id !== id));
    const totalCarrito = useMemo(() => carrito.reduce((acc, i) => acc + (i.monto * i.cantidad), 0), [carrito]);

    const guardarPedido = async () => {
        if (!clienteSeleccionado || carrito.length === 0) return message.warning("Datos incompletos");
        setProcesandoVenta(true);
        try {
            const payload = { persona_id: clienteSeleccionado, observaciones, items: carrito.map(p => ({ inventario_id: p.id, cantidad: p.cantidad })) };
            editingOrderId ? await updatePedido(editingOrderId, payload) : await createPedido(payload);
            notification.success({ message: editingOrderId ? 'Actualizado' : 'Registrado' });
            setIsPosOpen(false); cargarTodo();
        } catch (error) { notification.error({ message: 'Error en venta' }); }
        finally { setProcesandoVenta(false); }
    };

    const confirmarEntrega = async () => {
        if (!pedidoAEntregar) return;
        setLoadingEntrega(true);
        try {
            await updateEstadoPedido(pedidoAEntregar, { nuevo_estado: 'ENTREGADO', cuenta_destino: cuentaDestino });
            message.success("Entregado"); setModalEntregaOpen(false); cargarTodo();
        } catch (error) { message.error("Error"); } finally { setLoadingEntrega(false); }
    };

    const columnsConsolidado = [
        { title: 'Producto', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Alistar', dataIndex: 'cantidad', key: 'cantidad', align: 'center', render: (val) => <Tag color="blue" className="text-lg">{val}</Tag> }
    ];

    return (
        <Layout className="min-h-screen bg-gray-50">
            <Content className="p-4 md:p-6">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>Dashboard</Title>
                        <Text type="secondary">Gestión de despachos</Text>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white" icon={<FileTextOutlined />} size="large" onClick={() => setModalConsolidadoOpen(true)}>
                            Consolidado
                        </Button>
                        <Button type="primary" className="bg-[#155153]" icon={<PlusOutlined />} size="large" onClick={abrirPosCrear}>
                            Nuevo Pedido
                        </Button>
                    </div>
                </div>

                {/* --- WIDGETS --- */}
                {stats && stats.general && (
                    <Row gutter={16} className="mb-6">
                        <Col xs={24} md={8}>
                            <Card className="shadow-sm border-l-4 border-green-500">
                                <Statistic title="Ingresos Totales" value={stats.general.total_ingresos} prefix="$" groupSeparator="." />
                            </Card>
                        </Col>
                        <Col xs={12} md={8}>
                            <Card className="shadow-sm border-l-4 border-orange-400">
                                <Statistic title="Pendientes" value={stats.por_estado.find(e => e.name === 'PENDIENTE')?.value || 0} prefix={<ShoppingCartOutlined />} />
                            </Card>
                        </Col>
                        <Col xs={12} md={8}>
                            <Card className="shadow-sm border-l-4 border-blue-500">
                                <Statistic title="Unidades Totales" value={stats.general.total_unidades} prefix={<AppstoreOutlined />} />
                            </Card>
                        </Col>
                    </Row>
                )}

                {/* --- LISTA --- */}
                {loading ? <div className="text-center py-20"><Spin size="large" /></div> : (
                    <Row gutter={[16, 16]}>
                        {pedidos.map(p => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
                                <Badge.Ribbon text={p.estado} color={p.estado === 'PENDIENTE' ? 'orange' : p.estado === 'ENTREGADO' ? 'green' : 'red'}>
                                    <Card hoverable className="rounded-xl h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-3 border-b pb-3">
                                            <Avatar icon={<UserOutlined />} className="bg-gray-200 text-gray-600" />
                                            <div className="overflow-hidden">
                                                <div className="font-bold truncate">{p.cliente_nombre} {p.cliente_apellido}</div>
                                                <div className="text-xs text-gray-500">#{p.id}</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 text-sm text-gray-600 mb-3">
                                            {p.items_detalle && JSON.parse(JSON.stringify(p.items_detalle)).slice(0, 3).map((i, k) => (
                                                <div key={k} className="flex justify-between"><span>{i.producto}</span><b>x{i.cantidad}</b></div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t">
                                            <span className="font-bold text-[#155153] text-lg">{formatCurrency(p.total)}</span>
                                            <div className="flex gap-1">
                                                <Tooltip title="Editar"><Button size="small" icon={<EditOutlined />} onClick={() => abrirPosEditar(p)} disabled={p.estado !== 'PENDIENTE'} /></Tooltip>
                                                <Tooltip title="Recibo"><Button size="small" icon={<PrinterOutlined />} onClick={() => generarReciboPDF(p)} /></Tooltip>
                                                {p.estado === 'PENDIENTE' && <Tooltip title="Entregar"><Button size="small" type="primary" className="bg-[#155153]" icon={<CheckCircleOutlined />} onClick={() => { setPedidoAEntregar(p.id); setModalEntregaOpen(true); }} /></Tooltip>}
                                            </div>
                                        </div>
                                    </Card>
                                </Badge.Ribbon>
                            </Col>
                        ))}
                    </Row>
                )}

                {/* --- MODALES --- */}
                <Modal title="Consolidado de Productos" open={modalConsolidadoOpen} onCancel={() => setModalConsolidadoOpen(false)} footer={[<Button key="c" onClick={() => setModalConsolidadoOpen(false)}>Cerrar</Button>, <Button key="p" type="primary" icon={<FilePdfOutlined />} onClick={generarReporteControl} className="bg-red-600 border-none">Descargar PDF</Button>]}>
                    <Table dataSource={listaConsolidada} columns={columnsConsolidado} pagination={false} scroll={{ y: 300 }} />
                </Modal>

                <Modal open={isPosOpen} onCancel={() => setIsPosOpen(false)} footer={null} width="100%" style={{ top: 0, margin: 0, maxWidth: '100vw' }} bodyStyle={{ height: '100vh', padding: 0 }} closeIcon={null}>
                    <div className="flex flex-col h-full bg-gray-100">
                        <div className="h-14 bg-[#155153] flex justify-between px-4 items-center text-white shrink-0">
                            <span className="font-bold flex gap-2"><ShoppingCartOutlined /> {editingOrderId ? `Editando #${editingOrderId}` : 'POS'}</span>
                            <div className="flex gap-3">
                                <div className="md:hidden"><Segmented options={[{ value: 'catalogo', icon: <AppstoreOutlined /> }, { value: 'carrito', icon: <Badge dot={carrito.length > 0}><ShoppingCartOutlined /></Badge> }]} value={viewMobile} onChange={setViewMobile} className="bg-white/20 text-white border-none" /></div>
                                <Button type="text" icon={<CloseOutlined className="text-white" />} onClick={() => setIsPosOpen(false)} />
                            </div>
                        </div>
                        <div className="flex flex-1 overflow-hidden relative">
                            {/* --- CATÁLOGO CON BADGE RESTAURADO --- */}
                            <div className={`flex-col bg-white border-r h-full ${viewMobile === 'catalogo' ? 'flex w-full absolute z-20' : 'hidden'} md:flex md:static md:w-2/3 md:z-auto`}>
                                <div className="p-3 bg-gray-50 border-b"><Input prefix={<SearchOutlined />} placeholder="Buscar..." value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)} allowClear /></div>
                                <div className="p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
                                    {productos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).map(p => {
                                        const enCarrito = carrito.find(c => c.id === p.id);
                                        return (
                                            <div key={p.id} onClick={() => agregarAlCarrito(p)} className={`p-2 rounded border shadow-sm cursor-pointer bg-white relative transition-all ${enCarrito ? 'ring-2 ring-[#155153] border-[#155153]' : ''}`}>
                                                <div className="h-24 bg-gray-100 mb-2 flex items-center justify-center rounded relative overflow-hidden">
                                                    {p.imagen_url ? <img src={p.imagen_url} className="h-full object-contain" /> : <ShopOutlined className="text-2xl text-gray-300" />}

                                                    {/* --- AQUÍ ESTÁ EL BADGE DE CANTIDAD --- */}
                                                    {enCarrito && (
                                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                                            <div className="bg-[#155153] text-white font-bold text-lg rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white animate-bounce-short">
                                                                {enCarrito.cantidad}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs font-bold line-clamp-2">{p.nombre}</div>
                                                <div className="text-[#155153] font-bold">{formatCurrency(p.monto)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* --- CARRITO --- */}
                            <div className={`flex-col bg-white h-full shadow-xl ${viewMobile === 'carrito' ? 'flex w-full absolute z-30' : 'hidden'} md:flex md:static md:w-1/3 md:z-auto`}>
                                <div className="flex-1 overflow-y-auto p-3">
                                    {carrito.length === 0 ? <Empty description="Vacío" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : carrito.map(i => (
                                        <div key={i.id} className="flex gap-2 items-center mb-2 bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="flex flex-col items-center"><Button size="small" icon={<PlusOutlined className="text-[10px]" />} onClick={() => agregarAlCarrito(i)} /><span className="text-xs font-bold">{i.cantidad}</span><Button size="small" danger icon={<DeleteOutlined className="text-[10px]" />} onClick={() => restarDelCarrito(i.id)} /></div>
                                            <div className="flex-1 text-sm leading-tight"><div>{i.nombre}</div><div className="text-xs text-gray-500">{formatCurrency(i.monto)}</div></div>
                                            <div className="text-right font-bold">{formatCurrency(i.monto * i.cantidad)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t bg-gray-50">
                                    <Select showSearch placeholder="Cliente..." className="w-full mb-2" value={clienteSeleccionado} onChange={setClienteSeleccionado} onSearch={val => getPersonas({ q: val }).then(r => setClientes(r))} filterOption={false}>{clientes.map(c => <Option key={c.id} value={c.id}>{c.nombre} {c.apellido}</Option>)}</Select>
                                    <div className="flex justify-between items-end mb-3"><span className="font-bold text-gray-500">TOTAL</span><span className="text-2xl font-black text-[#155153]">{formatCurrency(totalCarrito)}</span></div>
                                    <Button type="primary" block size="large" className="bg-[#155153]" onClick={guardarPedido} loading={procesandoVenta}>{editingOrderId ? 'ACTUALIZAR' : 'COBRAR'}</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                <Modal title="Confirmar Entrega" open={modalEntregaOpen} onCancel={() => setModalEntregaOpen(false)} onOk={confirmarEntrega} confirmLoading={loadingEntrega}><p>Ingresa el dinero a:</p><Select className="w-full" value={cuentaDestino} onChange={setCuentaDestino} options={cuentaOptions} /></Modal>
            </Content>
        </Layout>
    );
};

export default PedidosDashboard;