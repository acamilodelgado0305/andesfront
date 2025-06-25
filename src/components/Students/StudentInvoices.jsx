// src/components/Students/StudentInvoices.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Importar useCallback
import {
  Table,
  Button,
  Card,
  Modal,
  message,
  Typography,
  Row,
  Col,
  Space,
  Tag,
  Spin, // Importar Spin para mejor feedback de carga
} from 'antd';
import {
  FaTrashAlt,
  FaMoneyCheckAlt,
} from 'react-icons/fa';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import {
  getInvoicebyStudent,
  getStudentById,
  payInvoice,
  getTotalPaymentInvoicebyStudent,
  deleteInvoice,
} from '../../services/studentService'; // Asume que estas funciones son correctas en tu servicio

const { Title, Text } = Typography;

const StudentInvoices = ({ studentId }) => {
  const [facturas, setFacturas] = useState([]);
  const [student, setStudent] = useState(null);
  const [totalPagado, setTotalPagado] = useState(0);
  const [loading, setLoading] = useState(true);

  // Utilizar useCallback para memorizar funciones y evitar re-renders innecesarios
  const formatCurrency = useCallback((value) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    return numericValue.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
    });
  }, []);

  const formatDateToMonth = useCallback((fecha) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const date = new Date(fecha);
    // Asegurarse de que la fecha sea válida antes de intentar acceder a getMonth
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  }, []);

  // Función unificada para cargar todos los datos iniciales y manejar el estado de carga
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Usar Promise.all para cargar todos los datos en paralelo
      const [studentData, invoicesData, totalPaymentResult] = await Promise.all([
        getStudentById(studentId),
        getInvoicebyStudent(studentId),
        getTotalPaymentInvoicebyStudent(studentId),
      ]);

      setStudent(studentData);
      setFacturas(invoicesData);

      const totalFacturas = parseFloat(totalPaymentResult.total_pagado || 0);

      // Calcular el total pagado incluyendo la matrícula si está paga
      let calculatedTotalPagado = totalFacturas;
      // Asegúrate de que 'matricula' y 'estado_matricula' existen en studentData
      if (studentData && studentData.estado_matricula && studentData.matricula !== undefined && studentData.matricula !== null) {
        calculatedTotalPagado += parseFloat(studentData.matricula);
      }
      setTotalPagado(calculatedTotalPagado);

    } catch (err) {
      console.error('Error al cargar los datos iniciales:', err);
      message.error('Error al cargar la información de pagos y facturas.');
      setStudent(null); // Asegurar que student sea null en caso de error
      setFacturas([]);
      setTotalPagado(0);
    } finally {
      setLoading(false);
    }
  }, [studentId]); // Dependencias para useCallback

  // Efecto para cargar los datos iniciales cuando studentId cambia
  useEffect(() => {
    loadInitialData();
  }, [studentId, loadInitialData]); // 'loadInitialData' es una dependencia del useEffect

  // Funciones de manejo de acciones (pagar factura, pagar matrícula, eliminar factura)
  const handlePayment = async (facturaId) => {
    Modal.confirm({
      title: '¿Desea realizar el pago de esta factura?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, pagar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await payInvoice(facturaId);
          message.success('La factura ha sido pagada');
          // Volver a cargar todos los datos para asegurar la consistencia
          await loadInitialData();
        } catch (error) {
          console.error('Error al procesar el pago:', error);
          message.error('Hubo un problema al procesar el pago');
        }
      },
    });
  };

  const handlePaymentMatricula = async () => {
    Modal.confirm({
      title: '¿Desea realizar el pago de la matrícula?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, pagar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          if (!student || student.matricula === undefined || student.matricula === null) {
            throw new Error('Valor de matrícula no disponible.');
          }

          // La URL de la API debe ser correcta: /api/students/status_matricula/:id
          const response = await axios.put(
            `https://back.app.validaciondebachillerato.com.co/api/students/status_matricula/${studentId}`,
            { estado_matricula: true },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (response.status === 200) {
            message.success('La matrícula ha sido pagada exitosamente');
            // Volver a cargar todos los datos para reflejar los cambios
            await loadInitialData();
          }
        } catch (error) {
          console.error('Error al procesar el pago de matrícula:', error);
          message.error(
            `Error al procesar el pago: ${
              error.response?.data?.message || 'Error al conectar con el servidor'
            }`
          );
        }
      },
    });
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '¿Está seguro de que desea eliminar esta factura?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteInvoice(id);
          message.success('Factura eliminada con éxito');
          // Volver a cargar todos los datos para asegurar la consistencia
          await loadInitialData();
        } catch (error) {
          console.error('Error al eliminar la factura:', error);
          message.error('Error al eliminar la factura');
        }
      },
    });
  };

  // Definición de columnas de la tabla (no necesitan cambios a menos que quieras más detalle)
  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) => formatDateToMonth(fecha),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      render: (monto) => formatCurrency(monto),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      // Añadir ellipsis para descripciones largas
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag
          color={estado ? 'green' : 'red'}
          // Ajustar estilo para que el ícono se vea bien
          style={{ fontSize: '16px', padding: '4px 8px' }}
          icon={estado ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {estado ? 'Pagada' : 'Pendiente'} {/* Mostrar texto también */}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space size="small">
          {record.estado ? (
            <Button disabled>Pagado</Button>
          ) : (
            <Button
              type="primary"
              icon={<FaMoneyCheckAlt />}
              onClick={() => handlePayment(record.id)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Pagar
            </Button>
          )}
          <Button
            icon={<FaTrashAlt />}
            onClick={() => handleDelete(record.id)}
            danger
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  // Componente de carga o sin datos
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando facturas y datos del estudiante..." />
      </div>
    );
  }

  // Si no se pudo cargar el estudiante, mostrar un mensaje de error
  if (!student) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="danger">Error: No se pudo cargar los datos del estudiante.</Text>
        <Button onClick={loadInitialData} style={{ marginTop: '20px' }}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100%' }}>
      {/* Encabezado */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <Row align="middle">
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>
              Facturas de {student.nombre} {student.apellido || ''} {/* Acceder a apellido */}
            </Title>
            <Text type="secondary">
              Coordinador: {student.coordinador || 'No especificado'}
            </Text>
          </Col>
          <Col>
            <Text strong>Total Pagado: </Text>
            <Text style={{ fontSize: '1.25rem', color: '#1890ff' }}>
              {formatCurrency(totalPagado)}
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Información de Matrícula */}
      <Card
        title="Información de Matrícula"
        style={{
          marginBottom: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Text strong>Valor de Matrícula</Text>
            <div style={{ marginTop: '8px' }}>
              <Text>{formatCurrency(student.matricula || 0)}</Text> {/* Manejar valor nulo/indefinido */}
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Estado</Text>
            <div style={{ marginTop: '8px' }}>
              <Tag
                color={student.estado_matricula ? 'green' : 'red'}
                style={{ fontSize: '16px', padding: '4px 8px' }}
                icon={student.estado_matricula ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              >
                {student.estado_matricula ? 'Matrícula Paga' : 'Matrícula Pendiente'}
              </Tag>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Acción</Text>
            <div style={{ marginTop: '8px' }}>
              {student.estado_matricula ? (
                <Button disabled>Pagado</Button>
              ) : (
                <Button
                  type="primary"
                  icon={<FaMoneyCheckAlt />}
                  onClick={handlePaymentMatricula}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  Pagar Matrícula
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Lista de Facturas */}
      <Card
        title="Facturas Mensuales"
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Table
          columns={columns}
          dataSource={facturas}
          rowKey="id"
          pagination={false} // Mantener paginación en false si quieres ver todas
          bordered
          locale={{ emptyText: 'No hay facturas disponibles para este estudiante.' }}
          style={{ background: '#fff', borderRadius: '8px' }}
        />
      </Card>
    </div>
  );
};

export default StudentInvoices;