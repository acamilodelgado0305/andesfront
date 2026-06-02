import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, message, Spin } from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  InboxOutlined,
  RollbackOutlined,
  DollarOutlined,
} from "@ant-design/icons";

// Componentes y Servicios
import CreateStudentModal from "./addStudent";
import StudentTable from "./StudentTable";
import StudentTableErrorBoundary from "./StudentTableErrorBoundary";
import PaymentsTab from "./PaymentsTab";
import {
  getStudents,
  getArchivedStudents,
  archiveStudent,
  restoreStudent,
} from "../../services/student/studentService";

const PRIMARY_COLOR = "#155153";

const Students = () => {
  // --- ESTADOS ---
  const [students, setStudents] = useState([]);
  const [filteredTableData, setFilteredTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // --- 1. CARGAR ESTUDIANTES ---
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = showArchived ? await getArchivedStudents() : await getStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching students:", err);
      message.error("No se pudo cargar la lista de estudiantes.");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // --- 2. ARCHIVAR ESTUDIANTE ---
  const handleArchive = async (id, reason) => {
    try {
      await archiveStudent(id, reason);
      message.success("Estudiante archivado correctamente");
      fetchStudents();
    } catch (error) {
      console.error("Error al archivar:", error);
      message.error("No se pudo archivar el estudiante.");
    }
  };

  // --- 3. RESTAURAR ESTUDIANTE ---
  const handleRestore = async (id) => {
    try {
      await restoreStudent(id);
      message.success("Estudiante restaurado correctamente");
      fetchStudents();
    } catch (error) {
      console.error("Error al restaurar:", error);
      message.error("No se pudo restaurar el estudiante.");
    }
  };

  // --- 4. BÚSQUEDA ---
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

  const handleToggleArchived = () => {
    setShowArchived((prev) => !prev);
    setSearchTerm("");
  };

  const handleStudentAdded = () => {
    fetchStudents();
    message.success("Estudiante añadido correctamente");
  };

  // --- STATS — se basan en los datos YA filtrados por la tabla (todos los filtros activos) ---
  const stats = useMemo(() => {
    const source = filteredTableData.length > 0 ? filteredTableData : filteredStudents;
    const total = source.length;
    const candidates = source.filter((s) => s.posible_graduacion).length;
    const pendingPayment = source.filter((s) => !s.estado_matricula).length;
    return { total, candidates, pendingPayment };
  }, [filteredTableData, filteredStudents]);

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

  const estudiantesTab = (
    <div style={{ paddingTop: 16 }}>
      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map((card) => <StatCard key={card.key} card={card} loading={loading} />)}
      </div>

      {/* BANNER ARCHIVADOS */}
      {showArchived && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 12, marginBottom: 16, color: "#d46b08", fontWeight: 500, fontSize: 14 }}>
          <InboxOutlined style={{ fontSize: 18 }} />
          Mostrando estudiantes archivados. Para restaurar un estudiante, usa el botón <RollbackOutlined /> en la tabla.
        </div>
      )}

      {/* TABLE */}
      <div style={{ background: "#fff", borderRadius: 14, border: showArchived ? "1px solid #ffd591" : "1px solid #e8ecf0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <StudentTableErrorBoundary>
          <StudentTable
            students={filteredStudents}
            loading={loading}
            onArchive={handleArchive}
            onRestore={handleRestore}
            showArchived={showArchived}
            onFilteredDataChange={setFilteredTableData}
            onStudentsMoved={fetchStudents}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </StudentTableErrorBoundary>
      </div>

      <CreateStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onStudentAdded={handleStudentAdded} />
    </div>
  );

  const [activeTab, setActiveTab] = useState("estudiantes");

  const tabs = [
    { key: "estudiantes", label: "Estudiantes", icon: <TeamOutlined /> },
    { key: "pagos",       label: "Pagos",        icon: <DollarOutlined /> },
  ];

  const studentActions = (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Button icon={<ReloadOutlined />} onClick={fetchStudents} loading={loading} style={{ height: 42, borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}>
        Recargar
      </Button>
      <Button
        icon={showArchived ? <RollbackOutlined /> : <InboxOutlined />}
        onClick={handleToggleArchived}
        style={{ height: 42, borderRadius: 10, display: "flex", alignItems: "center", gap: 6, background: showArchived ? "#fff7e6" : undefined, borderColor: showArchived ? "#fa8c16" : undefined, color: showArchived ? "#fa8c16" : undefined, fontWeight: showArchived ? 600 : undefined }}
      >
        {showArchived ? "Ver Activos" : "Archivados"}
      </Button>
      {!showArchived && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} style={{ height: 42, borderRadius: 10, background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(21,81,83,0.3)" }}>
          Agregar Estudiante
        </Button>
      )}
    </div>
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {/* ── Tab bar + acciones ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap", marginBottom: 20,
      }}>
        <div style={{
          display: "inline-flex", gap: 4,
          background: "#f1f5f9", borderRadius: 14, padding: 4,
        }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 20px", borderRadius: 10, border: "none",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
                  background: active ? "#fff" : "transparent",
                  color:      active ? PRIMARY_COLOR : "#6b7280",
                  boxShadow:  active ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
                }}
              >
                <span style={{ fontSize: 15 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "estudiantes" && studentActions}
      </div>

      {/* ── Tab content ── */}
      <div style={{ display: activeTab === "estudiantes" ? "block" : "none" }}>
        {estudiantesTab}
      </div>
      <div style={{ display: activeTab === "pagos" ? "block" : "none" }}>
        <PaymentsTab />
      </div>
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