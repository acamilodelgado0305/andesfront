import React, { useState, useEffect } from "react";
import { getPrograms } from "../../services/studentService";
import { Modal, Form, Input, Select, DatePicker, Button, message, Tabs } from "antd";
import { UserOutlined, PhoneOutlined, IdcardOutlined, HomeOutlined } from "@ant-design/icons";
import UploadStudentsButton from "./UploadStudentsButton";

const { Option } = Select;
const { TabPane } = Tabs;

const CreateStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
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
    const apiUrl = "https://fevaback.app.la-net.co/api/students";
    try {
      const formattedValues = {
        ...values,
        fechaNacimiento: values.fechaNacimiento.format("YYYY-MM-DD"),
        programa_id: parseInt(values.programaId, 10),
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
        onStudentAdded();
        onClose();
        form.resetFields();
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
    <Modal
      title="Crear o Cargar Estudiantes"
      visible={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab="Crear Estudiante" key="1">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {/* Información Básica */}
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: "Ingrese el nombre" }]}>
                <Input prefix={<UserOutlined />} placeholder="Nombre" />
              </Form.Item>

              <Form.Item name="apellido" label="Apellido" rules={[{ required: true, message: "Ingrese el apellido" }]}>
                <Input placeholder="Apellido" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Correo Electrónico"
                rules={[
                  { required: true, message: 'Ingrese un correo electrónico' },
                  { type: 'email', message: 'Ingrese un correo electrónico válido' },
                ]}
              >
                <Input placeholder="Correo Electrónico" />
              </Form.Item>

              <Form.Item
                name="tipoDocumento"
                label="Tipo de Documento"
                rules={[{ required: true, message: "Seleccione el tipo de documento" }]}
              >
                <Select placeholder="Seleccione el tipo de documento">
                  <Option value="Cédula">Cédula</Option>
                  <Option value="Pasaporte">Pasaporte</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="numeroDocumento"
                label="Número de Documento"
                rules={[{ required: true, message: "Ingrese el número de documento" }]}
              >
                <Input prefix={<IdcardOutlined />} placeholder="Número de Documento" />
              </Form.Item>

              <Form.Item
                name="lugarExpedicion"
                label="Lugar de Expedición"
                rules={[{ required: true, message: "Ingrese el lugar de expedición" }]}
              >
                <Input placeholder="Lugar de Expedición" />
              </Form.Item>

              <Form.Item
                name="fechaNacimiento"
                label="Fecha de Nacimiento"
                rules={[{ required: true, message: "Seleccione la fecha de nacimiento" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                name="lugarNacimiento"
                label="Lugar de Nacimiento"
                rules={[{ required: true, message: "Ingrese el lugar de nacimiento" }]}
              >
                <Input placeholder="Lugar de Nacimiento" />
              </Form.Item>

              <Form.Item
                name="telefonoLlamadas"
                label="Teléfono para Llamadas"
                rules={[{ required: true, message: "Ingrese el teléfono para llamadas" }]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="Teléfono para Llamadas" />
              </Form.Item>

              <Form.Item
                name="telefonoWhatsapp"
                label="Teléfono para WhatsApp"
                rules={[{ required: true, message: "Ingrese el teléfono para WhatsApp" }]}
              >
                <Input placeholder="Teléfono para WhatsApp" />
              </Form.Item>

              <Form.Item
                name="eps"
                label="EPS"
                rules={[{ required: true, message: "Ingrese el EPS" }]}
              >
                <Input placeholder="EPS" />
              </Form.Item>

              <Form.Item
                name="rh"
                label="RH"
                rules={[{ required: true, message: "Ingrese el grupo sanguíneo" }]}
              >
                <Input placeholder="RH" />
              </Form.Item>

              <Form.Item
                name="programaId"
                label="Programa"
                rules={[{ required: true, message: "Por favor seleccione un programa" }]}
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
                name="ultimoCursoAprobado"
                label="Último Curso Aprobado"
                rules={[{ required: true, message: 'Ingrese el último curso aprobado' }]}
              >
                <Input placeholder="Ingrese el último curso aprobado" />
              </Form.Item>

              {/* Información Médica */}
              <Form.Item name="eps" label="EPS" rules={[{ required: true, message: 'Ingrese el EPS' }]}>
                <Input placeholder="EPS" />
              </Form.Item>

              <Form.Item name="rh" label="RH" rules={[{ required: true, message: 'Ingrese el grupo sanguíneo' }]}>
                <Input placeholder="RH" />
              </Form.Item>

              {/* Información del Acudiente */}
              <Form.Item name="nombreAcudiente" label="Nombre del Acudiente" rules={[{ required: true, message: 'Ingrese el nombre del acudiente' }]}>
                <Input placeholder="Nombre del Acudiente" />
              </Form.Item>

              <Form.Item name="telefonoAcudiente" label="Teléfono del Acudiente" rules={[{ required: true, message: 'Ingrese el teléfono del acudiente' }]}>
                <Input placeholder="Teléfono del Acudiente" />
              </Form.Item>

              <Form.Item name="direccionAcudiente" label="Dirección del Acudiente" rules={[{ required: true, message: 'Ingrese la dirección del acudiente' }]}>
                <Input placeholder="Dirección del Acudiente" />
              </Form.Item>

              {/* Estado Administrativo */}
              <Form.Item name="simat" label="SIMAT" rules={[{ required: true, message: 'Seleccione el estado en SIMAT' }]}>
                <Select placeholder="Seleccione el estado">
                  <Option value="Activo">Activo</Option>
                  <Option value="Inactivo">Inactivo</Option>
                </Select>
              </Form.Item>
              <Form.Item name="pagoMatricula" label="Pago Matrícula" rules={[{ required: true, message: 'Seleccione el estado del pago' }]}>
                <Select placeholder="Seleccione el estado del pago">
                  <Option value="Pagado">Pagado</Option>
                  <Option value="Pendiente">Pendiente</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="coordinador"
                label="Seleccionar Coordinador"
                rules={[{ required: true, message: 'Seleccione un coordinador' }]}
              >
                <Select placeholder="Seleccione un coordinador">
                  <Option value="Adriana Benitez">Adriana Benitez</Option>
                  <Option value="Camilo Delgado">Camilo Delgado</Option>
                </Select>
              </Form.Item>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="default" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Guardar Estudiante
              </Button>
            </div>
          </Form>
        </TabPane>

        <TabPane tab="Cargar Archivo" key="2">
          <UploadStudentsButton />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default CreateStudentModal;
