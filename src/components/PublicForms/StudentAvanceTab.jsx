import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Progress, Spin, Empty, Tag, Button, Segmented, Collapse, Tooltip } from 'antd';
import {
  PlayCircleOutlined, ArrowRightOutlined, CheckCircleFilled, ReloadOutlined,
  BookOutlined, TrophyOutlined, ClockCircleOutlined, FileDoneOutlined,
} from '@ant-design/icons';

import { getAvanceEstudiante } from '../../services/clases/serviceClase';

const PURPLE = '#7c3aed';
const GREEN = '#16a34a';
const AMBER = '#d97706';

// Tarjeta de métrica del encabezado (clases vistas / evaluaciones resueltas / pendientes)
function Metric({ icon, label, value, sub, color }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#a8a59e]">
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div className="mt-1 text-xl font-bold text-gray-800 dark:text-[#faf9f5] tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 dark:text-[#a8a59e]">{sub}</div>}
    </div>
  );
}

/**
 * "Mi avance": estado actual del estudiante dentro de un programa.
 * Muestra cuánto lleva, qué le falta (clases y evaluaciones) y permite entrar
 * directamente a la clase pendiente o a responder la evaluación pendiente.
 */
export default function StudentAvanceTab({
  studentId,
  programaId,
  onOpenClase,
  onOpenExamen,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filtro, setFiltro] = useState('pendiente'); // 'pendiente' | 'todo'

  const fetchAvance = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getAvanceEstudiante(studentId);
      setData(res?.programas || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchAvance(); }, [fetchAvance]);

  const programa = useMemo(
    () => (data || []).find((p) => String(p.programa_id) === String(programaId)) || null,
    [data, programaId]
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Spin /></div>;
  }

  if (!programa) {
    return <Empty description="Aún no hay contenido para mostrar tu avance en este programa." />;
  }

  const {
    total_clases: totalClases, clases_completadas: clasesHechas, clases_pendientes: clasesFaltan,
    total_evaluaciones: totalEvals, evaluaciones_resueltas: evalsHechas,
    evaluaciones_pendientes: evalsFaltan, porcentaje, continuar, materias = [],
  } = programa;

  const todoListo = clasesFaltan === 0 && evalsFaltan === 0 && (totalClases + totalEvals) > 0;

  // Materias a listar según el filtro: solo las que tienen algo pendiente, o todas.
  const materiasVisibles = filtro === 'pendiente'
    ? materias.filter((m) => m.clases_pendientes?.length || m.evaluaciones?.some((e) => !e.resuelta))
    : materias;

  return (
    <div className="space-y-4">
      {/* ── Resumen del programa ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Progress
            type="circle"
            size={92}
            percent={porcentaje}
            strokeColor={todoListo ? GREEN : PURPLE}
            format={(p) => (
              <span className="text-base font-bold text-gray-800 dark:text-[#faf9f5]">{p}%</span>
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-gray-800 dark:text-[#faf9f5]">
              {todoListo ? '¡Vas al día! Completaste todo lo asignado' : 'Tu estado actual'}
            </div>
            <div className="text-sm text-gray-500 dark:text-[#a8a59e] mt-0.5">
              {todoListo
                ? 'No tienes clases ni evaluaciones pendientes en este programa.'
                : `Te faltan ${clasesFaltan} clase${clasesFaltan === 1 ? '' : 's'} y ${evalsFaltan} evaluación${evalsFaltan === 1 ? '' : 'es'} por responder.`}
            </div>

            {/* CTA principal: continuar donde se quedó */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {continuar && (
                <Button
                  type="primary"
                  icon={clasesHechas > 0 ? <ArrowRightOutlined /> : <PlayCircleOutlined />}
                  style={{ backgroundColor: PURPLE, borderColor: PURPLE }}
                  onClick={() => onOpenClase?.(continuar.materia_id, continuar.clase_id)}
                >
                  {clasesHechas > 0 ? 'Continuar donde lo dejaste' : 'Empezar mi primera clase'}
                </Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={fetchAvance}>Actualizar</Button>
            </div>
            {continuar && (
              <div className="mt-1.5 text-xs text-gray-400 dark:text-[#a8a59e] truncate">
                Sigue: {continuar.materia_nombre} · Clase {continuar.numero}: {continuar.titulo}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <Metric
            icon={<BookOutlined />} color={PURPLE} label="Clases vistas"
            value={`${clasesHechas}/${totalClases}`}
            sub={clasesFaltan > 0 ? `${clasesFaltan} pendientes` : 'Todas al día'}
          />
          <Metric
            icon={<TrophyOutlined />} color={AMBER} label="Evaluaciones resueltas"
            value={`${evalsHechas}/${totalEvals}`}
            sub={evalsFaltan > 0 ? `${evalsFaltan} por responder` : 'Todas al día'}
          />
          <Metric
            icon={<ClockCircleOutlined />} color={evalsFaltan + clasesFaltan > 0 ? AMBER : GREEN}
            label="Pendientes en total"
            value={clasesFaltan + evalsFaltan}
            sub="Clases + evaluaciones"
          />
        </div>
      </div>

      {/* ── Detalle por materia ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700 dark:text-[#faf9f5]">
          {filtro === 'pendiente' ? 'Lo que te falta' : 'Todas tus materias'}
        </span>
        <Segmented
          size="small"
          value={filtro}
          onChange={setFiltro}
          options={[
            { label: 'Pendiente', value: 'pendiente' },
            { label: 'Ver todo', value: 'todo' },
          ]}
        />
      </div>

      {materiasVisibles.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={filtro === 'pendiente'
            ? 'No te queda nada pendiente en este programa.'
            : 'Este programa aún no tiene materias con contenido.'}
        />
      ) : (
        <Collapse
          defaultActiveKey={materiasVisibles.map((m) => String(m.materia_id))}
          items={materiasVisibles.map((m) => {
            const pendientesClases = m.clases_pendientes || [];
            const evals = m.evaluaciones || [];
            const evalsPend = evals.filter((e) => !e.resuelta);
            const evalsList = filtro === 'pendiente' ? evalsPend : evals;
            // Las clases ya vistas no se listan: se resumen en la barra de avance.
            const clasesList = pendientesClases;
            const pct = m.total_clases
              ? Math.round((m.clases_completadas / m.total_clases) * 100)
              : 0;
            const completa = pendientesClases.length === 0 && evalsPend.length === 0;

            return {
              key: String(m.materia_id),
              label: (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-gray-800 dark:text-[#faf9f5]">{m.nombre}</span>
                  {completa
                    ? <Tag color="success" icon={<CheckCircleFilled />}>Al día</Tag>
                    : (
                      <>
                        {pendientesClases.length > 0 && (
                          <Tag color="purple">{pendientesClases.length} clase{pendientesClases.length === 1 ? '' : 's'}</Tag>
                        )}
                        {evalsPend.length > 0 && (
                          <Tag color="orange">{evalsPend.length} evaluación{evalsPend.length === 1 ? '' : 'es'}</Tag>
                        )}
                      </>
                    )}
                  <span className="flex items-center gap-2 min-w-[130px] flex-1 max-w-[220px]">
                    <Progress
                      percent={pct} size="small" showInfo={false}
                      strokeColor={pct === 100 ? GREEN : PURPLE}
                      style={{ flex: 1, margin: 0 }}
                    />
                    <span className="text-xs text-gray-500 dark:text-[#a8a59e] tabular-nums whitespace-nowrap">
                      {m.clases_completadas}/{m.total_clases}
                    </span>
                  </span>
                </div>
              ),
              children: (
                <div className="space-y-3">
                  {/* Clases pendientes */}
                  {clasesList.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e] mb-1.5">
                        Clases por ver
                      </div>
                      <div className="space-y-1.5">
                        {clasesList.map((c, i) => (
                          <div
                            key={c.clase_id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-[#403e3a] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm text-gray-800 dark:text-[#faf9f5] truncate">
                                <span className="text-gray-400 dark:text-[#a8a59e] mr-1">Clase {c.numero}:</span>
                                {c.titulo}
                              </div>
                              {c.modulo_titulo && (
                                <div className="text-[11px] text-gray-400 dark:text-[#a8a59e] truncate">
                                  {c.modulo_titulo}
                                </div>
                              )}
                            </div>
                            <Button
                              size="small"
                              type={i === 0 ? 'primary' : 'default'}
                              icon={<PlayCircleOutlined />}
                              style={i === 0 ? { backgroundColor: PURPLE, borderColor: PURPLE } : undefined}
                              onClick={() => onOpenClase?.(m.materia_id, c.clase_id)}
                            >
                              {i === 0 ? 'Continuar' : 'Ver'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evaluaciones */}
                  {evalsList.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e] mb-1.5">
                        Evaluaciones
                      </div>
                      <div className="space-y-1.5">
                        {evalsList.map((e) => (
                          <div
                            key={e.asignacion_id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-[#403e3a] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm text-gray-800 dark:text-[#faf9f5] truncate">
                                {e.titulo}
                              </div>
                              <div className="text-[11px] text-gray-400 dark:text-[#a8a59e]">
                                {e.resuelta
                                  ? `Resuelta${e.calificacion != null ? ` · Nota ${Number(e.calificacion).toFixed(1)}` : ''}`
                                  : e.fecha_fin
                                    ? `Cierra el ${new Date(e.fecha_fin).toLocaleDateString('es-CO')}`
                                    : 'Sin fecha límite'}
                              </div>
                            </div>
                            {e.resuelta ? (
                              <Tooltip title="Ya la respondiste">
                                <Tag color="success" icon={<CheckCircleFilled />}>Hecha</Tag>
                              </Tooltip>
                            ) : (
                              <Button
                                size="small"
                                type="primary"
                                icon={<FileDoneOutlined />}
                                style={{ backgroundColor: AMBER, borderColor: AMBER }}
                                onClick={() => onOpenExamen?.(m.materia_id, {
                                  asignacion_id: e.asignacion_id,
                                  titulo: e.titulo,
                                  descripcion: e.descripcion,
                                  estado: e.estado,
                                  calificacion: e.calificacion,
                                  moduloId: e.modulo_id,
                                })}
                              >
                                Responder
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {clasesList.length === 0 && evalsList.length === 0 && (
                    <div className="text-sm text-gray-400 dark:text-[#a8a59e]">
                      No te queda nada pendiente en esta materia.
                    </div>
                  )}
                </div>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
