import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Typography,
  message,
  Space,
  Spin,
  Select,
  Tag,
  Popconfirm,
  DatePicker,
  Tooltip,
  Modal,
  Radio,
  Form,
  Progress,
} from "antd";
import {
  InboxOutlined,
  RollbackOutlined,
  WhatsAppOutlined,
  SearchOutlined,
  SwapOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { bulkMoveToPrograma } from "../../services/student/studentService";
import { getProgramas } from "../../services/programas/programasService";
import StudentDetailModal from "./StudentDetailModal";

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const STORAGE_KEY = "students_filters";

const ARCHIVE_REASONS = [
  "Retiro voluntario",
  "Problemas económicos",
  "Traslado a otra institución",
  "Inactividad prolongada",
  "Culminó el programa",
  "Incumplimiento de requisitos",
  "Otro motivo",
];

const StudentTable = ({ onArchive, onRestore, showArchived = false, students = [], loading = false, onFilteredDataChange, onStudentsMoved, searchTerm = "", onSearchChange }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [archiveModal, setArchiveModal] = useState({ open: false, studentId: null, studentName: "" });
  const [archiveReason, setArchiveReason] = useState(null);
  const [archiveCustomReason, setArchiveCustomReason] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [moveProgramaId, setMoveProgramaId] = useState(null);
  const [moveReplace, setMoveReplace] = useState(true);
  const [programas, setProgramas] = useState([]);
  const [movingStudents, setMovingStudents] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, studentId: null });

  const [filters, setFilters] = useState(() => {
    if (typeof window === "undefined") {
      return {
        searchText: {},
        selectedCoordinator: [],
        dateRange: null,
        predefinedDate: null,
        selectedGraduation: null,
        selectedProgram: [],
        selectedModalidad: [],
      };
    }
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error("no-cache");
      const saved = JSON.parse(raw);
      return {
        searchText: saved.searchText || {},
        selectedCoordinator: saved.selectedCoordinator || [],
        dateRange: Array.isArray(saved.dateRange)
          ? [moment(saved.dateRange[0]), moment(saved.dateRange[1])]
          : null,
        predefinedDate: saved.predefinedDate || null,
        selectedGraduation: saved.selectedGraduation || null,
        selectedProgram: saved.selectedProgram || [],
        selectedModalidad: saved.selectedModalidad || [],
      };
    } catch (e) {
      return {
        searchText: {},
        selectedCoordinator: [],
        dateRange: null,
        predefinedDate: null,
        selectedGraduation: null,
        selectedProgram: [],
        selectedModalidad: [],
      };
    }
  });

  // Coordinadores únicos
  const coordinators = useMemo(() => {
    return [
      ...new Set(
        students.map((s) => s.coordinador_nombre).filter(Boolean)
      ),
    ];
  }, [students]);
  const programOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.programa_nombre) set.add(s.programa_nombre);
      (s.programas_asociados || []).forEach((p) => {
        if (p?.nombre) set.add(p.nombre);
      });
    });
    return Array.from(set);
  }, [students]);

  const modalidadOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.modalidad_estudio) set.add(s.modalidad_estudio);
    });
    return Array.from(set);
  }, [students]);
  const getCoordinatorTagColor = (name) => {
    if (!name) return "default";
    const lower = name.toLowerCase();
    if (lower.includes("camilo")) return "orange";
    if (lower.includes("adriana")) return "purple";
    return "blue";
  };

  // Manejar búsqueda texto por columna
  const handleSearch = useCallback((value, dataIndex) => {
    setFilters((prev) => ({
      ...prev,
      searchText: {
        ...prev.searchText,
        [dataIndex]: (value || "").toLowerCase(),
      },
    }));
  }, []);

  // Manejar cambios de filtros globales
  const handleFilterChange = useCallback((value, filterType) => {
    setFilters((prev) => {
      const newState = { ...prev };
      if (filterType === "predefinedDate") {
        newState.predefinedDate = value;
        newState.dateRange = null;
      } else if (filterType === "dateRange") {
        newState.dateRange = value;
        newState.predefinedDate = null;
      } else {
        newState[filterType] = value;
      }
      return newState;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      ...filters,
      dateRange: filters.dateRange
        ? [filters.dateRange[0]?.toISOString(), filters.dateRange[1]?.toISOString()]
        : null,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [filters]);

  // Datos filtrados
  const filteredData = useMemo(() => {
    if (!Array.isArray(students)) return [];

    return students
      .filter((student) => {
        const {
          searchText,
          selectedCoordinator,
          dateRange,
          predefinedDate,
          selectedGraduation,
          selectedProgram,
          selectedModalidad,
        } = filters;

        // Filtro por texto (por columna)
        const searchMatch = Object.keys(searchText).every((key) => {
          if (!searchText[key]) return true;

          if (key === "nombre_programa") {
            const programNames =
              student.programa_nombre ||
              (student.programas_asociados || [])
                .map((p) => p.nombre)
                .join(" ");
            return programNames
              ? programNames.toLowerCase().includes(searchText[key])
              : false;
          }

          const value = student[key];
          return value
            ? value.toString().toLowerCase().includes(searchText[key])
            : false;
        });

        // Filtro por coordinador
        const coordinatorMatch = Array.isArray(selectedCoordinator) && selectedCoordinator.length > 0
          ? selectedCoordinator.includes(student.coordinador_nombre)
          : true;

        // Filtro por programa
        let programMatch = true;
        if (Array.isArray(selectedProgram) && selectedProgram.length > 0) {
          const programNames =
            student.programa_nombre ||
            (student.programas_asociados || [])
              .map((p) => p.nombre)
              .join(" ");
          programMatch = programNames
            ? selectedProgram.some((p) =>
              programNames.toLowerCase().includes(p.toLowerCase())
            )
            : false;
        }

        // Filtro por modalidad
        let modalidadMatch = true;
        if (Array.isArray(selectedModalidad) && selectedModalidad.length > 0) {
          const modalidad = (student.modalidad_estudio || "").toLowerCase();
          modalidadMatch = selectedModalidad.some(
            (m) => modalidad === m.toLowerCase()
          );
        }

        // Filtro por fecha inscripción
        let dateMatch = true;
        if (student.fecha_inscripcion) {
          const inscriptionDate = moment(student.fecha_inscripcion);
          if (dateRange) {
            const [start, end] = dateRange;
            dateMatch = inscriptionDate.isBetween(start, end, "day", "[]");
          } else if (predefinedDate) {
            const now = moment();
            let startDate;
            switch (predefinedDate) {
              case "week":
                startDate = now.clone().subtract(7, "days");
                dateMatch = inscriptionDate.isAfter(startDate);
                break;
              case "month":
                startDate = now.clone().subtract(1, "month");
                dateMatch = inscriptionDate.isAfter(startDate);
                break;
              case "quarter":
                startDate = now.clone().subtract(3, "months");
                dateMatch = inscriptionDate.isAfter(startDate);
                break;
              case "all":
              default:
                dateMatch = true;
                break;
            }
          }
        }

        // Filtro por posible graduación
        let graduationMatch = true;
        if (selectedGraduation === "candidato") {
          graduationMatch = student.posible_graduacion === true;
        } else if (selectedGraduation === "no_candidato") {
          graduationMatch =
            student.posible_graduacion === false ||
            student.posible_graduacion == null;
        }

        return (
          searchMatch &&
          coordinatorMatch &&
          programMatch &&
          modalidadMatch &&
          dateMatch &&
          graduationMatch
        );
      })
      .sort(
        (a, b) =>
          moment(b.fecha_inscripcion || 0).unix() -
          moment(a.fecha_inscripcion || 0).unix()
      );
  }, [students, filters]);

  // Notificar al padre cada vez que cambia la lista filtrada
  useEffect(() => {
    if (onFilteredDataChange) onFilteredDataChange(filteredData);
  }, [filteredData, onFilteredDataChange]);

  const totalStudents = filteredData.length;
  const activeStudents = filteredData.filter((s) => s.activo).length;
  const graduationCandidates = filteredData.filter(
    (s) => s.posible_graduacion
  ).length;

  const openArchiveModal = (record) => {
    setArchiveReason(null);
    setArchiveCustomReason("");
    setArchiveModal({ open: true, studentId: record.id, studentName: `${record.nombre} ${record.apellido}` });
  };

  const confirmArchive = async () => {
    const finalReason = archiveReason === "Otro motivo"
      ? archiveCustomReason.trim()
      : archiveReason;

    if (!finalReason) {
      message.warning("Selecciona o escribe la razón del archivado.");
      return;
    }

    setArchiving(true);
    try {
      await onArchive(archiveModal.studentId, finalReason);
      setArchiveModal({ open: false, studentId: null, studentName: "" });
    } finally {
      setArchiving(false);
    }
  };

  // Load programas once on mount
  useEffect(() => {
    getProgramas().then(setProgramas).catch(() => {});
  }, []);

  const openMoveModal = () => {
    setMoveProgramaId(null);
    setMoveReplace(true);
    setMoveModal(true);
  };

  const handleBulkMove = async () => {
    if (!moveProgramaId) { message.warning("Selecciona un programa destino."); return; }
    setMovingStudents(true);
    try {
      const result = await bulkMoveToPrograma(selectedRowKeys, moveProgramaId, moveReplace);
      message.success(result.message);
      setMoveModal(false);
      setSelectedRowKeys([]);
      if (onStudentsMoved) onStudentsMoved();
    } catch (err) {
      message.error(err.response?.data?.error || "Error al mover estudiantes.");
    } finally {
      setMovingStudents(false);
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      title: "Fecha Inscripción",
      key: "fechas",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tooltip title={`Inscripción: ${record.fecha_inscripcion ? moment(record.fecha_inscripcion).format("DD/MM/YYYY") : "No especificado"}`}>
            <Text>
              {record.fecha_inscripcion ? moment(record.fecha_inscripcion).format("DD/MM/YY") : "N/A"}
            </Text>
          </Tooltip>
          {record.fecha_graduacion && (
            <Tooltip title={`Graduación: ${moment(record.fecha_graduacion).format("DD/MM/YYYY")}`}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                Grad. {moment(record.fecha_graduacion).format("DD/MM/YY")}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
      sorter: (a, b) => moment(a.fecha_inscripcion || 0).unix() - moment(b.fecha_inscripcion || 0).unix(),
    },
    {
      title: "Coordinador",
      dataIndex: "coordinador_nombre",
      key: "coordinador_nombre",
      render: (text) => (
        <Tag color={getCoordinatorTagColor(text)}>
          {text || "Sin coordinador"}
        </Tag>
      ),
      filters: coordinators.map((coord) => ({
        text: coord,
        value: coord,
      })),
      onFilter: (value, record) =>
        record.coordinador_nombre === value,
      filterSearch: true,
    },
    {
      title: "Documento",
      key: "documento",
      render: (_, record) => (
        <span
          className="truncate-text"
          title={`${record.tipo_documento} ${record.numero_documento || "No especificado"
            }`}
        >
          {record.tipo_documento} {record.numero_documento || "No especificado"}
        </span>
      ),
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar documento"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() =>
              handleSearch(selectedKeys[0], "numero_documento")
            }
            style={{ width: 188, marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                handleSearch(selectedKeys[0], "numero_documento");
                confirm();
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                handleSearch("", "numero_documento");
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        record.numero_documento
          ?.toString()
          .toLowerCase()
          .includes(value.toLowerCase()),
    },
    {
      title: "Nombre Completo",
      key: "nombre_completo",
      render: (_, record) => (
        <span
          className="truncate-text"
          title={`${record.nombre} ${record.apellido}`}
        >
          {record.nombre} {record.apellido}
        </span>
      ),
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar nombre"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => handleSearch(selectedKeys[0], "nombre")}
            style={{ width: 188, marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                handleSearch(selectedKeys[0], "nombre");
                confirm();
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                handleSearch("", "nombre");
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        `${record.nombre} ${record.apellido}`
          .toLowerCase()
          .includes(value.toLowerCase()),
    },
    {
      title: "Programa(s)",
      key: "programa",
      render: (_, record) => {
        const programNamesArray =
          record.programa_nombre
            ? [record.programa_nombre]
            : (record.programas_asociados || []).map((p) => p.nombre);

        if (!programNamesArray || programNamesArray.length === 0) {
          return <Tag color="volcano">Sin programa</Tag>;
        }

        const firstPrograms = programNamesArray.slice(0, 2);
        const extraCount = programNamesArray.length - firstPrograms.length;

        return (
          <Space size={2} wrap>
            {firstPrograms.map((name) => (
              <Tag color="blue" key={name}>
                {name}
              </Tag>
            ))}
            {extraCount > 0 && (
              <Tag color="geekblue">+{extraCount} más</Tag>
            )}
          </Space>
        );
      },
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar programa"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) => {
        const programNames =
          record.programa_nombre ||
          (record.programas_asociados || [])
            .map((p) => p.nombre)
            .join(" ");
        return programNames
          ? programNames.toLowerCase().includes(value.toLowerCase())
          : false;
      },
    },
    {
      title: "Contacto",
      key: "contacto",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.email && (
            <Tooltip title={record.email}>
              <Text
                className="truncate-text"
                style={{ maxWidth: "150px" }}
              >
                {record.email}
              </Text>
            </Tooltip>
          )}
          {record.telefono_whatsapp && (
            <Tooltip title={`WhatsApp: ${record.telefono_whatsapp}`}>
              <Text className="truncate-text">
                {record.telefono_whatsapp}
              </Text>
            </Tooltip>
          )}
          {record.telefono_llamadas &&
            record.telefono_llamadas !== record.telefono_whatsapp && (
              <Tooltip
                title={`Llamadas: ${record.telefono_llamadas}`}
              >
                <Text className="truncate-text">
                  {record.telefono_llamadas}
                </Text>
              </Tooltip>
            )}
          {!record.email &&
            !record.telefono_whatsapp &&
            !record.telefono_llamadas && (
              <Text type="secondary">Sin contacto</Text>
            )}
        </Space>
      ),
    },
    {
      title: "Progreso de Pago",
      key: "progreso_pago",
      width: 180,
      render: (_, record) => {
        const total   = parseFloat(record.monto_total_programas || 0);
        const abonado = parseFloat(record.total_abonado || 0);
        if (!total) return <Text type="secondary" style={{ fontSize: 12 }}>Sin costo</Text>;
        const pct    = Math.min(100, Math.round((abonado / total) * 100));
        const pagado = pct >= 100;
        return (
          <Tooltip title={
            <div>
              <div>Abonado: <b>${abonado.toLocaleString("es-CO")}</b></div>
              <div>Total: <b>${total.toLocaleString("es-CO")}</b></div>
              <div>Pendiente: <b>${Math.max(0, total - abonado).toLocaleString("es-CO")}</b></div>
            </div>
          }>
            <div style={{ minWidth: 140 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2, color: "#6b7280" }}>
                <span>{pct}%</span>
                {pagado && <span style={{ color: "#52c41a", fontWeight: 600 }}>Paz y salvo</span>}
              </div>
              <Progress
                percent={pct}
                size="small"
                showInfo={false}
                status={pagado ? "success" : "active"}
                strokeColor={pagado ? "#52c41a" : "#3b82f6"}
              />
            </div>
          </Tooltip>
        );
      },
    },
    ...(showArchived ? [{
      title: "Motivo de archivado",
      key: "archived_reason",
      render: (_, record) => (
        <Tooltip title={record.archived_reason || "Sin motivo registrado"}>
          <Tag
            color="orange"
            style={{
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            {record.archived_reason || "—"}
          </Tag>
        </Tooltip>
      ),
    }] : []),
    {
      title: "Acciones",
      key: "acciones",
      width: 190,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Enviar WhatsApp">
            <Button
              type="text"
              icon={<WhatsAppOutlined style={{ color: "#25D366", fontSize: 17 }} />}
              onClick={(e) => {
                e.stopPropagation();
                let phoneNumber =
                  record.telefono_whatsapp?.replace(/\D/g, "") ||
                  record.telefono_llamadas?.replace(/\D/g, "");
                if (!phoneNumber) {
                  message.error("No hay número de teléfono disponible para WhatsApp");
                  return;
                }
                if (!phoneNumber.startsWith("57")) phoneNumber = `57${phoneNumber}`;
                window.open(`https://wa.me/${phoneNumber}`, "_blank");
              }}
            />
          </Tooltip>

          {showArchived ? (
            <Popconfirm
              title="Restaurar estudiante"
              description="¿Restaurar este estudiante? Volverá a aparecer en la lista activa."
              okText="Sí, restaurar"
              cancelText="Cancelar"
              onConfirm={(e) => {
                e?.stopPropagation();
                onRestore(record.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Tooltip title="Restaurar estudiante">
                <Button
                  type="text"
                  icon={<RollbackOutlined />}
                  style={{ color: "#fa8c16" }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="Archivar estudiante">
              <Button
                type="text"
                icon={<InboxOutlined />}
                style={{ color: "#8c8c8c" }}
                onClick={(e) => {
                  e.stopPropagation();
                  openArchiveModal(record);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    preserveSelectedRowKeys: true,
  };

  return (
    <div translate="no">
      {/* Barra de selección masiva — siempre presente para evitar salto de layout */}
      <div style={{
        display: selectedRowKeys.length > 0 ? 'flex' : 'none',
        alignItems: 'center', gap: 12,
        padding: '10px 20px',
        background: '#eff6ff',
        borderBottom: '1px solid #bfdbfe',
        minHeight: 48,
      }}>
        <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>
          {selectedRowKeys.length} estudiante{selectedRowKeys.length !== 1 ? 's' : ''} seleccionado{selectedRowKeys.length !== 1 ? 's' : ''}
        </Tag>
        <Button
          type="primary"
          icon={<SwapOutlined />}
          onClick={openMoveModal}
          style={{ background: '#155153', borderColor: '#155153' }}
        >
          Mover a programa
        </Button>
        <Button
          icon={<CloseOutlined />}
          onClick={() => setSelectedRowKeys([])}
          size="small"
        >
          Limpiar selección
        </Button>
      </div>

      {/* Filtros superiores */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <SearchOutlined style={{ color: '#1a1a1a', fontSize: 14 }} />
          <Text style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 600 }}>Filtros avanzados</Text>
          <Text style={{ fontSize: 12, color: '#1a1a1a', marginLeft: 4 }}>•</Text>
          <Text style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 500 }}>
            {totalStudents} resultado{totalStudents !== 1 ? 's' : ''}
          </Text>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Select
            mode="multiple"
            style={{ minWidth: 200 }}
            placeholder="Modalidad"
            allowClear
            onChange={(value) => handleFilterChange(value, 'selectedModalidad')}
            value={filters.selectedModalidad}
          >
            {['Clases en Linea', 'Modulos por WhastApp', ...modalidadOptions].map((m) => (
              <Option key={m} value={m}>{m}</Option>
            ))}
          </Select>

          <Select
            mode="multiple"
            style={{ minWidth: 220 }}
            placeholder="Programa"
            allowClear
            onChange={(value) => handleFilterChange(value, 'selectedProgram')}
            value={filters.selectedProgram}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {programOptions.map((p) => (
              <Option key={p} value={p}>{p}</Option>
            ))}
          </Select>

          <Select
            mode="multiple"
            style={{ minWidth: 200 }}
            placeholder="Coordinador"
            allowClear
            onChange={(value) => handleFilterChange(value, 'selectedCoordinator')}
            value={filters.selectedCoordinator}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {coordinators.map((coord) => (
              <Option key={coord} value={coord}>{coord}</Option>
            ))}
          </Select>

          <Select
            style={{ minWidth: 190 }}
            placeholder="Posible graduación"
            allowClear
            onChange={(value) => handleFilterChange(value, 'selectedGraduation')}
            value={filters.selectedGraduation}
          >
            <Option value="candidato">Candidatos a grado</Option>
            <Option value="no_candidato">No candidatos</Option>
          </Select>

          <Select
            style={{ minWidth: 180 }}
            placeholder="Fecha inscripción"
            allowClear
            onChange={(value) => handleFilterChange(value, 'predefinedDate')}
            value={filters.predefinedDate}
          >
            <Option value="week">Última semana</Option>
            <Option value="month">Último mes</Option>
            <Option value="quarter">Últimos 3 meses</Option>
            <Option value="all">Todo</Option>
          </Select>

          <RangePicker
            style={{ minWidth: 260 }}
            onChange={(dates) => handleFilterChange(dates, 'dateRange')}
            value={filters.dateRange}
            format="DD/MM/YYYY"
            placeholder={['Fecha inicio', 'Fecha fin']}
            disabled={filters.predefinedDate !== null && filters.predefinedDate !== 'all'}
          />

          <Input
            placeholder="Buscar nombre, documento, celular..."
            prefix={<SearchOutlined style={{ color: "#1a1a1a" }} />}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            style={{ minWidth: 240, flex: "1 1 240px" }}
          />
        </div>
      </div>

      {/* Tabla */}
      <Spin spinning={loading} tip="Cargando estudiantes...">
        <Table
          className="students-table"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => record.id}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `Mostrando ${range[0]}-${range[1]} de ${total} estudiantes`,
            style: { padding: '12px 20px', margin: 0 },
          }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: 'No hay estudiantes disponibles que coincidan con los filtros.',
          }}
          onRow={(record) => ({
            onClick: () => setDetailModal({ open: true, studentId: record.id }),
          })}
          rowClassName="cursor-pointer"
          size="middle"
        />
      </Spin>

      {/* Modal razón de archivado */}
      <Modal
        open={archiveModal.open}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ExclamationCircleOutlined style={{ color: "#fa8c16", fontSize: 18 }} />
            <span>Archivar estudiante</span>
          </div>
        }
        okText="Archivar"
        cancelText="Cancelar"
        okButtonProps={{
          style: { background: "#fa8c16", borderColor: "#fa8c16" },
          disabled: !archiveReason || (archiveReason === "Otro motivo" && !archiveCustomReason.trim()),
          loading: archiving,
        }}
        onOk={confirmArchive}
        onCancel={() => setArchiveModal({ open: false, studentId: null, studentName: "" })}
      >
        <p style={{ color: "#595959", marginBottom: 16 }}>
          ¿Por qué vas a archivar a <strong>{archiveModal.studentName}</strong>?
        </p>

        <Radio.Group
          value={archiveReason}
          onChange={(e) => {
            setArchiveReason(e.target.value);
            setArchiveCustomReason("");
          }}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {ARCHIVE_REASONS.map((reason) => (
              <Radio
                key={reason}
                value={reason}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: archiveReason === reason ? "1px solid #fa8c16" : "1px solid #f0f0f0",
                  background: archiveReason === reason ? "#fff7e6" : "#fafafa",
                  width: "100%",
                  transition: "all 0.2s",
                }}
              >
                {reason}
              </Radio>
            ))}
          </Space>
        </Radio.Group>

        {archiveReason === "Otro motivo" && (
          <Input.TextArea
            style={{ marginTop: 12, borderRadius: 8 }}
            placeholder="Describe el motivo..."
            rows={3}
            maxLength={300}
            showCount
            value={archiveCustomReason}
            onChange={(e) => setArchiveCustomReason(e.target.value)}
            autoFocus
          />
        )}
      </Modal>

      {/* Modal mover a programa */}
      <Modal
        open={moveModal}
        title={`Mover ${selectedRowKeys.length} estudiante${selectedRowKeys.length !== 1 ? 's' : ''} a otro programa`}
        okText="Mover"
        cancelText="Cancelar"
        onOk={handleBulkMove}
        onCancel={() => setMoveModal(false)}
        confirmLoading={movingStudents}
        okButtonProps={{ style: { background: '#155153', borderColor: '#155153' }, disabled: !moveProgramaId }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Programa destino</div>
          <Select
            style={{ width: '100%' }}
            placeholder="Selecciona el programa..."
            value={moveProgramaId}
            onChange={setMoveProgramaId}
            showSearch
            filterOption={(input, opt) =>
              (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={programas.map(p => ({ value: p.id, label: p.nombre }))}
          />
        </div>
        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Tipo de movimiento</div>
          <Radio.Group value={moveReplace} onChange={e => setMoveReplace(e.target.value)}>
            <Space direction="vertical">
              <Radio value={true}>
                <span style={{ fontWeight: 500 }}>Reemplazar</span>
                <span style={{ color: '#888', fontSize: 12, display: 'block', paddingLeft: 24 }}>
                  El nuevo programa reemplaza todos los programas actuales del estudiante.
                </span>
              </Radio>
              <Radio value={false}>
                <span style={{ fontWeight: 500 }}>Agregar</span>
                <span style={{ color: '#888', fontSize: 12, display: 'block', paddingLeft: 24 }}>
                  El nuevo programa se agrega sin quitar los programas que ya tiene.
                </span>
              </Radio>
            </Space>
          </Radio.Group>
        </div>
      </Modal>

      <StudentDetailModal
        open={detailModal.open}
        studentId={detailModal.studentId}
        onClose={() => setDetailModal({ open: false, studentId: null })}
      />

      <style>{`
        .ant-table-cell {
          padding: 10px 12px !important;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .students-table .ant-table-thead > tr > th {
          background-color: #dbeafe !important;
          color: #1e3a8a !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          text-transform: none !important;
          letter-spacing: 0.1px;
          border-bottom: none !important;
        }
        .students-table .ant-table-thead > tr > th.ant-table-column-has-sorters:hover,
        .students-table .ant-table-thead > tr > th.ant-table-column-sort {
          background-color: #bfdbfe !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #f0f7f7 !important;
        }
        .truncate-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          max-width: 100%;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .ant-table-tbody > tr {
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default StudentTable;







