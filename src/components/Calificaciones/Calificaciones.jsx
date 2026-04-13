import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Empty } from 'antd';
import {
  FileTextOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  TrophyOutlined,
  BarChartOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { getProgramas } from '../../services/programas/programasService';

const GRADIENTS = [
  'linear-gradient(135deg, #155153 0%, #1a7a7d 50%, #28a5a5 100%)',
  'linear-gradient(135deg, #1a1a40 0%, #2d3a6e 50%, #4a69bd 100%)',
  'linear-gradient(135deg, #0d3b3d 0%, #155153 50%, #1e8a8a 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #4a6274 50%, #5390d9 100%)',
  'linear-gradient(135deg, #1a3a2a 0%, #276749 50%, #48bb78 100%)',
  'linear-gradient(135deg, #4a1942 0%, #7c3f7c 50%, #b05bb0 100%)',
];
const SHADOWS = [
  'rgba(21,81,83,0.4)',
  'rgba(26,26,64,0.4)',
  'rgba(13,59,61,0.4)',
  'rgba(44,62,80,0.4)',
  'rgba(26,58,42,0.4)',
  'rgba(74,25,66,0.4)',
];

function Calificaciones() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProgramas()
      .then((data) => setPrograms(data.data || data || []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
          borderRadius: 24,
          padding: '40px 44px 36px',
          marginBottom: 36,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', top: -60, right: -30 }} />
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -40, right: 120 }} />
        <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(40,165,165,0.15)', top: 20, right: 200 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(40,165,165,0.15)', border: '1px solid rgba(40,165,165,0.25)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#5ce0d8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            <BarChartOutlined /> Centro de Calificaciones
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.8px', lineHeight: 1.2 }}>
            Gestión de Calificaciones
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, marginTop: 8, fontWeight: 400 }}>
            Selecciona un programa para registrar y administrar calificaciones
          </p>

          <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(40,165,165,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#5ce0d8' }}>
                <TeamOutlined />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                  {loading ? <Spin size="small" /> : programs.length}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Programas
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(92,224,216,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#5ce0d8' }}>
                <FileTextOutlined />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>En tiempo real</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sincronización</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : programs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid #f0f0f0' }}>
          <Empty description="No hay programas disponibles" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {programs.map((program, idx) => (
            <ProgramCard
              key={program.id}
              program={program}
              gradient={GRADIENTS[idx % GRADIENTS.length]}
              shadowColor={SHADOWS[idx % SHADOWS.length]}
              onClick={() => navigate(`/inicio/calificaciones/${program.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program, gradient, shadowColor, onClick }) {
  const [hovered, setHovered] = useState(false);

  const chipColor = gradient.includes('155153') ? '#155153' : gradient.includes('1a1a40') ? '#2d3a6e' : '#155153';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? `0 24px 48px ${shadowColor}, 0 0 0 1px rgba(0,0,0,0.03)`
          : '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        background: '#ffffff',
      }}
    >
      {/* Top gradient banner */}
      <div style={{ background: gradient, padding: '32px 32px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 140, opacity: 0.06, color: '#fff', transform: hovered ? 'rotate(-5deg) scale(1.15)' : 'rotate(-15deg) scale(1)', transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <TrophyOutlined />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.3px', padding: '2px 10px', marginBottom: 16, display: 'inline-block' }}>
            {program.tipo_programa || 'Programa'}
          </div>

          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', marginBottom: 18, border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.08)' : 'scale(1)' }}>
            <BookOutlined />
          </div>

          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            {program.nombre}
          </h3>
          {program.descripcion && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>
              {program.descripcion}
            </p>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: '20px 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `rgba(21,81,83,0.07)`, border: `1px solid rgba(21,81,83,0.12)`, padding: '8px 16px', borderRadius: 12 }}>
          <BookOutlined style={{ fontSize: 16, color: chipColor }} />
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Programa</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: chipColor }}>{program.tipo_programa || '—'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: hovered ? gradient : 'transparent', border: hovered ? 'none' : `1px solid rgba(21,81,83,0.15)`, transition: 'all 0.35s ease', color: hovered ? '#fff' : chipColor, fontSize: 13, fontWeight: 600, boxShadow: hovered ? `0 6px 20px ${shadowColor}` : 'none' }}>
          Ingresar
          <ArrowRightOutlined style={{ transition: 'transform 0.3s ease', transform: hovered ? 'translateX(4px)' : 'translateX(0)' }} />
        </div>
      </div>
    </div>
  );
}

export default Calificaciones;
