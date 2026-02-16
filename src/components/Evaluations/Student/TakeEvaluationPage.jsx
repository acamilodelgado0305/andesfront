import React, { useEffect, useState } from "react";
import {
  Radio,
  Input,
  Button,
  message,
  Spin,
  Alert,
  Tag,
  Progress,
  Modal,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined,
  SendOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

import {
  getAssignmentDetail,
  sendEvaluationAnswers,
} from "../../../services/evaluation/evaluationService";

const { TextArea } = Input;

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
      setAnswers({});
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

    // Check unanswered obligatory questions
    const unanswered = questions.filter((q) => {
      if (!q.es_obligatoria) return false;
      const ans = answers[q.id];
      return !ans || (ans.opcion_id == null && !ans.respuesta_texto?.trim());
    });

    if (unanswered.length > 0) {
      Modal.warning({
        title: "Preguntas sin responder",
        content: `Tienes ${unanswered.length} pregunta(s) obligatoria(s) sin responder. ¿Deseas completarlas antes de enviar?`,
        okText: "Entendido",
      });
      return;
    }

    // Confirm submission
    Modal.confirm({
      title: "¿Enviar evaluación?",
      content:
        "Una vez enviada, tus respuestas serán calificadas automáticamente. ¿Deseas continuar?",
      okText: "Sí, enviar",
      cancelText: "Revisar respuestas",
      onOk: async () => {
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

          message.destroy(msgKey);

          Modal.success({
            title: "¡Evaluación enviada!",
            content: (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #10b981, #34d399)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <TrophyOutlined style={{ fontSize: 28, color: "#fff" }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Tu calificación:
                </p>
                <p
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: "#1f2937",
                    margin: "4px 0 0",
                  }}
                >
                  {data.calificacion}
                </p>
              </div>
            ),
            okText: "Volver al portal",
            onOk: () => {
              navigate("/Reporte", {
                state: { activeTab: "evaluaciones", fromEvaluation: true },
              });
            },
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
      },
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>
          Cargando evaluación...
        </p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
        <Alert
          type="error"
          message="No se encontró la información de la evaluación"
          showIcon
        />
      </div>
    );
  }

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

  const readOnly = !hasAttemptsLeft;

  const getTypeLabel = (tipo) => {
    if (tipo === "opcion_multiple") return "Opción múltiple";
    if (tipo === "verdadero_falso") return "Verdadero / Falso";
    return "Respuesta abierta";
  };

  const getTypeColor = (tipo) => {
    if (tipo === "opcion_multiple") return "#4338ca";
    if (tipo === "verdadero_falso") return "#0f766e";
    return "#b45309";
  };

  return (
    <div style={styles.page}>
      {/* ===== HEADER ===== */}
      <div style={styles.header}>
        <div style={styles.headerDecoCircle1} />
        <div style={styles.headerDecoCircle2} />
        <div style={styles.headerInner}>
          <button
            style={styles.backBtn}
            onClick={() => navigate("/Reporte", { state: { activeTab: "evaluaciones" } })}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.18)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
          >
            <ArrowLeftOutlined /> Volver
          </button>

          <div style={styles.headerRow}>
            <div>
              <h2 style={styles.headerTitle}>{assignment.titulo}</h2>
              {assignment.descripcion && (
                <p style={styles.headerDesc}>{assignment.descripcion}</p>
              )}
            </div>

            <div style={styles.headerStats}>
              {intentosMaximos != null && (
                <div style={styles.headerStat}>
                  <QuestionCircleOutlined
                    style={{ fontSize: 16, color: "#818cf8" }}
                  />
                  <div>
                    <div style={styles.headerStatValue}>
                      {intentosRealizados}/{intentosMaximos}
                    </div>
                    <div style={styles.headerStatLabel}>Intentos</div>
                  </div>
                </div>
              )}
              {assignment.tiempo_limite_min && (
                <div style={styles.headerStat}>
                  <ClockCircleOutlined
                    style={{ fontSize: 16, color: "#fbbf24" }}
                  />
                  <div>
                    <div style={styles.headerStatValue}>
                      {assignment.tiempo_limite_min}
                    </div>
                    <div style={styles.headerStatLabel}>Minutos</div>
                  </div>
                </div>
              )}
              {assignment.calificacion != null && (
                <div style={styles.headerStat}>
                  <TrophyOutlined
                    style={{ fontSize: 16, color: "#4ade80" }}
                  />
                  <div>
                    <div style={styles.headerStatValue}>
                      {assignment.calificacion}
                    </div>
                    <div style={styles.headerStatLabel}>Última nota</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.body}>
        {/* Progress bar */}
        <div style={styles.progressCard}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Progreso de respuestas
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#4338ca" }}>
              {answeredCount}/{totalQuestions}
            </span>
          </div>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={{
              "0%": "#4338ca",
              "100%": "#6366f1",
            }}
            trailColor="#e5e7eb"
            size="small"
            strokeLinecap="round"
          />
        </div>

        {/* Status alerts */}
        {!hasAttemptsLeft && (
          <Alert
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message="Has alcanzado el número máximo de intentos para esta evaluación."
            description={
              assignment.calificacion != null
                ? `Tu última calificación fue: ${assignment.calificacion}.`
                : "Ya no puedes enviar más respuestas."
            }
            style={{
              borderRadius: 12,
              marginBottom: 20,
            }}
          />
        )}

        {hasAttemptsLeft && intentosMaximos != null && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Evaluación disponible"
            description={`Intentos usados: ${intentosRealizados} de ${intentosMaximos}. Responde todas las preguntas antes de enviar.`}
            style={{
              borderRadius: 12,
              marginBottom: 20,
            }}
          />
        )}

        {/* ===== QUESTIONS ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {questions.map((q, index) => {
            const isAnswered =
              answers[q.id] &&
              (answers[q.id].opcion_id != null ||
                answers[q.id].respuesta_texto?.trim());
            const typeColor = getTypeColor(q.tipo_pregunta);

            return (
              <div key={q.id} style={styles.questionCard}>
                {/* Accent */}
                <div
                  style={{
                    height: 4,
                    background: typeColor,
                    borderRadius: "12px 12px 0 0",
                  }}
                />

                <div style={{ padding: "20px 24px 18px" }}>
                  {/* Question header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: typeColor,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#1f2937",
                          lineHeight: 1.5,
                        }}
                      >
                        {q.enunciado}
                        {q.es_obligatoria && (
                          <span
                            style={{
                              color: "#ef4444",
                              marginLeft: 4,
                              fontWeight: 700,
                            }}
                          >
                            *
                          </span>
                        )}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Tag
                        style={{
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 8px",
                        }}
                        color={
                          q.tipo_pregunta === "opcion_multiple"
                            ? "blue"
                            : q.tipo_pregunta === "verdadero_falso"
                              ? "cyan"
                              : "orange"
                        }
                      >
                        {getTypeLabel(q.tipo_pregunta)}
                      </Tag>
                      {isAnswered && (
                        <Tag
                          icon={<CheckCircleOutlined />}
                          color="success"
                          style={{
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 8px",
                          }}
                        >
                          Respondida
                        </Tag>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  {(q.tipo_pregunta === "opcion_multiple" ||
                    q.tipo_pregunta === "verdadero_falso") && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingLeft: 44,
                        }}
                      >
                        {q.opciones?.map((opt) => {
                          const isSelected =
                            answers[q.id]?.opcion_id === opt.id;

                          return (
                            <div
                              key={opt.id}
                              onClick={() =>
                                !readOnly &&
                                handleOptionChange(q.id, opt.id)
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 16px",
                                borderRadius: 12,
                                background: isSelected ? "#eef2ff" : "#f9fafb",
                                border: isSelected
                                  ? "2px solid #4338ca"
                                  : "1px solid #f3f4f6",
                                cursor: readOnly ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease",
                                opacity: readOnly ? 0.7 : 1,
                              }}
                            >
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  border: isSelected
                                    ? `6px solid #4338ca`
                                    : "2px solid #d1d5db",
                                  flexShrink: 0,
                                  transition: "all 0.2s ease",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 14,
                                  color: isSelected ? "#1f2937" : "#4b5563",
                                  fontWeight: isSelected ? 600 : 500,
                                }}
                              >
                                {opt.texto}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {q.tipo_pregunta === "abierta" && (
                    <div style={{ paddingLeft: 44 }}>
                      <TextArea
                        rows={4}
                        disabled={readOnly}
                        value={answers[q.id]?.respuesta_texto || ""}
                        onChange={(e) =>
                          handleTextChange(q.id, e.target.value)
                        }
                        style={{
                          borderRadius: 12,
                          borderColor: "#d1d5db",
                          resize: "vertical",
                          fontSize: 14,
                        }}
                        placeholder="Escribe tu respuesta aquí..."
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {questions.length === 0 && (
            <Alert
              type="warning"
              showIcon
              message="Esta evaluación todavía no tiene preguntas configuradas."
              style={{ borderRadius: 12 }}
            />
          )}
        </div>

        {/* Submit button */}
        {!readOnly && questions.length > 0 && (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Button
              type="primary"
              icon={<SendOutlined />}
              size="large"
              onClick={handleSubmit}
              loading={sending}
              style={{
                borderRadius: 14,
                paddingInline: 40,
                fontWeight: 700,
                fontSize: 15,
                height: 50,
                background: "linear-gradient(135deg, #4338ca, #6366f1)",
                border: "none",
                boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
              }}
            >
              Enviar evaluación
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ===== STYLES ===== */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6f8",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    paddingBottom: 60,
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Header */
  header: {
    background:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
    padding: "28px 0 24px",
    marginBottom: 28,
    position: "relative",
    overflow: "hidden",
  },
  headerDecoCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.03)",
    top: -60,
    right: -30,
  },
  headerDecoCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: "rgba(99,102,241,0.08)",
    bottom: -30,
    right: 160,
  },
  headerInner: {
    maxWidth: 840,
    margin: "0 auto",
    padding: "0 24px",
    position: "relative",
    zIndex: 1,
  },
  backBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: "6px 14px",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 16,
    transition: "all 0.2s ease",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.4px",
  },
  headerDesc: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    maxWidth: 500,
  },
  headerStats: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  headerStat: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1.1,
  },
  headerStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },

  /* Body */
  body: {
    maxWidth: 840,
    margin: "0 auto",
    padding: "0 24px",
  },
  progressCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "16px 20px",
    border: "1px solid #f0f0f0",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },

  /* Question card */
  questionCard: {
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #f0f0f0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.2s ease",
  },
};

export default TakeEvaluationPage;
