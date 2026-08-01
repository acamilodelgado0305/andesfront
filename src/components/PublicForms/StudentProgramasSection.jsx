import React, { useMemo } from 'react';
import { Tag, Empty, Typography, Spin, Tabs } from 'antd';
import { BookOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import MateriaDetalle from '../materias/MateriaDetalle';
import StudentGradesTab from './StudentGradesTab';

const normalizaNombre = (s) => String(s || '').trim().toLowerCase();

const { Title, Text } = Typography;

const MATERIA_GRADIENTS = [
  'linear-gradient(135deg,#155153,#28a5a5)',
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#0ea5e9,#38bdf8)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#ef4444,#f87171)',
  'linear-gradient(135deg,#10b981,#34d399)',
];

// Panel de contenido del programa/materia seleccionados en el portal de
// estudiante. La navegación de materias vive aquí (tarjetas grandes), no en
// el sidebar — el sidebar solo lista los programas.
export default function StudentProgramasSection({
  programaSel, materiaSel, materiasDelPrograma, loadingMaterias, onSelectMateria,
  onImmersiveChange,
  gradesInfo = [], gradesByCierre = [], studentInfo, currentStudentId,
  downloadingReport = false, onDownloadReport,
}) {
  // Notas del programa actual: las tablas `grades` guardan la materia por
  // nombre, así que filtramos las notas del estudiante a las materias que
  // pertenecen al programa seleccionado (mismo criterio que usa el backend:
  // nombre normalizado sin mayúsculas/espacios).
  const nombresMateriasPrograma = useMemo(
    () => new Set(materiasDelPrograma.map((m) => normalizaNombre(m.nombre))),
    [materiasDelPrograma]
  );

  const gradesInfoPrograma = useMemo(
    () => gradesInfo.filter((g) => nombresMateriasPrograma.has(normalizaNombre(g.materia))),
    [gradesInfo, nombresMateriasPrograma]
  );

  // Periodos de ESTE programa. Se filtran por `programa_id` (un periodo
  // pertenece a un solo programa); si el estudiante está en varios programas,
  // así no se mezclan sus cortes. Se conserva el periodo actual aunque venga
  // vacío (el estudiante recién empieza ese corte).
  const gradesByCierrePrograma = useMemo(
    () => gradesByCierre
      .filter((c) => c.programa_id == null || String(c.programa_id) === String(programaSel?.programa_id ?? programaSel?.id))
      .map((c) => ({ ...c, grades: c.grades.filter((g) => nombresMateriasPrograma.has(normalizaNombre(g.materia))) }))
      .filter((c) => c.grades.length > 0 || c.es_actual),
    [gradesByCierre, nombresMateriasPrograma, programaSel]
  );

  // Nota que se muestra en la tarjeta de cada materia: la del periodo actual
  // (o la del más reciente disponible si aún no hay notas en el actual).
  const notaPorMateria = useMemo(() => {
    const periodos = gradesByCierrePrograma;
    const noHistoricos = periodos.filter((p) => !p.es_historico);
    const actual =
      periodos.find((p) => p.es_actual && p.grades.length > 0) ||
      [...noHistoricos].reverse().find((p) => p.grades.length > 0) ||
      null;

    const fuente = actual ? actual.grades : gradesInfoPrograma;
    const map = new Map();
    fuente.forEach((g) => map.set(normalizaNombre(g.materia), g.nota));
    return map;
  }, [gradesByCierrePrograma, gradesInfoPrograma]);
  // Reusa el mismo panel de materia del admin (banner, Temas/Foro/Evaluaciones),
  // en modo solo-lectura: oculta crear/editar/eliminar y usa los endpoints de
  // estudiante para las clases, temas y evaluaciones.
  if (materiaSel) {
    return (
      <MateriaDetalle
        materiaId={materiaSel.id}
        programaId={programaSel?.id}
        embedded
        readOnly
        onBack={() => onSelectMateria?.(null)}
        onImmersiveChange={onImmersiveChange}
      />
    );
  }

  if (programaSel) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}
          >
            <BookOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }} className="dark:!text-[#faf9f5]">
              {programaSel.nombre}
            </Title>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {programaSel.tipo_programa && <Tag color="purple">{programaSel.tipo_programa}</Tag>}
              {programaSel.duracion_meses && (
                <Tag icon={<ClockCircleOutlined />}>{programaSel.duracion_meses} meses</Tag>
              )}
            </div>
          </div>
        </div>

        <Tabs
          className="mt-3"
          items={[
            {
              key: 'materias',
              label: <span><BookOutlined /> Materias</span>,
              children: (
                <>
                  <Text type="secondary" className="text-sm dark:text-[#a8a59e]">
                    Selecciona una materia para ver sus temas, foro y evaluaciones.
                  </Text>

                  {loadingMaterias ? (
                    <div className="mt-6 flex justify-center"><Spin /></div>
                  ) : materiasDelPrograma?.length === 0 ? (
                    <div className="mt-4">
                      <Empty description="Este programa aún no tiene materias disponibles." />
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {materiasDelPrograma.map((m, i) => {
                        const nota = notaPorMateria.get(normalizaNombre(m.nombre));
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onSelectMateria?.(m.id)}
                            className="text-left rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden"
                          >
                            <div
                              className="h-24 flex items-center justify-center text-white"
                              style={{ background: MATERIA_GRADIENTS[i % MATERIA_GRADIENTS.length] }}
                            >
                              <BookOutlined style={{ fontSize: 32 }} />
                            </div>
                            <div className="p-4 flex items-center justify-between gap-2">
                              <div className="font-semibold text-base text-gray-800 dark:text-[#faf9f5] truncate">
                                {m.nombre}
                              </div>
                              {nota !== undefined && nota !== null && (
                                <Tag className="flex-shrink-0">{Number(nota).toFixed(1)}</Tag>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'notas',
              label: <span><FileTextOutlined /> Notas</span>,
              children: (
                <StudentGradesTab
                  gradesInfo={gradesInfoPrograma}
                  gradesByCierre={gradesByCierrePrograma}
                  currentStudentId={currentStudentId}
                  studentInfo={studentInfo}
                  loading={downloadingReport}
                  onDownloadReport={onDownloadReport}
                />
              ),
            },
          ]}
        />
      </div>
    );
  }

  return (
    <Empty description="Aún no estás inscrito en ningún programa. Pídele a tu coordinador el enlace de inscripción." />
  );
}
