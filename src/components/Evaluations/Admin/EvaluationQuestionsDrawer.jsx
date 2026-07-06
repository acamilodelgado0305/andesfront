// src/components/Evaluations/Admin/EvaluationQuestionsDrawer.jsx
//
// Drawer autocontenido para VER / CREAR / EDITAR / ELIMINAR las preguntas y
// opciones de una evaluación, sin salir del tab de Programas → Materia. Reemplaza
// la navegación a la página standalone /inicio/evaluaciones/:id/builder: toda la
// gestión de preguntas se controla desde aquí mismo.
//
// La edición es INLINE: al pulsar "Editar" la propia tarjeta se convierte en un
// editor (enunciado, tipo, puntaje, orden, obligatoria y opciones) — no se abre
// ningún modal. Crear una pregunta nueva reusa el mismo editor como borrador.
//
// Props:
//   - evaluationId : id de la evaluación a gestionar (null = cerrado)
//   - open         : boolean, abre/cierra el drawer
//   - onClose      : () => void
//   - onChanged    : () => void  (se llama tras cualquier cambio para que el
//                    componente padre refresque contadores de preguntas)
import React, { useEffect, useState } from 'react';
import {
  Drawer, Button, Space, Tag, Input, Select, InputNumber,
  Switch, message, Empty, Spin, Popconfirm,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  QuestionCircleOutlined, OrderedListOutlined, FileTextOutlined, SaveOutlined,
} from '@ant-design/icons';
import {
  getEvaluationById, addQuestionWithOptions, deleteQuestion, deleteOption,
  updateQuestion,
} from '../../../services/evaluation/evaluationService';

const { TextArea } = Input;

// Colores/etiquetas por tipo de pregunta (mismos que el builder standalone).
const TYPE_META = {
  opcion_multiple: { label: 'Opción múltiple', color: 'blue',   accent: 'linear-gradient(135deg, #4338ca, #6366f1)' },
  verdadero_falso: { label: 'Verdadero / Falso', color: 'cyan',  accent: 'linear-gradient(135deg, #0f766e, #14b8a6)' },
  abierta:         { label: 'Abierta',          color: 'orange', accent: 'linear-gradient(135deg, #b45309, #f59e0b)' },
};
const typeMeta = (t) => TYPE_META[t] || TYPE_META.abierta;

const TYPE_OPTIONS = [
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'verdadero_falso', label: 'Verdadero / Falso' },
  { value: 'abierta', label: 'Abierta' },
];

// Opciones iniciales según el tipo (para un editor nuevo o al cambiar de tipo).
const defaultOptionsFor = (tipo, existing) => {
  if (existing && existing.length > 0) {
    return existing.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((o) => ({ id: o.id, texto: o.texto, es_correcta: o.es_correcta }));
  }
  if (tipo === 'verdadero_falso') {
    return [{ texto: 'Verdadero', es_correcta: false }, { texto: 'Falso', es_correcta: false }];
  }
  if (tipo === 'abierta') return [];
  return [{ texto: '', es_correcta: false }];
};

