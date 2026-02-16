import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Input, Button, message, Typography, Spin } from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

// Componentes y Servicios
import CreateStudentModal from "./addStudent";
import StudentTable from "./StudentTable";
import {
  getStudents,
  deleteStudent,
} from "../../services/student/studentService";

const { Title, Text } = Typography;
const PRIMARY_COLOR = "#155153";

const Students = () => {
  // --- ESTADOS ---
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. CARGAR ESTUDIANTES ---
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching students:", err);
      message.error("No se pudo cargar la lista de estudiantes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // --- 2. ELIMINAR ESTUDIANTE ---
  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      message.success("Estudiante eliminado con éxito");
      fetchStudents();
    } catch (error) {
      console.error("Error al eliminar:", error);
      message.error("No se pudo eliminar el estudiante.");
    }
  };

  // --- 3. BÚSQUEDA ---
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return students;
    const words = term.split(/\s+/);
    return students.filter((student) => {
      const fullName = `${student.nombre || ""} ${student.apellido || ""}`.toLowerCase();
      const whatsapp = (student.telefono_whatsapp || "").toLowerCase();
      const llamadas = (student.telefono_llamadas || "").toLowerCase();
      const documento = (student.numero_documento || "").toString().toLowerCase();
      return words.every(
        (w) =>
          fullName.includes(w) ||
          whatsapp.includes(w) ||
          llamadas.includes(w) ||
          documento.includes(w)
      );
    });
  }, [students, searchTerm]);

  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido correctamente");
  };

  // --- STATS ---
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const active = filteredStudents.filter((s) => s.activo).length;
    const inactive = total - active;
    const candidates = filteredStudents.filter((s) => s.posible_graduacion).length;
    const pendingPayment = filteredStudents.filter((s) => !s.estado_matricula).length;
    return { total, active, inactive, candidates, pendingPayment };
  }, [filteredStudents]);

  const statCards = [
    {
      key: "total",
      label: "Total Estudiantes",
      value: stats.total,
      icon: <TeamOutlined />,
      gradient: "linear-gradient(135deg, #155153, #28a5a5)",
      shadowColor: "rgba(21, 81, 83, 0.25)",
    },
    {
      key: "active",
      label: "Activos",
      value: stats.active,
      icon: <UserOutlined />,
      gradient: "linear-gradient(135deg, #0f9b0f, #4ecf4e)",
      shadowColor: "rgba(15, 155, 15, 0.25)",
    },
    {
      key: "candidates",
      label: "Candidatos a Grado",
      value: stats.candidates,
      icon: <CheckCircleOutlined />,
      gradient: "linear-gradient(135deg, #2c3e50, #5390d9)",
      shadowColor: "rgba(44, 62, 80, 0.25)",
    },
    {
      key: "pending",
      label: "Matrícula Pendiente",
      value: stats.pendingPayment,
      icon: <ClockCircleOutlined />,
      gradient: "linear-gradient(135deg, #d4380d, #fa8c16)",
      shadowColor: "rgba(212, 56, 13, 0.25)",
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #155153, #28a5a5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#fff",
              boxShadow: "0 4px 12px rgba(21, 81, 83, 0.3)",
            }}
          >
            <TeamOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: "#1a1a2e", letterSpacing: "-0.5px" }}>
              Gestión de Estudiantes
            </Title>
            <Text style={{ color: "#6b7280", fontSize: 15 }}>
              Administra, busca y gestiona la información de tus estudiantes
            </Text>
          </div>
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statCards.map((card) => (
          <StatCard key={card.key} card={card} loading={loading} />
        ))}
      </div>

      {/* ===== SEARCH & ACTIONS BAR ===== */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          padding: "16px 20px",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e8ecf0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <Input
          placeholder="Buscar por nombre, documento o celular..."
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: "1 1 320px",
            minWidth: 280,
            borderRadius: 10,
            height: 42,
          }}
          allowClear
          size="large"
        />

        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchStudents}
            loading={loading}
            style={{
              height: 42,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Recargar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{
              height: 42,
              borderRadius: 10,
              background: PRIMARY_COLOR,
              borderColor: PRIMARY_COLOR,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(21, 81, 83, 0.3)",
            }}
          >
            Agregar Estudiante
          </Button>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e8ecf0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <StudentTable
          students={filteredStudents}
          loading={loading}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal */}
      <CreateStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStudentAdded={handleStudentAdded}
      />
    </div>
  );
};

/* ===== Stat Card Component ===== */
function StatCard({ card, loading }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        padding: "20px 22px",
        background: "#fff",
        border: "1px solid #e8ecf0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 12px 28px ${card.shadowColor}`
          : "0 2px 8px rgba(0,0,0,0.05)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: card.gradient,
          borderRadius: "16px 16px 0 0",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: card.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "#fff",
            flexShrink: 0,
            transition: "transform 0.3s ease",
            transform: hovered ? "scale(1.08)" : "scale(1)",
          }}
        >
          {card.icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              marginBottom: 2,
            }}
          >
            {card.label}
          </div>
          {loading ? (
            <Spin size="small" />
          ) : (
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#1a1a2e",
                lineHeight: 1.1,
              }}
            >
              {card.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Students;