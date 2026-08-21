import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, message, Spin, Dropdown } from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  ReloadOutlined,
  InboxOutlined,
  RollbackOutlined,
  DollarOutlined,
  MoreOutlined,
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
  const [activeTab, setActiveTab] = useState("estudiantes");

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

  // Menú kebab (⋮) de las cards, estilo Google
  const cardMenu = {
    items: [{ key: "reload", label: "Recargar", icon: <ReloadOutlined /> }],
    onClick: ({ key }) => {
      if (key === "reload") fetchStudents();
    },
  };

  const statCards = [
    {
      key: "total",
      label: showArchived ? "Estudiantes archivados" : "Estudiantes",
      value: stats.total,
      hint: showArchived
        ? "salieron de la lista principal"
        : "en la lista actual",
      action: !showArchived && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-2 text-[13px] font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:underline bg-transparent border-0 p-0 cursor-pointer text-left"
        >
          Agregar estudiante
        </button>
      ),
    },
    {
      key: "candidates",
      label: "Candidatos a grado",
      value: stats.candidates,
      hint: "marcados como posibles graduandos",
    },
    {
      key: "pending",
      label: "Matrícula pendiente",
      value: stats.pendingPayment,
      hint: "aún no han pagado la matrícula",
      action: (
        <button
          type="button"
          onClick={() => setActiveTab("pagos")}
          className="mt-2 text-[13px] font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:underline bg-transparent border-0 p-0 cursor-pointer text-left"
        >
          Ver pagos
        </button>
      ),
    },
  ];

  const estudiantesTab = (
    <div style={{ paddingTop: 16 }}>
      {/* STAT CARDS (estilo Google) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map((card) => (
          <StatCard key={card.key} card={card} loading={loading} menu={cardMenu} />
        ))}
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

/* ===== Stat Card estilo Google (título + kebab, cifra grande, texto de apoyo, enlace azul) ===== */
function StatCard({ card, loading, menu }) {
  return (
    <div className="bg-white dark:bg-[#30302e] border border-slate-200 dark:border-[#403e3a] rounded-xl px-5 pt-4 pb-5 shadow-sm flex flex-col items-start">
      <div className="w-full flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-800 dark:text-[#faf9f5]">
          {card.label}
        </span>
        {menu && (
          <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
            <Button
              type="text"
              shape="circle"
              size="small"
              className="!flex items-center justify-center -mr-2 -mt-1"
              icon={
                <MoreOutlined className="text-lg text-slate-500 dark:text-[#a8a59e]" />
              }
            />
          </Dropdown>
        )}
      </div>

      <div className="mt-2 min-h-[36px] flex items-center">
        {loading ? (
          <Spin size="small" />
        ) : (
          <span className="text-[30px] leading-9 font-normal text-slate-900 dark:text-[#faf9f5]">
            {card.value}
          </span>
        )}
      </div>

      {card.hint && (
        <div className="mt-1 text-[13px] text-slate-500 dark:text-[#a8a59e]">
          {card.hint}
        </div>
      )}

      {card.action || null}
    </div>
  );
}

export default Students;