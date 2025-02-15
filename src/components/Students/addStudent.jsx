import React, { useState, useEffect } from "react";
import { getPrograms } from "../../services/studentService";
import { Modal, Form, Input, Select, DatePicker, Button, message, Tabs } from "antd";
import { UserOutlined, PhoneOutlined, IdcardOutlined } from "@ant-design/icons";
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
    const apiUrl = "https://back.app.validaciondebachillerato.com.co/api/students";
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
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab="Crear Estudiante" key="1">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div className="grid grid-cols-3 gap-4">
              {/* Columna 1: Información Personal */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 mb-4">Información Personal</h3>
                
                <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                  <Input prefix={<UserOutlined />} />
                </Form.Item>

                <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="email" label="Correo Electrónico" 
                  rules={[{ required: true }, { type: 'email' }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="fechaNacimiento" label="Fecha de Nacimiento" rules={[{ required: true }]}>
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item name="lugarNacimiento" label="Lugar de Nacimiento" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="eps" label="EPS" >
                  <Input />
                </Form.Item>

                <Form.Item name="rh" label="RH">
                  <Input />
                </Form.Item>
              </div>

              {/* Columna 2: Información de Contacto y Documentación */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 mb-4">Contacto y Documentación</h3>
                
                <Form.Item name="tipoDocumento" label="Tipo de Documento" rules={[{ required: true }]}>
                  <Select>
                    <Option value="CC">Cédula</Option>
                    <Option value="TI">Tarjeta de Identidad</Option>
                    <Option value="CE">Cédula Extranjería</Option>
                    <Option value="PA">Pasaporte</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="numeroDocumento" label="Número de Documento" rules={[{ required: true }]}>
                  <Input prefix={<IdcardOutlined />} />
                </Form.Item>

                <Form.Item name="lugarExpedicion" label="Lugar de Expedición" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="telefonoLlamadas" label="Teléfono para Llamadas" rules={[{ required: true }]}>
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>

                <Form.Item name="telefonoWhatsapp" label="Teléfono para WhatsApp" rules={[{ required: true }]}>
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </div>

              {/* Columna 3: Información Académica y Administrativa */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 mb-4">Información Académica</h3>
                
                <Form.Item name="programaId" label="Programa" rules={[{ required: true }]}>
                  <Select>
                    {programas.map((programa) => (
                      <Option key={programa.id} value={programa.id}>
                        {programa.nombre}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="coordinador" label="Coordinador" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Adriana Benitez">Adriana Benitez</Option>
                    <Option value="Camilo Delgado">Camilo Delgado</Option>
                    <Option value="Camilo Delgado">Blanca Sanchez</Option>
                    <Option value="Mauricio Pulido">Mauricio Pulido</Option>
                  </Select>
                </Form.Item>


                <Form.Item name="modalidad_estudio" label="Modalidad de estudio" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Clases en Linea">Clases en Linea</Option>
                    <Option value="Modulos por WhastApp">Modulos por WhastApp</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="ultimoCursoAprobado" label="Último Curso Aprobado" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="simat" label="SIMAT" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Activo">Activo</Option>
                    <Option value="Inactivo">Inactivo</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="pagoMatricula" label="Estado de Matrícula" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Pagado">Pagado</Option>
                    <Option value="Pendiente">Pendiente</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* Columna adicional: Información del Acudiente (span completo) */}
              <div className="col-span-3">
                <h3 className="font-semibold text-gray-700 mb-4">Información del Acudiente</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Form.Item name="nombreAcudiente" label="Nombre del Acudiente">
                    <Input />
                  </Form.Item>

                  <Form.Item name="telefonoAcudiente" label="Teléfono del Acudiente">
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>

                  <Form.Item name="direccionAcudiente" label="Dirección del Acudiente">
                    <Input />
                  </Form.Item>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-4">
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