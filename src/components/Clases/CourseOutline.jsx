import React from 'react';
import { Typography, Progress } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { Puzzle } from 'lucide-react';

const { Text } = Typography;

// Nodo (círculo) de la línea de tiempo del índice del curso.
function TimelineNode({ state, index }) {
  // state: 'done' | 'current' | 'pending'
  const base = 'relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border-2';
  if (state === 'done') {
    return (
      <span className={`${base} bg-green-500 border-green-500 text-white`}>
        <CheckOutlined />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className={`${base} bg-purple-600 border-purple-600 text-white`}>
        {index}
      </span>
    );
  }
  return (
    <span className={`${base} bg-white dark:bg-[#30302e] border-gray-300 dark:border-[#403e3a] text-gray-500 dark:text-[#a8a59e]`}>
      {index}
    </span>
  );
}

// Índice del curso como línea de tiempo: cada tema lista sus clases conectadas por
// una línea vertical; al final del tema, si hay examen, un botón "Tomar examen".
// Agnóstico a la navegación: el padre decide a dónde ir vía onSelect y onTakeExam.
export function CourseSidebar({ outline, currentClaseId, onSelect, onTakeExam }) {
  if (!outline?.temas?.length) return null;
  return (
    <div className="space-y-5">
      {outline.temas.map((tema) => {
        const done = tema.clases.filter((c) => c.estado === 'completado').length;
        const examen = tema.examen;
        const examenHecho = examen?.estado === 'finalizada';
        // La línea vertical llega hasta el último nodo (examen si existe, o última clase).
        const totalNodos = tema.clases.length + (examen ? 1 : 0);

        return (
          <div key={tema.id}>
            {/* Cabecera del tema */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#a8a59e] truncate">
                {tema.titulo}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-[#a8a59e] flex-shrink-0">
                {done}/{tema.clases.length}
              </span>
            </div>

            {/* Línea de tiempo */}
            <div className="relative">
              {/* Línea vertical continua detrás de los nodos */}
              {totalNodos > 1 && (
                <span className="absolute left-[13px] top-3 bottom-3 w-px bg-gray-200 dark:bg-[#403e3a]" />
              )}

              <div className="space-y-1">
                {tema.clases.map((c, i) => {
                  const isCurrent = String(c.id) === String(currentClaseId);
                  const isDone = c.estado === 'completado';
                  const state = isDone ? 'done' : (isCurrent ? 'current' : 'pending');
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={[
                        'w-full text-left flex items-center gap-3 rounded-lg pr-2 py-1.5 transition-colors',
                        isCurrent
                          ? 'bg-purple-50 dark:bg-[#3a3a38]'
                          : 'hover:bg-gray-50 dark:hover:bg-[#3a3a38]',
                      ].join(' ')}
                    >
                      <TimelineNode state={state} index={i + 1} />
                      <span
                        className={[
                          'text-sm truncate',
                          isCurrent
                            ? 'font-semibold text-purple-700 dark:text-[#faf9f5]'
                            : isDone
                              ? 'text-gray-500 dark:text-[#a8a59e]'
                              : 'text-gray-700 dark:text-[#d6d3cc]',
                        ].join(' ')}
                      >
                        {c.titulo}
                      </span>
                    </button>
                  );
                })}

                {/* Examen del tema al final de la línea */}
                {examen && (
                  <button
                    type="button"
                    onClick={() => onTakeExam?.(tema)}
                    className="w-full text-left flex items-center gap-3 rounded-lg pr-2 py-1.5 transition-colors hover:bg-amber-50 dark:hover:bg-[#3a3a38]"
                  >
                    <span
                      className={[
                        'relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2',
                        examenHecho
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-amber-500 border-amber-500 text-white',
                      ].join(' ')}
                    >
                      {examenHecho ? <CheckOutlined /> : <Puzzle size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-amber-700 dark:text-[#e0b877] truncate">
                        {examenHecho ? 'Examen completado' : 'Tomar examen'}
                      </span>
                      {examenHecho && examen.calificacion != null && (
                        <span className="block text-[11px] text-gray-400 dark:text-[#a8a59e]">
                          Nota: {Number(examen.calificacion).toFixed(1)}
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Barra de progreso del curso, calculada con el número de clases completadas.
export function ProgressCard({ completadas, totalClases }) {
  const percent = totalClases ? Math.round((completadas / totalClases) * 100) : 0;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-4 text-center">
      <Text className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#a8a59e] mb-3">
        Tu progreso
      </Text>
      <Progress
        type="circle"
        percent={percent}
        size={110}
        strokeColor={{ '0%': '#7c3aed', '100%': '#16a34a' }}
        format={(p) => (
          <span className="text-2xl font-bold text-gray-800 dark:text-[#faf9f5]">{p}%</span>
        )}
      />
      <div className="mt-3 text-sm text-gray-600 dark:text-[#a8a59e]">
        <span className="font-semibold text-gray-800 dark:text-[#faf9f5]">{completadas}</span>
        {' de '}
        <span className="font-semibold text-gray-800 dark:text-[#faf9f5]">{totalClases}</span>
        {' clases'}
      </div>
      <Progress className="mt-2" percent={percent} showInfo={false} strokeColor="#16a34a" />
    </div>
  );
}
