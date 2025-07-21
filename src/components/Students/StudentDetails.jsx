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
    Tag,
    Spin, // Importar Spin para el loading
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
// Asumo que tienes una forma de obtener todos los programas disponibles para el multiselect
// Si no, necesitarás una ruta en tu backend para esto, por ejemplo: GET /api/programs
// Por ahora, lo dejaré comentado, pero si lo necesitas, avisame y lo implementamos.
// import { getAllProgramsAvailable } from '../../services/programService'; // <- Necesitarías crear esto

const { Title, Text } = Typography;
const { Option } = Select;

const StudentDetails = ({ studentId }) => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [isEditing, setIsEditing] = useState(false);
    const [allPrograms, setAllPrograms] = useState([]); // Nuevo estado para todos los programas disponibles

    // Función para formatear fechas (memorizada con useCallback)
    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'No especificado';
        return dayjs(dateString).format('DD [de] MMMM [de] YYYY');
    }, []);

    // Función para obtener todos los programas disponibles (para el multiselect de edición)


    // Obtener datos del estudiante y, si estamos editando, también todos los programas
    useEffect(() => {
        const fetchStudentData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    `https://clasit-backend-api-570877385695.us-central1.run.app/api/students/${studentId}`
                );
                const studentData = response.data;
                setStudent(studentData);

                form.setFieldsValue({
                    ...studentData,
                    fecha_nacimiento: studentData.fecha_nacimiento ? dayjs(studentData.fecha_nacimiento) : null,
                    fecha_inscripcion: studentData.fecha_inscripcion ? dayjs(studentData.fecha_inscripcion) : null,
                    fecha_graduacion: studentData.fecha_graduacion ? dayjs(studentData.fecha_graduacion) : null,
                    // Inicializar el campo de programas asociados para el formulario de edición
                    programas_asociados_ids: studentData.programas_asociados?.map(p => p.programa_id) || [],
                });

                // Cargar todos los programas si estamos en modo edición o si vamos a necesitarlo para el componente de pagos
                // Mejor cargar allPrograms una vez al inicio del componente o al iniciar la edición
                // if (isEditing) { // O puedes cargarlo siempre si es un componente de gestión de estudiantes
           
                // }

            } catch (error) {
                console.error('Error al cargar el estudiante:', error);
                message.error('Error al cargar los datos del estudiante');
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, [studentId, form]); // Añadida `form` a las dependencias de `useEffect`

    const getCoordinatorStyle = useCallback((coordinator) => {
        return 'px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800';
    }, []);

    const handleGraduate = async () => {
        Modal.confirm({
            title: '¿Confirmar graduación del estudiante?',
            content: 'Esta acción marcará al estudiante como graduado.',
            onOk: async () => {
                try {
                    await axios.put(
                        `https://clasit-backend-api-570877385695.us-central1.run.app/api/students/${student.id}/graduate`
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
                        `https://clasit-backend-api-570877385695.us-central1.run.app/api/students/${student.id}`
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
        if (!phoneNumber.startsWith('57')) phoneNumber = `57${phoneNumber}`; // Asumiendo código de país de Colombia
        window.open(`https://wa.me/${phoneNumber}`, '_blank');
    };

    const handleStartEditing = () => {
        setIsEditing(true);
        // El `form.setFieldsValue` ya se hace en el `useEffect` cuando se carga el estudiante,
        // asegurando que `programas_asociados_ids` esté inicializado.
        // Asegúrate de que `allPrograms` ya esté cargado para el multiselect.
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
                ...values,
                fecha_nacimiento: values.fecha_nacimiento?.toISOString(),
                fecha_inscripcion: values.fecha_inscripcion?.toISOString(),
                fecha_graduacion: values.fecha_graduacion?.toISOString(),
                // Aquí es CLAVE cómo manejas `programas_asociados_ids`
                // Tu backend deberá tener un endpoint o lógica específica para actualizar
                // los programas asociados a un estudiante en la tabla `estudiante_programas`.
                // Por ejemplo, podrías enviar un array de IDs de programas, y el backend
                // se encargaría de sincronizar `estudiante_programas`.
                // Este `program_ids` es solo un ejemplo de cómo podrías nombrarlo.
                program_ids: values.programas_asociados_ids, // Enviar los IDs seleccionados
            };

            // Eliminar campos que no van directamente en la tabla students o que se manejan aparte
            delete formattedValues.programas_asociados_ids; // Esto se envía como `program_ids`
            delete formattedValues.programas_asociados; // Esta es solo una propiedad de visualización
            delete formattedValues.coordinador_nombre; // Es un join, no un campo directo
            delete formattedValues.monto_programa; // Es una propiedad de los programas, no del estudiante

            const response = await axios.put(
                `https://clasit-backend-api-570877385695.us-central1.run.app/api/students/${student.id}`,
                formattedValues
            );

            // IMPORTANTE: Después de guardar, vuelve a cargar el estudiante
            // para reflejar los cambios en `programas_asociados`
            // (asumiendo que tu API de `getStudent` devuelve `programas_asociados` actualizados)
            const updatedStudentResponse = await axios.get(
                `https://clasit-backend-api-570877385695.us-central1.run.app/api/students/${studentId}`
            );
            setStudent(updatedStudentResponse.data);

            setIsEditing(false);
            message.success('Estudiante actualizado exitosamente');
        } catch (error) {
            console.error('Error al actualizar el estudiante:', error.response?.data || error.message);
            message.error('Error al actualizar el estudiante: ' + (error.response?.data?.error || 'Verifica la consola para más detalles.'));
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
                            <Option key={String(opt.value)} value={opt.value}> {/* Convertir key a string */}
                                {opt.label}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            );
        } else if (type === 'multiselect') {
            return (
                <Form.Item name={name} label={label}>
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="Seleccione programas"
                        allowClear
                    >
                        {allPrograms.map((program) => ( // Usar allPrograms aquí
                            <Option key={program.id} value={program.id}>
                                {program.nombre}
                            </Option>
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

    // Renderizado de campos en modo vista/edición
    const renderField = (label, value, name, options = {}) => {
        return (
            <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                    {label}
                </Text>
                {isEditing ? (
                    // Excluir 'programas_asociados' de la edición directa aquí,
                    // ya que se maneja con el multiselect 'programas_asociados_ids'
                    name !== 'programas_asociados' ? renderEditableField(name, { ...options, label }) : null
                ) : (
                    typeof value === 'object' && value !== null && !Array.isArray(value) ? value : <Text>{value || 'No especificado'}</Text>
                )}
            </div>
        );
    };

    // Renderizado del componente
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
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
                        <Space wrap>
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
                            <Tag
                                color={student.activo ? 'green' : 'red'}
                            >
                                {student.activo ? 'Activo' : 'Inactivo'}
                            </Tag>
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
                            {/* Ruta de pagos actualizada para ser coherente con el nuevo router */}
                            <Link to={`/inicio/payments/student/${student.id}`}>
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
                            {renderField('SIMAT', student.simat, 'simat', { type: 'select', selectOptions: [{ value: true, label: 'Sí' }, { value: false, label: 'No' }] })}
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
                                        renderEditableField('programas_asociados_ids', {
                                            label: 'Programas Asociados',
                                            type: 'multiselect',
                                            // allPrograms se pasa implícitamente a renderEditableField
                                        })
                                    )}
                                </Col>
                                <Col xs={24} sm={12}>
                                    {renderField(
                                        'Coordinador',
                                        // CAMBIO AQUÍ: Usar student.coordinador_nombre
                                        <span className={getCoordinatorStyle(student.coordinador_nombre)}>
                                            {student.coordinador_nombre}
                                        </span>,
                                        'coordinador_nombre', // Asegúrate de que este sea el nombre del campo si es editable
                                        // Si 'coordinador_nombre' fuera editable y quisieras un select,
                                        // necesitarías cargar las opciones de coordinadores y pasarlas aquí:
                                        // { type: 'select', selectOptions: /* Tus opciones de coordinadores */ }
                                    )}
                                </Col>
                                <Col xs={24} sm={12}>
                                    {renderField(
                                        'Estado',
                                        <Tag color={student.activo ? 'green' : 'red'}>
                                            {student.activo ? 'Activo' : 'Inactivo'}
                                        </Tag>,
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
                                        <Tag color={student.estado_matricula ? 'green' : 'orange'}>
                                            {student.estado_matricula ? 'Pago' : 'Pendiente'}
                                        </Tag>,
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