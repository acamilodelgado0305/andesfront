import React, { useState, useEffect, useMemo } from "react";
import {
    Modal, Button, Input, Badge, Select, Empty, message, notification, Segmented, Spin
} from "antd";
import {
    CloseOutlined, ShoppingCartOutlined, AppstoreOutlined, SearchOutlined,
    PlusOutlined, MinusOutlined, ShopOutlined, UserOutlined, FileTextOutlined
} from "@ant-design/icons";

// SERVICIOS
import { getInventario } from "../../services/inventario/inventarioService";
import { getPersonas } from "../../services/person/personaService";
import { createPedido, updatePedido, getPedidoById } from "../../services/pedido/pedidoService";

const { Option } = Select;
const { TextArea } = Input; // <--- Importamos TextArea

// Estilos CSS para el Modal Full Screen
const modalStyles = `
  .pos-full-screen-modal .ant-modal { max-width: 100vw; top: 0; padding-bottom: 0; margin: 0; }
  .pos-full-screen-modal .ant-modal-content { display: flex; flex-direction: column; height: 100dvh; border-radius: 0; padding: 0; overflow: hidden; }
  .pos-full-screen-modal .ant-modal-body { flex: 1; padding: 0; overflow: hidden; display: flex; flex-direction: column; }
`;

const formatCurrency = (val) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

