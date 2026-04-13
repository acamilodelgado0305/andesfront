import React, { useState, useEffect } from "react";
import { Spin, Empty } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import { getHorariosByEstudiante } from "../../services/horarios/horariosService";
import WeeklyCalendar from "../Horarios/WeeklyCalendar";

export default function StudentHorarioTab({ currentStudentId }) {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentStudentId) { setLoading(false); return; }
    setLoading(true);
    getHorariosByEstudiante(currentStudentId)
      .then((data) => setHorarios(Array.isArray(data) ? data : []))
      .catch(() => setHorarios([]))
      .finally(() => setLoading(false));
  }, [currentStudentId]);

  if (!currentStudentId) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No se pudo cargar el horario" />
    );
  }

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "linear-gradient(135deg, #155153, #28a5a5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 17,
          }}
        >
          <CalendarOutlined />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1f2937" }}>
            Mi Horario Semanal
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Clases y materias asignadas por día
          </div>
        </div>
      </div>

      <WeeklyCalendar
        horarios={horarios}
        loading={loading}
        compact={false}
        hideEmpty={true}
      />
    </div>
  );
}
