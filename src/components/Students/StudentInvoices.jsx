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
  DatePicker,
  Input,
  InputNumber,
  Tag,
} from "antd";
import {
  FaPlus,
  FaDownload,
  FaTrashAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { getStudentById } from "../../services/student/studentService";
import {
  getPaymentTypes,
  getStudentProgramInfo,
  getPaymentsByStudent,
  createPayment,
  deletePayment,
} from "../../services/payment/paymentService"; // ajusta la ruta según tu estructura

const { Title, Text } = Typography;
const { Option } = Select;

// URLs de entorno
const API_BACKEND = import.meta.env.VITE_API_BACKEND; // p.ej. http://localhost:3002
const API_BASE =
  import.meta.env.VITE_API || `${API_BACKEND}/api`; // p.ej. http://localhost:3002/api

const StudentPayments = () => {
  const { id: studentId } = useParams();
  const [payments, setPayments] = useState([]);
  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [studentPrograms, setStudentPrograms] = useState([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [montoEsperadoMensualidad, setMontoEsperadoMensualidad] =
    useState(null);

  // --- UTILIDADES ---
  const formatCurrency = useCallback((value) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    return numericValue.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }, []);

  // Cargar estudiante + tipos de pago + programas + pagos
  // Dentro de StudentPayments.jsx

  const loadAllStudentPaymentData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [studentData, typesData, programsData, paymentsData] =
        await Promise.all([
          getStudentById(studentId),
          getPaymentTypes(),
          getStudentProgramInfo(studentId),
          getPaymentsByStudent(studentId),
        ]);

      setStudent(studentData);

      // --- CORRECCIÓN AQUÍ ---
      // Verificamos si programsData es un array directamente.
      // Si no, buscamos si viene dentro de una propiedad común como .data o .result
      // Si todo falla, forzamos un array vacío.
      const safePrograms = Array.isArray(programsData)
        ? programsData
        : (programsData?.data || programsData?.programs || []);

      setStudentPrograms(safePrograms);

      // Aplicamos la misma lógica para paymentTypes y paymentsData por seguridad
      const safeTypes = Array.isArray(typesData) ? typesData : (typesData?.data || []);
      setPaymentTypes(safeTypes);

      const safePayments = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.data || []);
      setPayments(safePayments);
      // -----------------------

    } catch (err) {
      console.error("Error loading data:", err);
      message.error("Error al cargar la información de pagos.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAllStudentPaymentData();
  }, [loadAllStudentPaymentData]);

  // Actualizar monto sugerido de mensualidad cuando cambia tipo/programa
  useEffect(() => {
    if (
      selectedPaymentType === "Mensualidad" &&
      form.getFieldValue("program_id")
    ) {
      const selectedProgram = studentPrograms.find(
        (p) => p.programa_id === form.getFieldValue("program_id")
      );
      if (selectedProgram) {
        const monto = parseFloat(selectedProgram.costo_mensual_esperado);
        setMontoEsperadoMensualidad(monto);
        form.setFieldsValue({ monto: monto });
      } else {
        setMontoEsperadoMensualidad(null);
        form.setFieldsValue({ monto: null });
      }
    } else {
      setMontoEsperadoMensualidad(null);
    }
  }, [selectedPaymentType, form, studentPrograms]);

  // Crear pago
  const handleCreatePayment = async (values) => {
    try {
      const isMensualidad = values.tipo_pago_nombre === "Mensualidad";

      const periodo =
        isMensualidad && values.periodo_pagado
          ? dayjs(values.periodo_pagado).format("YYYY-MM")
          : null;

      const programIdToSend =
        isMensualidad && values.program_id
          ? parseInt(values.program_id, 10)
          : null;

      await createPayment({
        student_id: parseInt(studentId, 10),
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
      setSelectedPaymentType(null);
      setMontoEsperadoMensualidad(null);

      await loadAllStudentPaymentData();
    } catch (error) {
      console.error(
        `[${dayjs().format("DD/MM/YYYY HH:mm:ss")}] Error al registrar pago:`,
        error.response?.data || error.message
      );
      message.error(
        "Error al registrar pago: " +
        (error.response?.data?.error ||
          "Verifica la consola para más detalles.")
      );
    }
  };

  // Eliminar pago
  const handleDeletePayment = async (paymentId) => {
    Modal.confirm({
      title: "¿Está seguro de que desea eliminar este pago?",
      content: "Esta acción no se puede deshacer.",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await deletePayment(paymentId);
          message.success("Pago eliminado con éxito.");
          await loadAllStudentPaymentData();
        } catch (error) {
          console.error(
            `[${dayjs().format(
              "DD/MM/YYYY HH:mm:ss"
            )}] Error al eliminar pago:`,
            error.response?.data || error.message
          );
          message.error(
            "Error al eliminar pago: " +
            (error.response?.data?.error || "Verifica la consola.")
          );
        }
      },
    });
  };

  // Descargar recibo (usa /api/...)
  const handleDownloadReceipt = (paymentId) => {
    const receiptUrl = `${API_BASE}/receipts/${paymentId}/download`;
    window.open(receiptUrl, "_blank");
    message.info(
      "Generando recibo. Si la descarga no inicia, verifique las ventanas emergentes."
    );
  };

  // Columnas tabla
  const columns = [
    {
      title: "Concepto",
      dataIndex: "tipo_pago_nombre",
      key: "tipo_pago_nombre",
      render: (text) => (
        <span className="font-semibold text-slate-700">{text}</span>
      ),
    },
    {
      title: "Período/Programa",
      key: "periodo_programa",
      render: (_, record) => (
        <Text type="secondary" className="text-xs">
          {record.tipo_pago_nombre === "Mensualidad"
            ? record.periodo_pagado
              ? dayjs(record.periodo_pagado + "-01").format("MMMM YYYY")
              : "N/A"
            : record.programa_nombre || "General"}
        </Text>
      ),
    },
    {
      title: "Monto",
      dataIndex: "monto",
      key: "monto",
      render: (text) => (
        <span className="text-slate-800">{formatCurrency(text)}</span>
      ),
    },
    {
      title: "Fecha de Pago",
      dataIndex: "fecha_pago",
      key: "fecha_pago",
      render: (text) => (text ? dayjs(text).format("DD/MM/YYYY") : "N/A"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado) => {
        const colors = {
          Pagado: "green",
          Pendiente: "orange",
          Vencido: "red",
        };
        const icons = {
          Pagado: <CheckCircleOutlined />,
          Pendiente: <ClockCircleOutlined />,
          Vencido: <ExclamationCircleOutlined />,
        };
        return (
          <Tag color={colors[estado]} icon={icons[estado]}>
            {estado}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "right",
      render: (_, record) => (
        <div className="flex justify-end gap-x-2">
          {record.estado === "Pagado" && (
            <Button
              type="text"
              size="small"
              icon={<FaDownload />}
              onClick={() => handleDownloadReceipt(record.id)}
            >
              Recibo
            </Button>
          )}
          <Button
            type="text"
            danger
            size="small"
            icon={<FaTrashAlt />}
            onClick={() => handleDeletePayment(record.id)}
          />
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center p-10">
        No se encontraron datos del estudiante.
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.estado === "Pagado")
    .reduce((sum, p) => sum + parseFloat(p.monto), 0);

  const avgMonthlyCost =
    studentPrograms.length > 0
      ? studentPrograms.reduce(
        (sum, p) => sum + parseFloat(p.costo_mensual_esperado),
        0
      ) / studentPrograms.length
      : 0;

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6">
      {/* ENCABEZADO */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Text className="text-slate-500">Gestión Financiera</Text>
          <Title level={3} className="!mt-0 !mb-1">
            Pagos de {student.nombre} {student.apellido}
          </Title>
          <Text>
            Coordinador Asignado:{" "}
            <span className="font-semibold">
              {student.coordinador_nombre || "N/A"}
            </span>
          </Text>
        </div>
        <Button
          type="primary"
          icon={<FaPlus />}
          onClick={() => setIsModalVisible(true)}
        >
          Registrar Nuevo Pago
        </Button>
      </header>

      {/* DASHBOARD FINANCIERO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 border border-slate-200 rounded-md">
          <Text className="text-slate-500">Valor Matrícula</Text>
          <p className="text-2xl font-semibold text-slate-800">
            {formatCurrency(student.matricula)}
          </p>
          <Tag color={student.estado_matricula ? "green" : "orange"}>
            {student.estado_matricula ? "Pagada" : "Pendiente"}
          </Tag>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-md">
          <Text className="text-slate-500">Costo Mensual Promedio</Text>
          <p className="text-2xl font-semibold text-slate-800">
            {formatCurrency(avgMonthlyCost)}
          </p>
          <Text className="text-xs text-slate-400">
            Basado en programas inscritos
          </Text>
        </div>
        <div className="bg-blue-500 text-white p-4 border border-blue-600 rounded-md">
          <Text className="text-blue-100">Total Pagado</Text>
          <p className="text-2xl font-semibold">
            {formatCurrency(totalPaid)}
          </p>
          <Text className="text-xs text-blue-200">
            Suma de todos los pagos confirmados
          </Text>
        </div>
      </div>

      {/* TABLA PAGOS */}
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
          locale={{
            emptyText: "Este estudiante aún no tiene pagos registrados.",
          }}
        />
      </div>

      {/* MODAL NUEVO PAGO */}
      <Modal
        title="Registrar Nuevo Pago"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setSelectedPaymentType(null);
          setMontoEsperadoMensualidad(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePayment}
          initialValues={{ metodo_pago: "Transferencia" }}
        >
          <Form.Item
            name="tipo_pago_nombre"
            label="Tipo de Pago"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Seleccione un tipo"
              onChange={(value) => setSelectedPaymentType(value)}
            >
              {paymentTypes.map((type) => (
                <Option key={type.id} value={type.nombre}>
                  {type.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedPaymentType === "Mensualidad" && (
            <>
              <Form.Item
                name="program_id"
                label="Programa"
                rules={[{ required: true }]}
              >
                <Select placeholder="Seleccione el programa">
                  {/* CORRECCIÓN: Agregar '?' antes de .map y validar que sea array */}
                  {Array.isArray(studentPrograms) && studentPrograms.map((p) => (
                    <Option key={p.programa_id} value={p.programa_id}>
                      {p.programa_nombre}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="periodo_pagado"
                label="Período Pagado"
                rules={[{ required: true }]}
              >
                <DatePicker picker="month" className="w-full" />
              </Form.Item>

              {montoEsperadoMensualidad != null && (
                <Text type="secondary">
                  Monto sugerido:{" "}
                  <strong>{formatCurrency(montoEsperadoMensualidad)}</strong>
                </Text>
              )}
            </>
          )}

          <Form.Item
            name="monto"
            label="Monto Pagado"
            rules={[{ required: true }]}
          >
            <InputNumber prefix="$ " className="w-full" />
          </Form.Item>

          <Form.Item
            name="metodo_pago"
            label="Método de Pago"
            rules={[{ required: true }]}
          >
            <Input placeholder="Transferencia, Efectivo, etc." />
          </Form.Item>

          <Form.Item
            name="referencia_transaccion"
            label="Referencia"
          >
            <Input />
          </Form.Item>

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              Registrar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentPayments;
