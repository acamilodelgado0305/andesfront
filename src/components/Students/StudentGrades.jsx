import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Card,
  message,
  Typography,
  Row,
  Col,
  Spin,
  Empty,
} from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import { getStudentById } from "../../services/student/studentService.js";
import { generateGradeReportPDF } from "../Utilidades/generateGradeReportPDF.js";
import backApi from "../../services/backApi"; // ✅ usamos el mismo cliente que en todo el front

const { Title, Text } = Typography;

const StudentGrades = ({ studentId }) => {
  const [grades, setGrades] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos del estudiante
  const fetchStudent = async (id) => {
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (err) {
      console.error("Error fetching student:", err);
      message.error("Error al cargar los datos del estudiante");
    }
  };

  // Cargar notas del estudiante
  const fetchGradesByStudentId = async (id) => {
    try {
      // ✅ Ojo al /api
      const response = await backApi.get(`/api/grades/students/${id}`);
      setGrades(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching grades:", err);
      message.error("Error al cargar las calificaciones");
      setGrades([]);
    }
  };

  const downloadPDF = async () => {
    if (!student) {
      message.warning("Los datos del estudiante aún no están cargados");
      return;
    }
    try {
      await generateGradeReportPDF(student, grades, studentId);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      message.error(
        "Error al generar el PDF. Revisa la consola para más detalles."
      );
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudent(studentId),
        fetchGradesByStudentId(studentId),
      ]);
      setLoading(false);
    };

    if (studentId) {
      loadInitialData();
    }
  }, [studentId]);

  const columns = [
    {
      title: "Materia",
      dataIndex: "materia",
      key: "materia",
      render: (text) => text || "N/A",
    },
    {
      title: "Nota",
      dataIndex: "nota",
      key: "nota",
      render: (nota) => {
        if (nota === null || nota === undefined || isNaN(nota)) {
          return "N/A";
        }
        return Number(nota).toFixed(1);
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ marginTop: 8 }}>
          <Text>Cargando calificaciones...</Text>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "24px", background: "#f5f5f5", minHeight: "100%" }}
    >
      <Card
        style={{
          marginBottom: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <Row align="middle" gutter={[16, 8]}>
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>
              Calificaciones de{" "}
              {student ? `${student.nombre} ${student.apellido}` : "Cargando..."}
            </Title>
            <Text type="secondary">
              Coordinador:{" "}
              {student && student.coordinador
                ? student.coordinador.nombre
                : "Sin coordinador asignado"}
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={downloadPDF}
              disabled={!grades.length}
              style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
            >
              Descargar PDF
            </Button>
          </Col>
        </Row>
      </Card>

      <Card
        title="Calificaciones"
        style={{
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {grades.length === 0 ? (
          <Empty
            description="Este estudiante aún no tiene calificaciones registradas."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={grades}
            rowKey={(record, index) =>
              `${record.student_id || studentId}-${record.materia || index}`
            }
            pagination={false}
            bordered
            style={{ background: "#fff", borderRadius: "8px" }}
          />
        )}
      </Card>
    </div>
  );
};

export default StudentGrades;
