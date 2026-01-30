import React, { useState, useEffect, useCallback } from "react";
import {
    Layout, Typography, Row, Col, Card, Button, Avatar, Badge,
    Spin, Modal, message, Statistic, Select, Table, List, Tag, Tabs, Descriptions
} from "antd";
import {
    PlusOutlined, ShoppingCartOutlined, UserOutlined,
    CheckCircleOutlined, EditOutlined, FilePdfOutlined,
    AppstoreOutlined, PrinterOutlined, FileTextOutlined,
    ExclamationCircleOutlined, LockOutlined, HistoryOutlined, CalendarOutlined,
    DollarCircleOutlined
} from "@ant-design/icons";

// SERVICIOS
import {
    getPedidos, updateEstadoPedido, getOrderStats, realizarCierre, getCierres
} from "../../services/pedido/pedidoService";
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

const PedidosDashboard = () => {
    // --- ESTADOS PRINCIPALES ---
    const [pedidos, setPedidos] = useState([]); // Pedidos ACTUALES
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

    // --- ESTADOS DETALLE DE UN CIERRE PASADO ---
    const [modalDetalleCierreOpen, setModalDetalleCierreOpen] = useState(false);
    const [pedidosHistoricos, setPedidosHistoricos] = useState([]);
    const [consolidadoHistorico, setConsolidadoHistorico] = useState([]); // <--- NUEVO
    const [totalHistorico, setTotalHistorico] = useState(0);              // <--- NUEVO
    const [infoCierreSeleccionado, setInfoCierreSeleccionado] = useState(null); // Para mostrar fecha/id en el PDF
    const [loadingPedidosHistoricos, setLoadingPedidosHistoricos] = useState(false);

    // --- CARGA DE DATOS (SESIÓN ACTUAL) ---
    const cargarTodo = useCallback(async () => {
        setLoading(true);
        try {
            const [pedidosRes, statsRes] = await Promise.all([getPedidos(), getOrderStats()]);
            setPedidos(pedidosRes.data || pedidosRes || []);
            setStats(statsRes.data || statsRes);

            const dataStats = statsRes.data || statsRes;
            if (dataStats && dataStats.top_productos) {
                setListaConsolidada(dataStats.top_productos.map((item, idx) => ({ key: idx, nombre: item.name, cantidad: item.cantidad })));
            } else {
                setListaConsolidada([]);
            }
        } catch (error) {
            console.error(error);
            message.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarTodo(); }, [cargarTodo]);

    // =================================================================
    // 🧠 LÓGICA DE CÁLCULO DE CONSOLIDADO (FRONTEND)
    // =================================================================
    const calcularConsolidadoDesdePedidos = (listaPedidos) => {
        const mapaProductos = {};
        let sumaTotal = 0;

        listaPedidos.forEach(p => {
            // Sumar al total dinero (solo si no está anulado, aunque el cierre ya filtra)
            if (p.estado !== 'ANULADO') {
                sumaTotal += Number(p.total);
            }

            // Parsear items y sumar cantidades
            let items = [];
            try {
                items = typeof p.items_detalle === 'string' ? JSON.parse(p.items_detalle) : (p.items_detalle || []);
            } catch (e) { items = []; }

            items.forEach(item => {
                const nombre = item.producto || item.nombre;
                const cantidad = Number(item.cantidad);

                if (mapaProductos[nombre]) {
                    mapaProductos[nombre] += cantidad;
                } else {
                    mapaProductos[nombre] = cantidad;
                }
            });
        });

        // Convertir objeto a array para la tabla
        const arrayConsolidado = Object.keys(mapaProductos).map((key, index) => ({
            key: index,
            nombre: key,
            cantidad: mapaProductos[key]
        }));

        // Ordenar por cantidad descendente (los más vendidos primero)
        return {
            consolidado: arrayConsolidado.sort((a, b) => b.cantidad - a.cantidad),
            total: sumaTotal
        };
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
        setInfoCierreSeleccionado(cierre); // Guardamos info del cierre (fecha, id)
        setModalDetalleCierreOpen(true);
        setLoadingPedidosHistoricos(true);
        try {
            // 1. Traer los pedidos de ese cierre
            const res = await getPedidos({ cierre_id: cierre.id });
            const pedidosData = res.data || [];
            setPedidosHistoricos(pedidosData);

            // 2. Calcular Consolidado y Total "al vuelo"
            const { consolidado, total } = calcularConsolidadoDesdePedidos(pedidosData);
            setConsolidadoHistorico(consolidado);
            setTotalHistorico(total);

        } catch (error) {
            message.error("Error cargando detalles antiguos");
        } finally {
            setLoadingPedidosHistoricos(false);
        }
    };

    // --- MANEJO DE CIERRE DE CAJA ---
    const handleCerrarCaja = () => {
        Modal.confirm({
            title: '¿Cerrar Caja y Reiniciar?',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Esta acción limpiará el tablero actual y guardará el consolidado.</p>
                </div>
            ),
            okText: 'Sí, Cerrar Caja',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await realizarCierre("Cierre manual");
                    message.success("Caja cerrada exitosamente.");
                    cargarTodo();
                } catch (error) {
                    message.error("Error al cerrar caja");
                }
            },
        });
    };

    // --- GENERACIÓN PDF HISTÓRICO ---
    const generarPDFHistorico = () => {
        if (!infoCierreSeleccionado) return;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.text(`Reporte de Cierre #${infoCierreSeleccionado.id}`, 105, 20, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date(infoCierreSeleccionado.fecha_cierre).toLocaleString()}`, 105, 30, null, null, "center");

        // Totales
        doc.setFontSize(14);
        doc.text(`Total Recaudado: ${formatCurrency(totalHistorico)}`, 14, 45);

        // Tabla Consolidada
        doc.text("1. Consolidado de Productos Vendidos:", 14, 55);
        autoTable(doc, {
            startY: 60,
            head: [['Producto', 'Cantidad Total']],
            body: consolidadoHistorico.map(i => [i.nombre, i.cantidad]),
            theme: 'grid',
            headStyles: { fillColor: [21, 81, 83] }
        });

        // Tabla Detallada (Opcional, si quieres que el PDF incluya también la lista de pedidos)
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.text("2. Listado de Pedidos:", 14, finalY);

        const bodyPedidos = pedidosHistoricos.map(p => [
            `#${p.id}`,
            `${p.cliente_nombre} ${p.cliente_apellido}`,
            p.estado,
            formatCurrency(p.total)
        ]);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['ID', 'Cliente', 'Estado', 'Valor']],
            body: bodyPedidos,
            theme: 'striped'
        });

        doc.save(`Cierre_${infoCierreSeleccionado.id}_Completo.pdf`);
    };

    // --- MANEJO DE ENTREGA Y PDF (ACTUAL) ---
    const confirmarEntrega = async () => { /* ... Misma lógica ... */
        if (!pedidoAEntregar) return;
        setLoadingEntrega(true);
        try {
            await updateEstadoPedido(pedidoAEntregar, { nuevo_estado: 'ENTREGADO', cuenta_destino: cuentaDestino });
            message.success("Entregado con éxito"); setModalEntregaOpen(false); cargarTodo();
        } catch (error) { message.error("Error"); } finally { setLoadingEntrega(false); }
    };

    const generarReciboPDF = (pedido) => { /* ... Tu lógica de recibo individual ... */
        const doc = new jsPDF();
        doc.text(`Pedido #${pedido.id}`, 10, 10);
        doc.save(`Recibo_${pedido.id}.pdf`);
    };

    const generarReporteControlActual = () => { /* ... Tu reporte actual ... */
        const doc = new jsPDF();
        doc.text("Consolidado Actual", 10, 10);
        autoTable(doc, { head: [['Producto', 'Total']], body: listaConsolidada.map(i => [i.nombre, i.cantidad]) });
        doc.save("Consolidado_Actual.pdf");
    };

    return (
        <Layout className="min-h-screen bg-gray-50">
            <Content className="p-3 md:p-6 pb-20 md:pb-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>Dashboard POS</Title>
                        <Text type="secondary">Turno Actual</Text>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button icon={<HistoryOutlined />} onClick={abrirHistorial}>Historial Cierres</Button>
                        <Button danger icon={<LockOutlined />} onClick={handleCerrarCaja}>Cerrar Caja</Button>
                        <Button className="bg-orange-500 text-white border-none" icon={<FileTextOutlined />} onClick={() => setModalConsolidadoOpen(true)}>Consolidado</Button>
                        <Button type="primary" className="bg-[#155153]" icon={<PlusOutlined />} size="large" onClick={() => { setEditingOrderId(null); setIsPosOpen(true); }}>Nueva Venta</Button>
                    </div>
                </div>

                {/* WIDGETS */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="shadow-sm border-l-4 border-green-500 rounded-lg">
                            <Statistic title="Ingresos Turno" value={stats.general?.total_ingresos || 0} prefix="$" groupSeparator="." precision={0} />
                        </Card>
                        <Card className="shadow-sm border-l-4 border-orange-400 rounded-lg">
                            <Statistic title="Pendientes" value={stats.por_estado?.find(e => e.name === 'PENDIENTE')?.value || 0} prefix={<ShoppingCartOutlined />} />
                        </Card>
                        <Card className="shadow-sm border-l-4 border-blue-500 rounded-lg">
                            <Statistic title="Unidades" value={stats.general?.total_unidades || 0} prefix={<AppstoreOutlined />} />
                        </Card>
                    </div>
                )}

                {/* LISTADO ACTUAL (Solo muestra pedidos ABIERTOS) */}
                {loading ? <div className="text-center py-20"><Spin size="large" /></div> : (
                    pedidos.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <CheckCircleOutlined className="text-6xl mb-4 opacity-20" />
                            <p>Todo limpio. ¡Listo para nuevas ventas!</p>
                        </div>
                    ) : (
                        <Row gutter={[12, 12]}>
                            {pedidos.map(p => (
                                <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
                                    <Badge.Ribbon text={p.estado} color={p.estado === 'PENDIENTE' ? 'orange' : p.estado === 'ENTREGADO' ? 'green' : 'red'}>
                                        <Card hoverable className="rounded-xl shadow-sm border-gray-200" bodyStyle={{ padding: '12px' }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar icon={<UserOutlined />} className="bg-gray-100 text-gray-500" />
                                                    <div className="overflow-hidden max-w-[140px]">
                                                        <div className="font-bold truncate text-sm">{p.cliente_nombre} {p.cliente_apellido}</div>
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
                                                    {p.estado === 'PENDIENTE' && (
                                                        <Button size="small" type="primary" className="bg-[#155153]" icon={<CheckCircleOutlined />} onClick={() => { setPedidoAEntregar(p.id); setModalEntregaOpen(true); }} />
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </Badge.Ribbon>
                                </Col>
                            ))}
                        </Row>
                    )
                )}

                {/* --- MODAL POS (HIJO) --- */}
                <POSModal visible={isPosOpen} onClose={() => setIsPosOpen(false)} onSaved={cargarTodo} orderIdToEdit={editingOrderId} />

                {/* --- MODAL CONSOLIDADO ACTUAL --- */}
                <Modal title="Consolidado del Turno Actual" open={modalConsolidadoOpen} onCancel={() => setModalConsolidadoOpen(false)} footer={null}>
                    <Table dataSource={listaConsolidada} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center' }]} pagination={false} size="small" scroll={{ y: 400 }} />
                    <Button type="primary" danger block icon={<FilePdfOutlined />} onClick={generarReporteControlActual} className="mt-4">Descargar PDF</Button>
                </Modal>

                {/* --- MODAL ENTREGA --- */}
                <Modal title="Confirmar Entrega" open={modalEntregaOpen} onCancel={() => setModalEntregaOpen(false)} onOk={confirmarEntrega} confirmLoading={loadingEntrega} okText="Confirmar">
                    <Select className="w-full" size="large" value={cuentaDestino} onChange={setCuentaDestino} options={cuentaOptions} />
                </Modal>

                {/* --- MODAL 1: LISTA DE CIERRES --- */}
                <Modal title="Historial de Cierres de Caja" open={modalHistorialOpen} onCancel={() => setModalHistorialOpen(false)} footer={null} width={600}>
                    <List
                        loading={loadingHistorial}
                        dataSource={listaCierres}
                        renderItem={item => (
                            <List.Item actions={[<Button key="ver" type="link" onClick={() => verDetalleCierre(item)}>Ver Detalles</Button>]}>
                                <List.Item.Meta
                                    avatar={<Avatar icon={<CalendarOutlined />} style={{ backgroundColor: '#155153' }} />}
                                    title={`Cierre #${item.id} - ${new Date(item.fecha_cierre).toLocaleDateString()}`}
                                    description={
                                        <div>
                                            <Text strong>{formatCurrency(item.total_ingresos)}</Text> • {item.total_pedidos} Pedidos
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </Modal>

                {/* --- MODAL 2: DETALLE DEL CIERRE SELECCIONADO (CONSOLIDADO + LISTA) --- */}
                <Modal
                    title={infoCierreSeleccionado ? `Detalle Cierre #${infoCierreSeleccionado.id}` : 'Detalle'}
                    open={modalDetalleCierreOpen}
                    onCancel={() => setModalDetalleCierreOpen(false)}
                    footer={[<Button key="c" onClick={() => setModalDetalleCierreOpen(false)}>Cerrar</Button>]}
                    width={900}
                >
                    <Spin spinning={loadingPedidosHistoricos}>

                        {/* 1. Header con Total Calculado */}
                        <div className="bg-gray-100 p-4 rounded-lg mb-4 flex justify-between items-center">
                            <div>
                                <div className="text-gray-500 text-xs">TOTAL RECAUDADO</div>
                                <div className="text-2xl font-bold text-[#155153]">{formatCurrency(totalHistorico)}</div>
                            </div>
                            <Button type="primary" danger icon={<FilePdfOutlined />} onClick={generarPDFHistorico}>
                                Descargar Reporte Completo PDF
                            </Button>
                        </div>

                        {/* 2. Tabs para ver Consolidado o Lista Detallada */}
                        <Tabs defaultActiveKey="1" items={[
                            {
                                key: '1',
                                label: 'Consolidado de Productos',
                                children: (
                                    <Table
                                        dataSource={consolidadoHistorico}
                                        columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cantidad Vendida', dataIndex: 'cantidad', align: 'center', sorter: (a, b) => a.cantidad - b.cantidad }]}
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                    />
                                )
                            },
                            {
                                key: '2',
                                label: 'Lista de Pedidos',
                                children: (
                                    <Table
                                        dataSource={pedidosHistoricos}
                                        columns={[
                                            { title: 'ID', dataIndex: 'id', width: 60 },
                                            { title: 'Cliente', dataIndex: 'cliente_nombre', render: (t, r) => `${t} ${r.cliente_apellido}` },
                                            { title: 'Total', dataIndex: 'total', render: (val) => formatCurrency(val) },
                                            { title: 'Estado', dataIndex: 'estado', render: (tag) => <Tag color={tag === 'ENTREGADO' ? 'green' : 'red'}>{tag}</Tag> }
                                        ]}
                                        rowKey="id"
                                        pagination={{ pageSize: 5 }}
                                        size="small"
                                    />
                                )
                            }
                        ]} />

                    </Spin>
                </Modal>

            </Content>
        </Layout>
    );
};

export default PedidosDashboard;