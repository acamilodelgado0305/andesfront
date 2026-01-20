import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  message,
  Typography,
  Spin,
  Form,
  Select,
  Input,
  InputNumber,
  Tag,
  Card,
  Progress,
  Alert,
  Divider
} from "antd";
import {
  FaPlus,
  FaDownload,
  FaTrashAlt,
  FaMoneyBillWave,
  FaWallet,
  FaUniversity
} from "react-icons/fa";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

// SERVICIOS
import { getStudentById } from "../../services/student/studentService";
import {
  getPaymentTypes,
  getStudentProgramInfo,
  getPaymentsByStudent,
  createPayment,
  deletePayment,
} from "../../services/payment/paymentService";

const { Title, Text } = Typography;
const { Option } = Select;

// URLs de entorno
const API_BACKEND = import.meta.env.VITE_API_BACKEND;
const API_BASE = import.meta.env.VITE_API || `${API_BACKEND}/api`;

const StudentPayments = () => {
  const { id: studentId } = useParams();

  // ESTADOS DE DATOS
  const [student, setStudent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);

  // ESTADO FINANCIERO (Cartera)
  const [financialData, setFinancialData] = useState([]);

  // ESTADOS UI
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // ESTADOS PARA LOGICA DE PAGO
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [currentDebt, setCurrentDebt] = useState(null);

  // --- UTILIDADES ---
  const formatCurrency = useCallback((value) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    return numericValue.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, []);

  // --- CARGA DE DATOS ---
  const loadAllStudentPaymentData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [studentData, typesData, programInfoData, paymentsData] =
        await Promise.all([
          getStudentById(studentId),
          getPaymentTypes(),
          getStudentProgramInfo(studentId), // Trae la info calculada de deuda
          getPaymentsByStudent(studentId),
        ]);

      setStudent(studentData);
      setPaymentTypes(Array.isArray(typesData) ? typesData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      // Manejo seguro de la nueva estructura financiera
      // El backend devuelve { student_id:..., programas_financiero: [...] }
      const programsFinanciero = programInfoData?.programas_financiero || [];
      setFinancialData(programsFinanciero);

    } catch (err) {
      console.error("Error loading data:", err);
      // No mostramos error invasivo si falla algo menor, pero logueamos
      message.error("Error al cargar la información financiera.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAllStudentPaymentData();
  }, [loadAllStudentPaymentData]);

  // --- LÓGICA DEL MODAL (CALCULAR DEUDA AL SELECCIONAR PROGRAMA) ---
  useEffect(() => {
    if (selectedProgramId && financialData.length > 0) {
      const prog = financialData.find((p) => p.programa_id === selectedProgramId);
      if (prog) {
        const deuda = parseFloat(prog.saldo_pendiente);
        // Si hay deuda positiva, la guardamos, si hay saldo a favor (negativo), mostramos 0
        setCurrentDebt(deuda);

        // Opcional: Sugerir el monto a pagar automáticamente
        /* if (deuda > 0) {
             form.setFieldsValue({ monto: deuda });
        }
        */
      }
    } else {
      setCurrentDebt(null);
    }
  }, [selectedProgramId, financialData, form]);

  // --- CREAR PAGO (ABONO) ---
  const handleCreatePayment = async (values) => {
    try {
      await createPayment({
        student_id: parseInt(studentId, 10),
        tipo_pago_nombre: values.tipo_pago_nombre,
        monto: parseFloat(values.monto),
        metodo_pago: values.metodo_pago,
        referencia_transaccion: values.referencia_transaccion || null,
        observaciones: values.observaciones || null,
        program_id: values.program_id || null, // Importante: Asocia el pago a la deuda del programa
        // periodo_pagado: null // Ya no es obligatorio
      });

      message.success("Pago registrado exitosamente.");
      setIsModalVisible(false);
      form.resetFields();
      setSelectedProgramId(null);
      setCurrentDebt(null);

      // Recargar para ver las barras de progreso actualizadas
      await loadAllStudentPaymentData();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      message.error(
        "Error al registrar pago: " +
        (error.response?.data?.error || "Verifica los datos.")
      );
    }
  };

  // --- ELIMINAR PAGO ---
  const handleDeletePayment = async (paymentId) => {
    Modal.confirm({
      title: "¿Eliminar este pago?",
      content: "Al eliminarlo, la deuda del estudiante aumentará nuevamente.",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okType: "danger",
      onOk: async () => {
        try {
          await deletePayment(paymentId);
          message.success("Pago eliminado.");
          await loadAllStudentPaymentData();
        } catch (error) {
          message.error("Error al eliminar el pago.");
        }
      },
    });
  };

  // --- DESCARGAR RECIBO ---
  const handleDownloadReceipt = (paymentId) => {
    const receiptUrl = `${API_BASE}/receipts/${paymentId}/download`;
    window.open(receiptUrl, "_blank");
  };

  // --- COLUMNAS DE LA TABLA ---
  const columns = [
    {
      title: "Concepto",
      dataIndex: "tipo_pago_nombre",
      key: "tipo_pago_nombre",
      render: (text) => <span className="font-bold text-slate-700">{text}</span>,
    },
    {
      title: "Programa / Destino",
      key: "programa",
      render: (_, record) => (
        <Text type="secondary" className="text-xs">
          {/* Intentamos mostrar el nombre del programa si viene en el registro, o buscamos en financialData */}
          {record.programa_nombre ||
            (financialData.find(p => p.programa_id === record.program_id)?.programa_nombre) ||
            "Pago General"}
        </Text>
      ),
    },
    {
      title: "Monto",
      dataIndex: "monto",
      key: "monto",
      render: (text) => <span className="text-slate-800 font-medium">{formatCurrency(text)}</span>,
    },
    {
      title: "Fecha",
      dataIndex: "fecha_pago",
      key: "fecha_pago",
      render: (text) => (text ? dayjs(text).format("DD/MM/YYYY") : "N/A"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado) => {
        const color = estado === "Pagado" ? "green" : estado === "Pendiente" ? "orange" : "red";
        const icon = estado === "Pagado" ? <CheckCircleOutlined /> : <ClockCircleOutlined />;
        return <Tag color={color} icon={icon}>{estado}</Tag>;
      },
    },
    {
      title: "",
      key: "acciones",
      align: "right",
      render: (_, record) => (
        <div className="flex justify-end gap-2">
          {record.estado === "Pagado" && (
            <Button type="text" size="small" icon={<FaDownload />} onClick={() => handleDownloadReceipt(record.id)}>
              Recibo
            </Button>
          )}
          <Button type="text" danger size="small" icon={<FaTrashAlt />} onClick={() => handleDeletePayment(record.id)} />
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
  }

  if (!student) {
    return <div className="text-center p-10">Estudiante no encontrado.</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6">

      {/* --- ENCABEZADO --- */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Text className="text-slate-500 uppercase tracking-wide text-xs font-bold">Gestión de Cartera</Text>
          <Title level={3} className="!mt-0 !mb-1">
            {student.nombre} {student.apellido}
          </Title>
          <div className="flex gap-4 text-sm text-slate-600">
            <span><span className="font-semibold">Coordinador:</span> {student.coordinador_nombre || "N/A"}</span>
            <span><span className="font-semibold">Estado Matrícula:</span>
              <Tag className="ml-2" color={student.estado_matricula ? "green" : "volcano"}>
                {student.estado_matricula ? "ACTIVA" : "PENDIENTE"}
              </Tag>
            </span>
          </div>
        </div>
        <Button type="primary" size="large" icon={<FaPlus />} onClick={() => setIsModalVisible(true)}>
          Registrar Abono
        </Button>
      </header>

      {/* --- DASHBOARD DE ESTADO DE CUENTA (CARDS POR PROGRAMA) --- */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <FaUniversity className="text-blue-600" /> Estado de Cuenta por Programa
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {financialData.length > 0 ? (
            financialData.map((prog) => {
              const porcentaje = prog.monto_total > 0
                ? ((prog.total_abonado / prog.monto_total) * 100).toFixed(1)
                : 0;

              const isFullyPaid = parseFloat(prog.saldo_pendiente) <= 0;

              return (
                <Card key={prog.programa_id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-base leading-tight w-3/4">
                      {prog.programa_nombre}
                    </h4>
                    {isFullyPaid && <Tag color="green">Paz y Salvo</Tag>}
                  </div>

                  <Divider className="my-3" />

                  <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                    <div className="text-slate-500">Costo Total:</div>
                    <div className="text-right font-medium">{formatCurrency(prog.monto_total)}</div>

                    <div className="text-slate-500">Abonado:</div>
                    <div className="text-right font-medium text-green-600">{formatCurrency(prog.total_abonado)}</div>

                    <div className="text-slate-500 font-bold">Pendiente:</div>
                    <div className={`text-right font-bold ${isFullyPaid ? 'text-slate-400' : 'text-red-500'}`}>
                      {formatCurrency(prog.saldo_pendiente)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress
                      percent={parseFloat(porcentaje)}
                      size="small"
                      status={isFullyPaid ? "success" : "active"}
                      strokeColor={isFullyPaid ? "#52c41a" : "#1890ff"}
                    />
                  </div>
                </Card>
              );
            })
          ) : (
            <Alert message="Este estudiante no tiene programas financieros asociados." type="warning" showIcon className="col-span-3" />
          )}
        </div>
      </div>

      {/* --- TABLA HISTORIAL --- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FaMoneyBillWave className="text-slate-500" /> Historial de Transacciones
          </h3>
          <div className="text-slate-500 text-sm">
            Total Abonado: <span className="font-bold text-slate-800">
              {formatCurrency(payments.filter(p => p.estado === 'Pagado').reduce((acc, curr) => acc + parseFloat(curr.monto), 0))}
            </span>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "No hay pagos registrados." }}
        />
      </div>

      {/* --- MODAL REGISTRO --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-blue-700">
            <FaWallet /> Registrar Nuevo Abono
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setSelectedProgramId(null);
          setCurrentDebt(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePayment} initialValues={{ metodo_pago: "Efectivo" }}>

          {/* 1. TIPO DE PAGO */}
          <Form.Item name="tipo_pago_nombre" label="Concepto / Tipo de Pago" rules={[{ required: true, message: 'Requerido' }]}>
            <Select placeholder="Seleccione concepto">
              {paymentTypes.map((type) => (
                <Option key={type.id} value={type.nombre}>{type.nombre}</Option>
              ))}
            </Select>
          </Form.Item>

          {/* 2. SELECCIÓN DE PROGRAMA (Obligatorio para calcular deuda) */}
          <div className="bg-blue-50 p-3 rounded-md mb-4 border border-blue-100">
            <Form.Item
              name="program_id"
              label="¿A qué programa desea abonar?"
              rules={[{ required: true, message: 'Seleccione un programa' }]}
              className="mb-0"
            >
              <Select
                placeholder="Seleccione el programa..."
                onChange={(val) => setSelectedProgramId(val)}
              >
                {financialData.map(p => (
                  <Option key={p.programa_id} value={p.programa_id}>
                    {p.programa_nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* INFORMACIÓN DE DEUDA EN TIEMPO REAL */}
            {selectedProgramId && currentDebt !== null && (
              <div className="mt-3 flex justify-between items-center text-sm">
                <span className="text-slate-600">Saldo pendiente actual:</span>
                <span className={`font-bold text-lg ${currentDebt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(currentDebt)}
                </span>
              </div>
            )}
          </div>

          {/* 3. MONTO */}
          <Form.Item name="monto" label="Monto a Abonar" rules={[{ required: true, message: 'Ingrese el monto' }]}>
            <InputNumber
              className="w-full"
              prefix="$"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              size="large"
            />
          </Form.Item>

          {/* 4. MÉTODO Y DETALLES */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="metodo_pago" label="Método de Pago" rules={[{ required: true }]}>
              <Select>
                <Option value="Efectivo">Efectivo</Option>
                <Option value="Transferencia">Transferencia</Option>
                <Option value="Tarjeta">Tarjeta</Option>
                <Option value="Nequi">Nequi</Option>
                <Option value="Daviplata">Daviplata</Option>
              </Select>
            </Form.Item>

            <Form.Item name="referencia_transaccion" label="Referencia (Opcional)">
              <Input placeholder="# Recibo / Ref" />
            </Form.Item>
          </div>

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} placeholder="Notas adicionales..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" className="mt-2 bg-blue-600 hover:bg-blue-500">
            Registrar Abono
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentPayments;