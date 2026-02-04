import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Tag,
  Space,
  Popconfirm,
  Select,
  DatePicker,
  message
} from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import moment from 'moment';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import 'moment/locale/es';

import { deleteIngreso, deleteEgreso } from '../../services/controlapos/posService';

moment.locale('es');
const { Option } = Select;

const TransactionTable = ({
  type,
  data,
  loading,
  onRefresh,
  onEdit,
  onCreate,
  dateRange,
  onDateRangeChange,
  userName,
  onFiltersChange,
}) => {
  const [searchText, setSearchText] = useState('');
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [conceptFilter, setConceptFilter] = useState(null);

  // Helper para obtener SIEMPRE el producto desde el campo correcto
  const getConcept = (r = {}) => {
    return (r.producto || '').trim();
  };

  const syncFilters = (partial) => {
    if (!onFiltersChange) return;
    onFiltersChange((prev) => ({
      payment: partial.payment !== undefined ? partial.payment : prev.payment,
      product: partial.product !== undefined ? partial.product : prev.product,
    }));
  };


  // Opciones dinámicas de producto/servicio basadas en "producto"
  const conceptOptions = useMemo(() => {
    const set = new Set();
    (data || []).forEach(item => {
      const c = getConcept(item);
      if (c) set.add(c);
    });
    return Array.from(set);
  }, [data]);

  // Filtrado usando dateRange, texto, cuenta, producto y día
  const filteredData = useMemo(() => {
    return (data || [])
      .filter(item => {
        const dateField = type === 'ingresos' ? 'createdAt' : 'fecha';
        const itemDate = moment(item[dateField]);

        // 1) dentro del mes/año seleccionado
        const isInDateRange = itemDate.isBetween(
          dateRange[0],
          dateRange[1],
          'day',
          '[]'
        );

        const concept = getConcept(item) || '';
        const conceptLower = concept.toLowerCase();
        const searchLower = searchText.toLowerCase();

        // 3) texto libre
        const textMatch =
          (item.nombre && item.nombre.toLowerCase().includes(searchLower)) ||
          (item.apellido && item.apellido.toLowerCase().includes(searchLower)) ||
          (item.numeroDeDocumento &&
            item.numeroDeDocumento.toString().includes(searchLower)) ||
          (item.payment_reference &&
            item.payment_reference.toLowerCase().includes(searchLower)) ||
          conceptLower.includes(searchLower);

        // 4) cuenta
        const accountMatch = paymentFilter ? item.cuenta === paymentFilter : true;

        // 5) producto exacto (lo que viene de las options del Select)
        const conceptMatch = conceptFilter ? concept === conceptFilter : true;

        return (
          isInDateRange &&
          textMatch &&
          accountMatch &&
          conceptMatch
        );
      })
      .sort((a, b) => {
        const field = type === 'ingresos' ? 'createdAt' : 'fecha';
        return moment(b[field]).valueOf() - moment(a[field]).valueOf();
      });
  }, [data, dateRange, searchText, paymentFilter, conceptFilter, type]);

  const handleDelete = async (id) => {
    try {
      if (type === 'ingresos') await deleteIngreso(id);
      else await deleteEgreso(id);
      message.success("Registro eliminado");
      onRefresh();
    } catch (error) {
      message.error("Error al eliminar");
    }
  };

  // Columnas con información completa clave
  const columns = useMemo(() => {
    return [
      {
        title: 'Día',
        dataIndex: type === 'ingresos' ? 'createdAt' : 'fecha',
        width: 80,
        render: (date) => (
          <div className="text-center bg-gray-100 rounded p-1 text-gray-700">
            <div className="font-bold text-lg">
              {moment(date).format('DD')}
            </div>
            <div className="text-[10px] uppercase">
              {moment(date).format('MMM')}
            </div>
          </div>
        ),
        sorter: (a, b) =>
          moment(a.createdAt || a.fecha).unix() - moment(b.createdAt || b.fecha).unix(),
      },
      {
        title: type === 'ingresos' ? 'Cliente' : 'Descripción',
        key: 'detail',
        render: (_, r) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-800">
              {type === 'ingresos'
                ? `${r.nombre || ''} ${r.apellido || ''}`.trim()
                : r.descripcion}
            </span>
            {type === 'ingresos' && (
              <span className="text-xs text-gray-400">
                {(r.tipoDocumento || r.tipoDeDocumento || 'Documento')}: {r.numeroDeDocumento || 'N/D'}
              </span>
            )}
            {r.payment_reference && (
              <span className="text-xs text-gray-400">
                Ref: {r.payment_reference}
              </span>
            )}
          </div>
        )
      },
      {
        title: 'Producto / Servicio',
        dataIndex: 'producto',
        key: 'producto',
        render: (_, r) => (
          <span className="text-gray-700">
            {getConcept(r) || '-'}
          </span>
        )
      },
      {
        title: 'Valor',
        dataIndex: 'valor',
        align: 'right',
        render: (val) => (
          <span
            className={`font-bold ${type === 'ingresos' ? 'text-green-700' : 'text-red-600'
              }`}
          >
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
            }).format(val || 0)}
          </span>
        ),
      },
      {
        title: 'Cuenta',
        dataIndex: 'cuenta',
        render: (c) => (
          <Tag color={c === 'Nequi' ? 'purple' : 'blue'}>
            {c || 'N/D'}
          </Tag>
        ),
      },
      {
        title: 'Vendedor',
        dataIndex: 'vendedor',
        render: (v) => (
          <span className="text-xs text-gray-500">
            {v || userName}
          </span>
        ),
      }
    ];
  }, [type, userName]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const title = type === 'ingresos' ? 'Reporte de Ventas' : 'Reporte de Gastos';
    const start = moment(dateRange[0]).format('DD/MM/YYYY');
    const end = moment(dateRange[1]).format('DD/MM/YYYY');
    const periodo = start === end ? start : `${start} - ${end}`;

    doc.setFontSize(14);
    doc.text(`${title} - ${periodo}`, 14, 20);

    const tableColumn = [
      'Fecha',
      type === 'ingresos' ? 'Cliente' : 'Descripción',
      'Producto / Servicio',
      'Cuenta',
      'Valor',
    ];

    const tableRows = [];

    filteredData.forEach((item) => {
      const dateField = type === 'ingresos' ? 'createdAt' : 'fecha';
      const rowData = [
        moment(item[dateField]).format('DD/MM/YYYY'),
        type === 'ingresos'
          ? `${item.nombre || ''} ${item.apellido || ''}`.trim()
          : item.descripcion || '',
        getConcept(item),
        item.cuenta || '',
        new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
        }).format(item.valor || 0),
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 26,
    });

    doc.save(
      `${title.replace(/\s+/g, '_')}_${moment(dateRange[0]).format('DD_MM_YYYY')}.pdf`
    );
  };

  const { RangePicker } = DatePicker;
  const pickerValue =
    dateRange && dateRange.length === 2
      ? [dayjs(dateRange[0].toDate()), dayjs(dateRange[1].toDate())]
      : null;
  const datePresets = [
    {
      label: 'Hoy',
      value: [dayjs().startOf('day'), dayjs().endOf('day')],
    },
    {
      label: 'Ayer',
      value: [
        dayjs().subtract(1, 'day').startOf('day'),
        dayjs().subtract(1, 'day').endOf('day'),
      ],
    },
    {
      label: 'Este mes',
      value: [dayjs().startOf('month'), dayjs().endOf('month')],
    },
    {
      label: 'Mes pasado',
      value: [
        dayjs().subtract(1, 'month').startOf('month'),
        dayjs().subtract(1, 'month').endOf('month'),
      ],
    },
    {
      label: 'Este año',
      value: [dayjs().startOf('year'), dayjs().endOf('year')],
    },
  ];

  return (
    <div>
      {/* Barra de filtros completa */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-end mb-4">
        <Space wrap>
          <Input
            prefix={<SearchOutlined className="text-gray-300" />}
            placeholder="Buscar cliente, ref, producto..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />

          <Select
            placeholder="Cuenta"
            style={{ width: 120 }}
            allowClear
            value={paymentFilter}
            onChange={(value) => {
              setPaymentFilter(value);
              syncFilters({ payment: value });
            }}
          >
            <Option value="Nequi">Nequi</Option>
            <Option value="Daviplata">Daviplata</Option>
            <Option value="Bancolombia">Bancolombia</Option>
            <Option value="Efectivo">Efectivo</Option>
          </Select>

          <Select
            placeholder="Producto / Servicio"
            style={{ width: 200 }}
            allowClear
            value={conceptFilter}
            onChange={(value) => {
              setConceptFilter(value);
              syncFilters({ product: value });
            }}
          >
            {conceptOptions.map((c) => (
              <Option key={c} value={c}>
                {c}
              </Option>
            ))}
          </Select>

          <Button
            icon={<ClearOutlined />}
            onClick={() => {
              setSearchText('');
              setPaymentFilter(null);
              setConceptFilter(null);
              syncFilters({ payment: null, product: null });
            }}
          />
        </Space>

        {/* Filtros de periodo + acciones */}
        <Space wrap>
          <RangePicker
            allowClear
            value={pickerValue}
            presets={datePresets}
            onChange={(values) => {
              if (values && values.length === 2) {
                onDateRangeChange([
                  moment(values[0].toDate()).startOf('day'),
                  moment(values[1].toDate()).endOf('day'),
                ]);
              } else {
                onDateRangeChange([
                  moment().startOf('month'),
                  moment().endOf('month'),
                ]);
              }
            }}
            format="DD/MM/YYYY"
            className="bg-gray-100 rounded-lg"
          />

          <Button icon={<FilePdfOutlined />} onClick={generatePDF}>
            PDF
          </Button>

          <Button
            type="primary"
            onClick={onCreate}
            className="bg-[#155153]"
          >
            {type === 'ingresos' ? '+ Venta' : '+ Gasto'}
          </Button>
        </Space>
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
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined className="text-blue-500" />}
                  onClick={() => onEdit(r)}
                />
                <Popconfirm
                  title="¿Borrar registro?"
                  onConfirm={() => handleDelete(r._id)}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined className="text-red-400" />}
                  />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        dataSource={filteredData}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 7 }}
        size="middle"
        scroll={{ x: 900 }}
      />
    </div>
  );
};

export default TransactionTable;
