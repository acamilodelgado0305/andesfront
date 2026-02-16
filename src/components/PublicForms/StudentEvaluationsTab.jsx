import React, { useState } from "react";
import { Tag, Button, Empty } from "antd";
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  ReloadOutlined,
  EyeOutlined,
  RightOutlined,
} from "@ant-design/icons";

function StudentEvaluationsTab({ evaluations, onStartEvaluation }) {
  if (!evaluations || evaluations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <Empty
          description={
            <span style={{ color: "#9ca3af" }}>
              No tienes evaluaciones asignadas en este momento.
            </span>
          }
        />
      </div>
    );
  }

  // Group by status
  const pending = evaluations.filter(
    (e) => (e.estado || "pendiente") === "pendiente"
  );
  const inProgress = evaluations.filter((e) => e.estado === "en_progreso");
  const completed = evaluations.filter((e) => e.estado === "resuelta");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#1f2937",
            letterSpacing: "-0.3px",
          }}
        >
          Mis Evaluaciones
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "#9ca3af",
            lineHeight: 1.4,
          }}
        >
          Revisa tus evaluaciones pendientes, preséntalas o consulta tus
          resultados.
        </p>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <SummaryBadge
          label="Pendientes"
          count={pending.length}
          color="#f59e0b"
          bg="#fffbeb"
          border="#fef3c7"
        />
        {inProgress.length > 0 && (
          <SummaryBadge
            label="En progreso"
            count={inProgress.length}
            color="#3b82f6"
            bg="#eff6ff"
            border="#dbeafe"
          />
        )}
        <SummaryBadge
          label="Completadas"
          count={completed.length}
          color="#10b981"
          bg="#ecfdf5"
          border="#d1fae5"
        />
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {evaluations.map((ev) => (
          <EvaluationCard
            key={ev.asignacion_id || ev.asignacionId || ev.evaluacion_id || ev.id || ev.key}
            evaluation={ev}
            onStart={() => onStartEvaluation(ev)}
          />
        ))}
      </div>
    </div>
  );
}

/* ===== SUMMARY BADGE ===== */
function SummaryBadge({ label, count, color, bg, border }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        fontSize: 12,
        fontWeight: 600,
        color,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {count}
      </span>
      {label}
    </div>
  );
}

/* ===== EVALUATION CARD ===== */
function EvaluationCard({ evaluation, onStart }) {
  const [hovered, setHovered] = useState(false);
  const ev = evaluation;

  const estado = ev.estado || "pendiente";
  const realizados = ev.intentosRealizados ?? ev.intentos_realizados ?? 0;
  const max = ev.intentosMax ?? ev.intentos_max ?? null;
  const hasLimit = max !== null && max !== undefined;
  const hasAttemptsLeft = !hasLimit || realizados < max;

  const now = new Date();
  const fechaFin = ev.fechaFin || ev.fecha_fin;
  const isExpired = fechaFin && new Date(fechaFin) < now;
  const canAnswer = hasAttemptsLeft && !isExpired && estado !== "resuelta";

  // Colors by status
  const statusConfig = {
    pendiente: {
      color: "#f59e0b",
      bg: "#fffbeb",
      border: "#fef3c7",
      icon: <ClockCircleOutlined />,
      label: "Pendiente",
      gradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",
    },
    en_progreso: {
      color: "#3b82f6",
      bg: "#eff6ff",
      border: "#dbeafe",
      icon: <ReloadOutlined />,
      label: "En progreso",
      gradient: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    },
    resuelta: {
      color: "#10b981",
      bg: "#ecfdf5",
      border: "#d1fae5",
      icon: <CheckCircleOutlined />,
      label: "Completada",
      gradient: "linear-gradient(90deg, #10b981, #34d399)",
    },
  };

  const config = statusConfig[estado] || statusConfig.pendiente;

  // Button config
  let buttonLabel = "Presentar evaluación";
  let buttonIcon = <PlayCircleOutlined />;
  let buttonGradient = "linear-gradient(135deg, #4338ca, #6366f1)";

  if (canAnswer && realizados > 0) {
    buttonLabel = "Reintentar";
    buttonIcon = <ReloadOutlined />;
    buttonGradient = "linear-gradient(135deg, #b45309, #f59e0b)";
  }

  if (!canAnswer) {
    buttonLabel = "Ver resultados";
    buttonIcon = <EyeOutlined />;
    buttonGradient = "linear-gradient(135deg, #374151, #6b7280)";
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #f0f0f0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 28px rgba(0,0,0,0.08)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer",
      }}
      onClick={onStart}
    >
      {/* Accent bar */}
      <div
        style={{
          height: 4,
          background: config.gradient,
        }}
      />

      <div style={{ padding: "18px 22px" }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: "#1f2937",
                letterSpacing: "-0.2px",
              }}
            >
              {ev.titulo}
            </h4>
            {ev.descripcion && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "#9ca3af",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ev.descripcion}
              </p>
            )}
          </div>

          <Tag
            icon={config.icon}
            style={{
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 10px",
              border: `1px solid ${config.border}`,
              background: config.bg,
              color: config.color,
              flexShrink: 0,
            }}
          >
            {config.label}
          </Tag>
        </div>

        {/* Info chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: "1px solid #f3f4f6",
            flexWrap: "wrap",
          }}
        >
          {/* Intentos */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: hasAttemptsLeft ? "#6b7280" : "#ef4444",
              fontWeight: 600,
            }}
          >
            <ReloadOutlined style={{ fontSize: 12 }} />
            Intentos: {realizados}
            {hasLimit ? `/${max}` : " / ∞"}
          </div>

          {/* Calificación */}
          {ev.calificacion != null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#10b981",
                fontWeight: 700,
              }}
            >
              <TrophyOutlined style={{ fontSize: 12 }} />
              Nota: {Number(ev.calificacion).toFixed(1)}
            </div>
          )}

          {/* Fecha fin */}
          {fechaFin && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: isExpired ? "#ef4444" : "#6b7280",
                fontWeight: 500,
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 11 }} />
              {isExpired
                ? "Expirada"
                : `Hasta: ${new Date(fechaFin).toLocaleDateString()}`}
            </div>
          )}

          {/* Tiempo límite */}
          {ev.tiempo_limite_min && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#6b7280",
                fontWeight: 500,
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 11 }} />
              {ev.tiempo_limite_min} min
            </div>
          )}
        </div>

        {/* Action row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!hasAttemptsLeft && (
            <span
              style={{
                fontSize: 11,
                color: "#ef4444",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ExclamationCircleOutlined />
              Sin intentos restantes
            </span>
          )}
          {hasAttemptsLeft && !isExpired && estado !== "resuelta" && (
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {realizados === 0
                ? "Haz clic para presentar tu evaluación"
                : "Puedes intentar nuevamente"}
            </span>
          )}

          <Button
            type="primary"
            size="small"
            icon={buttonIcon}
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 12,
              background: buttonGradient,
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              paddingLeft: 14,
              paddingRight: 14,
            }}
          >
            {buttonLabel} <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StudentEvaluationsTab;
