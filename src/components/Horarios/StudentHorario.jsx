import React, { useState, useEffect } from "react";
import { getHorariosByEstudiante } from "../../services/horarios/horariosService";
import WeeklyCalendar from "./WeeklyCalendar";

/**
 * StudentHorario
 * Carga y muestra el horario semanal de un estudiante en formato calendario.
 * Props:
 *  - studentId: number
 *  - compact: boolean (vista reducida para columna lateral)
 *  - hideEmpty: boolean (ocultar días sin clases)
 */
export default function StudentHorario({ studentId, compact = false, hideEmpty = false }) {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    getHorariosByEstudiante(studentId)
      .then((data) => setHorarios(Array.isArray(data) ? data : []))
      .catch(() => setHorarios([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <WeeklyCalendar
      horarios={horarios}
      loading={loading}
      compact={compact}
      hideEmpty={hideEmpty}
    />
  );
}
