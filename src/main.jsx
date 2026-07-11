import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme as antdTheme } from "antd";
import "./index.css";

import { lazyWithRetry } from "./lib/lazyWithRetry";
import ErrorBoundary from "./components/ErrorBoundary";

// Contexto de autenticación (necesario de inmediato → import estático)
import { AuthProvider } from "./AuthContext";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Registra los interceptores globales de axios (manejo de sesión expirada → 401).
// Importado por su efecto secundario: al evaluarse el módulo se enganchan los
// interceptores en axios global y en la instancia backApi.
import "./services/backApi";

// =========================================================
// Componentes cargados de forma diferida (code-splitting).
// Cada ruta descarga solo su propio chunk en vez de un único
// bundle gigante, evitando pantallas en blanco por descargas pesadas.
// =========================================================
const Root = lazyWithRetry(() => import("./components/root"));
const Login = lazyWithRetry(() => import("./components/auth/Login"));
const ErrorPage = lazyWithRetry(() => import("./error-page"));
const Home = lazyWithRetry(() => import("./components/home"));
const Students = lazyWithRetry(() => import("./components/Students/student"));
const Facturas = lazyWithRetry(() => import("./components/facturas/facturas"));
const Programs = lazyWithRetry(() => import("./components/programas/programas"));
const StudentRegistrationForm = lazyWithRetry(() => import("./components/PublicForms/formAdriana"));
const StudentRegistrationForm1 = lazyWithRetry(() => import("./components/PublicForms/formCamilo"));
const StudentRegistrationFormBlanca = lazyWithRetry(() => import("./components/PublicForms/formBlanca"));
const StudentRegistrationFormMauricio = lazyWithRetry(() => import("./components/PublicForms/formMauricio"));
const StudentRegistrationFormMarily = lazyWithRetry(() => import("./components/PublicForms/formMarily"));
const StudentRegistrationFormJesus = lazyWithRetry(() => import("./components/PublicForms/formJesus"));
const Certificados = lazyWithRetry(() => import("./components/Certificados/Certificados"));
const StudentInformacion = lazyWithRetry(() => import("./components/Students/StudentInformacion"));
const Calificaciones = lazyWithRetry(() => import("./components/Calificaciones/Calificaciones"));
const CalificacionesPrograma = lazyWithRetry(() => import("./components/Calificaciones/CalificacionesPrograma"));
const StudentReportPortal = lazyWithRetry(() => import("./components/PublicForms/StudentReportPortal"));
const JoinProgramaPage = lazyWithRetry(() => import("./components/PublicForms/JoinProgramaPage"));
const Sales = lazyWithRetry(() => import("./sales/Sales"));
const Generacion = lazyWithRetry(() => import("./components/Certificados/Generacion"));
const DashboardClients = lazyWithRetry(() => import("./components/admin/DashboardClients"));
const UsersDashboard = lazyWithRetry(() => import("./components/admin/UsersDashboard"));
const Inventario = lazyWithRetry(() => import("./components/inventario/Inventario"));
const PersonasDashboard = lazyWithRetry(() => import("./components/personas/PersonasDashboard"));
const CrmDashboard = lazyWithRetry(() => import("./components/crm/CrmDashboard"));
const Verificacion = lazyWithRetry(() => import("./components/Calificaciones/Verificacion"));
const Docentes = lazyWithRetry(() => import("./GestionAcademica/Docentes/Docentes"));
const ConsultaPreRegistro = lazyWithRetry(() => import("./components/Calificaciones/ConsultaPreRegistro"));
const StudentAlianza = lazyWithRetry(() => import("./components/PublicForms/formAlianza"));

// ✅ Evaluaciones (ADMIN + ESTUDIANTE)
const AdminEvaluationPage = lazyWithRetry(() => import("./components/Evaluations/Admin/AdminEvaluationsPage"));
const EvaluationBuilder = lazyWithRetry(() => import("./components/Evaluations/Admin/EvaluationBuilder"));
const TakeEvaluationPage = lazyWithRetry(() => import("./components/Evaluations/Student/TakeEvaluationPage"));
const MyStudentEvaluationsPage = lazyWithRetry(() => import("./components/Evaluations/MyStudentEvaluationsPage"));
const RegistroExpress = lazyWithRetry(() => import("./components/PublicForms/RegistroExpress"));
const PedidosDashboard = lazyWithRetry(() => import("./components/pedidos/PedidosDashboard"));
const DocumentosVentaDashboard = lazyWithRetry(() => import("./components/documentosVenta/DocumentosVentaDashboard"));
const CuentasPorPagarDashboard = lazyWithRetry(() => import("./components/cuentasPorPagar/CuentasPorPagarDashboard"));
const StudentClaseDetalle = lazyWithRetry(() => import("./components/Clases/StudentClaseDetalle"));
const ProgramaDetalle = lazyWithRetry(() => import("./components/programas/ProgramaDetalle"));
const MateriaDetalle = lazyWithRetry(() => import("./components/materias/MateriaDetalle"));
const CursoCompletadoPage = lazyWithRetry(() => import("./components/materias/CursoCompletadoPage"));

const Register = lazyWithRetry(() => import("./components/auth/register"));
const Configuracion = lazyWithRetry(() => import("./components/Configuracion/Configuracion"));
const PreciosPage = lazyWithRetry(() => import("./components/auth/Precios"));
const Pago = lazyWithRetry(() => import("./components/auth/Pago"));
const PagoResultado = lazyWithRetry(() => import("./components/auth/PagoResultado"));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Color primario de marca, compartido con el tema de AntD.
const PRIMARY_COLOR = "#1d4ed8";

