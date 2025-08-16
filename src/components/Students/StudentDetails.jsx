import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Input, Select, DatePicker, message, InputNumber, Modal, Avatar, Typography, Spin, Tag } from 'antd';
import { FaUserEdit, FaSave, FaTrashAlt, FaWhatsapp, FaGraduationCap, FaFileInvoiceDollar, FaUserGraduate } from 'react-icons/fa';
import dayjs from 'dayjs';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_BACKEND;

const { Title, Text } = Typography;
const { Option } = Select;


const InfoSection = ({ title, children }) => (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 bg-slate-50 px-4 py-2 border-b border-slate-200 rounded-t-md">
            {title}
        </h3>
        <div className="p-4 space-y-3">
            {children}
        </div>
    </div>
);


const EditableField = ({ label, value, isEditing, name, type = 'text', options = [] }) => {
    let displayValue = value || <span className="text-slate-400">No especificado</span>;
    if (type === 'date' && value) {
        displayValue = dayjs(value).format('DD/MM/YYYY');
    }
    if (type === 'money' && value) {
        displayValue = `$${Number(value).toLocaleString()}`;
    }

    const renderInput = () => {
        switch (type) {
            case 'select':
                return (
                    <Select placeholder={`Seleccionar ${label}`} allowClear>
                        {options.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                    </Select>
                );
            case 'multiselect':
                return (
                    <Select mode="multiple" placeholder="Seleccione programas" allowClear>
                        {options.map(opt => <Option key={opt.id} value={opt.id}>{opt.nombre}</Option>)}
                    </Select>
                );
            case 'date':
                return <DatePicker format="YYYY-MM-DD" className="w-full" />;
            case 'money':
                return <InputNumber formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} className="w-full" />;
            default:
                return <Input placeholder={label} allowClear />;
        }
    };

    return (
        <div className="grid grid-cols-3 gap-2 items-center">
            <Text className="text-xs text-slate-500 font-semibold col-span-1">{label}</Text>
            <div className="col-span-2">
                {isEditing ? (
                    <Form.Item name={name} className="!mb-0">
                        {renderInput()}
                    </Form.Item>
                ) : (
                    <Text className="text-sm text-slate-800">{displayValue}</Text>
                )}
            </div>
        </div>
    );
};

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

    const fetchStudentData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/students/${studentId}`);
            const studentData = response.data;
            setStudent(studentData);
            form.setFieldsValue({
                ...studentData,
                fecha_nacimiento: studentData.fecha_nacimiento ? dayjs(studentData.fecha_nacimiento) : null,
                fecha_inscripcion: studentData.fecha_inscripcion ? dayjs(studentData.fecha_inscripcion) : null,
                fecha_graduacion: studentData.fecha_graduacion ? dayjs(studentData.fecha_graduacion) : null,
                programasIds: studentData.programas_asociados?.map(p => p.programa_id) || [],
            });
        } catch (error) {
            message.error('Error al cargar los datos del estudiante');
        } finally {
            setLoading(false);
        }
    }, [studentId, form]);
    // Obtener datos del estudiante y, si estamos editando, también todos los programas
    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);


    const fetchUserAssignablePrograms = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            message.error("No se pudo encontrar el ID de usuario.");
            return;
        }
        try {
            const response = await axios.get(`${API_URL}/inventario/user/${userId}`);
            setAllPrograms(response.data);
        } catch (error) {
            message.error('No se pudo cargar la lista de programas.');
        }
    };

    const getCoordinatorStyle = useCallback((coordinator) => {
        return 'px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800';
    }, []);

    const handleGraduate = async () => {
        Modal.confirm({
            title: '¿Confirmar graduación del estudiante?',
            content: 'Esta acción marcará al estudiante como graduado.',
            onOk: async () => {
                try {
                    await axios.put
                        (`${API_URL}/students/${student.id}/graduate`
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
                    await axios.delete(`${API_URL}/students/${student.id}`
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
        fetchUserAssignablePrograms();
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            // 1. Obtenemos los valores del formulario. 'values' ya contiene 'programasIds' con el array de IDs.
            const values = await form.validateFields();

            // 2. Creamos el objeto para enviar al backend.
            // Usamos el spread operator (...) para copiar todos los valores del formulario.
            // 'programasIds' ya está incluido aquí correctamente.
            const formattedValues = {
                ...values,
                // Formateamos las fechas como antes
                fecha_nacimiento: values.fecha_nacimiento?.toISOString(),
                fecha_inscripcion: values.fecha_inscripcion?.toISOString(),
                fecha_graduacion: values.fecha_graduacion?.toISOString(),
            };

            // 3. (Opcional pero recomendado) Eliminamos campos que no deben ser actualizados en la tabla 'students'.
            //    Tu backend podría ignorarlos, pero es más limpio no enviarlos.
            delete formattedValues.programas_asociados; // Este es un objeto de visualización
            delete formattedValues.coordinador_nombre;   // Este viene de un JOIN
            delete formattedValues.monto_programa;      // Propiedad del programa, no del estudiante

            // Para depurar, puedes verificar aquí lo que estás enviando:
            console.log('Enviando al backend:', formattedValues);

            // 4. Enviamos la petición PUT con los datos correctos.
            await axios.put(`${API_URL}/students/${student.id}`, formattedValues);

            // Refrescamos los datos del estudiante para mostrar la información actualizada
            await fetchStudentData();

            setIsEditing(false);
            message.success('Estudiante actualizado exitosamente');

        } catch (error) {
            // Manejo de errores mejorado para dar más contexto
            const errorMessage = error.response?.data?.error || 'Ocurrió un error inesperado.';
            console.error('Error al actualizar el estudiante:', error.response || error);
            message.error(`Error al actualizar: ${errorMessage}`);
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
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6">
            <Form form={form} layout="vertical">
                {/* --- ENCABEZADO --- */}
                <header className="bg-white p-4 rounded-md border border-slate-200 mb-6 shadow-sm">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar size={64} icon={<FaUserGraduate />} className="!bg-blue-500" />
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 m-0">{student.nombre} {student.apellido}</h1>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Tag color={student.activo ? 'green' : 'red'}>{student.activo ? 'Activo' : 'Inactivo'}</Tag>
                                    <Tag color={student.estado_matricula ? 'cyan' : 'orange'}>{student.estado_matricula ? 'Matrícula Paga' : 'Matrícula Pendiente'}</Tag>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                                <>
                                    <Button onClick={() => setIsEditing(false)}>Cancelar</Button>
                                    <Button type="primary" icon={<FaSave />} onClick={handleSave}>Guardar</Button>
                                </>
                            ) : (
                                <>
                                    <Button type="primary" icon={<FaUserEdit />} onClick={handleStartEditing}>Editar</Button>
                                    <Button icon={<FaWhatsapp />} onClick={handleWhatsAppClick} className="!bg-green-500 !border-green-500 hover:!bg-green-600 !text-white">WhatsApp</Button>
                                    <Button icon={<FaTrashAlt />} danger onClick={handleDelete}>Eliminar</Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* --- CUERPO PRINCIPAL (GRID) --- */}
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* --- COLUMNA 1 --- */}
                    <div className="space-y-6">
                        <InfoSection title="Información Personal">
                            <EditableField label="Nombre" value={student.nombre} name="nombre" isEditing={isEditing} />
                            <EditableField label="Apellido" value={student.apellido} name="apellido" isEditing={isEditing} />
                            <EditableField label="Tipo Doc." value={student.tipo_documento} name="tipo_documento" isEditing={isEditing} type="select" options={[{ value: 'CC', label: 'Cédula' }, { value: 'TI', label: 'Tarjeta de Identidad' }, { value: 'CE', label: 'Cédula Extranjería' }]} />
                            <EditableField label="Num. Doc." value={student.numero_documento} name="numero_documento" isEditing={isEditing} />
                            <EditableField label="Fecha de Nac." value={student.fecha_nacimiento} name="fecha_nacimiento" isEditing={isEditing} type="date" />
                            <EditableField label="Lugar de Nac." value={student.lugar_nacimiento} name="lugar_nacimiento" isEditing={isEditing} />
                            <EditableField label="Lugar de Exp." value={student.lugar_expedicion} name="lugar_expedicion" isEditing={isEditing} />
                        </InfoSection>

                        <InfoSection title="Información de Contacto">
                            <EditableField label="Email" value={student.email} name="email" isEditing={isEditing} />
                            <EditableField label="Tel. Llamadas" value={student.telefono_llamadas} name="telefono_llamadas" isEditing={isEditing} />
                            <EditableField label="Tel. WhatsApp" value={student.telefono_whatsapp} name="telefono_whatsapp" isEditing={isEditing} />
                        </InfoSection>
                    </div>

                    {/* --- COLUMNA 2 --- */}
                    <div className="space-y-6">
                        <InfoSection title="Información Académica y Administrativa">
                            <EditableField label="Programas" value={
                                <div className="flex flex-wrap gap-1">
                                    {student.programas_asociados?.map(p => <Tag color="blue" key={p.programa_id}>{p.nombre_programa}</Tag>)}
                                </div>
                            } name="programasIds" isEditing={isEditing} type="multiselect" options={allPrograms} />
                            <EditableField label="Modalidad" value={student.modalidad_estudio} name="modalidad_estudio" isEditing={isEditing} type="select" options={[{ value: 'Clases en Linea', label: 'En Línea' }, { value: 'Modulos por WhastApp', label: 'Módulos por WhatsApp' }]} />
                            <EditableField label="Coordinador" value={student.coordinador_nombre} name="coordinador_id" isEditing={isEditing} type="select" options={[] /* Aquí deberías cargar la lista de coordinadores */} />
                            <EditableField label="Último Curso Visto" value={student.ultimo_curso_visto} name="ultimo_curso_visto" isEditing={isEditing} />
                            <EditableField label="Valor Matrícula" value={student.matricula} name="matricula" isEditing={isEditing} type="money" />
                            <EditableField label="SIMAT" value={student.simat ? 'Sí' : 'No'} name="simat" isEditing={isEditing} type="select" options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} />
                        </InfoSection>

                        <InfoSection title="Información de Acudiente">
                            <EditableField label="Nombre Acudiente" value={student.nombre_acudiente} name="nombre_acudiente" isEditing={isEditing} />
                            <EditableField label="Tel. Acudiente" value={student.telefono_acudiente} name="telefono_acudiente" isEditing={isEditing} />
                            <EditableField label="Dirección Acudiente" value={student.direccion_acudiente} name="direccion_acudiente" isEditing={isEditing} />
                        </InfoSection>
                    </div>

                    {/* --- COLUMNA 3 (Acciones y Fechas) --- */}
                    <div className="space-y-6">
                        <InfoSection title="Estado y Fechas Clave">
                            <EditableField label="Fecha Inscripción" value={student.fecha_inscripcion} name="fecha_inscripcion" type="date" isEditing={isEditing} />
                            <EditableField label="Fecha Graduación" value={student.fecha_graduacion} name="fecha_graduacion" type="date" isEditing={isEditing} />
                        </InfoSection>

                        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4">Acciones Rápidas</h3>
                            <div className="space-y-2">
                                <Link to={`/inicio/payments/student/${student.id}`} className="w-full">
                                    <Button icon={<FaFileInvoiceDollar />} disabled={isEditing} className="w-full">Ver Pagos del Estudiante</Button>
                                </Link>
                                <Button icon={<FaGraduationCap />} onClick={handleDelete} disabled={student.fecha_graduacion || isEditing} className="w-full">Marcar como Graduado</Button>
                            </div>
                        </div>
                    </div>
                </main>
            </Form>
        </div>
    );
};


export default StudentDetails;