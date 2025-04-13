// src/components/Students/StudentDetails.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  InputNumber,
  Modal,
  Avatar,
  Space,
  Typography,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  FaUserEdit,
  FaGraduationCap,
  FaFileInvoiceDollar,
  FaWhatsapp,
  FaTrashAlt,
  FaSave,
  FaUserGraduate,
} from 'react-icons/fa';
import dayjs from 'dayjs';
import axios from 'axios';
import { getPrograms } from '../../services/studentService';

const { Title, Text } = Typography;

const StudentDetails = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [programs, setPrograms] = useState([]);

  // Función para formatear fechas
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Obtener datos del estudiante y programas
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await axios.get(
          `https://back.app.validaciondebachillerato.com.co/api/students/${studentId}`
        );
        setStudent(response.data);
        form.setFieldsValue({
          ...response.data,
          fecha_nacimiento: response.data.fecha_nacimiento
            ? dayjs(response.data.fecha_nacimiento)
            : null,
          fecha_inscripcion: response.data.fecha_inscripcion
            ? dayjs(response.data.fecha_inscripcion)
            : null,
          fecha_graduacion: response.data.fecha_graduacion
            ? dayjs(response.data.fecha_graduacion)
            : null,
        });
      } catch (error) {
        console.error('Error al cargar el estudiante:', error);
        message.error('Error al cargar los datos del estudiante');
      } finally {
        setLoading(false);
      }
    };

    const fetchPrograms = async () => {
      try {
        const programsData = await getPrograms();
        setPrograms(programsData);
      } catch (error) {
        console.error('Error al cargar los programas:', error);
        message.error('Error al cargar los programas');
      }
    };

    fetchStudent();
    fetchPrograms();
  }, [studentId, form]);

  const getCoordinatorStyle = (coordinator) => {
    return 'px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800';
  };

  // Funciones de acciones
  const handleGraduate = async () => {
    Modal.confirm({
      title: '¿Confirmar graduación del estudiante?',
      content: 'Esta acción marcará al estudiante como graduado.',
      onOk: async () => {
        try {
          await axios.put(
            `https://back.app.validaciondebachillerato.com.co/api/students/${student.id}/graduate`
          );
          message.success('Estudiante graduado exitosamente');
          setStudent({ ...student, fecha_graduacion: new Date().toISOString() });
        } catch (error) {
          console.error('Error al graduar el estudiante:', error);
          message.error('Error al graduar el estudiante');
        }
      },
    });
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: '¿Está seguro de que desea eliminar este estudiante?',
      content: 'Esta acción no se puede deshacer.',
      onOk: async () => {
        try {
          await axios.delete(
            `https://back.app.validaciondebachillerato.com.co/api/students/${student.id}`
          );
          message.success('Estudiante eliminado con éxito');
          window.location.href = '/inicio/students';
        } catch (error) {
          console.error('Error al eliminar el estudiante:', error);
          message.error('Error al eliminar el estudiante');
        }
      },
    });
  };

  const handleWhatsAppClick = () => {
    let phoneNumber =
      student?.telefono_whatsapp?.replace(/\D/g, '') ||
      student?.telefono_llamadas?.replace(/\D/g, '');
    if (!phoneNumber) {
      message.error('No hay número de teléfono disponible');
      return;
    }
    if (!phoneNumber.startsWith('57')) phoneNumber = `57${phoneNumber}`;
    window.open(`https://wa.me/${phoneNumber}`, '_blank');
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (values.email && !emailRegex.test(values.email)) {
        message.error('El formato de email es inválido');
        return;
      }

      const formattedValues = {
        nombre: values.nombre,
        apellido: values.apellido,
        email: values.email || '',
        tipoDocumento: values.tipo_documento,
        programa_nombre: values.programa_nombre,
        numeroDocumento: values.numero_documento,
        lugarExpedicion: values.lugar_expedicion,
        fechaNacimiento: values.fecha_nacimiento?.toISOString(),
        lugarNacimiento: values.lugar_nacimiento,
        telefonoLlamadas: values.telefono_llamadas,
        telefonoWhatsapp: values.telefono_whatsapp,
        eps: values.eps,
        rh: values.rh,
        nombreAcudiente: values.nombre_acudiente,
        tipoDocumentoAcudiente: values.tipo_documento_acudiente,
        telefonoAcudiente: values.telefono_acudiente,
        direccionAcudiente: values.direccion_acudiente,
        simat: values.simat,
        estadoMatricula: values.estado_matricula,
        coordinador: values.coordinador,
        activo: values.activo,
        matricula: values.matricula,
        modalidad_estudio: values.modalidad_estudio,
        ultimo_curso_visto: values.ultimo_curso_visto,
      };

      const response = await axios.put(
        `https://back.app.validaciondebachillerato.com.co/api/students/${student.id}`,
        formattedValues
      );

      setStudent(response.data);
      setIsEditing(false);
      message.success('Estudiante actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar el estudiante:', error);
      message.error('Error al actualizar el estudiante');
    }
  };

  const renderEditableField = (name, options = {}) => {
    const { type = 'text', selectOptions = [], label } = options;

    if (name === 'email') {
      return (
        <Form.Item
          name={name}
          label={label}
          rules={[
            { type: 'email', message: 'Por favor ingrese un correo electrónico válido' },
          ]}
        >
          <Input placeholder="correo@ejemplo.com" allowClear />
        </Form.Item>
      );
    }

    if (type === 'select') {
      return (
        <Form.Item name={name} label={label}>
          <Select style={{ width: '100%' }} allowClear>
            {selectOptions.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      );
    } else if (type === 'date') {
      return (
        <Form.Item name={name} label={label}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>
      );
    } else if (type === 'number') {
      return (
        <Form.Item name={name} label={label}>
          <InputNumber
            style={{ width: '100%' }}
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>
      );
    }
    return (
      <Form.Item name={name} label={label}>
        <Input allowClear />
      </Form.Item>
    );
  };

  const renderField = (label, value, name, options = {}) => {
    return (
      <div style={{ marginBottom: '16px' }}>
        <Text strong style={{ display: 'block', marginBottom: '4px' }}>
          {label}
        </Text>
        {isEditing ? (
          renderEditableField(name, { ...options, label })
        ) : (
          <Text>{value || 'No especificado'}</Text>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Cargando...</Text>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>No se encontraron datos del estudiante</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100%' }}>
      {/* Encabezado del perfil */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <Row align="middle" gutter={[16, 16]}>
          <Col>
            <Avatar
              size={80}
              icon={<FaUserGraduate />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Col>
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>
              {student.nombre} {student.apellido}
            </Title>
            <Space>
              <Text type="secondary">{student.programa_nombre}</Text>
              <Text
                style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  background: student.activo ? '#e6ffed' : '#fff1f0',
                  color: student.activo ? '#389e0d' : '#cf1322',
                }}
              >
                {student.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              {!isEditing && (
                <Button
                  type="primary"
                  icon={<FaUserEdit />}
                  onClick={handleStartEditing}
                >
                  Editar
                </Button>
              )}
              {isEditing && (
                <Button
                  type="primary"
                  icon={<FaSave />}
                  onClick={handleSave}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Guardar
                </Button>
              )}
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
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
              >
                WhatsApp
              </Button>
              <Button
                icon={<FaTrashAlt />}
                onClick={handleDelete}
                danger
                disabled={isEditing}
              >
                Eliminar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Contenido del perfil */}
      <Form form={form} layout="vertical">
        <Row gutter={[24, 24]}>
          {/* Información Personal */}
          <Col xs={24} md={12}>
            <Card
              title="Información Personal"
              style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              {renderField(
                'Tipo de Documento',
                student.tipo_documento,
                'tipo_documento',
                {
                  type: 'select',
                  selectOptions: [
                    { value: 'CC', label: 'Cédula de Ciudadanía' },
                    { value: 'TI', label: 'Tarjeta de Identidad' },
                    { value: 'CE', label: 'Cédula de Extranjería' },
                  ],
                }
              )}
              {renderField('Número de Documento', student.numero_documento, 'numero_documento')}
              {renderField('Nombre', student.nombre, 'nombre')}
              {renderField('Apellido', student.apellido, 'apellido')}
              {renderField('Lugar de Expedición', student.lugar_expedicion, 'lugar_expedicion')}
              {renderField('Lugar de Nacimiento', student.lugar_nacimiento, 'lugar_nacimiento')}
              {renderField('Fecha de Nacimiento', formatDate(student.fecha_nacimiento), 'fecha_nacimiento', { type: 'date' })}
              {renderField('EPS', student.eps, 'eps')}
              {renderField('RH', student.rh, 'rh')}
              {renderField('SIMAT', student.simat, 'simat')}
            </Card>
          </Col>

          {/* Información de Contacto */}
          <Col xs={24} md={12}>
            <Card
              title="Información de Contacto"
              style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              {renderField('Email', student.email, 'email')}
              {renderField('Teléfono Llamadas', student.telefono_llamadas, 'telefono_llamadas')}
              {renderField('Teléfono WhatsApp', student.telefono_whatsapp, 'telefono_whatsapp')}
            </Card>
          </Col>

          {/* Información Académica */}
          <Col xs={24}>
            <Card
              title="Información Académica"
              style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  {isEditing ? (
                    renderField('Programa', null, 'programa_nombre', {
                      type: 'select',
                      selectOptions: programs.map((program) => ({
                        value: program.nombre,
                        label: program.nombre,
                      })),
                    })
                  ) : (
                    renderField('Programa', student.programa_nombre, 'programa_nombre')
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Coordinador',
                    <span className={getCoordinatorStyle(student.coordinador)}>
                      {student.coordinador}
                    </span>,
                    'coordinador'
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Estado',
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: student.activo ? '#e6ffed' : '#fff1f0',
                        color: student.activo ? '#389e0d' : '#cf1322',
                      }}
                    >
                      {student.activo ? 'Activo' : 'Inactivo'}
                    </span>,
                    'activo',
                    {
                      type: 'select',
                      selectOptions: [
                        { value: true, label: 'Activo' },
                        { value: false, label: 'Inactivo' },
                      ],
                    }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Estado Matrícula',
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: student.estado_matricula ? '#e6ffed' : '#fefcbf',
                        color: student.estado_matricula ? '#389e0d' : '#d46b08',
                      }}
                    >
                      {student.estado_matricula ? 'Pago' : 'Pendiente'}
                    </span>,
                    'estado_matricula',
                    {
                      type: 'select',
                      selectOptions: [
                        { value: true, label: 'Pago' },
                        { value: false, label: 'Pendiente' },
                      ],
                    }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Valor Matrícula',
                    `$${student.matricula?.toLocaleString() || 'No especificado'}`,
                    'matricula',
                    { type: 'number' }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Modalidad',
                    student.modalidad_estudio,
                    'modalidad_estudio',
                    {
                      type: 'select',
                      selectOptions: [
                        { value: 'Clases en Linea', label: 'Clases en Linea' },
                        { value: 'Modulos por WhastApp', label: 'Modulos por WhastApp' },
                      ],
                    }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Fecha de Inscripción',
                    formatDate(student.fecha_inscripcion),
                    'fecha_inscripcion',
                    { type: 'date' }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Fecha de Graduación',
                    formatDate(student.fecha_graduacion),
                    'fecha_graduacion',
                    { type: 'date' }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField('Último Curso Visto', student.ultimo_curso_visto, 'ultimo_curso_visto')}
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Información del Acudiente */}
          <Col xs={24}>
            <Card
              title="Información del Acudiente"
              style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  {renderField('Nombre', student.nombre_acudiente, 'nombre_acudiente')}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField(
                    'Tipo de Documento',
                    student.tipo_documento_acudiente,
                    'tipo_documento_acudiente',
                    {
                      type: 'select',
                      selectOptions: [
                        { value: 'CC', label: 'Cédula de Ciudadanía' },
                        { value: 'CE', label: 'Cédula de Extranjería' },
                        { value: 'PASAPORTE', label: 'Pasaporte' },
                      ],
                    }
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField('Teléfono', student.telefono_acudiente, 'telefono_acudiente')}
                </Col>
                <Col xs={24} sm={12}>
                  {renderField('Dirección', student.direccion_acudiente, 'direccion_acudiente')}
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default StudentDetails;