// Proveedor de tema global de Ant Design. Cambia entre algoritmo claro y
// oscuro según ThemeContext, de modo que TODAS las pantallas (incluidas las
// públicas como Login) hereden el modo oscuro automáticamente.
const ThemedConfigProvider = ({ children }) => {
  const { isDark } = useTheme();
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: PRIMARY_COLOR,
          // Paleta oscura cálida estilo Claude (sobreescribe los grises azulados
          // que genera darkAlgorithm por defecto).
          ...(isDark
            ? {
                colorBgBase: '#262624',
                colorTextBase: '#faf9f5',
                colorBgContainer: '#30302e',
                colorBgElevated: '#363633',
                colorBgLayout: '#262624',
                colorBorder: '#403e3a',
                colorBorderSecondary: '#35332f',
              }
            : {}),
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

// Spinner ligero (sin dependencias) mostrado mientras carga cada chunk.
// Usa la variable de tema --qc-bg para respetar el modo oscuro.
const PageLoader = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--qc-bg, #f9fafb)",
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        border: "4px solid #e5e7eb",
        borderTopColor: "#1d4ed8",
        borderRadius: "50%",
        animation: "qc-spin 0.8s linear infinite",
      }}
    />
    <style>{`@keyframes qc-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Crear una sola instancia de root
const rootElement = document.getElementById("root");
if (!rootElement._root) {
  rootElement._root = ReactDOM.createRoot(rootElement);
}

const App = () => (
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <ThemeProvider>
            <ThemedConfigProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verificacion" element={<Verificacion />} />
                <Route path="/consulta" element={<ConsultaPreRegistro />} />
                <Route path="/Reporte" element={<StudentReportPortal />} />
                <Route path="/join/:token" element={<JoinProgramaPage />} />
                <Route path="/unirse/:token" element={<JoinProgramaPage />} />
                <Route path="/certitec" element={<StudentRegistrationForm1 />} />
                <Route path="/alianzacapacitarte" element={<StudentAlianza />} />
                <Route path="/Adrianabenitez" element={<StudentRegistrationForm />} />
                <Route path="/Blancasanchez" element={<StudentRegistrationFormBlanca />} />
                <Route path="/registro" element={<RegistroExpress />} />
                <Route path="/Mauriciopulido" element={<StudentRegistrationFormMauricio />} />
                <Route path="/Jesusbenitez" element={<StudentRegistrationFormJesus />} />
                <Route path="/incase" element={<StudentRegistrationFormMarily />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/register" element={<Register />} />
                <Route path="/precios" element={<PreciosPage />} />
                <Route path="/pago" element={<Pago />} />
                <Route path="/pago/resultado" element={<PagoResultado />} />

                {/* 🔹 Portal estudiante: módulos */}
                {/* Reemplazado por Mis Programas → Materias dentro de /Reporte */}
                <Route path="/portal/modulos" element={<Navigate to="/Reporte" replace />} />
                <Route path="/portal/clases/:claseId" element={<StudentClaseDetalle />} />
                <Route path="/portal/materias/:materiaId/completado" element={<CursoCompletadoPage />} />

                {/* 🔹 Portal estudiante: evaluaciones */}
                <Route path="/evaluaciones/mias" element={<MyStudentEvaluationsPage />} />
                <Route path="/evaluaciones/asignacion/:assignmentId" element={<TakeEvaluationPage />} />

                {/* Rutas principales (área interna, con layout Root) */}
                <Route path="/inicio" element={<Root />}>
                  <Route index element={<Home />} />
                  <Route path="dashboard" element={<Home />} />
                  <Route path="students" element={<Students />} />
                  <Route path="programas" element={<Programs />} />
                  <Route path="programas/:id" element={<ProgramaDetalle />} />
                  <Route path="programas/:id/materias/:materiaId" element={<MateriaDetalle />} />
                  <Route path="docentes" element={<Docentes />} />

                  {/* 🔹 Admin evaluaciones */}
                  <Route path="evaluaciones" element={<AdminEvaluationPage />} />
                  <Route path="evaluaciones/:evaluationId/builder" element={<EvaluationBuilder />} />

                  <Route path="adminclients" element={<DashboardClients />} />
                  <Route path="usuarios-negocio" element={<UsersDashboard />} />
                  <Route path="calificaciones" element={<Calificaciones />} />
                  <Route path="calificaciones/:programaId" element={<CalificacionesPrograma />} />
                  <Route path="certificados" element={<Certificados />} />
                  <Route path="generacion" element={<Generacion />} />
                  <Route path="inventario" element={<Inventario />} />
                  <Route path="personas" element={<PersonasDashboard />} />
                  <Route path="crm" element={<CrmDashboard />} />
                  <Route path="pedidos" element={<PedidosDashboard />} />
                  <Route path="documentos-venta" element={<DocumentosVentaDashboard />} />
                  <Route path="cuentas-por-pagar" element={<CuentasPorPagarDashboard />} />
                  <Route path="students/facturas/:id" element={<Facturas />} />
                  <Route path="students/view/:id" element={<StudentInformacion />} />
                  <Route path="configuracion" element={<Configuracion />} />
                </Route>

                {/* Ruta de error */}
                <Route path="*" element={<ErrorPage />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </ThemedConfigProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

rootElement._root.render(<App />);
