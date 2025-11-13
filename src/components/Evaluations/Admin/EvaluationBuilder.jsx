// src/components/admin/evaluaciones/EvaluationBuilder.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Space,
  List,
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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
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
} from "../../../services/evaluation/evaluationService";

import { getProgramas  } from "../../../services/programas/programasService";
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

  const [assignProgramId, setAssignProgramId] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [students, setStudents] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignStudentsLoading, setAssignStudentsLoading] = useState(false);

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
        getProgramas (),
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

  const openQuestionModal = () => {
    questionForm.resetFields();
    setOptions([{ texto: "", es_correcta: false }]);
    setQuestionModalVisible(true);
  };

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
            texto: opt.texto.trim(),
            es_correcta: !!opt.es_correcta,
            orden: idx + 1,
          }));
      }

      await addQuestionWithOptions(evaluationId, {
        enunciado,
        tipo_pregunta,
        es_obligatoria,
        puntaje,
        orden,
        opciones: opcionesToSend,
      });

      message.success("Pregunta creada");
      setQuestionModalVisible(false);
      questionForm.resetFields();
      fetchEvaluation();
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("Error al guardar la pregunta");
    }
  };

  const handleDeleteQuestion = (questionId) => {
    Modal.confirm({
      title: "Eliminar pregunta",
      content: "¿Seguro que deseas eliminar esta pregunta?",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
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

  const handleDeleteOption = (optionId) => {
    Modal.confirm({
      title: "Eliminar opción",
      content: "¿Seguro que deseas eliminar esta opción?",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
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

  return (
    <div className="gf-page">
      {/* Barra superior tipo Google Forms */}
      <div className="gf-header-bar">
        <div className="gf-header-content">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/inicio/evaluaciones")}
            className="gf-back-button"
          >
            Volver
          </Button>
          <div className="gf-header-title">
            {evaluation?.titulo || "Formulario sin título"}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="gf-body">
        <div className="gf-main-column">
          {/* Card principal con info de la evaluación */}
          <Card
            className="gf-form-card"
            loading={loading}
            bordered={false}
            bodyStyle={{ padding: 24 }}
          >
            <Input
              className="gf-form-title-input"
              value={evaluation?.titulo || ""}
              readOnly
            />
            <Input.TextArea
              className="gf-form-description-input"
              value={evaluation?.descripcion || ""}
              readOnly
              placeholder="Descripción del formulario"
              autoSize={{ minRows: 1, maxRows: 3 }}
            />

            <Divider />

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <div className="gf-meta-item">
                  <span className="gf-meta-label">Tipo destino</span>
                  <Tag>{evaluation?.tipo_destino || "General"}</Tag>
                </div>
                <div className="gf-meta-item">
                  <span className="gf-meta-label">Programa</span>
                  <span className="gf-meta-value">
                    {resolveProgramLabel(evaluation?.programa_id)}
                  </span>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="gf-meta-item">
                  <span className="gf-meta-label">Materia</span>
                  <span className="gf-meta-value">
                    {resolveMateriaLabel(evaluation?.materia_id)}
                  </span>
                </div>
                <div className="gf-meta-item">
                  <span className="gf-meta-label">Tiempo límite</span>
                  <span className="gf-meta-value">
                    {evaluation?.tiempo_limite_min
                      ? `${evaluation.tiempo_limite_min} min`
                      : "Sin límite"}
                  </span>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Card de asignación tipo "configuración" a la derecha de Forms */}
          <Card
            className="gf-assign-card"
            bordered={false}
            bodyStyle={{ padding: 24 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <h4 className="gf-section-title">Asignar por programa</h4>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Selecciona un programa"
                    value={assignProgramId}
                    onChange={setAssignProgramId}
                    loading={catalogsLoading}
                    showSearch
                    optionFilterProp="children"
                    allowClear
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
                    >
                      Programa principal
                    </Button>
                    <Button
                      icon={<SendOutlined />}
                      loading={assignLoading}
                      onClick={() => handleAssign("mm")}
                    >
                      estudiante_programas
                    </Button>
                  </Space>
                 
                </Space>
              </Col>

              <Col xs={24} md={12}>
                <h4 className="gf-section-title">
                  Asignar a estudiantes específicos
                </h4>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Select
                    mode="multiple"
                    style={{ width: "100%" }}
                    placeholder="Selecciona estudiantes"
                    value={selectedStudentIds}
                    onChange={setSelectedStudentIds}
                    loading={catalogsLoading}
                    showSearch
                    optionFilterProp="children"
                  >
                    {students.map((s) => (
                      <Option key={s.id} value={s.id}>
                        {s.name || s.nombre || ""}{" "}
                        {s.last_name || s.apellido || ""}{" "}
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
                  >
                    Asignar a seleccionados
                  </Button>

                  <small className="gf-help-text">
                    Ideal para grupos pequeños, recuperaciones o pruebas piloto.
                  </small>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Lista de preguntas: cada una como card al estilo Forms */}
          <div className="gf-questions-container">
            {questions.length === 0 && (
              <div className="gf-empty-questions">
                Aún no has agregado preguntas. Usa el botón “+” para comenzar.
              </div>
            )}

            <List
              bordered={false}
              dataSource={questions}
              renderItem={(q, index) => (
                <List.Item className="gf-question-card-wrapper">
                  <Card
                    className="gf-question-card"
                    bordered={false}
                    bodyStyle={{ padding: 20 }}
                  >
                    <div className="gf-question-header">
                      <Tag color="blue">Pregunta {index + 1}</Tag>
                      <Space size="small">
                        <Tag>{q.tipo_pregunta}</Tag>
                        {q.es_obligatoria && (
                          <Tag color="red">Obligatoria</Tag>
                        )}
                        <Tag color="gold">Puntaje: {q.puntaje}</Tag>
                      </Space>
                    </div>

                    <p className="gf-question-text">
                      <strong>{q.enunciado}</strong>
                    </p>

                    {q.opciones && q.opciones.length > 0 && (
                      <div className="gf-question-options">
                        {q.opciones.map((opt) => (
                          <div
                            key={opt.id}
                            className="gf-option-row"
                          >
                            <div className="gf-option-bullet" />
                            <span className="gf-option-text">
                              {opt.es_correcta && (
                                <Tag
                                  color="green"
                                  style={{ marginRight: 8 }}
                                >
                                  Correcta
                                </Tag>
                              )}
                              {opt.texto}
                            </span>
                            <Button
                              type="link"
                              danger
                              size="small"
                              onClick={() => handleDeleteOption(opt.id)}
                            >
                              eliminar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="gf-question-footer">
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        Eliminar pregunta
                      </Button>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        </div>
      </div>

      {/* Botón flotante "+" tipo Google Forms */}
      <Button
        type="primary"
        shape="circle"
        icon={<PlusOutlined />}
        className="gf-fab-add-question"
        onClick={openQuestionModal}
      />

      {/* MODAL PREGUNTA (diseñado tipo card de Forms) */}
      <Modal
        open={questionModalVisible}
        title="Nueva pregunta"
        okText="Guardar"
        cancelText="Cancelar"
        onCancel={() => setQuestionModalVisible(false)}
        onOk={handleSaveQuestion}
        destroyOnClose
        className="gf-question-modal"
      >
        <Card bordered={false} className="gf-question-modal-card">
          <Form
            form={questionForm}
            layout="vertical"
            initialValues={{
              tipo_pregunta: "opcion_multiple",
              es_obligatoria: true,
              puntaje: 1,
            }}
          >
            <Form.Item
              label="Enunciado"
              name="enunciado"
              rules={[{ required: true, message: "Ingresa el enunciado" }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tipo de pregunta"
                  name="tipo_pregunta"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="opcion_multiple">Opción múltiple</Option>
                    <Option value="verdadero_falso">
                      Verdadero / Falso
                    </Option>
                    <Option value="abierta">Abierta</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Puntaje"
                  name="puntaje"
                  rules={[
                    { required: true, message: "Ingresa el puntaje" },
                  ]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item label="Orden (opcional)" name="orden">
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col
                xs={24}
                md={12}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Form.Item
                  label="Obligatoria"
                  name="es_obligatoria"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          {["opcion_multiple", "verdadero_falso"].includes(
            questionForm.getFieldValue("tipo_pregunta")
          ) && (
            <>
              <Divider />
              <div className="gf-modal-options-header">
                Opciones de respuesta
              </div>
              {options.map((opt, index) => (
                <div
                  key={index}
                  className="gf-option-row gf-option-row-modal"
                >
                  <div className="gf-option-bullet" />
                  <Input
                    placeholder={`Opción ${index + 1}`}
                    value={opt.texto}
                    onChange={(e) =>
                      handleOptionChange(index, "texto", e.target.value)
                    }
                  />
                  <span className="gf-option-correct-label">
                    Correcta
                  </span>
                  <Switch
                    checked={opt.es_correcta}
                    onChange={(checked) =>
                      handleOptionChange(index, "es_correcta", checked)
                    }
                  />
                  {options.length > 1 && (
                    <Button
                      danger
                      size="small"
                      onClick={() => handleRemoveOptionField(index)}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}

              <Button
                style={{ marginTop: 8 }}
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={handleAddOptionField}
              >
                Agregar opción
              </Button>
            </>
          )}
        </Card>
      </Modal>
    </div>
  );
};

export default EvaluationBuilder;
