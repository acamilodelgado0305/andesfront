import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Space, Spin, message, Button, Popconfirm, Tooltip, Tag, Typography, Card } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, DollarOutlined, FileProtectOutlined } from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';

// Formateador para pesos colombianos
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const { Text, Title } = Typography;

const CertificadosTable = ({ data, loading, onRefresh, userName }) => {
  const [filters, setFilters] = useState({
    selectedMonth: null, // Almacena el mes seleccionado (formato moment)
  });

  // Calcular certificados filtrados y total de ventas
  const filteredData = data
    .filter((cert) => {
      const certDate = moment(cert.createdAt);
      const selectedMonth = filters.selectedMonth;

      // Filtrar por mes/año si hay un mes seleccionado
      if (selectedMonth) {
        return (
          certDate.year() === selectedMonth.year() &&
          certDate.month() === selectedMonth.month()
        );
      }
      return true; // Si no hay filtro, mostrar todos
    })
    .sort((a, b) => moment(b.createdAt).unix() - moment(a.createdAt).unix()); // Ordenar por createdAt descendente

  // Calcular el total de ventas y el número de certificados
  const totalVentas = filteredData.reduce((sum, cert) => sum + (cert.valor || 0), 0);
  const totalCertificados = filteredData.length;

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
    setFilters({
      selectedMonth: date, // Almacenar el mes seleccionado (o null si se limpia)
    });
  };

  const columns = [
    {
      title: 'Nombre Completo',
      dataIndex: 'nombre',
      render: (text, record) => <span>{`${record.nombre.trim()} ${record.apellido.trim()}`}</span>,
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Documento',
      dataIndex: 'numeroDeDocumento',
      sorter: (a, b) => a.numeroDeDocumento.localeCompare(b.numeroDeDocumento),
    },
    {
      title: 'Tipo de Certificado',
      dataIndex: 'tipo',
      render: (tipo) => (Array.isArray(tipo) ? tipo.join(', ') : tipo),
    },
    {
      title: 'Vendedor',
      dataIndex: 'vendedor',
      sorter: (a, b) => a.vendedor.localeCompare(b.vendedor),
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
            <DatePicker
              picker="month"
              onChange={handleMonthChange}
              format="MMMM YYYY"
              allowClear
              placeholder="Seleccionar mes"
            />
            {filters.selectedMonth && (
              <Text>
                Mostrando certificados de{' '}
                <strong>{filters.selectedMonth.format('MMMM YYYY')}</strong>
              </Text>
            )}
          </Space>
          <Text>
            Mostrando certificados para: <strong>{userName}</strong>
          </Text>
        </Space>

        {/* Contenedor destacado para el total de ventas y certificados */}
        <Card
          size="small"
          className="shadow-sm"
          style={{
            backgroundColor: '#f6ffed',
            borderColor: '#b7eb8f',
          }}
        >
          <Space align="center" size="large">
            <Space align="center">
              <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: '#52c41a',
                  fontWeight: 'bold',
                }}
              >
                Total Ventas: {currencyFormatter.format(totalVentas)}
              </Title>
            </Space>
            <Space align="center">
              <FileProtectOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: '#52c41a',
                  fontWeight: 'bold',
                }}
              >
                Certificados: {totalCertificados}
              </Title>
            </Space>
          </Space>
        </Card>
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