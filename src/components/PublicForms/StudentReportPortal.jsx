import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Button,
  notification,
  Spin,
  Tabs,
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
  const [evaluations, setEvaluations] = useState([]);
  const [currentStudentId, setCurrentStudentId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

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
      const { student, grades, studentId } = data;

      if (!student || !studentId) throw new Error("Datos académicos no encontrados.");

      let assignedEvaluations = [];
      try {
        const evData = await getStudentAssignments(studentId);
        assignedEvaluations =
          evData.asignaciones || (Array.isArray(evData) ? evData : []);
      } catch (e) {
        console.warn("Error cargando evaluaciones", e);
      }

      const extraCertData = await loadCertificateData(doc);

      const finalStudentInfo = {
        ...authStudentData,
        ...student,
        ...extraCertData,
      };

      setStudentInfo(finalStudentInfo);
      setGradesInfo(grades || []);
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
        clearStudentToken();
        setIsLoggedIn(false);
        setStudentInfo(null);
      } finally {
        setRestoringSession(false);
      }
    };

    restoreSession();
  }, [loadStudentAcademicData]);

  // ===== If coming back from evaluation, refresh data =====
  useEffect(() => {
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

          {/* ===== TABS CONTENT ===== */}
          <div style={styles.content}>
            <Tabs
              defaultActiveKey={
                location.state?.activeTab || "info"
              }
              type="line"
              size="large"
              style={{ marginTop: -6 }}
              items={[
                {
                  key: "info",
                  label: (
                    <span style={styles.tabLabel}>
                      <UserOutlined /> Información
                    </span>
                  ),
                  children: (
                    <div style={styles.tabContent}>
                      <StudentInfoTab
                        studentInfo={studentInfo}
                        documentNumber={documentNumber}
                        currentStudentId={currentStudentId}
                      />
                    </div>
                  ),
                },
                {
                  key: "evaluaciones",
                  label: (
                    <span style={styles.tabLabel}>
                      <ReadOutlined /> Evaluaciones
                      {pendingEvals > 0 && (
                        <span style={styles.tabBadge}>{pendingEvals}</span>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={styles.tabContent}>
                      <StudentEvaluationsTab
                        evaluations={evaluations}
                        onStartEvaluation={handleStartEvaluation}
                      />
                    </div>
                  ),
                },
                {
                  key: "notas",
                  label: (
                    <span style={styles.tabLabel}>
                      <FileTextOutlined /> Notas
                    </span>
                  ),
                  children: (
                    <div style={styles.tabContent}>
                      <StudentGradesTab
                        gradesInfo={gradesInfo}
                        studentInfo={studentInfo}
                        currentStudentId={currentStudentId}
                        loading={loading}
                        onDownloadReport={handleDownloadReport}
                      />
                    </div>
                  ),
                },
                {
                  key: "certificados",
                  label: (
                    <span style={styles.tabLabel}>
                      <SafetyCertificateOutlined /> Certificados
                    </span>
                  ),
                  children: (
                    <div style={styles.tabContent}>
                      <StudentCertificationsTab studentInfo={studentInfo} />
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* Footer */}
          <div style={styles.footer}>Qcontrola © 2025</div>
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

  /* Content */
  content: {
    background: "#fff",
    borderRadius: 20,
    padding: "24px 28px 32px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0",
  },
  tabLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  tabBadge: {
    background: "#ef4444",
    color: "#fff",
    borderRadius: 99,
    padding: "1px 7px",
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 4,
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