import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Button, Typography, message, Space, Spin, Card, Select, Tag, Popconfirm } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { DeleteOutlined, WhatsAppOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const StudentTable = ({
  onDelete,
  onEdit,
  students = [],
  loading = false,
  getCoordinatorStyle, // Asumimos que esta función define estilos para coordinadores
  fetchStudents,
}) => {
  const [filters, setFilters] = useState({
    searchText: {},
    selectedStatus: null, // Filtro por estado (activo/inactivo)
    selectedCoordinator: null, // Filtro por coordinador
  });
  const navigate = useNavigate();

  // Memoizar filteredData para optimizar el filtrado
  const filteredData = useMemo(() => {
    if (!Array.isArray(students)) return [];

    return students
      .filter((student) => {
        const { searchText, selectedStatus, selectedCoordinator } = filters;

        // Filtro por búsqueda
        const searchMatch = Object.keys(searchText).every((key) =>
          student && student[key]
            ? student[key].toString().toLowerCase().includes(searchText[key] || '')
            : true
        );

        // Filtro por estado (activo/inactivo)
        const statusMatch = selectedStatus
          ? student.activo === (selectedStatus === 'activo')
          : true;

        // Filtro por coordinador
        const coordinatorMatch = selectedCoordinator
          ? student.coordinador === selectedCoordinator
          : true;

        return searchMatch && statusMatch && coordinatorMatch;
      })
      .sort((a, b) => moment(b.fecha_inscripcion || 0).unix() - moment(a.fecha_inscripcion || 0).unix());
  }, [students, filters]);

  // Calcular estadísticas para las tarjetas
  const totalStudents = filteredData.length;
  const activeStudents = filteredData.filter((s) => s.activo).length;

  const handleSearch = (value, dataIndex) => {
    setFilters((prev) => ({
      ...prev,
      searchText: {
        ...prev.searchText,
        [dataIndex]: value.toLowerCase(),
      },
    }));
  };

  const handleStatusChange = (value) => {
    setFilters((prev) => ({
      ...prev,
      selectedStatus: value || null,
    }));
  };

  const handleCoordinatorChange = (value) => {
    setFilters((prev) => ({
      ...prev,
      selectedCoordinator: value || null,
    }));
  };

  const handleDeleteStudent = async (id) => {
    try {
      await onDelete(id);
      message.success('Estudiante eliminado correctamente');
      fetchStudents();
    } catch (error) {
      console.error('Error al eliminar estudiante:', error);
      message.error('Error al eliminar el estudiante');
    }
  };

  const columns = [
    {
      title: 'Documento',
      key: 'documento',
      render: (_, record) => (
        <span>
          {record.tipo_documento} {record.numero_documento || 'No especificado'}
        </span>
      ),
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar documento"
            onChange={(e) => handleSearch(e.target.value, 'numero_documento')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'Coordinador',
      dataIndex: 'coordinador',
      key: 'coordinador',
      render: (text) => (
        <Tag color={getCoordinatorStyle(text)?.color || 'default'}>{text}</Tag>
      ),
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar coordinador"
            onChange={(e) => handleSearch(e.target.value, 'coordinador')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'Nombre Completo',
      key: 'nombre_completo',
      render: (_, record) => <span>{record.nombre}</span>,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar nombre"
            onChange={(e) => handleSearch(e.target.value, 'nombre')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'Programa',
      key: 'programa_nombre',
      render: (_, record) => <span>{record.programa_nombre}</span>,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar programa"
            onChange={(e) => handleSearch(e.target.value, 'programa_nombre')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'Estado',
      key: 'estados',
      render: (_, record) => (
        <Space direction="vertical">
          <Tag color={record.activo ? 'green' : 'red'}>
            {record.activo ? 'Activo' : 'Inactivo'}
          </Tag>
          <Tag color={record.estado_matricula ? 'green' : 'yellow'}>
            {record.estado_matricula ? 'Matrícula Paga' : 'Matrícula Pendiente'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Correo',
      key: 'email',
      render: (_, record) => <span>{record.email}</span>,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar correo"
            onChange={(e) => handleSearch(e.target.value, 'email')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'WhatsApp',
      key: 'telefono_whatsapp',
      render: (_, record) => <span>{record.telefono_whatsapp}</span>,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar WhatsApp"
            onChange={(e) => handleSearch(e.target.value, 'telefono_whatsapp')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'Llamadas',
      key: 'telefono_llamadas',
      render: (_, record) => <span>{record.telefono_llamadas}</span>,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar teléfono"
            onChange={(e) => handleSearch(e.target.value, 'telefono_llamadas')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
    },
    {
      title: 'Fechas',
      key: 'fechas',
      render: (_, record) => (
        <Space direction="vertical">
          <Text>
            <strong>Inscripción:</strong>{' '}
            {record.fecha_inscripcion
              ? moment(record.fecha_inscripcion).format('DD/MM/YYYY')
              : 'No especificado'}
          </Text>
          {record.fecha_graduacion && (
            <Text>
              <strong>Graduación:</strong>{' '}
              {moment(record.fecha_graduacion).format('DD/MM/YYYY')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Pagos',
      key: 'facturas',
      render: (_, record) => (
        <Link to={`/inicio/students/facturas/${record.id}`} className="text-blue-500 hover:text-blue-700">
          Ver Pagos
        </Link>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="Eliminar estudiante"
            description="¿Está seguro de eliminar este estudiante? Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteStudent(record.id)}
            okText="Sí, eliminar"
            cancelText="No"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button danger type="link" icon={<DeleteOutlined />} />
          </Popconfirm>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(record);
            }}
          />
          <Button
            type="link"
            icon={<WhatsAppOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              let phoneNumber =
                record.telefono_whatsapp?.replace(/\D/g, '') ||
                record.telefono_llamadas?.replace(/\D/g, '');

              if (!phoneNumber) {
                message.error('No hay número de teléfono disponible');
                return;
              }

              if (!phoneNumber.startsWith('57')) {
                phoneNumber = `57${phoneNumber}`;
              }

              window.open(`https://wa.me/${phoneNumber}`, '_blank');
            }}
          />
        </Space>
      ),
    },
  ];

  // Obtener lista única de coordinadores para el filtro
  const coordinators = [...new Set(students.map((s) => s.coordinador).filter(Boolean))];

  return (
    <div className="p-4">
      <Space direction="vertical" size="middle" className="mb-4 w-full">
        <Space className="flex items-center justify-between w-full">
          <Space>
            <Select
              style={{ width: 150 }}
              placeholder="Filtrar por estado"
              allowClear
              onChange={handleStatusChange}
              value={filters.selectedStatus}
            >
              <Option value="activo">Activo</Option>
              <Option value="inactivo">Inactivo</Option>
            </Select>
            <Select
              style={{ width: 200 }}
              placeholder="Filtrar por coordinador"
              allowClear
              onChange={handleCoordinatorChange}
              value={filters.selectedCoordinator}
            >
              {coordinators.map((coord) => (
                <Option key={coord} value={coord}>
                  {coord}
                </Option>
              ))}
            </Select>
            <Text>
              Mostrando <strong>{totalStudents}</strong> estudiantes
              {filters.selectedStatus && (
                <span> ({filters.selectedStatus})</span>
              )}
              {filters.selectedCoordinator && (
                <span> para <strong>{filters.selectedCoordinator}</strong></span>
              )}
            </Text>
          </Space>
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
              <EditOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Total Estudiantes</Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: '#52c41a',
                    fontWeight: 'bold',
                  }}
                >
                  {totalStudents}
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
              <EditOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <div>
                <Text style={{ fontSize: 14, color: '#595959' }}>Estudiantes Activos</Text>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: '#52c41a',
                    fontWeight: 'bold',
                  }}
                >
                  {activeStudents}
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
          rowKey={(record) => record.id || Math.random()}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'No hay estudiantes disponibles' }}
          onRow={(record) => ({
            onClick: () => navigate(`/inicio/students/view/${record.id}`),
          })}
          rowClassName="cursor-pointer"
        />
      </Spin>

      <style jsx>{`
        .ant-table-cell {
          padding: 8px !important;
          font-size: 14px;
        }
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default StudentTable;