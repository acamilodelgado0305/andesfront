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
    Tabs,
    Tooltip,
    Radio,
    Space,
} from "antd";
import {
    FaWhatsapp,
    FaGraduationCap,
    FaFileInvoiceDollar,
    FaUserGraduate,
    FaCamera,
    FaTimes,
} from "react-icons/fa";
import { MdOutlineEdit, MdOutlineArchive } from "react-icons/md";
import dayjs from "dayjs";
import axios from "axios";
import {
    getStudentById,
    updateStudent,
    updateStudentPosibleGraduacion,
    updateStudentPazSalvo,
    archiveStudent,
    uploadStudentDocument,
    getStudentDocuments,
    deleteStudentDocument,
    uploadStudentCertificado,
    getStudentCertificados,
    deleteStudentCertificado,
    uploadStudentFoto,
    deleteStudentFoto,
} from "../../services/student/studentService";
import { getProgramas } from "../../services/programas/programasService";
import StudentHorario from "../Horarios/StudentHorario";
import StudentInvoices from "./StudentInvoices";
import StudentGrades from "./StudentGrades";
import StudentComments from "./StudentComments";
import useCurrency, { useCurrencyInput } from "../../hooks/useCurrency";

const API_URL = import.meta.env.VITE_API_BACKEND;

const { Title, Text } = Typography;
const { Option } = Select;

/* ========== Bloque visual para agrupar info (estilo Google Ads) ==========
   Título fuera de la tarjeta; tarjeta blanca redondeada con borde fino.
   `flush`: los hijos son filas etiqueta/valor con divisores (sin padding propio). */
const InfoSection = ({ title, children, flush = false }) => (
    <section>
        <h3 className="text-sm font-medium text-slate-800 dark:text-[#faf9f5] mb-2">
            {title}
        </h3>
        <div
            className={`bg-white dark:bg-[#30302e] border border-slate-200 dark:border-[#403e3a] rounded-lg ${
                flush
                    ? "divide-y divide-slate-100 dark:divide-[#403e3a] overflow-hidden"
                    : "p-4 space-y-4"
            }`}
        >
            {children}
        </div>
    </section>
);

