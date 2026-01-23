import React, { useState, useEffect } from "react";
import {
  Form, Input, Select, DatePicker, Button, message, Spin, Progress, Typography, Card, Result
} from "antd";
import {
  UserOutlined, PhoneOutlined, IdcardOutlined, CheckCircleFilled, GlobalOutlined, SmileOutlined
} from "@ant-design/icons";

// 1. Importamos el servicio PÚBLICO
import { createStudentPublic } from "../../services/student/studentService";

const { Option } = Select;
const { Title, Text } = Typography;

const MICROSOFT_TEAL = "#080761ff";

// --- Servicio Local para Cargar Programas (Opcional: Mover a studentsService) ---
const getInventarioPublico = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BACKEND || "http://localhost:3000";
    const response = await fetch(`${API_BASE_URL}/api/programas`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

// 2. Aceptamos coordinatorId como prop (por defecto 6)
const StudentRegistrationForm = ({ onStudentRegistered, coordinatorId = 3 }) => {
  const [form] = Form.useForm();
  const [programas, setProgramas] = useState([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchProgramsData = async () => {
      setLoadingPrograms(true);
      const data = await getInventarioPublico();
      setProgramas(data);
      setLoadingPrograms(false);
    };
    fetchProgramsData();
  }, []);

  // --- Estructura de Pasos (UI se mantiene igual) ---
  const steps = [
    {
      title: "Intereses Académicos",
      fields: ["programasIds", "modalidad_estudio", "ultimoCursoVisto"],
      content: (
        <div className="animate-fade-in-up">
          <div className="mb-6">
            <Title level={3} style={{ color: "#333", marginBottom: "0.5rem" }}>1. Intereses Académicos</Title>
            <Text type="secondary">Cuéntanos qué te gustaría aprender con nosotros.</Text>
          </div>
          <Form.Item name="programasIds" label="¿Qué programa(s) te interesa(n)?" rules={[{ required: true, message: "Selecciona al menos uno." }]}>
            <Select mode="multiple" placeholder="Selecciona opciones..." size="large">
              {programas.map((prog) => (
                <Option key={prog.id} value={prog.id}>{prog.nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="modalidad_estudio" label="¿Cómo prefieres estudiar?" rules={[{ required: true }]}>
            <Select size="large">
              <Option value="Clases en Linea">🖥️ Clases en Línea</Option>
              <Option value="Modulos por WhastApp">📱 Módulos por WhatsApp</Option>
            </Select>
          </Form.Item>
          <Form.Item name="ultimoCursoVisto" label="Último curso aprobado" rules={[{ required: true }]}>
            <Select size="large">
              {Array.from({ length: 11 }, (_, i) => (
                <Option key={i + 1} value={(i + 1).toString()}>{i + 1}° Grado</Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      ),
    },
    {
      title: "Datos Personales",
      fields: ["nombre", "apellido", "email", "fechaNacimiento", "lugarNacimiento", "telefonoLlamadas", "telefonoWhatsapp"],
      content: (
        <div className="animate-fade-in-up">
          <div className="mb-6">
            <Title level={3} style={{ color: "#333", marginBottom: "0.5rem" }}>2. Tus Datos Personales</Title>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="nombre" label="Nombres" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} size="large" />
            </Form.Item>
            <Form.Item name="apellido" label="Apellidos" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Correo Electrónico" rules={[{ required: true, type: "email" }]}>
            <Input prefix={<GlobalOutlined />} size="large" />
          </Form.Item>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="fechaNacimiento" label="Fecha Nacimiento" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} size="large" format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="lugarNacimiento" label="Lugar Nacimiento" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="telefonoLlamadas" label="Celular" rules={[{ required: true }]}>
              <Input prefix={<PhoneOutlined />} type="number" size="large" />
            </Form.Item>
            <Form.Item name="telefonoWhatsapp" label="WhatsApp" rules={[{ required: true }]}>
              <Input prefix={<PhoneOutlined />} type="number" size="large" />
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      title: "Documentación",
      fields: ["tipoDocumento", "numeroDocumento", "lugarExpedicion"],
      content: (
        <div className="animate-fade-in-up">
          <div className="mb-6">
            <Title level={3} style={{ color: "#333", marginBottom: "0.5rem" }}>3. Identificación</Title>
          </div>
          <Form.Item name="tipoDocumento" label="Tipo Documento" rules={[{ required: true }]}>
            <Select size="large">
              <Option value="CC">Cédula de Ciudadanía</Option>
              <Option value="TI">Tarjeta de Identidad</Option>
              <Option value="CE">Cédula Extranjería</Option>
              <Option value="PA">Pasaporte</Option>
            </Select>
          </Form.Item>
          <Form.Item name="numeroDocumento" label="Número Documento" rules={[{ required: true }]}>
            <Input prefix={<IdcardOutlined />} type="number" size="large" />
          </Form.Item>
          <Form.Item name="lugarExpedicion" label="Lugar Expedición" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>
        </div>
      ),
    },
  ];

  const next = async () => {
    try {
      await form.validateFields(steps[currentStep].fields);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      message.error("Completa los campos obligatorios.");
    }
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3. Envío usando el Servicio
  const handleSubmit = async () => {
    setLoadingSubmit(true);
    try {
      const values = form.getFieldsValue(true);

      // Validación final de todos los campos
      await form.validateFields(steps[currentStep].fields);

      // Preparar Payload
      const formattedValues = {
        ...values,
        fechaNacimiento: values.fechaNacimiento ? values.fechaNacimiento.format("YYYY-MM-DD") : null,
        programasIds: Array.isArray(values.programasIds) ? values.programasIds.map(id => parseInt(id, 10)) : [],

        // --- AQUÍ ASIGNAMOS EL COORDINADOR EXPLÍCITAMENTE ---
        coordinador_id: coordinatorId,
        // ----------------------------------------------------

        // Valores por defecto para registro público
        simat: false,
        pagoMatricula: false,
        activo: true,
        posibleGraduacion: false,
        estado_matricula: false
      };

      console.log("Enviando registro público:", formattedValues);

      // 4. Llamada al servicio createStudentPublic
      await createStudentPublic(formattedValues);

      // Éxito
      setIsSubmitted(true);
      if (onStudentRegistered) onStudentRegistered();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Error Submit:", error);
      const msg = error.response?.data?.error || error.message || "Error al guardar";
      message.error(`Error: ${msg}`);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const progressPercent = Math.round(((currentStep) / steps.length) * 100);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] py-8 px-4 flex flex-col items-center justify-center font-sans">
        <Card className="w-full max-w-2xl shadow-lg rounded-lg border-0 text-center py-10">
          <Result
            icon={<SmileOutlined style={{ color: MICROSOFT_TEAL }} />}
            status="success"
            title="¡Gracias! Tu respuesta ha sido enviada."
            subTitle="Hemos recibido tu inscripción correctamente."
            extra={[
              <Button type="primary" key="console" size="large" onClick={() => window.location.reload()} style={{ backgroundColor: MICROSOFT_TEAL }}>
                Nueva Inscripción
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] py-8 px-4 flex flex-col items-center font-sans">
      <Card className="w-full max-w-3xl shadow-md rounded-t-lg overflow-hidden mb-4 border-0" bodyStyle={{ padding: 0 }}>
        <div style={{ backgroundColor: MICROSOFT_TEAL, height: "10px", width: "100%" }}></div>
        <div className="p-8 bg-white">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Formulario de Inscripción</h1>
          <p className="text-gray-500 text-base">Completa tu información para iniciar el proceso.</p>
        </div>
      </Card>

      <div className="w-full max-w-3xl mb-6 px-2">
        <Progress percent={progressPercent} showInfo={false} strokeColor={MICROSOFT_TEAL} trailColor="#d1d5db" />
      </div>

      <Card className="w-full max-w-3xl shadow-sm rounded-lg border-0">
        {loadingPrograms ? (
          <div className="flex justify-center py-12"><Spin size="large" /></div>
        ) : (
          <Form form={form} layout="vertical" className="pt-2" requiredMark={false}>
            <div className="min-h-[300px]">
              {steps[currentStep].content}
            </div>
            <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
              {currentStep > 0 ? (
                <Button onClick={prev} size="large" className="px-8">Atrás</Button>
              ) : <div></div>}

              {currentStep < steps.length - 1 && (
                <Button type="primary" onClick={next} size="large" style={{ backgroundColor: MICROSOFT_TEAL }} className="px-8">
                  Siguiente
                </Button>
              )}

              {currentStep === steps.length - 1 && (
                <Button type="primary" onClick={handleSubmit} loading={loadingSubmit} size="large" style={{ backgroundColor: MICROSOFT_TEAL }} className="px-8 flex items-center gap-2">
                  <CheckCircleFilled /> Enviar
                </Button>
              )}
            </div>
          </Form>
        )}
      </Card>
      <div className="mt-8 text-center text-gray-400 text-sm">Plataforma Educativa Segura • {new Date().getFullYear()}</div>
    </div>
  );
};

export default StudentRegistrationForm;