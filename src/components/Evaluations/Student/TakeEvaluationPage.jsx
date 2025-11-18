import React, { useEffect, useState } from "react";
import {
  Card,
  Radio,
  Input,
  Button,
  Space,
  message,
  Spin,
  Alert,
  Tag,
  Typography,
  Progress,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined,
  SendOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

import {
  getAssignmentDetail,
  sendEvaluationAnswers,
} from "../../../services/evaluation/evaluationService";

const { TextArea } = Input;
const { Title, Text } = Typography;

const TakeEvaluationPage = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const data = await getAssignmentDetail(assignmentId);
      setAssignment(data.asignacion);
      setQuestions(data.preguntas || []);
      setAnswers({}); // limpia respuestas al cargar
    } catch (err) {
      console.error(err);
      message.error("Error al cargar la evaluación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const handleOptionChange = (preguntaId, opcionId) => {
    setAnswers((prev) => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        opcion_id: opcionId,
        respuesta_texto: null,
      },
    }));
  };

  const handleTextChange = (preguntaId, texto) => {
    setAnswers((prev) => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        opcion_id: null,
        respuesta_texto: texto,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!assignment) return;

    const respuestas = questions.map((q) => {
      const ans = answers[q.id] || {};
      return {
        pregunta_id: q.id,
        opcion_id: ans.opcion_id || null,
        respuesta_texto: ans.respuesta_texto || null,
      };
    });

    const msgKey = "sending-eval";

    try {
      setSending(true);

      message.loading({
        key: msgKey,
        content: "Enviando y calificando tu evaluación...",
        duration: 0,
      });

      const data = await sendEvaluationAnswers(assignmentId, { respuestas });

      message.success({
        key: msgKey,
        content: `Evaluación enviada. Tu calificación: ${data.calificacion}`,
      });

      navigate("/reporte", {
        state: { activeTab: "evaluaciones", fromEvaluation: true },
      });
    } catch (err) {
      console.error(err);
      message.error({
        key: msgKey,
        content: "Error al enviar la evaluación. Intenta nuevamente.",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: 80,
        }}
      >
        <Spin size="large" />
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">Cargando evaluación...</Text>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "40px auto",
          padding: "0 16px",
        }}
      >
        <Alert
          type="error"
          message="No se encontró la información de la evaluación"
        />
      </div>
    );
  }

  // 🔐 Lógica de intentos
  const intentosRealizados = assignment.intentos_realizados ?? 0;
  const intentosMaximos =
    assignment.intentos_maximos ?? assignment.intentos_max ?? null;

  const hasAttemptsLeft =
    intentosMaximos == null || intentosRealizados < intentosMaximos;

  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    return ans && (ans.opcion_id != null || ans.respuesta_texto?.trim());
  }).length;

  const progress =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const readOnly = !hasAttemptsLeft; // si ya no hay intentos, modo solo lectura

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
        {/* Barra superior */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderRadius: 999 }}
          >
            Volver
          </Button>

          <Space size="small">
            {intentosMaximos != null && (
              <Tag color={hasAttemptsLeft ? "blue" : "red"}>
                Intentos: {intentosRealizados}/{intentosMaximos}
              </Tag>
            )}
            {assignment.calificacion != null && (
              <Tag color="purple">
                Última calificación: <b>{assignment.calificacion}</b>
              </Tag>
            )}
          </Space>
        </div>

        {/* Contenedor principal tipo "Microsoft Forms" */}
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.12)",
            background: "#ffffff",
          }}
          bodyStyle={{ padding: 24 }}
        >
          {/* Cabecera de evaluación */}
          <div
            style={{
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 16,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div>
              <Title
                level={3}
                style={{ marginBottom: 4, color: "#111827", fontWeight: 700 }}
              >
                {assignment.titulo}
              </Title>
              {assignment.descripcion && (
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {assignment.descripcion}
                </Text>
              )}

              <div style={{ marginTop: 8 }}>
                {assignment.tiempo_limite_min && (
                  <Tag
                    icon={<ClockCircleOutlined />}
                    color="processing"
                    style={{ borderRadius: 999 }}
                  >
                    Tiempo límite: {assignment.tiempo_limite_min} min
                  </Tag>
                )}
              </div>
            </div>

            {/* Progreso visual */}
            <div style={{ minWidth: 220 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Progreso de respuestas
              </Text>
              <Progress
                percent={progress}
                showInfo
                size="small"
                strokeLinecap="round"
              />
            </div>
          </div>

          {/* Mensajes de estado / intentos */}
          <div style={{ marginBottom: 16 }}>
            {!hasAttemptsLeft && (
              <Alert
                type="info"
                showIcon
                message="Has alcanzado el número máximo de intentos para esta evaluación."
                description={
                  assignment.calificacion != null
                    ? `Tu última calificación fue: ${assignment.calificacion}.`
                    : "Ya no puedes enviar más respuestas."
                }
              />
            )}

            {hasAttemptsLeft && intentosMaximos != null && (
              <Alert
                type="success"
                showIcon
                message="Evaluación disponible"
                description={`Intentos usados: ${intentosRealizados} de ${intentosMaximos}. Asegúrate de responder todas las preguntas antes de enviar.`}
              />
            )}
          </div>

          {/* Preguntas */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {questions.map((q, index) => (
              <Card
                key={q.id}
                size="small"
                bordered
                style={{
                  borderRadius: 12,
                  borderColor: "#e5e7eb",
                  background: "#f9fafb",
                }}
                bodyStyle={{ padding: 16 }}
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      Pregunta {index + 1}{" "}
                      {q.es_obligatoria && (
                        <span style={{ color: "#dc2626" }}>*</span>
                      )}
                    </span>
                    <Tag color="geekblue" style={{ borderRadius: 999 }}>
                      {q.tipo_pregunta === "opcion_multiple" &&
                        "Opción múltiple"}
                      {q.tipo_pregunta === "verdadero_falso" &&
                        "Verdadero / Falso"}
                      {q.tipo_pregunta === "abierta" && "Respuesta abierta"}
                    </Tag>
                  </div>
                }
              >
                <p
                  style={{
                    fontWeight: 600,
                    marginBottom: 12,
                    color: "#111827",
                  }}
                >
                  {q.enunciado}
                </p>

                {(q.tipo_pregunta === "opcion_multiple" ||
                  q.tipo_pregunta === "verdadero_falso") && (
                  <Radio.Group
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                    disabled={readOnly}
                    onChange={(e) =>
                      handleOptionChange(q.id, e.target.value)
                    }
                    value={answers[q.id]?.opcion_id || null}
                  >
                    {q.opciones?.map((opt) => (
                      <Radio
                        key={opt.id}
                        value={opt.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          transition: "background-color 0.2s",
                        }}
                      >
                        {opt.texto}
                      </Radio>
                    ))}
                  </Radio.Group>
                )}

                {q.tipo_pregunta === "abierta" && (
                  <TextArea
                    rows={4}
                    disabled={readOnly}
                    value={answers[q.id]?.respuesta_texto || ""}
                    onChange={(e) =>
                      handleTextChange(q.id, e.target.value)
                    }
                    style={{
                      borderRadius: 10,
                      borderColor: "#d1d5db",
                      resize: "vertical",
                    }}
                    placeholder="Escribe tu respuesta aquí..."
                  />
                )}
              </Card>
            ))}

            {questions.length === 0 && (
              <Alert
                type="warning"
                showIcon
                message="Esta evaluación todavía no tiene preguntas configuradas."
              />
            )}
          </div>

          {/* Botón de envío */}
          {!readOnly && questions.length > 0 && (
            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                type="primary"
                icon={<SendOutlined />}
                size="large"
                onClick={handleSubmit}
                loading={sending}
                style={{
                  borderRadius: 999,
                  paddingInline: 32,
                  fontWeight: 600,
                }}
              >
                Enviar evaluación
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TakeEvaluationPage;
