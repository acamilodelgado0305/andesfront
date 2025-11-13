import React from "react";
import { Typography, Table, Tag, Button } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function StudentEvaluationsTab({ evaluations, onStartEvaluation }) {
  const columns = [
    {
      title: "Evaluación",
      dataIndex: "titulo",
      key: "titulo",
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado) => {
        let color = "default";
        if (estado === "pendiente") color = "orange";
        if (estado === "en_progreso") color = "blue";
        if (estado === "resuelta") color = "green";
        return <Tag color={color}>{(estado || "pendiente").toUpperCase()}</Tag>;
      },
    },
    {
      title: "Intentos",
      key: "intentos",
      render: (_, record) =>
        `${record.intentosRealizados}/${record.intentosMax}`,
    },
    {
      title: "Calificación",
      dataIndex: "calificacion",
      key: "calificacion",
      render: (calificacion) =>
        calificacion !== null && calificacion !== undefined
          ? Number(calificacion).toFixed(1)
          : "Sin calificar",
    },
    {
      title: "Disponible hasta",
      dataIndex: "fechaFin",
      key: "fechaFin",
      render: (fechaFin) =>
        fechaFin ? new Date(fechaFin).toLocaleString() : "Sin límite",
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => {
        const yaNoPuede =
          record.intentosRealizados >= record.intentosMax ||
          record.estado === "resuelta";
        return (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            size="small"
            disabled={yaNoPuede}
            onClick={() => onStartEvaluation(record)}
          >
            {record.estado === "en_progreso"
              ? "Reanudar evaluación"
              : "Presentar evaluación"}
          </Button>
        );
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
        Evaluaciones asignadas
      </Title>

      <Text
        type="secondary"
        style={{ display: "block", marginBottom: 10 }}
      >
        Aquí verás las evaluaciones que tienes pendientes, en progreso o
        resueltas. Haz clic en <strong>"Presentar evaluación"</strong> para
        iniciar.
      </Text>

      <Table
        columns={columns}
        dataSource={evaluations}
        pagination={false}
        bordered
        size="middle"
        locale={{
          emptyText: "No tienes evaluaciones asignadas en este momento.",
        }}
        style={{
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      />
    </>
  );
}

export default StudentEvaluationsTab;
