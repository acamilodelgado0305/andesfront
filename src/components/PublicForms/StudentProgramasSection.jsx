import React from 'react';
import { Tag, Empty, Typography, Spin } from 'antd';
import { BookOutlined, ClockCircleOutlined } from '@ant-design/icons';
import MateriaDetalle from '../materias/MateriaDetalle';

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
}) {
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
            {materiasDelPrograma.map((m, i) => (
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
                <div className="p-4">
                  <div className="font-semibold text-base text-gray-800 dark:text-[#faf9f5] truncate">
                    {m.nombre}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Empty description="Aún no estás inscrito en ningún programa. Pídele a tu coordinador el enlace de inscripción." />
  );
}
