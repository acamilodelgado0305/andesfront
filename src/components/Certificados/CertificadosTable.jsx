import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Space, Spin, message, Button, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const CertificadosTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
  });
  const [userName, setUserName] = useState('');

  // Obtener datos del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log("No se encontró userId en localStorage");
          return;
        }
        const response = await axios.get(
          `https://back.app.validaciondebachillerato.com.co/auth/users/${userId}`
        );
        
        setUserName(response.data.name || '');

      } catch (err) {
        console.error("Error al obtener datos del usuario:", err);
        message.error("Error al cargar datos del usuario");
      }
    };

    fetchUserData();
  }, []);

  // Obtener certificados con filtros
  useEffect(() => {
    if (!userName) {
      console.log("No hay nombre de usuario disponible aún");
      return;
    }

    fetchCertificados();
  }, [userName, filters]);

  const fetchCertificados = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) {
        params.fechaInicio = filters.startDate.format('YYYY-MM-DD');
      }
      if (filters.endDate) {
        params.fechaFin = filters.endDate.format('YYYY-MM-DD');
      }

      console.log("Obteniendo certificados con parámetros:", params);
      
      const response = await axios.get('https://backendcoalianza.vercel.app/api/v1/clients', { params });
      
      console.log("Certificados recibidos:", response.data);
      console.log("Filtrando por vendedor:", userName);
      
      // Filtrar los certificados donde el vendedor coincide con el nombre del usuario
      const filteredData = response.data.filter(client => {
        const isMatch = client.vendedor === userName;
        console.log(`Certificado ${client._id} - Vendedor: ${client.vendedor} - ¿Coincide?: ${isMatch}`);
        return isMatch;
      });
      
      console.log(`Filtrados ${filteredData.length} certificados para el vendedor ${userName}`);
      setData(filteredData);
    } catch (error) {
      console.error('Error al obtener certificados:', error);
      message.error("Error al cargar los certificados");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertificado = async (id) => {
    setDeleteLoading(true);
    try {
      console.log(`Eliminando certificado con ID: ${id}`);
      await axios.delete(`https://backendcoalianza.vercel.app/api/v1/clients/${id}`);
      message.success('Certificado eliminado correctamente');
      
      // Actualizar la lista de certificados
      fetchCertificados();
    } catch (error) {
      console.error('Error al eliminar certificado:', error);
      message.error('Error al eliminar el certificado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    setFilters({
      startDate: dates?.[0] || null,
      endDate: dates?.[1] || null,
    });
  };

  const columns = [
    {
      title: 'Nombre Completo',
      dataIndex: 'nombre',
      render: (text, record) => (
        <span>{`${record.nombre.trim()} ${record.apellido.trim()}`}</span>
      ),
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
                loading={deleteLoading}
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
          dataSource={data}
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