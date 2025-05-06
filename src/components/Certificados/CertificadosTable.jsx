import React, { useState, useEffect, useMemo } from 'react';
import { Table, DatePicker, Space, Spin, message, Button, Popconfirm, Tooltip, Tag, Typography, Card, Select } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, DollarOutlined, FileProtectOutlined, DownloadOutlined, RiseOutlined } from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';
import jsPDF from 'jspdf';

// Formateador para pesos colombianos
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const { Text, Title } = Typography;
const { Option } = Select;

const CertificadosTable = ({ data, allVentas, allEgresos, loading, onRefresh, userName, type }) => {
  const [filters, setFilters] = useState({
    selectedMonth: moment('2025-05-01'), // Default to May 2025
    selectedAccount: null,
  });

  // Memoizar filteredData para optimizar el filtrado
  const filteredData = useMemo(() => {
    console.log(`Filtrando datos para ${type}, mes:`, filters.selectedMonth.format('YYYY-MM'));
    console.log('Cuenta seleccionada:', filters.selectedAccount);

    return data
      .filter((item) => {
        const dateField = type === 'ventas' ? 'createdAt' : 'fecha';
        if (!item[dateField] || !moment(item[dateField]).isValid()) {
          console.warn(`Fecha inválida en ${type}:`, item);
          return false;
        }

        const itemDate = moment(item[dateField]);
        const { selectedMonth, selectedAccount } = filters;

        const monthMatch = selectedMonth
          ? itemDate.year() === selectedMonth.year() && itemDate.month() === selectedMonth.month()
          : true;

        const accountMatch = selectedAccount ? item.cuenta === selectedAccount : true;

        return monthMatch && accountMatch;
      })
      .sort((a, b) => moment(b[type === 'ventas' ? 'createdAt' : 'fecha']).unix() - moment(a[type === 'ventas' ? 'createdAt' : 'fecha']).unix());
  }, [data, filters, type]);

  // Calcular totales con filtros
  const totalVentas = useMemo(() => {
    return allVentas
      .filter((item) => {
        if (!item.createdAt || !moment(item.createdAt).isValid()) return false;
        const itemDate = moment(item.createdAt);
        const monthMatch = filters.selectedMonth
          ? itemDate.year() === filters.selectedMonth.year() && itemDate.month() === filters.selectedMonth.month()
          : true;
        const accountMatch = filters.selectedAccount ? item.cuenta === filters.selectedAccount : true;
        return monthMatch && accountMatch;
      })
      .reduce((sum, cert) => sum + (cert.valor || 0), 0);
  }, [allVentas, filters]);

  const totalEgresos = useMemo(() => {
    return allEgresos
      .filter((item) => {
        if (!item.fecha || !moment(item.fecha).isValid()) return false;
        const itemDate = moment(item.fecha);
        const monthMatch = filters.selectedMonth
          ? itemDate.year() === filters.selectedMonth.year() && itemDate.month() === filters.selectedMonth.month()
          : true;
        const accountMatch = filters.selectedAccount ? item.cuenta === filters.selectedAccount : true;
        return monthMatch && accountMatch;
      })
      .reduce((sum, egreso) => sum + (egreso.valor || 0), 0);
  }, [allEgresos, filters]);

  const balance = useMemo(() => totalVentas - totalEgresos, [totalVentas, totalEgresos]);

  // Calcular número de registros para la tabla actual
  const totalRegistros = filteredData.length;

  // Función para descargar el PDF
  const handleDownloadPDF = () => {
    try {
      console.log(`Iniciando descarga de PDF para ${type}...`);
      if (filteredData.length === 0) {
        message.warning(`No hay ${type === 'ventas' ? 'ventas' : 'egresos'} para descargar en el mes seleccionado.`);
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(type === 'ventas' ? 'Certificados Vendidos' : 'Egresos Registrados', 14, 20);
      doc.setFontSize(12);
      doc.text(`Mes: ${filters.selectedMonth.format('MMMM YYYY')}`, 14, 30);
      doc.text(`Vendedor: ${userName || 'No especificado'}`, 14, 40);
      if (filters.selectedAccount) {
        doc.text(`Cuenta: ${filters.selectedAccount}`, 14, 50);
      }

      let y = filters.selectedAccount ? 60 : 50;
      filteredData.forEach((item, index) => {
        if (type === 'ventas') {
          const nombreCompleto = `${item.nombre?.trim() || ''} ${item.apellido?.trim() || ''}`.trim() || 'Sin nombre';
          const numeroDeDocumento = item.numeroDeDocumento || 'No especificado';
          doc.text(`${index + 1}. ${nombreCompleto} - ${numeroDeDocumento}`, 14, y);
        } else {
          const descripcion = item.descripcion || 'Sin descripción';
          doc.text(`${index + 1}. ${descripcion}`, 14, y);
        }
        y += 10;
      });

      doc.save(`${type === 'ventas' ? 'Certificados' : 'Egresos'}_${filters.selectedMonth.format('YYYY-MM')}${filters.selectedAccount ? `_${filters.selectedAccount}` : ''}.pdf`);
      message.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      message.error('Error al generar el PDF. Por favor, intenta de nuevo.');
    }
  };

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

  const handleMonthChange = (date) => {
    setFilters((prev) => ({
      ...prev,
      selectedMonth: date || moment('2025-05-01'), // Fallback to May 2025
    }));
  };

  const handleAccountChange = (value) => {
    setFilters((prev) => ({
      ...prev,
      selectedAccount: value || null,
    }));
  };

  // Definir columnas dinámicamente según el tipo
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
          case 'Nequi':
            color = 'green';
            break;
          case 'Daviplata':
            color = 'orange';
            break;
          case 'Bancolombia':
            color = 'blue';
            break;
          default:
            color = 'default';
            cuenta = 'No especificada';
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
            okText="Sí, eliminar"
            cancelText="No"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title="Eliminar">
              <Button
                danger
                type="link"
                icon={<DeleteOutlined />}
                className="text-red-500 hover:text-red-700"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ] : [
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      sorter: (a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''),
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
          case 'Nequi':
            color = 'green';
            break;
          case 'Daviplata':
            color = 'orange';
            break;
          case 'Bancolombia':
            color = 'blue';
            break;
          default:
            color = 'default';
            cuenta = 'No especificada';
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
      title: 'Fecha',
      dataIndex: 'fecha',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(b.fecha).unix() - moment(a.fecha).unix(),
    },
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
            okText="Sí, eliminar"
            cancelText="No"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title="Eliminar">
              <Button
                danger
                type="link"
                icon={<DeleteOutlined />}
                className="text-red-500 hover:text-red-700"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Space direction="vertical" size="middle" className="mb-4 w-full">
        <Space className="flex items-center justify-between w-full">
          <Space>
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
            <DatePicker
              picker="month"
              onChange={handleMonthChange}
              format="MMMM YYYY"
              allowClear={false} // Prevent clearing to ensure a month is always selected
              placeholder="Seleccionar mes"
              value={filters.selectedMonth}
            />
            <Text>
              Mostrando {type === 'ventas' ? 'ventas' : 'egresos'} de{' '}
              <strong>{filters.selectedMonth.format('MMMM YYYY')}</strong>
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

        {/* Cards de balance */}
        <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
          <Card
            style={{
              width: 300,
              borderRadius: 8,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #d9f7be',
              backgroundColor: '#f6ffed',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <DollarOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Total Ventas</Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: '#52c41a',
                    fontWeight: 'bold',
                  }}
                >
                  {currencyFormatter.format(totalVentas)}
                </Title>
              </div>
            </Space>
          </Card>
          <Card
            style={{
              width: 300,
              borderRadius: 8,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #ffccc7',
              backgroundColor: '#fff1f0',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <DollarOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Total Egresos</Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: '#ff4d4f',
                    fontWeight: 'bold',
                  }}
                >
                  {currencyFormatter.format(totalEgresos)}
                </Title>
              </div>
            </Space>
          </Card>
          <Card
            style={{
              width: 300,
              borderRadius: 8,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${balance < 0 ? '#ffccc7' : '#bae7ff'}`,
              backgroundColor: balance < 0 ? '#fff1f0' : '#e6f7ff',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <RiseOutlined style={{ fontSize: '32px', color: balance < 0 ? '#ff4d4f' : '#1890ff' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Balance</Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: balance < 0 ? '#ff4d4f' : '#1890ff',
                    fontWeight: 'bold',
                  }}
                >
                  {currencyFormatter.format(balance)}
                </Title>
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
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: type === 'ventas' ? 1200 : 800 }}
          locale={{ emptyText: `No hay ${type === 'ventas' ? 'ventas' : 'egresos'} disponibles` }}
        />
      </Spin>
    </div>
  );
};

export default CertificadosTable;