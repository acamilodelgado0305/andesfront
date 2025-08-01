import React from 'react';
import { Table, Tag, Tooltip, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para determinar el color y texto de la etiqueta de estado
const getStatusTag = (status) => {
    if (status === 'active') {
        return <Tag color="green">Activo</Tag>;
    }
    if (status === 'expired') {
        return <Tag color="red">Vencido</Tag>;
    }
    // Puedes añadir más estados como 'pending_payment'
    return <Tag color="default">Sin Suscripción</Tag>;
};

function ClientsTable({ clientsData, onViewDetails }) {
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => getStatusTag(status),
      filters: [
          { text: 'Activo', value: 'active' },
          { text: 'Vencido', value: 'expired' },
          { text: 'Sin Suscripción', value: null },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Vencimiento',
      dataIndex: 'end_date',
      key: 'end_date',
      align: 'center',
      render: (date) => {
        if (!date) return 'N/A';
        // Formateamos la fecha a "dd 'de' MMMM 'de' yyyy"
        return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: es });
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'center',
      render: (text, record) => (
        <Tooltip title="Ver Detalles del Cliente">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onViewDetails(record.id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={clientsData}
      rowKey="id"
      size="small" // Clave para un look denso y con poco padding
      pagination={{ pageSize: 20, showSizeChanger: false }} // Ajusta la paginación
      style={{ background: '#fff' }} // Fondo blanco para la tabla
    />
  );
}

export default ClientsTable;