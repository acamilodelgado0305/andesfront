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
      render: (titulo) => (
        <span style={{ fontWeight: 600, color: "#111827" }}>{titulo}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estadoRaw) => {
        const estado = estadoRaw || "pendiente";
        let color = "default";

        if (estado === "pendiente") color = "orange";
        if (estado === "en_progreso") color = "blue";
        if (estado === "resuelta") color = "green";

        return (
          <Tag color={color} style={{ borderRadius: 999 }}>
            {estado.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Intentos",
      key: "intentos",
      render: (_, record) => {
        const realizados = record.intentosRealizados ?? 0;
        const max = record.intentosMax ?? null; // desde la evaluación

        const hasLimit = max !== null && max !== undefined;
        const hasAttemptsLeft = !hasLimit || realizados < max;

        const color = hasAttemptsLeft ? "processing" : "red";

        return (
          <Tag color={color} style={{ borderRadius: 999 }}>
            {hasLimit ? `${realizados}/${max}` : `${realizados} / Sin límite`}
          </Tag>
        );
      },
    },
    {
      title: "Calificación",
      dataIndex: "calificacion",
      key: "calificacion",
      render: (calificacion) => {
        if (calificacion === null || calificacion === undefined) {
          return <Text type="secondary">Sin calificar</Text>;
        }

        const nota = Number(calificacion);
        return (
          <Tag color="green" style={{ borderRadius: 999 }}>
            {nota.toFixed(1)}
          </Tag>
        );
      },
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
        const realizados = record.intentosRealizados ?? 0;
        const max = record.intentosMax ?? null;
        const hasLimit = max !== null && max !== undefined;
        const hasAttemptsLeft = !hasLimit || realizados < max;

        const now = new Date();
        const isExpired =
          record.fechaFin && new Date(record.fechaFin) < now;

        const canAnswer = hasAttemptsLeft && !isExpired;

        let buttonLabel = "Presentar evaluación";
        let buttonType = "primary";

        if (canAnswer && realizados > 0) {
          buttonLabel = "Reintentar evaluación";
        }

        if (!canAnswer) {
          buttonLabel = "Ver resultados";
          buttonType = "default";
        }

        return (
          <Button
            type={buttonType}
            icon={<PlayCircleOutlined />}
            size="small"
            onClick={() => onStartEvaluation(record)}
            style={{ borderRadius: 999 }}
          >
            {buttonLabel}
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
          color: "#111827",
          marginBottom: 4,
        }}
      >
        Evaluaciones asignadas
      </Title>

      <Text
        type="secondary"
        style={{ display: "block", marginBottom: 12, fontSize: 13 }}
      >
        Estas son tus <strong>asignaciones</strong> de evaluación. Si aún tienes
        intentos disponibles, podrás <strong>presentar</strong> o{" "}
        <strong>reintentar</strong> la evaluación. Cuando no tengas más
        intentos, solo podrás <strong>ver tus resultados</strong>.
      </Text>

      <Table
        columns={columns}
        dataSource={evaluations}
        pagination={false}
        bordered={false}
        size="middle"
        rowKey={(record) => record.key || record.asignacionId}
        locale={{
          emptyText: "No tienes evaluaciones asignadas en este momento.",
        }}
        style={{
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
          background: "#ffffff",
        }}
      />
    </>
  );
}

export default StudentEvaluationsTab;
