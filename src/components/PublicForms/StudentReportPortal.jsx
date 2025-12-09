import React, { useState } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Tabs,
  Button,
  notification 
} from "antd";
import { 
  LogoutOutlined, 
  UserOutlined, 
  ReadOutlined, 
  FileTextOutlined,
  SafetyCertificateOutlined 
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

// Servicios existentes
import { generateGradeReportPDF } from "../Utilidades/generateGradeReportPDF";
import { getStudentAssignments } from "../../services/evaluation/evaluationService";
import {
  loginStudent,
  clearStudentToken,
} from "../../services/auth/studentAuthService";
import { getStudentGradesAndInfoByDocument } from "../../services/gardes/gradesService";

// Componentes
import StudentLoginForm from "./StudentLoginForm";
import StudentInfoTab from "./StudentInfoTab";
import StudentEvaluationsTab from "./StudentEvaluationsTab";
import StudentGradesTab from "./StudentGradesTab";
import StudentCertificationsTab from "./StudentCertificationsTab"; // El componente que creamos antes

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// URL para consultar los certificados (basado en tu código anterior de Verificacion)
const API_BACKEND_FINANZAS = import.meta.env.VITE_API_FINANZAS || 'https://backendcoalianza.vercel.app/api';

function StudentPortal() {
  // --- ESTADOS ---
  const [usernameDoc, setUsernameDoc] = useState("");
  const [passwordDoc, setPasswordDoc] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Datos del estudiante
  const [documentNumber, setDocumentNumber] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [gradesInfo, setGradesInfo] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentStudentId, setCurrentStudentId] = useState(null);

  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // NUEVA FUNCIÓN: CARGAR DATOS DE CERTIFICADOS (API FINANZAS)
  // ---------------------------------------------------------------------------
  const loadCertificateData = async (doc) => {
    try {
      // Consultamos el endpoint que nos mostraste que devuelve el array "tipo"
      const response = await fetch(`${API_BACKEND_FINANZAS}/clients/${doc}`);
      
      if (response.ok) {
        const certData = await response.json();
        
        // Retornamos los datos útiles para mezclarlos con studentInfo
        // El JSON que mostraste trae: tipo (array), fechaVencimiento, etc.
        return {
           tipo: certData.tipo, 
           fechaVencimiento: certData.fechaVencimiento,
           createdAt: certData.createdAt,
           nombreCurso: certData.nombreCurso // Por si acaso
        };
      }
      return {}; // Si no encuentra en finanzas, retornamos vacío pero no rompemos el flujo
    } catch (err) {
      console.warn("No se pudo cargar info de certificados externos:", err);
      return {};
    }
  };

  // ---------------------------------------------------------------------------
  // CARGAR NOTAS Y EVALUACIONES (Lógica existente)
  // ---------------------------------------------------------------------------
  const loadStudentAcademicData = async (doc, authStudentData) => {
    if (!doc.trim()) throw new Error("Documento inválido.");

    // 1. Cargar Notas (Servicio Grades)
    const data = await getStudentGradesAndInfoByDocument(doc);
    const { student, grades, studentId } = data;

    if (!student || !studentId) throw new Error("Datos académicos no encontrados.");

    // 2. Cargar Evaluaciones
    let assignedEvaluations = [];
    try {
        const evData = await getStudentAssignments(studentId);
        assignedEvaluations = evData.asignaciones || (Array.isArray(evData) ? evData : []);
    } catch (e) {
        console.warn("Error cargando evaluaciones", e);
    }
    
    // 3. Cargar Certificados (NUEVO PASO)
    // Usamos el documento para buscar en la base de datos de Clientes/Finanzas
    const extraCertData = await loadCertificateData(doc);

    // 4. MEZCLAR TODO EN studentInfo
    // Prioridad: authStudentData (login) -> student (grades) -> extraCertData (finanzas)
    const finalStudentInfo = {
        ...authStudentData, // Datos del login
        ...student,         // Datos académicos
        ...extraCertData,   // Datos de certificados (Aquí viene el array 'tipo')
    };

    // Actualizar estados
    setStudentInfo(finalStudentInfo);
    setGradesInfo(grades || []);
    setEvaluations(assignedEvaluations);
    setCurrentStudentId(studentId);
    setDocumentNumber(doc);
  };

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------
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
      // A) Autenticación básica
      const { student } = await loginStudent(doc, pass);

      // B) Carga de datos complejos (Notas + Certificados + Evaluaciones)
      await loadStudentAcademicData(student.documento || doc, student);
      
      setIsLoggedIn(true);
      notification.success({ message: `Bienvenido, ${student.nombre}` });

    } catch (err) {
      console.error(err);
      // Manejo de error más amigable
      const msg = err.response?.data?.error || err.message || "Error al iniciar sesión.";
      
      // Si el error es 404 en academic data, quizás solo tiene certificado pero no notas.
      // Podrías manejar eso aquí, pero por seguridad, si falla el login, mostramos error.
      setError(msg);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

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
     if (evaluation.asignacionId) navigate(`/evaluaciones/asignacion/${evaluation.asignacionId}`);
  };

  // ---------------------------------------------------------------------------
  // RENDER UI
  // ---------------------------------------------------------------------------
  return (
    <Row justify="center" align="top" style={{ minHeight: "100vh", background: "#FFFF" }}>
      <Col xs={24} sm={22} md={20} lg={18} xl={16}>
        <Card bordered={false} >
          
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <Title level={2} style={{ color: "#003366" }}>Portal del Estudiante</Title>
            <Text type="secondary">Gestiona tus notas, evaluaciones y certificaciones</Text>
          </div>

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
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <Text strong>Estudiante: <span style={{ color: "#0056b3" }}>{studentInfo?.nombre_completo || studentInfo?.nombre}</span></Text>
                <Button icon={<LogoutOutlined />} onClick={handleLogout} danger type="text">Salir</Button>
              </div>

              <Tabs defaultActiveKey="info" type="card">
                
                <TabPane tab={<span><UserOutlined /> Información</span>} key="info">
                  <StudentInfoTab studentInfo={studentInfo} documentNumber={documentNumber} />
                </TabPane>
                
                <TabPane tab={<span><ReadOutlined /> Evaluaciones</span>} key="evaluaciones">
                  <StudentEvaluationsTab evaluations={evaluations} onStartEvaluation={handleStartEvaluation} />
                </TabPane>

                <TabPane tab={<span><FileTextOutlined /> Notas</span>} key="notas">
                  <StudentGradesTab 
                    gradesInfo={gradesInfo} 
                    studentInfo={studentInfo} 
                    currentStudentId={currentStudentId}
                    loading={loading}
                    onDownloadReport={handleDownloadReport} 
                  />
                </TabPane>

                <TabPane tab={<span><SafetyCertificateOutlined /> Certificados</span>} key="certificados">
                  {/* Pasamos studentInfo que ahora YA TIENE el array 'tipo' mezclado */}
                  <StudentCertificationsTab studentInfo={studentInfo} />
                </TabPane>
                
              </Tabs>
            </>
          )}

          <div style={{ textAlign: "center", marginTop: "40px", color: "#888", fontSize: "12px" }}>
             Qcontrola © 2025
          </div>
        </Card>
      </Col>
    </Row>
  );
}

export default StudentPortal;