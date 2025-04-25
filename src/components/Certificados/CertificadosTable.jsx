import React, { useState, useEffect, useMemo } from 'react';
import { Table, DatePicker, Space, Spin, message, Button, Popconfirm, Tooltip, Tag, Typography, Card, Select } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, DollarOutlined, FileProtectOutlined, DownloadOutlined } from '@ant-design/icons';
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

const CertificadosTable = ({ data, loading, onRefresh, userName }) => {
  const [filters, setFilters] = useState({
    selectedMonth: moment(), // Mes actual por defecto
    selectedAccount: null, // Cuenta seleccionada (null para todas)
  });

  // Memoizar filteredData para optimizar el filtrado
  const filteredData = useMemo(() => {
    console.log('Filtrando datos para mes:', filters.selectedMonth.format('YYYY-MM'));
    console.log('Cuenta seleccionada:', filters.selectedAccount);

    const result = data
      .filter((cert) => {
        // Validar que createdAt sea una fecha válida
        if (!cert.createdAt || !moment(cert.createdAt).isValid()) {
          console.warn('Fecha inválida en certificado:', cert);
          return false;
        }

        const certDate = moment(cert.createdAt);
        const { selectedMonth, selectedAccount } = filters;

        // Filtrar por mes/año
        const monthMatch = selectedMonth
          ? certDate.year() === selectedMonth.year() && certDate.month() === selectedMonth.month()
          : true;

        // Filtrar por cuenta
        const accountMatch = selectedAccount ? cert.cuenta === selectedAccount : true;

        return monthMatch && accountMatch;
      })
      .sort((a, b) => moment(b.createdAt).unix() - moment(a.createdAt).unix());

    console.log('Certificados filtrados:', result.length);
    return result;
  }, [data, filters]);

  // Calcular el total de ventas y el número de certificados
  const totalVentas = filteredData.reduce((sum, cert) => sum + (cert.valor || 0), 0);
  const totalCertificados = filteredData.length;

  // Función para descargar el PDF
  const handleDownloadPDF = () => {
    try {
      console.log('Iniciando descarga de PDF...');
      console.log('Datos filtrados:', filteredData);

      if (filteredData.length === 0) {
        message.warning('No hay certificados para descargar en el mes seleccionado.');
        return;
      }

      const doc = new jsPDF();
      console.log('Documento PDF creado');

      // Título
      doc.setFontSize(16);
      doc.text('Certificados Vendidos', 14, 20);
      doc.setFontSize(12);
      doc.text(`Mes: ${filters.selectedMonth.format('MMMM YYYY')}`, 14, 30);
      doc.text(`Vendedor: ${userName || 'No especificado'}`, 14, 40);
      if (filters.selectedAccount) {
        doc.text(`Cuenta: ${filters.selectedAccount}`, 14, 50);
      }

      // Listar datos como texto
      let y = filters.selectedAccount ? 60 : 50;
      filteredData.forEach((cert, index) => {
        const nombreCompleto = `${cert.nombre?.trim() || ''} ${cert.apellido?.trim() || ''}`.trim() || 'Sin nombre';
        const numeroDeDocumento = cert.numeroDeDocumento || 'No especificado';
        doc.text(`${index + 1}. ${nombreCompleto} - ${numeroDeDocumento}`, 14, y);
        y += 10;
      });

      console.log('Texto generado, intentando guardar PDF...');
      doc.save(`Certificados_${filters.selectedMonth.format('YYYY-MM')}${filters.selectedAccount ? `_${filters.selectedAccount}` : ''}.pdf`);
      message.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      message.error('Error al generar el PDF. Por favor, intenta de nuevo.');
    }
  };

  const handleDeleteCertificado = async (id) => {
    try {
      await axios.delete(`https://backendcoalianza.vercel.app/api/v1/clients/${id}`);
      message.success('Certificado eliminado correctamente');
      onRefresh();
    } catch (error) {
      console.error('Error al eliminar certificado:', error);
      message.error('Error al eliminar el certificado');
    }
  };

  const handleMonthChange = (date) => {
    console.log('Mes seleccionado:', date ? date.format('YYYY-MM') : moment().format('YYYY-MM'));
    setFilters((prev) => ({
      ...prev,
      selectedMonth: date || moment(),
    }));
  };

  const handleAccountChange = (value) => {
    console.log('Cuenta seleccionada:', value || 'Ninguna');
    setFilters((prev) => ({
      ...prev,
      selectedAccount: value || null,
    }));
  };

  const columns = [
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
            title="Eliminar certificado"
            description="¿Está seguro de eliminar este certificado? Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteCertificado(record._id)}
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
              allowClear
              placeholder="Seleccionar mes"
              value={filters.selectedMonth}
            />
            {filters.selectedMonth && (
              <Text>
                Mostrando certificados de{' '}
                <strong>{filters.selectedMonth.format('MMMM YYYY')}</strong>
                {filters.selectedAccount && (
                  <span> para <strong>{filters.selectedAccount}</strong></span>
                )}
              </Text>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
            >
              Descargar PDF
            </Button>
          </Space>
          <Text>
            Mostrando certificados para: <strong>{userName}</strong>
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
              border: '1px solid #d9f7be',
              backgroundColor: '#f6ffed',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <FileProtectOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Certificados Vendidos</Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: '#52c41a',
                    fontWeight: 'bold',
                  }}
                >
                  {totalCertificados}
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
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'No hay certificados disponibles' }}
        />
      </Spin>
    </div>
  );
};

export default CertificadosTable;