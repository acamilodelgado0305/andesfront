// src/components/PublicForms/StudentRegistrationFormMarily.jsx
import React, { useState, useEffect } from "react";
import { Form, Input, Select, DatePicker, Button, message, Steps, Spin } from "antd";
import { UserOutlined, PhoneOutlined, IdcardOutlined, BookOutlined, CalendarOutlined } from "@ant-design/icons";
import moment from 'moment'; // Importa moment para el manejo de fechas

const { Option } = Select;
const { Step } = Steps;

// --- Definir el ID del coordinador predeterminado (ID 3) ---
const DEFAULT_COORDINATOR_ID = 6; 

// --- Función auxiliar para obtener el inventario del usuario ---
// Esta función es la que realiza la petición a /api/inventario/user/:userId.
// Se asume que este endpoint está configurado en tu backend para permitir
// la consulta del inventario del usuario con ID 3 sin necesidad de autenticación JWT
// para este formulario público.
const getInventarioByUser = async (userId) => {
    const API_BASE_URL = import.meta.env.VITE_API_BACKEND || "https://back.app.validaciondebachillerato.com.co";
    try {
        console.log(`Intentando cargar inventario para user ID: ${userId} desde ${API_BASE_URL}/api/programas`);
        const response = await fetch(`${API_BASE_URL}/api/programas`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Inventario cargado exitosamente:", data);
            return Array.isArray(data) ? data : []; 
        } else {
            const errorData = await response.json().catch(() => ({})); 
            console.error(`Error al obtener el inventario del usuario ${userId}:`, errorData);
            throw new Error(errorData.error || response.statusText || "Error desconocido al cargar el inventario.");
        }
    } catch (err) {
        console.error(`Error de conexión al cargar el inventario del usuario ${userId}:`, err);
        throw err;
    }
};


