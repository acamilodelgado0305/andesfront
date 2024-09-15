import React, { useState, useEffect } from "react";
import { getPrograms } from "../../services/studentService";
import { Form, Input, Select, DatePicker, Button, message } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import PhoneInput from "react-phone-input-2";
import Logo from "../../../images/logo.png";

const { Option } = Select;

const CamiloForm = () => {
  const [form] = Form.useForm();
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

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
    const apiUrl = "https://fevaback.app.la-net.co/api/students";
    try {
      const formattedValues = {
        ...values,
        coordinador: "Camilo Delgado",
        fechaNacimiento: values.fechaNacimiento.format("YYYY-MM-DD"),
        fechaGraduacion: values.fechaGraduacion.format("YYYY-MM-DD"),
        programaId: parseInt(values.programaId, 10),
        ultimoCursoVisto: parseInt(values.ultimoCursoVisto, 10),
        telefono: phoneNumber, // Use the phoneNumber state which includes the country code
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedValues),
      });

      if (response.ok) {
        message.success("Estudiante creado exitosamente");
        form.resetFields();
        setPhoneNumber(""); // Reset phone number
      } else {
        throw new Error(response.statusText);
      }
    } catch (error) {
      console.error("Error al agregar el estudiante:", error);
      message.error("Hubo un error al crear el estudiante");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 flex justify-center">
        <div className="w-64 h-24  flex items-center justify-center">
          <img
            src={Logo}
            alt="Descripción de la imagen"
            className="w-32 h-32"
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Registro de Nuevo Estudiante</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          modalidadEstudio: "Clases en Linea",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "Por favor ingrese el nombre" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nombre" />
          </Form.Item>

          <Form.Item
            name="apellido"
            label="Apellido"
            rules={[
              { required: true, message: "Por favor ingrese el apellido" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Apellido" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Por favor ingrese el email" },
              { type: "email", message: "Por favor ingrese un email válido" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="telefono"
            rules={[
              { required: true, message: "Por favor ingrese el teléfono" },
            ]}
          >
            <div className="relative">
              <PhoneInput
                country={"co"}
                value={phoneNumber}
                onChange={(phone) => setPhoneNumber(phone)}
                inputClass="w-full py-1 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                buttonClass="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none"
                containerClass="relative"
                inputProps={{
                  name: "telefono",
                  required: true,
                  autoFocus: true,
                }}
              />
            </div>
          </Form.Item>
          <Form.Item
            name="fechaNacimiento"
            label="Fecha de Nacimiento"
            rules={[
              {
                required: true,
                message: "Por favor seleccione la fecha de nacimiento",
              },
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="programaId"
            label="Programa"
            rules={[
              { required: true, message: "Por favor seleccione un programa" },
            ]}
          >
            <Select placeholder="Seleccione un programa">
              {programas.map((programa) => (
                <Option key={programa.id} value={programa.id}>
                  {programa.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="ultimoCursoVisto"
            label="Último Curso Visto"
            rules={[
              {
                required: true,
                message: "Por favor seleccione el último curso visto",
              },
            ]}
          >
            <Select placeholder="Seleccione el último curso visto">
              {[5, 6, 7, 8, 9, 10, 11].map((curso) => (
                <Option key={curso} value={curso}>
                  {curso}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="numeroCedula"
            label="Número de Cédula"
            rules={[
              {
                required: true,
                message: "Por favor ingrese el número de cédula",
              },
            ]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="Número de Cédula" />
          </Form.Item>

          <Form.Item
            name="modalidadEstudio"
            label="Modalidad de Estudio"
            rules={[
              {
                required: true,
                message: "Por favor seleccione la modalidad de estudio",
              },
            ]}
          >
            <Select>
              <Option value="Clases en Linea">Clases en Línea</Option>
              <Option value="Modulos por WhatsApp">Módulos por WhatsApp</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="fechaGraduacion"
            label="Fecha de Graduación"
            rules={[
              {
                required: true,
                message: "Por favor seleccione la fecha de graduación",
              },
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item className="flex justify-center mt-6">
          <Button type="primary" htmlType="submit" loading={loading}>
            Registro
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CamiloForm;
