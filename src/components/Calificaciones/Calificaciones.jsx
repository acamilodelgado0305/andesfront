import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Spin, Tag } from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  ReadOutlined,
  TrophyOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getStudentsByType } from '../../services/student/studentService';

const { Title, Text } = Typography;

/* ===== Inline Styles ===== */
const styles = {
  pageWrapper: {
    minHeight: '85vh',
    padding: '0',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  // Hero header
  heroSection: {
    background: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
    borderRadius: 24,
    padding: '40px 44px 36px',
    marginBottom: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecoCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.03)',
    top: -60,
    right: -30,
  },
  heroDecoCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)',
    bottom: -40,
    right: 120,
  },
  heroDecoCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(40,165,165,0.15)',
    top: 20,
    right: 200,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(40,165,165,0.15)',
    border: '1px solid rgba(40,165,165,0.25)',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#5ce0d8',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroTitle: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.8px',
    lineHeight: 1.2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    marginTop: 8,
    fontWeight: 400,
    letterSpacing: '-0.2px',
  },
  // Stats row in hero
  heroStatsRow: {
    display: 'flex',
    gap: 28,
    marginTop: 28,
  },
  heroStat: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  heroStatIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.1,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  // Cards
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 24,
  },
};

function Calificaciones() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ bachillerato: null, tecnicos: null });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bachData, tecData] = await Promise.all([
          getStudentsByType('bachillerato').catch(() => []),
          getStudentsByType('tecnicos').catch(() => []),
        ]);
        setStats({
          bachillerato: Array.isArray(bachData) ? bachData.length : 0,
          tecnicos: Array.isArray(tecData) ? tecData.length : 0,
        });
      } catch {
        setStats({ bachillerato: 0, tecnicos: 0 });
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const totalStudents = (stats.bachillerato || 0) + (stats.tecnicos || 0);

  const programs = [
    {
      key: 'bachillerato',
      title: 'Validación de Bachillerato',
      subtitle: 'Programa de validación académica',
      description:
        'Gestiona notas de los estudiantes inscritos en el programa de validación de bachillerato. Registro, seguimiento y actualización de calificaciones por materia.',
      icon: <TrophyOutlined />,
      accentIcon: <TrophyOutlined />,
      gradient: 'linear-gradient(135deg, #155153 0%, #1a7a7d 50%, #28a5a5 100%)',
      shadowColor: 'rgba(21, 81, 83, 0.4)',
      chipBg: 'rgba(21, 81, 83, 0.08)',
      chipBorder: 'rgba(21, 81, 83, 0.15)',
      chipColor: '#155153',
      statValue: stats.bachillerato,
      path: '/inicio/calificaciones/bachillerato',
      tag: 'Académico',
    },
    {
      key: 'tecnicos',
      title: 'Cursos Técnicos',
      subtitle: 'Programas técnicos especializados',
      description:
        'Administra las calificaciones de los cursos técnicos ofrecidos. Controla el avance académico y registra notas por cada módulo de formación.',
      icon: <BookOutlined />,
      accentIcon: <ReadOutlined />,
      gradient: 'linear-gradient(135deg, #1a1a40 0%, #2d3a6e 50%, #4a69bd 100%)',
      shadowColor: 'rgba(26, 26, 64, 0.4)',
      chipBg: 'rgba(44, 62, 128, 0.08)',
      chipBorder: 'rgba(44, 62, 128, 0.15)',
      chipColor: '#2d3a6e',
      statValue: stats.tecnicos,
      path: '/inicio/calificaciones/cursos-tecnicos',
      tag: 'Técnico',
    },
  ];

  return (
    <div style={styles.pageWrapper}>
      {/* ===== Hero Header ===== */}
      <div style={styles.heroSection}>
        <div style={styles.heroDecoCircle1} />
        <div style={styles.heroDecoCircle2} />
        <div style={styles.heroDecoCircle3} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={styles.heroBadge}>
            <BarChartOutlined />
            Centro de Calificaciones
          </div>
          <h1 style={styles.heroTitle}>Gestión de Calificaciones</h1>
          <p style={styles.heroSubtitle}>
            Selecciona un programa para registrar, consultar y administrar calificaciones
          </p>

          {/* Quick stats */}
          <div style={styles.heroStatsRow}>
            <div style={styles.heroStat}>
              <div
                style={{
                  ...styles.heroStatIconBox,
                  background: 'rgba(40,165,165,0.15)',
                  color: '#5ce0d8',
                }}
              >
                <TeamOutlined />
              </div>
              <div>
                {loadingStats ? (
                  <Spin size="small" />
                ) : (
                  <div style={styles.heroStatValue}>{totalStudents}</div>
                )}
                <div style={styles.heroStatLabel}>Total estudiantes</div>
              </div>
            </div>

            <div style={styles.heroStat}>
              <div
                style={{
                  ...styles.heroStatIconBox,
                  background: 'rgba(92,224,216,0.1)',
                  color: '#5ce0d8',
                }}
              >
                <FileTextOutlined />
              </div>
              <div>
                <div style={styles.heroStatValue}>2</div>
                <div style={styles.heroStatLabel}>Programas activos</div>
              </div>
            </div>

            <div style={styles.heroStat}>
              <div
                style={{
                  ...styles.heroStatIconBox,
                  background: 'rgba(92,224,216,0.1)',
                  color: '#5ce0d8',
                }}
              >
                <ClockCircleOutlined />
              </div>
              <div>
                <div style={{ ...styles.heroStatValue, fontSize: 14, fontWeight: 600 }}>
                  En tiempo real
                </div>
                <div style={styles.heroStatLabel}>Sincronización</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Program Cards ===== */}
      <div style={styles.cardsGrid}>
        {programs.map((program) => (
          <ProgramCard
            key={program.key}
            program={program}
            loading={loadingStats}
            onClick={() => navigate(program.path)}
          />
        ))}
      </div>
    </div>
  );
}

