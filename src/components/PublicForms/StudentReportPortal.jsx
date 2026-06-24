import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Button,
  notification,
  Spin,
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  ReadOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  RightOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

import { generateGradeReportPDF } from "../Utilidades/generateGradeReportPDF";
import { getStudentAssignments } from "../../services/evaluation/evaluationService";
import {
  loginStudent,
  clearStudentToken,
  getStudentProfile,
  canRestoreSession,
  getSavedStudentData,
} from "../../services/auth/studentAuthService";
import { getStudentGradesAndInfoByDocument } from "../../services/gardes/gradesService";

import StudentLoginForm from "./StudentLoginForm";
import StudentInfoTab from "./StudentInfoTab";
import StudentEvaluationsTab from "./StudentEvaluationsTab";
import StudentGradesTab from "./StudentGradesTab";
import StudentCertificationsTab from "./StudentCertificationsTab";
import StudentHorarioTab from "./StudentHorarioTab";
import StudentPazSalvoTab from "./StudentPazSalvoTab";
import StudentModulosPage from "../Modulos/StudentModulosPage";

const { Text } = Typography;

const API_BACKEND_FINANZAS =
  import.meta.env.VITE_API_FINANZAS || "https://backendcoalianza.vercel.app/api";

function StudentPortal() {
  const [usernameDoc, setUsernameDoc] = useState("");
  const [passwordDoc, setPasswordDoc] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [error, setError] = useState(null);

  const [documentNumber, setDocumentNumber] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [gradesInfo, setGradesInfo] = useState([]);
  const [gradesByCierre, setGradesByCierre] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [tieneModulos, setTieneModulos] = useState(false);

  // Apartado actualmente abierto (null = menú principal de botones)
  const [activeSection, setActiveSection] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Prevent browser back button from exiting the portal when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isLoggedIn]);

  // ===== CERTIFICATE DATA =====
  const loadCertificateData = async (doc) => {
    try {
      const response = await fetch(`${API_BACKEND_FINANZAS}/clients/${doc}`);
      if (response.ok) {
        const certData = await response.json();
        return {
          tipo: certData.tipo,
          fechaVencimiento: certData.fechaVencimiento,
          createdAt: certData.createdAt,
          nombreCurso: certData.nombreCurso,
        };
      }
      return {};
    } catch (err) {
      console.warn("No se pudo cargar info de certificados externos:", err);
      return {};
    }
  };

  // ===== LOAD ACADEMIC DATA =====
  const loadStudentAcademicData = useCallback(
    async (doc, authStudentData) => {
      if (!doc.trim()) throw new Error("Documento inválido.");

      const data = await getStudentGradesAndInfoByDocument(doc);
      const { student, grades, gradesByCierre: gbc, studentId } = data;

      if (!student || !studentId) throw new Error("Datos académicos no encontrados.");

      let assignedEvaluations = [];
      try {
        const evData = await getStudentAssignments(studentId);
        assignedEvaluations =
          evData.asignaciones || (Array.isArray(evData) ? evData : []);
      } catch (e) {
        console.warn("Error cargando evaluaciones", e);
      }

      // Verificar si el estudiante tiene módulos asignados
      try {
        const token = localStorage.getItem('student_portal_token') || localStorage.getItem('authToken');
        const API = import.meta.env.VITE_API_BACKEND;
        const modRes = await fetch(
          `${API}/api/modulos/estudiante/${studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const modData = await modRes.json();
        setTieneModulos((modData.modulos || []).length > 0);
      } catch {
        setTieneModulos(false);
      }

      const extraCertData = await loadCertificateData(doc);

      const finalStudentInfo = {
        ...authStudentData,
        ...student,
        ...extraCertData,
      };

      setStudentInfo(finalStudentInfo);
      setGradesInfo(grades || []);
      setGradesByCierre(gbc || []);
      setEvaluations(assignedEvaluations);
      setCurrentStudentId(studentId);
      setDocumentNumber(doc);
    },
    []
  );

  // ===== SESSION RESTORE =====
  useEffect(() => {
    const restoreSession = async () => {
      if (!canRestoreSession()) {
        setRestoringSession(false);
        return;
      }

      try {
        // Instantly show cached data while we validate
        const cached = getSavedStudentData();
        if (cached) {
          setStudentInfo(cached);
          setIsLoggedIn(true);
          setDocumentNumber(cached.documento || "");
        }

        // Validate token & get fresh profile
        const profile = await getStudentProfile();
        const doc = profile.documento || cached?.documento || "";

        // Load full academic data in background
        try {
          await loadStudentAcademicData(doc, profile);
        } catch (e) {
          console.warn("Could not load academic data on restore:", e);
          // Still keep logged in with basic profile
          setStudentInfo(profile);
        }

        setIsLoggedIn(true);
      } catch (err) {
        console.warn("Session restore failed:", err);
        // Only clear token on auth errors (401/403), not on network/server errors
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          clearStudentToken();
          setIsLoggedIn(false);
          setStudentInfo(null);
        } else if (cached) {
          // Network/server error but we have cached data — stay logged in
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          setStudentInfo(null);
        }
      } finally {
        setRestoringSession(false);
      }
    };

    restoreSession();
  }, [loadStudentAcademicData]);

  // ===== If coming back from evaluation, refresh data =====
  useEffect(() => {
    // Si volvemos con un apartado indicado (p. ej. desde una evaluación), abrirlo
    if (location.state?.activeTab) {
      setActiveSection(location.state.activeTab);
    }
    if (
      location.state?.fromEvaluation &&
      isLoggedIn &&
      currentStudentId
    ) {
      const refreshEvaluations = async () => {
        try {
          const evData = await getStudentAssignments(currentStudentId);
          setEvaluations(
            evData.asignaciones || (Array.isArray(evData) ? evData : [])
          );
        } catch (e) {
          console.warn("Error refreshing evaluations:", e);
        }
      };
      refreshEvaluations();
    }
  }, [location.state, isLoggedIn, currentStudentId]);

  // ===== LOGIN =====
  const handleLogin = async () => {
    setError(null);
    const doc = usernameDoc.trim();
    const pass = passwordDoc.trim();

    if (!doc || !pass) {
      setError("Complete ambos campos.");
      return;
    }
    if (doc !== pass) {
      setError("El usuario y contraseña deben ser iguales.");
      return;
    }

    setLoading(true);
    try {
      const { student } = await loginStudent(doc, pass);
      await loadStudentAcademicData(student.documento || doc, student);
      setIsLoggedIn(true);
      notification.success({ message: `Bienvenido, ${student.nombre}` });
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || err.message || "Error al iniciar sesión.";
      setError(msg);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsernameDoc("");
    setPasswordDoc("");
    setStudentInfo(null);
    setGradesInfo([]);
    setEvaluations([]);
    setTieneModulos(false);
    setActiveSection(null);
    clearStudentToken();
  };

  const handleDownloadReport = async () => {
    if (!studentInfo || !currentStudentId) return;
    setLoading(true);
    try {
      await generateGradeReportPDF(studentInfo, gradesInfo, currentStudentId);
    } catch (e) {
      notification.error({ message: "Error generando reporte de notas" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = (evaluation) => {
    const assignId = evaluation.asignacion_id || evaluation.asignacionId || evaluation.id;
    if (assignId) {
      navigate(`/evaluaciones/asignacion/${assignId}`);
    }
  };

  // ===== Computed stats =====
  const pendingEvals = evaluations.filter(
    (e) => (e.estado || "pendiente") === "pendiente"
  ).length;
  const completedEvals = evaluations.filter(
    (e) => e.estado === "resuelta"
  ).length;
  const programCount = studentInfo?.programas_asociados?.length || 0;

  // ===== Apartados del dashboard (botones del menú) =====
  const sections = [
    {
      key: "info",
      label: "Mi Información",
      description: "Datos personales y de contacto",
      icon: <UserOutlined />,
      gradient: "linear-gradient(135deg, #6366f1, #818cf8)",
    },
    {
      key: "horario",
      label: "Horario",
      description: "Tus clases y horarios asignados",
      icon: <CalendarOutlined />,
      gradient: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
    },
    {
      key: "evaluaciones",
      label: "Evaluaciones",
      description: "Pruebas y exámenes asignados",
      icon: <ReadOutlined />,
      gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
      badge: pendingEvals,
    },
    {
      key: "notas",
      label: "Notas",
      description: "Calificaciones por materia",
      icon: <FileTextOutlined />,
      gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    },
    {
      key: "certificados",
      label: "Certificados",
      description: "Certificaciones y vencimientos",
      icon: <SafetyCertificateOutlined />,
      gradient: "linear-gradient(135deg, #10b981, #34d399)",
    },
    {
      key: "pazsalvo",
      label: "Paz y Salvo",
      description: "Estado académico y financiero",
      icon: <SafetyOutlined />,
      gradient: "linear-gradient(135deg, #14b8a6, #2dd4bf)",
    },
    ...(tieneModulos
      ? [
          {
            key: "modulos",
            label: "Módulos",
            description: "Contenido y material del curso",
            icon: <AppstoreOutlined />,
            gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
          },
        ]
      : []),
  ];

  const activeMeta = sections.find((s) => s.key === activeSection);

  // ===== Render del contenido del apartado seleccionado =====
  const renderSectionContent = (key) => {
    switch (key) {
      case "info":
        return (
          <StudentInfoTab
            studentInfo={studentInfo}
            documentNumber={documentNumber}
            currentStudentId={currentStudentId}
          />
        );
      case "horario":
        return <StudentHorarioTab currentStudentId={currentStudentId} />;
      case "evaluaciones":
        return (
          <StudentEvaluationsTab
            evaluations={evaluations}
            onStartEvaluation={handleStartEvaluation}
          />
        );
      case "notas":
        return (
          <StudentGradesTab
            gradesInfo={gradesInfo}
            gradesByCierre={gradesByCierre}
            studentInfo={studentInfo}
            currentStudentId={currentStudentId}
            loading={loading}
            onDownloadReport={handleDownloadReport}
          />
        );
      case "certificados":
        return <StudentCertificationsTab studentInfo={studentInfo} />;
      case "pazsalvo":
        return <StudentPazSalvoTab studentInfo={studentInfo} />;
      case "modulos":
        return <StudentModulosPage />;
      default:
        return null;
    }
  };

  // ===== LOADING STATE =====
  if (restoringSession) {
    return (
      <div style={styles.restoring}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>
          Restaurando sesión...
        </p>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div style={styles.page}>
      <style>{menuCss}</style>
      {!isLoggedIn ? (
        <StudentLoginForm
          usernameDoc={usernameDoc}
          passwordDoc={passwordDoc}
          loading={loading}
          error={error}
          onChangeUsername={setUsernameDoc}
          onChangePassword={setPasswordDoc}
          onSubmit={handleLogin}
        />
      ) : (
        <div style={styles.portalContainer}>
          {/* ===== HEADER ===== */}
          <div style={styles.header}>
            <div style={styles.headerDecoCircle1} />
            <div style={styles.headerDecoCircle2} />
            <div style={styles.headerInner}>
              <div style={styles.headerTop}>
                <div style={styles.headerLeft}>
                  <div style={styles.avatar}>
                    {(studentInfo?.nombre || "E").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={styles.headerName}>
                      {studentInfo?.nombre_completo ||
                        `${studentInfo?.nombre || ""} ${studentInfo?.apellido || ""}`.trim() ||
                        "Estudiante"}
                    </h2>
                    <p style={styles.headerDoc}>
                      Doc: {documentNumber || studentInfo?.documento || "—"}
                    </p>
                  </div>
                </div>
                <Button
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  style={styles.logoutBtn}
                  type="text"
                >
                  Cerrar sesión
                </Button>
              </div>

              {/* Stats */}
              <div style={styles.statsRow}>
                <StatBadge
                  icon={<BookOutlined />}
                  value={programCount}
                  label="Programas"
                  color="#818cf8"
                />
                <StatBadge
                  icon={<ClockCircleOutlined />}
                  value={pendingEvals}
                  label="Pendientes"
                  color="#fb923c"
                />
                <StatBadge
                  icon={<CheckCircleOutlined />}
                  value={completedEvals}
                  label="Completadas"
                  color="#4ade80"
                />
                <StatBadge
                  icon={<FileTextOutlined />}
                  value={gradesInfo.length}
                  label="Materias"
                  color="#60a5fa"
                />
              </div>
            </div>
          </div>

          {/* ===== CONTENIDO ===== */}
          {!activeSection ? (
            /* --- Menú de botones con iconos --- */
            <div>
              <h3 style={styles.menuHeading}>¿Qué deseas consultar?</h3>
              <p style={styles.menuSub}>
                Selecciona una opción para ver tu información
              </p>
              <div style={styles.menuGrid}>
                {sections.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="qc-menu-card"
                    style={styles.menuCard}
                    onClick={() => setActiveSection(s.key)}
                  >
                    <div style={{ ...styles.menuIcon, background: s.gradient }}>
                      {s.icon}
                      {s.badge > 0 && (
                        <span style={styles.menuIconBadge}>{s.badge}</span>
                      )}
                    </div>
                    <div style={styles.menuCardText}>
                      <div style={styles.menuCardTitle}>{s.label}</div>
                      <div style={styles.menuCardDesc}>{s.description}</div>
                    </div>
                    <RightOutlined className="qc-arrow" style={styles.menuCardArrow} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* --- Vista del apartado seleccionado --- */
            <div style={styles.content}>
              <div style={styles.sectionBar}>
                <button
                  type="button"
                  className="qc-back-btn"
                  style={styles.backBtn}
                  onClick={() => setActiveSection(null)}
                >
                  <ArrowLeftOutlined /> Volver al menú
                </button>
                <div style={styles.sectionTitle}>
                  {activeMeta?.icon} {activeMeta?.label}
                </div>
              </div>
              <div style={styles.tabContent}>
                {renderSectionContent(activeSection)}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={styles.footer}>Rapictrl © 2025</div>
        </div>
      )}
    </div>
  );
}

/* ===== STAT BADGE ===== */
function StatBadge({ icon, value, label, color }) {
  return (
    <div style={statStyles.wrapper}>
      <span style={{ ...statStyles.icon, color }}>{icon}</span>
      <div>
        <div style={statStyles.value}>{value}</div>
        <div style={statStyles.label}>{label}</div>
      </div>
    </div>
  );
}

const statStyles = {
  wrapper: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 110,
  },
  icon: { fontSize: 17 },
  value: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1.1,
  },
  label: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
};

/* ===== CSS para hover (no se puede con estilos inline) ===== */
const menuCss = `
  .qc-menu-card {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .qc-menu-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.10);
    border-color: #d4d4ff;
  }
  .qc-menu-card:hover .qc-arrow {
    transform: translateX(3px);
    opacity: 1;
  }
  .qc-back-btn {
    transition: background 0.15s ease, color 0.15s ease;
  }
  .qc-back-btn:hover {
    background: #eef2ff;
    color: #4f46e5;
  }
`;

/* ===== STYLES ===== */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6f8",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  restoring: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f6f8",
  },
  portalContainer: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 16px 40px",
  },

  /* Header */
  header: {
    background:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
    borderRadius: "0 0 24px 24px",
    padding: "28px 32px 24px",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  headerDecoCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.03)",
    top: -60,
    right: -30,
  },
  headerDecoCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: "rgba(99,102,241,0.08)",
    bottom: -30,
    right: 160,
  },
  headerInner: { position: "relative", zIndex: 1 },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.15)",
  },
  headerName: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.4px",
  },
  headerDoc: {
    margin: "2px 0 0",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  logoutBtn: {
    color: "rgba(255,255,255,0.6)",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 500,
    fontSize: 13,
  },
  statsRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  /* Menú de botones */
  menuHeading: {
    margin: "0 0 2px",
    fontSize: 19,
    fontWeight: 800,
    color: "#1f2937",
    letterSpacing: "-0.4px",
  },
  menuSub: {
    margin: "0 0 18px",
    fontSize: 13.5,
    color: "#9ca3af",
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  menuCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    textAlign: "left",
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: 16,
    padding: "18px 18px",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    width: "100%",
    fontFamily: "inherit",
  },
  menuIcon: {
    position: "relative",
    flexShrink: 0,
    width: 50,
    height: 50,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    color: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
  },
  menuIconBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    padding: "0 5px",
    borderRadius: 99,
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  menuCardText: {
    flex: 1,
    minWidth: 0,
  },
  menuCardTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    color: "#1f2937",
    lineHeight: 1.2,
  },
  menuCardDesc: {
    fontSize: 12.5,
    color: "#9ca3af",
    marginTop: 3,
    lineHeight: 1.35,
  },
  menuCardArrow: {
    color: "#c4c4d4",
    fontSize: 13,
    opacity: 0.7,
    transition: "transform 0.18s ease, opacity 0.18s ease",
  },

  /* Barra del apartado seleccionado */
  sectionBar: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid #f0f0f0",
    flexWrap: "wrap",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#f5f6f8",
    border: "1px solid #ececf3",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5563",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  sectionTitle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 700,
    color: "#1f2937",
  },

  /* Content */
  content: {
    background: "#fff",
    borderRadius: 20,
    padding: "24px 28px 32px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0",
  },
  tabContent: {
    paddingTop: 8,
  },

  /* Footer */
  footer: {
    textAlign: "center",
    marginTop: 32,
    color: "#9ca3af",
    fontSize: 12,
  },
};

export default StudentPortal;