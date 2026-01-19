import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Layout, Typography, Row, Col, Card, Button, Input, List, Avatar, Badge, Select,
    Spin, Empty, Modal, notification, message, Tooltip, Tag, Segmented
} from "antd";
import {
    PlusOutlined, SearchOutlined, ShoppingCartOutlined, UserOutlined, DeleteOutlined,
    CheckCircleOutlined, CloseCircleOutlined, ShopOutlined, EditOutlined,
    EnvironmentOutlined, FileTextOutlined, CloseOutlined, FilePdfOutlined,
    AppstoreOutlined, ContainerOutlined, DollarCircleOutlined
} from "@ant-design/icons";

// LIBRERIAS PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// SERVICIOS
import { getPedidos, createPedido, updatePedido, updateEstadoPedido, getPedidoById, getOrderStats } from "../../services/pedido/pedidoService";
import { getInventario } from "../../services/inventario/inventarioService";
import { getPersonas } from "../../services/person/personaService";

import { cuentaOptions } from "../Certificados/options";

import PedidosStats from "./PedidosStats";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// Formateador
const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(value);
};

const PedidosDashboard = () => {
    // --- ESTADOS GENERALES ---
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // --- POS STATES ---
    const [isPosOpen, setIsPosOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [viewMobile, setViewMobile] = useState("catalogo"); // 'catalogo' | 'carrito' (Solo para móvil)

    const [productos, setProductos] = useState([]);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [busquedaProducto, setBusquedaProducto] = useState("");

    // --- CART & VENTA STATES ---
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

    // --- FUNCIÓN DE CARGA ROBUSTA (PEDIDOS + STATS) ---
    const cargarTodo = useCallback(async () => {
        setLoading(true);
        try {
            // Ejecutamos ambas peticiones en paralelo para mayor velocidad
            const [pedidosRes, statsRes] = await Promise.all([
                getPedidos(),
                getOrderStats()
            ]);

            setPedidos(pedidosRes.data || []);
            setStats(statsRes);
        } catch (error) {
            console.error("Error cargando dashboard:", error);
            message.error("Error al actualizar el tablero");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarTodo(); }, [cargarTodo]);

    // --- GENERAR PDF ---
    // --- GENERAR PDF CORREGIDO ---
    const generarReciboPDF = (pedido) => {
        const doc = new jsPDF();

        // 1. Encabezado
        doc.setFillColor(21, 81, 83);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("RECIBO DE PEDIDO", 105, 20, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Orden #${pedido.id}`, 105, 30, null, null, "center");

        // 2. Info Cliente
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

        // 3. Tabla de Productos
        let items = [];
        try {
            items = typeof pedido.items_detalle === 'string'
                ? JSON.parse(pedido.items_detalle)
                : pedido.items_detalle;
        } catch (e) { items = []; }

        const tableBody = items.map(item => {
            // 1. BLINDAJE DE PRECIO: Buscamos en todas las opciones posibles
            // A veces el backend lo devuelve como 'monto', 'precio_unitario' o 'precio'
            const precioRaw = item.precio_unitario || item.monto || item.precio || 0;

            // 2. Aseguramos que sea un número (por si viene como string "5000")
            const precio = Number(precioRaw);

            // 3. Calculamos subtotal
            const subtotal = precio * Number(item.cantidad);

            return [
                item.producto || item.nombre, // Blindaje también para el nombre
                item.cantidad,
                formatCurrency(precio),
                formatCurrency(subtotal)
            ];
        });

        // 🔥 CORRECCIÓN AQUÍ: Usamos autoTable(doc, opciones) en vez de doc.autoTable
        autoTable(doc, {
            startY: 80,
            head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [21, 81, 83] },
            styles: { fontSize: 10 },
        });

        // 4. Totales (Usamos doc.lastAutoTable.finalY igual que antes, esto sí funciona)
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

        // 5. Descargar
        doc.save(`Pedido_${pedido.id}.pdf`);
    };

    // --- CARGAR DATOS AUXILIARES (POS) ---
    const cargarDatosAuxiliares = async () => {
        setLoadingProductos(true);
        try {
            const [resInv, resClientes] = await Promise.all([
                getInventario(),
                getPersonas("")
            ]);
            setProductos(resInv || []);
            setClientes(resClientes || []);
        } catch (error) {
            message.error("Error cargando inventario");
        } finally {
            setLoadingProductos(false);
        }
    };

    const abrirPosCrear = async () => {
        setEditingOrderId(null);
        setCarrito([]);
        setClienteSeleccionado(null);
        setObservaciones("");
        setViewMobile("catalogo"); // Resetear vista móvil
        setIsPosOpen(true);
        await cargarDatosAuxiliares();
    };

    const abrirPosEditar = async (pedidoResumen) => {
        const hideLoading = message.loading("Cargando...", 0);
        try {
            const dataCompleta = await getPedidoById(pedidoResumen.id);
            const { pedido, items } = dataCompleta;
            await cargarDatosAuxiliares();

            const carritoMapeado = items.map(item => ({
                id: item.inventario_id,
                nombre: item.producto_nombre,
                monto: Number(item.precio_unitario),
                cantidad: item.cantidad,
                imagen_url: null
            }));

            setEditingOrderId(pedido.id);
            setCarrito(carritoMapeado);
            setClienteSeleccionado(pedido.persona_id);
            setObservaciones(pedido.observaciones || "");
            setViewMobile("carrito"); // Al editar, quizás quieras ver el carrito directo

            // Verificar cliente en la lista
            const clienteExiste = clientes.find(c => c.id === pedido.persona_id);
            if (!clienteExiste) {
                const resCli = await getPersonas(pedido.numero_documento);
                if (resCli && resCli.length > 0) setClientes(prev => [...prev, ...resCli]);
            }

            setIsPosOpen(true);
        } catch (error) {
            message.error("Error al abrir pedido");
        } finally {
            hideLoading();
        }
    };

    const handleBuscarCliente = async (valor) => {
        setLoadingClientes(true);
        try {
            const res = await getPersonas({ q: valor });
            setClientes(res || []);
        } catch (error) { console.error(error); }
        finally { setLoadingClientes(false); }
    };

    // --- LOGICA CARRITO ---
    const agregarAlCarrito = (producto) => {
        setCarrito((prev) => {
            const existe = prev.find((item) => item.id === producto.id);
            if (existe) {
                return prev.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            }
            return [...prev, { ...producto, cantidad: 1 }];
        });
        message.success({ content: "Agregado", duration: 1, style: { marginTop: '80vh' } });
    };

    const restarDelCarrito = (id) => {
        setCarrito((prev) => prev.map((item) => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item).filter(i => i.cantidad > 0));
    };

    const eliminarDelCarrito = (id) => {
        setCarrito((prev) => prev.filter((item) => item.id !== id));
    };

    const totalCarrito = useMemo(() => carrito.reduce((acc, item) => acc + (Number(item.monto) * item.cantidad), 0), [carrito]);

    // --- GUARDAR ---
    const guardarPedido = async () => {
        if (!clienteSeleccionado) return message.error("Seleccione un cliente");
        if (carrito.length === 0) return message.error("El carrito está vacío");

        setProcesandoVenta(true);
        try {
            const payload = {
                persona_id: clienteSeleccionado,
                observaciones: observaciones,
                items: carrito.map(p => ({ inventario_id: p.id, cantidad: p.cantidad }))
            };

            if (editingOrderId) {
                await updatePedido(editingOrderId, payload);
                notification.success({ message: 'Pedido Actualizado' });
            } else {
                await createPedido(payload);
                notification.success({ message: 'Venta Exitosa' });
            }

            setIsPosOpen(false);
            setCarrito([]);
            setEditingOrderId(null);

            // 🔥 AQUÍ SE ACTUALIZAN LAS STATS 🔥
            cargarTodo();

        } catch (error) {
            notification.error({ message: 'Error', description: error.response?.data?.message || 'Error al procesar' });
        } finally {
            setProcesandoVenta(false);
        }
    };

    const cambiarEstado = async (id, nuevoEstado) => {
        try {
            // Si es entregar, NO llamamos a esta, usamos abrirModalEntrega
            // Aquí enviamos null en cuenta porque Anular no requiere cuenta
            await updateEstadoPedido(id, { nuevo_estado: nuevoEstado });
            message.success(`Estado cambiado a ${nuevoEstado}`);
            cargarTodo();
        } catch (error) {
            message.error("No se pudo cambiar el estado");
        }
    };

    const abrirModalEntrega = (id) => {
        setPedidoAEntregar(id);
        setCuentaDestino('Efectivo'); // Reset a default
        setModalEntregaOpen(true);
    };


    const confirmarEntrega = async () => {
        if (!pedidoAEntregar) return;
        setLoadingEntrega(true);
        try {
            // Enviamos el objeto completo como espera el servicio modificado
            // Asegúrate que tu servicio haga: axios.put(url, body) donde body es este objeto
            await updateEstadoPedido(pedidoAEntregar, {
                nuevo_estado: 'ENTREGADO',
                cuenta_destino: cuentaDestino
            });

            message.success("Pedido entregado e ingreso registrado");
            setModalEntregaOpen(false);
            cargarTodo();
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || "Error al entregar pedido");
        } finally {
            setLoadingEntrega(false);
        }
    };

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.includes(busquedaProducto))
    );

    return (
        <Layout className="min-h-screen bg-gray-50">
            <Content className="p-4 md:p-6">

                {/* HEADER DASHBOARD */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>Tablero de Pedidos</Title>
                        <Text type="secondary">Gestión de ventas y despachos</Text>
                    </div>
                    <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={abrirPosCrear} style={{ backgroundColor: '#155153' }}>
                        Nuevo Pedido
                    </Button>
                </div>

                {/* STATS */}
                <div className="animate-fadeIn mb-6">
                    <PedidosStats stats={stats} loading={loading} />
                </div>

                {/* LISTA PEDIDOS */}
                {loading ? (
                    <div className="flex justify-center py-20"><Spin size="large" /></div>
                ) : (
                    <Row gutter={[16, 16]}>
                        {pedidos.length === 0 && <Empty description="Sin pedidos recientes" className="w-full mt-10" />}
                        {pedidos.map((pedido) => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={pedido.id}>
                                <Badge.Ribbon
                                    text={pedido.estado}
                                    color={pedido.estado === 'PENDIENTE' ? 'orange' : pedido.estado === 'ENTREGADO' ? 'green' : 'red'}
                                >
                                    <Card hoverable className="rounded-xl shadow-sm border-gray-100 h-full flex flex-col" bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        {/* Header Card */}
                                        <div className="p-4 border-b border-gray-50 flex gap-3">
                                            <Avatar style={{ backgroundColor: '#fde3cf', color: '#f56a00' }} icon={<UserOutlined />} />
                                            <div className="overflow-hidden">
                                                <Text strong className="block truncate">{pedido.cliente_nombre} {pedido.cliente_apellido}</Text>
                                                <Text type="secondary" className="text-xs flex items-center gap-1">
                                                    <EnvironmentOutlined /> {pedido.cliente_direccion || 'Local'}
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Body Items */}
                                        <div className="p-4 flex-1 bg-gray-50/30">
                                            <div className="text-xs text-gray-500 mb-2">Orden #{pedido.id} • {new Date(pedido.created_at).toLocaleDateString()}</div>
                                            <div className="space-y-1">
                                                {pedido.items_detalle && JSON.parse(JSON.stringify(pedido.items_detalle)).slice(0, 3).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span><span className="font-bold">{item.cantidad}x</span> {item.producto}</span>
                                                    </div>
                                                ))}
                                                {(pedido.items_detalle?.length > 3) && <Text type="secondary" className="text-xs italic">... y más items</Text>}
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <Text type="secondary" className="text-xs font-bold">TOTAL:</Text>
                                                <Text className="text-lg font-bold text-[#155153]">{formatCurrency(pedido.total)}</Text>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                {/* BOTON PDF */}
                                                <Tooltip title="Descargar PDF">
                                                    <Button icon={<FilePdfOutlined />} onClick={() => generarReciboPDF(pedido)} />
                                                </Tooltip>

                                                <Tooltip title="Editar">
                                                    <Button icon={<EditOutlined />} onClick={() => abrirPosEditar(pedido)} disabled={pedido.estado !== 'PENDIENTE'} />
                                                </Tooltip>

                                                {pedido.estado === 'PENDIENTE' && (
                                                    <>
                                                        <Tooltip title="Anular">
                                                            <Button danger icon={<CloseCircleOutlined />} onClick={() => cambiarEstado(pedido.id, 'ANULADO')} />
                                                        </Tooltip>
                                                        {/* BOTÓN ENTREGAR AHORA ABRE MODAL */}
                                                        <Tooltip title="Entregar y Cobrar">
                                                            <Button
                                                                type="primary"
                                                                icon={<CheckCircleOutlined />}
                                                                className="bg-[#155153]"
                                                                onClick={() => abrirModalEntrega(pedido.id)}
                                                            />
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Badge.Ribbon>
                            </Col>
                        ))}
                    </Row>
                )}


                <Modal
                    title={<div className="flex items-center gap-2"><DollarCircleOutlined className="text-green-600" /> Confirmar Pago</div>}
                    open={modalEntregaOpen}
                    onCancel={() => setModalEntregaOpen(false)}
                    onOk={confirmarEntrega}
                    confirmLoading={loadingEntrega}
                    okText="Confirmar Entrega"
                    cancelText="Cancelar"
                    okButtonProps={{ className: 'bg-[#155153]' }}
                >
                    <p>Vas a marcar el pedido <b>#{pedidoAEntregar}</b> como entregado.</p>
                    <p className="mb-2 font-bold text-gray-600">¿A dónde ingresó el dinero?</p>
                    <Select
                        className="w-full"
                        size="large"
                        value={cuentaDestino}
                        onChange={setCuentaDestino}
                        options={cuentaOptions}
                    />
                </Modal>

                {/* --- MODAL POS SUPER MEJORADO --- */}
                <Modal
                    open={isPosOpen}
                    onCancel={() => setIsPosOpen(false)}
                    footer={null}
                    width="100%"
                    style={{ top: 0, padding: 0, margin: 0, maxWidth: '100vw' }}
                    bodyStyle={{ height: '100dvh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    closeIcon={null} // Ocultamos el ícono por defecto para poner uno custom más grande
                    wrapClassName="pos-modal-full"
                    destroyOnClose
                >
                    {/* 1. HEADER DEL POS (Visible siempre) */}
                    <div className="h-16 bg-[#155153] text-white flex items-center justify-between px-4 shadow-md flex-shrink-0 z-50">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <ShoppingCartOutlined className="text-xl" />
                            <div className="leading-tight overflow-hidden">
                                <div className="font-bold text-lg truncate">{editingOrderId ? `Editando #${editingOrderId}` : 'Nuevo Pedido'}</div>
                                <div className="text-xs text-green-200 truncate">{carrito.length} ítems • {formatCurrency(totalCarrito)}</div>
                            </div>
                        </div>

                        {/* CONTROLES HEADER */}
                        <div className="flex gap-3">
                            {/* Switcher SOLO MÓVIL */}
                            <div className="md:hidden">
                                <Segmented
                                    options={[
                                        { value: 'catalogo', icon: <AppstoreOutlined /> },
                                        { value: 'carrito', icon: <Badge count={carrito.length} size="small" dot><ShoppingCartOutlined /></Badge> }
                                    ]}
                                    value={viewMobile}
                                    onChange={setViewMobile}
                                    className="bg-white/20 text-white"
                                />
                            </div>
                            {/* BOTÓN CERRAR GRANDE */}
                            <Button
                                type="text"
                                icon={<CloseOutlined style={{ fontSize: '24px', color: 'white' }} />}
                                onClick={() => setIsPosOpen(false)}
                                className="hover:bg-white/20 flex items-center justify-center w-10 h-10 rounded-full"
                            />
                        </div>
                    </div>

                    {/* 2. CONTENIDO PRINCIPAL (Layout Flexible) */}
                    <div className="flex-1 flex overflow-hidden bg-gray-100 relative">

                        {/* SECCIÓN A: CATÁLOGO DE PRODUCTOS */}
                        {/* En móvil: Solo visible si viewMobile === 'catalogo' */}
                        {/* En desktop: Siempre visible (w-2/3 o w-3/4) */}
                        <div className={`
                            flex-col bg-gray-50 flex-1 h-full
                            ${viewMobile === 'catalogo' ? 'flex w-full' : 'hidden md:flex md:w-2/3 lg:w-3/4'}
                        `}>
                            {/* Barra de búsqueda */}
                            <div className="p-3 bg-white shadow-sm z-10">
                                <Input
                                    prefix={<SearchOutlined className="text-gray-400" />}
                                    placeholder="Buscar producto..."
                                    size="large"
                                    onChange={(e) => setBusquedaProducto(e.target.value)}
                                    allowClear
                                />
                            </div>

                            {/* Grid de Productos */}
                            <div className="flex-1 overflow-y-auto p-3 md:p-4">
                                {loadingProductos ? <div className="text-center mt-20"><Spin size="large" /></div> : (
                                    <Row gutter={[12, 12]}>
                                        {productosFiltrados.map((prod) => (
                                            <Col xs={12} sm={8} md={8} lg={6} xl={4} key={prod.id}>
                                                <Card
                                                    hoverable
                                                    className="h-full border-0 shadow-sm hover:shadow-md transition-shadow"
                                                    bodyStyle={{ padding: 8 }}
                                                    onClick={() => agregarAlCarrito(prod)}
                                                >
                                                    <div className="aspect-square bg-white rounded-lg mb-2 flex items-center justify-center relative border border-gray-100">
                                                        {prod.imagen_url
                                                            ? <img src={prod.imagen_url} className="h-full w-full object-contain p-1" alt={prod.nombre} />
                                                            : <ShopOutlined className="text-3xl text-gray-200" />
                                                        }
                                                        <Tag className="absolute top-1 right-1 m-0 text-[10px]" color={prod.cantidad > 0 ? "blue" : "red"}>
                                                            {prod.cantidad}
                                                        </Tag>
                                                    </div>
                                                    <div className="leading-tight">
                                                        <Text strong className="block text-xs md:text-sm line-clamp-2 h-8 md:h-10 mb-1">{prod.nombre}</Text>
                                                        <Text className="text-[#155153] font-bold block">{formatCurrency(prod.monto)}</Text>
                                                    </div>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN B: CARRITO & CHECKOUT */}
                        {/* En móvil: Solo visible si viewMobile === 'carrito' */}
                        {/* En desktop: Siempre visible (w-1/3 o w-1/4) */}
                        <div className={`
                            flex-col bg-white border-l border-gray-200 h-full shadow-2xl z-20
                            ${viewMobile === 'carrito' ? 'flex w-full absolute inset-0' : 'hidden md:flex md:w-1/3 lg:w-1/4 md:static'}
                        `}>
                            {/* Lista de Items */}
                            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                                {carrito.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <ShoppingCartOutlined className="text-4xl mb-2" />
                                        <p>Carrito vacío</p>
                                        <Button type="dashed" className="md:hidden mt-4" onClick={() => setViewMobile('catalogo')}>Ir a productos</Button>
                                    </div>
                                ) : (
                                    <List dataSource={carrito} renderItem={(item) => (
                                        <div className="bg-white p-3 mb-2 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 animate-slideIn">
                                            <div className="flex flex-col items-center gap-1 bg-gray-50 rounded p-1">
                                                <Button size="small" type="text" icon={<PlusOutlined className="text-xs" />} onClick={() => agregarAlCarrito(item)} />
                                                <span className="font-bold text-sm">{item.cantidad}</span>
                                                <Button size="small" type="text" danger icon={<DeleteOutlined className="text-xs" />} onClick={() => restarDelCarrito(item.id)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate m-0">{item.nombre}</p>
                                                <p className="text-xs text-gray-500 m-0">{formatCurrency(item.monto)} c/u</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-[#155153] m-0">{formatCurrency(item.monto * item.cantidad)}</p>
                                                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => eliminarDelCarrito(item.id)} />
                                            </div>
                                        </div>
                                    )} />
                                )}
                            </div>

                            {/* Zona de Totales y Pago */}
                            <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
                                <Select
                                    showSearch placeholder="Buscar Cliente..."
                                    onSearch={handleBuscarCliente} onChange={setClienteSeleccionado}
                                    filterOption={false} style={{ width: '100%' }} className="mb-3" size="large" value={clienteSeleccionado}
                                    notFoundContent={loadingClientes ? <Spin size="small" /> : null}
                                >
                                    {clientes.map(c => <Option key={c.id} value={c.id}>{c.nombre} {c.apellido}</Option>)}
                                </Select>

                                <Input.TextArea
                                    placeholder="Notas del pedido..."
                                    rows={1}
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    className="mb-3 resize-none"
                                />

                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-gray-500">Total a Pagar</span>
                                    <span className="text-2xl font-black text-[#155153]">{formatCurrency(totalCarrito)}</span>
                                </div>

                                <Button
                                    type="primary"
                                    block
                                    size="large"
                                    className="h-12 bg-[#155153] hover:bg-[#0e3a3b] font-bold text-lg shadow-lg"
                                    onClick={guardarPedido}
                                    loading={procesandoVenta}
                                    disabled={carrito.length === 0}
                                >
                                    {editingOrderId ? 'ACTUALIZAR PEDIDO' : 'COBRAR'}
                                </Button>
                            </div>
                        </div>

                    </div>
                </Modal>

            </Content>
        </Layout>
    );
};

export default PedidosDashboard;