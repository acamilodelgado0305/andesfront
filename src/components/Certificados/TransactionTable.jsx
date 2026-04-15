import React, { useState, useMemo } from 'react';
import {
  Table, Input, Button, Tag, Space,
  Popconfirm, Select, DatePicker, message, Tooltip,
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

const TransactionTable = ({
  type, data, loading, onRefresh, onEdit, onCreate,
  dateRange, onDateRangeChange, userName, onFiltersChange,
  inventario = [], vendedores = [],
}) => {
  const [searchText,    setSearchText]    = useState('');
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [conceptFilter, setConceptFilter] = useState(null);
  const [vendedorFilter,setVendedorFilter]= useState(null);

  const getConcept = (r = {}) => (r.producto || '').trim();

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

  // Opciones de vendedor desde la API de usuarios
  const vendedorOptions = useMemo(() => {
    if (vendedores.length > 0) {
      return vendedores.map(u => ({ value: u.name || u.nombre, label: u.name || u.nombre }));
    }
    // Fallback: extraer del propio data
    const set = new Set();
    (data || []).forEach(item => { if (item.vendedor) set.add(item.vendedor); });
    return Array.from(set).map(v => ({ value: v, label: v }));
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
          (item.numeroDeDocumento && item.numeroDeDocumento.toString().includes(searchLower)) ||
          (item.payment_reference && item.payment_reference.toLowerCase().includes(searchLower)) ||
          concept.includes(searchLower);

        if (!textMatch) return false;
        if (paymentFilter  && item.cuenta   !== paymentFilter)  return false;
        if (conceptFilter  && getConcept(item) !== conceptFilter) return false;
        if (vendedorFilter && (item.vendedor || userName) !== vendedorFilter) return false;

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

  const activeQuick = QUICK_RANGES.findIndex(({ label, range }) => {
    const [s, e] = range();
    return dateRange[0].isSame(s, 'day') && dateRange[1].isSame(e, 'day');
  });

  const pickerValue =
    dateRange?.length === 2
      ? [dayjs(dateRange[0].toDate()), dayjs(dateRange[1].toDate())]
      : null;

  const TS = { fontSize: 13, color: '#374151' }; // tamaño base uniforme

  // Columnas
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
      title: 'Vendedor',
      dataIndex: 'vendedor',
      width: 120,
      render: (v) => (
        <Tooltip title={v || userName}>
          <span style={{ ...TS, display: 'block', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
            {v || userName}
          </span>
        </Tooltip>
      ),
    },
    {
      title: type === 'ingresos' ? 'Cliente' : 'Descripción',
      key: 'detail',
      width: 180,
      render: (_, r) => (
        <div>
          <div style={{ ...TS, fontWeight: 500, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
            {type === 'ingresos' ? `${r.nombre || ''} ${r.apellido || ''}`.trim() : r.descripcion}
          </div>
          {type === 'ingresos' && (
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {(r.tipoDocumento || r.tipoDeDocumento || 'Doc')}: {r.numeroDeDocumento || 'N/D'}
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
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)}
        </span>
      ),
    },
    {
      title: 'Cuenta',
      dataIndex: 'cuenta',
      width: 110,
      render: (c) => <Tag color={c === 'Nequi' ? 'purple' : 'blue'} style={{ fontSize: 12 }}>{c || 'N/D'}</Tag>,
    },
  ], [type, userName]);

  const generatePDF = () => {
    const doc   = new jsPDF();
    const title = type === 'ingresos' ? 'Reporte de Ventas' : 'Reporte de Gastos';
    const periodo = `${moment(dateRange[0]).format('DD/MM/YYYY')} - ${moment(dateRange[1]).format('DD/MM/YYYY')}`;
    doc.setFontSize(14);
    doc.text(`${title} - ${periodo}`, 14, 20);
    doc.autoTable({
      head: [['Fecha', type === 'ingresos' ? 'Cliente' : 'Descripción', 'Producto', 'Cuenta', 'Valor']],
      body: filteredData.map(item => [
        moment(item[type === 'ingresos' ? 'createdAt' : 'fecha']).format('DD/MM/YYYY'),
        type === 'ingresos' ? `${item.nombre || ''} ${item.apellido || ''}`.trim() : (item.descripcion || ''),
        getConcept(item),
        item.cuenta || '',
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.valor || 0),
      ]),
      startY: 26,
    });
    doc.save(`${title.replace(/\s+/g, '_')}_${moment(dateRange[0]).format('DD_MM_YYYY')}.pdf`);
  };

  return (
    <div>
      {/* ── FILA 1: Atajos de fecha ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {QUICK_RANGES.map(({ label, range }, i) => (
          <button
            key={label}
            onClick={() => applyQuickRange(range)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              background: activeQuick === i ? '#155153'    : '#fff',
              color:      activeQuick === i ? '#fff'        : '#6b7280',
              borderColor:activeQuick === i ? '#155153'    : '#e5e7eb',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
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
        <Button icon={<FilePdfOutlined />} size="small" onClick={generatePDF} style={{ marginLeft: 'auto' }}>
          PDF
        </Button>
      </div>

      {/* ── FILA 2: Filtros de búsqueda ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#d1d5db' }} />}
          placeholder="Buscar cliente, ref..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
          style={{ width: 200, borderRadius: 8 }}
        />

        <Select
          placeholder="Vendedor"
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

        <Button icon={<ClearOutlined />} size="small" onClick={clearAll} />
      </div>

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
    </div>
  );
};

export default TransactionTable;
