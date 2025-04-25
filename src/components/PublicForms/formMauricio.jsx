import React, { useState, useEffect } from "react";
import { getPrograms } from "../../services/studentService";
import { Form, Input, Select, DatePicker, Button, message } from "antd";
import { UserOutlined, PhoneOutlined, IdcardOutlined } from "@ant-design/icons";
import moment from "moment"; // Importamos moment para manejar fechas

const { Option } = Select;

const StudentRegistrationFormMauricio = ({ onStudentAdded }) => {
  const [form] = Form.useForm();
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProgramsData = async () => {
      try {
        const data = await getPrograms();
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
      // Validamos explícitamente la fecha de nacimiento
      if (!values.fechaNacimiento || !moment.isMoment(values.fechaNacimiento) || !values.fechaNacimiento.isValid()) {
        throw new Error("La fecha de nacimiento es inválida o no ha sido seleccionada");
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
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Logo container */}
      <div className="flex justify-center mb-8">
        <img
          src="../../../images/frame4.png"
          alt="Logo de la institución"
          className="h-20 object-contain"
        />
      </div>

      {/* Header azul */}
      <div className="bg-blue-100 rounded-t-lg p-6 border-b-8 border-blue-800">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Registro de Estudiante</h1>
        <p className="text-gray-600">Por favor complete todos los campos requeridos para registrar un nuevo estudiante.</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="space-y-6"
      >
        {/* Información Personal */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
            Información Personal
          </h2>
          <div className="space-y-4">
            <Form.Item
              name="nombre"
              label="Nombre"
              rules={[{ required: true, message: "El nombre es requerido" }]}
            >
              <Input prefix={<UserOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item
              name="apellido"
              label="Apellido"
              rules={[{ required: true, message: "El apellido es requerido" }]}
            >
              <Input className="h-10" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Correo Electrónico"
              rules={[
                { required: true, message: "El correo es requerido" },
                { type: "email", message: "Por favor ingrese un correo válido" },
              ]}
            >
              <Input className="h-10" />
            </Form.Item>

            <Form.Item
              name="fechaNacimiento"
              label="Fecha de Nacimiento"
              rules={[{ required: true, message: "La fecha de nacimiento es requerida" }]}
            >
              <DatePicker
                className="w-full h-10"
                format="DD/MM/YYYY"
                placeholder="Seleccione una fecha"
                disabledDate={(current) => current && current > moment().endOf("day")} // Evita fechas futuras
              />
            </Form.Item>

            <Form.Item
              name="eps"
              label="EPS"
              rules={[{ required: true, message: "La EPS es requerida" }]}
            >
              <Input className="h-10" />
            </Form.Item>

            <Form.Item
              name="rh"
              label="RH"
              rules={[{ required: true, message: "El RH es requerido" }]}
            >
              <Input className="h-10" />
            </Form.Item>
          </div>
        </div>

        {/* Documentación */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
            Documentación
          </h2>
          <div className="space-y-4">
            <Form.Item
              name="tipoDocumento"
              label="Tipo de Documento"
              rules={[{ required: true, message: "El tipo de documento es requerido" }]}
            >
              <Select className="h-10">
                <Option value="CC">Cédula</Option>
                <Option value="TI">Tarjeta de Identidad</Option>
                <Option value="CE">Cédula Extranjería</Option>
                <Option value="PA">Pasaporte</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="numeroDocumento"
              label="Número de Documento"
              rules={[{ required: true, message: "El número de documento es requerido" }]}
            >
              <Input prefix={<IdcardOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item
              name="lugarExpedicion"
              label="Lugar de Expedición"
              rules={[{ required: true, message: "El lugar de expedición es requerido" }]}
            >
              <Input className="h-10" />
            </Form.Item>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
            Información de Contacto
          </h2>
          <div className="space-y-4">
            <Form.Item
              name="telefonoLlamadas"
              label="Teléfono para Llamadas"
              rules={[{ required: true, message: "El teléfono para llamadas es requerido" }]}
            >
              <Input prefix={<PhoneOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item
              name="telefonoWhatsapp"
              label="Teléfono para WhatsApp"
              rules={[{ required: true, message: "El teléfono para WhatsApp es requerido" }]}
            >
              <Input prefix={<PhoneOutlined />} className="h-10" />
            </Form.Item>
          </div>
        </div>

        {/* Información Académica */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
            Información Académica
          </h2>
          <div className="space-y-4">
            <Form.Item
              name="programa_nombre"
              label="Programa"
              rules={[{ required: true, message: "El programa es requerido" }]}
            >
              <Select className="h-10">
                {programas.map((programa) => (
                  <Option key={programa.id} value={programa.nombre}>
                    {programa.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="ultimoCursoAprobado"
              label="Último Curso Aprobado"
              rules={[{ required: true, message: "El último curso aprobado es requerido" }]}
            >
              <Input className="h-10" />
            </Form.Item>

            <Form.Item
              name="modalidad_estudio"
              label="Modalidad de estudio"
              rules={[{ required: true, message: "La modalidad de estudio es requerida" }]}
            >
              <Select className="h-10">
                <Option value="Clases en Linea">Clases en Línea</Option>
                <Option value="Modulos por WhastApp">Módulos por WhatsApp</Option>
              </Select>
            </Form.Item>
          </div>
        </div>

        {/* Información del Acudiente */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
            Información del Acudiente
          </h2>
          <div className="space-y-4">
            <Form.Item name="nombreAcudiente" label="Nombre del Acudiente">
              <Input className="h-10" />
            </Form.Item>

            <Form.Item name="telefonoAcudiente" label="Teléfono del Acudiente">
              <Input prefix={<PhoneOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item name="direccionAcudiente" label="Dirección del Acudiente">
              <Input className="h-10" />
            </Form.Item>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
          >
            Registrar Estudiante
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default StudentRegistrationFormMauricio;