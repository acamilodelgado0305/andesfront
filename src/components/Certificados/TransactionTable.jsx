import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Tag,
  Space,
  Popconfirm,
  Select,
  message
} from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import moment from 'moment';
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
  userName,
  selectedDate,
  onMonthChange,
  onYearChange,
  onCurrentMonthClick,

  yearsList = [],
  onFiltersChange,
}) => {
  const [searchText, setSearchText] = useState('');
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [conceptFilter, setConceptFilter] = useState(null);
  const [dayFilter, setDayFilter] = useState(null);

  // Helper para obtener SIEMPRE el producto desde el campo correcto
  const getConcept = (r = {}) => {
    return (r.producto || '').trim();
  };

  const syncFilters = (partial) => {
    if (!onFiltersChange) return;
    onFiltersChange((prev) => ({
      payment: partial.payment !== undefined ? partial.payment : prev.payment,
      product: partial.product !== undefined ? partial.product : prev.product,
      day: partial.day !== undefined ? partial.day : prev.day,
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

        // 2) filtro por día del mes
        const dayMatch = dayFilter ? itemDate.date() === dayFilter : true;

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
          dayMatch &&
          textMatch &&
          accountMatch &&
          conceptMatch
        );
      })
      .sort((a, b) => {
        const field = type === 'ingresos' ? 'createdAt' : 'fecha';
        return moment(b[field]).valueOf() - moment(a[field]).valueOf();
      });
  }, [data, dateRange, searchText, paymentFilter, conceptFilter, dayFilter, type]);

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
                CC: {r.numeroDeDocumento}
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
    const periodo = `${moment(dateRange[0]).format('MMMM YYYY')}`;

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
      `${title.replace(/\s+/g, '_')}_${moment(dateRange[0]).format('MM_YYYY')}.pdf`
    );
  };

  // Total del valor según los filtros actuales
  const totalFiltrado = useMemo(() => {
    return filteredData.reduce((acc, item) => acc + (item.valor || 0), 0);
  }, [filteredData]);

  // Opciones de día (1–31)
  const daysOptions = Array.from({ length: 31 }, (_, i) => i + 1);

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

          <Select
            placeholder="Día del mes"
            style={{ width: 100 }}
            allowClear
            value={dayFilter}
            onChange={(value) => {
              setDayFilter(value);
              syncFilters({ day: value });
            }}
          >
            {daysOptions.map((d) => (
              <Option key={d} value={d}>
                {d}
              </Option>
            ))}
          </Select>

          <Button
            icon={<ClearOutlined />}
            onClick={() => {
              setSearchText('');
              setPaymentFilter(null);
              setConceptFilter(null);
              setDayFilter(null);
              syncFilters({ payment: null, product: null, day: null });
            }}
          />
        </Space>

        {/* Filtros de periodo + acciones */}
        <Space wrap>
          {/* Navegador Mes/Año */}
          <div className="flex items-center bg-gray-100 px-2 py-1 rounded-lg">
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => onMonthChange('prev')}
              className="hover:bg-white rounded-md"
            />
            <div
              className="px-3 min-w-[130px] text-center cursor-pointer"
              onClick={onCurrentMonthClick}
            >
              <span className="text-sm font-bold text-gray-700 capitalize">
                {selectedDate.format('MMMM')} {selectedDate.year()}
              </span>
            </div>
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={() => onMonthChange('next')}
              className="hover:bg-white rounded-md"
            />

            <Select
              value={selectedDate.year()}
              onChange={onYearChange}
              bordered={false}
              className="font-semibold text-gray-700 ml-1"
              dropdownMatchSelectWidth={false}
            >
              {yearsList.map((y) => (
                <Option key={y} value={y}>
                  {y}
                </Option>
              ))}
            </Select>

            <Button
              type="text"
              icon={<CalendarOutlined />}
              title="Ir al mes actual"
              onClick={onCurrentMonthClick}
              className="text-gray-400 hover:text-[#155153]"
            />
          </div>

          <Button icon={<FilePdfOutlined />} onClick={generatePDF}>
            PDF Mes
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
        summary={() => {
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <span className="font-semibold">
                  Total {type === 'ingresos' ? 'ventas' : 'gastos'} filtrado:
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <span
                  className={`font-bold ${type === 'ingresos' ? 'text-green-700' : 'text-red-600'
                    }`}
                >
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                  }).format(totalFiltrado)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} />
              <Table.Summary.Cell index={5} />
            </Table.Summary.Row>
          );
        }}
      />
    </div>
  );
};

export default TransactionTable;
