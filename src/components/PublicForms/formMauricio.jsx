import React, { useState, useEffect } from "react";
import { getPrograms } from "../../services/studentService";
import { Form, Input, Select, DatePicker, Button, message } from "antd";
import { UserOutlined, PhoneOutlined, IdcardOutlined } from "@ant-design/icons";

const { Option } = Select;

const StudentRegistrationFormMauricio = ({ onStudentAdded }) => {
  const [form] = Form.useForm();
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProgramsData = async () => {
      try {
        const data = await getPrograms();
        console.log("Programas cargados:", data);
        setProgramas(data);
      } catch (err) {
        console.error("Error fetching Programs:", err);
        message.error("Error al cargar los programas");
      }
    };

    fetchProgramsData();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    const apiUrl = "https://back.app.validaciondebachillerato.com.co/api/students";

    try {
      if (!values.fechaNacimiento) {
        throw new Error("La fecha de nacimiento es requerida");
      }

      const formattedValues = {
        ...values,
        fechaNacimiento: values.fechaNacimiento.format("YYYY-MM-DD"),
        coordinador: "Mauricio Pulido",
        simat: "Inactivo",
        pagoMatricula: false,
      };

      console.log("Sending data:", formattedValues);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedValues),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Error response from server:", errorData);
        throw new Error(errorData?.message || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      console.log("Success response:", data);

      message.success("Estudiante registrado exitosamente");
      onStudentAdded?.();
      form.resetFields();
    } catch (error) {
      console.error("Error detallado al registrar el estudiante:", {
        message: error.message,
        stack: error.stack,
        values,
      });
      message.error(`Error al registrar el estudiante: ${error.message || "Por favor intente nuevamente"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Encabezado con logo y nombre de la institución */}
      <div className="text-center mb-10">
        <img
          src="/images/santa-sofia-logo.png"
          alt="Logo Corporación Educativa Santa Sofía"
          className="h-24 mx-auto mb-4 object-contain"
          onError={(e) => (e.target.src = "https://via.placeholder.com/150?text=Santa+Sofía")}
        />
        <h1 className="text-4xl font-bold text-blue-900">Corporación Educativa Santa Sofía</h1>
        <p className="text-lg text-blue-700 mt-2">Formulario de Registro de Estudiantes</p>
      </div>

      {/* Formulario */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="bg-white rounded-xl shadow-lg p-8 space-y-6"
      >
        {/* Información Personal */}
        <div className="border-b border-blue-200 pb-4">
          <h2 className="text-2xl font-semibold text-blue-900">Información Personal</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "El nombre es requerido" }]}
          >
            <Input
              prefix={<UserOutlined className="text-blue-600" />}
              className="h-12 rounded-md"
              placeholder="Ingrese el nombre"
            />
          </Form.Item>

          <Form.Item
            name="apellido"
            label="Apellido"
            rules={[{ required: true, message: "El apellido es requerido" }]}
          >
            <Input
              className="h-12 rounded-md"
              placeholder="Ingrese el apellido"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo Electrónico"
            rules={[
              { required: true, message: "El correo es requerido" },
              { type: "email", message: "Por favor ingrese un correo válido" },
            ]}
          >
            <Input
              className="h-12 rounded-md"
              placeholder="ejemplo@correo.com"
            />
          </Form.Item>

          <Form.Item
            name="fechaNacimiento"
            label="Fecha de Nacimiento"
            rules={[{ required: true, message: "La fecha de nacimiento es requerida" }]}
          >
            <DatePicker
              className="w-full h-12 rounded-md"
              placeholder="Seleccione una fecha"
            />
          </Form.Item>
        </div>

        {/* Documentación */}
        <div className="border-b border-blue-200 pb-4 mt-8">
          <h2 className="text-2xl font-semibold text-blue-900">Documentación</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            name="tipoDocumento"
            label="Tipo de Documento"
            rules={[{ required: true, message: "El tipo de documento es requerido" }]}
          >
            <Select className="h-12" placeholder="Seleccione un tipo">
              <Option value="CC">Cédula de Ciudadanía</Option>
              <Option value="TI">Tarjeta de Identidad</Option>
              <Option value="CE">Cédula de Extranjería</Option>
              <Option value="PA">Pasaporte</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="numeroDocumento"
            label="Número de Documento"
            rules={[{ required: true, message: "El número de documento es requerido" }]}
          >
            <Input
              prefix={<IdcardOutlined className="text-blue-600" />}
              className="h-12 rounded-md"
              placeholder="Ejemplo: 1234567890"
            />
          </Form.Item>

          <Form.Item
            name="lugarExpedicion"
            label="Lugar de Expedición"
            rules={[{ required: true, message: "El lugar de expedición es requerido" }]}
          >
            <Input
              className="h-12 rounded-md"
              placeholder="Ejemplo: Bogotá"
            />
          </Form.Item>
        </div>

        {/* Información de Contacto */}
        <div className="border-b border-blue-200 pb-4 mt-8">
          <h2 className="text-2xl font-semibold text-blue-900">Información de Contacto</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            name="telefonoLlamadas"
            label="Teléfono para Llamadas"
            rules={[{ required: true, message: "El teléfono para llamadas es requerido" }]}
          >
            <Input
              prefix={<PhoneOutlined className="text-blue-600" />}
              className="h-12 rounded-md"
              placeholder="Ejemplo: 3001234567"
            />
          </Form.Item>

          <Form.Item
            name="telefonoWhatsapp"
            label="Teléfono para WhatsApp"
            rules={[{ required: true, message: "El teléfono para WhatsApp es requerido" }]}
          >
            <Input
              prefix={<PhoneOutlined className="text-blue-600" />}
              className="h-12 rounded-md"
              placeholder="Ejemplo: 3001234567"
            />
          </Form.Item>
        </div>

        {/* Información Académica */}
        <div className="border-b border-blue-200 pb-4 mt-8">
          <h2 className="text-2xl font-semibold text-blue-900">Información Académica</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            name="programa_nombre"
            label="Programa"
            rules={[{ required: true, message: "El programa es requerido" }]}
          >
            <Select className="h-12" placeholder="Seleccione un programa">
              {programas.map((programa) => (
                <Option key={programa.id} value={programa.nombre}>
                  {programa.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="ultimo_curso_visto"
            label="Último Curso Aprobado"
            rules={[{ required: true, message: "Por favor seleccione el último curso aprobado" }]}
          >
            <Select
              className="h-12"
              placeholder="Seleccione un curso"
            >
              {Array.from({ length: 11 }, (_, index) => {
                const curso = (index + 1).toString();
                return (
                  <Option key={curso} value={curso}>
                    {curso}°
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="modalidad_estudio"
            label="Modalidad de Estudio"
            rules={[{ required: true, message: "La modalidad de estudio es requerida" }]}
          >
            <Select className="h-12" placeholder="Seleccione una modalidad">
              <Option value="Clases en Linea">Clases en Línea</Option>
              <Option value="Modulos por WhastApp">Módulos por WhatsApp</Option>
            </Select>
          </Form.Item>
        </div>

        {/* Información del Acudiente */}
        <div className="border-b border-blue-200 pb-4 mt-8">
          <h2 className="text-2xl font-semibold text-blue-900">Información del Acudiente</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            name="nombreAcudiente"
            label="Nombre del Acudiente"
          >
            <Input
              className="h-12 rounded-md"
              placeholder="Ingrese el nombre del acudiente"
            />
          </Form.Item>

          <Form.Item
            name="telefonoAcudiente"
            label="Teléfono del Acudiente"
          >
            <Input
              prefix={<PhoneOutlined className="text-blue-600" />}
              className="h-12 rounded-md"
              placeholder="Ejemplo: 3001234567"
            />
          </Form.Item>

          <Form.Item
            name="direccionAcudiente"
            label="Dirección del Acudiente"
          >
            <Input
              className="h-12 rounded-md"
              placeholder="Ejemplo: Calle 123, Bogotá"
            />
          </Form.Item>
        </div>

        {/* Botón de envío */}
        <div className="mt-8">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Registrar Estudiante
          </Button>
        </div>
      </Form>

      {/* Pie de página */}
      <div className="text-center mt-8 text-blue-700">
        <p>© 2025 Corporación Educativa Santa Sofía. Todos los derechos reservados.</p>
      </div>
    </div>
  );
};

export default StudentRegistrationFormMauricio;