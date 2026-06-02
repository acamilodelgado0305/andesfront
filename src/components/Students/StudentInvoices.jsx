import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  message,
  Spin,
  Form,
  Select,
  Input,
  InputNumber,
  Tag,
  Alert,
  DatePicker,
  ConfigProvider
} from "antd";
import {
  FaPlus,
  FaDownload,
  FaTrashAlt,
  FaMoneyBillWave,
  FaWallet,
  FaUniversity,
  FaEdit
} from "react-icons/fa";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useCurrencyInput } from "../../hooks/useCurrency";
import { generatePaymentReportPDF } from "../Utilidades/generatePaymentReportPDF";

// SERVICIOS
import { getStudentById } from "../../services/student/studentService";
import {
  getPaymentTypes,
  getStudentProgramInfo,
  getPaymentsByStudent,
  createPayment,
  deletePayment,
  updateStudentProgramTotal,
  updatePayment,
} from "../../services/payment/paymentService";

const { Option } = Select;

const StudentPayments = ({ studentId: studentIdProp }) => {
  const { id: routeId } = useParams();
  const studentId = studentIdProp || routeId;
  const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser } = useCurrencyInput();

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

  // EDICIÓN DE PAGO
  const [editPaymentModal, setEditPaymentModal] = useState({ open: false, payment: null });
  const [editForm] = Form.useForm();
  const [savingPayment, setSavingPayment] = useState(false);

  // ESTADOS PARA LOGICA DE PAGO
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [currentDebt, setCurrentDebt] = useState(null);

  // ESTADOS PARA EDITAR EL TOTAL PERSONALIZADO
  const [editTotal, setEditTotal] = useState({ open: false, prog: null });
  const [editTotalValue, setEditTotalValue] = useState(null);
  const [savingTotal, setSavingTotal] = useState(false);

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

  // --- EDITAR TOTAL PERSONALIZADO ---
  const openEditTotal = (prog) => {
    setEditTotal({ open: true, prog });
    setEditTotalValue(parseFloat(prog.monto_total) || 0);
  };

  const closeEditTotal = () => {
    setEditTotal({ open: false, prog: null });
    setEditTotalValue(null);
  };

  const saveTotal = async (montoTotal) => {
    const prog = editTotal.prog;
    if (!prog) return;
    setSavingTotal(true);
    try {
      await updateStudentProgramTotal(studentId, prog.programa_id, montoTotal);
      message.success(
        montoTotal === null
          ? "Se restauró el total del programa."
          : "Total actualizado. Lo abonado no cambió."
      );
      closeEditTotal();
      await loadAllStudentPaymentData();
    } catch (error) {
      message.error(
        "No se pudo actualizar el total: " +
        (error.response?.data?.error || "intenta de nuevo.")
      );
    } finally {
      setSavingTotal(false);
    }
  };

  // --- EDITAR PAGO ---
  const openEditPayment = (payment) => {
    setEditPaymentModal({ open: true, payment });
    editForm.setFieldsValue({
      tipo_pago_nombre: payment.tipo_pago_nombre,
      program_id: payment.program_id ?? null,
      monto: parseFloat(payment.monto),
      metodo_pago: payment.metodo_pago,
      referencia_transaccion: payment.referencia_transaccion || "",
      observaciones: payment.observaciones || "",
      fecha_pago: payment.fecha_pago ? dayjs(payment.fecha_pago) : null,
    });
  };

  const closeEditPayment = () => {
    setEditPaymentModal({ open: false, payment: null });
    editForm.resetFields();
  };

  const handleUpdatePayment = async (values) => {
    const payment = editPaymentModal.payment;
    if (!payment) return;
    setSavingPayment(true);
    try {
      await updatePayment(payment.id, {
        tipo_pago_nombre: values.tipo_pago_nombre,
        program_id: values.program_id || null,
        monto: parseFloat(values.monto),
        metodo_pago: values.metodo_pago,
        referencia_transaccion: values.referencia_transaccion || null,
        observaciones: values.observaciones || null,
        fecha_pago: values.fecha_pago ? values.fecha_pago.format("YYYY-MM-DD") : payment.fecha_pago,
      });
      message.success("Pago actualizado.");
      closeEditPayment();
      await loadAllStudentPaymentData();
    } catch (error) {
      message.error(
        "No se pudo actualizar el pago: " +
        (error.response?.data?.error || "intenta de nuevo.")
      );
    } finally {
      setSavingPayment(false);
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

  // --- DESCARGAR EXTRACTO PDF ---
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const handleDownloadStatement = async () => {
    setGeneratingPdf(true);
    try {
      await generatePaymentReportPDF(student, payments, financialData);
    } catch (error) {
      console.error("Error al generar el extracto:", error);
      message.error("No se pudo generar el extracto en PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
  }

  if (!student) {
    return <div className="text-center p-10">Estudiante no encontrado.</div>;
  }

  // --- DATOS DEL EXTRACTO ---
  const businessName = student?.business?.name || "Institución Educativa";
  const businessLogoUrl = student?.business?.profilePictureUrl;
  const studentName = `${student.nombre || ""} ${student.apellido || ""}`.trim();
  const documento = student.numero_documento || "N/A";
  const coordinador = student.coordinador_nombre || student.coordinador?.nombre || "N/A";
  const emision = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const totalCosto = financialData.reduce((s, p) => s + parseFloat(p.monto_total || 0), 0);
  const totalAbonado = financialData.reduce((s, p) => s + parseFloat(p.total_abonado || 0), 0);
  const totalPendiente = financialData.reduce((s, p) => s + parseFloat(p.saldo_pendiente || 0), 0);

  // Movimientos estilo extracto: el saldo decreciente se calcula del más
  // antiguo al más reciente, pero se muestra del más reciente al más antiguo.
  let saldoRun = totalCosto;
  const movimientos = [...payments]
    .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago))
    .map((p) => {
      const abono = parseFloat(p.monto || 0);
      if (p.estado === "Pagado") saldoRun -= abono;
      return { ...p, _abono: abono, _saldo: saldoRun };
    })
    .reverse();

  // Columnas del resumen por programa
  const summaryColumns = [
    {
      title: "Programa",
      dataIndex: "programa_nombre",
      key: "programa_nombre",
      render: (t, r) => (
        <span className="flex items-center gap-2">
          {t || "N/A"}
          {r.monto_personalizado && (
            <Tag color="blue" className="!m-0 !text-[10px] !leading-4 !px-1">Personalizado</Tag>
          )}
        </span>
      ),
    },
    { title: "Costo Total", dataIndex: "monto_total", align: "right", render: (v) => formatCurrency(v) },
    { title: "Abonado", dataIndex: "total_abonado", align: "right", render: (v) => <span className="text-green-600">{formatCurrency(v)}</span> },
    { title: "Pendiente", dataIndex: "saldo_pendiente", align: "right", render: (v) => formatCurrency(v) },
    {
      title: "Estado",
      key: "estado",
      align: "center",
      render: (_, r) =>
        parseFloat(r.saldo_pendiente) <= 0
          ? <Tag color="green">Paz y salvo</Tag>
          : <Tag color="orange">Pendiente</Tag>,
    },
    {
      title: "",
      key: "acc",
      align: "center",
      render: (_, r) => <Button type="link" size="small" className="!p-0" onClick={() => openEditTotal(r)}>Editar</Button>,
    },
  ];

  // Columnas de movimientos
  const movimientoColumns = [
    { title: "Fecha", dataIndex: "fecha_pago", render: (t) => (t ? dayjs(t).format("DD/MM/YYYY") : "N/A") },
    { title: "Concepto", dataIndex: "tipo_pago_nombre", render: (t) => t || "Pago" },
    {
      title: "Programa",
      key: "programa",
      render: (_, r) =>
        r.programa_nombre ||
        financialData.find((p) => p.programa_id === r.program_id)?.programa_nombre ||
        "General",
    },
    { title: "Método", dataIndex: "metodo_pago", render: (t) => t || "—" },
    { title: "Referencia", dataIndex: "referencia_transaccion", render: (t) => t || "—" },
    {
      title: "Estado",
      dataIndex: "estado",
      align: "center",
      render: (estado) => {
        const color = estado === "Pagado" ? "green" : estado === "Pendiente" ? "orange" : "red";
        const icon = estado === "Pagado" ? <CheckCircleOutlined /> : <ClockCircleOutlined />;
        return <Tag color={color} icon={icon}>{estado}</Tag>;
      },
    },
    { title: "Abono", dataIndex: "_abono", align: "right", render: (v) => <span className="font-medium">{formatCurrency(v)}</span> },
    { title: "Saldo", dataIndex: "_saldo", align: "right", render: (v) => <span className="text-slate-500">{formatCurrency(v)}</span> },
    {
      title: "",
      key: "acciones",
      align: "right",
      render: (_, record) => (
        <div className="flex justify-end gap-1">
          <Button type="text" size="small" icon={<FaEdit />} onClick={() => openEditPayment(record)} />
          <Button type="text" danger size="small" icon={<FaTrashAlt />} onClick={() => handleDeletePayment(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div className="bg-slate-50 p-2 sm:p-4">

      {/* --- BARRA DE ACCIONES --- */}
      <header className="w-full flex flex-wrap justify-end items-center gap-2 mb-4">
        <Button
          size="large"
          icon={<FaDownload />}
          loading={generatingPdf}
          onClick={handleDownloadStatement}
        >
          Descargar Extracto
        </Button>
        <Button type="primary" size="large" icon={<FaPlus />} onClick={() => setIsModalVisible(true)}>
          Registrar Abono
        </Button>
      </header>

      {/* --- DOCUMENTO ESTILO EXTRACTO --- */}
      <ConfigProvider
        theme={{
          components: {
            Table: {
              headerBg: "#155153",
              headerColor: "#ffffff",
              headerSortActiveBg: "#0f3e40",
              borderColor: "#e2e8f0",
              cellFontSize: 13,
            },
          },
        }}
      >
        <div className="w-full bg-white rounded-lg shadow-md border border-slate-200 p-4 sm:p-8">

          {/* Encabezado del extracto */}
          <div
            className="flex items-center justify-between gap-4 pb-4 mb-6 border-b-2"
            style={{ borderColor: "#155153" }}
          >
            <div className="w-20 flex-shrink-0">
              {businessLogoUrl && (
                <img src={businessLogoUrl} alt="Logo" className="h-16 w-16 object-contain" />
              )}
            </div>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold m-0" style={{ color: "#155153" }}>{businessName}</h1>
              <p className="text-slate-500 m-0">Extracto de Pagos</p>
            </div>
            <div className="w-20 flex-shrink-0" />
          </div>

          {/* Información del estudiante */}
          <div className="mb-8">
            <h3 className="text-base font-bold mb-3" style={{ color: "#155153" }}>Información del Estudiante</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm text-slate-700">
              <div><span className="font-semibold">Estudiante:</span> {studentName}</div>
              <div><span className="font-semibold">Documento:</span> {documento}</div>
              <div><span className="font-semibold">Coordinador:</span> {coordinador}</div>
              <div><span className="font-semibold">Fecha de emisión:</span> {emision}</div>
            </div>
          </div>

          {/* Resumen de cuenta por programa */}
          <div className="mb-8">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "#155153" }}>
              <FaUniversity /> Estado de Cuenta por Programa
            </h3>
            {financialData.length > 0 ? (
              <Table
                columns={summaryColumns}
                dataSource={financialData}
                rowKey="programa_id"
                size="small"
                bordered
                pagination={false}
                scroll={{ x: "max-content" }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: "#dbeafe", fontWeight: 700 }}>
                      <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">{formatCurrency(totalCosto)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">{formatCurrency(totalAbonado)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">{formatCurrency(totalPendiente)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="center">
                        {totalPendiente <= 0 ? "Paz y salvo" : "Pendiente"}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            ) : (
              <Alert message="Este estudiante no tiene programas financieros asociados." type="warning" showIcon />
            )}
          </div>

          {/* Movimientos */}
          <div className="mb-6">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "#155153" }}>
              <FaMoneyBillWave /> Movimientos
            </h3>
            <Table
              columns={movimientoColumns}
              dataSource={movimientos}
              rowKey="id"
              size="small"
              bordered
              scroll={{ x: "max-content" }}
              pagination={movimientos.length > 12 ? { pageSize: 12 } : false}
              locale={{ emptyText: "No hay pagos registrados." }}
            />
          </div>

          {/* Totales del extracto */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 text-sm">
              <div className="flex justify-between py-1 border-t border-slate-200">
                <span className="text-slate-600">Total abonado:</span>
                <span className="font-bold text-green-600">{formatCurrency(totalAbonado)}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-200">
                <span className="text-slate-600">Saldo pendiente:</span>
                <span className={`font-bold ${totalPendiente <= 0 ? "text-slate-400" : "text-red-500"}`}>
                  {formatCurrency(totalPendiente)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ConfigProvider>

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
              addonAfter={currSuffix}
              formatter={currFormatter}
              parser={currParser}
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

      {/* --- MODAL EDITAR PAGO --- */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-blue-700">
            <FaEdit /> Editar Pago
          </div>
        }
        open={editPaymentModal.open}
        onCancel={closeEditPayment}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdatePayment}>
          <Form.Item name="tipo_pago_nombre" label="Concepto / Tipo de Pago" rules={[{ required: true, message: 'Requerido' }]}>
            <Select placeholder="Seleccione concepto">
              {paymentTypes.map((type) => (
                <Option key={type.id} value={type.nombre}>{type.nombre}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="program_id" label="Programa asociado">
            <Select placeholder="Sin programa (pago general)" allowClear>
              {financialData.map((p) => (
                <Option key={p.programa_id} value={p.programa_id}>{p.programa_nombre}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="monto" label="Monto" rules={[{ required: true, message: 'Ingrese el monto' }]}>
            <InputNumber
              className="w-full"
              addonAfter={currSuffix}
              formatter={currFormatter}
              parser={currParser}
              size="large"
              min={0}
            />
          </Form.Item>

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

            <Form.Item name="fecha_pago" label="Fecha de Pago">
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <Form.Item name="referencia_transaccion" label="Referencia (Opcional)">
            <Input placeholder="# Recibo / Ref" />
          </Form.Item>

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} placeholder="Notas adicionales..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={savingPayment} className="mt-2 bg-blue-600 hover:bg-blue-500">
            Guardar cambios
          </Button>
        </Form>
      </Modal>

      {/* --- MODAL EDITAR TOTAL PERSONALIZADO --- */}
      <Modal
        title="Editar total del estudiante"
        open={editTotal.open}
        onCancel={closeEditTotal}
        confirmLoading={savingTotal}
        okText="Guardar total"
        cancelText="Cancelar"
        onOk={() => saveTotal(editTotalValue)}
      >
        {editTotal.prog && (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              message="Cambiar el total no modifica lo que el estudiante ya ha abonado; solo recalcula el saldo pendiente."
            />

            <div className="text-sm text-slate-600">
              Programa: <span className="font-semibold text-slate-800">{editTotal.prog.programa_nombre}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-1 text-sm">
              <div className="text-slate-500">Total del programa:</div>
              <div className="text-right">{formatCurrency(editTotal.prog.monto_total_programa)}</div>
              <div className="text-slate-500">Ya abonado:</div>
              <div className="text-right text-green-600">{formatCurrency(editTotal.prog.total_abonado)}</div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Total personalizado</div>
              <InputNumber
                className="w-full"
                addonAfter={currSuffix}
                formatter={currFormatter}
                parser={currParser}
                size="large"
                min={0}
                value={editTotalValue}
                onChange={(v) => setEditTotalValue(v)}
              />
            </div>

            {editTotal.prog.monto_personalizado && (
              <Button
                danger
                type="default"
                block
                loading={savingTotal}
                onClick={() => saveTotal(null)}
              >
                Volver al total del programa ({formatCurrency(editTotal.prog.monto_total_programa)})
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentPayments;