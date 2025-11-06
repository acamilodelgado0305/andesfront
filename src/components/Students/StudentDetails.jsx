import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Button,
    Form,
    Input,
    Select,
    DatePicker,
    message,
    InputNumber,
    Modal,
    Avatar,
    Typography,
    Spin,
    Tag,
    Switch,
    Upload,
} from "antd";
import {
    FaUserEdit,
    FaSave,
    FaTrashAlt,
    FaWhatsapp,
    FaGraduationCap,
    FaFileInvoiceDollar,
    FaUserGraduate,
} from "react-icons/fa";
import dayjs from "dayjs";
import axios from "axios";
import {
    getStudentById,
    updateStudent,
    updateStudentPosibleGraduacion,
    deleteStudent as deleteStudentService,
    uploadStudentDocument, getStudentDocuments, deleteStudentDocument
} from "../../services/student/studentService";

const API_URL = import.meta.env.VITE_API_BACKEND;

const { Title, Text } = Typography;
const { Option } = Select;

/* ========== Bloque visual para agrupar info ========== */
const InfoSection = ({ title, children }) => (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 bg-slate-50 px-4 py-2 border-b border-slate-200 rounded-t-md">
            {title}
        </h3>
        <div className="p-4 space-y-4">{children}</div>
    </div>
);

/* ========== Campo genérico reutilizable ========== */
const FieldItem = ({ label, name, value, isEditing, children }) => (
    <div className="space-y-1">
        <Text className="text-xs text-slate-500 font-semibold block">
            {label}
        </Text>
        {isEditing ? (
            <Form.Item name={name} className="!mb-0">
                {children}
            </Form.Item>
        ) : (
            <Text className="text-sm text-slate-800">
                {value ?? "No especificado"}
            </Text>
        )}
    </div>
);

