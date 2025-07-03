// src/components/Payments.js (o Pagos.js)
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
    Table,
    Input,
    Button,
    Modal,
    message,
    Form,
    Select,
    DatePicker,
    InputNumber,
    Spin,
    Tag,
    Space,
    Typography,
} from "antd";
import {
    FaTrashAlt,
    FaPlus,
    FaDownload,
    FaFilter,
    FaSearch,
} from "react-icons/fa";
import axios from "axios";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

// URL base de tu backend
const BASE_URL = "http://localhost:3002/api"; // O 'http://localhost:3000/api' en desarrollo

const Payments = () => {
    const { id: studentId } = useParams();
    const [payments, setPayments] = useState([]);
    const [student, setStudent] = useState(null);
    const [totalPaid, setTotalPaid] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [studentPrograms, setStudentPrograms] = useState([]);
    const [selectedPaymentType, setSelectedPaymentType] = useState(null);
    const [montoEsperadoMensualidad, setMontoEsperadoMensualidad] = useState(null);

    // --- UTILITIES ---
    const formatDateToMonth = (dateString) => {
        if (!dateString) return "N/A";
        const date = dayjs(dateString);
        return date.format("MMMM [de] YYYY"); // Formato "Julio de 2025"
    };

    const formatCurrency = (value) => {
        const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
        return numericValue.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    // --- FETCH DATA FUNCTIONS ---
    const fetchStudentData = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/students/${studentId}`);
            setStudent(data);
        } catch (err) {
            console.error("Error fetching student data:", err);
            message.error("Error al cargar los datos del estudiante.");
        }
    };

    const fetchPaymentTypes = async () => {
        try {
            // Asegúrate de que esta ruta exista en tu backend y devuelva los nombres y IDs de los tipos de pago
            // (e.g., { id: 1, nombre: 'Mensualidad' })
            const { data } = await axios.get(`${BASE_URL}/types_pago`);
            setPaymentTypes(data);
        } catch (err) {
            console.error("Error fetching payment types:", err);
            message.error("Error al cargar los tipos de pago.");
        }
    };

    const fetchStudentPrograms = async (sId) => {
        try {
            // Esta ruta devuelve un array de programas a los que el estudiante está inscrito
            const { data } = await axios.get(`${BASE_URL}/students/${sId}/program-info`);
            setStudentPrograms(data);
        } catch (err) {
            console.error("Error fetching student programs:", err);
            message.error("Error al cargar los programas asociados al estudiante.");
        }
    };

    const fetchPaymentsByStudentId = async (sId) => {
        try {
            // Esta ruta devuelve todos los pagos del estudiante desde la tabla `pagos`
            const { data } = await axios.get(`${BASE_URL}/payments/student/${sId}`);
            setPayments(data);
        } catch (err) {
            console.error("Error fetching payments:", err);
            message.error("Error al cargar el historial de pagos del estudiante.");
        }
    };

    const fetchTotalPaid = async (sId) => {
        try {
            // Esta ruta devuelve la suma de todos los pagos con estado 'Pagado'
            const { data } = await axios.get(`${BASE_URL}/payments/student/${sId}/total-paid`);
            setTotalPaid(parseFloat(data.total_pagado || 0));
        } catch (err) {
            console.error("Error fetching total paid:", err);
            message.error("Error al cargar el total de pagos del estudiante.");
        }
    };

    // --- EFFECT HOOKS ---
    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            await Promise.all([
                fetchStudentData(),
                fetchPaymentTypes(),
                fetchStudentPrograms(studentId),
                fetchPaymentsByStudentId(studentId),
                fetchTotalPaid(studentId),
            ]);
            setLoading(false);
        };
        loadAllData();
    }, [studentId]);

    // Lógica para actualizar el monto esperado en el formulario de pago cuando se cambia el tipo o programa
    useEffect(() => {
        if (selectedPaymentType === 'Mensualidad' && form.getFieldValue('program_id')) {
            const selectedProgram = studentPrograms.find(
                (p) => p.programa_id === form.getFieldValue('program_id')
            );
            if (selectedProgram) {
                const monto = parseFloat(selectedProgram.costo_mensual_esperado);
                setMontoEsperadoMensualidad(monto);
                form.setFieldsValue({ monto: monto }); // Rellenar con el monto esperado
            } else {
                setMontoEsperadoMensualidad(null);
                form.setFieldsValue({ monto: null });
            }
        } else {
            setMontoEsperadoMensualidad(null);
            // Si el tipo de pago cambia y no es mensualidad, el campo monto no se prerrellena
            // La validación `required` se encarga de que el usuario lo ingrese.
        }
    }, [selectedPaymentType, form, studentPrograms]);

    // --- EVENT HANDLERS ---
    const handleCreatePayment = async (values) => {
        try {
            // Ajustar el `periodo_pagado` si es una mensualidad
            const periodo = values.tipo_pago_nombre === 'Mensualidad' && values.periodo_pagado
                ? dayjs(values.periodo_pagado).format("YYYY-MM")
                : null;

            // Ajustar `program_id` si no es mensualidad para no enviarlo
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
                program_id: programIdToSend,
            });
            message.success("Pago registrado exitosamente.");
            setIsModalVisible(false);
            form.resetFields();

            // Refrescar todos los datos relevantes
            await Promise.all([
                fetchPaymentsByStudentId(studentId),
                fetchTotalPaid(studentId),
                fetchStudentData(), // Para actualizar `estado_matricula` si aplica
            ]);
        } catch (error) {
            console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al crear pago:`, error.response?.data || error.message);
            message.error("Error al registrar pago: " + (error.response?.data?.error || "Verifica la consola para más detalles."));
        }
    };

    const handleDeletePayment = async (paymentId) => {
        Modal.confirm({
            title: "¿Está seguro de que desea eliminar este pago?",
            content: "Esta acción no se puede deshacer.",
            okText: "Sí, eliminar",
            cancelText: "Cancelar",
            onOk: async () => {
                try {
                    await axios.delete(`${BASE_URL}/payments/${paymentId}`);
                    message.success("Pago eliminado con éxito.");
                    await Promise.all([
                        fetchPaymentsByStudentId(studentId),
                        fetchTotalPaid(studentId),
                        fetchStudentData(), // Para recalcular total y estado matrícula
                    ]);
                } catch (error) {
                    console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al eliminar pago:`, error.response?.data || error.message);
                    message.error("Error al eliminar pago: " + (error.response?.data?.error || "Verifica la consola."));
                }
            },
        });
    };

    const handleMarkAsPaid = async (paymentId) => {
        Modal.confirm({
            title: "¿Desea marcar este pago como Pagado?",
            content: "Esto actualizará el estado del pago y lo incluirá en el total pagado.",
            okText: "Sí, marcar como pagado",
            cancelText: "Cancelar",
            onOk: async () => {
                try {
                    await axios.patch(`${BASE_URL}/payments/${paymentId}/status`, { estado: 'Pagado' });
                    message.success("Pago marcado como Pagado exitosamente.");
                    await Promise.all([
                        fetchPaymentsByStudentId(studentId),
                        fetchTotalPaid(studentId),
                        fetchStudentData(),
                    ]);
                } catch (error) {
                    console.error(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')}] Error al marcar pago como pagado:`, error.response?.data || error.message);
                    message.error("Error al marcar pago como pagado: " + (error.response?.data?.error || "Verifica la consola."));
                }
            },
        });
    };

    // Función para emitir y descargar un recibo
    const handleDownloadReceipt = (paymentId) => {
        const receiptUrl = `${BASE_URL}/receipts/${paymentId}/download`; // Necesitarás implementar esta ruta
        window.open(receiptUrl, '_blank');
        message.info("Generando recibo. Si la descarga no inicia, verifique las ventanas emergentes.");
    };

    // --- TABLE COLUMNS ---
    const columns = [
        {
            title: "Tipo de Pago",
            dataIndex: "tipo_pago_nombre",
            key: "tipo_pago_nombre",
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: "Período",
            dataIndex: "periodo_pagado",
            key: "periodo_pagado",
            render: (text) => text || "N/A", // '2025-07' o 'N/A'
        },
        {
            title: "Monto",
            dataIndex: "monto",
            key: "monto",
            render: (text) => formatCurrency(text),
        },
        {
            title: "Fecha Pago",
            dataIndex: "fecha_pago",
            key: "fecha_pago",
            render: (text) => dayjs(text).format("DD/MM/YYYY"),
        },
        {
            title: "Método",
            dataIndex: "metodo_pago",
            key: "metodo_pago",
        },
        {
            title: "Referencia",
            dataIndex: "referencia_transaccion",
            key: "referencia_transaccion",
            render: (text) => text || "N/A",
        },
        {
            title: "Estado",
            dataIndex: "estado",
            key: "estado",
            render: (text) => (
                <Tag color={text === "Pagado" ? "green" : text === "Pendiente" ? "orange" : "red"}>
                    {text}
                </Tag>
            ),
        },
        {
            title: "Acciones",
            key: "actions",
            render: (_, record) => (
                <Space size="middle">
                    {record.estado !== "Pagado" && (
                        <Button
                            onClick={() => handleMarkAsPaid(record.id)}
                            type="primary"
                            size="small"
                            className="bg-green-500 hover:bg-green-600 border-green-500"
                        >
                            Marcar como Pagado
                        </Button>
                    )}
                    <Button
                        icon={<FaDownload />}
                        onClick={() => handleDownloadReceipt(record.id)}
                        size="small"
                        disabled={record.estado !== "Pagado"}
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

    return (
        <div className="mx-auto mt-8 p-4 bg-gray-100 min-h-screen">
            <Title level={3} className="text-gray-800 mb-6">
                Pagos de {student ? `${student.nombre} ${student.apellido}` : ""}
            </Title>
            <Text className="text-gray-600 mb-4 block">
                Coordinador: {student ? student.coordinador_nombre : ""}
            </Text>

            {/* Sección de Matrícula (ahora como un pago más) */}
            {student && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8 p-6">
                    <Title level={4} className="text-gray-900 mb-4">
                        Estado de Matrícula
                    </Title>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Text strong className="text-sm font-medium text-gray-500">Valor de Matrícula (referencia):</Text>
                            <p className="mt-1 text-lg text-gray-900">{formatCurrency(student.matricula)}</p>
                        </div>
                        <div>
                            <Text strong className="text-sm font-medium text-gray-500">Estado de Matrícula:</Text>
                            <Tag color={student.estado_matricula ? "green" : "red"} className="mt-1 text-lg">
                                {student.estado_matricula ? "Pagada" : "Pendiente"}
                            </Tag>
                            {!student.estado_matricula && (
                                <Button
                                    type="default" // Cambiado a default para indicar que se usa el modal principal
                                    className="ml-4"
                                    onClick={() => {
                                        setIsModalVisible(true);
                                        form.resetFields();
                                        setSelectedPaymentType('Matrícula'); // Preseleccionar Matrícula
                                        form.setFieldsValue({ tipo_pago_nombre: 'Matrícula', monto: student.matricula }); // Y el monto
                                    }}
                                >
                                    Pagar Matrícula
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Botón para Registrar Nuevo Pago */}
            <div className="flex justify-end mb-4">
                <Button
                    type="primary"
                    icon={<FaPlus />}
                    onClick={() => {
                        setIsModalVisible(true);
                        form.resetFields();
                        setSelectedPaymentType(null);
                        setMontoEsperadoMensualidad(null);
                    }}
                >
                    Registrar Nuevo Pago
                </Button>
            </div>

            {/* Tabla de Pagos */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                <Table
                    dataSource={payments}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                    className="w-full"
                    locale={{ emptyText: "No hay pagos registrados." }}
                />
            </div>

            {/* Total Pagado */}
            <div className="text-right p-4 bg-white shadow sm:rounded-lg">
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
                onCancel={() => setIsModalVisible(false)}
                footer={null}
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
                                // Resetear campos condicionales al cambiar el tipo de pago
                                form.setFieldsValue({ monto: null, periodo_pagado: null, program_id: null });
                            }}
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
                         <p className="text-gray-600 mb-2">Monto esperado para este programa: <strong>{formatCurrency(montoEsperadoMensualidad)}</strong></p>
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

export default Payments;