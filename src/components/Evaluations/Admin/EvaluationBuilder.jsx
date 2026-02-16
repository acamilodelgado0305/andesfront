// src/components/admin/evaluaciones/EvaluationBuilder.jsx
import React, { useEffect, useState } from "react";
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Divider,
  Row,
  Col,
  Tooltip,
  Spin,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  CheckOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";

import {
  getEvaluationById,
  addQuestionWithOptions,
  deleteQuestion,
  deleteOption,
  assignByMainProgram,
  assignByStudentPrograms,
  assignToSelectedStudents,
  updateQuestion,
} from "../../../services/evaluation/evaluationService";

import { getProgramas } from "../../../services/programas/programasService";
import { getAllMaterias } from "../../../services/materias/serviceMateria";
import { getStudents } from "../../../services/student/studentService";

import "./evaluationBuilder.css";

const { Option } = Select;

const EvaluationBuilder = () => {
  const { evaluationId } = useParams();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [questionForm] = Form.useForm();
  const [options, setOptions] = useState([{ texto: "", es_correcta: false }]);

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [assignProgramId, setAssignProgramId] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [students, setStudents] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignStudentsLoading, setAssignStudentsLoading] = useState(false);

  const tipoPregunta = Form.useWatch("tipo_pregunta", questionForm);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const data = await getEvaluationById(evaluationId);
      setEvaluation(data.evaluacion);
      setQuestions(data.preguntas || []);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar la evaluación");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      setCatalogsLoading(true);
      const [invRes, matRes, stuRes] = await Promise.all([
        getProgramas(),
        getAllMaterias(),
        getStudents(),
      ]);

      setPrograms(invRes.data || invRes || []);
      setMaterias(matRes.data || matRes || []);
      setStudents(stuRes.data || stuRes || []);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar programas / materias / estudiantes");
    } finally {
      setCatalogsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
    fetchCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId]);

  const resetQuestionModalState = () => {
    setEditingQuestion(null);
    questionForm.resetFields();
    questionForm.setFieldsValue({
      tipo_pregunta: "opcion_multiple",
      es_obligatoria: true,
      puntaje: 1,
    });
    setOptions([{ texto: "", es_correcta: false }]);
  };

  const openQuestionModal = () => {
    resetQuestionModalState();
    setQuestionModalVisible(true);
  };

  const openEditQuestionModal = (question) => {
    setEditingQuestion(question || null);

    questionForm.setFieldsValue({
      enunciado: question.enunciado,
      tipo_pregunta: question.tipo_pregunta,
      es_obligatoria: question.es_obligatoria,
      puntaje: Number(question.puntaje || 1),
      orden: question.orden,
    });

    let initialOptions = [];
    if (question.opciones && question.opciones.length > 0) {
      initialOptions = question.opciones
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((opt) => ({
          id: opt.id,
          texto: opt.texto,
          es_correcta: opt.es_correcta,
        }));
    } else if (question.tipo_pregunta === "verdadero_falso") {
      initialOptions = [
        { texto: "Verdadero", es_correcta: false },
        { texto: "Falso", es_correcta: false },
      ];
    } else if (question.tipo_pregunta === "opcion_multiple") {
      initialOptions = [{ texto: "", es_correcta: false }];
    }

    setOptions(initialOptions);
    setQuestionModalVisible(true);
  };

  useEffect(() => {
    if (!questionModalVisible) return;

    if (editingQuestion) {
      if (
        (tipoPregunta === "verdadero_falso" ||
          tipoPregunta === "opcion_multiple") &&
        options.length === 0
      ) {
        if (tipoPregunta === "verdadero_falso") {
          setOptions([
            { texto: "Verdadero", es_correcta: false },
            { texto: "Falso", es_correcta: false },
          ]);
        } else if (tipoPregunta === "opcion_multiple") {
          setOptions([{ texto: "", es_correcta: false }]);
        }
      }
      if (tipoPregunta === "abierta") {
        setOptions([]);
      }
      return;
    }

    if (tipoPregunta === "verdadero_falso") {
      setOptions([
        { texto: "Verdadero", es_correcta: false },
        { texto: "Falso", es_correcta: false },
      ]);
    } else if (tipoPregunta === "opcion_multiple") {
      setOptions((prev) =>
        prev.length > 0 ? prev : [{ texto: "", es_correcta: false }]
      );
    } else if (tipoPregunta === "abierta") {
      setOptions([]);
    }
  }, [tipoPregunta, questionModalVisible, editingQuestion, options.length]);

  const handleAddOptionField = () => {
    setOptions((prev) => [...prev, { texto: "", es_correcta: false }]);
  };

  const handleOptionChange = (index, key, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleRemoveOptionField = (index) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = async () => {
    try {
      setSavingQuestion(true);

      const values = await questionForm.validateFields();
      const { enunciado, tipo_pregunta, es_obligatoria, puntaje, orden } =
        values;

      let opcionesToSend = [];
      if (
        tipo_pregunta === "opcion_multiple" ||
        tipo_pregunta === "verdadero_falso"
      ) {
        opcionesToSend = options
          .filter((opt) => opt.texto && opt.texto.trim() !== "")
          .map((opt, idx) => ({
            id: opt.id,
            texto: opt.texto.trim(),
            es_correcta: !!opt.es_correcta,
            orden: idx + 1,
          }));
      }

      if (editingQuestion) {
        const originalOptionIds = (editingQuestion.opciones || []).map(
          (o) => o.id
        );
        const currentOptionIds = opcionesToSend
          .map((o) => o.id)
          .filter((id) => !!id);
        const removedOptionIds = originalOptionIds.filter(
          (id) => !currentOptionIds.includes(id)
        );

        await updateQuestion(editingQuestion.id, {
          enunciado,
          tipo_pregunta,
          es_obligatoria,
          puntaje,
          orden,
          opciones: opcionesToSend,
        });

        for (const optId of removedOptionIds) {
          try {
            await deleteOption(optId);
          } catch (e) {
            console.error("Error eliminando opción", e);
          }
        }

        message.success("Pregunta actualizada");
      } else {
        await addQuestionWithOptions(evaluationId, {
          enunciado,
          tipo_pregunta,
          es_obligatoria,
          puntaje,
          orden,
          opciones: opcionesToSend,
        });
        message.success("Pregunta creada");
      }

      setQuestionModalVisible(false);
      resetQuestionModalState();
      fetchEvaluation();
    } catch (err) {
      if (err?.errorFields) {
        return;
      }
      console.error(err);
      message.error(
        editingQuestion
          ? "Error al actualizar la pregunta"
          : "Error al guardar la pregunta"
      );
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = (questionId) => {
    Modal.confirm({
      title: "Eliminar pregunta",
      content: "¿Seguro que deseas eliminar esta pregunta y todas sus opciones?",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteQuestion(questionId);
          message.success("Pregunta eliminada");
          fetchEvaluation();
        } catch (err) {
          console.error(err);
          message.error("Error al eliminar la pregunta");
        }
      },
    });
  };

  const handleDeleteOptionInList = (optionId) => {
    Modal.confirm({
      title: "Eliminar opción",
      content: "¿Seguro que deseas eliminar esta opción?",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteOption(optionId);
          message.success("Opción eliminada");
          fetchEvaluation();
        } catch (err) {
          console.error(err);
          message.error("Error al eliminar la opción");
        }
      },
    });
  };

  const handleAssign = async (mode) => {
    if (!assignProgramId) {
      message.warning("Selecciona un programa primero");
      return;
    }
    try {
      setAssignLoading(true);
      if (mode === "principal") {
        await assignByMainProgram(evaluationId, {
          programa_id: assignProgramId,
        });
      } else {
        await assignByStudentPrograms(evaluationId, {
          programa_id: assignProgramId,
        });
      }
      message.success("Evaluación asignada correctamente");
    } catch (err) {
      console.error(err);
      message.error("Error al asignar evaluación");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignToStudents = async () => {
    if (!selectedStudentIds || selectedStudentIds.length === 0) {
      message.warning("Selecciona al menos un estudiante");
      return;
    }

    try {
      setAssignStudentsLoading(true);
      await assignToSelectedStudents(evaluationId, {
        estudiante_ids: selectedStudentIds,
      });
      message.success("Evaluación asignada a estudiantes seleccionados");
    } catch (err) {
      console.error(err);
      message.error("Error al asignar evaluación a estudiantes");
    } finally {
      setAssignStudentsLoading(false);
    }
  };

  const resolveProgramLabel = (programa_id) => {
    if (!programa_id) return "—";
    const p = programs.find((pr) => pr.id === programa_id);
    if (!p) return programa_id;
    return `${p.nombre} (${p.tipo_programa || "—"})`;
  };

  const resolveMateriaLabel = (materia_id) => {
    if (!materia_id) return "—";
    const m = materias.find((mt) => mt.id === materia_id);
    if (!m) return materia_id;
    return `${m.nombre} (${m.tipo_programa || "—"})`;
  };

  const getTypeClass = (tipo) => {
    if (tipo === "opcion_multiple") return "mc";
    if (tipo === "verdadero_falso") return "vf";
    return "open";
  };

  const getTypeLabel = (tipo) => {
    if (tipo === "opcion_multiple") return "Opción múltiple";
    if (tipo === "verdadero_falso") return "Verdadero / Falso";
    return "Abierta";
  };

  const totalPuntaje = questions.reduce(
    (acc, q) => acc + parseFloat(q.puntaje || 0),
    0
  );

  if (loading && !evaluation) {
    return (
      <div className="eb-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="eb-page">
      {/* ===== HEADER ===== */}
      <div className="eb-header">
        <div className="eb-header-inner">
          <button
            className="eb-back-btn"
            onClick={() => navigate("/inicio/evaluaciones")}
          >
            <ArrowLeftOutlined /> Volver a evaluaciones
          </button>

          <div className="eb-header-row">
            <div className="eb-header-title">
              <div className="eb-header-icon">
                <FileTextOutlined />
              </div>
              <div>
                <h2>{evaluation?.titulo || "Sin título"}</h2>
                <p className="eb-header-sub">
                  Constructor de evaluación — Preguntas y asignación
                </p>
              </div>
            </div>

            <div className="eb-stats">
              <div className="eb-stat">
                <QuestionCircleOutlined
                  className="eb-stat-icon"
                  style={{ color: "#818cf8" }}
                />
                <div>
                  <div className="eb-stat-value">{questions.length}</div>
                  <div className="eb-stat-label">Preguntas</div>
                </div>
              </div>
              <div className="eb-stat">
                <OrderedListOutlined
                  className="eb-stat-icon"
                  style={{ color: "#fbbf24" }}
                />
                <div>
                  <div className="eb-stat-value">{totalPuntaje}</div>
                  <div className="eb-stat-label">Puntaje total</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="eb-body">
        {/* Evaluation info card */}
        <div className="eb-info-card">
          <div className="eb-info-card-accent" />
          <div className="eb-info-card-body">
            <h3 className="eb-info-title">{evaluation?.titulo}</h3>
            <p className="eb-info-desc">
              {evaluation?.descripcion || "Sin descripción"}
            </p>

            <div className="eb-info-meta">
              {evaluation?.tipo_destino && (
                <div className="eb-meta-chip green">
                  {evaluation.tipo_destino}
                </div>
              )}
              {evaluation?.programa_id && (
                <div className="eb-meta-chip blue">
                  <BookOutlined style={{ fontSize: 11 }} />
                  {resolveProgramLabel(evaluation.programa_id)}
                </div>
              )}
              {evaluation?.materia_id && (
                <div className="eb-meta-chip purple">
                  <FileTextOutlined style={{ fontSize: 11 }} />
                  {resolveMateriaLabel(evaluation.materia_id)}
                </div>
              )}
              {evaluation?.tiempo_limite_min && (
                <div className="eb-meta-chip amber">
                  <ClockCircleOutlined style={{ fontSize: 11 }} />
                  {evaluation.tiempo_limite_min} min
                </div>
              )}
              {evaluation?.intentos_max && (
                <div className="eb-meta-chip amber">
                  Máx. {evaluation.intentos_max} intentos
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment card */}
        <div className="eb-assign-card">
          <h4 className="eb-assign-title">
            <SendOutlined /> Asignar evaluación
          </h4>
          <p className="eb-assign-sub">
            Asigna esta evaluación a un programa completo o a estudiantes
            específicos
          </p>

          <div className="eb-assign-grid">
            {/* By program */}
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TeamOutlined /> Por programa
              </div>
              <Space direction="vertical" style={{ width: "100%" }} size={10}>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Selecciona un programa"
                  value={assignProgramId}
                  onChange={setAssignProgramId}
                  loading={catalogsLoading}
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  size="large"
                >
                  {programs.map((p) => (
                    <Option key={p.id} value={p.id}>
                      {p.nombre}{" "}
                      {p.tipo_programa ? `(${p.tipo_programa})` : ""}
                    </Option>
                  ))}
                </Select>
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={assignLoading}
                    onClick={() => handleAssign("principal")}
                    style={{
                      borderRadius: 10,
                      fontWeight: 600,
                      background:
                        "linear-gradient(135deg, #4338ca, #6366f1)",
                      border: "none",
                    }}
                  >
                    Programa principal
                  </Button>
                  <Button
                    icon={<SendOutlined />}
                    loading={assignLoading}
                    onClick={() => handleAssign("mm")}
                    style={{ borderRadius: 10, fontWeight: 500 }}
                  >
                    estudiante_programas
                  </Button>
                </Space>
              </Space>
            </div>

            {/* By specific students */}
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UserOutlined /> Estudiantes específicos
              </div>
              <Space direction="vertical" style={{ width: "100%" }} size={10}>
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="Selecciona estudiantes"
                  value={selectedStudentIds}
                  onChange={setSelectedStudentIds}
                  loading={catalogsLoading}
                  showSearch
                  optionFilterProp="children"
                  size="large"
                  maxTagCount={3}
                  maxTagPlaceholder={(omitted) =>
                    `+${omitted.length} más`
                  }
                >
                  {students.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name || s.nombre || ""}{" "}
                      {s.last_name || s.apellido || ""}
                      {s.document_number
                        ? ` - ${s.document_number}`
                        : ""}
                    </Option>
                  ))}
                </Select>

                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={assignStudentsLoading}
                  onClick={handleAssignToStudents}
                  style={{
                    borderRadius: 10,
                    fontWeight: 600,
                    background:
                      "linear-gradient(135deg, #4338ca, #6366f1)",
                    border: "none",
                  }}
                >
                  Asignar a seleccionados
                </Button>

                <small style={{ fontSize: 11, color: "#9ca3af" }}>
                  Ideal para recuperaciones o pruebas piloto
                </small>
              </Space>
            </div>
          </div>
        </div>

        {/* ===== QUESTIONS ===== */}
        <div className="eb-questions-header">
          <div className="eb-questions-title">
            <QuestionCircleOutlined /> Preguntas ({questions.length})
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openQuestionModal}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              background: "linear-gradient(135deg, #4338ca, #6366f1)",
              border: "none",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
            }}
          >
            Agregar Pregunta
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="eb-empty">
            <div className="eb-empty-icon">
              <QuestionCircleOutlined />
            </div>
            <p>Aún no has agregado preguntas</p>
            <small>
              Haz clic en "Agregar pregunta" o en el botón "+" para comenzar
            </small>
          </div>
        ) : (
          <div className="eb-questions-list">
            {questions.map((q, index) => (
              <div key={q.id} className="eb-q-card">
                <div
                  className={`eb-q-card-accent ${getTypeClass(q.tipo_pregunta)}`}
                />
                <div className="eb-q-body">
                  {/* Top row */}
                  <div className="eb-q-top">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        className={`eb-q-number ${getTypeClass(q.tipo_pregunta)}`}
                      >
                        {index + 1}
                      </div>
                      <p className="eb-q-enunciado">{q.enunciado}</p>
                    </div>

                    <div className="eb-q-tags">
                      <Tag
                        style={{
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
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
                      <Tag
                        style={{
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                        }}
                        color="gold"
                      >
                        {q.puntaje} pts
                      </Tag>
                      {q.es_obligatoria && (
                        <Tag
                          style={{
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                          }}
                          color="red"
                        >
                          Obligatoria
                        </Tag>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  {q.opciones && q.opciones.length > 0 && (
                    <div className="eb-q-options">
                      {q.opciones.map((opt) => (
                        <div
                          key={opt.id}
                          className={`eb-q-opt ${opt.es_correcta ? "correct" : ""}`}
                        >
                          <div className="eb-q-opt-bullet">
                            {opt.es_correcta && (
                              <CheckOutlined className="eb-q-opt-bullet-check" />
                            )}
                          </div>
                          <span className="eb-q-opt-text">{opt.texto}</span>
                          {opt.es_correcta && (
                            <Tag
                              color="success"
                              style={{
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                margin: 0,
                              }}
                            >
                              Correcta
                            </Tag>
                          )}
                          <Button
                            type="text"
                            danger
                            size="small"
                            className="eb-q-opt-delete"
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              handleDeleteOptionInList(opt.id)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="eb-q-footer">
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditQuestionModal(q)}
                        style={{
                          borderRadius: 8,
                          fontWeight: 500,
                          fontSize: 12,
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteQuestion(q.id)}
                        style={{
                          borderRadius: 8,
                          fontWeight: 500,
                          fontSize: 12,
                        }}
                      >
                        Eliminar
                      </Button>
                    </Space>
                    {q.orden && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          fontWeight: 500,
                        }}
                      >
                        Orden: {q.orden}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Tooltip title="Agregar pregunta" placement="left">
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          className="eb-fab"
          onClick={openQuestionModal}
        />
      </Tooltip>

      {/* ===== QUESTION MODAL ===== */}
      <Modal
        open={questionModalVisible}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #4338ca, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 16,
              }}
            >
              {editingQuestion ? <EditOutlined /> : <PlusOutlined />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {editingQuestion ? "Editar Pregunta" : "Nueva Pregunta"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  fontWeight: 400,
                }}
              >
                {editingQuestion
                  ? "Modifica el enunciado, tipo y opciones"
                  : "Agrega una nueva pregunta a la evaluación"}
              </div>
            </div>
          </div>
        }
        okText={editingQuestion ? "Actualizar" : "Guardar Pregunta"}
        cancelText="Cancelar"
        onCancel={() => {
          setQuestionModalVisible(false);
          resetQuestionModalState();
        }}
        onOk={handleSaveQuestion}
        confirmLoading={savingQuestion}
        destroyOnClose
        className="eb-q-modal"
        width={620}
      >
        <Form
          form={questionForm}
          layout="vertical"
          initialValues={{
            tipo_pregunta: "opcion_multiple",
            es_obligatoria: true,
            puntaje: 1,
          }}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Enunciado</span>}
            name="enunciado"
            rules={[{ required: true, message: "Ingresa el enunciado" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Escribe la pregunta aquí..."
              style={{ borderRadius: 10, fontSize: 14 }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label={
                  <span style={{ fontWeight: 600 }}>Tipo de pregunta</span>
                }
                name="tipo_pregunta"
                rules={[{ required: true }]}
              >
                <Select size="large" style={{ borderRadius: 10 }}>
                  <Option value="opcion_multiple">Opción múltiple</Option>
                  <Option value="verdadero_falso">Verdadero / Falso</Option>
                  <Option value="abierta">Abierta</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Puntaje</span>}
                name="puntaje"
                rules={[
                  { required: true, message: "Ingresa el puntaje" },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%", borderRadius: 10 }}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Orden</span>}
                name="orden"
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%", borderRadius: 10 }}
                  size="large"
                  placeholder="#"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="es_obligatoria"
            valuePropName="checked"
            style={{ marginBottom: 8 }}
          >
            <Switch
              checkedChildren="Obligatoria"
              unCheckedChildren="Opcional"
            />
          </Form.Item>
        </Form>

        {/* Options section */}
        {["opcion_multiple", "verdadero_falso"].includes(
          tipoPregunta || "opcion_multiple"
        ) && (
            <div className="eb-modal-card">
              <div className="eb-modal-opts-title">
                <OrderedListOutlined /> Opciones de respuesta
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {options.map((opt, index) => (
                  <div key={index} className="eb-modal-opt-row">
                    <div className="eb-modal-opt-bullet" />
                    <Input
                      placeholder={`Opción ${index + 1}`}
                      value={opt.texto}
                      onChange={(e) =>
                        handleOptionChange(index, "texto", e.target.value)
                      }
                      disabled={tipoPregunta === "verdadero_falso"}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        borderColor: opt.es_correcta ? "#10b981" : undefined,
                        background: opt.es_correcta ? "#ecfdf5" : undefined,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Correcta
                    </span>
                    <Switch
                      size="small"
                      checked={opt.es_correcta}
                      onChange={(checked) =>
                        handleOptionChange(index, "es_correcta", checked)
                      }
                    />
                    {options.length > 1 &&
                      tipoPregunta === "opcion_multiple" && (
                        <Button
                          danger
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveOptionField(index)}
                        />
                      )}
                  </div>
                ))}
              </div>

              {tipoPregunta === "opcion_multiple" && (
                <Button
                  style={{
                    marginTop: 12,
                    borderRadius: 10,
                    fontWeight: 500,
                  }}
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={handleAddOptionField}
                >
                  Agregar opción
                </Button>
              )}
            </div>
          )}
      </Modal>
    </div>
  );
};

export default EvaluationBuilder;
