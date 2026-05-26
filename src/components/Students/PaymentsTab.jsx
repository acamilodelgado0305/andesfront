import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table, Input, Button, Tag, Space, Spin, Select, DatePicker,
  Typography, Tooltip, message, Progress,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, DollarOutlined, UserOutlined, CalendarOutlined,
} from "@ant-design/icons";
import { getAllPayments, getStudentsWithoutPayment } from "../../services/payment/paymentService";
import moment from "moment";
import dayjs from "dayjs";
import "moment/locale/es";

moment.locale("es");

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const METHOD_COLORS = {
  Efectivo:      "green",
  Transferencia: "blue",
  Tarjeta:       "purple",
  Nequi:         "magenta",
  Daviplata:     "cyan",
};

const QUICK_RANGES = [
  { label: "Hoy",    range: () => [moment().startOf("day"),   moment().endOf("day")]   },
  { label: "Ayer",   range: () => [moment().subtract(1,"day").startOf("day"), moment().subtract(1,"day").endOf("day")] },
  { label: "Semana", range: () => [moment().startOf("week"),  moment().endOf("week")]  },
  { label: "Mes",    range: () => [moment().startOf("month"), moment().endOf("month")] },
  { label: "Año",    range: () => [moment().startOf("year"),  moment().endOf("year")]  },
];

