import React, { useState } from "react";
import { Button, message } from "antd";
import {
  CheckCircleFilled,
  ClockCircleFilled,
  ReadOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { generatePazSalvoPDF } from "../Utilidades/generatePazSalvoPDF";

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

/* Una tarjeta de estado (Académico o Financiero) */
function StatusCard({ icon, title, isClear, fecha }) {
  return (
    <div
      style={{
        ...styles.card,
        borderColor: isClear ? "#bbf7d0" : "#fde68a",
        background: isClear ? "#f0fdf4" : "#fffbeb",
      }}
    >
      <div
        style={{
          ...styles.cardIcon,
          background: isClear ? "#dcfce7" : "#fef3c7",
          color: isClear ? "#15803d" : "#b45309",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.cardTitle}>{title}</div>
        <div
          style={{
            ...styles.cardStatus,
            color: isClear ? "#15803d" : "#b45309",
          }}
        >
          {isClear ? <CheckCircleFilled /> : <ClockCircleFilled />}
          {isClear ? "A paz y salvo" : "Pendiente"}
        </div>
        {isClear && fecha && (
          <div style={styles.cardDate}>Otorgado el {fecha}</div>
        )}
      </div>
    </div>
  );
}

function StudentPazSalvoTab({ studentInfo }) {
  if (!studentInfo) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
        No se encontró información del estudiante.
      </div>
    );
  }

  const [downloading, setDownloading] = useState(false);

  const academico = !!studentInfo.paz_salvo_academico;
  const financiero = !!studentInfo.paz_salvo_financiero;
  const todo = academico && financiero;
  const puedeDescargar = academico || financiero;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generatePazSalvoPDF(studentInfo);
      message.success("Constancia descargada");
    } catch (err) {
      console.error(err);
      message.error(err.message || "No se pudo generar la constancia");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={styles.heading}>Paz y Salvo</h3>
        <p style={styles.sub}>
          Estado de tu paz y salvo académico y financiero
        </p>
      </div>

      {/* Banner resumen */}
      <div
        style={{
          ...styles.banner,
          background: todo ? "#f0fdf4" : "#fffbeb",
          borderColor: todo ? "#bbf7d0" : "#fde68a",
        }}
      >
        <SafetyCertificateOutlined
          style={{
            fontSize: 26,
            color: todo ? "#16a34a" : "#d97706",
          }}
        />
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: todo ? "#15803d" : "#b45309",
            }}
          >
            {todo
              ? "¡Estás completamente a paz y salvo!"
              : "Tienes requisitos pendientes"}
          </div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
            {todo
              ? "Cumples con el paz y salvo académico y financiero."
              : "Ponte al día para completar tu paz y salvo."}
          </div>
        </div>
      </div>

      {/* Tarjetas */}
      <div style={styles.grid}>
        <StatusCard
          icon={<ReadOutlined />}
          title="Académico"
          isClear={academico}
          fecha={formatDate(studentInfo.paz_salvo_academico_fecha)}
        />
        <StatusCard
          icon={<DollarOutlined />}
          title="Financiero"
          isClear={financiero}
          fecha={formatDate(studentInfo.paz_salvo_financiero_fecha)}
        />
      </div>

      {/* Descarga del certificado */}
      <div style={styles.downloadBox}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={styles.downloadTitle}>Constancia de Paz y Salvo</div>
          <div style={styles.downloadDesc}>
            {puedeDescargar
              ? "Descarga e imprime tu constancia con tu estado de paz y salvo."
              : "Aún no estás a paz y salvo. La constancia estará disponible cuando la institución lo otorgue."}
          </div>
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={downloading}
          disabled={!puedeDescargar}
          onClick={handleDownload}
          size="large"
          style={{
            background: puedeDescargar ? "#0f3460" : undefined,
            borderColor: puedeDescargar ? "#0f3460" : undefined,
          }}
        >
          Descargar constancia
        </Button>
      </div>

      {/* Nota */}
      <p style={styles.note}>
        El paz y salvo es asignado por la institución. Si crees que hay un error
        en tu estado, comunícate con la secretaría académica o el área financiera.
      </p>
    </div>
  );
}

const styles = {
  heading: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1f2937",
    letterSpacing: "-0.3px",
  },
  sub: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 1.4,
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    border: "1px solid",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 18,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    border: "1px solid",
    borderRadius: 14,
    padding: "18px 18px",
  },
  cardIcon: {
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1f2937",
  },
  cardStatus: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 3,
  },
  cardDate: {
    fontSize: 11.5,
    color: "#6b7280",
    marginTop: 3,
  },
  downloadBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 18,
    padding: "18px 20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
  },
  downloadTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1f2937",
  },
  downloadDesc: {
    fontSize: 12.5,
    color: "#6b7280",
    marginTop: 3,
    lineHeight: 1.4,
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.5,
    padding: "12px 16px",
    background: "#f9fafb",
    borderRadius: 10,
    border: "1px solid #f3f4f6",
  },
};

export default StudentPazSalvoTab;
