// src/pages/DashboardClients.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Typography, Input, Form, Select, Button, InputNumber, Tag, message, Modal } from 'antd';
import { FaUser, FaSearch, FaPlus, FaSave, FaHistory } from 'react-icons/fa';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;

const API_URL = import.meta.env.VITE_API_BACKEND;

function DashboardClients() {
    // Estados
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

    // Cargar Datos
    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/clients`);
            setClients(data);
            setFilteredClients(data);
        } catch (err) { message.error("Error al cargar clientes."); }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    // Handlers
    const handleSelectClient = async (client) => {
        setSelectedClient(client);
        setLoadingDetails(true);
        try {
            const { data } = await axios.get(`${API_URL}/clients/${client.id}`);
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

    const handleCreateSubscription = async (values) => {
        try {
            await axios.post(`${API_URL}/subscriptions`, {
                userId: selectedClient.id,
                ...values
            });
            message.success(`Suscripción creada/renovada para ${selectedClient.name}`);
            setIsModalVisible(false);
            // Recargamos todo para ver los cambios
            await fetchClients();
            await handleSelectClient(selectedClient);
        } catch (err) { message.error("Error al guardar la suscripción."); }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            <aside className="w-1/3 max-w-sm flex flex-col bg-white border-r border-slate-200">
                <div className="p-4 border-b"><Input placeholder="Buscar cliente..." prefix={<FaSearch />} onChange={handleSearch} /></div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? <div className="p-4 text-center"><Spin /></div> : filteredClients.map(client => (
                        <div key={client.id} onClick={() => handleSelectClient(client)} className={`p-4 border-b cursor-pointer ${selectedClient?.id === client.id ? 'bg-blue-100' : 'hover:bg-slate-50'}`}>
                            <p className="font-semibold">{client.name}</p>
                            <Tag color={client.subscription_status === 'active' ? 'green' : 'gray'}>
                                {client.subscription_status === 'active' ? `Activo hasta ${dayjs(client.end_date).format('DD MMM YYYY')}` : 'Inactivo / Vencido'}
                            </Tag>
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
                            clientDetails?.subscription_history.length > 0 ? (
                                <div className="space-y-3">
                                    {clientDetails.subscription_history.map(sub => (
                                        <div key={sub.id} className="p-3 border rounded-md bg-slate-50">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{sub.plan_name} - {formatCurrency(sub.amount_paid)}</p>
                                                <Tag color={sub.status === 'active' ? 'green' : 'gray'}>{sub.status}</Tag>
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
                <Form form={form} layout="vertical" onFinish={handleCreateSubscription}>
                    <Form.Item name="planName" label="Nombre del Plan" rules={[{ required: true }]}><Input placeholder="Ej: Plan Semestral"/></Form.Item>
                    <Form.Item name="amountPaid" label="Monto Pagado (COP)" rules={[{ required: true }]}><InputNumber prefix="$ " className="w-full"/></Form.Item>
                    <Form.Item name="durationMonths" label="Duración (Meses)" rules={[{ required: true }]}><InputNumber className="w-full"/></Form.Item>
                    <Form.Item name="description" label="Descripción / Notas (Opcional)"><Input.TextArea rows={2} placeholder="Ej: Incluye cargo extra por documentos"/></Form.Item>
                    <Button type="primary" htmlType="submit" block icon={<FaSave />}>Guardar Suscripción</Button>
                </Form>
            </Modal>
        </div>
    );
}

export default DashboardClients;