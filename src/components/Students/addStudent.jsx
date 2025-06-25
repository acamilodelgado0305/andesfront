import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, Button, message, Tabs, Tooltip, Spin } from "antd";
import {
  UserOutlined, PhoneOutlined, IdcardOutlined, MailOutlined,
  CalendarOutlined, EnvironmentOutlined, BookOutlined,
  LaptopOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import moment from "moment";

const { Option } = Select;
const { TabPane } = Tabs;

const UploadStudentsButton = () => (
    <div className="p-6 text-center text-gray-600 bg-gray-50 rounded-lg">
        <p className="mb-4">Aquí puedes cargar un archivo (ej. Excel) con la información de múltiples estudiantes.</p>
        <Button type="primary" disabled>
            Subir Archivo (Funcionalidad Pendiente)
        </Button>
        <p className="mt-2 text-sm text-gray-500">
            Esta funcionalidad se integraría aquí para cargar estudiantes masivamente.
        </p>
    </div>
);

const CreateStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
  const [form] = Form.useForm();
  const [inventarioItems, setInventarioItems] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(true);

  useEffect(() => {
    const fetchUserInventario = async () => {
      setLoadingInventario(true);
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.warn("No se encontró userId en localStorage. No se puede cargar el inventario del usuario.");
          message.error("No se pudo obtener el ID de usuario. Asegúrese de iniciar sesión.");
          setLoadingInventario(false);
          return;
        }

        const apiUrl = import.meta.env.VITE_API_BACKEND
          ? `${import.meta.env.VITE_API_BACKEND}/api/inventario/user/${userId}`
          : `http://localhost:3002/api/inventario/user/${userId}`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Se asume que el backend NO requiere autenticación para esta ruta de prueba.
            // Si la autenticación es necesaria, re-incluya el token JWT aquí.
          },
        });

        if (response.ok) {
          const data = await response.json();
          setInventarioItems(data);
        } else {
          const errorData = await response.json();
          console.error("Error al obtener el inventario del usuario:", errorData);
          message.error(`Error al cargar los programas: ${errorData.error || response.statusText}`);
        }
      } catch (err) {
        console.error("Error de conexión al cargar el inventario del usuario:", err);
        message.error("Error de conexión al cargar los programas. Verifique la red.");
      } finally {
        setLoadingInventario(false);
      }
    };

    if (isOpen) {
      fetchUserInventario();
    }
  }, [isOpen]);

  const handleSubmit = async (values) => {
    setLoadingForm(true);
    const apiUrl = import.meta.env.VITE_API_BACKEND
      ? `${import.meta.env.VITE_API_BACKEND}/api/students`
      : "https://back.app.validaciondebachillerato.com.co/api/students";

    try {
      // Ahora enviamos directamente el array de IDs
      const formattedValues = {
        ...values,
        fechaNacimiento: values.fechaNacimiento ? values.fechaNacimiento.format("YYYY-MM-DD") : null,
        // Eliminamos programa_nombre si ya no está en la tabla students o si se maneja por la tabla de unión
        // programa_nombre: programaNombreToSend,
        // Los IDs se envían con el nombre de campo que el backend espera, que hemos nombrado `programasIds`
        programasIds: values.programasIds.map(id => parseInt(id, 10)) // Asegurarse de que sean enteros
      };

      // Eliminar el campo 'programasIds' si no se quiere enviar con ese nombre exacto o ya no es necesario
      // Si el backend espera un campo como `inventario_items` o `associated_inventario`, cambie `programasIds` por el nombre correcto.
      // delete formattedValues.programasIds; // No eliminar si el backend espera este nombre

      // Campos que ya se eliminaban:
      delete formattedValues.eps;
      delete formattedValues.rh;
      delete formattedValues.nombreAcudiente;
      delete formattedValues.telefonoAcudiente;
      delete formattedValues.direccionAcudiente;
      // Ya no es necesario eliminar `programa_nombre` si no lo estamos asignando aquí.

      console.log("Datos a enviar para crear estudiante (con IDs de programas):", formattedValues);
      console.log("URL de la API utilizada:", apiUrl);

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
        const errorData = await response.json();
        console.error("Error de respuesta de la API al crear estudiante:", errorData);
        throw new Error(errorData.error || response.statusText);
      }
    } catch (error) {
      console.error("Error al intentar agregar el estudiante:", error);
      message.error(`Hubo un error al crear el estudiante: ${error.message || "Error desconocido"}`);
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <Modal
      title={<span className="text-xl font-bold text-gray-800">Registrar Nuevo Estudiante</span>}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1000}
      centered
      className="rounded-lg shadow-xl"
    >
      <Tabs defaultActiveKey="1" className="mt-4">
        <TabPane tab={<span className="font-semibold">Crear Estudiante</span>} key="1">
          {loadingInventario ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" tip="Cargando inventario del usuario..." />
            </div>
          ) : (
            <Form form={form} layout="vertical" onFinish={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center">
                    <UserOutlined className="mr-2 text-blue-500" /> Información Personal
                  </h3>

                  <Form.Item
                    name="nombre"
                    label="Nombre(s)"
                    rules={[{ required: true, message: "Por favor, ingrese el nombre del estudiante" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Nombre del estudiante" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="apellido"
                    label="Apellido(s)"
                    rules={[{ required: true, message: "Por favor, ingrese el apellido del estudiante" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Apellido del estudiante" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Correo Electrónico"
                    rules={[
                      { required: true, message: "Por favor, ingrese el correo electrónico" },
                      { type: 'email', message: "Por favor, ingrese un correo electrónico válido" }
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="ejemplo@dominio.com" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="fechaNacimiento"
                    label="Fecha de Nacimiento"
                    rules={[{ required: true, message: "Por favor, seleccione la fecha de nacimiento" }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="YYYY-MM-DD"
                      placeholder="Seleccione fecha"
                      suffixIcon={<CalendarOutlined />}
                      className="rounded-md"
                    />
                  </Form.Item>

                  <Form.Item
                    name="lugarNacimiento"
                    label="Lugar de Nacimiento"
                    rules={[{ required: true, message: "Por favor, ingrese el lugar de nacimiento" }]}
                  >
                    <Input prefix={<EnvironmentOutlined />} placeholder="Ciudad, País" className="rounded-md" />
                  </Form.Item>
                </div>

                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center">
                    <IdcardOutlined className="mr-2 text-blue-500" /> Contacto y Documentación
                  </h3>

                  <Form.Item
                    name="tipoDocumento"
                    label="Tipo de Documento"
                    rules={[{ required: true, message: "Por favor, seleccione el tipo de documento" }]}
                  >
                    <Select placeholder="Seleccione tipo" className="rounded-md">
                      <Option value="CC">Cédula de Ciudadanía</Option>
                      <Option value="TI">Tarjeta de Identidad</Option>
                      <Option value="CE">Cédula de Extranjería</Option>
                      <Option value="PA">Pasaporte</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="numeroDocumento"
                    label="Número de Documento"
                    rules={[{ required: true, message: "Por favor, ingrese el número de documento" }]}
                  >
                    <Input prefix={<IdcardOutlined />} placeholder="Número de identificación" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="lugarExpedicion"
                    label="Lugar de Expedición"
                    rules={[{ required: true, message: "Por favor, ingrese el lugar de expedición" }]}
                  >
                    <Input prefix={<EnvironmentOutlined />} placeholder="Ciudad de expedición" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="telefonoLlamadas"
                    label="Teléfono para Llamadas"
                    rules={[{ required: true, message: "Por favor, ingrese un número de teléfono" }]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Ej: 3001234567" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="telefonoWhatsapp"
                    label="Teléfono para WhatsApp"
                    rules={[{ required: true, message: "Por favor, ingrese un número de WhatsApp" }]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Ej: 3001234567" className="rounded-md" />
                  </Form.Item>
                </div>

                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center">
                    <BookOutlined className="mr-2 text-blue-500" /> Información Académica
                  </h3>

                  <Form.Item
                    name="programasIds"
                    label="Programa(s) de Interés"
                    rules={[{ required: true, message: "Por favor, seleccione al menos un programa" }]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Seleccione uno o más programas"
                      className="rounded-md"
                      disabled={inventarioItems.length === 0 && !loadingInventario}
                    >
                      {inventarioItems.map((item) => (
                        <Option key={item.id} value={item.id}>
                          {item.nombre}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="coordinador"
                    label="Coordinador Asignado"
                    rules={[{ required: true, message: "Por favor, seleccione un coordinador" }]}
                  >
                    <Select placeholder="Seleccione coordinador" className="rounded-md">
                      <Option value="Adriana Benitez">Adriana Benitez</Option>
                      <Option value="Camilo Delgado">Camilo Delgado</Option>
                      <Option value="Blanca Sanchez">Blanca Sanchez</Option>
                      <Option value="Mauricio Pulido">Mauricio Pulido</Option>
                      <Option value="Marily Gordillo">Marily Gordillo</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="modalidad_estudio"
                    label="Modalidad de Estudio"
                    rules={[{ required: true, message: "Por favor, seleccione la modalidad de estudio" }]}
                  >
                    <Select placeholder="Seleccione modalidad" className="rounded-md">
                      <Option value="Clases en Linea">Clases en Línea</Option>
                      <Option value="Modulos por WhastApp">Módulos por WhatsApp</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="ultimoCursoAprobado"
                    label="Último Curso Aprobado"
                    rules={[{ required: true, message: "Por favor, ingrese el último curso aprobado" }]}
                  >
                    <Input prefix={<FileTextOutlined />} placeholder="Ej: 9no grado" className="rounded-md" />
                  </Form.Item>

                  <Form.Item
                    name="simat"
                    label="Estado SIMAT"
                    rules={[{ required: true, message: "Por favor, seleccione el estado SIMAT" }]}
                  >
                    <Select placeholder="Seleccione estado" className="rounded-md">
                      <Option value="Activo">Activo</Option>
                      <Option value="Inactivo">Inactivo</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="pagoMatricula"
                    label="Estado de Matrícula"
                    rules={[{ required: true, message: "Por favor, seleccione el estado de matrícula" }]}
                  >
                    <Select placeholder="Seleccione estado" className="rounded-md">
                      <Option value="Pagado">Pagado</Option>
                      <Option value="Pendiente">Pendiente</Option>
                    </Select>
                  </Form.Item>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-gray-200">
                <Button
                  type="default"
                  onClick={onClose}
                  className="rounded-md px-6 py-2 transition duration-300 ease-in-out hover:bg-gray-100"
                >
                  Cancelar
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loadingForm}
                  className="rounded-md px-6 py-2 bg-blue-600 hover:bg-blue-700 transition duration-300 ease-in-out"
                >
                  Guardar Estudiante
                </Button>
              </div>
            </Form>
          )}
        </TabPane>

        <TabPane tab={<span className="font-semibold">Cargar Archivo Masivamente</span>} key="2">
          <UploadStudentsButton />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default CreateStudentModal;