import React from "react";
import { Typography, Descriptions, Tag } from "antd";

const { Title, Text } = Typography;

function StudentInfoTab({ studentInfo, documentNumber, currentStudentId }) {
  if (!studentInfo) {
    return (
      <Text type="secondary">
        No se encontró información del estudiante. Intente iniciar sesión nuevamente.
      </Text>
    );
  }

  const estadoLabel =
    studentInfo.activo === true ||
    studentInfo.activo === "true" ||
    studentInfo.activo === "activo" ||
    studentInfo.activo === 1 ||
    studentInfo.activo === "1"
      ? { color: "green", text: "Activo" }
      : { color: "red", text: "Inactivo" };

  return (
    <>
      <Title
        level={4}
        style={{
          color: "#003366",
          borderBottom: "2px solid #0056b3",
          paddingBottom: "10px",
          marginBottom: "20px",
        }}
      >
        Información del Estudiante
      </Title>

      <Descriptions
        bordered
        column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        size="default"
        layout="vertical"
      >
        <Descriptions.Item
          labelStyle={{ fontWeight: "bold" }}
          label="Nombres y Apellidos"
        >
          {studentInfo.nombre_completo ||
            `${studentInfo.nombre || ""} ${studentInfo.apellido || ""}`.trim() ||
            "N/A"}
        </Descriptions.Item>

        <Descriptions.Item
          labelStyle={{ fontWeight: "bold" }}
          label="Documento"
        >
          {documentNumber || studentInfo.documento || "N/A"}
        </Descriptions.Item>

        <Descriptions.Item
          labelStyle={{ fontWeight: "bold" }}
          label="ID Estudiante (interno)"
        >
          {currentStudentId || studentInfo.id || "N/A"}
        </Descriptions.Item>

        <Descriptions.Item
          labelStyle={{ fontWeight: "bold" }}
          label="Programa"
        >
          {studentInfo.programa_nombre || studentInfo.programa_id || "N/A"}
        </Descriptions.Item>

        <Descriptions.Item
          labelStyle={{ fontWeight: "bold" }}
          label="Coordinador(a)"
        >
          {studentInfo.coordinador || studentInfo.coordinador_id || "N/A"}
        </Descriptions.Item>

        <Descriptions.Item
          labelStyle={{ fontWeight: "bold" }}
          label="Estado"
        >
          <Tag color={estadoLabel.color}>{estadoLabel.text}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Text
        type="secondary"
        style={{ display: "block", marginTop: 16 }}
      >
        Por favor, verifica que todos tus datos sean correctos. Si encuentras algún
        error, comunícate con la secretaría académica para realizar la corrección.
      </Text>
    </>
  );
}

export default StudentInfoTab;
