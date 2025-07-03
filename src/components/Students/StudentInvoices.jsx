// src/components/Students/StudentPayments.jsx (NUEVO NOMBRE DE ARCHIVO)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    Table,
    Button,
    Card,
    Modal,
    message,
    Typography,
    Row,
    Col,
    Space,
    Tag,
    Spin,
    Form,      // Para el formulario de nuevo pago
    Select,    // Para seleccionar tipo de pago, programa
    DatePicker, // Para seleccionar período
    Input,     // Para método de pago, referencia, observaciones
    InputNumber // Para monto
} from 'antd';
import {
    FaTrashAlt,
    FaPlus,        // Para agregar nuevo pago
    FaDownload,    // Para descargar recibo
    FaMoneyCheckAlt // Para marcar como pagado/pagar
} from 'react-icons/fa';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs'; // Asegúrate de tener dayjs instalado: npm install dayjs

const { Title, Text } = Typography;
const { Option } = Select;

// URL base de tu backend (¡ajusta si estás en desarrollo local!)
const BASE_URL = "https://back.app.validaciondebachillerato.com.co/api"; // O 'http://localhost:3000/api' para desarrollo

const StudentPayments = () => { // Renombrado de Facturas a StudentPayments
    const { id: studentId } = useParams(); // Obtener el ID del estudiante de la URL
    const [payments, setPayments] = useState([]); // Ahora son `payments`
    const [student, setStudent] = useState(null);
    const [totalPaid, setTotalPaid] = useState(0); // Ahora es `totalPaid`
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

    const formatDateToMonthAndYear = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        return dayjs(dateString).format('MMMM [de] YYYY');
    }, []);

    // --- FETCH DATA FUNCTIONS ---
    // Unificada para cargar todos los datos relevantes
    const loadAllStudentPaymentData = useCallback(async () => {
        setLoading(true);
        try {
            // Cargar datos del estudiante
            const { data: studentData } = await axios.get(`${BASE_URL}/students/${studentId}`);
            setStudent(studentData);

            // Cargar tipos de pago (ej. Mensualidad, Matrícula)
            const { data: typesData } = await axios.get(`${BASE_URL}/types_pago`);
            setPaymentTypes(typesData);

            // Cargar programas asociados al estudiante (para el select de mensualidades)
            const { data: programsData } = await axios.get(`${BASE_URL}/students/${studentId}/program-info`);
            setStudentPrograms(programsData);

            // Cargar el historial de pagos del estudiante
            const { data: paymentsData } = await axios.get(`${BASE_URL}/payments/student/${studentId}`);
            setPayments(paymentsData);

            // Cargar el total pagado por el estudiante
            const { data: totalPaidData } = await axios.get(`${BASE_URL}/payments/student/${studentId}/total-paid`);
            setTotalPaid(parseFloat(totalPaidData.total_pagado || 0));

        } catch (err) {
            console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al cargar los datos de pagos:`, err.response?.data || err.message);
            message.error('Error al cargar la información de pagos del estudiante.');
            setStudent(null);
            setPayments([]);
            setTotalPaid(0);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    // --- EFFECT HOOKS ---
    useEffect(() => {
        loadAllStudentPaymentData();
    }, [studentId, loadAllStudentPaymentData]); // 'loadAllStudentPaymentData' es una dependencia para useCallback

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

            await axios.post(`${BASE_URL}/payments`, {
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

    // Manejar el botón "Marcar como Pagado"
    const handleMarkAsPaid = async (paymentId) => {
        Modal.confirm({
            title: '¿Desea marcar este pago como Pagado?',
            content: 'Esta acción actualizará el estado del pago y lo incluirá en el total pagado.',
            okText: 'Sí, marcar como pagado',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await axios.patch(`${BASE_URL}/payments/${paymentId}/status`, { estado: 'Pagado' });
                    message.success('Pago marcado como Pagado exitosamente.');
                    await loadAllStudentPaymentData(); // Recargar todos los datos
                } catch (error) {
                    console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al marcar pago como pagado:`, error.response?.data || error.message);
                    message.error('Error al marcar pago como pagado: ' + (error.response?.data?.error || "Verifica la consola."));
                }
            },
        });
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
                    await axios.delete(`${BASE_URL}/payments/${paymentId}`);
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
        const receiptUrl = `${BASE_URL}/receipts/${paymentId}/download`; // Necesitarás implementar esta ruta en tu backend
        window.open(receiptUrl, '_blank');
        message.info("Generando recibo. Si la descarga no inicia, verifique las ventanas emergentes.");
    };

    // --- TABLE COLUMNS ---
    const columns = [
        {
            title: 'Tipo de Pago',
            dataIndex: 'tipo_pago_nombre',
            key: 'tipo_pago_nombre',
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Período',
            dataIndex: 'periodo_pagado',
            key: 'periodo_pagado',
            render: (text) => text ? formatDateToMonthAndYear(text + '-01') : 'N/A', // Asume que '2025-07' es el formato y añade '-01' para dayjs
        },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            render: (text) => formatCurrency(text),
        },
        {
            title: 'Fecha Pago',
            dataIndex: 'fecha_pago',
            key: 'fecha_pago',
            render: (text) => dayjs(text).format('DD/MM/YYYY'),
        },
        {
            title: 'Método',
            dataIndex: 'metodo_pago',
            key: 'metodo_pago',
        },
        {
            title: 'Referencia',
            dataIndex: 'referencia_transaccion',
            key: 'referencia_transaccion',
            render: (text) => text || 'N/A',
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            render: (estado) => (
                <Tag
                    color={estado === 'Pagado' ? 'green' : estado === 'Pendiente' ? 'orange' : 'red'}
                    icon={estado === 'Pagado' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                >
                    {estado}
                </Tag>
            ),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_, record) => (
                <Space size="small">
                    {record.estado !== 'Pagado' ? (
                        <Button
                            type="primary"
                            icon={<FaMoneyCheckAlt />}
                            onClick={() => handleMarkAsPaid(record.id)}
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        >
                            Pagar
                        </Button>
                    ) : (
                        <Button disabled>Pagado</Button>
                    )}
                    <Button
                        icon={<FaDownload />}
                        onClick={() => handleDownloadReceipt(record.id)}
                        size="small"
                        disabled={record.estado !== 'Pagado'} // Solo descargar si está pagado
                    >
                        Recibo
                    </Button>
                    <Button
                        icon={<FaTrashAlt />}
                        onClick={() => handleDeletePayment(record.id)}
                        danger
                        size="small"
                    />
                </Space>
            ),
        },
    ];

    // --- Render Component ---
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" tip="Cargando información de pagos..." />
            </div>
        );
    }

    // Si no se pudo cargar el estudiante, mostrar un mensaje de error
    if (!student) {
        return (
            <div className="text-center p-12 bg-white rounded-lg shadow-md m-8">
                <Title level={4} type="danger">Error al cargar el estudiante.</Title>
                <Text>No se encontraron datos para el estudiante con ID: {studentId}.</Text>
                <Button onClick={loadAllStudentPaymentData} type="primary" className="mt-4">Reintentar Carga</Button>
            </div>
        );
    }

    return (
        <div className="mx-auto mt-8 p-4 bg-gray-100 min-h-screen">
            <Title level={3} className="text-gray-800 mb-6">
                Pagos de {student.nombre} {student.apellido || ''}
            </Title>
            <Text className="text-gray-600 mb-4 block">
                Coordinador: {student.coordinador_nombre || 'No especificado'}
            </Text>

            {/* Información de Matrícula (integrada en el flujo de pagos) */}
            <Card
                title="Estado de Matrícula"
                style={{
                    marginBottom: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
            >
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={8}>
                        <Text strong>Valor de Matrícula (referencia):</Text>
                        <div style={{ marginTop: '8px' }}>
                            <Text>{formatCurrency(student.matricula || 0)}</Text>
                        </div>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Text strong>Estado de Matrícula:</Text>
                        <div style={{ marginTop: '8px' }}>
                            <Tag
                                color={student.estado_matricula ? 'green' : 'red'}
                                icon={student.estado_matricula ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                style={{ fontSize: '16px', padding: '4px 8px' }}
                            >
                                {student.estado_matricula ? 'Pagada' : 'Pendiente'}
                            </Tag>
                        </div>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Text strong>Acción Rápida:</Text>
                        <div style={{ marginTop: '8px' }}>
                            {!student.estado_matricula && (
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        setIsModalVisible(true);
                                        form.resetFields();
                                        // Pre-seleccionar tipo de pago 'Matrícula' y su monto
                                        setSelectedPaymentType('Matrícula');
                                        form.setFieldsValue({
                                            tipo_pago_nombre: 'Matrícula',
                                            monto: parseFloat(student.matricula || 0)
                                        });
                                    }}
                                >
                                    Pagar Matrícula (abrir modal)
                                </Button>
                            )}
                            {student.estado_matricula && <Button disabled>Matrícula Pagada</Button>}
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Botón para Registrar Nuevo Pago (principal) */}
            <div className="flex justify-end mb-4">
                <Button
                    type="primary"
                    icon={<FaPlus />}
                    onClick={() => {
                        setIsModalVisible(true);
                        form.resetFields();
                        setSelectedPaymentType(null); // Resetear tipo de pago en el modal
                        setMontoEsperadoMensualidad(null); // Resetear monto esperado
                    }}
                >
                    Registrar Nuevo Pago
                </Button>
            </div>

            {/* Tabla de Pagos */}
            <Card
                title="Historial de Pagos del Estudiante"
                style={{
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
            >
                <Table
                    columns={columns}
                    dataSource={payments}
                    rowKey="id"
                    pagination={{ pageSize: 10 }} // Paginación por defecto
                    loading={loading} // Mostrar loading en la tabla también
                    locale={{ emptyText: 'No hay pagos registrados para este estudiante.' }}
                    style={{ background: '#fff', borderRadius: '8px' }}
                />
            </Card>

            {/* Total Pagado */}
            <div className="text-right p-4 mt-8 bg-white shadow sm:rounded-lg">
                <Title level={4} className="text-gray-800">
                    Total de Pagos Registrados: {formatCurrency(totalPaid)}{" "}
                </Title>
                <Text className="text-sm text-gray-500 mt-1 block">
                    (Este total incluye todos los pagos marcados como 'Pagado'.)
                </Text>
            </div>

            {/* Modal para Registrar Nuevo Pago */}
            <Modal
                title="Registrar Nuevo Pago"
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields(); // Asegurarse de limpiar al cerrar
                    setSelectedPaymentType(null); // Resetear para próxima apertura
                    setMontoEsperadoMensualidad(null); // Resetear
                }}
                footer={null} // El formulario de Ant Design tiene su propio botón de submit
            >
                <Form form={form} layout="vertical" onFinish={handleCreatePayment}>
                    <Form.Item
                        name="tipo_pago_nombre"
                        label="Tipo de Pago"
                        rules={[{ required: true, message: "Seleccione el tipo de pago" }]}
                    >
                        <Select
                            placeholder="Seleccione un tipo de pago"
                            onChange={(value) => {
                                setSelectedPaymentType(value);
                                form.setFieldsValue({ monto: null, periodo_pagado: null, program_id: null });
                            }}
                            // Si `selectedPaymentType` tiene un valor inicial, asegura que se muestre
                            value={selectedPaymentType}
                        >
                            {paymentTypes.map((type) => (
                                <Option key={type.id} value={type.nombre}>
                                    {type.nombre}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {selectedPaymentType === 'Mensualidad' && (
                        <Form.Item
                            name="program_id"
                            label="Programa"
                            rules={[{ required: true, message: "Seleccione el programa" }]}
                        >
                            <Select
                                placeholder="Seleccione el programa para la mensualidad"
                                onChange={(value) => {
                                    const selectedProgram = studentPrograms.find(p => p.programa_id === value);
                                    if (selectedProgram) {
                                        const monto = parseFloat(selectedProgram.costo_mensual_esperado);
                                        setMontoEsperadoMensualidad(monto);
                                        form.setFieldsValue({ monto: monto });
                                    } else {
                                        setMontoEsperadoMensualidad(null);
                                        form.setFieldsValue({ monto: null });
                                    }
                                }}
                            >
                                {studentPrograms.map((program) => (
                                    <Option key={program.programa_id} value={program.programa_id}>
                                        {program.programa_nombre} ({formatCurrency(program.costo_mensual_esperado)})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {selectedPaymentType === 'Mensualidad' && montoEsperadoMensualidad !== null && (
                         <Text type="secondary" className="block mb-4">Monto esperado para este programa: <strong>{formatCurrency(montoEsperadoMensualidad)}</strong></Text>
                    )}

                    {selectedPaymentType === 'Mensualidad' && (
                        <Form.Item
                            name="periodo_pagado"
                            label="Período Pagado (Mes y Año)"
                            rules={[{ required: true, message: "Seleccione el período" }]}
                        >
                            <DatePicker picker="month" format="YYYY-MM" style={{ width: '100%' }} />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="monto"
                        label="Monto Pagado"
                        rules={[{ required: true, message: "Ingrese el monto" }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            min={0}
                        />
                    </Form.Item>

                    <Form.Item
                        name="metodo_pago"
                        label="Método de Pago"
                        rules={[{ required: true, message: "Ingrese el método de pago" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item name="referencia_transaccion" label="Referencia de Transacción">
                        <Input />
                    </Form.Item>

                    <Form.Item name="observaciones" label="Observaciones">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="w-full">
                            Registrar Pago
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentPayments;