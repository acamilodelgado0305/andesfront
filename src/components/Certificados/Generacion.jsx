import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Form, Input, Select, Button, notification, Upload, Card, DatePicker, Row, Col } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import dayjs from 'dayjs';
import { AuthContext } from '../../AuthContext';
import { getInventario } from '../../services/inventario/inventarioService';

const { Option } = Select;

// Estilos inspirados en la interfaz de Microsoft (Fluent UI)
const headerStyle = {
    marginBottom: '28px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e1e1e1',
    color: '#005A9E', // Azul corporativo
    fontSize: '22px',
    fontWeight: '600',
};

const buttonStyle = {
    width: '100%',
    backgroundColor: '#0078D4', // Azul primario de Microsoft
    borderColor: '#0078D4',
};

// ─────────────────────────────────────────────────────────────────────────
// Plantillas disponibles
// ─────────────────────────────────────────────────────────────────────────
// Cada plantilla declara qué PDFs produce y qué campos extra necesita, para que
// el formulario pida SOLO lo que esa plantilla usa.
const PLANTILLAS = {
    alimentos: {
        label: 'Manipulación de Alimentos (certificado + carnet)',
        descripcion: 'Genera el certificado A4 y el carnet. El curso no se elige: la plantilla es exclusiva de manipulación de alimentos y lo trae impreso.',
        documentos: ['Certificado', 'Carnet'],
        // Plantilla de un solo curso: no se pregunta, se aplica este valor.
        cursoFijo: 'Manipulación Higiénica de Alimentos',
        pideCurso: false,
        pideFoto: true,
        pidePeriodo: false,
    },
    diploma: {
        label: 'Diploma + Certificado (Alianza Capacitarte)',
        descripcion: 'Un solo PDF con las dos piezas de la acreditación: página 1 el diploma, página 2 el certificado. El folio se asigna automáticamente.',
        documentos: ['Diploma', 'Certificado'],
        cursoFijo: null,
        pideCurso: true,
        pideFoto: false,
        pidePeriodo: true,
    },
};

const sanitizar = (s) => String(s || '').replace(/\s+/g, '_');
const aISO = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : undefined);

