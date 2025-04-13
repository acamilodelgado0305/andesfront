// src/components/Students/StudentInvoices.jsx
import React, { useState, useEffect } from 'react';
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
} from '../../services/studentService';

const { Title, Text } = Typography;

const StudentInvoices = ({ studentId }) => {
  const [facturas, setFacturas] = useState([]);
  const [student, setStudent] = useState(null);
  const [totalPagado, setTotalPagado] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPaymentInvoicebyStudent = async (id) => {
    try {
      const result = await getTotalPaymentInvoicebyStudent(id);
      const totalFacturas = parseFloat(result.total_pagado || 0);

      if (!student) {
        const studentData = await getStudentById(id);
        setStudent(studentData);

        if (studentData.estado_matricula) {
          setTotalPagado(totalFacturas + parseFloat(studentData.matricula || 0));
        } else {
          setTotalPagado(totalFacturas);
        }
      } else {
        if (student.estado_matricula) {
          setTotalPagado(totalFacturas + parseFloat(student.matricula || 0));
        } else {
          setTotalPagado(totalFacturas);
        }
      }
    } catch (err) {
      console.error('Error fetching total pagado:', err);
      message.error('Error al cargar el total pagado');
    }
  };

  const fetchInvoicebyStudent = async (id) => {
    try {
      const data = await getInvoicebyStudent(id);
      const currentYear = new Date().getFullYear();

      const facturasAñoActual = [];
      const facturasAñosAnteriores = [];

      data.forEach((factura) => {
        const facturaYear = new Date(factura.fecha).getFullYear();
        if (facturaYear === currentYear) {
          facturasAñoActual.push(factura);
        } else {
          facturasAñosAnteriores.push(factura);
        }
      });

      const sortFacturas = (a, b) => new Date(a.fecha) - new Date(b.fecha);

      facturasAñoActual.sort(sortFacturas);
      facturasAñosAnteriores.sort(sortFacturas);

      const facturasOrdenadas = [
        ...facturasAñoActual,
        ...facturasAñosAnteriores,
      ];

      setFacturas(facturasOrdenadas);
    } catch (err) {
      console.error('Error fetching facturas:', err);
      message.error('Error al cargar las facturas');
    }
  };

  const fetchStudentById = async (id) => {
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (err) {
      console.error('Error fetching student:', err);
      message.error('Error al cargar los datos del estudiante');
    }
  };

  const formatDateToMonth = (fecha) => {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const date = new Date(fecha);
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatCurrency = (value) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    return numericValue.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
    });
  };

  const handlePayment = async (facturaId) => {
    Modal.confirm({
      title: '¿Desea realizar el pago de esta factura?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, pagar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await payInvoice(facturaId);

          setFacturas((prevFacturas) =>
            prevFacturas.map((factura) =>
              factura.id === facturaId ? { ...factura, estado: true } : factura
            )
          );

          message.success('La factura ha sido pagada');
          await fetchPaymentInvoicebyStudent(studentId);
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
          if (!student || !student.matricula) {
            throw new Error('Datos del estudiante no disponibles');
          }

          const matriculaValue = parseFloat(student.matricula);

          const response = await axios.put(
            `https://back.app.validaciondebachillerato.com.co/api/students/status_matricula/${studentId}`,
            { estado_matricula: true },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (response.status === 200) {
            setStudent((prevStudent) => ({
              ...prevStudent,
              estado_matricula: true,
            }));

            setTotalPagado((prevTotal) => prevTotal + matriculaValue);

            message.success('La matrícula ha sido pagada exitosamente');

            await Promise.all([
              fetchStudentById(studentId),
              fetchPaymentInvoicebyStudent(studentId),
            ]);
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
          setFacturas((prevFacturas) =>
            prevFacturas.filter((factura) => factura.id !== id)
          );
          message.success('Factura eliminada con éxito');
        } catch (error) {
          console.error('Error al eliminar la factura:', error);
          message.error('Error al eliminar la factura');
        }
      },
    });
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudentById(studentId),
        fetchInvoicebyStudent(studentId),
        fetchPaymentInvoicebyStudent(studentId),
      ]);
      setLoading(false);
    };

    loadInitialData();
  }, [studentId]);

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
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag
          color={estado ? 'green' : 'red'}
          style={{ fontSize: '24px', lineHeight: '24px', padding: '4px' }}
        >
          {estado ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Cargando...</Text>
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
              Facturas de {student ? student.nombre : 'Cargando...'}
            </Title>
            <Text type="secondary">
              Coordinador: {student ? student.coordinador : 'Cargando...'}
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
      {student && (
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
                <Text>{formatCurrency(student.matricula)}</Text>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <Text strong>Estado</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag
                  color={student.estado_matricula ? 'green' : 'red'}
                  style={{ fontSize: '24px', lineHeight: '24px', padding: '4px' }}
                >
                  {student.estado_matricula ? (
                    <CheckCircleOutlined />
                  ) : (
                    <CloseCircleOutlined />
                  )}
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
      )}

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
          pagination={false}
          bordered
          style={{ background: '#fff', borderRadius: '8px' }}
        />
      </Card>
    </div>
  );
};

export default StudentInvoices;