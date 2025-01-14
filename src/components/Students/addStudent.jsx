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
    const apiUrl = "http://localhost:3001/api/students";
    try {
      const formattedValues = {
        ...values,

        fechaNacimiento: values.fechaNacimiento.format('YYYY-MM-DD'),
        fechaGraduacion: values.fechaGraduacion.format('YYYY-MM-DD'),
        programaId: parseInt(values.programaId, 10),
        ultimoCursoVisto: parseInt(values.ultimoCursoVisto, 10),
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
        {/* Pestaña para crear un estudiante manualmente */}
        <TabPane tab="Crear Estudiante" key="1">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {/* Información Básica */}
              <Form.Item name="nombre" label="Nombre Completo" rules={[{ required: true, message: 'Ingrese el nombre completo' }]}>
                <Input prefix={<UserOutlined />} placeholder="Nombre Completo" />
              </Form.Item>

              <Form.Item name="tipoDocumento" label="Tipo de Documento" rules={[{ required: true, message: 'Seleccione el tipo de documento' }]}>
                <Select placeholder="Seleccione el tipo de documento">
                  <Option value="Cédula">Cédula</Option>
                  <Option value="Pasaporte">Pasaporte</Option>
                </Select>
              </Form.Item>

              <Form.Item name="numeroDocumento" label="Número de Documento" rules={[{ required: true, message: 'Ingrese el número de documento' }]}>
                <Input prefix={<IdcardOutlined />} placeholder="Número de Documento" />
              </Form.Item>

              <Form.Item name="lugarExpedicion" label="Lugar de Expedición" rules={[{ required: true, message: 'Ingrese el lugar de expedición' }]}>
                <Input placeholder="Lugar de Expedición" />
              </Form.Item>

              <Form.Item name="fechaNacimiento" label="Fecha de Nacimiento" rules={[{ required: true, message: 'Seleccione la fecha de nacimiento' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="lugarNacimiento" label="Lugar de Nacimiento" rules={[{ required: true, message: 'Ingrese el lugar de nacimiento' }]}>
                <Input placeholder="Lugar de Nacimiento" />
              </Form.Item>

              <Form.Item name="telefonoLlamadas" label="Teléfono para Llamadas" rules={[{ required: true, message: 'Ingrese el teléfono para llamadas' }]}>
                <Input prefix={<PhoneOutlined />} placeholder="Teléfono para Llamadas" />
              </Form.Item>

              <Form.Item name="telefonoWhatsapp" label="Teléfono para WhatsApp" rules={[{ required: true, message: 'Ingrese el teléfono para WhatsApp' }]}>
                <Input placeholder="Teléfono para WhatsApp" />
              </Form.Item>

              <Form.Item name="direccion" label="Dirección" rules={[{ required: true, message: 'Ingrese la dirección' }]}>
                <Input prefix={<HomeOutlined />} placeholder="Dirección" />
              </Form.Item>

              <Form.Item name="ciudad" label="Ciudad" rules={[{ required: true, message: 'Ingrese la ciudad' }]}>
                <Input placeholder="Ciudad" />
              </Form.Item>

              <Form.Item name="departamento" label="Departamento" rules={[{ required: true, message: 'Ingrese el departamento' }]}>
                <Input placeholder="Departamento" />
              </Form.Item>

              {/* Información Académica */}
              <Form.Item
                name="programaId"
                label="Programa"
                rules={[{ required: true, message: 'Por favor seleccione un programa' }]}
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

              <Form.Item
                name="horarioEstudio"
                label="Horario de Estudio"
                rules={[{ required: true, message: 'Ingrese el horario de estudio' }]}
              >
                <Input placeholder="Ingrese el horario de estudio" />
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
                name="mensualidadMes"
                label="Mes de Pago"
                rules={[{ required: true, message: 'Seleccione el mes de pago' }]}
              >
                <Select placeholder="Seleccione un mes">
                  <Option value="Enero">Enero</Option>
                  <Option value="Febrero">Febrero</Option>
                  <Option value="Marzo">Marzo</Option>
                  <Option value="Abril">Abril</Option>
                  <Option value="Mayo">Mayo</Option>
                  <Option value="Junio">Junio</Option>
                  <Option value="Julio">Julio</Option>
                  <Option value="Agosto">Agosto</Option>
                  <Option value="Septiembre">Septiembre</Option>
                  <Option value="Octubre">Octubre</Option>
                  <Option value="Noviembre">Noviembre</Option>
                  <Option value="Diciembre">Diciembre</Option>
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

        {/* Pestaña para cargar estudiantes masivamente */}
        <TabPane tab="Cargar Archivo" key="2">
          <UploadStudentsButton />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default CreateStudentModal;