/* ===== Program Card Component ===== */
function ProgramCard({ program, loading, onClick }) {
  const [hovered, setHovered] = useState(false);

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
          ? `0 24px 48px ${program.shadowColor}, 0 0 0 1px rgba(0,0,0,0.03)`
          : '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        background: '#ffffff',
      }}
    >
      {/* Top gradient banner */}
      <div
        style={{
          background: program.gradient,
          padding: '32px 32px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background pattern */}
        <div
          style={{
            position: 'absolute',
            right: -20,
            top: -20,
            fontSize: 140,
            opacity: 0.06,
            color: '#fff',
            transform: hovered ? 'rotate(-5deg) scale(1.15)' : 'rotate(-15deg) scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {program.accentIcon}
        </div>

        {/* Small decorative dots */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 10,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Tag */}
          <Tag
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.3px',
              padding: '2px 10px',
              marginBottom: 16,
            }}
          >
            {program.tag}
          </Tag>

          {/* Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              color: '#fff',
              marginBottom: 18,
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'transform 0.3s ease',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {program.icon}
          </div>

          {/* Title & subtitle */}
          <h3
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.4px',
              lineHeight: 1.2,
            }}
          >
            {program.title}
          </h3>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 400,
            }}
          >
            {program.subtitle}
          </p>
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: '24px 32px 28px' }}>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: '#6b7280',
            lineHeight: 1.7,
          }}
        >
          {program.description}
        </p>

        {/* Bottom bar: stat + action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Stat chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: program.chipBg,
              border: `1px solid ${program.chipBorder}`,
              padding: '10px 18px',
              borderRadius: 14,
            }}
          >
            <TeamOutlined style={{ fontSize: 20, color: program.chipColor }} />
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: '#9ca3af',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Estudiantes
              </div>
              {loading ? (
                <Spin size="small" />
              ) : (
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: program.chipColor,
                    lineHeight: 1.2,
                  }}
                >
                  {program.statValue ?? '—'}
                </div>
              )}
            </div>
          </div>

          {/* Arrow CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              background: hovered ? program.gradient : 'transparent',
              border: hovered ? 'none' : `1px solid ${program.chipBorder}`,
              transition: 'all 0.35s ease',
              color: hovered ? '#fff' : program.chipColor,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: hovered ? `0 6px 20px ${program.shadowColor}` : 'none',
            }}
          >
            Ingresar
            <ArrowRightOutlined
              style={{
                transition: 'transform 0.3s ease',
                transform: hovered ? 'translateX(4px)' : 'translateX(0)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calificaciones;