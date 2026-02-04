import React, { useState, useEffect, useCallback } from "react";
import {
    Layout, Typography, Row, Col, Card, Button, Avatar, Badge,
    Spin, Modal, message, Statistic, Select, Table, List, Tag, Tabs
} from "antd";
import {
    PlusOutlined, ShoppingCartOutlined, UserOutlined,
    CheckCircleOutlined, EditOutlined, FilePdfOutlined,
    AppstoreOutlined, PrinterOutlined, FileTextOutlined,
    ExclamationCircleOutlined, LockOutlined, HistoryOutlined, CalendarOutlined
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

    const generarReciboPDF = (pedido) => {
        const doc = new jsPDF();
        doc.text(`Pedido #${pedido.id}`, 10, 10);
        // ... (Tu lógica de recibo)
        doc.save(`Recibo_${pedido.id}.pdf`);
    };

    const generarReporteControlActual = () => {
        const doc = new jsPDF();
        doc.text("Consolidado Actual", 10, 10);
        autoTable(doc, { head: [['Producto', 'Total']], body: listaConsolidada.map(i => [i.nombre, i.cantidad]) });
        doc.save("Consolidado_Actual.pdf");
    };

    return (
        <Layout className="min-h-screen bg-gray-50">
            <style>{responsiveModalStyles}</style>

            <Content className="p-3 md:p-6 pb-20 md:pb-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#155153' }}>Dashboard POS</Title>
                        <Text type="secondary">Turno Actual</Text>
                    </div>
                    {/* Botones responsivos: flex-wrap permite que bajen si no caben */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button icon={<HistoryOutlined />} onClick={abrirHistorial} className="flex-1 md:flex-none">Historial</Button>
                        <Button danger icon={<LockOutlined />} onClick={handleCerrarCaja} className="flex-1 md:flex-none">Cerrar</Button>
                        <Button className="bg-orange-500 text-white border-none flex-1 md:flex-none" icon={<FileTextOutlined />} onClick={() => setModalConsolidadoOpen(true)}>Consolidado</Button>
                        <Button type="primary" className="bg-[#155153] w-full md:w-auto mt-2 md:mt-0" icon={<PlusOutlined />} size="large" onClick={() => { setEditingOrderId(null); setIsPosOpen(true); }}>Nueva Venta</Button>
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

                {/* LISTADO ACTUAL */}
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
                    <Table dataSource={listaConsolidada} columns={[{ title: 'Producto', dataIndex: 'nombre' }, { title: 'Cant.', dataIndex: 'cantidad', align: 'center' }]} pagination={false} size="small" scroll={{ y: 300 }} />
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
