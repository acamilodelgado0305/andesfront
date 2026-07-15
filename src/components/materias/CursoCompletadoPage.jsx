import React, { useEffect, useState } from 'react';
import { Button, Spin, Empty } from 'antd';
import { TrophyOutlined, ArrowLeftOutlined, BookOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getMateriaProgresoEstudiante } from '../../services/materias/serviceMateria';

// Página de felicitaciones al completar un curso: se llega aquí al aprobar el
// examen del último tema pendiente (mismo número de exámenes aprobados que de
// temas). También es accesible por URL directa, por eso vuelve a consultar el
// progreso en vez de confiar solo en el estado de navegación.
export default function CursoCompletadoPage() {
  const { materiaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progreso, setProgreso] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMateriaProgresoEstudiante(materiaId)
      .then((data) => { if (active) setProgreso(data); })
      .catch(() => { if (active) setProgreso({ ok: false }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [materiaId]);

  if (loading) {
    return <div className="flex justify-center py-24"><Spin size="large" /></div>;
  }

  if (!progreso?.ok) {
    return <Empty description="No se pudo cargar el progreso del curso" className="mt-20" />;
  }

  const { materia, totalTemas, temasCompletados, completado } = progreso;

  return (
    <div className="max-w-xl mx-auto p-4 mt-6">
      <div className="rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] overflow-hidden shadow-sm">
        <div
          className="p-10 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #16a34a)' }}
        >
          <TrophyOutlined style={{ fontSize: 56 }} />
          <h1 className="text-2xl font-bold mt-3 mb-1">
            {completado ? '¡Felicidades, curso completado!' : 'Aún no completas este curso'}
          </h1>
          <p className="text-white/90 text-base !mb-0">
            {materia?.nombre}
            {materia?.programaNombre ? ` · ${materia.programaNombre}` : ''}
          </p>
        </div>

        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-[#a8a59e] mb-1">Temas con examen aprobado</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-[#faf9f5] mb-6">
            {temasCompletados}
            <span className="text-gray-400 dark:text-[#a8a59e] text-xl font-normal"> / {totalTemas}</span>
          </p>

          <p className="text-gray-600 dark:text-[#a8a59e] mb-6">
            {completado
              ? 'Aprobaste el examen de cada tema de esta materia. ¡Excelente trabajo!'
              : 'Sigue resolviendo los exámenes pendientes para completar el curso.'}
          </p>

          <div className="flex justify-center gap-3 flex-wrap">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/portal/modulos')}>
              Volver a mis temas
            </Button>
            <Button
              type="primary"
              icon={<BookOutlined />}
              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={() => navigate('/campus')}
            >
              Ir al portal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
