// src/pages/evaluations/MyStudentEvaluationsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Card, Spin, Alert, message } from "antd";
import { useNavigate } from "react-router-dom";
import StudentEvaluationsTab from "../../components/PublicForms/StudentEvaluationsTab";
import { getStudentAssignments } from "../../services/evaluation/evaluationService";

// Si tienes un contexto de auth, podrías usarlo así:
// import { useAuth } from "../../context/AuthContext";

const MyStudentEvaluationsPage = () => {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔐 OBTENER ID DEL ESTUDIANTE
  // Ajusta aquí según tu estructura de auth.
  // Por ejemplo, si en el token guardas user.student_id:
  // const { user } = useAuth();
  // const studentId = user?.student_id;
  const studentId = localStorage.getItem("student_id"); // EJEMPLO simple

  const fetchAssignments = useCallback(async () => {
    if (!studentId) {
      message.error("No se encontró el ID del estudiante.");
      return;
    }

    try {
      setLoading(true);
      const data = await getStudentAssignments(studentId);
      // data debería ser un array de asignaciones con info de la evaluación

      const mapped = (data || []).map((item) => ({
        // ID de la asignación (lo usamos para navegar)
        id: item.id,
        key: item.id,

        // Datos de la evaluación (según lo que devuelva tu backend)
        titulo: item.titulo || item.evaluacion_titulo || "Sin título",

        // Estado: normalizamos un poco por si viene 'finalizada'
        estado:
          item.estado === "finalizada"
            ? "resuelta"
            : item.estado || "pendiente",

        // Intentos
        intentosRealizados:
          item.intentos_realizados ?? item.intentosRealizados ?? 0,
        intentosMax: item.intentos_max ?? item.intentosMax ?? 1,

        // Calificación
        calificacion: item.calificacion ?? null,

        // Fecha fin
        fechaFin: item.fecha_fin || item.fechaFin || null,
      }));

      setEvaluations(mapped);
    } catch (error) {
      console.error(error);
      message.error("Error al cargar las evaluaciones del estudiante.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleStartEvaluation = (record) => {
    // record.id es el ID de la asignación
    navigate(`/evaluaciones/asignacion/${record.id}`);
  };

  if (!studentId) {
    return (
      <Alert
        type="error"
        message="No se encontró el estudiante"
        description="Inicia sesión nuevamente o verifica tu acceso al portal de estudiantes."
      />
    );
  }

  return (
    <Card title="Mis evaluaciones">
      {loading ? (
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <Spin />
        </div>
      ) : (
        <StudentEvaluationsTab
          evaluations={evaluations}
          onStartEvaluation={handleStartEvaluation}
        />
      )}
    </Card>
  );
};

export default MyStudentEvaluationsPage;
