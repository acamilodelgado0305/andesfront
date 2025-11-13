// src/components/admin/evaluaciones/AdminEvaluationsPage.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BuildOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import {
  getEvaluations,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
} from "../../../services/evaluation/evaluationService";

// 🔹 servicios para programas (inventario) y materias
// Ajusta rutas/nombres según tu proyecto real
import { getProgramas  } from "../../../services/programas/programasService";
import { getAllMaterias } from "../../../services/materias/serviceMateria";

const { RangePicker } = DatePicker;
const { Option } = Select;

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

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const data = await getEvaluations();
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
        getProgramas (), // debe devolver lista de programas (inventario)
        getAllMaterias(), // debe devolver lista de materias
      ]);

      // Ajusta según cómo venga tu backend
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
    fetchEvaluations();
    fetchCatalogs();
  }, []);

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
      onOk: async () => {
        try {
          await deleteEvaluation(record.id);
          message.success("Evaluación eliminada");
          fetchEvaluations();
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
      fetchEvaluations();
    } catch (err) {
      if (err?.errorFields) return; // error de validación del form
      console.error(err);
      message.error("Error al guardar la evaluación");
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

  const columns = [
    {
      title: "Título",
      dataIndex: "titulo",
      key: "titulo",
    },
    {
      title: "Tipo destino",
      dataIndex: "tipo_destino",
      key: "tipo_destino",
      render: (value) => value || <Tag color="default">General</Tag>,
    },
    {
      title: "Programa",
      dataIndex: "programa_id",
      key: "programa_id",
      render: (value) => resolveProgramLabel(value),
      width: 220,
    },
    {
      title: "Materia",
      dataIndex: "materia_id",
      key: "materia_id",
      render: (value) => resolveMateriaLabel(value),
      width: 220,
    },
    {
      title: "Intentos máx.",
      dataIndex: "intentos_max",
      key: "intentos_max",
      width: 110,
    },
    {
      title: "Activa",
      dataIndex: "activa",
      key: "activa",
      width: 80,
      render: (val) =>
        val ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>,
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 260,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditModal(record)}
          >
            Editar
          </Button>
          <Button
            icon={<BuildOutlined />}
            size="small"
            type="default"
            onClick={() =>
              navigate(`/inicio/evaluaciones/${record.id}/builder`)
            }
          >
            Preguntas / Asignar
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Nueva evaluación
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchEvaluations}>
          Refrescar
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={evaluations}
        loading={loading}
      />

      <Modal
        open={modalVisible}
        title={editingEvaluation ? "Editar evaluación" : "Nueva evaluación"}
        okText={editingEvaluation ? "Actualizar" : "Crear"}
        cancelText="Cancelar"
        onCancel={() => {
          setModalVisible(false);
          setEditingEvaluation(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        destroyOnClose
        confirmLoading={loadingCatalogs}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            activa: true,
          }}
        >
          <Form.Item
            label="Título"
            name="titulo"
            rules={[{ required: true, message: "Ingrese un título" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Tipo de destino" name="tipo_destino">
            <Select allowClear placeholder="Selecciona el tipo de programa">
              <Option value="Tecnico">Técnico</Option>
              <Option value="Validacion">Validación</Option>
              {/* agrega otros tipos que uses en inventario */}
            </Select>
          </Form.Item>

          <Form.Item
            label="Programa"
            name="programa_id"
            tooltip="Programa (tabla inventario)"
          >
            <Select
              allowClear
              loading={loadingCatalogs}
              placeholder="Selecciona el programa"
              optionFilterProp="children"
              showSearch
            >
              {programs.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.nombre}{" "}
                  {p.tipo_programa ? `(${p.tipo_programa})` : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Materia"
            name="materia_id"
            rules={[
              {
                required: true,
                message: "Selecciona la materia asociada a la evaluación",
              },
            ]}
          >
            <Select
              allowClear
              loading={loadingCatalogs}
              placeholder="Selecciona la materia"
              optionFilterProp="children"
              showSearch
            >
              {materias.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.nombre}{" "}
                  {m.tipo_programa ? `(${m.tipo_programa})` : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Rango de fechas (opcional)" name="rango_fechas">
            <RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Intentos máximos" name="intentos_max">
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Tiempo límite (minutos)"
            name="tiempo_limite_min"
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Activa"
            name="activa"
            valuePropName="checked"
            tooltip="Si está inactiva, los estudiantes no la verán"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminEvaluationsPage;
