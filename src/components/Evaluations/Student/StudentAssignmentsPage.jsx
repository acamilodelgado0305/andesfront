import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message } from "antd";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { getStudentAssignments } from "../../../services/evaluation/evaluationService";

const StudentAssignmentsPage = ({ studentId }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAssignments = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const data = await getStudentAssignments(studentId);
      setAssignments(data.asignaciones || []);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar tus evaluaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

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
        if (estado === "finalizada") color = "green";
        return <Tag color={color}>{estado}</Tag>;
      },
    },
    {
      title: "Calificación",
      dataIndex: "calificacion",
      key: "calificacion",
      render: (val) => (val != null ? val : "—"),
    },
    {
      title: "Acción",
      key: "accion",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          type="primary"
          size="small"
          disabled={record.estado === "finalizada"}
          onClick={() =>
            navigate(`/evaluaciones/asignacion/${record.asignacion_id}`)
          }
        >
          {record.estado === "finalizada" ? "Ver" : "Responder"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <h2>Mis evaluaciones</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchAssignments}>
          Actualizar
        </Button>
      </Space>

      <Table
        rowKey="asignacion_id"
        loading={loading}
        columns={columns}
        dataSource={assignments}
      />
    </div>
  );
};

export default StudentAssignmentsPage;
