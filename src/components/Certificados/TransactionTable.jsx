import React, { useState, useMemo } from 'react';
import {
  Table, Input, Button, Tag, Space,
  Popconfirm, Select, DatePicker, message, Tooltip, Skeleton,
} from 'antd';
import {
  SearchOutlined, ClearOutlined, FilePdfOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import 'moment/locale/es';

import { deleteIngreso, deleteEgreso } from '../../services/controlapos/posService';
import useCurrency from '../../hooks/useCurrency';
import useIsMobile from '../../hooks/useIsMobile';

moment.locale('es');
const { Option } = Select;
const { RangePicker } = DatePicker;

// Atajos de fecha
const QUICK_RANGES = [
  { label: 'Hoy',    range: () => [moment().startOf('day'),   moment().endOf('day')]   },
  { label: 'Ayer',   range: () => [moment().subtract(1,'day').startOf('day'), moment().subtract(1,'day').endOf('day')] },
  { label: 'Semana', range: () => [moment().startOf('week'),  moment().endOf('week')]  },
  { label: 'Mes',    range: () => [moment().startOf('month'), moment().endOf('month')] },
  { label: 'Año',    range: () => [moment().startOf('year'),  moment().endOf('year')]  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Mobile card component
───────────────────────────────────────────────────────────────────────────── */
const MobileCard = ({ record, type, fmt, userMap, userName, getConcept, onEdit, onDelete }) => {
  const dateField = type === 'ingresos' ? 'createdAt' : 'fecha';
  const date      = record[dateField];
  const isIngreso = type === 'ingresos';

  const clientName = isIngreso
    ? (`${record.cliente_nombre || record.nombre || ''} ${record.cliente_apellido || record.apellido || ''}`.trim() || 'Venta General')
    : (record.descripcion || '-');

  const docInfo = isIngreso
    ? (record.cliente_documento
        ? `Doc: ${record.cliente_documento}`
        : (record.numeroDeDocumento && record.numeroDeDocumento !== '0'
            ? `${record.tipoDocumento || 'Doc'}: ${record.numeroDeDocumento}`
            : null))
    : null;

  const ref     = record.payment_reference || null;
  const concept = getConcept(record);
  const cuenta  = record.cuenta;
  const amount  = record.valor;
  const userId  = record.usuario;
  const vendedor = userMap[String(userId)] || (userId ? `ID ${userId}` : userName);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '12px 14px',
        marginBottom: 10,
        border: '1px solid #f0f0f0',
      }}
    >
      {/* Row 1: date box | client name | amount */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Date box */}
        <div
          style={{
            minWidth: 42,
            background: '#f3f4f6',
            borderRadius: 8,
            padding: '4px 6px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, color: '#374151' }}>
            {moment(date).format('DD')}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {moment(date).format('MMM')}
          </div>
        </div>

        {/* Center: client + doc info + concept */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {clientName}
          </div>

          {docInfo && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{docInfo}</div>
          )}

          {ref && !docInfo && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>Ref: {ref}</div>
          )}

          {concept && (
            <div
              style={{
                fontSize: 12,
                color: '#6b7280',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {concept}
            </div>
          )}

          {vendedor && (
            <div style={{ fontSize: 11, color: '#b0b8c4', marginTop: 1 }}>{vendedor}</div>
          )}
        </div>

        {/* Right: amount */}
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: isIngreso ? '#15803d' : '#dc2626',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {fmt(amount)}
        </div>
      </div>

      {/* Row 2: cuenta tag + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <Tag
          color={cuenta === 'Nequi' ? 'purple' : 'blue'}
          style={{ fontSize: 12, margin: 0 }}
        >
          {cuenta || 'N/D'}
        </Tag>

        <Space size={4}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined style={{ color: '#3b82f6' }} />}
            onClick={() => onEdit(record)}
          />
          <Popconfirm title="¿Borrar registro?" onConfirm={() => onDelete(record._id)}>
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined style={{ color: '#f87171' }} />}
            />
          </Popconfirm>
        </Space>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
const TransactionTable = ({
  type, data, loading, onRefresh, onEdit, onCreate,
  dateRange, onDateRangeChange, userName, onFiltersChange,
  inventario = [], vendedores = [],
}) => {
  const fmt      = useCurrency();
  const isMobile = useIsMobile();

  const [searchText,    setSearchText]    = useState('');
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [conceptFilter, setConceptFilter] = useState(null);
  const [vendedorFilter,setVendedorFilter]= useState(null);

  const getConcept = (r = {}) => {
    if (r.items_detalle) {
      const items = typeof r.items_detalle === 'string' ? JSON.parse(r.items_detalle) : r.items_detalle;
      if (Array.isArray(items) && items.length > 0) {
        return items.map(it => it.descripcion || it.nombre_producto || '').filter(Boolean).join(', ');
      }
    }
    return (r.producto || '').trim();
  };

  const syncFilters = (partial) => {
    if (!onFiltersChange) return;
    onFiltersChange((prev) => ({ ...prev, ...partial }));
  };

  // Opciones de producto desde el inventario real
  const productOptions = useMemo(() => {
    if (inventario.length > 0) {
      return inventario.map(i => ({ value: i.nombre || i.name || i._id, label: i.nombre || i.name }));
    }
    // Fallback: extraer del propio data
    const set = new Set();
    (data || []).forEach(item => { const c = getConcept(item); if (c) set.add(c); });
    return Array.from(set).map(c => ({ value: c, label: c }));
  }, [inventario, data]);

  // Mapa id → nombre para resolver el campo "usuario" de cada registro
  const userMap = useMemo(() => {
    const map = {};
    vendedores.forEach(u => {
      map[String(u.id)] = u.name || u.nombre || `Usuario ${u.id}`;
    });
    return map;
  }, [vendedores]);

  // Opciones del filtro: valor = id del usuario, label = nombre
  const vendedorOptions = useMemo(() => {
    if (vendedores.length > 0) {
      return vendedores.map(u => ({
        value: String(u.id),
        label: u.name || u.nombre || `Usuario ${u.id}`,
      }));
    }
    // Fallback: extraer IDs únicos del data
    const set = new Set();
    (data || []).forEach(item => { if (item.usuario) set.add(String(item.usuario)); });
    return Array.from(set).map(id => ({ value: id, label: `Usuario ${id}` }));
  }, [vendedores, data]);

  // Filtrado
  const filteredData = useMemo(() => {
    return (data || [])
      .filter(item => {
        const dateField = type === 'ingresos' ? 'createdAt' : 'fecha';
        const itemDate  = moment(item[dateField]);
        if (!itemDate.isBetween(dateRange[0], dateRange[1], 'day', '[]')) return false;

        const concept     = getConcept(item).toLowerCase();
        const searchLower = searchText.toLowerCase();
        const textMatch   =
          (item.nombre  && item.nombre.toLowerCase().includes(searchLower)) ||
          (item.apellido && item.apellido.toLowerCase().includes(searchLower)) ||
          (item.cliente_nombre && item.cliente_nombre.toLowerCase().includes(searchLower)) ||
          (item.cliente_apellido && item.cliente_apellido.toLowerCase().includes(searchLower)) ||
          (item.cliente_documento && item.cliente_documento.toString().includes(searchLower)) ||
          (item.numeroDeDocumento && item.numeroDeDocumento.toString().includes(searchLower)) ||
          (item.payment_reference && item.payment_reference.toLowerCase().includes(searchLower)) ||
          concept.includes(searchLower);

        if (!textMatch) return false;
        if (paymentFilter  && item.cuenta   !== paymentFilter)  return false;
        if (conceptFilter  && getConcept(item) !== conceptFilter) return false;
        if (vendedorFilter && String(item.usuario) !== vendedorFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const field = type === 'ingresos' ? 'createdAt' : 'fecha';
        return moment(b[field]).valueOf() - moment(a[field]).valueOf();
      });
  }, [data, dateRange, searchText, paymentFilter, conceptFilter, vendedorFilter, type]);

  const handleDelete = async (id) => {
    try {
      if (type === 'ingresos') await deleteIngreso(id);
      else await deleteEgreso(id);
      message.success('Registro eliminado');
      onRefresh();
    } catch {
      message.error('Error al eliminar');
    }
  };

  const clearAll = () => {
    setSearchText(''); setPaymentFilter(null);
    setConceptFilter(null); setVendedorFilter(null);
    syncFilters({ payment: null, product: null, vendedor: null });
  };

  // Atajo de fecha con 1 clic
  const applyQuickRange = (rangeFn) => {
    const [start, end] = rangeFn();
    onDateRangeChange([start, end]);
  };

  const activeQuick = QUICK_RANGES.findIndex(({ range }) => {
    const [s, e] = range();
    return dateRange[0].isSame(s, 'day') && dateRange[1].isSame(e, 'day');
  });

  const pickerValue =
    dateRange?.length === 2
      ? [dayjs(dateRange[0].toDate()), dayjs(dateRange[1].toDate())]
      : null;

  const TS = { fontSize: 13, color: '#374151' }; // tamaño base uniforme

  // Columnas (desktop)
  const columns = useMemo(() => [
    {
      title: 'Día',
      dataIndex: type === 'ingresos' ? 'createdAt' : 'fecha',
      width: 60,
      render: (date) => (
        <div style={{ textAlign: 'center', background: '#f3f4f6', borderRadius: 6, padding: '3px 4px' }}>
          <div style={{ ...TS, fontWeight: 700, lineHeight: 1.2 }}>{moment(date).format('DD')}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>{moment(date).format('MMM')}</div>
        </div>
      ),
      sorter: (a, b) =>
        moment(a.createdAt || a.fecha).unix() - moment(b.createdAt || b.fecha).unix(),
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      width: 120,
      render: (userId) => {
        const nombre = userMap[String(userId)] || (userId ? `ID ${userId}` : userName);
        return (
          <Tooltip title={nombre}>
            <span style={{ ...TS, display: 'block', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
              {nombre}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: type === 'ingresos' ? 'Cliente' : 'Descripción',
      key: 'detail',
      width: 180,
      render: (_, r) => (
        <div>
          <div style={{ ...TS, fontWeight: 500, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
            {type === 'ingresos'
              ? (`${r.cliente_nombre || r.nombre || ''} ${r.cliente_apellido || r.apellido || ''}`.trim() || 'Venta General')
              : r.descripcion}
          </div>
          {type === 'ingresos' && (
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {r.cliente_documento
                ? `Doc: ${r.cliente_documento}`
                : (r.numeroDeDocumento && r.numeroDeDocumento !== '0' ? `${r.tipoDocumento || 'Doc'}: ${r.numeroDeDocumento}` : 'Venta general')}
            </div>
          )}
          {r.payment_reference && (
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Ref: {r.payment_reference}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Producto / Servicio',
      dataIndex: 'producto',
      key: 'producto',
      width: 160,
      render: (_, r) => (
        <span style={{ ...TS, whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', display: 'block', maxWidth: 150 }}>
          {getConcept(r) || '-'}
        </span>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      width: 130,
      align: 'right',
      render: (val) => (
        <span style={{ ...TS, fontWeight: 600,
          color: type === 'ingresos' ? '#15803d' : '#dc2626' }}>
          {fmt(val)}
        </span>
      ),
    },
    {
      title: 'Cuenta',
      dataIndex: 'cuenta',
      width: 110,
      render: (c) => <Tag color={c === 'Nequi' ? 'purple' : 'blue'} style={{ fontSize: 12 }}>{c || 'N/D'}</Tag>,
    },
  ], [type, userName, userMap]);

  const generatePDF = () => {
    const doc   = new jsPDF();
    const title = type === 'ingresos' ? 'Reporte de Ventas' : 'Reporte de Gastos';
    const periodo = `${moment(dateRange[0]).format('DD/MM/YYYY')} - ${moment(dateRange[1]).format('DD/MM/YYYY')}`;
    doc.setFontSize(14);
    doc.text(`${title} - ${periodo}`, 14, 20);
    doc.autoTable({
      head: [['Fecha', type === 'ingresos' ? 'Cliente' : 'Descripción', 'Producto', 'Cuenta', 'Usuario', 'Valor']],
      body: filteredData.map(item => [
        moment(item[type === 'ingresos' ? 'createdAt' : 'fecha']).format('DD/MM/YYYY'),
        type === 'ingresos' ? `${item.nombre || ''} ${item.apellido || ''}`.trim() : (item.descripcion || ''),
        getConcept(item),
        item.cuenta || '',
        userMap[String(item.usuario)] || (item.usuario ? `ID ${item.usuario}` : '-'),
        fmt(item.valor),
      ]),
      startY: 26,
    });
    doc.save(`${title.replace(/\s+/g, '_')}_${moment(dateRange[0]).format('DD_MM_YYYY')}.pdf`);
  };

  /* ── Quick-range button shared style helper ── */
  const quickBtnStyle = (active) => ({
    padding: isMobile ? '4px 10px' : '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid',
    background: active ? '#155153' : '#fff',
    color:      active ? '#fff'    : '#6b7280',
    borderColor:active ? '#155153' : '#e5e7eb',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  return (
    <div>
      {/* ── FILA 1: Atajos de fecha ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        {QUICK_RANGES.map(({ label, range }, i) => (
          <button
            key={label}
            onClick={() => applyQuickRange(range)}
            style={quickBtnStyle(activeQuick === i)}
          >
            {label}
          </button>
        ))}

        {/* Hide RangePicker on mobile to save space; quick ranges suffice */}
        {!isMobile && (
          <RangePicker
            allowClear
            value={pickerValue}
            onChange={(values) => {
              if (values?.length === 2) {
                onDateRangeChange([
                  moment(values[0].toDate()).startOf('day'),
                  moment(values[1].toDate()).endOf('day'),
                ]);
              } else {
                onDateRangeChange([moment().startOf('month'), moment().endOf('month')]);
              }
            }}
            format="DD/MM/YY"
            size="small"
            style={{ borderRadius: 20 }}
          />
        )}

        <Button
          icon={<FilePdfOutlined />}
          size="small"
          onClick={generatePDF}
          style={{ marginLeft: 'auto' }}
        >
          {isMobile ? '' : 'PDF'}
        </Button>
      </div>

      {/* ── FILA 2: Filtros de búsqueda ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search — always visible, full-width on mobile */}
        <Input
          prefix={<SearchOutlined style={{ color: '#d1d5db' }} />}
          placeholder="Buscar cliente, ref..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
          style={{
            width: isMobile ? '100%' : 200,
            borderRadius: 8,
            flexShrink: 0,
          }}
        />

        {/* Desktop-only filters */}
        {!isMobile && (
          <>
            <Select
              placeholder="Usuario"
              size="small"
              style={{ width: 150, borderRadius: 8 }}
              allowClear
              value={vendedorFilter}
              onChange={(v) => { setVendedorFilter(v); syncFilters({ vendedor: v }); }}
              options={vendedorOptions}
              notFoundContent="Sin usuarios"
            />

            <Select
              placeholder="Producto / Servicio"
              size="small"
              style={{ width: 190, borderRadius: 8 }}
              allowClear
              showSearch
              value={conceptFilter}
              onChange={(v) => { setConceptFilter(v); syncFilters({ product: v }); }}
              options={productOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="Sin productos"
            />

            <Select
              placeholder="Cuenta"
              size="small"
              style={{ width: 130, borderRadius: 8 }}
              allowClear
              value={paymentFilter}
              onChange={(v) => { setPaymentFilter(v); syncFilters({ payment: v }); }}
            >
              <Option value="Nequi">Nequi</Option>
              <Option value="Daviplata">Daviplata</Option>
              <Option value="Bancolombia">Bancolombia</Option>
              <Option value="Efectivo">Efectivo</Option>
            </Select>
          </>
        )}

        {/* On mobile: compact filter row with Cuenta only (most useful quick filter) */}
        {isMobile && (
          <Select
            placeholder="Cuenta"
            size="small"
            style={{ flex: 1, minWidth: 110, borderRadius: 8 }}
            allowClear
            value={paymentFilter}
            onChange={(v) => { setPaymentFilter(v); syncFilters({ payment: v }); }}
          >
            <Option value="Nequi">Nequi</Option>
            <Option value="Daviplata">Daviplata</Option>
            <Option value="Bancolombia">Bancolombia</Option>
            <Option value="Efectivo">Efectivo</Option>
          </Select>
        )}

        <Button icon={<ClearOutlined />} size="small" onClick={clearAll} />
      </div>

      {/* ── CONTENT: cards on mobile, table on desktop ── */}
      {isMobile ? (
        <div>
          {loading ? (
            // Skeleton placeholders while loading
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  padding: '12px 14px',
                  marginBottom: 10,
                }}
              >
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              </div>
            ))
          ) : filteredData.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              Sin registros para los filtros seleccionados
            </div>
          ) : (
            filteredData.map((record) => (
              <MobileCard
                key={record._id}
                record={record}
                type={type}
                fmt={fmt}
                userMap={userMap}
                userName={userName}
                getConcept={getConcept}
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      ) : (
        <Table
          columns={[
            ...columns,
            {
              title: '',
              key: 'act',
              width: 70,
              fixed: 'right',
              render: (_, r) => (
                <Space>
                  <Button size="small" type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => onEdit(r)} />
                  <Popconfirm title="¿Borrar registro?" onConfirm={() => handleDelete(r._id)}>
                    <Button size="small" type="text" icon={<DeleteOutlined className="text-red-400" />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 7 }}
          size="small"
          scroll={{ x: 770 }}
        />
      )}
    </div>
  );
};

export default TransactionTable;
