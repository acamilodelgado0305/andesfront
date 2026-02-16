// src/components/admin/evaluaciones/AdminEvaluationsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Switch,
  Select,
  message,
  Tooltip,
  Badge,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BuildOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  ClearOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import {
  getEvaluations,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
} from "../../../services/evaluation/evaluationService";

import { getProgramas } from "../../../services/programas/programasService";
import { getAllMaterias } from "../../../services/materias/serviceMateria";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

const AdminEvaluationsPage = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // ===== Filter states =====
  const [filterPrograma, setFilterPrograma] = useState(null);
  const [filterMateria, setFilterMateria] = useState(null);
  const [filterActiva, setFilterActiva] = useState(null);
  const [searchText, setSearchText] = useState("");

  const fetchEvaluations = async (filters = {}) => {
    try {
      setLoading(true);
      const params = {};
      if (filters.programa_id) params.programa_id = filters.programa_id;
      if (filters.materia_id) params.materia_id = filters.materia_id;
      if (filters.activa !== null && filters.activa !== undefined)
        params.activa = filters.activa;

      const data = await getEvaluations(params);
      setEvaluations(data.evaluaciones || []);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar evaluaciones");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      setLoadingCatalogs(true);
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
      setLoadingCatalogs(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  // Auto-apply filters whenever any filter value changes
  useEffect(() => {
    fetchEvaluations({
      programa_id: filterPrograma,
      materia_id: filterMateria,
      activa: filterActiva,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPrograma, filterMateria, filterActiva]);

  const applyFilters = () => {
    fetchEvaluations({
      programa_id: filterPrograma,
      materia_id: filterMateria,
      activa: filterActiva,
    });
  };

  const clearFilters = () => {
    setFilterPrograma(null);
    setFilterMateria(null);
    setFilterActiva(null);
    setSearchText("");
  };

  const hasActiveFilters = filterPrograma || filterMateria || filterActiva !== null;

  // Client-side text search on already filtered results
  const displayedEvaluations = useMemo(() => {
    if (!searchText.trim()) return evaluations;
    const normalized = searchText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return evaluations.filter((ev) => {
      const text = `${ev.titulo || ""} ${ev.descripcion || ""} ${ev.programa_nombre || ""} ${ev.materia_nombre || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return text.includes(normalized);
    });
  }, [evaluations, searchText]);

  // ===== CRUD Handlers =====
  const openCreateModal = () => {
    setEditingEvaluation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingEvaluation(record);
    form.setFieldsValue({
      titulo: record.titulo,
      descripcion: record.descripcion,
      tipo_destino: record.tipo_destino || undefined,
      programa_id: record.programa_id || undefined,
      materia_id: record.materia_id || undefined,
      intentos_max: record.intentos_max || undefined,
      tiempo_limite_min: record.tiempo_limite_min || undefined,
      activa: record.activa,
      rango_fechas:
        record.fecha_inicio && record.fecha_fin
          ? [dayjs(record.fecha_inicio), dayjs(record.fecha_fin)]
          : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: "Eliminar evaluación",
      content: `¿Seguro que deseas eliminar la evaluación "${record.titulo}"?`,
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteEvaluation(record.id);
          message.success("Evaluación eliminada");
          applyFilters();
        } catch (err) {
          console.error(err);
          message.error("Error al eliminar la evaluación");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        tipo_destino: values.tipo_destino || null,
        programa_id: values.programa_id || null,
        materia_id: values.materia_id || null,
        intentos_max: values.intentos_max || null,
        tiempo_limite_min: values.tiempo_limite_min || null,
        activa: values.activa,
      };

      if (values.rango_fechas && values.rango_fechas.length === 2) {
        payload.fecha_inicio = values.rango_fechas[0].toISOString();
        payload.fecha_fin = values.rango_fechas[1].toISOString();
      } else {
        payload.fecha_inicio = null;
        payload.fecha_fin = null;
      }

      if (editingEvaluation) {
        await updateEvaluation(editingEvaluation.id, payload);
        message.success("Evaluación actualizada");
      } else {
        await createEvaluation(payload);
        message.success("Evaluación creada");
      }

      setModalVisible(false);
      form.resetFields();
      setEditingEvaluation(null);
      applyFilters();
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("Error al guardar la evaluación");
    }
  };

  // ===== Stats =====
  const totalEvaluations = evaluations.length;
  const activeEvaluations = evaluations.filter((e) => e.activa).length;
  const totalPreguntas = evaluations.reduce(
    (acc, e) => acc + parseInt(e.total_preguntas || 0),
    0
  );

  // ===== Filtered materias by selected tipo_destino in form =====
  const formTipoDestino = Form.useWatch("tipo_destino", form);
  const filteredMateriasForForm = useMemo(() => {
    if (!formTipoDestino) return materias;
    const mappedType =
      formTipoDestino === "Tecnico" ? "Tecnicos" : "Validacion de Bachillerato";
    return materias.filter(
      (m) => m.tipo_programa === mappedType || m.tipo_programa === formTipoDestino
    );
  }, [materias, formTipoDestino]);

  const filteredProgramsForForm = useMemo(() => {
    if (!formTipoDestino) return programs;
    return programs.filter(
      (p) => p.tipo_programa === formTipoDestino
    );
  }, [programs, formTipoDestino]);

  return (
    <div
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
          borderRadius: 20,
          padding: "32px 36px 28px",
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            top: -60,
            right: -30,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(83,120,233,0.1)",
            bottom: -30,
            right: 150,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.02)",
            top: 20,
            left: "35%",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "#fff",
                  }}
                >
                  <FileTextOutlined />
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 26,
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Gestión de Evaluaciones
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    Crea, edita y asigna evaluaciones a tus programas
                  </p>
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatPill
                icon={<AppstoreOutlined />}
                value={totalEvaluations}
                label="Evaluaciones"
                color="#64b5f6"
              />
              <StatPill
                icon={<CheckCircleOutlined />}
                value={activeEvaluations}
                label="Activas"
                color="#66bb6a"
              />
              <StatPill
                icon={<QuestionCircleOutlined />}
                value={totalPreguntas}
                label="Preguntas"
                color="#ffb74d"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "16px 24px",
          marginBottom: 20,
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            color: "#6b7280",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <FilterOutlined /> Filtros
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Search
            placeholder="Buscar por título, descripción..."
            allowClear
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
            style={{ width: 260, flexShrink: 0 }}
            size="large"
          />

          <Select
            placeholder="Programa"
            allowClear
            showSearch
            optionFilterProp="children"
            value={filterPrograma}
            onChange={(val) => setFilterPrograma(val)}
            loading={loadingCatalogs}
            style={{ width: 220 }}
            size="large"
          >
            {programs.map((p) => (
              <Option key={p.id} value={p.id}>
                {p.nombre} {p.tipo_programa ? `(${p.tipo_programa})` : ""}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Materia"
            allowClear
            showSearch
            optionFilterProp="children"
            value={filterMateria}
            onChange={(val) => setFilterMateria(val)}
            loading={loadingCatalogs}
            style={{ width: 220 }}
            size="large"
          >
            {materias.map((m) => (
              <Option key={m.id} value={m.id}>
                {m.nombre} {m.tipo_programa ? `(${m.tipo_programa})` : ""}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Estado"
            allowClear
            value={filterActiva}
            onChange={(val) => setFilterActiva(val)}
            style={{ width: 140 }}
            size="large"
          >
            <Option value="true">Activas</Option>
            <Option value="false">Inactivas</Option>
          </Select>

          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={applyFilters}
            size="large"
            style={{
              borderRadius: 10,
              fontWeight: 600,
              background: "linear-gradient(135deg, #1a1a2e, #0f3460)",
              border: "none",
              boxShadow: "0 4px 14px rgba(15, 52, 96, 0.3)",
            }}
          >
            Filtrar
          </Button>

          {hasActiveFilters && (
            <Button
              icon={<ClearOutlined />}
              onClick={clearFilters}
              size="large"
              style={{ borderRadius: 10 }}
            >
              Limpiar
            </Button>
          )}

          <div style={{ flex: 1 }} />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => applyFilters()}
            size="large"
            style={{ borderRadius: 10 }}
          >
            Refrescar
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            size="large"
            style={{
              borderRadius: 10,
              fontWeight: 600,
              background: "linear-gradient(135deg, #4338ca, #6366f1)",
              border: "none",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            Nueva Evaluación
          </Button>
        </div>

        {hasActiveFilters && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#9ca3af",
                fontWeight: 500,
              }}
            >
              Filtros activos:
            </span>
            {filterPrograma && (
              <Tag
                closable
                onClose={() => setFilterPrograma(null)}
                color="blue"
                style={{ borderRadius: 6 }}
              >
                Programa:{" "}
                {programs.find((p) => p.id === filterPrograma)?.nombre ||
                  filterPrograma}
              </Tag>
            )}
            {filterMateria && (
              <Tag
                closable
                onClose={() => setFilterMateria(null)}
                color="purple"
                style={{ borderRadius: 6 }}
              >
                Materia:{" "}
                {materias.find((m) => m.id === filterMateria)?.nombre ||
                  filterMateria}
              </Tag>
            )}
            {filterActiva !== null && (
              <Tag
                closable
                onClose={() => setFilterActiva(null)}
                color={filterActiva === "true" ? "green" : "red"}
                style={{ borderRadius: 6 }}
              >
                {filterActiva === "true" ? "Activas" : "Inactivas"}
              </Tag>
            )}
          </div>
        )}
      </div>

      {/* ===== EVALUATION CARDS GRID ===== */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          Cargando evaluaciones...
        </div>
      ) : displayedEvaluations.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 60,
            textAlign: "center",
            border: "1px solid #f0f0f0",
          }}
        >
          <Empty
            description={
              <span style={{ color: "#9ca3af" }}>
                No se encontraron evaluaciones
                {hasActiveFilters && " con los filtros seleccionados"}
              </span>
            }
          />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {displayedEvaluations.map((ev) => (
            <EvaluationCard
              key={ev.id}
              evaluation={ev}
              onEdit={() => openEditModal(ev)}
              onDelete={() => handleDelete(ev)}
              onBuild={() =>
                navigate(`/inicio/evaluaciones/${ev.id}/builder`)
              }
            />
          ))}
        </div>
      )}

      {/* ===== MODAL CREATE/EDIT ===== */}
      <Modal
        open={modalVisible}
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
              {editingEvaluation ? <EditOutlined /> : <PlusOutlined />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {editingEvaluation
                  ? "Editar Evaluación"
                  : "Nueva Evaluación"}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>
                {editingEvaluation
                  ? "Modifica los datos de la evaluación"
                  : "Completa los datos para crear una evaluación"}
              </div>
            </div>
          </div>
        }
        okText={editingEvaluation ? "Actualizar" : "Crear Evaluación"}
        cancelText="Cancelar"
        onCancel={() => {
          setModalVisible(false);
          setEditingEvaluation(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        destroyOnClose
        confirmLoading={loadingCatalogs}
        width={640}
        styles={{
          body: { paddingTop: 16 },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            activa: true,
          }}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Título</span>}
            name="titulo"
            rules={[{ required: true, message: "Ingrese un título" }]}
          >
            <Input
              placeholder="Ej: Evaluación final de Seguridad Industrial"
              size="large"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Descripción</span>}
            name="descripcion"
          >
            <Input.TextArea
              rows={3}
              placeholder="Descripción general de la evaluación..."
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item
              label={
                <span style={{ fontWeight: 600 }}>Tipo de destino</span>
              }
              name="tipo_destino"
              style={{ flex: 1 }}
            >
              <Select
                allowClear
                placeholder="Selecciona tipo"
                size="large"
                style={{ borderRadius: 10 }}
              >
                <Option value="Tecnico">Técnico</Option>
                <Option value="Validacion">Validación</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Programa</span>}
              name="programa_id"
              style={{ flex: 1 }}
            >
              <Select
                allowClear
                loading={loadingCatalogs}
                placeholder="Selecciona programa"
                optionFilterProp="children"
                showSearch
                size="large"
              >
                {filteredProgramsForForm.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.nombre}{" "}
                    {p.tipo_programa ? `(${p.tipo_programa})` : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Materia</span>}
            name="materia_id"
            rules={[
              {
                required: true,
                message: "Selecciona la materia asociada",
              },
            ]}
          >
            <Select
              allowClear
              loading={loadingCatalogs}
              placeholder="Selecciona la materia"
              optionFilterProp="children"
              showSearch
              size="large"
            >
              {filteredMateriasForForm.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.nombre} {m.tipo_programa ? `(${m.tipo_programa})` : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span style={{ fontWeight: 600 }}>
                Rango de fechas (opcional)
              </span>
            }
            name="rango_fechas"
          >
            <RangePicker
              showTime
              style={{ width: "100%", borderRadius: 10 }}
              size="large"
            />
          </Form.Item>

          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item
              label={
                <span style={{ fontWeight: 600 }}>Intentos máximos</span>
              }
              name="intentos_max"
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                placeholder="Ej: 3"
                style={{ width: "100%", borderRadius: 10 }}
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={
                <span style={{ fontWeight: 600 }}>Tiempo límite (min)</span>
              }
              name="tiempo_limite_min"
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                placeholder="Ej: 60"
                style={{ width: "100%", borderRadius: 10 }}
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Activa</span>}
              name="activa"
              valuePropName="checked"
              tooltip="Si está inactiva, los estudiantes no la verán"
              style={{ flex: 0.5 }}
            >
              <Switch
                checkedChildren="Sí"
                unCheckedChildren="No"
                style={{ marginTop: 8 }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

/* ===== STAT PILL SUB-COMPONENT ===== */
function StatPill({ icon, value, label, color }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ color, fontSize: 17 }}>{icon}</span>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.3px",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ===== EVALUATION CARD SUB-COMPONENT ===== */
function EvaluationCard({ evaluation, onEdit, onDelete, onBuild }) {
  const [hovered, setHovered] = useState(false);
  const ev = evaluation;

  const gradients = [
    "linear-gradient(135deg, #4338ca, #6366f1)",
    "linear-gradient(135deg, #0f766e, #14b8a6)",
    "linear-gradient(135deg, #b45309, #f59e0b)",
    "linear-gradient(135deg, #be185d, #f472b6)",
    "linear-gradient(135deg, #1d4ed8, #60a5fa)",
  ];
  const gradient = gradients[(ev.id || 0) % gradients.length];

  const shadowColors = [
    "rgba(99,102,241,0.15)",
    "rgba(20,184,166,0.15)",
    "rgba(245,158,11,0.15)",
    "rgba(244,114,182,0.15)",
    "rgba(96,165,250,0.15)",
  ];
  const shadowColor = shadowColors[(ev.id || 0) % shadowColors.length];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #f0f0f0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 20px 40px ${shadowColor}, 0 0 0 1px rgba(0,0,0,0.02)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer",
      }}
      onClick={onBuild}
    >
      {/* Top gradient bar */}
      <div
        style={{
          background: gradient,
          height: 6,
        }}
      />

      <div style={{ padding: "20px 24px" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#1f2937",
                letterSpacing: "-0.3px",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ev.titulo}
            </h3>
            {ev.descripcion && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "#9ca3af",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ev.descripcion}
              </p>
            )}
          </div>

          <div style={{ flexShrink: 0, marginLeft: 12 }}>
            {ev.activa ? (
              <Tag
                icon={<CheckCircleOutlined />}
                color="success"
                style={{
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 10px",
                }}
              >
                Activa
              </Tag>
            ) : (
              <Tag
                icon={<CloseCircleOutlined />}
                color="default"
                style={{
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 10px",
                }}
              >
                Inactiva
              </Tag>
            )}
          </div>
        </div>

        {/* Info chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {ev.programa_nombre && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#eef2ff",
                border: "1px solid #e0e7ff",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                color: "#4338ca",
                fontWeight: 600,
              }}
            >
              <BookOutlined style={{ fontSize: 11 }} />
              {ev.programa_nombre}
            </div>
          )}

          {ev.materia_nombre && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#faf5ff",
                border: "1px solid #f3e8ff",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                color: "#7c3aed",
                fontWeight: 600,
              }}
            >
              <FileTextOutlined style={{ fontSize: 11 }} />
              {ev.materia_nombre}
            </div>
          )}

          {ev.tipo_destino && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#f0fdf4",
                border: "1px solid #dcfce7",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                color: "#15803d",
                fontWeight: 600,
              }}
            >
              {ev.tipo_destino}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <Tooltip title="Preguntas">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              <QuestionCircleOutlined />
              <strong>{ev.total_preguntas || 0}</strong> preguntas
            </div>
          </Tooltip>

          {ev.intentos_max && (
            <Tooltip title="Intentos máximos">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <TeamOutlined />
                <strong>{ev.intentos_max}</strong> intentos
              </div>
            </Tooltip>
          )}

          {ev.tiempo_limite_min && (
            <Tooltip title="Tiempo límite">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <ClockCircleOutlined />
                <strong>{ev.tiempo_limite_min}</strong> min
              </div>
            </Tooltip>
          )}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space size="small">
            <Tooltip title="Editar evaluación">
              <Button
                icon={<EditOutlined />}
                size="small"
                type="text"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  borderRadius: 8,
                  color: "#6b7280",
                  fontWeight: 500,
                }}
              >
                Editar
              </Button>
            </Tooltip>
            <Tooltip title="Eliminar">
              <Button
                icon={<DeleteOutlined />}
                size="small"
                type="text"
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{ borderRadius: 8 }}
              />
            </Tooltip>
          </Space>

          <Button
            type="primary"
            size="small"
            icon={<BuildOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onBuild();
            }}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              background: gradient,
              border: "none",
              fontSize: 12,
              boxShadow: `0 2px 8px ${shadowColor}`,
            }}
          >
            Preguntas <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminEvaluationsPage;
