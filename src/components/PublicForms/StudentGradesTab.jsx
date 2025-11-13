import React from "react";
import { Typography, Table, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function StudentGradesTab({
  gradesInfo,
  currentStudentId,
  studentInfo,
  loading,
  onDownloadReport,
}) {
  const columns = [
    {
      title: "Materia",
      dataIndex: "materia",
      key: "materia",
      width: "70%",
    },
    {
      title: "Calificación",
      dataIndex: "nota",
      key: "nota",
      width: "30%",
      align: "center",
      render: (nota) => {
        if (
          nota === null ||
          nota === undefined ||
          String(nota).trim().toUpperCase() === "N/A" ||
          String(nota).trim() === ""
        ) {
          return "N/A";
        }
        const numericNota = parseFloat(nota);
        return !isNaN(numericNota) ? numericNota.toFixed(1) : "N/A";
      },
    },
  ];

  return (
    <>
      <Title
        level={4}
        style={{
          color: "#003366",
          marginBottom: "15px",
        }}
      >
        Mis notas
      </Title>

      <Table
        columns={columns}
        dataSource={gradesInfo.map((grade, index) => ({
          ...grade,
          key: `${grade.materia}-${index}-${currentStudentId}`,
        }))}
        pagination={false}
        bordered
        size="middle"
        locale={{
          emptyText:
            "No hay calificaciones registradas para este estudiante.",
        }}
        style={{
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      />

      <Button
        type="default"
        icon={<DownloadOutlined />}
        onClick={onDownloadReport}
        loading={loading}
        block
        size="large"
        style={{
          marginTop: "30px",
          borderRadius: "6px",
          background: "#28a745",
          color: "white",
          borderColor: "#28a745",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        disabled={!studentInfo || !currentStudentId}
      >
        {loading ? "Procesando..." : "Descargar reporte en PDF"}
      </Button>

      {gradesInfo.length === 0 && studentInfo && (
        <Text
          type="warning"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "10px",
          }}
        >
          El estudiante no tiene calificaciones registradas.
        </Text>
      )}
    </>
  );
}

export default StudentGradesTab;
