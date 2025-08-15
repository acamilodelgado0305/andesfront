import React, { useState, useEffect } from 'react';
import { Table, Button, Card, message, Typography, Row, Col } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getStudentById } from '../../services/studentService';
import { generateGradeReportPDF } from '../Utilidades/generateGradeReportPDF.js';

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_API_BACKEND;


const StudentGrades = ({ studentId }) => {
  const [grades, setGrades] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentById = async (id) => {
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (err) {
      console.error('Error fetching student:', err);
      message.error('Error al cargar los datos del estudiante');
    }
  };

  const fetchGradesByStudentId = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/grades/students/${id}`);
      setGrades(response.data);
    } catch (err) {
      console.error('Error fetching grades:', err);
      message.error('Error al cargar las calificaciones');
    }
  };

  const downloadPDF = async () => {
    try {
      await generateGradeReportPDF(student, grades);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      message.error('Error al generar el PDF. Revisa la consola para más detalles.');
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudentById(studentId),
        fetchGradesByStudentId(studentId),
      ]);
      setLoading(false);
    };

    loadInitialData();
  }, [studentId]);

  const columns = [
    {
      title: 'Materia',
      dataIndex: 'materia',
      key: 'materia',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Nota',
      dataIndex: 'nota',
      key: 'nota',
      render: (nota) => {
        if (nota === null || nota === undefined || isNaN(nota)) {
          return 'N/A';
        }
        return Number(nota).toFixed(1);
      },
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
              Calificaciones de {student ? `${student.nombre} ${student.apellido}` : 'Cargando...'}
            </Title>
            <Text type="secondary">
              Coordinador: {student && student.coordinador ? student.coordinador.nombre : 'Cargando...'}
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={downloadPDF}
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
            >
              Descargar PDF
            </Button>
          </Col>
        </Row>
      </Card>

      <Card
        title="Calificaciones"
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Table
          columns={columns}
          dataSource={grades}
          rowKey={(record) => `${record.student_id}-${record.materia || 'unknown'}`}
          pagination={false}
          bordered
          style={{ background: '#fff', borderRadius: '8px' }}
        />
      </Card>
    </div>
  );
};

export default StudentGrades;