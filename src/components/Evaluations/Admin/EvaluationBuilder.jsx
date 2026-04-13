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
  Table,
  Badge,
  Popconfirm,
  Alert,
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
  UserDeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";

import {
  getEvaluationById,
  addQuestionWithOptions,
  deleteQuestion,
  deleteOption,
  assignByStudentPrograms,
  getEvaluationAssignments,
  removeAssignment,
  updateQuestion,
} from "../../../services/evaluation/evaluationService";

import { getProgramas } from "../../../services/programas/programasService";
import { getAllMaterias } from "../../../services/materias/serviceMateria";

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
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  // Asignaciones actuales
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);

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
      const [invRes, matRes] = await Promise.all([
        getProgramas(),
        getAllMaterias(),
      ]);
      setPrograms(invRes.data || invRes || []);
      setMaterias(matRes.data || matRes || []);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar programas / materias");
    } finally {
      setCatalogsLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const data = await getEvaluationAssignments(evaluationId);
      setAssignments(data.asignaciones || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
    fetchCatalogs();
    fetchAssignments();
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

  const handleAssign = async () => {
    if (!assignProgramId) {
      message.warning("Selecciona un programa primero");
      return;
    }
    try {
      setAssignLoading(true);
      const res = await assignByStudentPrograms(evaluationId, { programa_id: assignProgramId });
      message.success(res.message || "Evaluación asignada correctamente");
      setAssignProgramId(null);
      fetchAssignments();
    } catch (err) {
      console.error(err);
      message.error("Error al asignar evaluación");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveAssignment = async (estudianteId) => {
    try {
      setRemovingId(estudianteId);
      await removeAssignment(evaluationId, estudianteId);
      message.success("Asignación eliminada");
      fetchAssignments();
    } catch (err) {
      console.error(err);
      message.error("Error al eliminar asignación");
    } finally {
      setRemovingId(null);
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
              <div className="eb-stat">
                <TeamOutlined
                  className="eb-stat-icon"
                  style={{ color: "#34d399" }}
                />
                <div>
                  <div className="eb-stat-value">{assignments.length}</div>
                  <div className="eb-stat-label">Asignados</div>
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
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h4 className="eb-assign-title" style={{ margin: 0 }}>
              <SendOutlined /> Asignaciones
            </h4>
            <Badge
              count={assignments.length}
              showZero
              style={{ backgroundColor: assignments.length > 0 ? "#4338ca" : "#9ca3af" }}
            >
              <span style={{ fontSize: 12, color: "#6b7280", paddingRight: 8 }}>estudiantes asignados</span>
            </Badge>
          </div>
          <p className="eb-assign-sub">
            Asigna esta evaluación a todos los estudiantes de un programa. Los ya asignados no se duplican.
          </p>

          {/* Assign by program row */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <TeamOutlined /> Programa
              </div>
              <Select
                style={{ width: "100%" }}
                placeholder="Selecciona un programa para asignar"
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
                    {p.nombre}{p.tipo_programa ? ` · ${p.tipo_programa}` : ""}
                  </Option>
                ))}
              </Select>
            </div>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={assignLoading}
              onClick={handleAssign}
              disabled={!assignProgramId}
              size="large"
              style={{
                borderRadius: 10,
                fontWeight: 600,
                background: "linear-gradient(135deg, #4338ca, #6366f1)",
                border: "none",
                minWidth: 120,
              }}
            >
              Asignar
            </Button>
          </div>

          <Divider style={{ margin: "0 0 16px" }} />

          {/* Assigned students table */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              <UserOutlined style={{ marginRight: 6 }} />
              Estudiantes asignados ({assignments.length})
            </span>
            <Space size={8}>
              <Input
                size="small"
                placeholder="Buscar estudiante..."
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                style={{ width: 200, borderRadius: 8 }}
                allowClear
              />
              <Tooltip title="Recargar">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={fetchAssignments}
                  loading={assignmentsLoading}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
            </Space>
          </div>

          {assignments.length === 0 && !assignmentsLoading ? (
            <Alert
              message="Ningún estudiante asignado aún"
              description="Selecciona un programa arriba para asignar la evaluación a todos sus estudiantes."
              type="info"
              showIcon
              style={{ borderRadius: 10 }}
            />
          ) : (
            <Table
              dataSource={assignments.filter((a) => {
                if (!assignmentSearch.trim()) return true;
                const q = assignmentSearch.toLowerCase();
                return (
                  `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
                  (a.numero_documento || "").toLowerCase().includes(q)
                );
              })}
              rowKey="estudiante_id"
              loading={assignmentsLoading}
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
              columns={[
                {
                  title: "Estudiante",
                  key: "nombre",
                  render: (_, r) => (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.nombre} {r.apellido}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.numero_documento}</div>
                    </div>
                  ),
                },
                {
                  title: "Programa",
                  dataIndex: "programa_nombre",
                  key: "programa",
                  render: (v) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : <span style={{ color: "#d1d5db" }}>—</span>,
                },
                {
                  title: "Estado",
                  dataIndex: "estado",
                  key: "estado",
                  width: 110,
                  render: (v) => {
                    const map = {
                      pendiente: { color: "default", label: "Pendiente" },
                      en_progreso: { color: "processing", label: "En progreso" },
                      finalizada: { color: "success", label: "Finalizada" },
                    };
                    const cfg = map[v] || { color: "default", label: v };
                    return <Badge status={cfg.color} text={<span style={{ fontSize: 12 }}>{cfg.label}</span>} />;
                  },
                },
                {
                  title: "Nota",
                  dataIndex: "calificacion",
                  key: "calificacion",
                  width: 70,
                  render: (v) => v != null
                    ? <Tag color={v >= 3 ? "success" : "error"} style={{ fontWeight: 700 }}>{parseFloat(v).toFixed(1)}</Tag>
                    : <span style={{ color: "#d1d5db" }}>—</span>,
                },
                {
                  title: "",
                  key: "actions",
                  width: 50,
                  render: (_, r) => (
                    <Popconfirm
                      title="¿Quitar esta asignación?"
                      description="Se eliminará el acceso del estudiante a esta evaluación."
                      okText="Sí, quitar"
                      cancelText="Cancelar"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleRemoveAssignment(r.estudiante_id)}
                    >
                      <Tooltip title="Quitar asignación">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<UserDeleteOutlined />}
                          loading={removingId === r.estudiante_id}
                        />
                      </Tooltip>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          )}
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
