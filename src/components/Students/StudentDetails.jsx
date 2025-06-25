import React, { useState, useEffect, useCallback } from 'react';
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
  Tag, // Importar Tag para mostrar múltiples programas
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
// import { getPrograms } from '../../services/studentService'; // YA NO ES NECESARIO

const { Title, Text } = Typography;
const { Option } = Select;

const StudentDetails = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  // No necesitamos un estado 'programs' separado ya que vienen con el estudiante
  // const [programs, setPrograms] = useState([]);

  // Función para formatear fechas (memorizada con useCallback)
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'No especificado';
    return dayjs(dateString).format('DD [de] MMMM [de] YYYY'); // Usar dayjs para formatear
  }, []);

  // Obtener datos del estudiante (ahora incluye programas)
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await axios.get(
          `https://back.app.validaciondebachillerato.com.co/api/students/${studentId}`
        );
        const studentData = response.data;

        setStudent(studentData);
        form.setFieldsValue({
          ...studentData,
          fecha_nacimiento: studentData.fecha_nacimiento
            ? dayjs(studentData.fecha_nacimiento)
            : null,
          fecha_inscripcion: studentData.fecha_inscripcion
            ? dayjs(studentData.fecha_inscripcion)
            : null,
          fecha_graduacion: studentData.fecha_graduacion
            ? dayjs(studentData.fecha_graduacion)
            : null,
          // Para el formulario de edición, si solo un programa se puede editar,
          // puedes inicializar con el ID del primer programa o ajustar la lógica
          // Si es edición de múltiples programas, necesitarías un componente de selección múltiple
          programas_asociados_ids: studentData.programas_asociados?.map(p => p.programa_id) || [],
        });
      } catch (error) {
        console.error('Error al cargar el estudiante:', error);
        message.error('Error al cargar los datos del estudiante');
      } finally {
        setLoading(false);
      }
    };

    // Ya no es necesario cargar los programas por separado aquí
    // const fetchPrograms = async () => { /* ... */ };

    fetchStudent();
    // fetchPrograms(); // Eliminar esta llamada
  }, [studentId, form]); // Eliminar 'programs' de las dependencias

  // Aunque esta función no usa student ni programs, mantenerla para el estilo Tailwind
  const getCoordinatorStyle = useCallback((coordinator) => {
    // Si necesitas dinámicamente un estilo de Ant Design, se vería algo así:
    // const colors = { 'Coord1': 'blue', 'Coord2': 'green' };
    // return { color: colors[coordinator] || 'default' };
    return 'px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800';
  }, []);

  // Funciones de acciones (sin cambios relevantes en la lógica, solo para contexto)
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
      // Al iniciar edición, si se editarán los programas asociados,
      // el campo del formulario debe tener los IDs de los programas actuales
      programas_asociados_ids: student.programas_asociados?.map(p => p.programa_id) || [],
    });
    // Necesitas cargar la lista completa de programas disponibles para el Select Multi
    // Si `getPrograms` sigue siendo necesaria para la lista completa de opciones
    // para el SELECT, entonces mantendrías esa llamada en un useEffect separado o aquí.
    // Asumimos que programs se refiere a la lista de opciones para el SELECT de edición.
    // Si la lista de programas posibles es estática o viene de otro lado, ajusta.
    // Si `getPrograms` es un servicio real que te devuelve todos los programas disponibles
    // para asignar, deberías llamarlo al montar el componente o al iniciar la edición.
    // Por simplicidad, asumo que 'programs' ya está cargado con la lista de todos los programas
    // disponibles para seleccionar en el formulario.
    // Si 'getPrograms' es para la lista de todos los programas disponibles para seleccionar, mantenla.
    // Si no la tienes disponible globalmente, deberías hacer la llamada aquí:
    // getPrograms().then(data => setPrograms(data)).catch(err => message.error('Error al cargar programas para edición'));

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
        ...values, // Incluye todos los valores del formulario
        fecha_nacimiento: values.fecha_nacimiento?.toISOString(),
        fecha_inscripcion: values.fecha_inscripcion?.toISOString(),
        fecha_graduacion: values.fecha_graduacion?.toISOString(),
        // Si el backend espera 'programa_nombre' como antes para un solo programa,
        // o si ahora espera un array de IDs para 'programas_asociados'.
        // Aquí debes ajustar `formattedValues` para que coincida con lo que tu backend espera
        // al actualizar los programas de un estudiante.
        // Por ejemplo, si el backend espera un array de IDs en 'program_ids':
        // program_ids: values.programas_asociados_ids,
        // Y si 'programa_nombre' ya no es un campo directo del estudiante en la DB, elimínalo.
      };

      // Si necesitas enviar los IDs de los programas asociados:
      // Elimina 'programa_nombre' de formattedValues si ya no es un campo directo
      delete formattedValues.programa_nombre; // Si 'programa_nombre' no existe en tu esquema de estudiante
      // Luego, añade la lista de IDs si tu API de actualización lo requiere así:
      // formattedValues.program_ids = values.programas_asociados_ids;
      // Esto dependerá de cómo diseñes tu API de PUT/actualización para los programas.
      // Si tu backend maneja la actualización de programas a través de otro endpoint o una estructura específica,
      // deberás adaptar esta parte.

      const response = await axios.put(
        `https://back.app.validaciondebachillerato.com.co/api/students/${student.id}`,
        formattedValues
      );

      setStudent(response.data); // Asume que la API de actualización devuelve el estudiante actualizado con programas
      setIsEditing(false);
      message.success('Estudiante actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar el estudiante:', error);
      message.error('Error al actualizar el estudiante');
    }
  };


  // Renderizado condicional de campos editables
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
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    } else if (type === 'multiselect') { // Nuevo tipo para selección múltiple de programas
        return (
            <Form.Item name={name} label={label}>
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Seleccione programas"
                    allowClear
                    // Esto asume que `programs` contiene la lista de todos los programas disponibles
                    // con `id` y `nombre` como propiedades.
                >
                    {/* Asegúrate de que `programs` esté disponible aquí y tenga la estructura correcta */}
                    {/* Si `getPrograms` es necesaria para llenar estas opciones, debes invocarla en un `useEffect` */}
                    {programs.map((program) => (
                        <Option key={program.id} value={program.id}>
                            {program.nombre}
                        </Option>
                    ))}
                </Select>
            </Form.Item>
        );
    }
    else if (type === 'date') {
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

  // Renderizado de campos en modo vista/edición
  const renderField = (label, value, name, options = {}) => {
    return (
      <div style={{ marginBottom: '16px' }}>
        <Text strong style={{ display: 'block', marginBottom: '4px' }}>
          {label}
        </Text>
        {isEditing ? (
          renderEditableField(name, { ...options, label })
        ) : (
          // Si el valor es ReactNode (como un Tag o Space), renderizarlo directamente
          typeof value === 'object' && value !== null ? value : <Text>{value || 'No especificado'}</Text>
        )}
      </div>
    );
  };

  // Renderizado del componente
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
            <Space wrap> {/* Usar wrap para que los tags salten de línea si es necesario */}
              {/* Mostrar todos los programas asociados */}
              {student.programas_asociados && student.programas_asociados.length > 0 ? (
                student.programas_asociados.map((programa, index) => (
                  <Tag key={programa.programa_id || index} color="blue">
                    {programa.nombre_programa}
                  </Tag>
                ))
              ) : (
                <Text type="secondary">Sin programas</Text>
              )}
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
                  {/* Vista de programas asociados */}
                  {!isEditing ? (
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                        Programas
                      </Text>
                      <Space wrap>
                        {student.programas_asociados && student.programas_asociados.length > 0 ? (
                          student.programas_asociados.map((programa, index) => (
                            <Tag key={programa.programa_id || index} color="blue">
                              {programa.nombre_programa}
                            </Tag>
                          ))
                        ) : (
                          <Text>No especificado</Text>
                        )}
                      </Space>
                    </div>
                  ) : (
                    // Formulario de edición para programas (con Select múltiple)
                    // ASUMO que 'programs' (la lista de todos los programas disponibles)
                    // se carga de alguna manera o se pasa como prop.
                    // Si `getPrograms` es la función para esto, DEBE LLAMARSE.
                    renderEditableField('programas_asociados_ids', {
                      label: 'Programas',
                      type: 'multiselect', // Nuevo tipo
                      // selectOptions no es necesario aquí si renderEditableField lo toma de 'programs'
                    })
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