import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, Button, message, Tabs, Spin } from "antd";
import {
  UserOutlined, PhoneOutlined, IdcardOutlined, MailOutlined,
  CalendarOutlined, EnvironmentOutlined, BookOutlined,
  FileTextOutlined
} from "@ant-design/icons";
// IMPORTANTE: Ajusta la ruta según tu estructura de carpetas
import { createStudentAuthenticated } from "../../services/student/studentService";

const { Option } = Select;
const { TabPane } = Tabs;

const UploadStudentsButton = () => (
  <div className="p-6 text-center text-gray-600 bg-gray-50 rounded-lg">
    <p className="mb-4">Aquí puedes cargar un archivo (ej. Excel) con la información de múltiples estudiantes.</p>
    <Button type="primary" disabled>
      Subir Archivo (Funcionalidad Pendiente)
    </Button>
  </div>
);

const CreateStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
  const [form] = Form.useForm();
  const [inventarioItems, setInventarioItems] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(false);

  // 1. Carga de Programas (Inventario)
  useEffect(() => {
    if (!isOpen) return;

    const fetchProgramas = async () => {
      setLoadingInventario(true);
      try {
        const apiUrl = import.meta.env.VITE_API_BACKEND
          ? `${import.meta.env.VITE_API_BACKEND}/api/programas`
          : `https://clasit-backend-api-570877385695.us-central1.run.app/api/programas`;

        // Nota: Idealmente moverías esto también a un servicio (ej: programsService.js)
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          setInventarioItems(data);
        } else {
          console.error("Error cargando programas");
          message.error("No se pudieron cargar los programas educativos.");
        }
      } catch (err) {
        console.error(err);
        message.error("Error de conexión al cargar programas.");
      } finally {
        setLoadingInventario(false);
      }
    };

    fetchProgramas();
  }, [isOpen]);

  // 2. Manejo del Envío del Formulario
  const handleSubmit = async (values) => {
    setLoadingForm(true);

    try {
      // Formateo de datos antes de enviar al servicio
      const formattedValues = {
        ...values,
        // Formatear fecha a YYYY-MM-DD
        fechaNacimiento: values.fechaNacimiento ? values.fechaNacimiento.format("YYYY-MM-DD") : null,
        // Asegurar que los IDs sean números
        programasIds: values.programasIds.map((id) => parseInt(id, 10)),
        // NOTA: Ya no enviamos 'coordinador_id'. El backend lo toma del Token.
      };

      // Limpieza de campos extra por seguridad
      delete formattedValues.coordinador;

      console.log("Enviando datos al servicio:", formattedValues);

      // USO DEL SERVICIO
      await createStudentAuthenticated(formattedValues);

      // Éxito
      message.success("Estudiante creado exitosamente");
      form.resetFields();
      onStudentAdded(); // Refrescar tabla padre
      onClose(); // Cerrar modal

    } catch (error) {
      console.error("Error en creación:", error);
      // El mensaje de error ya lo suele manejar el servicio o axios, 
      // pero aquí mostramos uno genérico o el que venga del backend
      const errorMsg = error.response?.data?.error || error.message || "Error al crear estudiante";
      message.error(errorMsg);
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
              <Spin size="large" tip="Cargando programas..." />
            </div>
          ) : (
            <Form form={form} layout="vertical" onFinish={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* --- Columna 1: Info Personal --- */}
                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center">
                    <UserOutlined className="mr-2 text-blue-500" /> Información Personal
                  </h3>

                  <Form.Item name="nombre" label="Nombre(s)" rules={[{ required: true, message: "Requerido" }]}>
                    <Input prefix={<UserOutlined />} placeholder="Nombre" />
                  </Form.Item>
                  <Form.Item name="apellido" label="Apellido(s)" rules={[{ required: true, message: "Requerido" }]}>
                    <Input prefix={<UserOutlined />} placeholder="Apellido" />
                  </Form.Item>
                  <Form.Item name="email" label="Correo" rules={[{ required: true, type: 'email' }]}>
                    <Input prefix={<MailOutlined />} placeholder="ejemplo@email.com" />
                  </Form.Item>
                  <Form.Item name="fechaNacimiento" label="Fecha Nacimiento" rules={[{ required: true }]}>
                    <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Seleccione fecha" />
                  </Form.Item>
                  <Form.Item name="lugarNacimiento" label="Lugar Nacimiento" rules={[{ required: true }]}>
                    <Input prefix={<EnvironmentOutlined />} />
                  </Form.Item>
                </div>

                {/* --- Columna 2: Contacto --- */}
                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center">
                    <IdcardOutlined className="mr-2 text-blue-500" /> Documentación
                  </h3>

                  <Form.Item name="tipoDocumento" label="Tipo Documento" rules={[{ required: true }]}>
                    <Select placeholder="Seleccione">
                      <Option value="CC">Cédula de Ciudadanía</Option>
                      <Option value="TI">Tarjeta de Identidad</Option>
                      <Option value="CE">Cédula de Extranjería</Option>
                      <Option value="PA">Pasaporte</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="numeroDocumento" label="No. Documento" rules={[{ required: true }]}>
                    <Input prefix={<IdcardOutlined />} />
                  </Form.Item>
                  <Form.Item name="lugarExpedicion" label="Lugar Expedición" rules={[{ required: true }]}>
                    <Input prefix={<EnvironmentOutlined />} />
                  </Form.Item>
                  <Form.Item name="telefonoLlamadas" label="Teléfono" rules={[{ required: true }]}>
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>
                  <Form.Item name="telefonoWhatsapp" label="WhatsApp" rules={[{ required: true }]}>
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>
                </div>

                {/* --- Columna 3: Académico --- */}
                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center">
                    <BookOutlined className="mr-2 text-blue-500" /> Académico
                  </h3>

                  <Form.Item name="programasIds" label="Programas" rules={[{ required: true }]}>
                    <Select mode="multiple" placeholder="Seleccione programa(s)" optionFilterProp="children">
                      {inventarioItems.map((item) => (
                        <Option key={item.id} value={item.id}>{item.nombre}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="modalidad_estudio" label="Modalidad" rules={[{ required: true }]}>
                    <Select>
                      <Option value="Clases en Linea">Clases en Línea</Option>
                      <Option value="Modulos por WhastApp">Módulos por WhatsApp</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="ultimoCursoAprobado" label="Último Curso" rules={[{ required: true }]}>
                    <Input prefix={<FileTextOutlined />} />
                  </Form.Item>

                  <Form.Item name="simat" label="Estado SIMAT" rules={[{ required: true }]}>
                    <Select>
                      <Option value="Activo">Activo</Option>
                      <Option value="Inactivo">Inactivo</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="pagoMatricula" label="Estado Matrícula" rules={[{ required: true }]}>
                    <Select>
                      <Option value="Pagado">Pagado</Option>
                      <Option value="Pendiente">Pendiente</Option>
                    </Select>
                  </Form.Item>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-gray-200">
                <Button onClick={onClose}>Cancelar</Button>
                <Button type="primary" htmlType="submit" loading={loadingForm}>
                  Guardar Estudiante
                </Button>
              </div>
            </Form>
          )}
        </TabPane>

        <TabPane tab="Carga Masiva" key="2">
          <UploadStudentsButton />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default CreateStudentModal;