// ─── Editor inline de una pregunta (crear o editar sin modal) ────────────────
function QuestionEditor({ index, initial, saving, onSave, onCancel }) {
  const isNew = !initial;
  const [enunciado, setEnunciado] = useState(initial?.enunciado || '');
  const [tipo, setTipo] = useState(initial?.tipo_pregunta || 'opcion_multiple');
  const [puntaje, setPuntaje] = useState(initial?.puntaje != null ? Number(initial.puntaje) : 1);
  const [orden, setOrden] = useState(initial?.orden ?? undefined);
  const [obligatoria, setObligatoria] = useState(initial?.es_obligatoria ?? true);
  const [options, setOptions] = useState(() =>
    defaultOptionsFor(initial?.tipo_pregunta || 'opcion_multiple', initial?.opciones));

  const meta = typeMeta(tipo);
  const conOpciones = tipo === 'opcion_multiple' || tipo === 'verdadero_falso';

  const handleTipoChange = (t) => {
    setTipo(t);
    // Al cambiar el tipo, regeneramos las opciones acordes (V/F fijas, MC vacía, abierta ninguna).
    setOptions(defaultOptionsFor(t, t === (initial?.tipo_pregunta) ? initial?.opciones : null));
  };

  const setOpt = (i, key, value) =>
    setOptions((prev) => { const c = [...prev]; c[i] = { ...c[i], [key]: value }; return c; });
  const addOpt = () => setOptions((prev) => [...prev, { texto: '', es_correcta: false }]);
  const removeOpt = (i) => setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!enunciado.trim()) { message.warning('Ingresa el enunciado de la pregunta'); return; }
    if (puntaje == null || Number.isNaN(Number(puntaje))) { message.warning('Ingresa el puntaje'); return; }
    onSave({
      values: { enunciado: enunciado.trim(), tipo_pregunta: tipo, es_obligatoria: obligatoria, puntaje, orden },
      options,
      editing: initial,
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden bg-white dark:bg-[#30302e] border-indigo-300 dark:border-indigo-500/50 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-500/20">
      <div style={{ height: 4, background: meta.accent }} />
      <div className="p-4 flex flex-col gap-3">
        {/* Enunciado */}
        <div className="flex items-start gap-3">
          <span
            className="flex items-center justify-center rounded-lg text-xs font-bold text-white flex-shrink-0"
            style={{ width: 30, height: 30, background: meta.accent }}
          >
            {isNew ? <PlusOutlined /> : index + 1}
          </span>
          <TextArea
            autoSize={{ minRows: 2, maxRows: 6 }}
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            placeholder="Escribe el enunciado de la pregunta..."
            style={{ flex: 1 }}
          />
        </div>

        {/* Tipo / Puntaje / Orden */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:pl-[42px]">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-[#a8a59e] mb-1">Tipo</div>
            <Select value={tipo} onChange={handleTipoChange} options={TYPE_OPTIONS} style={{ width: '100%' }} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-[#a8a59e] mb-1">Puntaje</div>
            <InputNumber min={0} value={puntaje} onChange={setPuntaje} style={{ width: '100%' }} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-[#a8a59e] mb-1">Orden</div>
            <InputNumber min={1} value={orden} onChange={setOrden} placeholder="#" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="sm:pl-[42px]">
          <Space size="small">
            <Switch checked={obligatoria} onChange={setObligatoria} checkedChildren="Obligatoria" unCheckedChildren="Opcional" />
          </Space>
        </div>

        {/* Opciones */}
        {conOpciones && (
          <div className="sm:pl-[42px]">
            <div className="rounded-xl p-3 bg-gray-50 dark:bg-[#262624] border border-gray-100 dark:border-[#403e3a]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-[#faf9f5] mb-2">
                <OrderedListOutlined /> Opciones de respuesta
              </div>
              <div className="flex flex-col gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={`rounded-full border-2 flex-shrink-0 ${opt.es_correcta ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-[#5a5852]'}`}
                      style={{ width: 16, height: 16 }}
                    />
                    <Input
                      placeholder={`Opción ${i + 1}`}
                      value={opt.texto}
                      onChange={(e) => setOpt(i, 'texto', e.target.value)}
                      disabled={tipo === 'verdadero_falso'}
                      style={{ flex: 1 }}
                    />
                    <span className="text-xs text-gray-500 dark:text-[#a8a59e] whitespace-nowrap">Correcta</span>
                    <Switch size="small" checked={opt.es_correcta} onChange={(c) => setOpt(i, 'es_correcta', c)} />
                    {options.length > 1 && tipo === 'opcion_multiple' && (
                      <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => removeOpt(i)} />
                    )}
                  </div>
                ))}
              </div>
              {tipo === 'opcion_multiple' && (
                <Button type="dashed" block icon={<PlusOutlined />} onClick={addOpt} style={{ marginTop: 10 }}>
                  Agregar opción
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#403e3a]">
          <Button icon={<CloseOutlined />} onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button
            type="primary" icon={<SaveOutlined />} loading={saving} onClick={submit}
            style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', border: 'none' }}
          >
            {isNew ? 'Crear pregunta' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationQuestionsDrawer({ evaluationId, open, onClose, onChanged }) {
  const [evaluation, setEvaluation] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null); // id de la pregunta en edición inline
  const [creating, setCreating] = useState(false);   // borrador de pregunta nueva visible
  const [savingId, setSavingId] = useState(null);     // id | 'new' — cuál se está guardando

  const fetchEvaluation = async () => {
    if (!evaluationId) return;
    try {
      setLoading(true);
      const data = await getEvaluationById(evaluationId);
      setEvaluation(data.evaluacion);
      setQuestions(data.preguntas || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && evaluationId) fetchEvaluation();
    if (!open) {
      setEvaluation(null); setQuestions([]);
      setEditingId(null); setCreating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, evaluationId]);

  // ─── Guardar (crear o actualizar) desde un editor inline ──────────────────
  const persistQuestion = async ({ values, options, editing }) => {
    const key = editing?.id ?? 'new';
    try {
      setSavingId(key);
      const { enunciado, tipo_pregunta, es_obligatoria, puntaje, orden } = values;

      let opcionesToSend = [];
      if (tipo_pregunta === 'opcion_multiple' || tipo_pregunta === 'verdadero_falso') {
        opcionesToSend = options
          .filter((opt) => opt.texto && opt.texto.trim() !== '')
          .map((opt, idx) => ({ id: opt.id, texto: opt.texto.trim(), es_correcta: !!opt.es_correcta, orden: idx + 1 }));
      }

      if (editing) {
        const originalOptionIds = (editing.opciones || []).map((o) => o.id);
        const currentOptionIds = opcionesToSend.map((o) => o.id).filter((id) => !!id);
        const removedOptionIds = originalOptionIds.filter((id) => !currentOptionIds.includes(id));

        await updateQuestion(editing.id, {
          enunciado, tipo_pregunta, es_obligatoria, puntaje, orden, opciones: opcionesToSend,
        });
        for (const optId of removedOptionIds) {
          try { await deleteOption(optId); } catch (e) { console.error('Error eliminando opción', e); }
        }
        message.success('Pregunta actualizada');
        setEditingId(null);
      } else {
        await addQuestionWithOptions(evaluationId, {
          enunciado, tipo_pregunta, es_obligatoria, puntaje, orden, opciones: opcionesToSend,
        });
        message.success('Pregunta creada');
        setCreating(false);
      }

      fetchEvaluation();
      onChanged?.();
    } catch (err) {
      console.error(err);
      message.error(editing ? 'Error al actualizar la pregunta' : 'Error al guardar la pregunta');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await deleteQuestion(questionId);
      message.success('Pregunta eliminada');
      if (editingId === questionId) setEditingId(null);
      fetchEvaluation();
      onChanged?.();
    } catch (err) {
      console.error(err);
      message.error('Error al eliminar la pregunta');
    }
  };

  const handleDeleteOptionInList = async (optionId) => {
    try {
      await deleteOption(optionId);
      message.success('Opción eliminada');
      fetchEvaluation();
      onChanged?.();
    } catch (err) {
      console.error(err);
      message.error('Error al eliminar la opción');
    }
  };

  const startEdit = (q) => { setCreating(false); setEditingId(q.id); };
  const startCreate = () => { setEditingId(null); setCreating(true); };

  const totalPuntaje = questions.reduce((acc, q) => acc + parseFloat(q.puntaje || 0), 0);

  // ─── Tarjeta de una pregunta en modo lectura (dark-mode aware) ────────────
  const renderReadOnlyQuestion = (q, index) => {
    const meta = typeMeta(q.tipo_pregunta);
    return (
      <div
        key={q.id}
        className="rounded-xl border overflow-hidden bg-white dark:bg-[#30302e] border-gray-100 dark:border-[#403e3a] shadow-sm"
      >
        <div style={{ height: 4, background: meta.accent }} />
        <div className="p-4">
          {/* Enunciado + tags */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span
                className="flex items-center justify-center rounded-lg text-xs font-bold text-white flex-shrink-0"
                style={{ width: 30, height: 30, background: meta.accent }}
              >
                {index + 1}
              </span>
              <p className="font-semibold text-gray-800 dark:text-[#faf9f5] m-0 leading-snug">{q.enunciado}</p>
            </div>
            <div className="flex gap-1.5 flex-wrap flex-shrink-0">
              <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
              <Tag color="gold" style={{ margin: 0 }}>{q.puntaje} pts</Tag>
              {q.es_obligatoria && <Tag color="red" style={{ margin: 0 }}>Obligatoria</Tag>}
            </div>
          </div>

          {/* Opciones */}
          {q.opciones && q.opciones.length > 0 && (
            <div className="flex flex-col gap-2 mt-3 pl-0 sm:pl-[42px]">
              {q.opciones.map((opt) => (
                <div
                  key={opt.id}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg border ${
                    opt.es_correcta
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40'
                      : 'bg-gray-50 dark:bg-[#3a3a38] border-gray-100 dark:border-[#403e3a]'
                  }`}
                >
                  <span
                    className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      opt.es_correcta ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-[#5a5852]'
                    }`}
                    style={{ width: 18, height: 18 }}
                  >
                    {opt.es_correcta && <CheckOutlined className="text-white" style={{ fontSize: 10 }} />}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-[#e8e6e1] font-medium">{opt.texto}</span>
                  {opt.es_correcta && <Tag color="success" style={{ margin: 0 }}>Correcta</Tag>}
                  <Popconfirm
                    title="¿Eliminar esta opción?"
                    okText="Sí" cancelText="No"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDeleteOptionInList(opt.id)}
                  >
                    <Button
                      type="text" danger size="small" icon={<DeleteOutlined />}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-[#403e3a]">
            <Space size="small">
              <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(q)}>Editar</Button>
              <Popconfirm
                title="¿Eliminar esta pregunta y todas sus opciones?"
                okText="Sí, eliminar" cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteQuestion(q.id)}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>Eliminar</Button>
              </Popconfirm>
            </Space>
            {q.orden != null && (
              <span className="text-xs text-gray-400 dark:text-[#a8a59e] font-medium">Orden: {q.orden}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
      title={
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded-xl text-white flex-shrink-0"
            style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #4338ca, #6366f1)' }}
          >
            <FileTextOutlined style={{ fontSize: 18 }} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base truncate text-gray-800 dark:text-[#faf9f5]">
              {evaluation?.titulo || 'Evaluación'}
            </div>
            <div className="text-xs text-gray-400 dark:text-[#a8a59e]">Preguntas y opciones de respuesta</div>
          </div>
        </div>
      }
      extra={
        <Button
          type="primary" icon={<PlusOutlined />} onClick={startCreate} disabled={creating}
          style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', border: 'none' }}
        >
          Agregar pregunta
        </Button>
      }
    >
      <Spin spinning={loading}>
        {/* Resumen */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Tag icon={<QuestionCircleOutlined />} color="geekblue" style={{ padding: '4px 10px' }}>
            {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}
          </Tag>
          <Tag icon={<OrderedListOutlined />} color="gold" style={{ padding: '4px 10px' }}>
            {totalPuntaje} pts en total
          </Tag>
        </div>
        {evaluation?.descripcion && (
          <p className="text-sm text-gray-500 dark:text-[#a8a59e] mb-4">{evaluation.descripcion}</p>
        )}

        {/* Borrador de pregunta nueva (editor inline) */}
        {creating && (
          <div className="mb-4">
            <QuestionEditor
              initial={null}
              index={questions.length}
              saving={savingId === 'new'}
              onSave={persistQuestion}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {questions.length === 0 && !creating ? (
          <div className="py-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-gray-500 dark:text-[#a8a59e]">
                  Esta evaluación aún no tiene preguntas
                </span>
              }
            >
              <Button
                type="primary" icon={<PlusOutlined />} onClick={startCreate}
                style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', border: 'none' }}
              >
                Agregar la primera pregunta
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => (
              editingId === q.id ? (
                <QuestionEditor
                  key={q.id}
                  initial={q}
                  index={i}
                  saving={savingId === q.id}
                  onSave={persistQuestion}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                renderReadOnlyQuestion(q, i)
              )
            ))}
          </div>
        )}
      </Spin>
    </Drawer>
  );
}
