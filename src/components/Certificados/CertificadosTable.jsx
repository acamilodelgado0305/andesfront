import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Space, Spin, message, Button, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import moment from 'moment';

const CertificadosTable = ({ data, loading, onRefresh, userName }) => {
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
  });

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

  const handleDateChange = (dates) => {
    setFilters({
      startDate: dates?.[0] || null,
      endDate: dates?.[1] || null,
    });
  };

  const filteredData = data.filter(cert => {
    const certDate = moment(cert.createdAt);
    const startDate = filters.startDate ? moment(filters.startDate) : null;
    const endDate = filters.endDate ? moment(filters.endDate) : null;

    return (!startDate || certDate.isSameOrAfter(startDate, 'day')) &&
           (!endDate || certDate.isSameOrBefore(endDate, 'day'));
  });

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
      sorter: (a, b) => a.numeroDeDocumento - b.numeroDeDocumento,
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
      title: 'Fecha Vencimiento',
      dataIndex: 'fechaVencimiento',
      render: (date) => date ? moment(date).format('DD/MM/YYYY') : 'No especificada',
      sorter: (a, b) => new Date(a.fechaVencimiento || 0) - new Date(b.fechaVencimiento || 0),
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
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
      <Space className="mb-4 flex items-center justify-between w-full">
        <DatePicker.RangePicker
          onChange={handleDateChange}
          format="DD/MM/YYYY"
          allowClear
          placeholder={['Fecha inicio', 'Fecha fin']}
        />
        <div className="text-blue-600">
          Mostrando certificados para: <strong>{userName}</strong>
        </div>
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
          scroll={{ x: 1000 }}
          locale={{ emptyText: 'No hay certificados disponibles' }}
        />
      </Spin>
    </div>
  );
};

export default CertificadosTable;