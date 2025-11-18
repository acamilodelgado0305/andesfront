// src/pages/DashboardClients.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Typography, Input, Form, Select, Button, Tag, message, Modal } from 'antd'; // CAMBIADO: Quitado InputNumber
import { FaUser, FaSearch, FaPlus, FaSave, FaHistory } from 'react-icons/fa';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { NumericFormat } from 'react-number-format'; // ¡Importante! Asegúrate de tener esta línea.
dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;

// CAMBIADO: Asumimos que tus rutas de API están bajo /api
const API_URL = import.meta.env.VITE_API_BACKEND;

function DashboardClients() {
    // Estados
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [plans, setPlans] = useState([]); // NUEVO: Estado para guardar los planes disponibles
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();


    // Cargar Datos
    // CAMBIADO: El endpoint ahora apunta a la nueva ruta que creamos
    const fetchClients = useCallback(async () => {
        try {
            // Usamos la nueva ruta del controlador 'getSubscriptionsOverviewController'
            const { data } = await axios.get(`${API_URL}/api/subscriptions`);
            setClients(data);
            setFilteredClients(data);
        } catch (err) {
            message.error("Error al cargar clientes.");
        }
    }, []);

    // NUEVO: Función para cargar los planes desde el backend
    const fetchPlans = useCallback(async () => {
        try {
            // Necesitarás un nuevo endpoint en tu backend para esto
            const { data } = await axios.get(`${API_URL}/plans`);
            setPlans(data);
        } catch (err) {
            message.error("Error al cargar los planes de suscripción.");
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchClients(), fetchPlans()]); // Cargamos clientes y planes en paralelo
            setLoading(false);
        };
        loadData();
    }, [fetchClients, fetchPlans]);

    // Handlers
    // CAMBIADO: El endpoint ahora apunta a la nueva ruta que creamos
    const handleSelectClient = async (client) => {
        if (!client.end_date) { // Si es un cliente sin suscripción, no hay detalles que cargar
            setSelectedClient(client);
            setClientDetails(null);
            return;
        }
        setSelectedClient(client);
        setLoadingDetails(true);
        try {
            // Usamos la nueva ruta del controlador 'getClientDetailsController'
            const { data } = await axios.get(`${API_URL}/client-details/${client.id}`);
            setClientDetails(data);
        } catch (err) {
            message.error("Error al cargar el historial del cliente.");
        }
        setLoadingDetails(false);
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setFilteredClients(clients.filter(c => c.name.toLowerCase().includes(query)));
    };

    const handleOpenModal = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    // REFACTORIZADO: La lógica para crear/renovar ahora usa el `planId`
    const handleSubscriptionSubmit = async (values) => {
        try {
            // Usamos el endpoint del controlador 'renewSubscriptionController'
            await axios.post(`${API_URL}/api/subscriptions/renew`, {
                userId: selectedClient.id,
                planId: values.planId, // CAMBIADO: Enviamos el ID del plan seleccionado
                description: values.description
            });
            message.success(`Suscripción procesada para ${selectedClient.name}`);
            setIsModalVisible(false);

            // Recargamos todo para ver los cambios
            setLoading(true);
            await fetchClients();
            // Creamos una copia actualizada del cliente para no volver a llamar a la API
            const updatedSelectedClient = { ...selectedClient, id: selectedClient.id };
            await handleSelectClient(updatedSelectedClient);
            setLoading(false);

        } catch (err) {
            message.error(err.response?.data?.error || "Error al guardar la suscripción.");
        }
    };

    // NUEVO: Helper para renderizar el tag de estado de forma más limpia
    const renderSubscriptionTag = (client) => {
        switch (client.subscription_status) {
            case 'active':
                return <Tag color="green">Activo hasta {dayjs(client.end_date).format('DD MMM YYYY')}</Tag>;
            case 'expired':
                return <Tag color="red">Vencido el {dayjs(client.end_date).format('DD MMM YYYY')}</Tag>;
            case 'no_subscription':
                return <Tag color="default">Sin Suscripción</Tag>;
            default:
                return <Tag color="gray">Inactivo</Tag>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            <aside className="w-1/3 max-w-sm flex flex-col bg-white border-r border-slate-200">
                <div className="p-4 border-b"><Input placeholder="Buscar cliente..." prefix={<FaSearch />} onChange={handleSearch} /></div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? <div className="p-4 text-center"><Spin /></div> : filteredClients.map(client => (
                        <div key={client.id} onClick={() => handleSelectClient(client)} className={`p-4 border-b cursor-pointer ${selectedClient?.id === client.id ? 'bg-blue-100' : 'hover:bg-slate-50'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold">{client.name}</p>
                                <span className="text-sm font-bold text-emerald-600">
                                    {/* CAMBIADO: Usamos NumericFormat para el total */}
                                    <NumericFormat
                                        value={client.total_paid}
                                        displayType={'text'}
                                        thousandSeparator="."
                                        decimalSeparator=","
                                        prefix="$ "
                                        decimalScale={2}
                                        fixedDecimalScale
                                    />
                                </span>
                            </div>
                            {renderSubscriptionTag(client)}
                        </div>
                    ))}
                </div>
            </aside>

            <main className="w-2/3 flex-grow p-6 overflow-y-auto">
                {!selectedClient ? <div className="text-center text-slate-500 pt-20"><FaUser size={48} className="mx-auto mb-4" /><p>Seleccione un cliente para ver su historial.</p></div> :
                    (
                        <div className="bg-white p-6 border rounded-md">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <Title level={4} className="!mb-1">{selectedClient.name}</Title>
                                    <Text type="secondary">{selectedClient.email}</Text>
                                </div>
                                <Button type="primary" icon={<FaPlus />} onClick={handleOpenModal}>Añadir / Renovar Suscripción</Button>
                            </div>

                            <Title level={5} className="flex items-center gap-2 mt-6"><FaHistory className="text-slate-400" />Historial de Suscripciones</Title>
                            {loadingDetails ? <Spin /> :
                                clientDetails?.subscription_history && clientDetails.subscription_history.length > 0 ? (
                                    <div className="space-y-3">
                                        {clientDetails.subscription_history.map(sub => (
                                            <div key={sub.id} className="p-3 border rounded-md bg-slate-50">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold">{sub.plan_name} -
                                                        {/* CAMBIADO: Usamos NumericFormat para el historial */}
                                                        <NumericFormat
                                                            value={sub.amount_paid}
                                                            displayType={'text'}
                                                            thousandSeparator="."
                                                            decimalSeparator=","
                                                            prefix=" " // Dejamos un espacio despues del guion
                                                            decimalScale={2}
                                                            fixedDecimalScale
                                                        />
                                                    </p>
                                                    <Tag color={dayjs(sub.end_date).isAfter(dayjs()) ? 'green' : 'gray'}>
                                                        {dayjs(sub.end_date).isAfter(dayjs()) ? 'Activa' : 'Finalizada'}
                                                    </Tag>
                                                </div>
                                                <p className="text-sm text-slate-600">Periodo: {dayjs(sub.start_date).format('DD/MM/YYYY')} - {dayjs(sub.end_date).format('DD/MM/YYYY')}</p>
                                                {sub.description && <p className="text-xs text-blue-600 mt-1 bg-blue-50 p-1 rounded">Nota: {sub.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : <Text>Este cliente no tiene historial de suscripciones.</Text>
                            }
                        </div>
                    )}
            </main>

            <Modal title={`Nueva Suscripción para ${selectedClient?.name}`} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} destroyOnClose>
                {/* CAMBIADO: El formulario ahora es un selector de planes */}
                <Form form={form} layout="vertical" onFinish={handleSubscriptionSubmit}>
                    <Form.Item name="planId" label="Seleccionar Plan" rules={[{ required: true, message: 'Por favor seleccione un plan.' }]}>
                        <Select placeholder="Elige un plan para el cliente">
                            {plans.map(plan => (
                                <Option key={plan.id} value={plan.id}>
                                    {`${plan.name} (${plan.duration_months} meses) - `}
                                    {/* CAMBIADO: Usamos NumericFormat también en el selector */}
                                    <NumericFormat
                                        value={plan.price}
                                        displayType={'text'}
                                        thousandSeparator="."
                                        decimalSeparator=","
                                        prefix="$ "
                                        decimalScale={2}
                                        fixedDecimalScale
                                    />
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Descripción / Notas (Opcional)">
                        <Input.TextArea rows={2} placeholder="Ej: Pago recibido en efectivo." />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block icon={<FaSave />}>Guardar Suscripción</Button>
                </Form>
            </Modal>
        </div>
    );
}

export default DashboardClients;