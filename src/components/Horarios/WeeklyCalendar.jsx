import React from "react";
import { Empty, Spin } from "antd";
import { ClockCircleOutlined, EnvironmentOutlined, UserOutlined } from "@ant-design/icons";

/* ── Paleta de colores por materia (hash por id) ── */
const PALETTE = [
  { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", pill: "#3b82f620" },
  { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", pill: "#22c55e20" },
  { bg: "#fdf4ff", border: "#a855f7", text: "#7e22ce", pill: "#a855f720" },
  { bg: "#fff7ed", border: "#f97316", text: "#c2410c", pill: "#f9731620" },
  { bg: "#f0f9ff", border: "#06b6d4", text: "#0e7490", pill: "#06b6d420" },
  { bg: "#fefce8", border: "#eab308", text: "#854d0e", pill: "#eab30820" },
  { bg: "#fff1f2", border: "#f43f5e", text: "#be123c", pill: "#f43f5e20" },
  { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e", pill: "#14b8a620" },
];

const DAY_CONFIG = [
  { key: "Lunes",     short: "LUN", accent: "#3b82f6" },
  { key: "Martes",    short: "MAR", accent: "#8b5cf6" },
  { key: "Miércoles", short: "MIÉ", accent: "#06b6d4" },
  { key: "Jueves",    short: "JUE", accent: "#f59e0b" },
  { key: "Viernes",   short: "VIE", accent: "#10b981" },
  { key: "Sábado",    short: "SAB", accent: "#ec4899" },
  { key: "Domingo",   short: "DOM", accent: "#ef4444" },
];

function getColor(materia_id) {
  return PALETTE[(materia_id || 0) % PALETTE.length];
}

function formatTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

/* ── Slot card ── */
function SlotCard({ slot }) {
  const c = getColor(slot.materia_id);
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = `0 4px 14px ${c.border}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Subject name */}
      <div style={{ fontWeight: 700, fontSize: 13, color: c.text, lineHeight: 1.3, marginBottom: 6 }}>
        {slot.materia_nombre}
      </div>

      {/* Time */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: c.text, marginBottom: slot.docente_nombre || slot.aula ? 4 : 0 }}>
        <ClockCircleOutlined style={{ fontSize: 11 }} />
        <span style={{ fontWeight: 600 }}>
          {formatTime(slot.hora_inicio)} – {formatTime(slot.hora_fin)}
        </span>
      </div>

      {/* Teacher */}
      {slot.docente_nombre && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
          <UserOutlined style={{ fontSize: 10 }} />
          {slot.docente_nombre}
        </div>
      )}

      {/* Room + Program */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        {slot.aula && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: c.pill, color: c.text, borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>
            <EnvironmentOutlined style={{ fontSize: 10 }} /> {slot.aula}
          </span>
        )}
        {slot.programa_nombre && (
          <span style={{ background: "#f3f4f6", color: "#6b7280", borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 500 }}>
            {slot.programa_nombre}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Day column ── */
function DayColumn({ dayConfig, slots, compact }) {
  const hasSlots = slots.length > 0;

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: compact ? 130 : 155,
        maxWidth: 260,
      }}
    >
      {/* Day header */}
      <div
        style={{
          background: hasSlots ? dayConfig.accent : "#f3f4f6",
          borderRadius: 10,
          padding: "8px 10px",
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: hasSlots ? "rgba(255,255,255,0.85)" : "#9ca3af", letterSpacing: "0.8px", textTransform: "uppercase" }}>
          {dayConfig.short}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: hasSlots ? "#fff" : "#d1d5db" }}>
          {dayConfig.key}
        </div>
      </div>

      {/* Slots */}
      {hasSlots ? (
        <div>
          {slots
            .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""))
            .map((slot) => (
              <SlotCard key={slot.horario_id} slot={slot} />
            ))}
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed #e5e7eb",
            borderRadius: 10,
            padding: "20px 8px",
            textAlign: "center",
            color: "#d1d5db",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Libre
        </div>
      )}
    </div>
  );
}

/**
 * WeeklyCalendar
 * Props:
 *  - horarios: array of schedule slots from getHorariosByEstudiante
 *  - loading: boolean
 *  - compact: boolean (smaller size for sidebar use)
 *  - hideEmpty: boolean (don't show empty day columns)
 */
export default function WeeklyCalendar({ horarios = [], loading = false, compact = false, hideEmpty = false }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <Spin size="small" />
      </div>
    );
  }

  if (!horarios.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Sin horarios asignados"
        style={{ padding: "24px 0" }}
      />
    );
  }

  // Build day → slots map
  const byDay = {};
  DAY_CONFIG.forEach((d) => {
    byDay[d.key] = horarios.filter((h) => h.dia_semana === d.key);
  });

  const visibleDays = hideEmpty
    ? DAY_CONFIG.filter((d) => byDay[d.key].length > 0)
    : DAY_CONFIG;

  // Stats
  const totalClasses = horarios.length;
  const activeDays = DAY_CONFIG.filter((d) => byDay[d.key].length > 0).length;
  const uniqueMaterias = [...new Set(horarios.map((h) => h.materia_nombre))].length;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Stats bar */}
      {!compact && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Días activos", value: activeDays, color: "#3b82f6" },
            { label: "Clases / semana", value: totalClasses, color: "#8b5cf6" },
            { label: "Materias", value: uniqueMaterias, color: "#10b981" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flex: "1 1 auto",
                minWidth: 100,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1f2937", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid — horizontal scroll on mobile */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div
          style={{
            display: "flex",
            gap: compact ? 8 : 12,
            minWidth: compact ? visibleDays.length * 138 : visibleDays.length * 163,
          }}
        >
          {visibleDays.map((dayConfig) => (
            <DayColumn
              key={dayConfig.key}
              dayConfig={dayConfig}
              slots={byDay[dayConfig.key]}
              compact={compact}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {!compact && uniqueMaterias > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[...new Set(horarios.map((h) => h.materia_nombre))].map((name, i) => {
            const c = PALETTE[i % PALETTE.length];
            return (
              <span
                key={name}
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  color: c.text,
                  borderRadius: 8,
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
