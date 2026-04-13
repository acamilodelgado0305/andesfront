import React, { useState, useEffect, useMemo } from "react";
import {
  Table, Button, Space, Popconfirm, message, Typography, Input, Tag, Tooltip,
  Spin, Drawer, Form, Select, Switch, Flex, Divider, Empty, Modal,
} from "antd";
import {
  DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined,
  ReloadOutlined, BookOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UnorderedListOutlined, SwapOutlined, CopyOutlined, ScheduleOutlined,
} from "@ant-design/icons";
import { getPrograms, deleteProgram } from "../../services/programs/programService";
import { getMateriasByPrograma, createMateria, updateMateria, deleteMateria } from "../../services/materias/serviceMateria";
import { getAllDocentes } from "../../services/docentes/serviceDocente";
import CreateProgramModal from "./addProgram";
import HorarioDrawer from "../Horarios/HorarioDrawer";

const { Title, Text } = Typography;
const { Option } = Select;
const PRIMARY_COLOR = "#155153";

/* ─────────────────────────────────────────────
   Drawer: gestión de materias de un programa
───────────────────────────────────────────── */
function MateriasDrawer({ programa, programas, onClose }) {
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingMateria, setEditingMateria] = useState(null);
  const [savingMateria, setSavingMateria] = useState(false);
  const [form] = Form.useForm();

  // Horario
  const [horarioMateria, setHorarioMateria] = useState(null);

  // Mover / Duplicar
  const [transferModal, setTransferModal] = useState(null); // { materia, mode: 'mover'|'duplicar' }
  const [transferProgramaId, setTransferProgramaId] = useState(null);
  const [savingTransfer, setSavingTransfer] = useState(false);

  useEffect(() => {
    if (programa) {
      fetchMaterias();
      fetchDocentes();
    }
  }, [programa]);

  const fetchMaterias = async () => {
    setLoadingMaterias(true);
    try {
      const data = await getMateriasByPrograma(programa.id);
      setMaterias(data);
    } catch {
      message.error("Error al cargar las materias.");
    } finally {
      setLoadingMaterias(false);
    }
  };

  const fetchDocentes = async () => {
    try {
      const data = await getAllDocentes();
      setDocentes(data);
    } catch {}
  };

  const openCreate = () => {
    setEditingMateria(null);
    form.resetFields();
    setIsFormVisible(true);
  };

  const openEdit = (materia) => {
    setEditingMateria(materia);
    form.setFieldsValue({ nombre: materia.nombre, docente_id: materia.docente_id });
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setIsFormVisible(false);
    setEditingMateria(null);
    form.resetFields();
  };

  const handleSave = async (values) => {
    setSavingMateria(true);
    try {
      const payload = { ...values, programa_id: programa.id };
      if (editingMateria) {
        await updateMateria(editingMateria.id, payload);
        message.success("Materia actualizada.");
      } else {
        await createMateria(payload);
        message.success("Materia creada.");
      }
      cancelForm();
      fetchMaterias();
    } catch (err) {
      message.error(err.response?.data?.message || "Error al guardar la materia.");
    } finally {
      setSavingMateria(false);
    }
  };

  const handleDelete = async (materiaId) => {
    try {
      await deleteMateria(materiaId);
      message.success("Materia eliminada.");
      fetchMaterias();
    } catch {
      message.error("Error al eliminar la materia.");
    }
  };

  const handleStatusChange = async (materia, checked) => {
    try {
      await updateMateria(materia.id, { ...materia, activa: checked });
      message.success("Estado actualizado.");
      fetchMaterias();
    } catch {
      message.error("Error al cambiar el estado.");
    }
  };

  const openTransfer = (materia, mode) => {
    setTransferProgramaId(null);
    setTransferModal({ materia, mode });
  };

  const handleTransferConfirm = async () => {
    if (!transferProgramaId) {
      message.warning("Selecciona un programa destino.");
      return;
    }
    setSavingTransfer(true);
    const { materia, mode } = transferModal;
    try {
      if (mode === "mover") {
        await updateMateria(materia.id, {
          nombre: materia.nombre,
          programa_id: transferProgramaId,
          docente_id: materia.docente_id,
          activa: materia.activa,
        });
        message.success(`"${materia.nombre}" movida al programa seleccionado.`);
      } else {
        await createMateria({
          nombre: materia.nombre,
          programa_id: transferProgramaId,
          docente_id: materia.docente_id,
        });
        message.success(`"${materia.nombre}" duplicada en el programa seleccionado.`);
      }
      setTransferModal(null);
      fetchMaterias();
    } catch (err) {
      message.error(err.response?.data?.message || "Error al procesar la operación.");
    } finally {
      setSavingTransfer(false);
    }
  };

  // Programas destino: excluir el programa actual
  const otrosProgramas = programas.filter((p) => p.id !== programa?.id);

  const columns = [
    {
      title: "Materia",
      dataIndex: "nombre",
      key: "nombre",
      ellipsis: true,
    },
    {
      title: "Docente",
      dataIndex: "docente_nombre",
      key: "docente_nombre",
      render: (v) => v || <span style={{ color: "#bbb" }}>Sin asignar</span>,
    },
    {
      title: "Estado",
      dataIndex: "activa",
      key: "activa",
      align: "center",
      width: 100,
      render: (activa, record) => (
        <Flex gap={6} align="center" justify="center">
          <Tag color={activa ? "green" : "red"} style={{ margin: 0 }}>
            {activa ? "Activa" : "Inactiva"}
          </Tag>
          <Switch
            checked={activa}
            onChange={(checked) => handleStatusChange(record, checked)}
            size="small"
          />
        </Flex>
      ),
    },
    {
      title: "",
      key: "acciones",
      align: "center",
      width: 150,
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="Horarios">
            <Button type="text" size="small" icon={<ScheduleOutlined />} onClick={() => setHorarioMateria(record)} style={{ color: "#059669" }} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Mover a otro programa">
            <Button type="text" size="small" icon={<SwapOutlined />} onClick={() => openTransfer(record, "mover")} style={{ color: "#2563eb" }} />
          </Tooltip>
          <Tooltip title="Duplicar en otro programa">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => openTransfer(record, "duplicar")} style={{ color: "#7c3aed" }} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar esta materia?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar">
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div>
          <Text style={{ fontSize: 13, color: "#888" }}>Materias del programa</Text>
          <br />
          <Text strong style={{ fontSize: 16 }}>{programa?.nombre}</Text>
          {programa?.tipo_programa && (
            <Tag style={{ marginLeft: 8 }} color="blue">{programa.tipo_programa}</Tag>
          )}
        </div>
      }
      open={!!programa}
      onClose={onClose}
      width={620}
      destroyOnClose
      extra={
        !isFormVisible && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
          >
            Nueva Materia
          </Button>
        )
      }
    >
      {/* ── Inline form ── */}
      {isFormVisible && (
        <div
          style={{
            background: "#f8fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "20px 20px 8px",
            marginBottom: 20,
          }}
        >
          <Text strong style={{ fontSize: 15 }}>
            {editingMateria ? "Editar materia" : "Nueva materia"}
          </Text>
          <Divider style={{ margin: "12px 0" }} />
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item
              name="nombre"
              label="Nombre de la Materia"
              rules={[{ required: true, message: "Campo requerido" }]}
            >
              <Input placeholder="Ej: Matemáticas Básicas" />
            </Form.Item>
            <Form.Item name="docente_id" label="Docente (opcional)">
              <Select placeholder="Selecciona un docente" allowClear>
                {docentes.map((d) => (
                  <Option key={d.id} value={d.id}>
                    {d.nombre_completo}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item style={{ textAlign: "right", marginBottom: 8 }}>
              <Space>
                <Button onClick={cancelForm}>Cancelar</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={savingMateria}
                  style={{ background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
                >
                  {editingMateria ? "Guardar Cambios" : "Crear Materia"}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      )}

      {/* ── Materias table ── */}
      <Spin spinning={loadingMaterias}>
        {materias.length === 0 && !loadingMaterias ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Este programa no tiene materias aún."
          />
        ) : (
          <Table
            columns={columns}
            dataSource={materias}
            rowKey="id"
            size="small"
            pagination={false}
            bordered={false}
            style={{ borderRadius: 10, overflow: "hidden" }}
          />
        )}
      </Spin>

      {/* ── Horario drawer ── */}
      <HorarioDrawer
        materia={horarioMateria}
        programa={programa}
        onClose={() => setHorarioMateria(null)}
      />

      {/* ── Mover / Duplicar modal ── */}
      <Modal
        open={!!transferModal}
        title={
          transferModal?.mode === "mover"
            ? `Mover "${transferModal?.materia?.nombre}"`
            : `Duplicar "${transferModal?.materia?.nombre}"`
        }
        okText={transferModal?.mode === "mover" ? "Mover" : "Duplicar"}
        cancelText="Cancelar"
        onOk={handleTransferConfirm}
        onCancel={() => setTransferModal(null)}
        confirmLoading={savingTransfer}
        okButtonProps={{
          style: {
            background: transferModal?.mode === "mover" ? "#2563eb" : "#7c3aed",
            borderColor: transferModal?.mode === "mover" ? "#2563eb" : "#7c3aed",
          },
        }}
      >
        <p style={{ marginBottom: 12, color: "#555" }}>
          {transferModal?.mode === "mover"
            ? "Selecciona el programa al que quieres mover esta materia. Dejará de pertenecer al programa actual."
            : "Selecciona el programa donde quieres duplicar esta materia. Se creará una copia, el original se mantiene."}
        </p>
        <Select
          style={{ width: "100%" }}
          placeholder="Selecciona un programa destino"
          value={transferProgramaId}
          onChange={setTransferProgramaId}
          showSearch
          filterOption={(input, option) =>
            (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
          }
        >
          {otrosProgramas.map((p) => (
            <Option key={p.id} value={p.id}>
              {p.nombre}
            </Option>
          ))}
        </Select>
      </Modal>
    </Drawer>
  );
}

/* ─────────────────────────────────────────────
   Main: Programas
───────────────────────────────────────────── */
const ProgramsManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingProgram, setEditingProgram] = useState(null);
  const [materiasPrograma, setMateriasPrograma] = useState(null); // programa selected for drawer

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const data = await getPrograms();
      setProgramas(data);
    } catch {
      message.error("Error al cargar los programas");
    } finally {
      setLoading(false);
    }
  };

  const filteredProgramas = useMemo(() => {
    if (!searchText.trim()) return programas;
    const term = searchText.toLowerCase();
    return programas.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(term) ||
        (p.tipo_programa || "").toLowerCase().includes(term)
    );
  }, [programas, searchText]);

  const totalPrograms = programas.length;
  const activePrograms = programas.filter((p) => p.activo).length;
  const techPrograms = programas.filter((p) =>
    (p.tipo_programa || "").toLowerCase().includes("tecnico")
  ).length;

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleDeleteProgram = async (programId) => {
    try {
      const response = await deleteProgram(programId);
      if (response.ok) {
        message.success("Programa eliminado correctamente");
        fetchPrograms();
      } else {
        message.error(response.error || "Error al eliminar");
      }
    } catch {
      message.error("Error de conexión");
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "$ 0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      width: "26%",
    },
    {
      title: "Tipo",
      dataIndex: "tipo_programa",
      key: "tipo",
      render: (type) => {
        const isTech = (type || "").toLowerCase().includes("tecnico");
        return (
          <span
            style={{
              background: isTech ? "#eaf0f8" : "#e8f5f5",
              color: isTech ? "#2c3e50" : PRIMARY_COLOR,
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {type}
          </span>
        );
      },
    },
    {
      title: "Duración",
      dataIndex: "duracion_meses",
      key: "duracion",
      render: (val) => (val ? `${val} Meses` : "—"),
    },
    {
      title: "Mensualidad",
      dataIndex: "valor_mensualidad",
      key: "mensualidad",
      render: (val) => (
        <span style={{ color: "#6b7280" }}>{formatCurrency(val)}</span>
      ),
      responsive: ["md"],
    },
    {
      title: "Total Programa",
      dataIndex: "monto_total",
      key: "total",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#1a1a2e" }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "activo",
      key: "activo",
      render: (activo) => (
        <Tag
          icon={activo ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={activo ? "success" : "error"}
        >
          {activo ? "Activo" : "Inactivo"}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Gestionar Materias">
            <Button
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => setMateriasPrograma(record)}
              style={{ color: PRIMARY_COLOR }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
              style={{ color: PRIMARY_COLOR }}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar programa?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteProgram(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statCards = [
    {
      label: "Total Programas",
      value: totalPrograms,
      icon: <BookOutlined />,
      gradient: "linear-gradient(135deg, #155153, #28a5a5)",
      shadow: "rgba(21, 81, 83, 0.25)",
    },
    {
      label: "Activos",
      value: activePrograms,
      icon: <CheckCircleOutlined />,
      gradient: "linear-gradient(135deg, #0f9b0f, #4ecf4e)",
      shadow: "rgba(15, 155, 15, 0.25)",
    },
    {
      label: "Técnicos",
      value: techPrograms,
      icon: <BookOutlined />,
      gradient: "linear-gradient(135deg, #2c3e50, #5390d9)",
      shadow: "rgba(44, 62, 80, 0.25)",
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #155153, #28a5a5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#fff",
              boxShadow: "0 4px 12px rgba(21, 81, 83, 0.3)",
            }}
          >
            <BookOutlined />
          </div>
          <div>
            <Title
              level={2}
              style={{ margin: 0, color: "#1a1a2e", letterSpacing: "-0.5px" }}
            >
              Programas Académicos
            </Title>
            <Text style={{ color: "#6b7280", fontSize: 15 }}>
              Gestiona la oferta educativa, sus costos y sus materias
            </Text>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 28,
          maxWidth: 650,
        }}
      >
        {statCards.map((card, i) => (
          <StatCard key={i} card={card} loading={loading} />
        ))}
      </div>

      {/* Search & Actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          padding: "16px 20px",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e8ecf0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <Input
          placeholder="Buscar programa..."
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: "1 1 300px",
            minWidth: 240,
            borderRadius: 10,
            height: 42,
          }}
          allowClear
          size="large"
        />
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchPrograms}
            loading={loading}
            style={{
              height: 42,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Recargar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            style={{
              height: 42,
              borderRadius: 10,
              background: PRIMARY_COLOR,
              borderColor: PRIMARY_COLOR,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(21, 81, 83, 0.3)",
            }}
          >
            Nuevo Programa
          </Button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e8ecf0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredProgramas}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `Mostrando ${range[0]}-${range[1]} de ${total} programas`,
              style: { padding: "12px 20px", margin: 0 },
            }}
            scroll={{ x: 800 }}
            size="middle"
          />
        </Spin>
      </div>

      {/* Create/Edit Program Modal */}
      <CreateProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPrograms}
        programToEdit={editingProgram}
      />

      {/* Materias Drawer */}
      <MateriasDrawer
        programa={materiasPrograma}
        programas={programas}
        onClose={() => setMateriasPrograma(null)}
      />

      <style>{`
        .ant-table-thead > tr > th {
          background: #f8fafb !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: #4b5563 !important;
          border-bottom: 2px solid #e5e7eb !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #f0f7f7 !important;
        }
      `}</style>
    </div>
  );
};

/* ── StatCard ── */
function StatCard({ card, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        padding: "20px 22px",
        background: "#fff",
        border: "1px solid #e8ecf0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 12px 28px ${card.shadow}`
          : "0 2px 8px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: card.gradient,
          borderRadius: "16px 16px 0 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: card.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "#fff",
            flexShrink: 0,
            transition: "transform 0.3s ease",
            transform: hovered ? "scale(1.08)" : "scale(1)",
          }}
        >
          {card.icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              marginBottom: 2,
            }}
          >
            {card.label}
          </div>
          {loading ? (
            <Spin size="small" />
          ) : (
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#1a1a2e",
                lineHeight: 1.1,
              }}
            >
              {card.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProgramsManagement;
