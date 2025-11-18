// src/pages/evaluations/MyStudentEvaluationsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Card, Spin, Alert, message, Typography, Space, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import StudentEvaluationsTab from "../../components/PublicForms/StudentEvaluationsTab";
import { getStudentAssignments } from "../../services/evaluation/evaluationService";

const { Title, Text } = Typography;

const MyStudentEvaluationsPage = () => {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔐 ID del estudiante desde storage (ajusta según tu auth)
  const studentId = localStorage.getItem("student_id");

  const fetchAssignments = useCallback(async () => {
    if (!studentId) {
      message.error("No se encontró el ID del estudiante.");
      return;
    }

    try {
      setLoading(true);
      const data = await getStudentAssignments(studentId);

      const mapped = (data || []).map((item) => ({
        id: item.id,
        key: item.id,
        titulo: item.titulo || item.evaluacion_titulo || "Sin título",
        estado:
          item.estado === "finalizada"
            ? "resuelta"
            : item.estado || "pendiente",
        intentosRealizados:
          item.intentos_realizados ?? item.intentosRealizados ?? 0,
        intentosMax: item.intentos_max ?? item.intentosMax ?? 2,
        calificacion: item.calificacion ?? null,
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
    navigate(`/evaluaciones/asignacion/${record.id}`);
  };

  if (!studentId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #f3f6fb 0%, #eef2f9 40%, #ffffff 100%)",
          padding: 16,
        }}
      >
        <Alert
          type="error"
          showIcon
          message="No se encontró el estudiante"
          description="Inicia sesión nuevamente o verifica tu acceso al portal de estudiantes."
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f3f6fb 0%, #eef2f9 40%, #ffffff 100%)",
        padding: "24px 16px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.12)",
          }}
          bodyStyle={{ padding: 20 }}
        >
          {/* Encabezado tipo Microsoft / dashboard */}
          <Space
            style={{ marginBottom: 16, width: "100%" }}
            align="center"
            justify="space-between"
          >
            <div>
              <Title level={4} style={{ marginBottom: 0 }}>
                Mis evaluaciones
              </Title>
              <Text type="secondary">
                Revisa tus evaluaciones asignadas, calificaciones e intentos.
              </Text>
            </div>

            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAssignments}
              loading={loading}
            >
              Actualizar
            </Button>
          </Space>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
              }}
            >
              <Spin size="large" />
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Cargando tus evaluaciones...</Text>
              </div>
            </div>
          ) : (
            <StudentEvaluationsTab
              evaluations={evaluations}
              onStartEvaluation={handleStartEvaluation}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default MyStudentEvaluationsPage;
