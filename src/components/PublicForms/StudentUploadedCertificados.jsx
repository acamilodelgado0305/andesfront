import React, { useEffect, useState, useCallback } from "react";
import { Card, Button, Empty, Spin, Modal, Tag } from "antd";
import {
  FilePdfOutlined,
  EyeOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { getStudentCertificadosByDocument } from "../../services/student/studentService";

/* Formatea una fecha ISO a algo legible en español */
function formatDate(value) {
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
}

/**
 * Lista los certificados (PDF) que el admin cargó al estudiante.
 * Se muestra tanto en la sección "Certificados" como en "Paz y Salvo"
 * del portal del estudiante. Recibe el número de documento del estudiante.
 */
export default function StudentUploadedCertificados({ documento }) {
  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState("");

  const fetchCertificados = useCallback(async () => {
    if (!documento) return;
    setLoading(true);
    try {
      const data = await getStudentCertificadosByDocument(documento);
      setCertificados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("No se pudieron cargar los certificados del estudiante:", err);
      setCertificados([]);
    } finally {
      setLoading(false);
    }
  }, [documento]);

  useEffect(() => {
    fetchCertificados();
  }, [fetchCertificados]);

  const openPreview = (cert) => {
    setPreviewUrl(cert.url);
    setPreviewName(cert.nombre || "Certificado");
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewName("");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!certificados.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No tienes certificados cargados por la institución."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <SafetyCertificateOutlined style={{ color: "#155153", fontSize: 18 }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-[#faf9f5]">
          Certificados emitidos por la institución
        </span>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {certificados.map((cert) => (
          <Card
            key={cert.id}
            size="small"
            className="rounded-xl dark:bg-[#30302e] dark:border-[#403e3a]"
          >
            <div className="flex items-start gap-3">
              <div
                style={{
                  background: "#fef2f2",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexShrink: 0,
                }}
              >
                <FilePdfOutlined style={{ fontSize: 22, color: "#ef4444" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800 dark:text-[#faf9f5] break-words">
                  {cert.nombre || "Certificado"}
                </div>
                {cert.created_at && (
                  <Tag color="green" className="mt-1">
                    {formatDate(cert.created_at)}
                  </Tag>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openPreview(cert)}
              >
                Ver
              </Button>
              <a href={cert.url} target="_blank" rel="noopener noreferrer" download>
                <Button size="small" type="primary" icon={<DownloadOutlined />}>
                  Descargar
                </Button>
              </a>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        title={`Vista previa: ${previewName}`}
        open={!!previewUrl}
        onCancel={closePreview}
        width={1000}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={closePreview}>
            Cerrar
          </Button>,
          <a
            key="download"
            href={previewUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <Button type="primary" icon={<DownloadOutlined />}>
              Descargar PDF
            </Button>
          </a>,
        ]}
      >
        {previewUrl ? (
          <div style={{ height: "600px", width: "100%", background: "#f0f0f0", borderRadius: 8 }}>
            <iframe
              src={previewUrl}
              title="Vista previa certificado"
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
