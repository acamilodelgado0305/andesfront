import React, {
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Table,
  Input,
  Button,
  Typography,
  message,
  Space,
  Spin,
  Card,
  Select,
  Tag,
  Popconfirm,
  DatePicker,
  Tooltip,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  DeleteOutlined,
  WhatsAppOutlined,
  EditOutlined,
  UserOutlined,
  FilePdfOutlined,
  EyeOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import moment from "moment";
import axios from "axios";
import { getStudentById } from "../../services/student/studentService";
import { generateGradeReportPDF } from "../Utilidades/generateGradeReportPDF";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const StudentTable = ({
  onDelete,
  students = [],
  loading = false,
}) => {
  const [filters, setFilters] = useState({
    searchText: {},
    selectedStatus: null,
    selectedCoordinator: null,
    dateRange: null,
    predefinedDate: null,
    selectedGraduation: null, // ✅ nuevo filtro
  });

  const navigate = useNavigate();

  // Coordinadores únicos
  const coordinators = useMemo(() => {
    return [
      ...new Set(
        students.map((s) => s.coordinador_nombre).filter(Boolean)
      ),
    ];
  }, [students]);

  // Función para logica de estilos de coordinador
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

  // Datos filtrados
  const filteredData = useMemo(() => {
    if (!Array.isArray(students)) return [];

    return students
      .filter((student) => {
        const {
          searchText,
          selectedStatus,
          selectedCoordinator,
          dateRange,
          predefinedDate,
          selectedGraduation,
        } = filters;

        // Filtro por texto (por columna)
        const searchMatch = Object.keys(searchText).every((key) => {
          if (!searchText[key]) return true;

          if (key === "nombre_programa") {
            // En este componente estamos usando programa_nombre directo
            return student.programa_nombre
              ? student.programa_nombre
                  .toLowerCase()
                  .includes(searchText[key])
              : false;
          }

          const value = student[key];
          return value
            ? value.toString().toLowerCase().includes(searchText[key])
            : false;
        });

        // Filtro por estado (activo/inactivo)
        const statusMatch = selectedStatus
          ? student.activo === (selectedStatus === "activo")
          : true;

        // Filtro por coordinador
        const coordinatorMatch = selectedCoordinator
          ? student.coordinador_nombre === selectedCoordinator
          : true;

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

        // ✅ Filtro por posible graduación
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
          statusMatch &&
          coordinatorMatch &&
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

  const totalStudents = filteredData.length;
  const activeStudents = filteredData.filter((s) => s.activo).length;
  const graduationCandidates = filteredData.filter(
    (s) => s.posible_graduacion
  ).length;

  // Descargar boletín
  const handleDownloadGrades = async (studentId) => {
    try {
      const [studentData, gradesResponse] = await Promise.all([
        getStudentById(studentId),
        axios.get(
          `https://clasit-backend-api-570877385695.us-central1.run.app/api/grades/students/${studentId}`
        ),
      ]);
      const grades = gradesResponse.data;
      generateGradeReportPDF(studentData, grades, studentId);
    } catch (err) {
      console.error("Error downloading grades:", err);
      message.error("Error al descargar el boletín");
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      title: "Documento",
      key: "documento",
      render: (_, record) => (
        <span
          className="truncate-text"
          title={`${record.tipo_documento} ${
            record.numero_documento || "No especificado"
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
      title: "Programa",
      dataIndex: "programa_nombre",
      key: "programa_nombre",
      render: (programaNombre, record) =>
        programaNombre ? (
          <Tag color="blue" key={record.programa_id}>
            {programaNombre}
          </Tag>
        ) : (
          <Tag color="volcano">Sin programa</Tag>
        ),
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
      onFilter: (value, record) =>
        record.programa_nombre
          ? record.programa_nombre
              .toLowerCase()
              .includes(value.toLowerCase())
          : false,
    },
    {
      title: "Estado",
      key: "estados",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.activo ? "green" : "red"}>
            {record.activo ? "Activo" : "Inactivo"}
          </Tag>
          <Tag color={record.estado_matricula ? "green" : "gold"}>
            {record.estado_matricula
              ? "Matrícula Paga"
              : "Matrícula Pendiente"}
          </Tag>
          {typeof record.posible_graduacion === "boolean" && (
            <Tag color={record.posible_graduacion ? "geekblue" : "default"}>
              {record.posible_graduacion
                ? "Candidato a grado"
                : "No candidato"}
            </Tag>
          )}
        </Space>
      ),
      filters: [
        { text: "Activo", value: "activo" },
        { text: "Inactivo", value: "inactivo" },
      ],
      onFilter: (value, record) =>
        record.activo === (value === "activo"),
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
      title: "Fechas",
      key: "fechas",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tooltip
            title={`Inscripción: ${
              record.fecha_inscripcion
                ? moment(record.fecha_inscripcion).format(
                    "DD/MM/YYYY"
                  )
                : "No especificado"
            }`}
          >
            <Text>
              Insc.:{" "}
              {record.fecha_inscripcion
                ? moment(record.fecha_inscripcion).format("DD/MM/YY")
                : "N/A"}
            </Text>
          </Tooltip>
          {record.fecha_graduacion && (
            <Tooltip
              title={`Graduación: ${moment(
                record.fecha_graduacion
              ).format("DD/MM/YYYY")}`}
            >
              <Text>
                Grad.:{" "}
                {moment(record.fecha_graduacion).format("DD/MM/YY")}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 190,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/inicio/students/view/${record.id}`);
              }}
            />
          </Tooltip>

          <Tooltip title="Enviar WhatsApp">
            <Button
              type="text"
              icon={<WhatsAppOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                let phoneNumber =
                  record.telefono_whatsapp?.replace(/\D/g, "") ||
                  record.telefono_llamadas?.replace(/\D/g, "");

                if (!phoneNumber) {
                  message.error(
                    "No hay número de teléfono disponible para WhatsApp"
                  );
                  return;
                }

                if (!phoneNumber.startsWith("57")) {
                  phoneNumber = `57${phoneNumber}`;
                }

                window.open(
                  `https://wa.me/${phoneNumber}`,
                  "_blank"
                );
              }}
            />
          </Tooltip>

          <Tooltip title="Descargar Boletín">
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadGrades(record.id);
              }}
            />
          </Tooltip>

          <Popconfirm
            title="Eliminar estudiante"
            description="¿Seguro que deseas eliminar este estudiante? Esta acción no se puede deshacer."
            okText="Sí, eliminar"
            cancelText="Cancelar"
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Tooltip title="Eliminar estudiante">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* Filtros superiores */}
      <Space
        direction="vertical"
        size="large"
        className="mb-6 w-full"
      >
        <Space
          wrap
          className="w-full justify-start items-center"
        >
          <Select
            style={{ width: 150 }}
            placeholder="Estado"
            allowClear
            onChange={(value) =>
              handleFilterChange(value, "selectedStatus")
            }
            value={filters.selectedStatus}
          >
            <Option value="activo">Activo</Option>
            <Option value="inactivo">Inactivo</Option>
          </Select>

          <Select
            style={{ width: 200 }}
            placeholder="Coordinador"
            allowClear
            onChange={(value) =>
              handleFilterChange(value, "selectedCoordinator")
            }
            value={filters.selectedCoordinator}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children || "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {coordinators.map((coord) => (
              <Option key={coord} value={coord}>
                {coord}
              </Option>
            ))}
          </Select>

          <Select
            style={{ width: 220 }}
            placeholder="Posible graduación"
            allowClear
            onChange={(value) =>
              handleFilterChange(value, "selectedGraduation")
            }
            value={filters.selectedGraduation}
          >
            <Option value="candidato">Candidatos a grado</Option>
            <Option value="no_candidato">No candidatos</Option>
          </Select>

          <Select
            style={{ width: 200 }}
            placeholder="Fecha inscripción"
            allowClear
            onChange={(value) =>
              handleFilterChange(value, "predefinedDate")
            }
            value={filters.predefinedDate}
          >
            <Option value="week">Última semana</Option>
            <Option value="month">Último mes</Option>
            <Option value="quarter">Últimos 3 meses</Option>
            <Option value="all">Todo</Option>
          </Select>

          <RangePicker
            style={{ width: 300 }}
            onChange={(dates) =>
              handleFilterChange(dates, "dateRange")
            }
            value={filters.dateRange}
            format="DD/MM/YYYY"
            placeholder={["Fecha inicio", "Fecha fin"]}
            disabled={
              filters.predefinedDate !== null &&
              filters.predefinedDate !== "all"
            }
          />
        </Space>

        {/* Resumen métricas */}
        <Space
          size="middle"
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Card
            style={{
              width: 260,
              borderRadius: 8,
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.06)",
              border: "1px solid #d9f7be",
              backgroundColor: "#f6ffed",
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <EditOutlined
                style={{ fontSize: 32, color: "#155153" }}
              />
              <div>
                <Text style={{ fontSize: 14, color: "#595959" }}>
                  Total Estudiantes
                </Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: "#155153",
                    fontWeight: "bold",
                  }}
                >
                  {totalStudents}
                </Title>
              </div>
            </Space>
          </Card>

          <Card
            style={{
              width: 260,
              borderRadius: 8,
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e6f4ff",
              backgroundColor: "#f0f5ff",
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <UserOutlined
                style={{ fontSize: 32, color: "#1d39c4" }}
              />
              <div>
                <Text style={{ fontSize: 14, color: "#595959" }}>
                  Estudiantes Activos
                </Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: "#1d39c4",
                    fontWeight: "bold",
                  }}
                >
                  {activeStudents}
                </Title>
              </div>
            </Space>
          </Card>

          <Card
            style={{
              width: 260,
              borderRadius: 8,
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e6f7ff",
              backgroundColor: "#e6f7ff",
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <CheckCircleOutlined
                style={{ fontSize: 32, color: "#08979c" }}
              />
              <div>
                <Text style={{ fontSize: 14, color: "#595959" }}>
                  Candidatos a grado
                </Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: "#08979c",
                    fontWeight: "bold",
                  }}
                >
                  {graduationCandidates}
                </Title>
              </div>
            </Space>
          </Card>
        </Space>
      </Space>

      <Spin spinning={loading} tip="Cargando estudiantes...">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => record.id}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total, range) =>
              `Mostrando ${range[0]}-${range[1]} de ${total} estudiantes`,
          }}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText:
              "No hay estudiantes disponibles que coincidan con los filtros.",
          }}
          onRow={(record) => ({
            onClick: () =>
              navigate(`/inicio/students/view/${record.id}`),
          })}
          rowClassName="cursor-pointer"
          bordered
          size="middle"
        />
      </Spin>

      <style jsx>{`
        .ant-table-cell {
          padding: 10px 8px !important;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
      `}</style>
    </div>
  );
};

export default StudentTable;
