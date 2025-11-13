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
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, SendOutlined } from "@ant-design/icons";

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

    // Mensaje de "calificando..."
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

    // 👇 vuelve al portal en la pestaña Evaluaciones
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
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Spin />
      </div>
    );
  }

  if (!assignment) {
    return (
      <Alert
        type="error"
        message="No se encontró la información de la evaluación"
      />
    );
  }

  const isFinished = assignment.estado === "finalizada";

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Volver
        </Button>
      </Space>

      <Card title={assignment.titulo}>
        <p>{assignment.descripcion}</p>
        {assignment.tiempo_limite_min && (
          <p>
            <strong>Tiempo límite:</strong> {assignment.tiempo_limite_min}{" "}
            minutos
          </p>
        )}
        {isFinished && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            message={`Esta evaluación ya fue finalizada. Calificación: ${
              assignment.calificacion ?? "—"
            }`}
          />
        )}

        {questions.map((q, index) => (
          <Card
            key={q.id}
            size="small"
            style={{ marginTop: 16 }}
            title={
              <span>
                Pregunta {index + 1}{" "}
                {q.es_obligatoria && (
                  <span style={{ color: "red" }}>*</span>
                )}
              </span>
            }
          >
            <p style={{ fontWeight: "bold" }}>{q.enunciado}</p>

            {(q.tipo_pregunta === "opcion_multiple" ||
              q.tipo_pregunta === "verdadero_falso") && (
              <Radio.Group
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
                disabled={isFinished}
                onChange={(e) => handleOptionChange(q.id, e.target.value)}
                value={answers[q.id]?.opcion_id || null}
              >
                {q.opciones?.map((opt) => (
                  <Radio key={opt.id} value={opt.id}>
                    {opt.texto}
                  </Radio>
                ))}
              </Radio.Group>
            )}

            {q.tipo_pregunta === "abierta" && (
              <TextArea
                rows={3}
                disabled={isFinished}
                value={answers[q.id]?.respuesta_texto || ""}
                onChange={(e) => handleTextChange(q.id, e.target.value)}
              />
            )}
          </Card>
        ))}

        {!isFinished && (
          <div style={{ marginTop: 24, textAlign: "right" }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={sending}
            >
              Enviar evaluación
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TakeEvaluationPage;
