import React from 'react';
import { Modal, Button, Descriptions, message } from 'antd';
import { Link } from 'react-router-dom';
import {
  FaUserEdit,
  FaGraduationCap,
  FaFileInvoiceDollar,
  FaWhatsapp,
  FaTrashAlt
} from 'react-icons/fa';

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

  const handleDelete = async (id) => {
    Modal.confirm({
      title: "¿Está seguro de que desea eliminar este estudiante?",
      content: "Esta acción no se puede deshacer.",
      onOk: async () => {
        try {
          const response = await fetch(`${apiUrl}/students/${id}`, {
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
            onDelete(id);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal
      title={`Detalles del Estudiante: ${student.nombre} ${student.apellido}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Descriptions bordered column={2} size="small" className="mb-4">
        <Descriptions.Item label="Información Personal" span={2}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Tipo de Documento">{student.tipo_documento || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Número de Documento">{student.numero_documento || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Lugar de Expedición">{student.lugar_expedicion || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Lugar de Nacimiento">{student.lugar_nacimiento || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Fecha de Nacimiento">{formatDate(student.fecha_nacimiento)}</Descriptions.Item>
            <Descriptions.Item label="EPS">{student.eps || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="RH">{student.rh || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="SIMAT">{student.simat || 'No especificado'}</Descriptions.Item>
          </Descriptions>
        </Descriptions.Item>

        <Descriptions.Item label="Información de Contacto" span={2}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Email">{student.email || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Teléfono Llamadas">{student.telefono_llamadas || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Teléfono WhatsApp">{student.telefono_whatsapp || 'No especificado'}</Descriptions.Item>
          </Descriptions>
        </Descriptions.Item>

        <Descriptions.Item label="Información Académica" span={2}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Programa">{getProgramName(student.programa_id)}</Descriptions.Item>
            <Descriptions.Item label="Coordinador">
              <span className={getCoordinatorStyle(student.coordinador)}>{student.coordinador}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <span className={`px-2 py-1 rounded-full text-sm ${
                student.activo ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
              }`}>
                {student.activo ? "Activo" : "Inactivo"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Estado Matrícula">
              <span className={`px-2 py-1 rounded-full text-sm ${
                student.estado_matricula ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"
              }`}>
                {student.estado_matricula ? "Pago" : "Pendiente"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Valor Matrícula">${student.matricula?.toLocaleString() || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Modalidad">{student.modalidad_estudio || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Fecha de Inscripción">{formatDate(student.fecha_inscripcion)}</Descriptions.Item>
            <Descriptions.Item label="Fecha de Graduación">{formatDate(student.fecha_graduacion)}</Descriptions.Item>
            <Descriptions.Item label="Último Curso Visto">{student.ultimo_curso_visto || 'No especificado'}</Descriptions.Item>
          </Descriptions>
        </Descriptions.Item>

        <Descriptions.Item label="Información del Acudiente" span={2}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Nombre">{student.nombre_acudiente || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Tipo de Documento">{student.tipo_documento_acudiente || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Teléfono">{student.telefono_acudiente || 'No especificado'}</Descriptions.Item>
            <Descriptions.Item label="Dirección">{student.direccion_acudiente || 'No especificado'}</Descriptions.Item>
          </Descriptions>
        </Descriptions.Item>
      </Descriptions>

      <div className="flex justify-end space-x-2 mt-4">
        <Button
          icon={<FaTrashAlt />}
          onClick={() => handleDelete(student.id)}
          danger
        >
          Eliminar
        </Button>
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