const StudentDetails = ({ studentId }) => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [isEditing, setIsEditing] = useState(false);
    const [allPrograms, setAllPrograms] = useState([]);

    // === Documentos del estudiante ===
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);

    // formatear fecha solo para display
    const formatDate = useCallback((dateString) => {
        if (!dateString) return "No especificado";
        return dayjs(dateString).format("DD [de] MMMM [de] YYYY");
    }, []);

    /* ========== Cargar datos del estudiante ========== */
    const fetchStudentData = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        try {
            const studentData = await getStudentById(studentId);

            setStudent(studentData);

            form.setFieldsValue({
                // básicos
                nombre: studentData.nombre,
                apellido: studentData.apellido,
                tipo_documento: studentData.tipo_documento,
                numero_documento: studentData.numero_documento,
                lugar_expedicion: studentData.lugar_expedicion,
                fecha_nacimiento: studentData.fecha_nacimiento
                    ? dayjs(studentData.fecha_nacimiento)
                    : null,
                lugar_nacimiento: studentData.lugar_nacimiento,

                email: studentData.email,
                telefono_llamadas: studentData.telefono_llamadas,
                telefono_whatsapp: studentData.telefono_whatsapp,

                modalidad_estudio: studentData.modalidad_estudio,
                ultimo_curso_visto: studentData.ultimo_curso_visto,
                matricula: studentData.matricula,
                simat: studentData.simat,
                estado_matricula: studentData.estado_matricula,
                activo: studentData.activo,
                eps: studentData.eps,
                rh: studentData.rh,

                fecha_inscripcion: studentData.fecha_inscripcion
                    ? dayjs(studentData.fecha_inscripcion)
                    : null,
                fecha_graduacion: studentData.fecha_graduacion
                    ? dayjs(studentData.fecha_graduacion)
                    : null,

                // programa (único) asociado
                programa_id: studentData.programa_asociado?.programa_id,

                // acudiente (mapeado a columnas reales de la tabla)
                nombre_acudiente: studentData.acudiente?.nombre,
                tipo_documento_acudiente: studentData.acudiente?.tipo_documento,
                telefono_acudiente: studentData.acudiente?.telefono,
                direccion_acudiente: studentData.acudiente?.direccion,
            });
        } catch (error) {
            console.error(error);
            message.error("Error al cargar los datos del estudiante");
        } finally {
            setLoading(false);
        }
    }, [studentId, form]);

    /* ========== Cargar documentos del estudiante ========== */
    const fetchStudentDocuments = useCallback(async () => {
        if (!studentId) return;
        setDocsLoading(true);
        try {
            const docs = await getStudentDocuments(studentId);
            setDocuments(docs || []);
        } catch (error) {
            console.error(error);
            message.error("Error al cargar los documentos del estudiante");
        } finally {
            setDocsLoading(false);
        }
    }, [studentId]);



    useEffect(() => {
        fetchStudentData();
        fetchStudentDocuments();
    }, [fetchStudentData, fetchStudentDocuments]);

    /* ========== Programas asignables por usuario ========== */
    const fetchUserAssignablePrograms = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            message.error("No se pudo encontrar el ID de usuario.");
            return;
        }
        try {
            const response = await axios.get(
                `${API_URL}/api/inventario/user/${userId}`
            );
            setAllPrograms(response.data || []);
        } catch (error) {
            console.error(error);
            message.error("No se pudo cargar la lista de programas.");
        }
    };

    /* ========== Acciones ========== */

    const handleWhatsAppClick = () => {
        let phoneNumber =
            student?.telefono_whatsapp?.replace(/\D/g, "") ||
            student?.telefono_llamadas?.replace(/\D/g, "");
        if (!phoneNumber) {
            message.error("No hay número de teléfono disponible");
            return;
        }
        if (!phoneNumber.startsWith("57")) phoneNumber = `57${phoneNumber}`;
        window.open(`https://wa.me/${phoneNumber}`, "_blank");
    };

    const handleStartEditing = () => {
        fetchUserAssignablePrograms();
        setIsEditing(true);
    };

    const handleDeleteDocument = async (doc) => {
        Modal.confirm({
            title: "¿Eliminar documento?",
            content: `¿Deseas eliminar el documento "${doc.nombre_original || doc.nombre}"?`,
            okText: "Eliminar",
            cancelText: "Cancelar",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await deleteStudentDocument(studentId, doc.id);
                    message.success("Documento eliminado correctamente");
                    fetchStudentDocuments(); // refresca lista
                } catch (error) {
                    console.error("Error al eliminar documento:", error);
                    message.error("Error al eliminar el documento");
                }
            },
        });
    };


    const handleSave = async () => {
        try {
            const values = await form.validateFields();

            const payload = {
                ...values,
                fecha_nacimiento: values.fecha_nacimiento
                    ? values.fecha_nacimiento.toISOString()
                    : null,
                fecha_inscripcion: values.fecha_inscripcion
                    ? values.fecha_inscripcion.toISOString()
                    : null,
                fecha_graduacion: values.fecha_graduacion
                    ? values.fecha_graduacion.toISOString()
                    : null,
            };

            delete payload.coordinador;
            delete payload.programa_asociado;

            console.log("Enviando al backend:", payload);

            await updateStudent(student.id, payload);

            message.success("Estudiante actualizado exitosamente");
            setIsEditing(false);
            fetchStudentData();
        } catch (error) {
            const errorMessage =
                error.response?.data?.error || "Ocurrió un error inesperado.";
            console.error("Error al actualizar el estudiante:", error);
            message.error(`Error al actualizar: ${errorMessage}`);
        }
    };

    const handleToggleCandidate = async (checked) => {
        if (!student) return;
        try {
            await updateStudentPosibleGraduacion(student.id, checked);
            setStudent((prev) => ({
                ...prev,
                posible_graduacion: checked,
            }));
            message.success(
                checked
                    ? "Marcado como candidato a grado"
                    : "Marcado como no candidato"
            );
        } catch (error) {
            console.error(error);
            message.error("Error al actualizar candidato a grado");
        }
    };

    const handleGraduate = async () => {
        if (!student) return;
        Modal.confirm({
            title: "¿Confirmar graduación del estudiante?",
            content: "Esta acción marcará al estudiante como graduado.",
            onOk: async () => {
                try {
                    await axios.put(`${API_URL}/api/students/${student.id}/graduate`);
                    message.success("Estudiante graduado exitosamente");
                    setStudent((prev) => ({
                        ...prev,
                        fecha_graduacion: new Date().toISOString(),
                    }));
                    fetchStudentData();
                } catch (error) {
                    console.error("Error al graduar el estudiante:", error);
                    message.error("Error al graduar el estudiante");
                }
            },
        });
    };

    const handleDelete = async () => {
        if (!student) return;
        Modal.confirm({
            title: "¿Está seguro de que desea eliminar este estudiante?",
            content: "Esta acción no se puede deshacer.",
            onOk: async () => {
                try {
                    await deleteStudentService(student.id);
                    message.success("Estudiante eliminado con éxito");
                    window.location.href = "/inicio/students";
                } catch (error) {
                    console.error("Error al eliminar el estudiante:", error);
                    message.error("Error al eliminar el estudiante");
                }
            },
        });
    };

    /* ========== Subida de documentos ========== */

    // Upload con customRequest para controlar el envío con axios
    const handleUploadDocument = async (options) => {
        const { file, onSuccess, onError } = options;
        if (!studentId) return;

        try {
            setUploadingDoc(true);

            // 👇 usa el servicio correcto (usa /document, no /documents)
            const data = await uploadStudentDocument(studentId, file);

            message.success("Documento subido correctamente");
            onSuccess && onSuccess(data);

            // recargar lista
            fetchStudentDocuments();
        } catch (error) {
            console.error("Error al subir documento:", error);
            const msg = error.response?.data?.error || "Error al subir el documento";
            message.error(msg);
            onError && onError(error);
        } finally {
            setUploadingDoc(false);
        }
    };



    const handlePreviewDocument = (doc) => {
        setPreviewDoc(doc);
        setPreviewVisible(true);
    };

    const closePreview = () => {
        setPreviewVisible(false);
        setPreviewDoc(null);
    };

    const getDocumentUrl = (doc) => {
        // Si tu API ya devuelve una URL absoluta úsala directamente.
        // Si devuelve una ruta relativa, la concatenas con API_URL.
        if (doc.url?.startsWith("http")) return doc.url;
        return `${API_URL}${doc.url || ""}`;
    };

    const renderPreviewContent = () => {
        if (!previewDoc) return null;
        const fileUrl = getDocumentUrl(previewDoc);
        const mime = previewDoc.tipo_mime || previewDoc.mimetype || "";

        // Imágenes
        if (mime.startsWith("image/")) {
            return (
                <img
                    src={fileUrl}
                    alt={previewDoc.nombre_original || previewDoc.nombre}
                    className="w-full h-[70vh] object-contain"
                />
            );
        }

        // PDFs
        if (
            mime === "application/pdf" ||
            fileUrl.toLowerCase().endsWith(".pdf")
        ) {
            return (
                <iframe
                    src={fileUrl}
                    title={previewDoc.nombre_original || previewDoc.nombre}
                    className="w-full h-[70vh]"
                />
            );
        }

        // Otros tipos: mostramos un link para abrir en nueva pestaña
        return (
            <div className="space-y-3">
                <Text>
                    No se puede previsualizar este tipo de archivo directamente, pero
                    puedes abrirlo en otra pestaña.
                </Text>
                <div>
                    <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                    >
                        Abrir documento
                    </a>
                </div>
            </div>
        );
    };

    /* ========== Renderizado condicional global ========== */

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "50px" }}>
                <Spin size="large" />
                <div>
                    <Text>Cargando estudiante...</Text>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div style={{ textAlign: "center", padding: "50px" }}>
                <Text>No se encontraron datos del estudiante</Text>
            </div>
        );
    }

    const programaNombre = student.programa_asociado?.nombre_programa;
    const coordinadorNombre = student.coordinador?.nombre;

    return (
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6">
            <Form form={form} layout="vertical">
                {/* ========== ENCABEZADO ========== */}
                <header className="bg-white p-4 rounded-md border border-slate-200 mb-6 shadow-sm">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar
                                size={64}
                                icon={<FaUserGraduate />}
                                className="!bg-blue-500"
                            />
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 m-0">
                                    {student.nombre} {student.apellido}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Tag color={student.activo ? "green" : "red"}>
                                        {student.activo ? "Activo" : "Inactivo"}
                                    </Tag>
                                    <Tag color={student.estado_matricula ? "cyan" : "orange"}>
                                        {student.estado_matricula
                                            ? "Matrícula Paga"
                                            : "Matrícula Pendiente"}
                                    </Tag>
                                    {typeof student.posible_graduacion === "boolean" && (
                                        <Tag
                                            color={
                                                student.posible_graduacion ? "geekblue" : "default"
                                            }
                                        >
                                            {student.posible_graduacion
                                                ? "Candidato a grado"
                                                : "No candidato"}
                                        </Tag>
                                    )}
                                    {student.fecha_graduacion && (
                                        <Tag color="purple">
                                            Graduado el {formatDate(student.fecha_graduacion)}
                                        </Tag>
                                    )}
                                </div>
                                {coordinadorNombre && (
                                    <div className="mt-1 text-xs text-slate-500">
                                        Coordinador:{" "}
                                        <span className="font-semibold">{coordinadorNombre}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                                <>
                                    <Button onClick={() => setIsEditing(false)}>Cancelar</Button>
                                    <Button
                                        type="primary"
                                        icon={<FaSave />}
                                        onClick={handleSave}
                                    >
                                        Guardar
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="primary"
                                        icon={<FaUserEdit />}
                                        onClick={handleStartEditing}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        icon={<FaWhatsapp />}
                                        onClick={handleWhatsAppClick}
                                        className="!bg-green-500 !border-green-500 hover:!bg-green-600 !text-white"
                                    >
                                        WhatsApp
                                    </Button>
                                    <Button icon={<FaTrashAlt />} danger onClick={handleDelete}>
                                        Eliminar
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* ========== CUERPO PRINCIPAL ========== */}
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* --- COLUMNA 1 --- */}
                    <div className="space-y-6">
                        <InfoSection title="Información Personal">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FieldItem
                                    label="Nombre"
                                    name="nombre"
                                    value={student.nombre}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Apellido"
                                    name="apellido"
                                    value={student.apellido}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Tipo de documento"
                                    name="tipo_documento"
                                    value={student.tipo_documento}
                                    isEditing={isEditing}
                                >
                                    <Select allowClear placeholder="Tipo de documento">
                                        <Option value="CC">Cédula</Option>
                                        <Option value="TI">Tarjeta de Identidad</Option>
                                        <Option value="CE">Cédula de Extranjería</Option>
                                    </Select>
                                </FieldItem>

                                <FieldItem
                                    label="Número de documento"
                                    name="numero_documento"
                                    value={student.numero_documento}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Fecha de nacimiento"
                                    name="fecha_nacimiento"
                                    value={formatDate(student.fecha_nacimiento)}
                                    isEditing={isEditing}
                                >
                                    <DatePicker format="YYYY-MM-DD" className="w-full" />
                                </FieldItem>

                                <FieldItem
                                    label="Lugar de nacimiento"
                                    name="lugar_nacimiento"
                                    value={student.lugar_nacimiento}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Lugar de expedición"
                                    name="lugar_expedicion"
                                    value={student.lugar_expedicion}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="EPS"
                                    name="eps"
                                    value={student.eps}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="RH"
                                    name="rh"
                                    value={student.rh}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>
                            </div>
                        </InfoSection>

                        <InfoSection title="Información de Contacto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FieldItem
                                    label="Email"
                                    name="email"
                                    value={student.email}
                                    isEditing={isEditing}
                                >
                                    <Input placeholder="correo@ejemplo.com" allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Teléfono llamadas"
                                    name="telefono_llamadas"
                                    value={student.telefono_llamadas}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Teléfono WhatsApp"
                                    name="telefono_whatsapp"
                                    value={student.telefono_whatsapp}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>
                            </div>
                        </InfoSection>
                    </div>

                    {/* --- COLUMNA 2 --- */}
                    <div className="space-y-6">
                        <InfoSection title="Información Académica y Administrativa">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FieldItem
                                    label="Programa"
                                    name="programa_id"
                                    value={programaNombre}
                                    isEditing={isEditing}
                                >
                                    <Select
                                        placeholder="Seleccionar programa"
                                        allowClear
                                        showSearch
                                        optionFilterProp="children"
                                    >
                                        {allPrograms.map((p) => (
                                            <Option key={p.id} value={p.id}>
                                                {p.nombre}
                                            </Option>
                                        ))}
                                    </Select>
                                </FieldItem>

                                <FieldItem
                                    label="Modalidad"
                                    name="modalidad_estudio"
                                    value={student.modalidad_estudio}
                                    isEditing={isEditing}
                                >
                                    <Select placeholder="Seleccionar modalidad" allowClear>
                                        <Option value="Clases en Linea">Clases en línea</Option>
                                        <Option value="Modulos por WhastApp">
                                            Módulos por WhatsApp
                                        </Option>
                                    </Select>
                                </FieldItem>

                                <FieldItem
                                    label="Último curso visto"
                                    name="ultimo_curso_visto"
                                    value={student.ultimo_curso_visto}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Valor matrícula"
                                    name="matricula"
                                    value={
                                        student.matricula
                                            ? `$ ${Number(student.matricula).toLocaleString()}`
                                            : null
                                    }
                                    isEditing={isEditing}
                                >
                                    <InputNumber
                                        className="w-full"
                                        min={0}
                                        formatter={(value) =>
                                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                        }
                                        parser={(value) => value.replace(/,/g, "")}
                                    />
                                </FieldItem>

                                <FieldItem
                                    label="SIMAT"
                                    name="simat"
                                    value={student.simat ? "Activo" : "No activo"}
                                    isEditing={isEditing}
                                >
                                    <Select allowClear>
                                        <Option value={true}>Activo</Option>
                                        <Option value={false}>No activo</Option>
                                    </Select>
                                </FieldItem>

                                <FieldItem
                                    label="Estado matrícula"
                                    name="estado_matricula"
                                    value={
                                        student.estado_matricula
                                            ? "Matrícula paga"
                                            : "Matrícula pendiente"
                                    }
                                    isEditing={isEditing}
                                >
                                    <Select allowClear>
                                        <Option value={true}>Matrícula paga</Option>
                                        <Option value={false}>Matrícula pendiente</Option>
                                    </Select>
                                </FieldItem>

                                <FieldItem
                                    label="Estado estudiante"
                                    name="activo"
                                    value={student.activo ? "Activo" : "Inactivo"}
                                    isEditing={isEditing}
                                >
                                    <Select allowClear>
                                        <Option value={true}>Activo</Option>
                                        <Option value={false}>Inactivo</Option>
                                    </Select>
                                </FieldItem>
                            </div>
                        </InfoSection>

                        <InfoSection title="Información de Acudiente">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FieldItem
                                    label="Nombre acudiente"
                                    name="nombre_acudiente"
                                    value={student.acudiente?.nombre}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Tipo documento acudiente"
                                    name="tipo_documento_acudiente"
                                    value={student.acudiente?.tipo_documento}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Teléfono acudiente"
                                    name="telefono_acudiente"
                                    value={student.acudiente?.telefono}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>

                                <FieldItem
                                    label="Dirección acudiente"
                                    name="direccion_acudiente"
                                    value={student.acudiente?.direccion}
                                    isEditing={isEditing}
                                >
                                    <Input allowClear />
                                </FieldItem>
                            </div>
                        </InfoSection>
                    </div>

                    {/* --- COLUMNA 3 --- */}
                    <div className="space-y-6">
                        <InfoSection title="Estado y Fechas Clave">
                            <div className="space-y-4">
                                <FieldItem
                                    label="Fecha de inscripción"
                                    name="fecha_inscripcion"
                                    value={formatDate(student.fecha_inscripcion)}
                                    isEditing={isEditing}
                                >
                                    <DatePicker format="YYYY-MM-DD" className="w-full" />
                                </FieldItem>

                                <FieldItem
                                    label="Fecha de graduación"
                                    name="fecha_graduacion"
                                    value={formatDate(student.fecha_graduacion)}
                                    isEditing={isEditing}
                                >
                                    <DatePicker format="YYYY-MM-DD" className="w-full" />
                                </FieldItem>

                                <div className="flex items-center justify-between mt-2">
                                    <Text className="text-xs text-slate-500 font-semibold">
                                        Candidato a grado
                                    </Text>
                                    <Switch
                                        checked={!!student.posible_graduacion}
                                        onChange={handleToggleCandidate}
                                        disabled={isEditing}
                                    />
                                </div>
                            </div>
                        </InfoSection>

                        {/* ========== DOCUMENTOS DEL ESTUDIANTE ========== */}
                        <InfoSection title="Documentos del Estudiante">
                            <div className="space-y-4">
                                <div>
                                    <Text className="text-xs text-slate-500 font-semibold block mb-1">
                                        Subir nuevo documento
                                    </Text>
                                    <Upload
                                        multiple
                                        showUploadList={false}
                                        customRequest={handleUploadDocument}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        disabled={uploadingDoc}
                                    >
                                        <Button loading={uploadingDoc} className="w-full">
                                            Seleccionar archivo(s)
                                        </Button>
                                    </Upload>
                                    <Text type="secondary" className="text-[11px]">
                                        Puedes subir PDFs, imágenes u otros documentos relevantes
                                        del estudiante.
                                    </Text>
                                </div>

                                <div>
                                    <Text className="text-xs text-slate-500 font-semibold block mb-2">
                                        Documentos subidos
                                    </Text>
                                    {docsLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Spin size="small" />
                                            <Text>Cargando documentos...</Text>
                                        </div>
                                    ) : documents.length === 0 ? (
                                        <Text type="secondary" className="text-sm">
                                            No hay documentos registrados para este estudiante.
                                        </Text>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-md bg-slate-50"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-800">
                                                            {doc.nombre_original || doc.nombre}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {doc.tipo_mime || doc.mimetype || "Documento"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="small"
                                                            onClick={() => handlePreviewDocument(doc)}
                                                        >
                                                            Ver
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            danger
                                                            onClick={() => handleDeleteDocument(doc)}
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </div>

                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </InfoSection>

                        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4">
                                Acciones Rápidas
                            </h3>
                            <div className="space-y-2">
                                <Link
                                    to={`/inicio/payments/student/${student.id}`}
                                    className="w-full block"
                                >
                                    <Button
                                        icon={<FaFileInvoiceDollar />}
                                        disabled={isEditing}
                                        className="w-full"
                                    >
                                        Ver pagos del estudiante
                                    </Button>
                                </Link>

                                <Button
                                    icon={<FaGraduationCap />}
                                    onClick={handleGraduate}
                                    disabled={isEditing || !!student.fecha_graduacion}
                                    className="w-full"
                                >
                                    Marcar como Graduado
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
            </Form>

            {/* MODAL DE PREVISUALIZACIÓN DE DOCUMENTO */}
            <Modal
                open={previewVisible}
                onCancel={closePreview}
                footer={null}
                width="80%"
                title={
                    previewDoc?.nombre_original ||
                    previewDoc?.nombre ||
                    "Vista previa de documento"
                }
            >
                {renderPreviewContent()}
            </Modal>
        </div>
    );
};

export default StudentDetails;
