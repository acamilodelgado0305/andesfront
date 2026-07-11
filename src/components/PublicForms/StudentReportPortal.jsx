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
  SafetyCertificateOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

import { getStudentMaterias } from "../../services/foro/serviceForo";
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
import StudentCertificationsTab from "./StudentCertificationsTab";
import StudentProgramasSection from "./StudentProgramasSection";

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
  const [currentStudentId, setCurrentStudentId] = useState(null);

  // Apartado actualmente abierto en el sidebar (por defecto "Mis Programas")
  const [activeSection, setActiveSection] = useState("programas");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Navegación de "Mis Programas" (programa seleccionado → materias → materia)
  const [programaId, setProgramaId] = useState(null);
  const [materiaId, setMateriaId] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [loadingMaterias, setLoadingMaterias] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Carga las materias del estudiante (para el sub-listado por programa) una vez
  // que sabemos quién es.
  useEffect(() => {
    if (!currentStudentId) return;
    setLoadingMaterias(true);
    getStudentMaterias(currentStudentId)
      .then((data) => setMaterias(data.materias || []))
      .catch(() => setMaterias([]))
      .finally(() => setLoadingMaterias(false));
  }, [currentStudentId]);

  // Selecciona el primer programa por defecto cuando llegan los datos del estudiante.
  useEffect(() => {
    if (!programaId && studentInfo?.programas_asociados?.length) {
      setProgramaId(studentInfo.programas_asociados[0].programa_id);
    }
  }, [studentInfo, programaId]);

  const programaSel = studentInfo?.programas_asociados?.find(
    (p) => String(p.programa_id) === String(programaId)
  ) || null;
  const materiasDelPrograma = programaId
    ? materias.filter((m) => String(m.programa_id) === String(programaId))
    : [];
  const materiaSel = materiasDelPrograma.find((m) => String(m.id) === String(materiaId)) || null;

  const selectPrograma = (id) => {
    setActiveSection("programas");
    setProgramaId(id);
    setMateriaId(null);
  };

  // Vista inmersiva: cuando el estudiante entra a una clase, ocultamos el sidebar
  // para darle todo el ancho al contenido; al salir de la clase se restaura.
  const handleImmersive = useCallback((on) => setSidebarOpen(!on), []);

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

      const extraCertData = await loadCertificateData(doc);

      const finalStudentInfo = {
        ...authStudentData,
        ...student,
        ...extraCertData,
      };

      setStudentInfo(finalStudentInfo);
      setGradesInfo(grades || []);
      setGradesByCierre(gbc || []);
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
        setActiveSection((prev) => prev ?? "programas");
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

  // ===== If coming back from evaluation, reopen the indicated tab =====
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveSection(location.state.activeTab);
    }
  }, [location.state]);

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
      setActiveSection("programas");
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
    setActiveSection("programas");
    setProgramaId(null);
    setMateriaId(null);
    setMaterias([]);
    clearStudentToken();
  };

  // ===== Apartados generales del sidebar (no incluye "Mis Programas", que se
  // arma aparte con la lista real de programas del estudiante) =====
  const sections = [
    {
      key: "info",
      label: "Mi Información",
      description: "Datos personales y de contacto",
      icon: <UserOutlined />,
      gradient: "linear-gradient(135deg, #6366f1, #818cf8)",
    },
    {
      key: "certificados",
      label: "Certificados",
      description: "Certificaciones y vencimientos",
      icon: <SafetyCertificateOutlined />,
      gradient: "linear-gradient(135deg, #10b981, #34d399)",
    },
  ];

  // ===== Render del contenido del apartado seleccionado =====
  const renderSectionContent = (key) => {
    switch (key) {
      case "programas":
        return (
          <StudentProgramasSection
            programaSel={programaSel}
            materiaSel={materiaSel}
            materiasDelPrograma={materiasDelPrograma}
            loadingMaterias={loadingMaterias}
            onSelectMateria={setMateriaId}
            onImmersiveChange={handleImmersive}
          />
        );
      case "info":
        return (
          <StudentInfoTab
            studentInfo={studentInfo}
            documentNumber={documentNumber}
            currentStudentId={currentStudentId}
          />
        );
      case "certificados":
        return (
          <StudentCertificationsTab
            studentInfo={studentInfo}
            documento={documentNumber || studentInfo?.documento}
          />
        );
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
          {/* ===== HEADER (fijo al hacer scroll) ===== */}
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 py-4 mb-4 border-b border-gray-200 dark:border-[#403e3a] bg-[#f5f6f8] dark:bg-[#262624]">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                type="text"
                icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                onClick={() => setSidebarOpen((v) => !v)}
                title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
                className="dark:text-[#a8a59e]"
              />
              <div className="w-9 h-9 rounded-full bg-[#155153] text-white flex items-center justify-center font-bold flex-shrink-0">
                {(studentInfo?.nombre || "E").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="m-0 text-base font-semibold text-gray-800 dark:text-[#faf9f5] truncate">
                  {studentInfo?.nombre_completo ||
                    `${studentInfo?.nombre || ""} ${studentInfo?.apellido || ""}`.trim() ||
                    "Estudiante"}
                </h2>
                <p className="m-0 text-xs text-gray-500 dark:text-[#a8a59e]">
                  Doc: {documentNumber || studentInfo?.documento || "—"}
                </p>
              </div>
            </div>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>

          {/* ===== SIDEBAR + CONTENIDO ===== */}
          <div className="flex flex-col md:flex-row gap-3 items-start">
            {/* Sidebar 20% (colapsable) */}
            <div className={sidebarOpen ? "w-full md:w-[22%] md:flex-shrink-0" : "hidden"}>
              <div className="flex flex-col gap-1 mb-4">
                {sections.map((s) => {
                  const isActive = activeSection === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setActiveSection(s.key)}
                      className={`flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-[#155153] text-white font-semibold'
                          : 'text-gray-600 dark:text-[#a8a59e] hover:bg-gray-100 dark:hover:bg-[#3a3a38]'
                      }`}
                    >
                      <span className="flex items-center gap-2">{s.icon} {s.label}</span>
                      {s.badge > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {s.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1 mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e] px-3 mb-1">
                  Mis Programas
                </span>
                {(studentInfo?.programas_asociados || []).map((p) => {
                  const isActive = activeSection === 'programas' && String(programaId) === String(p.programa_id);
                  return (
                    <button
                      key={p.programa_id}
                      type="button"
                      title={p.nombre}
                      onClick={() => selectPrograma(p.programa_id)}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                        isActive
                          ? 'bg-[#155153] text-white font-semibold'
                          : 'text-gray-600 dark:text-[#a8a59e] hover:bg-gray-100 dark:hover:bg-[#3a3a38]'
                      }`}
                    >
                      {p.nombre}
                    </button>
                  );
                })}
                {!studentInfo?.programas_asociados?.length && (
                  <span className="px-3 py-1 text-xs text-gray-400 dark:text-[#a8a59e]">Sin programas aún</span>
                )}
              </div>

            </div>

            {/* Contenido 80% */}
            <div className="w-full md:flex-1 min-w-0 p-3 md:p-4 bg-white dark:bg-[#30302e] border border-gray-200 dark:border-[#403e3a] rounded-xl min-h-[60vh]">
              {renderSectionContent(activeSection)}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>Rapictrl © 2025</div>
        </div>
      )}
    </div>
  );
}

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
    width: "100%",
    margin: "0 auto",
    padding: "0 24px 40px",
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