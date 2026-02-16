import React from "react";
import { Tag } from "antd";
import {
  UserOutlined,
  IdcardOutlined,
  BookOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

function StudentInfoTab({ studentInfo, documentNumber, currentStudentId }) {
  if (!studentInfo) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
        No se encontró información del estudiante. Intente iniciar sesión nuevamente.
      </div>
    );
  }

  const isActive =
    studentInfo.activo === true ||
    studentInfo.activo === "true" ||
    studentInfo.activo === "activo" ||
    studentInfo.activo === 1 ||
    studentInfo.activo === "1";

  const fullName =
    studentInfo.nombre_completo ||
    `${studentInfo.nombre || ""} ${studentInfo.apellido || ""}`.trim() ||
    "N/A";

  const programas = studentInfo.programas_asociados || [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#1f2937",
            letterSpacing: "-0.3px",
          }}
        >
          Información Personal
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "#9ca3af",
            lineHeight: 1.4,
          }}
        >
          Datos registrados en el sistema académico
        </p>
      </div>

      {/* Info cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <InfoCard
          icon={<UserOutlined />}
          label="Nombres y Apellidos"
          value={fullName}
          color="#4338ca"
          bg="#eef2ff"
        />
        <InfoCard
          icon={<IdcardOutlined />}
          label="Documento de Identidad"
          value={documentNumber || studentInfo.documento || "N/A"}
          color="#0f766e"
          bg="#f0fdfa"
        />
        <InfoCard
          icon={<TeamOutlined />}
          label="Coordinador(a)"
          value={
            studentInfo.coordinador ||
            studentInfo.coordinador_id ||
            "No asignado"
          }
          color="#b45309"
          bg="#fffbeb"
        />
        <InfoCard
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          label="Estado"
          value={
            <Tag
              color={isActive ? "success" : "error"}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                padding: "2px 12px",
              }}
            >
              {isActive ? "Activo" : "Inactivo"}
            </Tag>
          }
          color={isActive ? "#15803d" : "#dc2626"}
          bg={isActive ? "#f0fdf4" : "#fef2f2"}
        />
      </div>

      {/* Programs section */}
      {programas.length > 0 && (
        <div>
          <h4
            style={{
              margin: "0 0 14px",
              fontSize: 15,
              fontWeight: 700,
              color: "#1f2937",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BookOutlined style={{ color: "#4338ca" }} /> Programas Inscritos
          </h4>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {programas.map((prog, idx) => (
              <div
                key={prog.programa_id || idx}
                style={{
                  background: "#f9fafb",
                  border: "1px solid #f3f4f6",
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    {prog.nombre || "Programa sin nombre"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    {prog.tipo_programa || "—"}
                    {prog.duracion_meses
                      ? ` · ${prog.duracion_meses} meses`
                      : ""}
                  </div>
                </div>

                <Tag
                  color={
                    prog.tipo_programa === "Tecnicos" ||
                      prog.tipo_programa === "Tecnico"
                      ? "blue"
                      : "purple"
                  }
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 11,
                    padding: "2px 10px",
                  }}
                >
                  {prog.tipo_programa === "Tecnicos" ||
                    prog.tipo_programa === "Tecnico"
                    ? "Técnico"
                    : "Validación"}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p
        style={{
          marginTop: 24,
          fontSize: 12,
          color: "#9ca3af",
          lineHeight: 1.5,
          padding: "12px 16px",
          background: "#f9fafb",
          borderRadius: 10,
          border: "1px solid #f3f4f6",
        }}
      >
        Verifica que todos tus datos sean correctos. Si encuentras algún error,
        comunícate con la secretaría académica para realizar la corrección.
      </p>
    </div>
  );
}

/* ===== INFO CARD ===== */
function InfoCard({ icon, label, value, color, bg }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        padding: "16px 18px",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            fontSize: 14,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.3px",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#1f2937",
          paddingLeft: 38,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default StudentInfoTab;
