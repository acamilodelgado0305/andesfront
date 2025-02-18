import React, { useState, useEffect } from "react";
import { getPrograms } from "../../services/studentService";
import { Form, Input, Select, DatePicker, Button, message } from "antd";
import { UserOutlined, PhoneOutlined, IdcardOutlined } from "@ant-design/icons";

const { Option } = Select;

const StudentRegistrationFormMarily = ({ onStudentAdded }) => {
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
      if (!values.fechaNacimiento) {
        throw new Error("La fecha de nacimiento es requerida");
      }

      const formattedValues = {
        ...values,
        fechaNacimiento: values.fechaNacimiento.format("YYYY-MM-DD"),
        programa_id: parseInt(values.programa_id, 10),
        // Add default values here
        coordinador: "Marily Gordillo",
        simat: "Inactivo",
        pagoMatricula: false
      };

      console.log('Sending data:', formattedValues);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedValues),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      console.log('Success response:', data);

      message.success("Estudiante registrado exitosamente");
      onStudentAdded?.();
      form.resetFields();
    } catch (error) {
      console.error("Error detallado al registrar el estudiante:", {
        message: error.message,
        stack: error.stack,
        values: values
      });

      message.error(`Error al registrar el estudiante: ${error.message || 'Por favor intente nuevamente'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-purple-100 rounded-t-lg p-6 border-b-8 border-purple-500">
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
            <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]}>
              <Input className="h-10" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Correo Electrónico"
              rules={[{ required: true }, { type: 'email' }]}
            >
              <Input className="h-10" />
            </Form.Item>

            <Form.Item
              name="fechaNacimiento"
              label="Fecha de Nacimiento"
              rules={[{ required: true }]}
            >
              <DatePicker className="w-full h-10" />
            </Form.Item>

            <Form.Item name="eps" label="EPS" rules={[{ required: true }]}>
              <Input className="h-10" />
            </Form.Item>

            <Form.Item name="rh" label="RH" rules={[{ required: true }]}>
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
            <Form.Item name="tipoDocumento" label="Tipo de Documento" rules={[{ required: true }]}>
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
              rules={[{ required: true }]}
            >
              <Input prefix={<IdcardOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item
              name="lugarExpedicion"
              label="Lugar de Expedición"
              rules={[{ required: true }]}
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
              rules={[{ required: true }]}
            >
              <Input prefix={<PhoneOutlined />} className="h-10" />
            </Form.Item>

            <Form.Item
              name="telefonoWhatsapp"
              label="Teléfono para WhatsApp"
              rules={[{ required: true }]}
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
            <Form.Item name="programa_id" label="Programa" rules={[{ required: true }]}>
              <Select className="h-10">
                {programas.map((programa) => (
                  <Option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="ultimoCursoAprobado"
              label="Último Curso Aprobado"
              rules={[{ required: true }]}
            >
              <Input className="h-10" />
            </Form.Item>



            <Form.Item name="modalidad_estudio" label="Modalidad de estudio" rules={[{ required: true }]}>
              <Select>
                <Option value="Clases en Linea">Clases en Linea</Option>
                <Option value="Modulos por WhastApp">Modulos por WhastApp</Option>
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
            className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700"
          >
            Registrar Estudiante
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default StudentRegistrationFormMarily;