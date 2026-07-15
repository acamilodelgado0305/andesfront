import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Button,
  notification,
  Spin,
  Select,
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  SwapOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

import { getStudentMaterias } from "../../services/foro/serviceForo";
import {
  loginStudent,
  selectInstitution,
  switchInstitution,
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

  // Multi-institución: cuando el documento está en varias instituciones, el login
  // devuelve la lista y mostramos un selector antes de entrar al campus.
  const [institucionesPicker, setInstitucionesPicker] = useState(null); // array | null
  const [pickerDoc, setPickerDoc] = useState("");
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

      // studentId de la institución ELEGIDA (viene del login/select/switch o del
      // perfil). Escopamos las notas a esa institución para no mezclar datos de
      // otra institución con el mismo documento.
      const chosenId = authStudentData?.id || null;

      const data = await getStudentGradesAndInfoByDocument(doc, chosenId);
      const { student, grades, gradesByCierre: gbc, studentId } = data;

      const extraCertData = await loadCertificateData(doc);

      const finalStudentInfo = {
        ...authStudentData,
        ...student,
        // No dejamos que las notas pisen la identidad de la institución elegida.
        ...extraCertData,
        instituciones: authStudentData?.instituciones || undefined,
        business_id: authStudentData?.business_id,
        business_name: authStudentData?.business_name,
      };

      setStudentInfo(finalStudentInfo);
      setGradesInfo(grades || []);
      setGradesByCierre(gbc || []);
      setCurrentStudentId(chosenId || studentId);
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
      const data = await loginStudent(doc, pass);

      // El documento está en varias instituciones → mostrar el selector de campus.
      if (data.multi) {
        setPickerDoc(data.documento || doc);
        setInstitucionesPicker(data.instituciones || []);
        return;
      }

      const student = data.student;
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

  // ===== SELECCIONAR INSTITUCIÓN (login multi-institución) =====
  const handleSelectInstitution = async (inst) => {
    setLoading(true);
    setError(null);
    try {
      const { student } = await selectInstitution(pickerDoc, inst.studentId);
      await loadStudentAcademicData(student.documento || pickerDoc, student);
      setInstitucionesPicker(null);
      setPickerDoc("");
      setIsLoggedIn(true);
      setActiveSection("programas");
      notification.success({ message: `Bienvenido, ${student.nombre} · ${student.business_name}` });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo entrar a la institución seleccionada.");
    } finally {
      setLoading(false);
    }
  };

  // ===== CAMBIAR DE INSTITUCIÓN (ya dentro del campus) =====
  const handleSwitchInstitution = async (studentId) => {
    if (!studentId || String(studentId) === String(currentStudentId)) return;
    setLoading(true);
    try {
      const { student } = await switchInstitution(studentId);
      // Reiniciar la navegación de programas/materias del campus anterior.
      setProgramaId(null);
      setMateriaId(null);
      setMaterias([]);
      await loadStudentAcademicData(student.documento, student);
      setActiveSection("programas");
      notification.success({ message: `Ahora estás en ${student.business_name}` });
    } catch (err) {
      console.error(err);
      notification.error({ message: err.response?.data?.error || "No se pudo cambiar de institución." });
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsernameDoc("");
    setPasswordDoc("");
    setInstitucionesPicker(null);
    setPickerDoc("");
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
        institucionesPicker ? (
          /* ===== SELECTOR DE INSTITUCIÓN (documento en varias instituciones) ===== */
          <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#262624] px-4 py-10">
            <div className="w-full max-w-md">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#fbeaec" }}>
                  <BankOutlined className="text-2xl" style={{ color: "#7a1f2b" }} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-[#faf9f5]">Elige tu institución</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-[#a8a59e]">
                  Tu documento está registrado en varias instituciones. Selecciona a qué campus quieres entrar.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {institucionesPicker.map((inst) => (
                  <button
                    key={inst.studentId}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSelectInstitution(inst)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#7a1f2b] hover:shadow-md disabled:opacity-60 dark:border-[#403e3a] dark:bg-[#30302e] dark:hover:border-[#9b2b39]"
                  >
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "linear-gradient(135deg,#7a1f2b,#9b2b39)" }}>
                      <BankOutlined className="text-lg" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-800 dark:text-[#faf9f5]">{inst.business_name}</span>
                      <span className="block text-xs text-slate-400 dark:text-[#a8a59e]">Entrar a este campus</span>
                    </span>
                    <ArrowRightOutlined className="text-slate-300 transition group-hover:text-[#7a1f2b] dark:text-[#6b6862]" />
                  </button>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setInstitucionesPicker(null); setPickerDoc(""); setError(null); }}
                  className="text-sm text-slate-500 hover:text-[#7a1f2b] dark:text-[#a8a59e]"
                >
                  ← Volver
                </button>
              </div>
            </div>
            {loading && (
              <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-black/10">
                <Spin size="large" />
              </div>
            )}
          </div>
        ) : (
          <StudentLoginForm
            usernameDoc={usernameDoc}
            passwordDoc={passwordDoc}
            loading={loading}
            error={error}
            onChangeUsername={setUsernameDoc}
            onChangePassword={setPasswordDoc}
            onSubmit={handleLogin}
          />
        )
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
                <p className="m-0 text-xs text-gray-500 dark:text-[#a8a59e] flex items-center gap-1 truncate">
                  <BankOutlined className="flex-shrink-0" />
                  <span className="truncate">{studentInfo?.business_name || "Institución"}</span>
                  <span className="mx-1 text-gray-300 dark:text-[#4a4844]">·</span>
                  Doc: {documentNumber || studentInfo?.documento || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Selector de institución (solo si el estudiante pertenece a varias) */}
              {studentInfo?.instituciones?.length > 1 && (
                <Select
                  size="small"
                  value={currentStudentId}
                  onChange={handleSwitchInstitution}
                  loading={loading}
                  suffixIcon={<SwapOutlined />}
                  className="min-w-[150px] max-w-[240px]"
                  title="Cambiar de institución"
                  options={studentInfo.instituciones.map((i) => ({
                    value: i.studentId,
                    label: i.business_name,
                  }))}
                />
              )}
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </div>
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