const PaymentsTab = () => {
  const [dateRange, setDateRange] = useState([
    moment().startOf("month"),
    moment().endOf("month"),
  ]);

  const [payments,         setPayments]         = useState([]);
  const [sinPagos,         setSinPagos]         = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [viewMode,         setViewMode]         = useState("con"); // "con" | "sin"
  const [search,            setSearch]            = useState("");
  const [filterMethod,      setFilterMethod]      = useState(null);
  const [filterType,        setFilterType]        = useState(null);
  const [filterCoordinator, setFilterCoordinator] = useState(null);
  const [filterPrograma,    setFilterPrograma]    = useState(null);

  const fechaInicio = dateRange[0].format("YYYY-MM-DD");
  const fechaFin    = dateRange[1].format("YYYY-MM-DD");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const [conData, sinData] = await Promise.all([
        getAllPayments({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        getStudentsWithoutPayment({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      ]);
      setPayments(Array.isArray(conData) ? conData : []);
      setSinPagos(Array.isArray(sinData) ? sinData : []);
    } catch {
      message.error("No se pudo cargar los pagos.");
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const applyQuickRange = (rangeFn) => {
    const [start, end] = rangeFn();
    setDateRange([start, end]);
  };

  const activeQuick = QUICK_RANGES.findIndex(({ range }) => {
    const [s, e] = range();
    return dateRange[0].isSame(s, "day") && dateRange[1].isSame(e, "day");
  });

  const pickerValue =
    dateRange?.length === 2
      ? [dayjs(dateRange[0].toDate()), dayjs(dateRange[1].toDate())]
      : null;

  // Opciones únicas para filtros (combinando ambas vistas)
  const methodOptions      = useMemo(() =>
    [...new Set(payments.map((p) => p.metodo_pago).filter(Boolean))], [payments]);
  const typeOptions        = useMemo(() =>
    [...new Set(payments.map((p) => p.tipo_pago_nombre).filter(Boolean))], [payments]);
  const coordinatorOptions = useMemo(() => {
    const fromPagos = payments.map((p) => p.coordinador_nombre);
    const fromSin   = sinPagos.map((s) => s.coordinador_nombre);
    return [...new Set([...fromPagos, ...fromSin].filter(Boolean))].sort();
  }, [payments, sinPagos]);
  const programaOptions    = useMemo(() => {
    const fromPagos = payments.map((p) => p.programa_nombre);
    const fromSin   = sinPagos.flatMap((s) =>
      Array.isArray(s.programas) ? s.programas.map((p) => p.nombre ?? p) : []
    );
    return [...new Set([...fromPagos, ...fromSin].filter(Boolean))].sort();
  }, [payments, sinPagos]);

  // Filtrado: con pagos
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return payments.filter((p) => {
      const fullName = `${p.estudiante_nombre || ""} ${p.estudiante_apellido || ""}`.toLowerCase();
      const matchSearch = !term ||
        fullName.includes(term) ||
        (p.tipo_pago_nombre || "").toLowerCase().includes(term) ||
        (p.referencia_transaccion || "").toLowerCase().includes(term) ||
        (p.programa_nombre || "").toLowerCase().includes(term) ||
        (p.coordinador_nombre || "").toLowerCase().includes(term);
      const matchMethod      = !filterMethod      || p.metodo_pago        === filterMethod;
      const matchType        = !filterType        || p.tipo_pago_nombre   === filterType;
      const matchCoordinator = !filterCoordinator || p.coordinador_nombre === filterCoordinator;
      const matchPrograma    = !filterPrograma    || p.programa_nombre    === filterPrograma;
      return matchSearch && matchMethod && matchType && matchCoordinator && matchPrograma;
    });
  }, [payments, search, filterMethod, filterType, filterCoordinator, filterPrograma]);

  // Filtrado: sin pagos
  const filteredSin = useMemo(() => {
    const term = search.toLowerCase().trim();
    return sinPagos.filter((s) => {
      const fullName = `${s.nombre || ""} ${s.apellido || ""}`.toLowerCase();
      const programasStr = (Array.isArray(s.programas) ? s.programas.map((p) => p.nombre ?? p) : []).join(" ").toLowerCase();
      const matchSearch = !term ||
        fullName.includes(term) ||
        programasStr.includes(term) ||
        (s.coordinador_nombre || "").toLowerCase().includes(term);
      const matchCoordinator = !filterCoordinator || s.coordinador_nombre === filterCoordinator;
      const matchPrograma    = !filterPrograma    ||
        (Array.isArray(s.programas) && s.programas.some((p) => (p.nombre ?? p) === filterPrograma));
      return matchSearch && matchCoordinator && matchPrograma;
    });
  }, [sinPagos, search, filterCoordinator, filterPrograma]);

  const totalMonto = useMemo(() =>
    filtered.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0), [filtered]);

  const byMethod = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      const m = p.metodo_pago || "Sin método";
      map[m] = (map[m] || 0) + parseFloat(p.monto || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const columns = [
    {
      title: "Estudiante",
      key: "estudiante",
      render: (_, r) => (
        <Space>
          <UserOutlined style={{ color: "#155153" }} />
          <Text strong>{r.estudiante_nombre} {r.estudiante_apellido}</Text>
        </Space>
      ),
      sorter: (a, b) =>
        `${a.estudiante_nombre} ${a.estudiante_apellido}`.localeCompare(
          `${b.estudiante_nombre} ${b.estudiante_apellido}`
        ),
    },
    {
      title: "Coordinador",
      dataIndex: "coordinador_nombre",
      key: "coordinador_nombre",
      render: (val) => val
        ? <Tag color="orange">{val}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: "Programa",
      dataIndex: "programa_nombre",
      key: "programa_nombre",
      render: (val) => val
        ? <Tag color="default">{val}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: "Tipo de Pago",
      dataIndex: "tipo_pago_nombre",
      key: "tipo_pago_nombre",
      render: (val) => <Tag color="geekblue">{val || "—"}</Tag>,
    },
    {
      title: "Monto",
      dataIndex: "monto",
      key: "monto",
      render: (val) => (
        <Text strong style={{ color: "#155153" }}>
          ${parseFloat(val || 0).toLocaleString("es-CO")}
        </Text>
      ),
      sorter: (a, b) => parseFloat(a.monto) - parseFloat(b.monto),
    },
    {
      title: "Método",
      dataIndex: "metodo_pago",
      key: "metodo_pago",
      render: (val) => (
        <Tag color={METHOD_COLORS[val] || "default"}>{val || "—"}</Tag>
      ),
    },
    {
      title: "Fecha",
      key: "fecha",
      render: (_, r) => (
        <Space>
          <CalendarOutlined style={{ color: "#8c8c8c" }} />
          <Text>{r.fecha_pago ? moment(r.fecha_pago).format("DD/MM/YYYY") : "—"}</Text>
        </Space>
      ),
      sorter: (a, b) => moment(a.fecha_pago).unix() - moment(b.fecha_pago).unix(),
      defaultSortOrder: "descend",
    },
    {
      title: "Referencia",
      dataIndex: "referencia_transaccion",
      key: "referencia_transaccion",
      render: (val) => val
        ? <Text code style={{ fontSize: 12 }}>{val}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: "Progreso",
      key: "progreso",
      width: 180,
      render: (_, r) => {
        const total    = parseFloat(r.programa_monto_total || 0);
        const abonado  = parseFloat(r.total_abonado || 0);
        if (!total) return <Text type="secondary" style={{ fontSize: 12 }}>Sin programa</Text>;
        const pct      = Math.min(100, Math.round((abonado / total) * 100));
        const pagado   = pct >= 100;
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
  ];

  const columnsSinPagos = [
    {
      title: "Estudiante",
      key: "estudiante",
      render: (_, r) => (
        <Space>
          <UserOutlined style={{ color: "#d46b08" }} />
          <Text strong>{r.nombre} {r.apellido}</Text>
        </Space>
      ),
      sorter: (a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`),
    },
    {
      title: "Coordinador",
      dataIndex: "coordinador_nombre",
      key: "coordinador_nombre",
      render: (val) => val
        ? <Tag color="orange">{val}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: "Programas",
      dataIndex: "programas",
      key: "programas",
      render: (val) => {
        const lista = Array.isArray(val) ? val : [];
        return lista.length
          ? <Space wrap>{lista.map((p) => <Tag key={p.nombre ?? p} color="default">{p.nombre ?? p}</Tag>)}</Space>
          : <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Progreso",
      dataIndex: "programas",
      key: "progreso",
      width: 200,
      render: (val) => {
        const lista = Array.isArray(val) ? val.filter((p) => p.monto_total > 0) : [];
        if (!lista.length) return <Text type="secondary" style={{ fontSize: 12 }}>Sin programa</Text>;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lista.map((p) => {
              const pct    = Math.min(100, Math.round((p.total_abonado / p.monto_total) * 100));
              const pagado = pct >= 100;
              return (
                <Tooltip key={p.nombre} title={
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.nombre}</div>
                    <div>Abonado: <b>${Number(p.total_abonado).toLocaleString("es-CO")}</b></div>
                    <div>Total: <b>${Number(p.monto_total).toLocaleString("es-CO")}</b></div>
                    <div>Pendiente: <b>${Math.max(0, p.monto_total - p.total_abonado).toLocaleString("es-CO")}</b></div>
                  </div>
                }>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2, color: "#6b7280" }}>
                      <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress
                      percent={pct}
                      size="small"
                      showInfo={false}
                      status={pagado ? "success" : "exception"}
                      strokeColor={pagado ? "#52c41a" : "#f97316"}
                    />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Último pago",
      dataIndex: "ultimo_pago",
      key: "ultimo_pago",
      render: (val) => val
        ? <Text style={{ color: "#6b7280" }}>{moment(val).format("DD/MM/YYYY")}</Text>
        : <Tag color="red">Sin pagos</Tag>,
      sorter: (a, b) => {
        if (!a.ultimo_pago) return 1;
        if (!b.ultimo_pago) return -1;
        return moment(a.ultimo_pago).unix() - moment(b.ultimo_pago).unix();
      },
      defaultSortOrder: "ascend",
    },
  ];

  const quickBtnStyle = (active) => ({
    padding: "3px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    background: active ? "#155153" : "#fff",
    color:      active ? "#fff"    : "#6b7280",
    borderColor:active ? "#155153" : "#e5e7eb",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    lineHeight: "22px",
  });

  return (
    <div style={{ paddingTop: 16 }}>

      {/* ===== STAT CARDS ===== */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard label="Total pagos" value={filtered.length} color="#155153" />
        <StatCard
          label="Monto total"
          value={`$${totalMonto.toLocaleString("es-CO")}`}
          color="#0f9b0f"
          icon={<DollarOutlined />}
        />
        {byMethod.map(([method, monto]) => (
          <StatCard
            key={method}
            label={method}
            value={`$${monto.toLocaleString("es-CO")}`}
            color={METHOD_COLORS[method] ? undefined : "#595959"}
            tagColor={METHOD_COLORS[method]}
          />
        ))}
      </div>

      {/* ===== TABLA CON FILTROS ===== */}
      <div style={{
        background: "#fff", borderRadius: 14,
        border: "1px solid #e8ecf0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        {/* ── Fila 1: atajos de fecha + RangePicker + toggle vista ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          padding: "10px 16px", borderBottom: "1px solid #f0f0f0", background: "#fafafa",
        }}>
          {QUICK_RANGES.map(({ label, range }, i) => (
            <button key={label} onClick={() => applyQuickRange(range)} style={quickBtnStyle(activeQuick === i)}>
              {label}
            </button>
          ))}
          <RangePicker
            allowClear
            value={pickerValue}
            onChange={(values) => {
              if (values?.length === 2) {
                setDateRange([
                  moment(values[0].toDate()).startOf("day"),
                  moment(values[1].toDate()).endOf("day"),
                ]);
              } else {
                setDateRange([moment().startOf("month"), moment().endOf("month")]);
              }
            }}
            format="DD/MM/YY"
            size="small"
            style={{ borderRadius: 20 }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: 0, borderRadius: 20, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setViewMode("con")}
              style={{ padding: "3px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: viewMode === "con" ? "#155153" : "#fff", color: viewMode === "con" ? "#fff" : "#6b7280", transition: "all 0.15s" }}
            >
              Con pagos
            </button>
            <button
              onClick={() => setViewMode("sin")}
              style={{ padding: "3px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", borderLeft: "1px solid #e5e7eb", background: viewMode === "sin" ? "#d46b08" : "#fff", color: viewMode === "sin" ? "#fff" : "#6b7280", transition: "all 0.15s" }}
            >
              Sin pagos {sinPagos.length > 0 && <span style={{ background: viewMode === "sin" ? "rgba(255,255,255,0.3)" : "#ffd591", color: viewMode === "sin" ? "#fff" : "#d46b08", borderRadius: 10, padding: "0 6px", marginLeft: 4, fontSize: 11 }}>{sinPagos.length}</span>}
            </button>
          </div>
        </div>

        {/* ── Fila 2: filtros de búsqueda ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          padding: "10px 16px", borderBottom: "1px solid #e5e7eb",
          alignItems: "center", background: "#fff",
        }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
            {viewMode === "con" ? filtered.length : filteredSin.length} resultado{(viewMode === "con" ? filtered.length : filteredSin.length) !== 1 ? "s" : ""}
          </Text>
          <Input
            placeholder="Buscar..."
            prefix={<SearchOutlined style={{ color: "#1a1a1a" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="small"
            style={{ width: 180 }}
          />
          {viewMode === "con" && (
            <>
              <Select
                placeholder="Método"
                allowClear
                size="small"
                style={{ minWidth: 140 }}
                value={filterMethod}
                onChange={setFilterMethod}
              >
                {methodOptions.map((m) => <Option key={m} value={m}>{m}</Option>)}
              </Select>
              <Select
                placeholder="Tipo de pago"
                allowClear
                size="small"
                style={{ minWidth: 150 }}
                value={filterType}
                onChange={setFilterType}
              >
                {typeOptions.map((t) => <Option key={t} value={t}>{t}</Option>)}
              </Select>
            </>
          )}
          <Select
            placeholder="Coordinador"
            allowClear
            size="small"
            style={{ minWidth: 160 }}
            value={filterCoordinator}
            onChange={setFilterCoordinator}
            showSearch
            optionFilterProp="children"
          >
            {coordinatorOptions.map((c) => <Option key={c} value={c}>{c}</Option>)}
          </Select>
          <Select
            placeholder="Programa"
            allowClear
            size="small"
            style={{ minWidth: 160 }}
            value={filterPrograma}
            onChange={setFilterPrograma}
            showSearch
            optionFilterProp="children"
          >
            {programaOptions.map((p) => <Option key={p} value={p}>{p}</Option>)}
          </Select>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchPayments} loading={loading}>
            Recargar
          </Button>
        </div>

        <style>{`
          .payments-table .ant-table-thead > tr > th {
            background-color: #dbeafe !important;
            color: #1e3a8a;
            font-weight: 600;
            font-size: 13px;
            letter-spacing: 0.2px;
            text-transform: none !important;
          }
          .payments-table .ant-table-thead > tr > th.ant-table-column-has-sorters:hover,
          .payments-table .ant-table-thead > tr > th.ant-table-column-sort {
            background-color: #bfdbfe !important;
          }
        `}</style>
        <Spin spinning={loading} tip="Cargando...">
          {viewMode === "con" ? (
            <Table
              className="payments-table"
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                pageSizeOptions: ["15", "30", "50"],
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} pagos`,
                style: { padding: "12px 20px", margin: 0 },
              }}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: "No hay pagos en el período seleccionado." }}
            />
          ) : (
            <>
              {filteredSin.length > 0 && (
                <div style={{ padding: "10px 16px", background: "#fff7e6", borderBottom: "1px solid #ffd591", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#d46b08", fontWeight: 500 }}>
                  <span>⚠</span>
                  <span>{filteredSin.length} estudiante{filteredSin.length !== 1 ? "s" : ""} sin pago en el período seleccionado</span>
                </div>
              )}
              <Table
                className="payments-table"
                columns={columnsSinPagos}
                dataSource={filteredSin}
                rowKey="id"
                size="middle"
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  pageSizeOptions: ["15", "30", "50"],
                  showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} estudiantes`,
                  style: { padding: "12px 20px", margin: 0 },
                }}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Todos los estudiantes han reportado pago en este período. ✓" }}
              />
            </>
          )}
        </Spin>
      </div>
    </div>
  );
};

function StatCard({ label, value, color, tagColor, icon }) {
  const bg = tagColor
    ? { Efectivo: "#f6ffed", Transferencia: "#e6f4ff", Tarjeta: "#f9f0ff", Nequi: "#fff0f6", Daviplata: "#e6fffb" }[tagColor] || "#fafafa"
    : color;

  return (
    <div style={{
      background: bg, borderRadius: 12, padding: "12px 18px",
      display: "flex", flexDirection: "column", gap: 2, minWidth: 140,
      border: tagColor ? "1px solid #e5e7eb" : "none",
    }}>
      <Text style={{ fontSize: 11, color: tagColor ? "#6b7280" : "rgba(255,255,255,0.8)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3px" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: 700, color: tagColor ? "#1a1a1a" : "#fff" }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {value}
      </Text>
    </div>
  );
}

export default PaymentsTab;
