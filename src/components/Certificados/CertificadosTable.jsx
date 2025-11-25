import React, { useState, useMemo } from 'react';
import { Table, Select, Space, Spin, message, Button, Popconfirm, Tooltip, Tag, Typography, Card, Row, Col, Grid, Divider } from 'antd'; // Importar Grid y Divider
import { DeleteOutlined, DollarOutlined, DownloadOutlined, RiseOutlined, EditOutlined, CalendarOutlined, UserOutlined, BankOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/es';
import axios from 'axios';
import jsPDF from 'jspdf';

moment.locale('es');
const { useBreakpoint } = Grid; // Hook para detectar tamaño de pantalla
const { Text, Title } = Typography;
const { Option } = Select;

// --- (Formatter y Helper functions se mantienen igual) ---
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currentYear = moment().year();
const yearOptions = [];
for (let i = 5; i > 0; i--) yearOptions.push(currentYear - i);
yearOptions.push(currentYear);
for (let i = 1; i <= 2; i++) yearOptions.push(currentYear + i);
const monthNames = moment.months();

const CertificadosTable = ({ data, allVentas, allEgresos, loading, onRefresh, userName, type, onEdit }) => {
  // Hook de responsividad: screens.xs, screens.md, etc.
  const screens = useBreakpoint();
  // Definimos "isMobile" si la pantalla es menor a 'md' (tablet vertical)
  const isMobile = !screens.md;

  const [filters, setFilters] = useState({
    selectedYear: moment().year(),
    selectedUIMonth: moment().month(),
    selectedAccount: null,
  });

  const currentSelectedMoment = useMemo(() => {
    return moment({ year: filters.selectedYear, month: filters.selectedUIMonth });
  }, [filters.selectedYear, filters.selectedUIMonth]);

  // --- LOGICA DE DATOS (Sin cambios) ---
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const dateField = type === 'ventas' ? 'createdAt' : 'fecha';
        if (!item[dateField] || !moment(item[dateField]).isValid()) return false;

        const itemDate = moment(item[dateField]);
        const { selectedYear, selectedUIMonth, selectedAccount } = filters;
        const monthMatch = itemDate.year() === selectedYear && itemDate.month() === selectedUIMonth;
        const accountMatch = selectedAccount ? item.cuenta === selectedAccount : true;
        return monthMatch && accountMatch;
      })
      .sort((a, b) => moment(b[type === 'ventas' ? 'createdAt' : 'fecha']).unix() - moment(a[type === 'ventas' ? 'createdAt' : 'fecha']).unix());
  }, [data, filters, type]);

  const totalVentas = useMemo(() => { /* ... tu lógica existente ... */
    return allVentas.filter(i => {
      const d = moment(i.createdAt);
      return d.year() === filters.selectedYear && d.month() === filters.selectedUIMonth && (!filters.selectedAccount || i.cuenta === filters.selectedAccount);
    }).reduce((s, c) => s + (c.valor || 0), 0);
  }, [allVentas, filters]);

  const totalEgresos = useMemo(() => { /* ... tu lógica existente ... */
    return allEgresos.filter(i => {
      const d = moment(i.fecha);
      return d.year() === filters.selectedYear && d.month() === filters.selectedUIMonth && (!filters.selectedAccount || i.cuenta === filters.selectedAccount);
    }).reduce((s, e) => s + (e.valor || 0), 0);
  }, [allEgresos, filters]);

  const balance = useMemo(() => totalVentas - totalEgresos, [totalVentas, totalEgresos]);

  // --- PDF HANDLER (Sin cambios) ---
  const handleDownloadPDF = () => { /* ... tu lógica existente ... */ };

  // --- ACTIONS HANDLERS ---
  const handleDeleteItem = async (id) => {
    try {
      const endpoint = type === 'ventas' ? 'clients' : 'egresos';
      await axios.delete(`https://backendcoalianza.vercel.app/api/v1/${endpoint}/${id}`);
      message.success('Eliminado correctamente');
      onRefresh();
    } catch (error) { message.error('Error al eliminar'); }
  };
  const handleYearChange = (y) => setFilters(p => ({ ...p, selectedYear: y }));
  const handleUIMonthChange = (m) => setFilters(p => ({ ...p, selectedUIMonth: m }));
  const handleAccountChange = (v) => setFilters(p => ({ ...p, selectedAccount: v || null }));

  // =================================================================
  // ESTRATEGIA RESPONSIVA DE COLUMNAS
  // =================================================================

  // 1. Columnas normales para Escritorio
  const desktopColumns = type === 'ventas' ? [
    { title: 'Fecha', dataIndex: 'createdAt', width: 110, render: (_, r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-CO') : 'N/A' },
    { title: 'Nombre', dataIndex: 'nombre', render: (_, r) => <b>{`${r.nombre?.trim() || ''} ${r.apellido?.trim() || ''}`}</b> },
    { title: 'Doc', dataIndex: 'numeroDeDocumento' },
    { title: 'Valor', dataIndex: 'valor', render: (v) => <Text type="success">{currencyFormatter.format(v)}</Text> },
    { title: 'Cuenta', dataIndex: 'cuenta', render: (c) => <Tag color="geekblue">{c}</Tag> },
    { title: 'Acciones', key: 'x', render: (_, r) => renderActions(r) }
  ] : [
    { title: 'Fecha', dataIndex: 'fecha', width: 110, render: (d) => moment(d).format('DD/MM/YYYY') },
    { title: 'Descripción', dataIndex: 'descripcion', render: (t) => <b>{t}</b> },
    { title: 'Valor', dataIndex: 'valor', render: (v) => <Text type="danger">{currencyFormatter.format(v)}</Text> },
    { title: 'Cuenta', dataIndex: 'cuenta', render: (c) => <Tag color="geekblue">{c}</Tag> },
    { title: 'Acciones', key: 'x', render: (_, r) => renderActions(r) }
  ];

  // 2. Columna única para Móvil (Renderiza una tarjeta compacta)
  const mobileColumns = [
    {
      title: 'Detalles',
      key: 'mobile-card',
      render: (record) => {
        const title = type === 'ventas'
          ? `${record.nombre?.trim()} ${record.apellido?.trim()}`
          : record.descripcion;
        const date = type === 'ventas' ? record.createdAt : record.fecha;
        const dateStr = date ? moment(date).format('DD MMM YYYY') : 'N/A';
        const color = type === 'ventas' ? '#389e0d' : '#cf1322'; // Verde o Rojo

        return (
          <div style={{ padding: '8px 0' }}>
            {/* Encabezado de la fila móvil */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ fontSize: 15, maxWidth: '70%' }} ellipsis>{title}</Text>
              <Text strong style={{ color: color, fontSize: 15 }}>
                {currencyFormatter.format(record.valor || 0)}
              </Text>
            </div>

            {/* Detalles secundarios */}
            <Space split={<Divider type="vertical" />} style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 8 }}>
              <span><CalendarOutlined /> {dateStr}</span>
              <Tag style={{ margin: 0 }}>{record.cuenta || 'Efectivo'}</Tag>
            </Space>

            {/* Botones de acción estirados */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Button
                icon={<EditOutlined />}
                size="small"
                block
                onClick={() => onEdit(record)}
              >
                Editar
              </Button>
              <Popconfirm title="¿Eliminar?" onConfirm={() => handleDeleteItem(record._id)} okText="Sí" cancelText="No">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  block
                >
                  Eliminar
                </Button>
              </Popconfirm>
            </div>
          </div>
        );
      },
    },
  ];

  // Función auxiliar para renderizar acciones en escritorio
  const renderActions = (record) => (
    <Space>
      <Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)} /></Tooltip>
      <Popconfirm title="¿Borrar?" onConfirm={() => handleDeleteItem(record._id)}><Button danger type="link" icon={<DeleteOutlined />} /></Popconfirm>
    </Space>
  );

  return (
    <div className="p-4" style={{ maxWidth: '100%', overflowX: 'hidden' }}>

      {/* --- SECCIÓN 1: FILTROS (Mismo que antes) --- */}
      <Row gutter={[12, 12]} className="mb-4">
        {/* Filtros visualmente mejorados para móvil */}
        <Col xs={24} md={18}>
          <Space wrap style={{ width: '100%' }}>
            <Select placeholder="Cuenta" allowClear onChange={handleAccountChange} value={filters.selectedAccount} style={{ width: 140 }}>
              <Option value="Nequi">Nequi</Option>
              <Option value="Daviplata">Daviplata</Option>
              <Option value="Bancolombia">Bancolombia</Option>
            </Select>
            <Select value={filters.selectedYear} onChange={handleYearChange} style={{ width: 90 }}>
              {yearOptions.map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
            <Select value={filters.selectedUIMonth} onChange={handleUIMonthChange} style={{ width: 120 }}>
              {monthNames.map((n, i) => <Option key={i} value={i}>{n.charAt(0).toUpperCase() + n.slice(1)}</Option>)}
            </Select>
          </Space>
        </Col>
        <Col xs={24} md={6} style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPDF}>PDF</Button>
        </Col>
      </Row>

      {/* --- SECCIÓN 2: KPI CARDS (Resumen) --- */}
      {/* Usamos un grid ajustado para que en móvil ocupen el 100% */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
            <Text type="secondary">Ingresos</Text>
            <Title level={4} style={{ margin: 0, color: '#389e0d' }}>{currencyFormatter.format(totalVentas)}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Text type="secondary">Egresos</Text>
            <Title level={4} style={{ margin: 0, color: '#cf1322' }}>{currencyFormatter.format(totalEgresos)}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderLeft: `4px solid ${balance < 0 ? '#ff4d4f' : '#1890ff'}` }}>
            <Text type="secondary">Balance</Text>
            <Title level={4} style={{ margin: 0, color: balance < 0 ? '#cf1322' : '#096dd9' }}>{currencyFormatter.format(balance)}</Title>
          </Card>
        </Col>
      </Row>

      {/* --- SECCIÓN 3: TABLA INTELIGENTE --- */}
      <Spin spinning={loading}>
        <Table
          // AQUÍ ESTÁ LA MAGIA: Si es móvil, usa mobileColumns, sino desktopColumns
          columns={isMobile ? mobileColumns : desktopColumns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          // Ocultamos el encabezado gris en móvil para ganar espacio
          showHeader={!isMobile}
          size={isMobile ? "middle" : "small"}
          locale={{ emptyText: 'No hay datos' }}
          bordered={!isMobile} // Quitamos bordes en móvil para look más limpio
        />
      </Spin>
    </div>
  );
};

export default CertificadosTable;