import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spin, notification, Modal, Empty, Tag } from "antd";
import {
  FilePdfOutlined,
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  getMisDocumentos,
  uploadMiDocumento,
  deleteMiDocumento,
  mensajeDeError,
} from "../../services/student/studentSelfService";

// =============================================================================
// "Mis Documentos" del portal del estudiante: el estudiante carga sus propios
// PDFs (cédula, diploma, certificado de EPS...) y los puede ver o borrar.
// Son distintos de "Certificados", que son los que emite la institución.
// =============================================================================

const MAX_MB = 10;

// Categorías sugeridas. El estudiante elige una para que la institución sepa
// qué está mirando; puede dejarlo en "Otro documento".
const TIPOS = [
  "Documento de identidad",
  "Diploma o acta de grado",
  "Certificado de EPS",
  "Certificado laboral",
  "Foto tipo documento",
  "Otro documento",
];

const formatearFecha = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

export default function StudentDocumentosTab() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [preview, setPreview] = useState(null); // { url, nombre }
  const fileInputRef = useRef(null);
  // Modal por hook (no estático): así el diálogo hereda el tema oscuro del
  // ConfigProvider. El Modal.confirm estático se queda siempre en claro.
  const [modal, modalContextHolder] = Modal.useModal();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setDocumentos(await getMisDocumentos());
    } catch (err) {
      console.warn("No se pudieron cargar los documentos del estudiante:", err);
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegirArchivo = () => fileInputRef.current?.click();

  const subir = async (event) => {
    const file = event.target.files?.[0];
    // Limpiamos el input siempre para poder volver a elegir el mismo archivo.
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      notification.warning({ message: "Solo se permiten archivos PDF." });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      notification.warning({ message: `El archivo no puede pesar más de ${MAX_MB} MB.` });
      return;
    }

    setSubiendo(true);
    try {
      const documento = await uploadMiDocumento(file, { tipo });
      setDocumentos((prev) => [documento, ...prev]);
      notification.success({ message: "Documento cargado correctamente." });
    } catch (err) {
      notification.error({ message: mensajeDeError(err, "No se pudo cargar el documento.") });
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = (doc) => {
    modal.confirm({
      title: "¿Eliminar este documento?",
      content: doc.nombre,
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await deleteMiDocumento(doc.id);
          setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
          notification.success({ message: "Documento eliminado." });
        } catch (err) {
          notification.error({ message: mensajeDeError(err, "No se pudo eliminar el documento.") });
        }
      },
    });
  };

  return (
    <div>
      {modalContextHolder}
      {/* ===== Encabezado ===== */}
      <div className="mb-5">
        <h3 className="m-0 text-lg font-bold text-gray-800 dark:text-[#faf9f5]">Mis Documentos</h3>
        <p className="m-0 mt-1 text-xs text-gray-400 dark:text-[#a8a59e]">
          Carga aquí tus documentos en PDF para que la institución los tenga en tu carpeta.
        </p>
      </div>

      {/* ===== Cargador ===== */}
      <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-[#403e3a] dark:bg-[#262624]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
              Tipo de documento
            </span>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#155153] focus:ring-2 focus:ring-[#155153]/20 dark:border-[#403e3a] dark:bg-[#30302e] dark:text-[#faf9f5]"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={subiendo}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={elegirArchivo}
            loading={subiendo}
            className="sm:w-auto"
          >
            Cargar PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={subir}
          />
        </div>
        <p className="m-0 mt-2 text-[11px] text-gray-400 dark:text-[#a8a59e]">
          Solo archivos PDF · máximo {MAX_MB} MB por documento
        </p>
      </div>

      {/* ===== Listado ===== */}
      {loading ? (
        <div className="py-10 text-center">
          <Spin />
        </div>
      ) : documentos.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Todavía no has cargado ningún documento."
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-[#403e3a] dark:bg-[#30302e]"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-shrink-0 rounded-lg bg-red-50 p-2.5 dark:bg-red-950/30">
                  <FilePdfOutlined style={{ fontSize: 22, color: "#ef4444" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-semibold text-gray-800 dark:text-[#faf9f5]">
                    {doc.nombre || "Documento"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {doc.tipo && <Tag color="blue">{doc.tipo}</Tag>}
                    {doc.created_at && (
                      <span className="text-[11px] text-gray-400 dark:text-[#a8a59e]">
                        {formatearFecha(doc.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setPreview({ url: doc.url, nombre: doc.nombre })}
                >
                  Ver
                </Button>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                  <Button size="small" icon={<DownloadOutlined />}>
                    Descargar
                  </Button>
                </a>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => eliminar(doc)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={`Vista previa: ${preview?.nombre || "Documento"}`}
        open={!!preview}
        onCancel={() => setPreview(null)}
        width={1000}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setPreview(null)}>
            Cerrar
          </Button>,
          <a key="download" href={preview?.url || "#"} target="_blank" rel="noopener noreferrer" download>
            <Button type="primary" icon={<DownloadOutlined />}>
              Descargar PDF
            </Button>
          </a>,
        ]}
      >
        {preview ? (
          <div style={{ height: 600, width: "100%", background: "var(--qc-surface-2)", borderRadius: 8 }}>
            <iframe
              src={preview.url}
              title="Vista previa del documento"
              width="100%"
              height="100%"
              style={{ border: "none", borderRadius: 8 }}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
