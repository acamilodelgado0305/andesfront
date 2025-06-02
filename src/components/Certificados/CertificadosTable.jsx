import React, { useState, useEffect, useMemo } from 'react';
import { Table, Select, Space, Spin, message, Button, Popconfirm, Tooltip, Tag, Typography, Card } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, DollarOutlined, DownloadOutlined, RiseOutlined } from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/es';
import axios from 'axios';
import jsPDF from 'jspdf'; // Asegúrate de que jspdf esté importado

moment.locale('es');

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const { Text, Title } = Typography;
const { Option } = Select;

const currentYear = moment().year();
const yearOptions = [];
for (let i = 5; i > 0; i--) {
  yearOptions.push(currentYear - i);
}
yearOptions.push(currentYear);
for (let i = 1; i <= 2; i++) {
  yearOptions.push(currentYear + i);
}
const monthNames = moment.months();

const CertificadosTable = ({ data, allVentas, allEgresos, loading, onRefresh, userName, type }) => {
  const [filters, setFilters] = useState({
    selectedYear: moment().year(),
    selectedUIMonth: moment().month(),
    selectedAccount: null,
  });

  const currentSelectedMoment = useMemo(() => {
    return moment({ year: filters.selectedYear, month: filters.selectedUIMonth });
  }, [filters.selectedYear, filters.selectedUIMonth]);

  // --- (filteredData, totalVentas, totalEgresos, balance, etc. como en tu código anterior) ---
  // Asegúrate que estas definiciones estén presentes y correctas
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const dateField = type === 'ventas' ? 'createdAt' : 'fecha';
        if (!item[dateField] || !moment(item[dateField]).isValid()) {
          return false;
        }
        const itemDate = moment(item[dateField]);
        const { selectedYear, selectedUIMonth, selectedAccount } = filters;
        const monthMatch = itemDate.year() === selectedYear && itemDate.month() === selectedUIMonth;
        const accountMatch = selectedAccount ? item.cuenta === selectedAccount : true;
        return monthMatch && accountMatch;
      })
      .sort((a, b) => moment(b[type === 'ventas' ? 'createdAt' : 'fecha']).unix() - moment(a[type === 'ventas' ? 'createdAt' : 'fecha']).unix());
  }, [data, filters, type]);

  const totalVentas = useMemo(() => {
    return allVentas
      .filter((item) => {
        if (!item.createdAt || !moment(item.createdAt).isValid()) return false;
        const itemDate = moment(item.createdAt);
        const { selectedYear, selectedUIMonth, selectedAccount } = filters;
        const monthMatch = itemDate.year() === selectedYear && itemDate.month() === selectedUIMonth;
        const accountMatch = selectedAccount ? item.cuenta === selectedAccount : true;
        return monthMatch && accountMatch;
      })
      .reduce((sum, cert) => sum + (cert.valor || 0), 0);
  }, [allVentas, filters]);

  const totalEgresos = useMemo(() => {
    return allEgresos
      .filter((item) => {
        if (!item.fecha || !moment(item.fecha).isValid()) return false;
        const itemDate = moment(item.fecha);
        const { selectedYear, selectedUIMonth, selectedAccount } = filters;
        const monthMatch = itemDate.year() === selectedYear && itemDate.month() === selectedUIMonth;
        const accountMatch = selectedAccount ? item.cuenta === selectedAccount : true;
        return monthMatch && accountMatch;
      })
      .reduce((sum, egreso) => sum + (egreso.valor || 0), 0);
  }, [allEgresos, filters]);

  const balance = useMemo(() => totalVentas - totalEgresos, [totalVentas, totalEgresos]);


  const handleDownloadPDF = () => {
    try {
      console.log(`Iniciando descarga de PDF para ${type}...`);
      if (filteredData.length === 0) {
        message.warning(`No hay ${type === 'ventas' ? 'ventas' : 'egresos'} para descargar en el mes seleccionado.`);
        return;
      }

      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const leftMargin = 14;
      const rightMargin = 14;
      const topMargin = 15; // Margen superior general
      const bottomMargin = 20; // Margen inferior para evitar que el texto se corte
      let y = topMargin; // Posición Y actual, se reinicia en cada página

      // Función para añadir encabezados en cada página
      const addPageContentHeader = () => {
        y = topMargin; // Reiniciar Y al margen superior
        doc.setFontSize(16);
        doc.text(type === 'ventas' ? 'Certificados Vendidos' : 'Egresos Registrados', leftMargin, y);
        y += 8; // Incrementar Y después del texto
        doc.setFontSize(12);
        doc.text(`Mes: ${currentSelectedMoment.format('MMMM YYYY')}`, leftMargin, y);
        y += 7;
        doc.text(`Vendedor: ${userName || 'No especificado'}`, leftMargin, y);
        y += 7;
        if (filters.selectedAccount) {
          doc.text(`Cuenta: ${filters.selectedAccount}`, leftMargin, y);
          y += 7;
        }
        y += 5; // Espacio extra antes de la lista de items
      };

      addPageContentHeader(); // Añadir encabezado a la primera página

      const itemLineHeight = 6; // Altura estimada por línea de texto (para fuente 12pt, aprox.)
      const itemGutter = 3;    // Espacio entre items

      filteredData.forEach((item, index) => {
        let textToDraw;
        if (type === 'ventas') {
          const nombreCompleto = `${item.nombre?.trim() || ''} ${item.apellido?.trim() || ''}`.trim() || 'Sin nombre';
          const numeroDeDocumento = item.numeroDeDocumento || 'No especificado';
          textToDraw = `${index + 1}. ${nombreCompleto} - ${numeroDeDocumento}`;
        } else {
          const descripcion = item.descripcion || 'Sin descripción';
          textToDraw = `${index + 1}. ${descripcion}`;
        }

        // Dividir el texto si es muy largo para el ancho de la página
        const textLines = doc.splitTextToSize(textToDraw, pageWidth - leftMargin - rightMargin);
        const currentItemHeight = textLines.length * itemLineHeight;

        // Comprobar si el item actual cabe en la página
        if (y + currentItemHeight > pageHeight - bottomMargin) {
          doc.addPage();
          addPageContentHeader(); // Añadir encabezado y reiniciar 'y' en la nueva página
        }

        doc.text(textLines, leftMargin, y);
        y += currentItemHeight; // Incrementar 'y' por la altura del texto actual
        y += itemGutter;      // Añadir espacio para el siguiente item
      });

      doc.save(`${type === 'ventas' ? 'Certificados' : 'Egresos'}_${currentSelectedMoment.format('YYYY-MM')}${filters.selectedAccount ? `_${filters.selectedAccount}` : ''}.pdf`);
      message.success('PDF descargado correctamente');

    } catch (error) {
      console.error('Error al generar el PDF:', error);
      message.error('Error al generar el PDF. Por favor, intenta de nuevo.');
    }
  };

  // --- (El resto de tus funciones: handleDeleteItem, handleYearChange, handleUIMonthChange, handleAccountChange) ---
  // --- (Definición de 'columns' y el return JSX) ---
  // Estas partes deben permanecer como en tu versión anterior funcional.
  // Por brevedad, no las repito aquí, pero asegúrate de que estén presentes.
  const handleDeleteItem = async (id) => {
    try {
      const endpoint = type === 'ventas' ? 'clients' : 'egresos';
      await axios.delete(`https://backendcoalianza.vercel.app/api/v1/${endpoint}/${id}`);
      message.success(`${type === 'ventas' ? 'Certificado' : 'Egreso'} eliminado correctamente`);
      onRefresh();
    } catch (error) {
      console.error(`Error al eliminar ${type}:`, error);
      message.error(`Error al eliminar el ${type === 'ventas' ? 'certificado' : 'egreso'}`);
    }
  };

  const handleYearChange = (year) => {
    setFilters((prev) => ({
      ...prev,
      selectedYear: year,
    }));
  };

  const handleUIMonthChange = (monthIndex) => {
    setFilters((prev) => ({
      ...prev,
      selectedUIMonth: monthIndex,
    }));
  };

  const handleAccountChange = (value) => {
    setFilters((prev) => ({
      ...prev,
      selectedAccount: value || null,
    }));
  };

  const columns = type === 'ventas' ? [
    {
      title: 'Nombre Completo',
      dataIndex: 'nombre',
      render: (text, record) => <span>{`${record.nombre?.trim() || ''} ${record.apellido?.trim() || ''}`}</span>,
      sorter: (a, b) => (a.nombre || '').localeCompare(b.nombre || ''),
    },
    {
      title: 'Documento',
      dataIndex: 'numeroDeDocumento',
      sorter: (a, b) => (a.numeroDeDocumento || '').localeCompare(b.numeroDeDocumento || ''),
    },
    {
      title: 'Tipo de Certificado',
      dataIndex: 'tipo',
      render: (tipo) => (Array.isArray(tipo) ? tipo.join(', ') : tipo || 'No especificado'),
    },
    {
      title: 'Vendedor',
      dataIndex: 'vendedor',
      sorter: (a, b) => (a.vendedor || '').localeCompare(b.vendedor || ''),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      render: (valor) => currencyFormatter.format(valor != null ? valor : 0),
      sorter: (a, b) => (a.valor || 0) - (b.valor || 0),
    },
    {
      title: 'Cuenta',
      dataIndex: 'cuenta',
      render: (cuenta) => {
        let color;
        switch (cuenta) {
          case 'Nequi': color = 'green'; break;
          case 'Daviplata': color = 'orange'; break;
          case 'Bancolombia': color = 'blue'; break;
          default: color = 'default'; cuenta = 'No especificada';
        }
        return <Tag color={color}>{cuenta}</Tag>;
      },
      filters: [
        { text: 'Nequi', value: 'Nequi' },
        { text: 'Daviplata', value: 'Daviplata' },
        { text: 'Bancolombia', value: 'Bancolombia' },
      ],
      onFilter: (value, record) => record.cuenta === value,
    },
    {
      title: 'Fecha Vencimiento',
      dataIndex: 'fechaVencimiento',
      render: (date) => (date ? moment(date).format('DD/MM/YYYY') : 'No especificada'),
      sorter: (a, b) => new Date(a.fechaVencimiento || 0) - new Date(b.fechaVencimiento || 0),
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => moment(b.createdAt).unix() - moment(a.createdAt).unix(),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title={`Eliminar ${type === 'ventas' ? 'certificado' : 'egreso'}`}
            description={`¿Está seguro de eliminar este ${type === 'ventas' ? 'certificado' : 'egreso'}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDeleteItem(record._id)}
            okText="Sí, eliminar" cancelText="No"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title="Eliminar">
              <Button danger type="link" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ] : [
      { title: 'Descripción', dataIndex: 'descripcion', sorter: (a, b) => (a.descripcion || '').localeCompare(b.descripcion || '') },
      { title: 'Valor', dataIndex: 'valor', render: (valor) => currencyFormatter.format(valor != null ? valor : 0), sorter: (a, b) => (a.valor || 0) - (b.valor || 0) },
      {
        title: 'Cuenta',
        dataIndex: 'cuenta',
        render: (cuenta) => {
          let color;
          switch (cuenta) {
            case 'Nequi': color = 'green'; break;
            case 'Daviplata': color = 'orange'; break;
            case 'Bancolombia': color = 'blue'; break;
            default: color = 'default'; cuenta = 'No especificada';
          }
          return <Tag color={color}>{cuenta}</Tag>;
        },
        filters: [
          { text: 'Nequi', value: 'Nequi' },
          { text: 'Daviplata', value: 'Daviplata' },
          { text: 'Bancolombia', value: 'Bancolombia' },
        ],
        onFilter: (value, record) => record.cuenta === value,
      },
      { title: 'Fecha', dataIndex: 'fecha', render: (date) => moment(date).format('DD/MM/YYYY'), sorter: (a, b) => moment(b.fecha).unix() - moment(a.fecha).unix() },
      {
        title: 'Acciones',
        key: 'acciones',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Space size="middle">
            <Popconfirm
              title="Eliminar egreso"
              description="¿Está seguro de eliminar este egreso? Esta acción no se puede deshacer."
              onConfirm={() => handleDeleteItem(record._id)}
              okText="Sí, eliminar" cancelText="No"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Tooltip title="Eliminar">
                <Button danger type="link" icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ];

  return (
    <div className="p-4">
      <Space direction="vertical" size="middle" className="mb-4 w-full">
        <Space className="flex items-center justify-between w-full flex-wrap">
          <Space wrap>
            <Select
              style={{ width: 150 }}
              placeholder="Seleccionar cuenta"
              allowClear
              onChange={handleAccountChange}
              value={filters.selectedAccount}
            >
              <Option value="Nequi">Nequi</Option>
              <Option value="Daviplata">Daviplata</Option>
              <Option value="Bancolombia">Bancolombia</Option>
            </Select>
            <Select
              style={{ width: 100 }}
              value={filters.selectedYear}
              onChange={handleYearChange}
              placeholder="Año"
            >
              {yearOptions.map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
            <Select
              style={{ width: 130 }}
              value={filters.selectedUIMonth}
              onChange={handleUIMonthChange}
              placeholder="Mes"
            >
              {monthNames.map((name, index) => (
                <Option key={index} value={index}>{name.charAt(0).toUpperCase() + name.slice(1)}</Option>
              ))}
            </Select>
            <Text>
              Mostrando {type === 'ventas' ? 'ventas' : 'egresos'} de{' '}
              <strong>{currentSelectedMoment.format('MMMM YYYY')}</strong>
              {filters.selectedAccount && (
                <span> para <strong>{filters.selectedAccount}</strong></span>
              )}
            </Text>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
            >
              Descargar PDF
            </Button>
          </Space>
          <Text>
            Mostrando {type === 'ventas' ? 'ventas' : 'egresos'} para: <strong>{userName}</strong>
          </Text>
        </Space>

        <Space size="middle" style={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Card style={{ width: 300, minWidth: 280, borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: '1px solid #d9f7be', backgroundColor: '#f6ffed', margin: '8px 0' }} bodyStyle={{ padding: 16 }}>
            <Space align="center" size="middle">
              <DollarOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Total Ventas</Text>
                <Title level={4} style={{ margin: 0, color: '#52c41a', fontWeight: 'bold' }}>{currencyFormatter.format(totalVentas)}</Title>
              </div>
            </Space>
          </Card>
          <Card style={{ width: 300, minWidth: 280, borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: '1px solid #ffccc7', backgroundColor: '#fff1f0', margin: '8px 0' }} bodyStyle={{ padding: 16 }}>
            <Space align="center" size="middle">
              <DollarOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Total Egresos</Text>
                <Title level={4} style={{ margin: 0, color: '#ff4d4f', fontWeight: 'bold' }}>{currencyFormatter.format(totalEgresos)}</Title>
              </div>
            </Space>
          </Card>
          <Card style={{ width: 300, minWidth: 280, borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: `1px solid ${balance < 0 ? '#ffccc7' : '#bae7ff'}`, backgroundColor: balance < 0 ? '#fff1f0' : '#e6f7ff', margin: '8px 0' }} bodyStyle={{ padding: 16 }}>
            <Space align="center" size="middle">
              <RiseOutlined style={{ fontSize: '32px', color: balance < 0 ? '#ff4d4f' : '#1890ff' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Balance</Text>
                <Title level={4} style={{ margin: 0, color: balance < 0 ? '#ff4d4f' : '#1890ff', fontWeight: 'bold' }}>{currencyFormatter.format(balance)}</Title>
              </div>
            </Space>
          </Card>
        </Space>
      </Space>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
          scroll={{ x: type === 'ventas' ? 1200 : 800 }}
          locale={{ emptyText: `No hay ${type === 'ventas' ? 'ventas' : 'egresos'} disponibles para los filtros seleccionados` }}
        />
      </Spin>
    </div>
  );
};

export default CertificadosTable;