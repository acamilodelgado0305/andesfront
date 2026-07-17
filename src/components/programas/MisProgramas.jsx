// Pantalla de aterrizaje del docente: los programas donde dicta materias.
// Cada tarjeta enlaza al panel del programa (ProgramaDetalle), que el backend
// ya restringe a los programas del docente (docenteProgramaGuard).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Empty, Spin, Typography, Tag, message } from 'antd';
import { ReadOutlined, TeamOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import { getMisProgramas } from '../../services/docentes/serviceDocente';

const { Title, Text } = Typography;

function MisProgramas() {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getMisProgramas();
        if (!cancel) setProgramas(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancel) message.error('No se pudieron cargar tus programas.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }} className="dark:text-[#faf9f5]">
          Mis Programas
        </Title>
        <Text type="secondary" className="dark:text-[#a8a59e]">
          Los programas donde dictas materias. Entra a cada uno para gestionar sus materias, clases y evaluaciones.
        </Text>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : programas.length === 0 ? (
        <Empty
          description="Todavía no tienes programas asignados. Pide a tu administrador que te asocie a un programa."
          style={{ padding: 60 }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {programas.map((p) => (
            <Card
              key={p.id}
              hoverable
              onClick={() => navigate(`/inicio/programas/${p.id}`)}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div
                  style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(29,78,216,0.10)', color: '#1d4ed8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}
                >
                  <ReadOutlined />
                </div>
                <RightOutlined style={{ color: '#9ca3af' }} />
              </div>

              <div style={{ marginTop: 14 }}>
                <Text strong style={{ fontSize: 16 }} className="dark:text-[#faf9f5]">
                  {p.nombre}
                </Text>
                {p.tipo_programa && (
                  <div style={{ marginTop: 6 }}>
                    <Tag color="blue">{p.tipo_programa}</Tag>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <TeamOutlined style={{ color: '#6b7280' }} />
                  <Text type="secondary" className="dark:text-[#a8a59e]">
                    {p.total_estudiantes ?? 0} estudiantes
                  </Text>
                </span>
                {p.duracion_meses ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ClockCircleOutlined style={{ color: '#6b7280' }} />
                    <Text type="secondary" className="dark:text-[#a8a59e]">
                      {p.duracion_meses} meses
                    </Text>
                  </span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default MisProgramas;
