import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Input, Button, Typography, message, Space, Spin, Card, Select, Tag, Popconfirm, DatePicker, Tooltip } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { DeleteOutlined, WhatsAppOutlined, EditOutlined, ExclamationCircleOutlined, UserOutlined, FilePdfOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';
import { getStudentById } from '../../services/studentService';
import { generateGradeReportPDF } from '../Utilidades/generateGradeReportPDF.js'; // Asegúrate de que esta ruta sea correcta

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const StudentTable = ({
  onDelete,
  onEdit,
  students = [],
  loading = false,
  getCoordinatorStyle, // Esta función debe estar definida en el componente padre o ser una utilidad global
  fetchStudents,
}) => {
  const [filters, setFilters] = useState({
    searchText: {},
    selectedStatus: null,
    selectedCoordinator: null,
    dateRange: null,
    predefinedDate: null,
  });
  const navigate = useNavigate();

  // Función para obtener los valores únicos de coordinadores para el filtro
  const coordinators = useMemo(() => {
    return [...new Set(students.map((s) => s.coordinador_nombre).filter(Boolean))];
  }, [students]);

  // Manejar búsqueda por texto
  const handleSearch = useCallback((value, dataIndex) => {
    setFilters((prev) => ({
      ...prev,
      searchText: {
        ...prev.searchText,
        [dataIndex]: value.toLowerCase(),
      },
    }));
  }, []);

  // Manejar cambio de filtros generales
  const handleFilterChange = useCallback((value, filterType) => {
    setFilters((prev) => {
      const newState = { ...prev };
      if (filterType === 'predefinedDate') {
        newState.predefinedDate = value;
        newState.dateRange = null; // Resetear rango personalizado
      } else if (filterType === 'dateRange') {
        newState.dateRange = value;
        newState.predefinedDate = null; // Resetear opción predefinida
      } else {
        newState[filterType] = value;
      }
      return newState;
    });
  }, []);

  // Calcular datos filtrados
  const filteredData = useMemo(() => {
    if (!Array.isArray(students)) return [];

    return students
      .filter((student) => {
        const { searchText, selectedStatus, selectedCoordinator, dateRange, predefinedDate } = filters;

        // Filtro por texto
        const searchMatch = Object.keys(searchText).every((key) => {
          // Manejo específico para programas_asociados
          if (key === 'nombre_programa') {
            return student.programas_asociados && student.programas_asociados.some(
              (p) => p.nombre_programa.toLowerCase().includes(searchText[key] || '')
            );
          }
          return student && student[key]
            ? student[key].toString().toLowerCase().includes(searchText[key] || '')
            : true;
        });

        // Filtro por estado
        const statusMatch = selectedStatus
          ? student.activo === (selectedStatus === 'activo')
          : true;

        // Filtro por coordinador
        const coordinatorMatch = selectedCoordinator
          ? student.coordinador_nombre === selectedCoordinator
          : true;

        // Filtro por fecha de inscripción
        let dateMatch = true;
        if (student.fecha_inscripcion) {
          const inscriptionDate = moment(student.fecha_inscripcion);
          if (dateRange) {
            const [start, end] = dateRange;
            dateMatch = inscriptionDate.isBetween(start, end, 'day', '[]');
          } else if (predefinedDate) {
            const now = moment();
            let startDate;
            switch (predefinedDate) {
              case 'week':
                startDate = now.clone().subtract(7, 'days');
                dateMatch = inscriptionDate.isAfter(startDate);
                break;
              case 'month':
                startDate = now.clone().subtract(1, 'month');
                dateMatch = inscriptionDate.isAfter(startDate);
                break;
              case 'quarter':
                startDate = now.clone().subtract(3, 'months');
                dateMatch = inscriptionDate.isAfter(startDate);
                break;
              case 'all':
              default:
                dateMatch = true; // Mostrar todos los resultados si "Todo" o ningún filtro predefinido
                break;
            }
          }
        }
        return searchMatch && statusMatch && coordinatorMatch && dateMatch;
      })
      .sort((a, b) => moment(b.fecha_inscripcion || 0).unix() - moment(a.fecha_inscripcion || 0).unix());
  }, [students, filters]);

  const totalStudents = filteredData.length;
  const activeStudents = filteredData.filter((s) => s.activo).length;

  // Eliminar estudiante
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

  // Descargar boletín
  const handleDownloadGrades = async (studentId, student) => {
    try {
      const [studentData, gradesResponse] = await Promise.all([
        getStudentById(studentId),
        axios.get(`https://clasit-backend-api-570877385695.us-central1.run.app/api/grades/students/${studentId}`),
      ]);
      const grades = gradesResponse.data;
      generateGradeReportPDF(studentData, grades, studentId);
    } catch (err) {
      console.error('Error downloading grades:', err);
      message.error('Error al descargar el boletín');
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Documento',
      key: 'documento',
      render: (_, record) => (
        <span className="truncate-text" title={`${record.tipo_documento} ${record.numero_documento || 'No especificado'}`}>
          {record.tipo_documento} {record.numero_documento || 'No especificado'}
        </span>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar documento"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys[0], 'numero_documento')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                handleSearch(selectedKeys[0], 'numero_documento');
                confirm();
              }}
              icon={<SearchOutlined />} // Asumo que tienes SearchOutlined importado
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button onClick={() => {
              clearFilters();
              handleSearch('', 'numero_documento');
            }} size="small" style={{ width: 90 }}>
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        record.numero_documento?.toString().toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Nombre Completo',
      key: 'nombre_completo',
      render: (_, record) => (
        <span className="truncate-text" title={`${record.nombre} ${record.apellido}`}>
          {record.nombre} {record.apellido}
        </span>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar nombre"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys[0], 'nombre')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                handleSearch(selectedKeys[0], 'nombre');
                confirm();
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button onClick={() => {
              clearFilters();
              handleSearch('', 'nombre');
            }} size="small" style={{ width: 90 }}>
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        record.nombre?.toString().toLowerCase().includes(value.toLowerCase()) ||
        record.apellido?.toString().toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Coordinador',
      dataIndex: 'coordinador_nombre',
      key: 'coordinador_nombre',
      render: (text) => (
        <Tag color={getCoordinatorStyle(text)?.color || 'default'}>{text}</Tag>
      ),
      // Usar el filtro de Ant Design para el coordinador, ya que tenemos una lista finita
      filters: coordinators.map(coord => ({ text: coord, value: coord })),
      onFilter: (value, record) => record.coordinador === value,
      filterSearch: true, // Habilitar búsqueda en el dropdown de filtro
    },
    {
      title: 'Programas',
      key: 'programas_asociados',
      render: (_, record) => (
        <Space wrap size={[0, 'small']}> {/* Utiliza wrap para que las etiquetas salten de línea si no caben */}
          {record.programas_asociados && record.programas_asociados.length > 0 ? (
            record.programas_asociados.map((programa, index) => (
              <Tag key={index} color="blue">
                {programa.nombre_programa}
              </Tag>
            ))
          ) : (
            <Tag color="volcano">Sin programas</Tag>
          )}
        </Space>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar programa"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys[0], 'nombre_programa')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                handleSearch(selectedKeys[0], 'nombre_programa');
                confirm();
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button onClick={() => {
              clearFilters();
              handleSearch('', 'nombre_programa');
            }} size="small" style={{ width: 90 }}>
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        record.programas_asociados?.some(p => p.nombre_programa.toLowerCase().includes(value.toLowerCase())),
    },
    {
      title: 'Estado',
      key: 'estados',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.activo ? 'green' : 'red'}>
            {record.activo ? 'Activo' : 'Inactivo'}
          </Tag>
          <Tag color={record.estado_matricula ? 'green' : 'yellow'}>
            {record.estado_matricula ? 'Matrícula Paga' : 'Matrícula Pendiente'}
          </Tag>
        </Space>
      ),
      filters: [
        { text: 'Activo', value: 'activo' },
        { text: 'Inactivo', value: 'inactivo' },
      ],
      onFilter: (value, record) => record.activo === (value === 'activo'),
    },
    {
      title: 'Contacto',
      key: 'contacto',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.email && (
            <Tooltip title={record.email}>
              <Text className="truncate-text" style={{ maxWidth: '150px' }}>{record.email}</Text>
            </Tooltip>
          )}
          {record.telefono_whatsapp && (
            <Tooltip title={`WhatsApp: ${record.telefono_whatsapp}`}>
              <Text className="truncate-text">{record.telefono_whatsapp}</Text>
            </Tooltip>
          )}
          {record.telefono_llamadas && record.telefono_llamadas !== record.telefono_whatsapp && (
            <Tooltip title={`Llamadas: ${record.telefono_llamadas}`}>
              <Text className="truncate-text">{record.telefono_llamadas}</Text>
            </Tooltip>
          )}
          {!record.email && !record.telefono_whatsapp && !record.telefono_llamadas && (
            <Text type="secondary">Sin contacto</Text>
          )}
        </Space>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar email/teléfono"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys[0], 'email') || handleSearch(selectedKeys[0], 'telefono_whatsapp') || handleSearch(selectedKeys[0], 'telefono_llamadas')}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                handleSearch(selectedKeys[0], 'email');
                handleSearch(selectedKeys[0], 'telefono_whatsapp');
                handleSearch(selectedKeys[0], 'telefono_llamadas');
                confirm();
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Buscar
            </Button>
            <Button onClick={() => {
              clearFilters();
              handleSearch('', 'email');
              handleSearch('', 'telefono_whatsapp');
              handleSearch('', 'telefono_llamadas');
            }} size="small" style={{ width: 90 }}>
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        record.email?.toString().toLowerCase().includes(value.toLowerCase()) ||
        record.telefono_whatsapp?.toString().toLowerCase().includes(value.toLowerCase()) ||
        record.telefono_llamadas?.toString().toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Fechas',
      key: 'fechas',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tooltip title={`Inscripción: ${record.fecha_inscripcion ? moment(record.fecha_inscripcion).format('DD/MM/YYYY') : 'No especificado'}`}>
            <Text>
              Insc.: {record.fecha_inscripcion ? moment(record.fecha_inscripcion).format('DD/MM/YY') : 'N/A'}
            </Text>
          </Tooltip>
          {record.fecha_graduacion && (
            <Tooltip title={`Graduación: ${moment(record.fecha_graduacion).format('DD/MM/YYYY')}`}>
              <Text>
                Grad.: {moment(record.fecha_graduacion).format('DD/MM/YY')}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Pagos',
      key: 'facturas',
      render: (_, record) => (
        <Link to={`/inicio/students/facturas/${record.id}`} className="text-blue-500 hover:text-blue-700">
          <Button type="link" icon={<EyeOutlined />} size="small">Ver</Button>
        </Link>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 150, // Ajusta el ancho para que los botones no se salgan
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="Eliminar estudiante"
            description="¿Está seguro de eliminar este estudiante? Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteStudent(record.id)}
            okText="Sí"
            cancelText="No"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title="Eliminar">
              <Button danger type="text" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Enviar WhatsApp">
            <Button
              type="text"
              icon={<WhatsAppOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                let phoneNumber =
                  record.telefono_whatsapp?.replace(/\D/g, '') ||
                  record.telefono_llamadas?.replace(/\D/g, '');

                if (!phoneNumber) {
                  message.error('No hay número de teléfono disponible para WhatsApp');
                  return;
                }

                if (!phoneNumber.startsWith('57')) {
                  phoneNumber = `57${phoneNumber}`;
                }

                window.open(`https://wa.me/${phoneNumber}`, '_blank');
              }}
            />
          </Tooltip>
          <Tooltip title="Descargar Boletín">
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadGrades(record.id, record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  return (
    <div className="p-4">
      <Space direction="vertical" size="large" className="mb-6 w-full">
        {/* Sección de Filtros */}
        <Space wrap className="w-full justify-start items-center">
          <Select
            style={{ width: 150 }}
            placeholder="Filtrar por estado"
            allowClear
            onChange={(value) => handleFilterChange(value, 'selectedStatus')}
            value={filters.selectedStatus}
          >
            <Option value="activo">Activo</Option>
            <Option value="inactivo">Inactivo</Option>
          </Select>
          <Select
            style={{ width: 200 }}
            placeholder="Filtrar por coordinador"
            allowClear
            onChange={(value) => handleFilterChange(value, 'selectedCoordinator')}
            value={filters.selectedCoordinator}
            showSearch // Habilita la búsqueda dentro del select
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {coordinators.map((coord) => (
              <Option key={coord} value={coord}>
                {coord}
              </Option>
            ))}
          </Select>
          <Select
            style={{ width: 200 }}
            placeholder="Filtrar por fecha predefinida"
            allowClear
            onChange={(value) => handleFilterChange(value, 'predefinedDate')}
            value={filters.predefinedDate}
          >
            <Option value="week">Última semana</Option>
            <Option value="month">Último mes</Option>
            <Option value="quarter">Últimos 3 meses</Option>
            <Option value="all">Todo</Option>
          </Select>
          <RangePicker
            style={{ width: 300 }}
            onChange={(dates) => handleFilterChange(dates, 'dateRange')}
            value={filters.dateRange}
            format="DD/MM/YYYY"
            placeholder={['Fecha inicio', 'Fecha fin']}
            disabled={filters.predefinedDate !== null && filters.predefinedDate !== 'all'} // Deshabilita si hay un filtro predefinido activo
          />
        </Space>

        {/* Sección de Resumen y Métricas */}
        <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
          <Card
            style={{
              width: 280, // Ajustado el ancho
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
              width: 280, // Ajustado el ancho
              borderRadius: 8,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #d9f7be',
              backgroundColor: '#f6ffed',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space align="center" size="middle">
              <UserOutlined style={{ fontSize: '32px', color: '#52c41a' }} /> {/* Icono más apropiado */}
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

      <Spin spinning={loading} tip="Cargando estudiantes..."> {/* Mejorar el texto del tip */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => record.id || Math.random()}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'], // Más opciones de paginación
            showTotal: (total, range) => `Mostrando ${range[0]}-${range[1]} de ${total} estudiantes`, // Texto informativo
          }}
          scroll={{ x: 'max-content' }} // Usa 'max-content' para que la tabla sea tan ancha como su contenido
          locale={{ emptyText: 'No hay estudiantes disponibles que coincidan con los filtros.' }}
          onRow={(record) => ({
            onClick: () => navigate(`/inicio/students/view/${record.id}`),
          })}
          rowClassName="cursor-pointer"
          bordered // Añade bordes a la tabla para una mejor separación visual
          size="middle" // Tamaño de la tabla más compacto
        />
      </Spin>

      <style jsx>{`
        .ant-table-cell {
          padding: 10px 8px !important; /* Ajustar padding para más espacio */
          font-size: 13px; /* Fuente ligeramente más pequeña para compactar */
          white-space: nowrap; /* Evita que el texto se envuelva por defecto */
          overflow: hidden; /* Oculta el texto que se desborda */
          text-overflow: ellipsis; /* Añade puntos suspensivos al texto desbordado */
        }
        .truncate-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block; /* Asegura que el span se comporte como un bloque para el truncado */
          max-width: 100%; /* Asegura que el truncado funcione dentro de la columna */
        }
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default StudentTable;