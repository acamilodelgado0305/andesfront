import React, { useState } from 'react';
import { Modal, Button, Descriptions, Form, Input, Select, DatePicker, message, InputNumber } from 'antd';
import { Link } from 'react-router-dom';
import {
  FaUserEdit,
  FaGraduationCap,
  FaFileInvoiceDollar,
  FaWhatsapp,
  FaTrashAlt,
  FaSave
} from 'react-icons/fa';
import dayjs from 'dayjs';

const apiUrl = import.meta.env.VITE_API_BACKEND;

const StudentDetailModal = ({
  student,
  visible,
  onClose,
  onGraduate,
  onDelete,
  getCoordinatorStyle,
  getProgramName,
}) => {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState(student);

  if (!student) return null;

  const handleGraduate = async () => {
    Modal.confirm({
      title: "¿Confirmar graduación del estudiante?",
      content: "Esta acción marcará al estudiante como graduado.",
      onOk: async () => {
        try {
          await onGraduate(student.id);
          message.success("Estudiante graduado exitosamente");
        } catch (error) {
          console.error("Error al graduar el estudiante:", error);
          message.error("Error al graduar el estudiante");
        }
      },
    });
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: "¿Está seguro de que desea eliminar este estudiante?",
      content: "Esta acción no se puede deshacer.",
      onOk: async () => {
        try {
          const response = await fetch(`${apiUrl}/students/${student.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
          }

          message.success("Estudiante eliminado con éxito");
          onClose();
          if (onDelete) {
            onDelete(student.id);
          }
        } catch (error) {
          console.error("Error al eliminar el estudiante:", error);
          message.error("Error al eliminar el estudiante");
        }
      },
    });
  };

  const handleWhatsAppClick = () => {
    let phoneNumber = student.telefono_whatsapp?.replace(/\D/g, "") ||
      student.telefono_llamadas?.replace(/\D/g, "");

    if (!phoneNumber) {
      message.error("No hay número de teléfono disponible");
      return;
    }

    if (!phoneNumber.startsWith("57")) {
      phoneNumber = `57${phoneNumber}`;
    }
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    form.setFieldsValue({
      ...student,
      fecha_nacimiento: student.fecha_nacimiento ? dayjs(student.fecha_nacimiento) : null,
      fecha_inscripcion: student.fecha_inscripcion ? dayjs(student.fecha_inscripcion) : null,
      fecha_graduacion: student.fecha_graduacion ? dayjs(student.fecha_graduacion) : null,
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        fecha_nacimiento: values.fecha_nacimiento?.toISOString(),
        fecha_inscripcion: values.fecha_inscripcion?.toISOString(),
        fecha_graduacion: values.fecha_graduacion?.toISOString(),
      };

      const response = await fetch(`${apiUrl}/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedValues),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      setEditedStudent({ ...student, ...formattedValues });
      setIsEditing(false);
      message.success('Estudiante actualizado exitosamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      message.error('Error al actualizar el estudiante');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderEditableField = (name, options = {}) => {
    const { type = 'text', selectOptions = [] } = options;

    if (type === 'select') {
      return (
        <Form.Item name={name} noStyle>
          <Select style={{ width: '100%' }}>
            {selectOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      );
    } else if (type === 'date') {
      return (
        <Form.Item name={name} noStyle>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>
      );
    } else if (type === 'number') {
      return (
        <Form.Item name={name} noStyle>
          <InputNumber
            style={{ width: '100%' }}
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>
      );
    }
    return (
      <Form.Item name={name} noStyle>
        <Input />
      </Form.Item>
    );
  };

  return (
    <Modal
      title={`Detalles del Estudiante: ${student.nombre} ${student.apellido}`}
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button
          key="delete"
          icon={<FaTrashAlt />}
          onClick={handleDelete}
          danger
          disabled={isEditing}
        >
          Eliminar
        </Button>,
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        <Button
          key="edit"
          type="primary"
          onClick={isEditing ? handleSave : handleStartEditing}
          icon={isEditing ? <FaSave /> : <FaUserEdit />}
        >
          {isEditing ? 'Guardar' : 'Editar'}
        </Button>,
      ]}
    >
      <Form form={form} initialValues={student}>
        <Descriptions bordered column={2} size="small" className="mb-4">
          <Descriptions.Item label="Información Personal" span={2}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Tipo de Documento">
                {isEditing ? renderEditableField('tipo_documento', {
                  type: 'select',
                  selectOptions: [
                    { value: 'CC', label: 'Cédula de Ciudadanía' },
                    { value: 'TI', label: 'Tarjeta de Identidad' },
                    { value: 'CE', label: 'Cédula de Extranjería' }
                  ]
                }) : student.tipo_documento}
              </Descriptions.Item>
              <Descriptions.Item label="Número de Documento">
                {isEditing ? renderEditableField('numero_documento') : student.numero_documento}
              </Descriptions.Item>
              <Descriptions.Item label="Nombre">
                {isEditing ? renderEditableField('nombre') : student.nombre}
              </Descriptions.Item>
              <Descriptions.Item label="Apellido">
                {isEditing ? renderEditableField('apellido') : student.apellido}
              </Descriptions.Item>
              <Descriptions.Item label="Lugar de Expedición">
                {isEditing ? renderEditableField('lugar_expedicion') : student.lugar_expedicion}
              </Descriptions.Item>
              <Descriptions.Item label="Lugar de Nacimiento">
                {isEditing ? renderEditableField('lugar_nacimiento') : student.lugar_nacimiento}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de Nacimiento">
                {isEditing ? renderEditableField('fecha_nacimiento', { type: 'date' }) : formatDate(student.fecha_nacimiento)}
              </Descriptions.Item>
              <Descriptions.Item label="EPS">
                {isEditing ? renderEditableField('eps') : student.eps}
              </Descriptions.Item>
              <Descriptions.Item label="RH">
                {isEditing ? renderEditableField('rh') : student.rh}
              </Descriptions.Item>
              <Descriptions.Item label="SIMAT">
                {isEditing ? renderEditableField('simat') : student.simat}
              </Descriptions.Item>
            </Descriptions>
          </Descriptions.Item>

          <Descriptions.Item label="Información de Contacto" span={2}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Email">
                {isEditing ? renderEditableField('email') : student.email}
              </Descriptions.Item>
              <Descriptions.Item label="Teléfono Llamadas">
                {isEditing ? renderEditableField('telefono_llamadas') : student.telefono_llamadas}
              </Descriptions.Item>
              <Descriptions.Item label="Teléfono WhatsApp">
                {isEditing ? renderEditableField('telefono_whatsapp') : student.telefono_whatsapp}
              </Descriptions.Item>
            </Descriptions>
          </Descriptions.Item>

          <Descriptions.Item label="Información Académica" span={2}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Programa">
                {isEditing ? renderEditableField('programa_id', {
                  type: 'select',
                  selectOptions: [
                    // Aquí deberías mapear tus programas
                  ]
                }) : getProgramName(student.programa_id)}
              </Descriptions.Item>
              <Descriptions.Item label="Coordinador">
                <span className={getCoordinatorStyle(student.coordinador)}>
                  {isEditing ? renderEditableField('coordinador') : student.coordinador}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <span className={`px-2 py-1 rounded-full text-sm ${student.activo ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                  }`}>
                  {student.activo ? "Activo" : "Inactivo"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Estado Matrícula">
                <span className={`px-2 py-1 rounded-full text-sm ${student.estado_matricula ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"
                  }`}>
                  {student.estado_matricula ? "Pago" : "Pendiente"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Valor Matrícula">
                {isEditing ? renderEditableField('matricula', { type: 'number' }) :
                  `$${student.matricula?.toLocaleString() || 'No especificado'}`}
              </Descriptions.Item>
              <Descriptions.Item label="Modalidad">
                {isEditing ? renderEditableField('modalidad_estudio', {
                  type: 'select',
                  selectOptions: [
                    { value: 'PRESENCIAL', label: 'Presencial' },
                    { value: 'VIRTUAL', label: 'Virtual' },
                    { value: 'HIBRIDA', label: 'Híbrida' }
                  ]
                }) : student.modalidad_estudio}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de Inscripción">
                {isEditing ? renderEditableField('fecha_inscripcion', { type: 'date' }) :
                  formatDate(student.fecha_inscripcion)}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de Graduación">
                {isEditing ? renderEditableField('fecha_graduacion', { type: 'date' }) :
                  formatDate(student.fecha_graduacion)}
              </Descriptions.Item>
              <Descriptions.Item label="Último Curso Visto">
                {isEditing ? renderEditableField('ultimo_curso_visto') : student.ultimo_curso_visto}
              </Descriptions.Item>
            </Descriptions>
          </Descriptions.Item>

          <Descriptions.Item label="Información del Acudiente" span={2}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Nombre">
                {isEditing ? renderEditableField('nombre_acudiente') : student.nombre_acudiente}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo de Documento">
                {isEditing ? renderEditableField('tipo_documento_acudiente', {
                  type: 'select',
                  selectOptions: [
                    { value: 'CC', label: 'Cédula de Ciudadanía' },
                    { value: 'CE', label: 'Cédula de Extranjería' },
                    { value: 'PASAPORTE', label: 'Pasaporte' }
                  ]
                }) : student.tipo_documento_acudiente}
              </Descriptions.Item>
              <Descriptions.Item label="Teléfono">
                {isEditing ? renderEditableField('telefono_acudiente') : student.telefono_acudiente}
              </Descriptions.Item>
              <Descriptions.Item label="Dirección">
                {isEditing ? renderEditableField('direccion_acudiente') : student.direccion_acudiente}
              </Descriptions.Item>
            </Descriptions>
          </Descriptions.Item>
        </Descriptions>

        <div className="flex justify-end space-x-2 mt-4">
          <Button
            icon={<FaGraduationCap />}
            onClick={handleGraduate}
            disabled={student.fecha_graduacion || isEditing}
          >
            Graduar
          </Button>
          <Link to={`/inicio/students/facturas/${student.id}`}>
            <Button icon={<FaFileInvoiceDollar />} disabled={isEditing}>
              Ver Pagos
            </Button>
          </Link>
          <Button
            icon={<FaWhatsapp />}
            onClick={handleWhatsAppClick}
            disabled={isEditing}
          >
            WhatsApp
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default StudentDetailModal;