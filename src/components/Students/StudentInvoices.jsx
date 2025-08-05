import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    Table, Button, Modal, message, Typography, Spin, Form,
    Select, DatePicker, Input, InputNumber, Tag
} from 'antd';
import { FaPlus, FaDownload, FaTrashAlt, FaMoneyBillWave } from 'react-icons/fa';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
// Mantén tus importaciones de estado y hooks: useState, useEffect, useCallback

const { Title, Text } = Typography;
const { Option } = Select;

// Ajusta la URL base de tu backend
const API_URL = import.meta.env.VITE_API_BACKEND;


const StudentPayments = () => { // Renombrado de Facturas a StudentPayments
    const { id: studentId } = useParams(); // Obtener el ID del estudiante de la URL
    const [payments, setPayments] = useState([]); // Ahora son `payments`
    const [student, setStudent] = useState(null);

    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false); // Para el modal de nuevo pago
    const [form] = Form.useForm(); // Instancia del formulario de Ant Design
    const [paymentTypes, setPaymentTypes] = useState([]); // Para cargar tipos de pago (Mensualidad, Matrícula, etc.)
    const [studentPrograms, setStudentPrograms] = useState([]); // Para programas asociados del estudiante (para mensualidades)
    const [selectedPaymentType, setSelectedPaymentType] = useState(null); // Para controlar los campos condicionales del modal
    const [montoEsperadoMensualidad, setMontoEsperadoMensualidad] = useState(null); // Monto sugerido para mensualidad

    // --- UTILITIES ---
    const formatCurrency = useCallback((value) => {
        const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
        return numericValue.toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    }, []);

 
    


    const loadAllStudentPaymentData = useCallback(async () => {
        setLoading(true);
        try {
            const [studentRes, typesRes, programsRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/students/${studentId}`),
                axios.get(`${API_URL}/types_pago`),
                axios.get(`${API_URL}/students/${studentId}/program-info`),
                axios.get(`${API_URL}/payments/student/${studentId}`),
            ]);
            setStudent(studentRes.data);
            setPaymentTypes(typesRes.data);
            setStudentPrograms(programsRes.data);
            setPayments(paymentsRes.data);
        } catch (err) {
            message.error('Error al cargar la información de pagos.');
        } finally {
            setLoading(false);
        }
    }, [studentId]);

     useEffect(() => {
        loadAllStudentPaymentData();
    }, [loadAllStudentPaymentData]);

    // Lógica para actualizar el monto esperado en el formulario de pago (modal)
    // Se dispara cuando selectedPaymentType o el programa seleccionado cambian
    useEffect(() => {
        if (selectedPaymentType === 'Mensualidad' && form.getFieldValue('program_id')) {
            const selectedProgram = studentPrograms.find(
                (p) => p.programa_id === form.getFieldValue('program_id')
            );
            if (selectedProgram) {
                const monto = parseFloat(selectedProgram.costo_mensual_esperado);
                setMontoEsperadoMensualidad(monto);
                form.setFieldsValue({ monto: monto }); // Pre-rellenar el campo monto
            } else {
                setMontoEsperadoMensualidad(null);
                form.setFieldsValue({ monto: null });
            }
        } else {
            setMontoEsperadoMensualidad(null);
            // Asegurarse de no rellenar el monto si el tipo de pago no es mensualidad
            // o si el programa no ha sido seleccionado.
        }
    }, [selectedPaymentType, form, studentPrograms]);


    // --- EVENT HANDLERS ---

    // Manejar el envío del formulario del modal para crear un nuevo pago
    const handleCreatePayment = async (values) => {
        try {
            // Formatear periodo_pagado solo si es mensualidad
            const periodo = values.tipo_pago_nombre === 'Mensualidad' && values.periodo_pagado
                ? dayjs(values.periodo_pagado).format("YYYY-MM")
                : null;

            // Enviar program_id solo si es mensualidad
            const programIdToSend = values.tipo_pago_nombre === 'Mensualidad' && values.program_id
                ? parseInt(values.program_id)
                : null;

            await axios.post(`${API_URL}/payments`, {
                student_id: parseInt(studentId),
                tipo_pago_nombre: values.tipo_pago_nombre,
                monto: parseFloat(values.monto),
                periodo_pagado: periodo,
                metodo_pago: values.metodo_pago,
                referencia_transaccion: values.referencia_transaccion || null,
                observaciones: values.observaciones || null,
                program_id: programIdToSend, // Enviamos el program_id si aplica
            });
            message.success("Pago registrado exitosamente.");
            setIsModalVisible(false); // Cerrar modal
            form.resetFields(); // Limpiar formulario
            setSelectedPaymentType(null); // Resetear tipo de pago seleccionado en el modal

            await loadAllStudentPaymentData(); // Recargar todos los datos
        } catch (error) {
            console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al registrar pago:`, error.response?.data || error.message);
            message.error("Error al registrar pago: " + (error.response?.data?.error || "Verifica la consola para más detalles."));
        }
    };




    // Manejar la eliminación de un pago
    const handleDeletePayment = async (paymentId) => { // Renombrado de handleDelete a handleDeletePayment
        Modal.confirm({
            title: '¿Está seguro de que desea eliminar este pago?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await axios.delete(`${API_URL}/payments/${paymentId}`);
                    message.success('Pago eliminado con éxito.');
                    await loadAllStudentPaymentData(); // Recargar todos los datos
                } catch (error) {
                    console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al eliminar pago:`, error.response?.data || error.message);
                    message.error('Error al eliminar pago: ' + (error.response?.data?.error || "Verifica la consola."));
                }
            },
        });
    };

    // Función para emitir y descargar un recibo
    const handleDownloadReceipt = (paymentId) => {
        const receiptUrl = `${API_URL}/receipts/${paymentId}/download`; // Necesitarás implementar esta ruta en tu backend
        window.open(receiptUrl, '_blank');
        message.info("Generando recibo. Si la descarga no inicia, verifique las ventanas emergentes.");
    };

    // --- TABLE COLUMNS ---
   const columns = [
        {
            title: 'Concepto',
            dataIndex: 'tipo_pago_nombre',
            key: 'tipo_pago_nombre',
            render: (text) => <span className="font-semibold text-slate-700">{text}</span>
        },
        {
            title: 'Período/Programa',
            key: 'periodo_programa',
            render: (_, record) => (
                <Text type="secondary" className="text-xs">
                    {record.tipo_pago_nombre === 'Mensualidad'
                        ? dayjs(record.periodo_pagado + '-01').format('MMMM YYYY')
                        : record.programa_nombre || 'General'}
                </Text>
            )
        },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            render: (text) => <span className="text-slate-800">{formatCurrency(text)}</span>,
        },
        {
            title: 'Fecha de Pago',
            dataIndex: 'fecha_pago',
            key: 'fecha_pago',
            render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : 'N/A',
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            render: (estado) => {
                const colors = {
                    'Pagado': 'green',
                    'Pendiente': 'orange',
                    'Vencido': 'red'
                };
                const icons = {
                    'Pagado': <CheckCircleOutlined />,
                    'Pendiente': <ClockCircleOutlined />,
                    'Vencido': <ExclamationCircleOutlined />
                };
                return <Tag color={colors[estado]} icon={icons[estado]}>{estado}</Tag>;
            },
        },
        {
            title: 'Acciones',
            key: 'acciones',
            align: 'right',
            render: (_, record) => (
                <div className="flex justify-end gap-x-2">
                    {record.estado === 'Pagado' && (
                        <Button type="text" size="small" icon={<FaDownload />} onClick={() => handleDownloadReceipt(record.id)}>Recibo</Button>
                    )}
                    <Button type="text" danger size="small" icon={<FaTrashAlt />} onClick={() => handleDeletePayment(record.id)} />
                </div>
            ),
        },
    ];

    // --- Render Component ---
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
    }

    if (!student) {
        return <div className="text-center p-10">No se encontraron datos del estudiante.</div>;
    }

    const totalPaid = payments.filter(p => p.estado === 'Pagado').reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const avgMonthlyCost = studentPrograms.length > 0
        ? studentPrograms.reduce((sum, p) => sum + parseFloat(p.costo_mensual_esperado), 0) / studentPrograms.length
        : 0;

    

   return (
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6">
            {/* --- ENCABEZADO Y ACCIONES PRINCIPALES --- */}
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <Text className="text-slate-500">Gestión Financiera</Text>
                    <Title level={3} className="!mt-0 !mb-1">Pagos de {student.nombre} {student.apellido}</Title>
                    <Text>Coordinador Asignado: <span className="font-semibold">{student.coordinador_nombre || 'N/A'}</span></Text>
                </div>
                <Button type="primary" icon={<FaPlus />} onClick={() => setIsModalVisible(true)}>
                    Registrar Nuevo Pago
                </Button>
            </header>

            {/* --- DASHBOARD FINANCIERO --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 border border-slate-200 rounded-md">
                    <Text className="text-slate-500">Valor Matrícula</Text>
                    <p className="text-2xl font-semibold text-slate-800">{formatCurrency(student.matricula)}</p>
                    <Tag color={student.estado_matricula ? 'green' : 'orange'}>{student.estado_matricula ? 'Pagada' : 'Pendiente'}</Tag>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-md">
                    <Text className="text-slate-500">Costo Mensual Promedio</Text>
                    <p className="text-2xl font-semibold text-slate-800">{formatCurrency(avgMonthlyCost)}</p>
                    <Text className="text-xs text-slate-400">Basado en programas inscritos</Text>
                </div>
                <div className="bg-blue-500 text-white p-4 border border-blue-600 rounded-md">
                    <Text className="text-blue-100">Total Pagado</Text>
                    <p className="text-2xl font-semibold">{formatCurrency(totalPaid)}</p>
                    <Text className="text-xs text-blue-200">Suma de todos los pagos confirmados</Text>
                </div>
            </div>

            {/* --- TABLA DE HISTORIAL DE PAGOS --- */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200">
                     <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <FaMoneyBillWave className="text-slate-400" />
                        Historial de Pagos
                    </h3>
                </div>
                <Table
                    columns={columns}
                    dataSource={payments}
                    rowKey="id"
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
                    locale={{ emptyText: 'Este estudiante aún no tiene pagos registrados.' }}
                />
            </div>
            
             {/* --- MODAL (SIN CAMBIOS EN SU LÓGICA INTERNA) --- */}
             <Modal
                title="Registrar Nuevo Pago"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose // Limpia los campos del formulario al cerrar
            >
                <Form form={form} layout="vertical" onFinish={handleCreatePayment} initialValues={{ metodo_pago: 'Transferencia' }}>
                     {/* ... El contenido de tu <Form> se mantiene exactamente igual ... */}
                     <Form.Item name="tipo_pago_nombre" label="Tipo de Pago" rules={[{ required: true }]}>
                        <Select placeholder="Seleccione un tipo" onChange={setSelectedPaymentType}>
                             {paymentTypes.map((type) => <Option key={type.id} value={type.nombre}>{type.nombre}</Option>)}
                        </Select>
                     </Form.Item>

                    {selectedPaymentType === 'Mensualidad' && (
                        <>
                             <Form.Item name="program_id" label="Programa" rules={[{ required: true }]}>
                                 <Select placeholder="Seleccione el programa">
                                     {studentPrograms.map((p) => <Option key={p.programa_id} value={p.programa_id}>{p.programa_nombre}</Option>)}
                                 </Select>
                             </Form.Item>
                             <Form.Item name="periodo_pagado" label="Período Pagado" rules={[{ required: true }]}>
                                <DatePicker picker="month" className="w-full" />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item name="monto" label="Monto Pagado" rules={[{ required: true }]}>
                         <InputNumber prefix="$ " className="w-full" />
                    </Form.Item>
                    <Form.Item name="metodo_pago" label="Método de Pago" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="referencia_transaccion" label="Referencia">
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="w-full">Registrar</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );

};

export default StudentPayments;