const POSModal = ({ visible, onClose, onSaved, orderIdToEdit }) => {
    // --- ESTADOS INTERNOS DEL POS ---
    const [viewMobile, setViewMobile] = useState("catalogo");
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // --- ESTADOS DE VENTA ---
    const [carrito, setCarrito] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [observaciones, setObservaciones] = useState(""); // <--- NUEVO ESTADO
    const [busquedaProducto, setBusquedaProducto] = useState("");
    const [procesando, setProcesando] = useState(false);

    // --- CARGAR DATOS AL ABRIR ---
    useEffect(() => {
        if (visible) {
            cargarDatosIniciales();
        } else {
            // Limpiar al cerrar
            setCarrito([]);
            setClienteSeleccionado(null);
            setObservaciones(""); // <--- LIMPIAR OBSERVACIONES
            setBusquedaProducto("");
            setViewMobile("catalogo");
        }
    }, [visible, orderIdToEdit]);

    const cargarDatosIniciales = async () => {
        setLoadingData(true);
        try {
            const [resInv, resClientes] = await Promise.all([getInventario(), getPersonas("")]);
            setProductos(Array.isArray(resInv) ? resInv : (resInv.data || []));
            setClientes(Array.isArray(resClientes) ? resClientes : (resClientes.data || []));

            // Si estamos editando, cargar el pedido existente
            if (orderIdToEdit) {
                const data = await getPedidoById(orderIdToEdit);
                const pedido = data.pedido || data;
                const items = data.items || data.items_detalle || [];

                setClienteSeleccionado(pedido.persona_id);
                setObservaciones(pedido.observaciones || ""); // <--- CARGAR OBSERVACIONES

                const carritoMap = items.map(i => ({
                    id: i.inventario_id,
                    nombre: i.producto_nombre || i.nombre,
                    monto: Number(i.precio_unitario || i.monto),
                    cantidad: Number(i.cantidad),
                    imagen_url: i.imagen_url || null
                }));
                setCarrito(carritoMap);
                setViewMobile("carrito");
            }
        } catch (error) {
            message.error("Error cargando datos del POS");
        } finally {
            setLoadingData(false);
        }
    };

    // --- LOGICA CARRITO ---
    const agregarAlCarrito = (prod) => {
        setCarrito(prev => {
            const existe = prev.find(i => i.id === prod.id);
            if (existe) return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
            return [...prev, { ...prod, cantidad: 1, monto: Number(prod.monto) }];
        });
        message.destroy();
        message.success({ content: "Agregado", duration: 1 });
    };

    const restarDelCarrito = (id) => {
        setCarrito(prev => prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i).filter(i => i.cantidad > 0));
    };

    const totalCarrito = useMemo(() => carrito.reduce((acc, i) => acc + (i.monto * i.cantidad), 0), [carrito]);
    const cantidadTotalItems = useMemo(() => carrito.reduce((acc, i) => acc + i.cantidad, 0), [carrito]);

    const handleGuardar = async () => {
        if (!clienteSeleccionado) return message.warning("Selecciona un cliente");
        if (carrito.length === 0) return message.warning("Carrito vacío");

        setProcesando(true);
        try {
            const payload = {
                persona_id: clienteSeleccionado,
                items: carrito.map(p => ({ inventario_id: p.id, cantidad: p.cantidad })),
                observaciones: observaciones // <--- ENVIAR AL BACKEND
            };

            if (orderIdToEdit) {
                await updatePedido(orderIdToEdit, payload);
                notification.success({ message: 'Pedido Actualizado' });
            } else {
                await createPedido(payload);
                notification.success({ message: 'Venta Registrada' });
            }
            onSaved();
            onClose();
        } catch (error) {
            notification.error({ message: 'Error procesando la venta', description: error.message });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <Modal
            open={visible}
            title={null}
            footer={null}
            closeIcon={null}
            width="100%"
            wrapClassName="pos-full-screen-modal"
            destroyOnClose
        >
            <style>{modalStyles}</style>
            <div className="flex flex-col h-full bg-gray-100">

                {/* HEADER */}
                <div className="h-14 bg-[#155153] flex justify-between px-3 items-center text-white shrink-0 shadow-md z-10">
                    <div className="flex items-center gap-2">
                        <Button type="text" icon={<CloseOutlined className="text-white text-lg" />} onClick={onClose} />
                        <span className="font-bold text-lg">{orderIdToEdit ? `Editando #${orderIdToEdit}` : 'Nueva Venta'}</span>
                    </div>
                    <div className="md:hidden">
                        <Segmented
                            options={[
                                { value: 'catalogo', icon: <AppstoreOutlined /> },
                                { value: 'carrito', icon: <Badge count={cantidadTotalItems} size="small" offset={[5, 0]} color="orange"><ShoppingCartOutlined /></Badge> }
                            ]}
                            value={viewMobile}
                            onChange={setViewMobile}
                            className="bg-white/20 text-white border-none"
                        />
                    </div>
                    <div className="hidden md:block font-bold text-xl">{formatCurrency(totalCarrito)}</div>
                </div>

                {loadingData ? <div className="flex h-full items-center justify-center"><Spin size="large" tip="Cargando POS..." /></div> : (
                    <div className="flex-1 overflow-hidden relative flex flex-row">

                        {/* IZQUIERDA: CATALOGO */}
                        <div className={`flex flex-col w-full md:w-2/3 h-full bg-white transition-transform duration-300 absolute md:relative ${viewMobile === 'catalogo' ? 'translate-x-0 z-20' : '-translate-x-full md:translate-x-0 z-0'}`}>
                            <div className="p-3 border-b bg-gray-50 shrink-0">
                                <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Buscar producto..." size="large" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)} allowClear />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 pb-20 md:pb-2">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {productos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).map(p => {
                                        const enCarrito = carrito.find(c => c.id === p.id);
                                        return (
                                            <div key={p.id} onClick={() => agregarAlCarrito(p)} className={`bg-white border rounded-lg p-2 shadow-sm relative active:scale-95 transition-transform cursor-pointer ${enCarrito ? 'border-[#155153] ring-1 ring-[#155153] bg-teal-50' : 'border-gray-200'}`}>
                                                <div className="aspect-square bg-white mb-2 rounded flex items-center justify-center overflow-hidden relative">
                                                    {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-contain" /> : <ShopOutlined className="text-3xl text-gray-300" />}
                                                    {enCarrito && <div className="absolute top-1 right-1 bg-[#155153] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md animate-bounce-short">{enCarrito.cantidad}</div>}
                                                </div>
                                                <div className="text-xs font-bold leading-tight line-clamp-2 h-8 text-gray-700">{p.nombre}</div>
                                                <div className="mt-1 font-extrabold text-[#155153]">{formatCurrency(p.monto)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="h-10 md:hidden"></div>
                            </div>
                        </div>

                        {/* DERECHA: CARRITO Y OBSERVACIONES */}
                        <div className={`flex flex-col w-full md:w-1/3 h-full bg-gray-50 border-l border-gray-200 transition-transform duration-300 absolute md:relative ${viewMobile === 'carrito' ? 'translate-x-0 z-30' : 'translate-x-full md:translate-x-0 z-0'}`}>

                            {/* Lista Items */}
                            <div className="flex-1 overflow-y-auto p-3 pb-4">
                                {carrito.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <ShoppingCartOutlined className="text-4xl mb-2 opacity-50" />
                                        <p>Carrito vacío</p>
                                        <Button type="link" onClick={() => setViewMobile('catalogo')} className="md:hidden">Ir al catálogo</Button>
                                    </div>
                                ) : (
                                    carrito.map(i => (
                                        <div key={i.id} className="bg-white p-3 rounded-lg shadow-sm mb-2 border border-gray-100 flex items-center gap-3">
                                            <div className="flex flex-col items-center gap-1 bg-gray-100 rounded p-1">
                                                <Button size="small" type="text" icon={<PlusOutlined className="text-xs" />} onClick={() => agregarAlCarrito(i)} className="flex items-center justify-center h-6 w-6" />
                                                <span className="font-bold text-sm">{i.cantidad}</span>
                                                <Button size="small" type="text" danger icon={<MinusOutlined className="text-xs" />} onClick={() => restarDelCarrito(i.id)} className="flex items-center justify-center h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-800 truncate">{i.nombre}</div>
                                                <div className="text-xs text-gray-500">{formatCurrency(i.monto)} c/u</div>
                                            </div>
                                            <div className="font-bold text-gray-800">{formatCurrency(i.monto * i.cantidad)}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Panel Inferior: Cliente + Observaciones + Total + Botón */}
                            <div className="bg-white p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">

                                {/* 1. Selector Cliente */}
                                <Select showSearch placeholder="Buscar Cliente..." className="w-full mb-2" size="large" value={clienteSeleccionado} onChange={setClienteSeleccionado} onSearch={val => getPersonas({ q: val }).then(r => setClientes(r))} filterOption={false} suffixIcon={<UserOutlined />}>
                                    {clientes.map(c => <Option key={c.id} value={c.id}>{c.nombre} {c.apellido}</Option>)}
                                </Select>

                                {/* 2. Campo de Observaciones (NUEVO) */}
                                <TextArea
                                    placeholder="Observaciones (ej: Sin salsa, Entregar tarde...)"
                                    className="mb-3"
                                    rows={2}
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    maxLength={250}
                                />

                                {/* 3. Totales */}
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-gray-500 font-medium">Total a Pagar</span>
                                    <span className="text-3xl font-black text-[#155153]">{formatCurrency(totalCarrito)}</span>
                                </div>

                                {/* 4. Botón Acción */}
                                <Button type="primary" block size="large" className="h-12 text-lg font-bold bg-[#155153] shadow-lg shadow-teal-900/20" onClick={handleGuardar} loading={procesando}>
                                    {orderIdToEdit ? 'ACTUALIZAR PEDIDO' : 'COBRAR VENTA'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default POSModal;