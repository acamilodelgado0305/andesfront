import React from 'react';
import { Modal, Button, Descriptions, message } from 'antd';
import { Link } from 'react-router-dom';
import { 
  FaUserEdit, 
  FaGraduationCap, 
  FaFileInvoiceDollar, 
  FaWhatsapp 
} from 'react-icons/fa';



const StudentDetailModal = ({ 
  student, 
  visible, 
  onClose,
  onGraduate,
  getCoordinatorStyle,
  getProgramName 
}) => {
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

  const handleWhatsAppClick = () => {
    let phoneNumber = student.telefono.replace(/\D/g, "");
    if (!phoneNumber.startsWith("57")) {
      phoneNumber = `57${phoneNumber}`;
    }
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  return (
    <Modal
      title="Detalles del Estudiante"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="ID">{student.numero_cedula}</Descriptions.Item>
        <Descriptions.Item label="Coordinador">
          <span className={getCoordinatorStyle(student.coordinador)}>
            {student.coordinador}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Nombre">{student.nombre}</Descriptions.Item>
        <Descriptions.Item label="Apellido">{student.apellido}</Descriptions.Item>
        <Descriptions.Item label="Email">{student.email}</Descriptions.Item>
        <Descriptions.Item label="Teléfono">{student.telefono}</Descriptions.Item>
        <Descriptions.Item label="Programa">
          {getProgramName(student.programa_id)}
        </Descriptions.Item>
        <Descriptions.Item label="Estado">
          <span className={`px-2 py-1 rounded-full text-sm ${
            student.activo ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
          }`}>
            {student.activo ? "Activo" : "Inactivo"}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Fecha de Graduación">
          {student.fecha_graduacion || "No graduado"}
        </Descriptions.Item>
      </Descriptions>

      <div className="flex justify-end space-x-2 mt-4">
        <Link to={`/student/edit/${student.id}`}>
          <Button icon={<FaUserEdit />} type="primary">
            Editar
          </Button>
        </Link>
        <Button 
          icon={<FaGraduationCap />} 
          onClick={handleGraduate}
          disabled={student.fecha_graduacion}
        >
          Graduar
        </Button>
        <Link to={`/inicio/students/facturas/${student.id}`}>
          <Button icon={<FaFileInvoiceDollar />}>
            Ver Facturas
          </Button>
        </Link>
        <Button
          icon={<FaWhatsapp />}
          onClick={handleWhatsAppClick}
        >
          WhatsApp
        </Button>
      </div>
    </Modal>
  );
};

export default StudentDetailModal;