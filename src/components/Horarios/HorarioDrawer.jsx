import React, { useState, useEffect } from "react";
import {
  Drawer, Button, Table, Space, Tooltip, Popconfirm, Form, Select,
  TimePicker, Input, message, Tag, Divider, Spin, Empty, Typography, Modal, Checkbox,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getHorariosByMateria, createHorario, updateHorario, deleteHorario,
  getEstudiantesDeHorario, asignarEstudiantes, desasignarEstudiante,
} from "../../services/horarios/horariosService";
import { getStudents } from "../../services/student/studentService";

const { Text } = Typography;
const { Option } = Select;

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_COLORS = {
  Lunes: 'blue', Martes: 'purple', 'Miércoles': 'cyan',
  Jueves: 'orange', Viernes: 'green', Sábado: 'magenta', Domingo: 'red',
};
const PRIMARY = '#155153';

export default function HorarioDrawer({ materia, programa, onClose }) {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Students modal
  const [studentsModal, setStudentsModal] = useState(null); // horario row
  const [slotStudents, setSlotStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingStudents, setSavingStudents] = useState(false);

  useEffect(() => {
    if (materia) fetchHorarios();
  }, [materia]);

  const fetchHorarios = async () => {
    setLoading(true);
    try {
      const data = await getHorariosByMateria(materia.id);
      setHorarios(data);
    } catch {
      message.error("Error al cargar horarios.");
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ──
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setFormVisible(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      dia_semana: row.dia_semana,
      hora_inicio: dayjs(row.hora_inicio, 'HH:mm:ss'),
      hora_fin: dayjs(row.hora_fin, 'HH:mm:ss'),
      aula: row.aula,
    });
    setFormVisible(true);
  };

  const cancelForm = () => {
    setFormVisible(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        materia_id: materia.id,
        dia_semana: values.dia_semana,
        hora_inicio: values.hora_inicio.format('HH:mm'),
        hora_fin: values.hora_fin.format('HH:mm'),
        aula: values.aula || null,
      };
      if (editing) {
        await updateHorario(editing.id, payload);
        message.success("Horario actualizado.");
      } else {
        await createHorario(payload);
        message.success("Horario creado.");
      }
      cancelForm();
      fetchHorarios();
    } catch (err) {
      message.error(err.response?.data?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHorario(id);
      message.success("Horario eliminado.");
      fetchHorarios();
    } catch {
      message.error("Error al eliminar.");
    }
  };

  // ── Students modal ──
  const openStudentsModal = async (horario) => {
    setStudentsModal(horario);
    setSelectedToAdd([]);
    setLoadingStudents(true);
    try {
      const [assigned, all] = await Promise.all([
        getEstudiantesDeHorario(horario.id),
        getStudents(),
      ]);
      setSlotStudents(assigned);
      // Only show students not already assigned
      const assignedIds = new Set(assigned.map(s => s.id));
      setAllStudents(all.filter(s => !assignedIds.has(s.id)));
    } catch {
      message.error("Error al cargar estudiantes.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddStudents = async () => {
    if (!selectedToAdd.length) return;
    setSavingStudents(true);
    try {
      await asignarEstudiantes(studentsModal.id, selectedToAdd);
      message.success(`${selectedToAdd.length} estudiante(s) asignado(s).`);
      setSelectedToAdd([]);
      // Refresh both lists
      const [assigned, all] = await Promise.all([
        getEstudiantesDeHorario(studentsModal.id),
        getStudents(),
      ]);
      setSlotStudents(assigned);
      const assignedIds = new Set(assigned.map(s => s.id));
      setAllStudents(all.filter(s => !assignedIds.has(s.id)));
      fetchHorarios(); // refresh totals
    } catch {
      message.error("Error al asignar.");
    } finally {
      setSavingStudents(false);
    }
  };

  const handleRemoveStudent = async (estudianteId) => {
    try {
      await desasignarEstudiante(studentsModal.id, estudianteId);
      message.success("Estudiante removido del horario.");
      const [assigned, all] = await Promise.all([
        getEstudiantesDeHorario(studentsModal.id),
        getStudents(),
      ]);
      setSlotStudents(assigned);
      const assignedIds = new Set(assigned.map(s => s.id));
      setAllStudents(all.filter(s => !assignedIds.has(s.id)));
      fetchHorarios();
    } catch {
      message.error("Error al remover.");
    }
  };

  // ── Table columns ──
  const columns = [
    {
      title: 'Día',
      dataIndex: 'dia_semana',
      key: 'dia',
      render: (d) => <Tag color={DAY_COLORS[d] || 'default'}>{d}</Tag>,
    },
    {
      title: 'Hora Inicio',
      dataIndex: 'hora_inicio',
      key: 'hora_inicio',
      render: (v) => v?.slice(0, 5),
    },
    {
      title: 'Hora Fin',
      dataIndex: 'hora_fin',
      key: 'hora_fin',
      render: (v) => v?.slice(0, 5),
    },
    {
      title: 'Aula',
      dataIndex: 'aula',
      key: 'aula',
      render: (v) => v || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Estudiantes',
      dataIndex: 'total_estudiantes',
      key: 'total',
      align: 'center',
      render: (n, row) => (
        <Button
          type="link"
          size="small"
          icon={<TeamOutlined />}
          onClick={() => openStudentsModal(row)}
          style={{ color: PRIMARY }}
        >
          {n}
        </Button>
      ),
    },
    {
      title: '',
      key: 'acciones',
      align: 'center',
      width: 80,
      render: (_, row) => (
        <Space size={2}>
          <Tooltip title="Editar"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} /></Tooltip>
          <Popconfirm title="¿Eliminar este horario?" onConfirm={() => handleDelete(row.id)} okText="Sí" cancelText="No" okButtonProps={{ danger: true }}>
            <Tooltip title="Eliminar"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        open={!!materia}
        onClose={onClose}
        width={580}
        destroyOnClose
        title={
          <div>
            <Text style={{ fontSize: 12, color: '#888' }}>
              {programa?.nombre} › Horario de
            </Text>
            <br />
            <Text strong style={{ fontSize: 15 }}>{materia?.nombre}</Text>
          </div>
        }
        extra={
          !formVisible && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
              Nuevo Horario
            </Button>
          )
        }
      >
        {/* ── Inline form ── */}
        {formVisible && (
          <div style={{ background: '#f8fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 16px 4px', marginBottom: 20 }}>
            <Text strong>{editing ? 'Editar horario' : 'Nuevo horario'}</Text>
            <Divider style={{ margin: '10px 0' }} />
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="dia_semana" label="Día" rules={[{ required: true, message: 'Selecciona el día' }]} style={{ gridColumn: '1 / -1' }}>
                  <Select placeholder="Día de la semana">
                    {DAYS.map(d => <Option key={d} value={d}>{d}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="hora_inicio" label="Hora inicio" rules={[{ required: true, message: 'Requerido' }]}>
                  <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="hora_fin" label="Hora fin" rules={[{ required: true, message: 'Requerido' }]}>
                  <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="aula" label="Aula (opcional)" style={{ gridColumn: '1 / -1' }}>
                  <Input placeholder="Ej: Aula 3, Virtual, etc." />
                </Form.Item>
              </div>
              <Form.Item style={{ textAlign: 'right', marginBottom: 8 }}>
                <Space>
                  <Button onClick={cancelForm}>Cancelar</Button>
                  <Button type="primary" htmlType="submit" loading={saving} style={{ background: PRIMARY, borderColor: PRIMARY }}>
                    {editing ? 'Guardar Cambios' : 'Crear'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* ── Horarios table ── */}
        <Spin spinning={loading}>
          {horarios.length === 0 && !loading ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin horarios. Crea el primero." />
          ) : (
            <Table columns={columns} dataSource={horarios} rowKey="id" size="small" pagination={false} />
          )}
        </Spin>
      </Drawer>

      {/* ── Students assignment modal ── */}
      <Modal
        open={!!studentsModal}
        title={
          <span>
            Estudiantes — <strong>{studentsModal?.dia_semana}</strong>{' '}
            {studentsModal?.hora_inicio?.slice(0, 5)} a {studentsModal?.hora_fin?.slice(0, 5)}
          </span>
        }
        onCancel={() => setStudentsModal(null)}
        footer={null}
        width={540}
        destroyOnClose
      >
        <Spin spinning={loadingStudents}>
          {/* Assigned */}
          <Text strong style={{ fontSize: 13 }}>Estudiantes asignados ({slotStudents.length})</Text>
          {slotStudents.length === 0 ? (
            <div style={{ color: '#aaa', marginBottom: 12, marginTop: 4 }}>Ninguno aún.</div>
          ) : (
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 12, marginTop: 4 }}>
              {slotStudents.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 13 }}>{s.nombre} {s.apellido} <span style={{ color: '#999' }}>· {s.numero_documento}</span></span>
                  <Popconfirm title="¿Quitar de este horario?" onConfirm={() => handleRemoveStudent(s.id)} okText="Sí" cancelText="No">
                    <Button type="text" size="small" icon={<CloseOutlined />} danger />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}

          <Divider style={{ margin: '12px 0' }} />

          {/* Add students */}
          <Text strong style={{ fontSize: 13 }}>Agregar estudiantes</Text>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Buscar y seleccionar estudiantes..."
            value={selectedToAdd}
            onChange={setSelectedToAdd}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={allStudents.map(s => ({
              value: s.id,
              label: `${s.nombre} ${s.apellido} — ${s.numero_documento}`,
            }))}
          />
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <Button
              type="primary"
              onClick={handleAddStudents}
              loading={savingStudents}
              disabled={!selectedToAdd.length}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
              Agregar {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''}
            </Button>
          </div>
        </Spin>
      </Modal>
    </>
  );
}
