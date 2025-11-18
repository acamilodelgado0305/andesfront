import React, { useState } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Tabs,
  Button,
} from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { generateGradeReportPDF } from "../Utilidades/generateGradeReportPDF";
import { getStudentAssignments } from "../../services/evaluation/evaluationService";
import {
  loginStudent,
  clearStudentToken,
} from "../../services/auth/studentAuthService";
import { getStudentGradesAndInfoByDocument } from "../../services/gardes/gradesService";

import StudentLoginForm from "./StudentLoginForm";
import StudentInfoTab from "./StudentInfoTab";
import StudentEvaluationsTab from "./StudentEvaluationsTab";
import StudentGradesTab from "./StudentGradesTab";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

function StudentPortal() {
  // --- ESTADOS DE LOGIN ---
  const [usernameDoc, setUsernameDoc] = useState("");
  const [passwordDoc, setPasswordDoc] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- ESTADOS DE DATOS ---
  const [documentNumber, setDocumentNumber] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [gradesInfo, setGradesInfo] = useState([]);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [evaluations, setEvaluations] = useState([]);

  // --- ESTADOS DE UI ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // CARGAR notas + complementar info estudiante (desde /grades/student/:doc)
  // ---------------------------------------------------------------------------
  const loadStudentAcademicData = async (doc) => {
    if (!doc.trim()) {
      throw new Error("Debe proporcionar un número de documento válido.");
    }

    try {
      setError(null);

      const data = await getStudentGradesAndInfoByDocument(doc);
      const { student, grades, studentId } = data;

      if (!student || !studentId) {
        throw new Error(
          "La respuesta de la API no contiene información válida del estudiante o el ID del estudiante."
        );
      }

      // Combinamos info del login + info académica
      setStudentInfo((prev) => ({
        ...(prev || {}),
        ...student,
      }));
      setGradesInfo(grades || []);
      setCurrentStudentId(studentId);
      setDocumentNumber(doc);

      await loadStudentEvaluations(studentId);
    } catch (err) {
      console.error(
        "Error cargando datos académicos:",
        err.response?.data || err.message
      );

      setGradesInfo([]);
      setCurrentStudentId(null);
      setEvaluations([]);

      const msg =
        err.response?.data?.error ||
        (err.response?.status === 404
          ? `No se encontró un estudiante con el número de documento: ${doc}.`
          : err.message || "Ocurrió un error al consultar los datos.");

      setError(msg);
      setIsLoggedIn(false);
      clearStudentToken();
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // CARGAR evaluaciones asignadas (service)
  // ---------------------------------------------------------------------------
const loadStudentEvaluations = async (studentId) => {
  if (!studentId) return;

  try {
    const data = await getStudentAssignments(studentId);

    const assignments = Array.isArray(data)
      ? data
      : Array.isArray(data.asignaciones)
      ? data.asignaciones
      : [];

    const mapped = assignments.map((item, index) => ({
      key:
        item.asignacion_id ||
        item.assignment_id ||
        item.id ||
        `asig-${index}`,
      asignacionId:
        item.asignacion_id || item.assignment_id || item.id,
      evaluacionId:
        item.evaluacion_id ||
        item.evaluation_id ||
        item.evaluacion?.id,
      titulo:
        item.titulo_evaluacion ||
        item.titulo ||
        item.evaluacion_titulo ||
        item.evaluacion?.titulo ||
        "Evaluación",
      descripcion:
        item.descripcion ||
        item.descripcion_evaluacion ||
        item.evaluacion?.descripcion ||
        "",
      estado:
        item.estado ||
        item.estado_asignacion ||
        item.status ||
        "pendiente",

      // 🔹 Asignación = intentos_realizados
      intentosRealizados:
        item.intentos_realizados ?? item.intentos_usados ?? 0,

      // 🔹 Evaluación = intentos_max (total de intentos permitidos)
      intentosMax: item.intentos_max ?? item.max_intentos ?? null,

      calificacion: item.calificacion ?? item.nota ?? null,
      fechaInicio:
        item.fecha_inicio || item.inicio || item.evaluacion?.fecha_inicio,
      fechaFin:
        item.fecha_fin || item.fin || item.evaluacion?.fecha_fin,
    }));

    setEvaluations(mapped);
  } catch (err) {
    console.error(
      "Error cargando evaluaciones:",
      err.response?.data || err.message
    );
    setEvaluations([]);
  }
};


  // ---------------------------------------------------------------------------
  // LOGIN (solo autenticación + estado base)
  // ---------------------------------------------------------------------------
  const handleLogin = async () => {
    setError(null);

    const doc = usernameDoc.trim();
    const pass = passwordDoc.trim();

    if (!doc || !pass) {
      setError("Por favor, complete ambos campos con su número de documento.");
      return;
    }

    if (doc !== pass) {
      setError(
        "El usuario y la contraseña deben ser el mismo número de documento."
      );
      return;
    }

    setLoading(true);
    try {
      // 1) Autenticar y guardar token
      const { student } = await loginStudent(doc, pass);

      // 2) Guardar info básica del login
      setStudentInfo(student);
      setCurrentStudentId(student.id);
      setDocumentNumber(student.documento || doc);

      // 3) Cargar info académica (notas + evaluaciones)
      await loadStudentAcademicData(student.documento || doc);

      setIsLoggedIn(true);
    } catch (err) {
      if (!error) {
        const msg =
          err.response?.data?.error ||
          err.message ||
          "No fue posible iniciar sesión.";
        setError(msg);
      }
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsernameDoc("");
    setPasswordDoc("");
    setDocumentNumber("");
    setStudentInfo(null);
    setGradesInfo([]);
    setCurrentStudentId(null);
    setEvaluations([]);
    setError(null);
    clearStudentToken();
  };

  // ---------------------------------------------------------------------------
  // DESCARGAR PDF NOTAS
  // ---------------------------------------------------------------------------
  const handleDownloadReport = async () => {
    if (!studentInfo || !currentStudentId) {
      const msg = "No hay datos de estudiante suficientes para generar el PDF.";
      setError(msg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await generateGradeReportPDF(studentInfo, gradesInfo, currentStudentId);
    } catch (pdfError) {
      console.error("Error generando PDF:", pdfError);
      const msg = pdfError.message || "Error al generar el PDF.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // IR A EVALUACIÓN
  // ---------------------------------------------------------------------------
  const handleStartEvaluation = (evaluation) => {
    if (!evaluation.asignacionId) {
      return;
    }
    navigate(`/evaluaciones/asignacion/${evaluation.asignacionId}`);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Row
      justify="center"
      align="top"
      style={{ minHeight: "90vh", padding: "20px", background: "#f0f2f5" }}
    >
      <Col xs={24} sm={22} md={20} lg={18} xl={16}>
        <Card
          bordered={false}
          style={{
            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          {/* CABECERA */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <Title level={2} style={{ color: "#003366", marginBottom: "5px" }}>
              Portal del Estudiante
            </Title>
            <Text type="secondary" style={{ fontSize: "16px" }}>
              Inicia sesión con tu número de documento para revisar tu
              información, tus evaluaciones y tus notas.
            </Text>
          </div>

          {/* LOGIN */}
          {!isLoggedIn && (
            <StudentLoginForm
              usernameDoc={usernameDoc}
              passwordDoc={passwordDoc}
              loading={loading}
              error={error}
              onChangeUsername={setUsernameDoc}
              onChangePassword={setPasswordDoc}
              onSubmit={handleLogin}
            />
          )}

          {/* CONTENIDO LOGUEADO */}
          {isLoggedIn && studentInfo && currentStudentId && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <Text strong>
                  Sesión iniciada como:{" "}
                  <span style={{ color: "#0056b3" }}>
                    {studentInfo.nombre_completo ||
                      studentInfo.nombre ||
                      "Estudiante"}
                  </span>
                </Text>
                <Button
                  icon={<LogoutOutlined />}
                  type="default"
                  size="small"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </Button>
              </div>

              <Tabs defaultActiveKey="info">
                <TabPane tab="Información" key="info">
                  <StudentInfoTab
                    studentInfo={studentInfo}
                    documentNumber={documentNumber}
                    currentStudentId={currentStudentId}
                  />
                </TabPane>

                <TabPane tab="Evaluaciones" key="evaluaciones">
                  <StudentEvaluationsTab
                    evaluations={evaluations}
                    onStartEvaluation={handleStartEvaluation}
                  />
                </TabPane>

                <TabPane tab="Notas" key="notas">
                  <StudentGradesTab
                    gradesInfo={gradesInfo}
                    currentStudentId={currentStudentId}
                    studentInfo={studentInfo}
                    loading={loading}
                    onDownloadReport={handleDownloadReport}
                  />
                </TabPane>
              </Tabs>
            </>
          )}

          {/* FOOTER AYUDA */}
          <Text
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "40px",
              fontSize: "12px",
              color: "#777",
            }}
          >
            Si tiene problemas para ingresar, consultar su información, ver sus
            evaluaciones o notas, por favor contacte a la secretaría académica.
          </Text>
        </Card>
      </Col>
    </Row>
  );
}

export default StudentPortal;
