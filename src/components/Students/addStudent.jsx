import React, { useState, useEffect, useCallback } from "react";
import {
  Modal, Form, Input, Select, DatePicker, Button,
  message, Steps, Spin, Switch, Divider, Tag, Tooltip,
} from "antd";
import {
  UserOutlined, PhoneOutlined, IdcardOutlined, MailOutlined,
  EnvironmentOutlined, BookOutlined, HeartOutlined,
  TeamOutlined, CheckCircleOutlined, ArrowLeftOutlined,
  ArrowRightOutlined, MedicineBoxOutlined, SafetyOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { createStudentAuthenticated } from "../../services/student/studentService";

const { Option } = Select;

/* ─── Constantes ─────────────────────────────────────────── */
const TIPO_DOC_OPTIONS = [
  { value: "CC",  label: "Cédula de Ciudadanía" },
  { value: "TI",  label: "Tarjeta de Identidad" },
  { value: "CE",  label: "Cédula de Extranjería" },
  { value: "PA",  label: "Pasaporte" },
  { value: "RC",  label: "Registro Civil" },
];

const RH_OPTIONS = ["O+","O-","A+","A-","B+","B-","AB+","AB-"];

const STEPS_META = [
  { title: "Identidad",  icon: <UserOutlined />,        description: "Datos personales y documento" },
  { title: "Contacto",   icon: <PhoneOutlined />,        description: "Teléfonos, salud" },
  { title: "Acudiente",  icon: <TeamOutlined />,         description: "Información del acudiente" },
  { title: "Académico",  icon: <BookOutlined />,         description: "Programa y matrícula" },
];

/* ─── Campos por paso (para validación selectiva) ─────────── */
const STEP_FIELDS = [
  ["nombre", "apellido", "email", "fechaNacimiento", "lugarNacimiento",
   "tipoDocumento", "numeroDocumento", "lugarExpedicion"],
  ["telefonoLlamadas", "telefonoWhatsapp", "eps", "rh"],
  [],   // Acudiente es opcional — no requiere validación forzada
  ["programasIds", "modalidad_estudio", "ultimoCursoAprobado", "simat", "pagoMatricula"],
];

/* ─── Helpers visuales ────────────────────────────────────── */
const SectionTitle = ({ icon, text, color = "text-indigo-600" }) => (
  <div className={`flex items-center gap-2 font-bold text-base ${color} mb-4`}>
    <span className="text-lg">{icon}</span>
    <span>{text}</span>
  </div>
);

const FieldHint = ({ text }) => (
  <span className="text-xs text-gray-400 font-normal">{text}</span>
);

/* ══════════════════════════════════════════════════════════
   PASO 1 — Identidad
══════════════════════════════════════════════════════════ */
const Step1Identity = () => (
  <div className="space-y-1">
    <SectionTitle icon={<UserOutlined />} text="Información Personal" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      <Form.Item name="nombre" label="Nombre(s)" rules={[{ required: true, message: "El nombre es requerido" }]}>
        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Ej: María Alejandra" autoComplete="off" />
      </Form.Item>
      <Form.Item name="apellido" label="Apellido(s)" rules={[{ required: true, message: "El apellido es requerido" }]}>
        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Ej: Gómez Torres" autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="email"
        label="Correo electrónico"
        rules={[{ required: true, type: "email", message: "Correo inválido" }]}
      >
        <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="estudiante@email.com" autoComplete="off" />
      </Form.Item>
      <Form.Item name="fechaNacimiento" label="Fecha de nacimiento" rules={[{ required: true, message: "Requerida" }]}>
        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="DD/MM/AAAA" />
      </Form.Item>
      <Form.Item name="lugarNacimiento" label="Lugar de nacimiento" rules={[{ required: true, message: "Requerido" }]} className="sm:col-span-2">
        <Input prefix={<EnvironmentOutlined className="text-gray-400" />} placeholder="Ciudad, Departamento" />
      </Form.Item>
    </div>

    <Divider className="my-3" />
    <SectionTitle icon={<IdcardOutlined />} text="Documento de Identidad" />

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      <Form.Item name="tipoDocumento" label="Tipo de documento" rules={[{ required: true, message: "Seleccione un tipo" }]}>
        <Select placeholder="Seleccione…">
          {TIPO_DOC_OPTIONS.map((o) => (
            <Option key={o.value} value={o.value}>{o.label}</Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="numeroDocumento" label="Número de documento" rules={[{ required: true, message: "Requerido" }]}>
        <Input prefix={<IdcardOutlined className="text-gray-400" />} placeholder="Ej: 1000123456" />
      </Form.Item>
      <Form.Item name="lugarExpedicion" label="Lugar de expedición" rules={[{ required: true, message: "Requerido" }]} className="sm:col-span-2">
        <Input prefix={<EnvironmentOutlined className="text-gray-400" />} placeholder="Ciudad donde fue expedido el documento" />
      </Form.Item>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   PASO 2 — Contacto & Salud
══════════════════════════════════════════════════════════ */
const Step2Contact = () => (
  <div className="space-y-1">
    <SectionTitle icon={<PhoneOutlined />} text="Información de Contacto" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      <Form.Item
        name="telefonoLlamadas"
        label="Teléfono de llamadas"
        rules={[{ required: true, message: "Requerido" }]}
      >
        <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="Ej: 3001234567" maxLength={15} />
      </Form.Item>
      <Form.Item
        name="telefonoWhatsapp"
        label={<span>WhatsApp <FieldHint text="(puede ser el mismo)" /></span>}
        rules={[{ required: true, message: "Requerido" }]}
      >
        <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="Ej: 3001234567" maxLength={15} />
      </Form.Item>
    </div>

    <Divider className="my-3" />
    <SectionTitle icon={<MedicineBoxOutlined />} text="Información de Salud" color="text-emerald-600" />
    <p className="text-xs text-gray-400 mb-3">Esta información es utilizada para registros académicos y de bienestar.</p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      <Form.Item
        name="eps"
        label={<span>EPS <FieldHint text="(Entidad Prestadora de Salud)" /></span>}
      >
        <Input prefix={<SafetyOutlined className="text-gray-400" />} placeholder="Ej: Sura, Sanitas, Nueva EPS…" />
      </Form.Item>
      <Form.Item name="rh" label="Tipo de sangre (RH)">
        <Select placeholder="Seleccione…" allowClear>
          {RH_OPTIONS.map((r) => (
            <Option key={r} value={r}>{r}</Option>
          ))}
        </Select>
      </Form.Item>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   PASO 3 — Acudiente
══════════════════════════════════════════════════════════ */
const Step3Guardian = () => (
  <div className="space-y-1">
    <SectionTitle icon={<TeamOutlined />} text="Datos del Acudiente / Responsable" color="text-amber-600" />
    <p className="text-xs text-gray-400 mb-4">
      Si el estudiante es menor de edad o tiene un responsable designado, completa esta sección. Es <strong>opcional</strong> para adultos independientes.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      <Form.Item name="nombreAcudiente" label="Nombre completo del acudiente" className="sm:col-span-2">
        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Ej: Carlos Andrés Gómez" />
      </Form.Item>
      <Form.Item name="tipoDocumentoAcudiente" label="Tipo de documento">
        <Select placeholder="Seleccione…" allowClear>
          {TIPO_DOC_OPTIONS.map((o) => (
            <Option key={o.value} value={o.value}>{o.label}</Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="telefonoAcudiente" label="Teléfono del acudiente">
        <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="Ej: 3109876543" maxLength={15} />
      </Form.Item>
      <Form.Item name="direccionAcudiente" label="Dirección del acudiente" className="sm:col-span-2">
        <Input prefix={<EnvironmentOutlined className="text-gray-400" />} placeholder="Calle, Barrio, Ciudad" />
      </Form.Item>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   PASO 4 — Académico
══════════════════════════════════════════════════════════ */
const Step4Academic = ({ programas, loadingProgramas }) => (
  <div className="space-y-1">
    <SectionTitle icon={<BookOutlined />} text="Información Académica" color="text-purple-600" />

    <Form.Item
      name="programasIds"
      label="Programa(s) académico(s)"
      rules={[{ required: true, message: "Selecciona al menos un programa" }]}
    >
      {loadingProgramas ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <Spin size="small" /> Cargando programas…
        </div>
      ) : (
        <Select
          mode="multiple"
          placeholder="Busca y selecciona el/los programa(s)"
          optionFilterProp="children"
          showSearch
          allowClear
        >
          {programas.map((p) => (
            <Option key={p.id} value={p.id}>
              {p.nombre}
              {p.tipo_programa && (
                <Tag className="ml-2" color={p.tipo_programa === "Tecnico" ? "blue" : "green"} style={{ fontSize: 10 }}>
                  {p.tipo_programa}
                </Tag>
              )}
            </Option>
          ))}
        </Select>
      )}
    </Form.Item>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
      <Form.Item
        name="modalidad_estudio"
        label="Modalidad de estudio"
        rules={[{ required: true, message: "Selecciona una modalidad" }]}
      >
        <Select placeholder="Seleccione…">
          <Option value="Clases en Linea">🖥️ Clases en Línea</Option>
          <Option value="Modulos por WhastApp">📱 Módulos por WhatsApp</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="ultimoCursoAprobado"
        label={<span>Último curso aprobado <FieldHint text="(nivel académico previo)" /></span>}
        rules={[{ required: true, message: "Requerido" }]}
      >
        <Input placeholder="Ej: Grado 9°, Bachillerato incompleto…" />
      </Form.Item>
    </div>

    <Divider className="my-3" />
    <SectionTitle icon={<CheckCircleOutlined />} text="Estado de Matrícula" color="text-teal-600" />

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
      <Form.Item
        name="simat"
        label={
          <Tooltip title="Sistema Integrado de Matrícula del MEN">
            Estado SIMAT ℹ️
          </Tooltip>
        }
        rules={[{ required: true, message: "Requerido" }]}
      >
        <Select placeholder="Seleccione…">
          <Option value="Activo">✅ Activo</Option>
          <Option value="Inactivo">⛔ Inactivo</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="pagoMatricula"
        label="Pago de matrícula"
        rules={[{ required: true, message: "Requerido" }]}
      >
        <Select placeholder="Seleccione…">
          <Option value="Pagado">💚 Pagado</Option>
          <Option value="Pendiente">🔴 Pendiente</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="posibleGraduacion"
        label={
          <span className="flex items-center gap-1">
            <StarOutlined className="text-yellow-500" /> Candidato a graduación
          </span>
        }
        valuePropName="checked"
        initialValue={false}
      >
        <Switch checkedChildren="Sí" unCheckedChildren="No" />
      </Form.Item>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════ */
const CreateStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [programas, setProgramas]     = useState([]);
  const [loadingProgramas, setLoadingProgramas] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [savedData, setSavedData]     = useState({});

  /* Carga de programas */
  const fetchProgramas = useCallback(async () => {
    setLoadingProgramas(true);
    try {
      const base = import.meta.env.VITE_API_BACKEND
        || "https://clasit-backend-api-570877385695.us-central1.run.app";
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${base}/api/programas`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) setProgramas(await res.json());
      else message.error("No se pudieron cargar los programas.");
    } catch {
      message.error("Error de conexión al cargar programas.");
    } finally {
      setLoadingProgramas(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setSavedData({});
      form.resetFields();
      return;
    }
    fetchProgramas();
  }, [isOpen, fetchProgramas]);

  /* Navegar al paso siguiente validando solo los campos del paso actual */
  const handleNext = async () => {
    try {
      const fields  = STEP_FIELDS[currentStep];
      const values  = fields.length ? await form.validateFields(fields) : {};
      setSavedData((prev) => ({ ...prev, ...values }));
      setCurrentStep((s) => s + 1);
    } catch {
      /* Ant Design muestra los errores inline — no hacemos nada extra */
    }
  };

  const handleBack = () => setCurrentStep((s) => s - 1);

  /* Envío final */
  const handleSubmit = async () => {
    try {
      const lastFields = STEP_FIELDS[currentStep];
      const lastValues = lastFields.length ? await form.validateFields(lastFields) : {};
      const all        = { ...savedData, ...lastValues };

      setLoadingForm(true);

      const payload = {
        nombre:                all.nombre,
        apellido:              all.apellido,
        email:                 all.email,
        fechaNacimiento:       all.fechaNacimiento?.format("YYYY-MM-DD") || null,
        lugarNacimiento:       all.lugarNacimiento,
        tipoDocumento:         all.tipoDocumento,
        numeroDocumento:       all.numeroDocumento,
        lugarExpedicion:       all.lugarExpedicion,
        telefonoLlamadas:      all.telefonoLlamadas,
        telefonoWhatsapp:      all.telefonoWhatsapp,
        eps:                   all.eps                   || null,
        rh:                    all.rh                    || null,
        nombreAcudiente:       all.nombreAcudiente       || null,
        tipoDocumentoAcudiente:all.tipoDocumentoAcudiente|| null,
        telefonoAcudiente:     all.telefonoAcudiente     || null,
        direccionAcudiente:    all.direccionAcudiente    || null,
        programasIds:          (all.programasIds || []).map((id) => parseInt(id, 10)),
        modalidad_estudio:     all.modalidad_estudio,
        ultimo_curso_visto:    all.ultimoCursoAprobado,
        simat:                 all.simat,
        pagoMatricula:         all.pagoMatricula,
        posibleGraduacion:     all.posibleGraduacion ?? false,
      };

      await createStudentAuthenticated(payload);
      message.success("¡Estudiante registrado exitosamente!");
      form.resetFields();
      setCurrentStep(0);
      setSavedData({});
      onStudentAdded();
      onClose();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message;
      if (msg && msg !== "Form validation failed") message.error(msg);
    } finally {
      setLoadingForm(false);
    }
  };

  const isLastStep = currentStep === STEPS_META.length - 1;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <UserOutlined className="text-indigo-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800 leading-tight">Registrar nuevo estudiante</div>
            <div className="text-xs text-gray-400 font-normal">{STEPS_META[currentStep].description}</div>
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      destroyOnClose={false}
      maskClosable={false}
      className="rounded-2xl"
    >
      {/* ── Indicador de pasos ── */}
      <div className="px-2 pt-2 pb-6">
        <Steps
          current={currentStep}
          size="small"
          items={STEPS_META.map((s) => ({ title: s.title, icon: s.icon }))}
        />
      </div>

      {/* ── Contenido del paso ── */}
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className="px-1"
        preserve
      >
        <div style={{ minHeight: 320 }}>
          {currentStep === 0 && <Step1Identity />}
          {currentStep === 1 && <Step2Contact />}
          {currentStep === 2 && <Step3Guardian />}
          {currentStep === 3 && (
            <Step4Academic programas={programas} loadingProgramas={loadingProgramas} />
          )}
        </div>

        {/* ── Botones de navegación ── */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            Paso {currentStep + 1} de {STEPS_META.length}
          </div>
          <div className="flex gap-3">
            <Button onClick={onClose} disabled={loadingForm}>
              Cancelar
            </Button>
            {currentStep > 0 && (
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                disabled={loadingForm}
              >
                Anterior
              </Button>
            )}
            {!isLastStep ? (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                iconPosition="end"
                onClick={handleNext}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={loadingForm}
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Guardar estudiante
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateStudentModal;