const StudentRegistrationFormMarily = ({ onStudentRegistered }) => {
    const [form] = Form.useForm();
    const [programas, setProgramas] = useState([]);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingPrograms, setLoadingPrograms] = useState(true); 
    const [currentStep, setCurrentStep] = useState(0); 

    // Efecto para cargar los programas del coordinador predeterminado (ID 3)
    useEffect(() => {
        const fetchProgramsData = async () => {
            setLoadingPrograms(true);
            try {
                const data = await getInventarioByUser(DEFAULT_COORDINATOR_ID); 
                console.log(`Programas cargados para el formulario público (inventario del usuario ${DEFAULT_COORDINATOR_ID}):`, data);
                setProgramas(Array.isArray(data) ? data : []); 
            } catch (err) {
                console.error("Error fetching Programs for public form:", err);
                message.error("Error al cargar los programas disponibles. Intente de nuevo.");
                setProgramas([]); 
            } finally {
                setLoadingPrograms(false);
            }
        };

        fetchProgramsData();
    }, []); // Se ejecuta solo una vez al montar el componente

    // Definición de los pasos del formulario
    const steps = [
        {
            title: 'Intereses Académicos',
            content: (
                <div className="space-y-4">
                    <Form.Item 
                        name="programasIds" 
                        label="¿Qué programa(s) te interesa(n) estudiar?" 
                        rules={[{ required: true, message: 'Por favor selecciona al menos un programa de interés!' }]}
                        tooltip="Puedes seleccionar uno o más programas."
                    >
                        <Select
                            mode="multiple"
                            placeholder="Selecciona tus programas"
                            className="h-10"
                            disabled={loadingPrograms} 
                        >
                            {programas.map((program) => (
                                <Option key={program.id} value={program.id}> 
                                    {program.nombre}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        name="modalidad_estudio" 
                        label="¿Cómo prefieres estudiar?" 
                        rules={[{ required: true, message: 'Por favor selecciona una modalidad de estudio!' }]}
                    >
                        <Select placeholder="Selecciona una modalidad" className="h-10">
                            <Option value="Clases en Linea">Clases en Línea</Option>
                            <Option value="Modulos por WhastApp">Módulos por WhatsApp</Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item 
                        name="ultimoCursoVisto" 
                        label="¿Cuál fue tu último curso o grado aprobado?" 
                        rules={[{ required: true, message: "Por favor selecciona tu último curso aprobado!" }]}
                    >
                        <Select
                            placeholder="Selecciona un curso"
                            className="h-10"
                            style={{ width: "100%" }}
                        >
                            {Array.from({ length: 11 }, (_, index) => {
                                const curso = (index + 1).toString(); 
                                return (
                                    <Option key={curso} value={curso}>
                                        {curso}°
                                    </Option>
                                );
                            })}
                        </Select>
                    </Form.Item>
                </div>
            ),
        },
        {
            title: 'Datos Personales',
            content: (
                <div className="space-y-4">
                    <Form.Item name="nombre" label="Tu Nombre" rules={[{ required: true, message: 'Por favor ingresa tu nombre!' }]}>
                        <Input prefix={<UserOutlined />} className="h-10" />
                    </Form.Item>

                    <Form.Item name="apellido" label="Tu Apellido" rules={[{ required: true, message: 'Por favor ingresa tu apellido!' }]}>
                        <Input className="h-10" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Tu Correo Electrónico"
                        rules={[
                            { required: true, message: 'Por favor ingresa tu correo electrónico!' },
                            { type: "email", message: 'Por favor ingresa un correo electrónico válido!' }
                        ]}
                    >
                        <Input className="h-10" />
                    </Form.Item>

                    <Form.Item
                        name="fechaNacimiento"
                        label="Tu Fecha de Nacimiento"
                        rules={[{ required: true, message: 'Por favor selecciona tu fecha de nacimiento!' }]}
                    >
                        <DatePicker className="w-full h-10" format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item name="lugarNacimiento" label="Tu Lugar de Nacimiento" rules={[{ required: true, message: 'Por favor ingresa tu lugar de nacimiento!' }]}>
                        <Input className="h-10" />
                    </Form.Item>

                    <Form.Item name="telefonoLlamadas" label="Teléfono (Llamadas)" rules={[{ required: true, message: 'Por favor ingresa tu teléfono para llamadas!' }]} help="Solo números, sin espacios ni guiones.">
                        <Input prefix={<PhoneOutlined />} className="h-10" type="number" />
                    </Form.Item>

                    <Form.Item name="telefonoWhatsapp" label="Teléfono (WhatsApp)" rules={[{ required: true, message: 'Por favor ingresa tu teléfono para WhatsApp!' }]} help="Usaremos este número para comunicarnos contigo. Solo números.">
                        <Input prefix={<PhoneOutlined />} className="h-10" type="number" />
                    </Form.Item>
                </div>
            ),
        },
        {
            title: 'Documento', 
            content: (
                <div className="space-y-4">
                    <Form.Item name="tipoDocumento" label="Tipo de Documento" rules={[{ required: true, message: 'Por favor selecciona tu tipo de documento!' }]}>
                        <Select className="h-10">
                            <Option value="CC">Cédula de Ciudadanía</Option>
                            <Option value="TI">Tarjeta de Identidad</Option>
                            <Option value="CE">Cédula Extranjería</Option>
                            <Option value="PA">Pasaporte</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="numeroDocumento"
                        label="Número de Documento (sin puntos ni espacios)"
                        rules={[{ required: true, message: 'Por favor ingresa tu número de documento!' }]}
                    >
                        <Input
                            prefix={<IdcardOutlined />}
                            className="h-10"
                            placeholder="Ejemplo: 1234567890"
                            type="number" 
                        />
                    </Form.Item>

                    <Form.Item
                        name="lugarExpedicion"
                        label="Lugar de Expedición del Documento"
                        rules={[{ required: true, message: 'Por favor ingresa el lugar de expedición!' }]}
                    >
                        <Input className="h-10" />
                    </Form.Item>
                    
                    {/* SIMAT, EPS, RH, y toda la sección de Acudiente ELIMINADOS de la UI */}
                </div>
            ),
        },
    ];

    // Función para avanzar al siguiente paso, con validación de campos del paso actual
    const next = async () => {
        try {
            const currentStepFields = steps[currentStep].content.props.children
                .filter(child => child && child.props && child.props.name) // Filtra solo los Form.Item que tienen 'name'
                .map(child => child.props.name);

            // Valida solo los campos del paso actual
            await form.validateFields(currentStepFields);
            setCurrentStep(currentStep + 1);
        } catch (errorInfo) {
            console.error('Error de validación al avanzar:', errorInfo);
            message.error('Por favor, completa todos los campos requeridos antes de avanzar.');
        }
    };

    // Función para regresar al paso anterior
    const prev = () => {
        setCurrentStep(currentStep - 1);
    };

    // Función para manejar el envío final del formulario
    const handleSubmit = async (values) => {
        setLoadingSubmit(true);
        const apiUrl = import.meta.env.VITE_API_BACKEND
            ? `${import.meta.env.VITE_API_BACKEND}/api/students`
            : "https://clasit-backend-api-570877385695.us-central1.run.app/api/students";

        try {
            // Asegurarse de que `values.fechaNacimiento` es un objeto Moment y formatearlo
            const fechaNacimientoFormatted = values.fechaNacimiento ? values.fechaNacimiento.format("YYYY-MM-DD") : null;
            
            // Asegurarse de que `values.programasIds` es un array y sus elementos son enteros
            // Esta es la lógica crucial replicada del CreateStudentModal para asegurar el formato correcto.
            const programasIdsFormatted = Array.isArray(values.programasIds) ? 
                                          values.programasIds.map(id => parseInt(id, 10)) : 
                                          [];

            // Construir el objeto formattedValues de manera explícita como en CreateStudentModal
            const formattedValues = {
                nombre: values.nombre,
                apellido: values.apellido,
                email: values.email,
                tipoDocumento: values.tipoDocumento,
                numeroDocumento: values.numeroDocumento,
                lugarExpedicion: values.lugarExpedicion, // Este campo sí existe en el formulario
                fechaNacimiento: fechaNacimientoFormatted,
                lugarNacimiento: values.lugarNacimiento,
                telefonoLlamadas: values.telefonoLlamadas,
                telefonoWhatsapp: values.telefonoWhatsapp,
                
                // Estos campos tienen valores fijos o null para el formulario público, y son booleanos/null para la DB
                simat: false, // Siempre false (booleano)
                pagoMatricula: false, // Siempre false (booleano)
                activo: true, // Nuevo estudiante es activo por defecto
                eps: null, // Eliminado de la UI, se envía como null
                rh: null, // Eliminado de la UI, se envía como null
                nombreAcudiente: null, // Eliminado de la UI, se envía como null
                tipoDocumentoAcudiente: null, // Eliminado de la UI, se envía como null
                telefonoAcudiente: null, // Eliminado de la UI, se envía como null
                direccionAcudiente: null, // Eliminado de la UI, se envía como null
                
                // Campos relacionados con programas/modalidad/curso
                programasIds: programasIdsFormatted, // Usar el array de IDs formateado aquí (debería funcionar)
                coordinador_id: DEFAULT_COORDINATOR_ID, // ID del coordinador fijo (3)
                modalidad_estudio: values.modalidad_estudio,
                ultimo_curso_visto: values.ultimoCursoVisto, // Asegurar que el nombre de la propiedad coincida con la DB
                estado_matricula: false, // El backend espera booleano para 'estado_matricula'
            };
            
            console.log("Datos a enviar para registrar estudiante (público, payload final):", formattedValues);
            console.log("URL de la API utilizada:", apiUrl);

            console.log("Iniciando petición fetch para crear estudiante...");

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formattedValues),
            });

            console.log("Petición fetch completada. Estado de respuesta:", response.status);
            console.log("Response OK:", response.ok);

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error("Error response from server:", errorData);
                throw new Error(errorData?.message || `Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log("Success response:", data);

            message.success("¡Registro exitoso! Pronto nos pondremos en contacto contigo.");
            onStudentRegistered?.(); 
            form.resetFields(); 
            setCurrentStep(0); 
        } catch (error) {
            console.error("Error detallado al registrar el estudiante:", {
                message: error.message,
                stack: error.stack,
                values, // Incluir los valores originales del formulario para depuración
            });
            message.error(`Error al registrar el estudiante: ${error.message || "Por favor intente nuevamente"}`);
        } finally {
            setLoadingSubmit(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-lg p-6 text-white text-center">
                <h1 className="text-3xl font-bold mb-2">¡Regístrate como Estudiante!</h1>
                <p className="text-purple-100">Completa este formulario para iniciar tu proceso de inscripción.</p>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6 mt-4">
                <Steps current={currentStep} className="mb-8">
                    {steps.map(item => (
                        <Step key={item.title} title={item.title} />
                    ))}
                </Steps>

                {loadingPrograms ? (
                    <div className="flex justify-center items-center h-64">
                        <Spin size="large" tip="Cargando programas disponibles..." />
                    </div>
                ) : (
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit} 
                        className="space-y-6"
                    >
                        {/* CAMBIO CRUCIAL AQUÍ: Renderizar todos los contenidos, ocultando los inactivos */}
                        <div className="steps-content">
                            {steps.map((item, index) => (
                                <div 
                                    key={item.title} // Usar el título como key o un ID único
                                    style={{ display: index === currentStep ? 'block' : 'none' }}
                                >
                                    {item.content}
                                </div>
                            ))}
                        </div>

                        <div className="steps-action mt-8 flex justify-between">
                            {currentStep > 0 && (
                                <Button size="large" onClick={() => prev()} className="min-w-[120px]">
                                    Anterior
                                </Button>
                            )}
                            {currentStep < steps.length - 1 && (
                                <Button size="large" type="primary" onClick={() => next()} className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700">
                                    Siguiente
                                </Button>
                            )}
                            {currentStep === steps.length - 1 && (
                                <Button
                                    size="large"
                                    type="primary"
                                    htmlType="submit" 
                                    loading={loadingSubmit}
                                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                                >
                                    Enviar Registro
                                </Button>
                            )}
                        </div>
                    </Form>
                )}
            </div>
        </div>
    );
};

export default StudentRegistrationFormMarily;