function Generacion() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [fotoFile, setFotoFile] = useState(null);
    const [cursos, setCursos] = useState([]);
    const [loadingCursos, setLoadingCursos] = useState(true);
    const [plantilla, setPlantilla] = useState('alimentos');
    const { user } = useContext(AuthContext);

    const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND;
    const config = PLANTILLAS[plantilla];

    // Módulo privado: solo lo ven los negocios con 'GENERACION' asignado
    // (businesses.modulos_privados). El menú ya lo esconde; este guard cubre el
    // acceso escribiendo la URL a mano.
    const tieneAcceso = user?.role === 'superadmin' || (user?.modules || []).includes('GENERACION');

    // El catálogo de cursos que se pueden certificar es el Inventario del
    // negocio activo (el endpoint ya filtra por business_id).
    // Solo se pide cuando la plantilla activa realmente ofrece elegir curso:
    // la de alimentos no lo usa y no tiene sentido molestar con un error de
    // carga a un negocio que ni siquiera lleva inventario.
    const necesitaCursos = PLANTILLAS[plantilla].pideCurso;

    useEffect(() => {
        if (!tieneAcceso || !necesitaCursos) return undefined;
        let cancelado = false;

        (async () => {
            try {
                const data = await getInventario();
                if (!cancelado) setCursos(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error cargando el inventario:', err);
                if (!cancelado) {
                    notification.error({
                        message: 'No se pudo cargar el inventario',
                        description: 'Los cursos del select salen del módulo Inventario. Revisa la conexión e intenta de nuevo.',
                    });
                }
            } finally {
                if (!cancelado) setLoadingCursos(false);
            }
        })();

        return () => { cancelado = true; };
    }, [tieneAcceso, necesitaCursos]);

    if (!tieneAcceso) return <Navigate to="/inicio/dashboard" replace />;

    // Pide un PDF al backend y dispara la descarga.
    // Devuelve el folio que asignó el backend, si vino.
    const descargarPdf = async (endpoint, body, nombreArchivo) => {
        const esFormData = body instanceof FormData;
        const response = await fetch(`${API_BACKEND_URL}${endpoint}`, {
            method: 'POST',
            ...(esFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
            body: esFormData ? body : JSON.stringify(body),
        });

        if (!response.ok) {
            let detalle = `El servidor respondió ${response.status}.`;
            try {
                const data = await response.json();
                detalle = data.error || detalle;
            } catch { /* la respuesta no era JSON */ }
            throw new Error(detalle);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', nombreArchivo);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        // Requiere exposedHeaders: ['X-Folio'] en el CORS del backend.
        return response.headers.get('X-Folio');
    };

    const onFinish = async (values) => {
        setLoading(true);
        const {
            nombre, numeroDocumento, tipoDocumento, intensidadHoraria, curso,
            periodo, fechaExpedicion,
        } = values;

        notification.info({
            message: 'Procesando solicitud',
            description: `Generando ${config.documentos.join(' y ')}…`,
            duration: 0,
            key: 'generatingDocs',
        });

        // Base común a todas las plantillas. En las de un solo curso manda el
        // valor fijo, nunca el del formulario: si el usuario venía de otra
        // plantilla, `curso` conserva la selección anterior (Form no descarta
        // los campos desmontados) y se colaría un curso equivocado.
        const base = {
            nombre,
            numeroDocumento,
            tipoDocumento,
            intensidadHoraria,
            curso: config.cursoFijo ?? curso,
        };

        // Cada plantilla arma sus descargas: [endpoint, body, nombreArchivo]
        let descargas = [];

        if (plantilla === 'alimentos') {
            const carnetPayload = new FormData();
            Object.entries(base).forEach(([k, v]) => carnetPayload.append(k, v ?? ''));
            if (fotoFile) carnetPayload.append('foto', fotoFile);

            descargas = [
                ['/api/generar-certificado', base, `Certificado_${sanitizar(nombre)}.pdf`],
                ['/api/generar-carnet', carnetPayload, `Carnet_${sanitizar(nombre)}.pdf`],
            ];
        } else {
            // Diploma y certificado van en UN solo PDF de dos páginas: comparten
            // folio y así el navegador no bloquea la segunda descarga.
            descargas = [[
                '/api/generar-acreditacion',
                {
                    ...base,
                    fechaInicio: aISO(periodo?.[0]),
                    fechaFin: aISO(periodo?.[1]),
                    fechaExpedicion: aISO(fechaExpedicion),
                },
                `Acreditacion_${sanitizar(nombre)}.pdf`,
            ]];
        }

        const generados = [];
        const fallidos = [];
        let folioAsignado = null;

        for (const [endpoint, body, archivo] of descargas) {
            try {
                const folio = await descargarPdf(endpoint, body, archivo);
                if (folio) folioAsignado = folio;
                generados.push(archivo.split('_')[0]);
            } catch (err) {
                console.error(`Error generando ${archivo}:`, err);
                fallidos.push(`${archivo.split('_')[0]}: ${err.message}`);
            }
        }

        notification.destroy('generatingDocs');

        if (fallidos.length > 0) {
            notification.error({
                message: 'Algunos documentos no se generaron',
                description: fallidos.join(' · '),
                duration: 0,
            });
        }

        if (generados.length > 0) {
            notification.success({
                message: 'Documentos generados',
                description: folioAsignado
                    ? `Descargado ${generados.join(' y ')}. Folio asignado: ${folioAsignado}`
                    : `Se descargaron: ${generados.join(' y ')}.`,
                duration: folioAsignado ? 0 : 4.5, // el folio se queda hasta que lo cierren
            });
            if (fallidos.length === 0) {
                form.resetFields();
                setFotoFile(null);
                form.setFieldsValue({ plantilla, tipoDocumento: 'C.C', fechaExpedicion: dayjs() });
            }
        }

        setLoading(false);
    };

    const handleBeforeUpload = (file) => {
        setFotoFile(file);
        return false;
    };

    const normFile = (e) => (Array.isArray(e) ? e : e && e.fileList);

    return (
        <div className='bg-gray-50 dark:bg-[#262624] min-h-screen p-6'>
            <Card>
                <h2 style={headerStyle}>Generador de Documentos</h2>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ plantilla: 'alimentos', tipoDocumento: 'C.C', fechaExpedicion: dayjs() }}
                >
                    <Form.Item
                        label="Plantilla"
                        name="plantilla"
                        rules={[{ required: true }]}
                        extra={config.descripcion}
                    >
                        <Select
                            onChange={(v) => setPlantilla(v)}
                            options={Object.entries(PLANTILLAS).map(([value, p]) => ({ value, label: p.label }))}
                        />
                    </Form.Item>

                    {/* El catálogo de cursos certificables es el Inventario del negocio.
                        Las plantillas de un solo curso (alimentos) no lo preguntan. */}
                    {config.pideCurso && (
                        <Form.Item
                            label="Curso / Programa"
                            name="curso"
                            rules={[{ required: true, message: 'Por favor, selecciona el curso.' }]}
                            extra={!loadingCursos && cursos.length === 0
                                ? 'Este negocio no tiene ítems en Inventario. Créalos allí para poder elegirlos aquí.'
                                : 'Las opciones vienen del módulo Inventario.'}
                        >
                            <Select
                                showSearch
                                allowClear
                                loading={loadingCursos}
                                disabled={loadingCursos}
                                optionFilterProp="label"
                                placeholder={loadingCursos ? 'Cargando cursos…' : 'Selecciona el curso a certificar'}
                                notFoundContent={loadingCursos ? 'Cargando…' : 'Sin ítems en el inventario'}
                                options={cursos.map(item => ({ value: item.nombre, label: item.nombre }))}
                            />
                        </Form.Item>
                    )}

                    <Form.Item label="Nombre Completo" name="nombre" rules={[{ required: true, message: 'Por favor, ingresa el nombre.' }]}>
                        <Input placeholder="Ej: Ana Sofía Rincón" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Tipo de Documento" name="tipoDocumento" rules={[{ required: true, message: 'Por favor, selecciona el tipo.' }]}>
                                <Select>
                                    <Option value="C.C">C.C. (Cédula de Ciudadanía)</Option>
                                    <Option value="T.I">T.I. (Tarjeta de Identidad)</Option>
                                    <Option value="Pasaporte">Pasaporte</Option>
                                    <Option value="C.E">C.E. (Cédula de Extranjería)</Option>
                                    <Option value="PPT">PPT (Permiso por Protección Temporal)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label="Número de Documento" name="numeroDocumento" rules={[{ required: true, message: 'Por favor, ingresa el documento.' }]}>
                                <Input placeholder="Ej: 1098765432" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Intensidad Horaria"
                        name="intensidadHoraria"
                        rules={[{ required: true, message: 'Por favor, ingresa la intensidad horaria.' }]}
                        extra="Solo el número: las plantillas ya traen impresa la palabra «horas». Si escribes «120 Horas Académicas» el texto se encima."
                    >
                        <Input placeholder="Ej: 120" />
                    </Form.Item>

                    {config.pidePeriodo && (
                        <Row gutter={16}>
                            <Col xs={24} sm={14}>
                                <Form.Item
                                    label="Periodo del curso (inicio y fin)"
                                    name="periodo"
                                    rules={[{ required: true, message: 'Indica cuándo inició y finalizó el curso.' }]}
                                >
                                    <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={10}>
                                <Form.Item
                                    label="Fecha de expedición"
                                    name="fechaExpedicion"
                                    rules={[{ required: true, message: 'Indica la fecha de expedición.' }]}
                                >
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    {config.pideFoto && (
                        <Form.Item label="Fotografía para el Carnet (Opcional)" name="foto" valuePropName="fileList" getValueFromEvent={normFile}>
                            <ImgCrop
                                rotationSlider
                                aspect={3 / 4}
                                modalTitle="Editar Fotografía"
                                modalOk="Aceptar"
                                modalCancel="Cancelar"
                            >
                                <Upload
                                    beforeUpload={handleBeforeUpload}
                                    onRemove={() => setFotoFile(null)}
                                    maxCount={1}
                                    listType="picture"
                                    accept="image/png, image/jpeg"
                                >
                                    <Button icon={<UploadOutlined />}>Seleccionar Archivo</Button>
                                </Upload>
                            </ImgCrop>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} icon={<DownloadOutlined />} style={buttonStyle}>
                            {loading ? 'Generando…' : `Generar ${config.documentos.join(' + ')}`}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

export default Generacion;
