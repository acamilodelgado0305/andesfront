import React, { useEffect, useState, useCallback } from 'react';
import {
  Radio, Input, Button, Spin, Alert, Tag, Progress, Modal, message, Empty,
} from 'antd';
import {
  SendOutlined, TrophyOutlined, ArrowLeftOutlined, ArrowRightOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { Puzzle } from 'lucide-react';
import {
  getAssignmentDetail, sendEvaluationAnswers,
} from '../../services/evaluation/evaluationService';

const { TextArea } = Input;

// Color de identidad del examen (ámbar), distinto del morado de las clases.
const AMBER = '#d97706';
// Nota mínima para aprobar el examen de un tema (igual que el backend).
const NOTA_APROBACION = 3.0;

// Examen de un tema, embebido en la vista de clase. Recibe la asignación del
// estudiante (assignmentId), carga sus preguntas y permite responderlo completo
// sin salir de la página. Al enviar, auto-califica en el backend.
//
// onContinuarTema (opcional): si el padre lo provee, significa que existe un tema
// siguiente al que se puede avanzar. Al aprobar (nota ≥ 3.0) se muestra el botón
// "Continuar con el siguiente tema", que dispara este callback.
export default function ClaseExamen({ assignmentId, titulo, descripcion, onBack, onAprobado, onContinuarTema, showBack = true }) {
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);
  const [resultado, setResultado] = useState(null); // { calificacion, cursoCompletado, materiaCompletada }
  // Examen enfocado: se muestra una sola pregunta a la vez.
  const [current, setCurrent] = useState(0);
  // Si el examen ya está finalizado se muestra el resumen "completado" en vez del
  // cuestionario; retomar=true fuerza volver a responder (cuando quedan intentos).
  const [retomar, setRetomar] = useState(false);

  const fetchExamen = useCallback(async () => {
    if (!assignmentId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getAssignmentDetail(assignmentId);
      setAssignment(data.asignacion);
      setQuestions(data.preguntas || []);
      setAnswers({});
      setCurrent(0);
    } catch {
      message.error('No se pudo cargar el examen.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => { fetchExamen(); }, [fetchExamen]);

  const setOpcion = (preguntaId, opcionId) => {
    setAnswers((prev) => ({ ...prev, [preguntaId]: { opcion_id: opcionId, respuesta_texto: null } }));
  };
  const setTexto = (preguntaId, texto) => {
    setAnswers((prev) => ({ ...prev, [preguntaId]: { opcion_id: null, respuesta_texto: texto } }));
  };

  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    return ans && (ans.opcion_id != null || ans.respuesta_texto?.trim());
  }).length;

  const handleSubmit = () => {
    const esFaltante = (q) => {
      if (!q.es_obligatoria) return false;
      const ans = answers[q.id];
      return !ans || (ans.opcion_id == null && !ans.respuesta_texto?.trim());
    };
    const faltantes = questions.filter(esFaltante);
    if (faltantes.length) {
      // Llevar el foco a la primera obligatoria sin responder.
      const primeraIdx = questions.findIndex(esFaltante);
      if (primeraIdx >= 0) setCurrent(primeraIdx);
      Modal.warning({
        title: 'Preguntas sin responder',
        content: `Tienes ${faltantes.length} pregunta(s) obligatoria(s) sin responder. Te llevamos a la primera.`,
        okText: 'Entendido',
      });
      return;
    }

    Modal.confirm({
      title: '¿Enviar examen?',
      content: 'Una vez enviado, tus respuestas serán calificadas automáticamente.',
      okText: 'Sí, enviar',
      cancelText: 'Revisar',
      onOk: async () => {
        const respuestas = questions.map((q) => {
          const ans = answers[q.id] || {};
          return {
            pregunta_id: q.id,
            opcion_id: ans.opcion_id || null,
            respuesta_texto: ans.respuesta_texto || null,
          };
        });
        setSending(true);
        try {
          const data = await sendEvaluationAnswers(assignmentId, { respuestas });
          setResultado({
            calificacion: data.calificacion,
            cursoCompletado: data.cursoCompletado,
            materiaCompletada: data.materiaCompletada,
          });
          onAprobado?.(data);
        } catch {
          message.error('Error al enviar el examen. Intenta nuevamente.');
        } finally {
          setSending(false);
        }
      },
    });
  };

  const tipoLabel = (t) => (
    t === 'opcion_multiple' ? 'Opción múltiple'
      : t === 'verdadero_falso' ? 'Verdadero / Falso'
        : 'Respuesta abierta'
  );

  const intentosMax = assignment?.intentos_max ?? null;
  const intentosHechos = assignment?.intentos_realizados ?? 0;
  const sinIntentos = intentosMax != null && intentosMax > 0 && intentosHechos >= intentosMax;

  // El examen ya está resuelto: acabamos de enviarlo (resultado) o lo abrimos y
  // ya estaba finalizado. En ambos casos mostramos el resumen sin salir de aquí.
  const finalizada = assignment?.estado === 'finalizada';
  const mostrarCompletado = !!resultado || (finalizada && !retomar);

  // Volver a intentar sin recargar: reusa las preguntas ya cargadas.
  const handleRetomar = () => {
    setResultado(null);
    setAnswers({});
    setCurrent(0);
    setRetomar(true);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spin size="large" /></div>;
  }

  // Pantalla de "examen completado": tras enviar o al reabrir uno ya finalizado.
  if (mostrarCompletado) {
    const nota = resultado?.calificacion ?? assignment?.calificacion;
    const aproboCurso = resultado?.cursoCompletado;
    const materiaNombre = resultado?.materiaCompletada?.nombre;
    const yaEstaba = finalizada && !resultado; // se abrió ya completado (no recién enviado)
    // Aprobó este tema (nota ≥ 3.0). Solo entonces, y si hay un tema siguiente
    // (el padre pasa onContinuarTema), ofrecemos avanzar al siguiente tema.
    const aprobado = nota != null && Number(nota) >= NOTA_APROBACION;
    const puedeContinuar = aprobado && !!onContinuarTema;
    return (
      <div className="space-y-4">
        {showBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => onBack?.(resultado)}
            className="!px-2 text-gray-600 dark:text-[#a8a59e] hover:!text-purple-700"
          >
            Volver a la materia
          </Button>
        )}
        <div className="max-w-xl mx-auto text-center py-8">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}
          >
            <TrophyOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#faf9f5] m-0">
            {aprobado ? '¡Examen aprobado!' : '¡Examen completado!'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#a8a59e] mt-1">
            {yaEstaba ? 'Ya resolviste este examen. Tu calificación:' : 'Tu calificación:'}
          </p>
          <p className="text-4xl font-extrabold text-gray-800 dark:text-[#faf9f5] mt-1">
            {nota != null ? Number(nota).toFixed(1) : '—'}
          </p>
          {aproboCurso && materiaNombre && (
            <p className="text-sm font-semibold text-green-600 mt-3">
              Completaste todos los temas de {materiaNombre}
            </p>
          )}
          {puedeContinuar && !aproboCurso && (
            <p className="text-sm font-semibold text-green-600 mt-3">
              ¡Aprobaste este tema! Ya puedes continuar con el siguiente.
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            {puedeContinuar ? (
              <>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  onClick={() => onContinuarTema?.(resultado)}
                  style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  Continuar con el siguiente tema
                </Button>
                <Button onClick={() => onBack?.(resultado)}>Volver a la materia</Button>
              </>
            ) : (
              <Button
                type="primary"
                onClick={() => onBack?.(resultado)}
                style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              >
                Volver a la materia
              </Button>
            )}
            {!sinIntentos && (
              <Button icon={<ReloadOutlined />} onClick={handleRetomar}>
                Volver a intentar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado del examen */}
      <div>
        {showBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => onBack?.()}
            className="!px-2 mb-2 text-gray-600 dark:text-[#a8a59e] hover:!text-purple-700"
          >
            Volver a la materia
          </Button>
        )}
        <div className="rounded-2xl border border-amber-200 dark:border-[#5c4a2e] bg-amber-50 dark:bg-[#3a2f1e] p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <Puzzle size={24} />
            </span>
            <div className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-[#e0b877]">
                Examen del tema
              </span>
              <h2 className="m-0 text-xl font-semibold text-gray-800 dark:text-[#faf9f5]">
                {assignment?.titulo || titulo || 'Examen del tema'}
              </h2>
            </div>
            {intentosMax != null && (
              <Tag color="warning" className="ml-auto">Intentos: {intentosHechos}/{intentosMax}</Tag>
            )}
          </div>
          {(assignment?.descripcion || descripcion) && (
            <p className="text-sm text-gray-600 dark:text-[#a8a59e] mt-2 mb-0">
              {assignment?.descripcion || descripcion}
            </p>
          )}
        </div>
      </div>

      {sinIntentos ? (
        <Alert
          type="info"
          showIcon
          message="Has alcanzado el número máximo de intentos para este examen."
          description={assignment?.calificacion != null ? `Tu última calificación fue: ${assignment.calificacion}.` : undefined}
        />
      ) : totalQuestions === 0 ? (
        <Empty description="Este examen aún no tiene preguntas." />
      ) : (
        (() => {
          // Vista enfocada: solo la pregunta actual.
          const idx = Math.min(current, totalQuestions - 1);
          const q = questions[idx];
          const opciones = q.opciones || [];
          const esAbierta = q.tipo_pregunta !== 'opcion_multiple' && q.tipo_pregunta !== 'verdadero_falso';
          const esUltima = idx === totalQuestions - 1;
          const posProgress = Math.round(((idx + 1) / totalQuestions) * 100);

          return (
            <>
              {/* Posición dentro del examen (Pregunta X de N) */}
              <div className="rounded-xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-[#a8a59e]">
                    Pregunta {idx + 1} de {totalQuestions}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-[#e0b877]">
                    Respondidas {answeredCount}/{totalQuestions}
                  </span>
                </div>
                <Progress percent={posProgress} showInfo={false} strokeColor={AMBER} size="small" />
              </div>

              {/* Pregunta actual (único foco) — acento ámbar para identificar examen */}
              <div className="rounded-2xl border-l-4 border-amber-400 dark:border-amber-500 border-t border-r border-b border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-t-[#403e3a] dark:border-r-[#403e3a] dark:border-b-[#403e3a] bg-white dark:bg-[#30302e] p-6 min-h-[220px]">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-lg font-medium text-gray-800 dark:text-[#faf9f5] whitespace-pre-line">
                      {q.enunciado}
                      {q.es_obligatoria && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-[#a8a59e]">{tipoLabel(q.tipo_pregunta)}</span>
                  </div>
                </div>

                {esAbierta ? (
                  <TextArea
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    value={answers[q.id]?.respuesta_texto || ''}
                    onChange={(e) => setTexto(q.id, e.target.value)}
                    placeholder="Escribe tu respuesta…"
                  />
                ) : (
                  <Radio.Group
                    className="flex flex-col gap-3"
                    value={answers[q.id]?.opcion_id ?? null}
                    onChange={(e) => setOpcion(q.id, e.target.value)}
                  >
                    {opciones.map((op) => (
                      <Radio key={op.id} value={op.id} className="dark:text-[#e8e6df] !text-base py-1">
                        {op.texto}
                      </Radio>
                    ))}
                  </Radio.Group>
                )}
              </div>

              {/* Navegación: Anterior / Siguiente (o Enviar en la última) */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  icon={<ArrowLeftOutlined />}
                  disabled={idx === 0}
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                >
                  Anterior
                </Button>

                {esUltima ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    loading={sending}
                    onClick={handleSubmit}
                    style={{ backgroundColor: AMBER, borderColor: AMBER }}
                  >
                    Enviar examen
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setCurrent((c) => Math.min(totalQuestions - 1, c + 1))}
                    style={{ backgroundColor: AMBER, borderColor: AMBER }}
                  >
                    Siguiente <ArrowRightOutlined />
                  </Button>
                )}
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