/* ========== Fila etiqueta/valor estilo Google ========== */
const FieldItem = ({ label, name, value, isEditing, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#3a3a38] transition-colors">
        <span className="text-[13px] font-medium text-slate-800 dark:text-[#faf9f5] sm:w-36 flex-shrink-0">
            {label}
        </span>
        {isEditing ? (
            <Form.Item name={name} className="!mb-0 flex-1 sm:max-w-sm">
                {children}
            </Form.Item>
        ) : (
            <span className="text-[13px] text-slate-500 dark:text-[#a8a59e] min-w-0 break-words">
                {value ?? "No especificado"}
            </span>
        )}
    </div>
);

// Mismos motivos de archivado que usa la tabla de estudiantes
const ARCHIVE_REASONS = [
    "Retiro voluntario",
    "Problemas económicos",
    "Traslado a otra institución",
    "Inactividad prolongada",
    "Culminó el programa",
    "Incumplimiento de requisitos",
    "Otro motivo",
];

const StudentDetails = ({ studentId }) => {
    const fmt = useCurrency();
    const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser, precision: currPrecision, step: currStep } = useCurrencyInput();
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

    // === Certificados del estudiante (PDF que verá en su portal) ===
    const [certificados, setCertificados] = useState([]);
    const [certsLoading, setCertsLoading] = useState(false);
    const [uploadingCert, setUploadingCert] = useState(false);

    // === Foto de perfil del estudiante ===
    const [uploadingFoto, setUploadingFoto] = useState(false);

    // === Archivado (mismo flujo que la tabla: modal con motivo) ===
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [archiveReason, setArchiveReason] = useState(null);
    const [archiveCustomReason, setArchiveCustomReason] = useState("");
    const [archiving, setArchiving] = useState(false);

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

            // 🔥 CAMBIO: obtener IDs de programas asociados para el formulario
            const programasIdsFromStudent =
                (studentData.programas_asociados || []).map(
                    (p) => p.programa_id
                ) || [];

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

                // 🔥 CAMBIO: ahora usamos programasIds (array) en vez de programa_id único
                programasIds: programasIdsFromStudent,

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

    /* ========== Cargar certificados del estudiante ========== */
    const fetchStudentCertificados = useCallback(async () => {
        if (!studentId) return;
        setCertsLoading(true);
        try {
            const data = await getStudentCertificados(studentId);
            setCertificados(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            message.error("Error al cargar los certificados del estudiante");
        } finally {
            setCertsLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        fetchStudentData();
        fetchStudentDocuments();
        fetchStudentCertificados();
    }, [fetchStudentData, fetchStudentDocuments, fetchStudentCertificados]);

    /* ========== Programas asignables ========== */
    const fetchUserAssignablePrograms = async () => {
        try {
            const data = await getProgramas();
            setAllPrograms(Array.isArray(data) ? data : []);
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

            // 🔥 IMPORTANTE: no enviamos cosas que no existen en backend
            delete payload.coordinador;
            delete payload.programa_asociado;

            // payload.programasIds se envía tal cual (array) → backend actualiza estudiante_programas
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

    const handleTogglePazSalvo = async (tipo, checked) => {
        if (!student) return;
        const fieldFlag =
            tipo === "academico" ? "paz_salvo_academico" : "paz_salvo_financiero";
        const fieldFecha =
            tipo === "academico"
                ? "paz_salvo_academico_fecha"
                : "paz_salvo_financiero_fecha";
        try {
            const data = await updateStudentPazSalvo(student.id, {
                [fieldFlag]: checked,
            });
            const updated = data?.student || {};
            setStudent((prev) => ({
                ...prev,
                [fieldFlag]: checked,
                [fieldFecha]: updated[fieldFecha] ?? (checked ? new Date().toISOString() : null),
            }));
            message.success(
                `Paz y salvo ${tipo === "academico" ? "académico" : "financiero"} ${
                    checked ? "otorgado" : "retirado"
                }`
            );
        } catch (error) {
            console.error(error);
            message.error("Error al actualizar el paz y salvo");
        }
    };

    const handleGraduate = async () => {
        if (!student) return;
        Modal.confirm({
            title: "¿Confirmar graduación del estudiante?",
            content: "Esta acción marcará al estudiante como graduado y lo desactivará.",
            okText: "Sí, graduar",
            cancelText: "Cancelar",
            okButtonProps: { type: "primary" },
            onOk: async () => {
                try {
                    const token = localStorage.getItem("authToken");
                    const { data } = await axios.put(
                        `${API_URL}/api/students/${student.id}/graduate`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const generados = data?.diplomas_generados || 0;
                    message.success(
                        generados > 0
                            ? `Estudiante graduado. Se generaron ${generados} diploma(s) en Certificados.`
                            : "Estudiante graduado exitosamente"
                    );
                    fetchStudentData();
                    fetchStudentCertificados();
                } catch (error) {
                    console.error("Error al graduar el estudiante:", error);
                    const msg = error.response?.data?.error || "Error al graduar el estudiante";
                    message.error(msg);
                }
            },
        });
    };

    const handleArchive = () => {
        if (!student) return;
        setArchiveReason(null);
        setArchiveCustomReason("");
        setArchiveModalOpen(true);
    };

    const confirmArchive = async () => {
        const finalReason =
            archiveReason === "Otro motivo"
                ? archiveCustomReason.trim()
                : archiveReason;

        if (!finalReason) {
            message.warning("Selecciona o escribe la razón del archivado.");
            return;
        }

        setArchiving(true);
        try {
            await archiveStudent(student.id, finalReason);
            message.success("Estudiante archivado correctamente");
            setArchiveModalOpen(false);
            window.location.href = "/inicio/students";
        } catch (error) {
            console.error("Error al archivar el estudiante:", error);
            message.error("Error al archivar el estudiante");
        } finally {
            setArchiving(false);
        }
    };

    /* ========== Subida de documentos ========== */

    const handleUploadDocument = async (options) => {
        const { file, onSuccess, onError } = options;
        if (!studentId) return;

        try {
            setUploadingDoc(true);
            const data = await uploadStudentDocument(studentId, file);
            message.success("Documento subido correctamente");
            onSuccess && onSuccess(data);
            fetchStudentDocuments();
        } catch (error) {
            console.error("Error al subir documento:", error);
            const msg =
                error.response?.data?.error || "Error al subir el documento";
            message.error(msg);
            onError && onError(error);
        } finally {
            setUploadingDoc(false);
        }
    };

    /* ========== Subida / eliminación de certificados (PDF) ========== */
    const handleUploadCertificado = async (options) => {
        const { file, onSuccess, onError } = options;
        if (!studentId) return;

        if (file.type !== "application/pdf") {
            message.error("El certificado debe ser un archivo PDF.");
            onError && onError(new Error("Formato inválido"));
            return;
        }

        try {
            setUploadingCert(true);
            const data = await uploadStudentCertificado(studentId, file);
            message.success("Certificado subido correctamente");
            onSuccess && onSuccess(data);
            fetchStudentCertificados();
        } catch (error) {
            console.error("Error al subir certificado:", error);
            const msg =
                error.response?.data?.error || "Error al subir el certificado";
            message.error(msg);
            onError && onError(error);
        } finally {
            setUploadingCert(false);
        }
    };

    /* ========== Foto de perfil del estudiante ========== */
    const handleUploadFoto = async (options) => {
        const { file, onSuccess, onError } = options;
        if (!studentId) return;

        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            message.error("La foto debe ser una imagen JPG, PNG o WebP.");
            onError && onError(new Error("Formato inválido"));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            message.error("La foto no puede superar los 5 MB.");
            onError && onError(new Error("Archivo muy grande"));
            return;
        }

        try {
            setUploadingFoto(true);
            const data = await uploadStudentFoto(studentId, file);
            setStudent((prev) => ({ ...prev, foto_url: data.foto_url }));
            message.success("Foto de perfil actualizada");
            onSuccess && onSuccess(data);
        } catch (error) {
            console.error("Error al subir la foto:", error);
            const msg =
                error.response?.data?.error || "Error al subir la foto de perfil";
            message.error(msg);
            onError && onError(error);
        } finally {
            setUploadingFoto(false);
        }
    };

    const handleDeleteFoto = () => {
        Modal.confirm({
            title: "¿Quitar la foto de perfil?",
            content: "El estudiante quedará sin fotografía en su perfil.",
            okText: "Quitar",
            cancelText: "Cancelar",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await deleteStudentFoto(studentId);
                    setStudent((prev) => ({ ...prev, foto_url: null }));
                    message.success("Foto de perfil eliminada");
                } catch (error) {
                    console.error("Error al eliminar la foto:", error);
                    message.error("Error al eliminar la foto de perfil");
                }
            },
        });
    };

    const handleDeleteCertificado = (cert) => {
        Modal.confirm({
            title: "¿Eliminar certificado?",
            content: `¿Deseas eliminar el certificado "${cert.nombre}"? El estudiante dejará de verlo en su portal.`,
            okText: "Eliminar",
            cancelText: "Cancelar",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await deleteStudentCertificado(studentId, cert.id);
                    message.success("Certificado eliminado correctamente");
                    fetchStudentCertificados();
                } catch (error) {
                    console.error("Error al eliminar certificado:", error);
                    message.error("Error al eliminar el certificado");
                }
            },
        });
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
        if (doc.url?.startsWith("http")) return doc.url;
        return `${API_URL}${doc.url || ""}`;
    };

    const renderPreviewContent = () => {
        if (!previewDoc) return null;
        const fileUrl = getDocumentUrl(previewDoc);
        const mime = previewDoc.tipo_mime || previewDoc.mimetype || "";

        if (mime.startsWith("image/")) {
            return (
                <img
                    src={fileUrl}
                    alt={previewDoc.nombre_original || previewDoc.nombre}
                    className="w-full h-[70vh] object-contain"
                />
            );
        }

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

        return (
            <div className="space-y-3">
                <Text>
                    No se puede previsualizar este tipo de archivo directamente,
                    pero puedes abrirlo en otra pestaña.
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

    // 🔥 CAMBIO: nombres de programas asociados (para mostrar en texto)
    const programasAsociadosNombres = (student.programas_asociados || [])
        .map((p) => p.nombre)
        .join(", ");

    return (
        <div className="bg-white dark:bg-[#262624] min-h-screen p-4 sm:p-6">
            <Form form={form} layout="vertical">
                {/* Columna centrada estilo Google: todo el contenido en un ancho fijo al centro */}
                <div className="max-w-4xl mx-auto">
                {/* ========== ENCABEZADO ========== */}
                <header className="bg-white dark:bg-[#30302e] p-5 rounded-lg border border-slate-200 dark:border-[#403e3a] mb-8">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                                <Avatar
                                    size={96}
                                    shape="square"
                                    src={student.foto_url || undefined}
                                    icon={<FaUserGraduate />}
                                    className="!bg-blue-500 !rounded-lg"
                                />
                                <Upload
                                    showUploadList={false}
                                    customRequest={handleUploadFoto}
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={uploadingFoto}
                                >
                                    <button
                                        type="button"
                                        title={
                                            student.foto_url
                                                ? "Cambiar foto de perfil"
                                                : "Subir foto de perfil"
                                        }
                                        disabled={uploadingFoto}
                                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center border-2 border-white dark:border-[#30302e] shadow cursor-pointer disabled:opacity-60"
                                    >
                                        {uploadingFoto ? (
                                            <Spin size="small" />
                                        ) : (
                                            <FaCamera className="text-[10px]" />
                                        )}
                                    </button>
                                </Upload>
                                {student.foto_url && !uploadingFoto && (
                                    <button
                                        type="button"
                                        title="Quitar foto de perfil"
                                        onClick={handleDeleteFoto}
                                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#30302e] text-slate-500 dark:text-[#a8a59e] hover:text-red-500 flex items-center justify-center border border-slate-200 dark:border-[#403e3a] shadow cursor-pointer"
                                    >
                                        <FaTimes className="text-[9px]" />
                                    </button>
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 dark:text-[#faf9f5] m-0 flex flex-wrap items-baseline gap-x-2">
                                    <span>
                                        {student.nombre} {student.apellido}
                                    </span>
                                    {student.numero_documento && (
                                        <span className="text-sm font-normal text-slate-500 dark:text-[#a8a59e]">
                                            {student.tipo_documento
                                                ? `${student.tipo_documento} `
                                                : ""}
                                            {student.numero_documento}
                                        </span>
                                    )}
                                    <Tag
                                        color={student.activo ? "green" : "red"}
                                        className="!m-0"
                                    >
                                        {student.activo ? "Activo" : "Inactivo"}
                                    </Tag>
                                </h1>
                                {/* Programa(s) del estudiante, destacado bajo el nombre */}
                                {programasAsociadosNombres && (
                                    <h2 className="text-base font-semibold text-slate-700 dark:text-[#faf9f5] m-0 mt-1">
                                        {programasAsociadosNombres}
                                    </h2>
                                )}

                                {/* Solo estados positivos; los pendientes no se muestran */}
                                {(student.estado_matricula ||
                                    student.posible_graduacion ||
                                    student.fecha_graduacion ||
                                    student.paz_salvo_academico ||
                                    student.paz_salvo_financiero) && (
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {student.estado_matricula && (
                                            <Tag color="cyan">Matrícula Paga</Tag>
                                        )}
                                        {student.posible_graduacion && (
                                            <Tag color="geekblue">
                                                Candidato a grado
                                            </Tag>
                                        )}
                                        {student.fecha_graduacion && (
                                            <Tag color="purple">
                                                Graduado el{" "}
                                                {formatDate(student.fecha_graduacion)}
                                            </Tag>
                                        )}
                                        {student.paz_salvo_academico && (
                                            <Tag color="green">
                                                Paz y salvo académico
                                            </Tag>
                                        )}
                                        {student.paz_salvo_financiero && (
                                            <Tag color="green">
                                                Paz y salvo financiero
                                            </Tag>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </header>

                {/* ========== CUERPO PRINCIPAL ========== */}
                <Tabs
                    defaultActiveKey="info"
                    tabBarExtraContent={{
                        right: isEditing ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="small"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="small"
                                    type="primary"
                                    onClick={handleSave}
                                >
                                    Guardar
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Tooltip title="Editar">
                                    <Button
                                        type="text"
                                        shape="circle"
                                        onClick={handleStartEditing}
                                        className="!flex items-center justify-center"
                                        icon={
                                            <MdOutlineEdit className="text-xl text-slate-600 dark:text-[#a8a59e]" />
                                        }
                                    />
                                </Tooltip>
                                <Tooltip title="WhatsApp">
                                    <Button
                                        type="text"
                                        shape="circle"
                                        onClick={handleWhatsAppClick}
                                        className="!flex items-center justify-center"
                                        icon={
                                            <FaWhatsapp className="text-xl text-green-600 dark:text-green-500" />
                                        }
                                    />
                                </Tooltip>
                                <Tooltip title="Archivar">
                                    <Button
                                        type="text"
                                        shape="circle"
                                        onClick={handleArchive}
                                        className="!flex items-center justify-center"
                                        icon={
                                            <MdOutlineArchive className="text-xl text-slate-600 dark:text-[#a8a59e]" />
                                        }
                                    />
                                </Tooltip>
                            </div>
                        ),
                    }}
                    items={[
                        {
                            key: "info",
                            label: "Información",
                            children: (
                    <div className="space-y-8">
                        {/* Secciones de información en dos columnas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                        <InfoSection title="Información Personal" flush>
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
                                        <Option value="TI">
                                            Tarjeta de Identidad
                                        </Option>
                                        <Option value="CE">
                                            Cédula de Extranjería
                                        </Option>
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
                                    <DatePicker
                                        format="YYYY-MM-DD"
                                        className="w-full"
                                    />
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
                        </InfoSection>

                        <InfoSection title="Información de Contacto" flush>
                                <FieldItem
                                    label="Email"
                                    name="email"
                                    value={student.email}
                                    isEditing={isEditing}
                                >
                                    <Input
                                        placeholder="correo@ejemplo.com"
                                        allowClear
                                    />
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
                        </InfoSection>
                        </div>

                        <div className="space-y-6">
                        <InfoSection title="Información Académica y Administrativa" flush>
                                {/* 🔥 CAMBIO: Programas múltiples */}
                                <FieldItem
                                    label="Programas"
                                    name="programasIds"
                                    value={programasAsociadosNombres}
                                    isEditing={isEditing}
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Seleccionar programa(s)"
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
                                    <Select
                                        placeholder="Seleccionar modalidad"
                                        allowClear
                                    >
                                        <Option value="Clases en Linea">
                                            Clases en línea
                                        </Option>
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
                                            ? fmt(Number(student.matricula))
                                            : null
                                    }
                                    isEditing={isEditing}
                                >
                                    <InputNumber
                                        className="w-full"
                                        min={0}
                                        addonAfter={currSuffix}
                                        formatter={currFormatter}
                                        parser={currParser}
                                        precision={currPrecision}
                                        step={currStep}
                                    />
                                </FieldItem>

                                <FieldItem
                                    label="SIMAT"
                                    name="simat"
                                    value={
                                        student.simat ? "Activo" : "No activo"
                                    }
                                    isEditing={isEditing}
                                >
                                    <Select allowClear>
                                        <Option value={true}>Activo</Option>
                                        <Option value={false}>
                                            No activo
                                        </Option>
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
                                        <Option value={true}>
                                            Matrícula paga
                                        </Option>
                                        <Option value={false}>
                                            Matrícula pendiente
                                        </Option>
                                    </Select>
                                </FieldItem>

                                <FieldItem
                                    label="Estado estudiante"
                                    name="activo"
                                    value={
                                        student.activo ? "Activo" : "Inactivo"
                                    }
                                    isEditing={isEditing}
                                >
                                    <Select allowClear>
                                        <Option value={true}>Activo</Option>
                                        <Option value={false}>Inactivo</Option>
                                    </Select>
                                </FieldItem>
                        </InfoSection>

                        <InfoSection title="Información de Acudiente" flush>
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
                        </InfoSection>

                        <InfoSection title="Estado y Fechas Clave" flush>
                                <FieldItem
                                    label="Fecha de inscripción"
                                    name="fecha_inscripcion"
                                    value={formatDate(student.fecha_inscripcion)}
                                    isEditing={isEditing}
                                >
                                    <DatePicker
                                        format="YYYY-MM-DD"
                                        className="w-full"
                                    />
                                </FieldItem>

                                <FieldItem
                                    label="Fecha de graduación"
                                    name="fecha_graduacion"
                                    value={formatDate(student.fecha_graduacion)}
                                    isEditing={isEditing}
                                >
                                    <DatePicker
                                        format="YYYY-MM-DD"
                                        className="w-full"
                                    />
                                </FieldItem>

                                <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#3a3a38] transition-colors">
                                    <span className="text-[13px] font-medium text-slate-800 dark:text-[#faf9f5]">
                                        Candidato a grado
                                    </span>
                                    <Switch
                                        checked={!!student.posible_graduacion}
                                        onChange={handleToggleCandidate}
                                        disabled={isEditing}
                                    />
                                </div>
                        </InfoSection>
                        </div>
                        </div>
                    </div>
                            ),
                        },
                        {
                            key: "gestion",
                            label: "Estado y documentos",
                            children: (
                    <div className="space-y-8">
                        {/* ========== PAZ Y SALVO ========== */}
                        <InfoSection title="Paz y Salvo">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Text className="text-xs text-slate-700 font-semibold block">
                                            Paz y salvo académico
                                        </Text>
                                        <Text className="text-[11px] text-slate-500">
                                            {student.paz_salvo_academico
                                                ? `Otorgado el ${formatDate(
                                                      student.paz_salvo_academico_fecha
                                                  )}`
                                                : "Pendiente"}
                                        </Text>
                                    </div>
                                    <Switch
                                        checked={!!student.paz_salvo_academico}
                                        onChange={(checked) =>
                                            handleTogglePazSalvo("academico", checked)
                                        }
                                        disabled={isEditing}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Text className="text-xs text-slate-700 font-semibold block">
                                            Paz y salvo financiero
                                        </Text>
                                        <Text className="text-[11px] text-slate-500">
                                            {student.paz_salvo_financiero
                                                ? `Otorgado el ${formatDate(
                                                      student.paz_salvo_financiero_fecha
                                                  )}`
                                                : "Pendiente"}
                                        </Text>
                                    </div>
                                    <Switch
                                        checked={!!student.paz_salvo_financiero}
                                        onChange={(checked) =>
                                            handleTogglePazSalvo("financiero", checked)
                                        }
                                        disabled={isEditing}
                                    />
                                </div>

                                <Text type="secondary" className="text-[11px] block">
                                    Puedes otorgar uno, el otro o ambos. El estudiante
                                    verá este estado en su portal.
                                </Text>
                            </div>
                        </InfoSection>

                        {/* ========== CERTIFICADOS DEL ESTUDIANTE ========== */}
                        <InfoSection title="Certificados del Estudiante">
                            <div className="space-y-4">
                                <div>
                                    <Text className="text-xs text-slate-500 font-semibold block mb-1">
                                        Cargar certificado (PDF)
                                    </Text>
                                    <Upload
                                        showUploadList={false}
                                        customRequest={handleUploadCertificado}
                                        accept=".pdf,application/pdf"
                                        disabled={uploadingCert}
                                    >
                                        <Button
                                            loading={uploadingCert}
                                            icon={<FaGraduationCap />}
                                            className="w-full"
                                        >
                                            Subir certificado PDF
                                        </Button>
                                    </Upload>
                                    <Text type="secondary" className="text-[11px]">
                                        El estudiante verá estos certificados en su portal,
                                        en las secciones <b>Certificados</b> y <b>Paz y Salvo</b>.
                                    </Text>
                                </div>

                                <div>
                                    <Text className="text-xs text-slate-500 font-semibold block mb-2">
                                        Certificados cargados
                                    </Text>
                                    {certsLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Spin size="small" />
                                            <Text>Cargando certificados...</Text>
                                        </div>
                                    ) : certificados.length === 0 ? (
                                        <Text type="secondary" className="text-sm">
                                            No hay certificados cargados para este estudiante.
                                        </Text>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {certificados.map((cert) => (
                                                <div
                                                    key={cert.id}
                                                    className="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-md bg-slate-50"
                                                >
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium text-slate-800 truncate">
                                                            {cert.nombre}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {cert.created_at
                                                                ? formatDate(cert.created_at)
                                                                : "Certificado PDF"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <a
                                                            href={cert.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Button size="small">Ver</Button>
                                                        </a>
                                                        <Button
                                                            size="small"
                                                            danger
                                                            onClick={() => handleDeleteCertificado(cert)}
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
                                        <Button
                                            loading={uploadingDoc}
                                            className="w-full"
                                        >
                                            Seleccionar archivo(s)
                                        </Button>
                                    </Upload>
                                    <Text
                                        type="secondary"
                                        className="text-[11px]"
                                    >
                                        Puedes subir PDFs, imágenes u otros
                                        documentos relevantes del estudiante.
                                    </Text>
                                </div>

                                <div>
                                    <Text className="text-xs text-slate-500 font-semibold block mb-2">
                                        Documentos subidos
                                    </Text>
                                    {docsLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Spin size="small" />
                                            <Text>
                                                Cargando documentos...
                                            </Text>
                                        </div>
                                    ) : documents.length === 0 ? (
                                        <Text
                                            type="secondary"
                                            className="text-sm"
                                        >
                                            No hay documentos registrados para
                                            este estudiante.
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
                                                            {doc.nombre_original ||
                                                                doc.nombre}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {doc.tipo_mime ||
                                                                doc.mimetype ||
                                                                "Documento"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="small"
                                                            onClick={() =>
                                                                handlePreviewDocument(
                                                                    doc
                                                                )
                                                            }
                                                        >
                                                            Ver
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            danger
                                                            onClick={() =>
                                                                handleDeleteDocument(
                                                                    doc
                                                                )
                                                            }
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

                        <InfoSection title="Horario Semanal">
                            <StudentHorario studentId={studentId} compact={true} hideEmpty={true} />
                        </InfoSection>

                        <InfoSection title="Acciones Rápidas">
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
                                    disabled={
                                        isEditing || !!student.fecha_graduacion
                                    }
                                    className="w-full"
                                >
                                    Marcar como Graduado
                                </Button>
                            </div>
                        </InfoSection>
                    </div>
                            ),
                        },
                        {
                            key: "pagos",
                            label: "Pagos",
                            children: (
                                <StudentInvoices studentId={studentId} />
                            ),
                        },
                        {
                            key: "calificaciones",
                            label: "Calificaciones",
                            children: (
                                <StudentGrades studentId={studentId} />
                            ),
                        },
                        {
                            key: "comentarios",
                            label: "Comentarios",
                            children: (
                                <StudentComments studentId={studentId} />
                            ),
                        },
                    ]}
                />
                </div>
            </Form>

            {/* MODAL DE ARCHIVADO (mismo flujo que la tabla) */}
            <Modal
                open={archiveModalOpen}
                title="Archivar estudiante"
                okText="Archivar"
                cancelText="Cancelar"
                okButtonProps={{
                    style: { background: "#fa8c16", borderColor: "#fa8c16" },
                    disabled:
                        !archiveReason ||
                        (archiveReason === "Otro motivo" &&
                            !archiveCustomReason.trim()),
                    loading: archiving,
                }}
                onOk={confirmArchive}
                onCancel={() => setArchiveModalOpen(false)}
            >
                <p className="text-slate-600 dark:text-[#a8a59e] mb-4">
                    ¿Por qué vas a archivar a{" "}
                    <strong>
                        {student?.nombre} {student?.apellido}
                    </strong>
                    ? El estudiante saldrá de la lista principal pero conservará
                    todo su historial.
                </p>
                <Radio.Group
                    value={archiveReason}
                    onChange={(e) => {
                        setArchiveReason(e.target.value);
                        setArchiveCustomReason("");
                    }}
                    className="w-full"
                >
                    <Space direction="vertical" className="w-full">
                        {ARCHIVE_REASONS.map((reason) => (
                            <Radio key={reason} value={reason}>
                                {reason}
                            </Radio>
                        ))}
                    </Space>
                </Radio.Group>
                {archiveReason === "Otro motivo" && (
                    <Input.TextArea
                        className="mt-3"
                        rows={2}
                        maxLength={200}
                        placeholder="Escribe la razón del archivado..."
                        value={archiveCustomReason}
                        onChange={(e) => setArchiveCustomReason(e.target.value)}
                    />
                )}
            </Modal>

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
