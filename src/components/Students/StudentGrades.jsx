import React, { useState, useEffect } from 'react';
import { Table, Button, Card, message, Typography, Row, Col, Space } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStudentById } from '../../services/studentService';

const { Title, Text } = Typography;

const StudentGrades = ({ studentId }) => {
  const [grades, setGrades] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Obtener datos del estudiante
  const fetchStudentById = async (id) => {
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (err) {
      console.error('Error fetching student:', err);
      message.error('Error al cargar los datos del estudiante');
    }
  };

  // Obtener calificaciones del estudiante
  const fetchGradesByStudentId = async (id) => {
    try {
      const response = await axios.get(`https://back.app.validaciondebachillerato.com.co/api/grades/students/${id}`);
      setGrades(response.data);
    } catch (err) {
      console.error('Error fetching grades:', err);
      message.error('Error al cargar las calificaciones');
    }
  };

  // Generar y descargar PDF
  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Encabezado del PDF
      doc.setFontSize(18);
      doc.text('Reporte de Calificaciones', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Estudiante: ${student ? `${student.nombre} ${student.apellido}` : 'Desconocido'}`, 14, 30);
      doc.text(`ID: ${studentId}`, 14, 36);
      doc.text(`Programa: Validación de Bachillerato`, 14, 42);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 14, 54);

      // Tabla de calificaciones
      autoTable(doc, {
        startY: 64,
        head: [['Materia', 'Nota']],
        body: grades.map((grade) => [
          grade.materia,
          grade.nota !== null && !isNaN(grade.nota) ? Number(grade.nota).toFixed(1) : 'N/A',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { fontSize: 10 },
      });

      // Guardar el PDF
      doc.save(`calificaciones_estudiante_${studentId}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      message.error('Error al generar el PDF');
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
              Calificaciones de {student ? `${student.nombre} ${student.apellido}` : 'Cargando...'}
            </Title>
            <Text type="secondary">
              Coordinador: {student ? student.coordinador : 'Cargando...'}
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

      {/* Lista de Calificaciones */}
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
          rowKey={(record) => `${record.student_id}-${record.materia}`}
          pagination={false}
          bordered
          style={{ background: '#fff', borderRadius: '8px' }}
        />
      </Card>
    </div>
  );
};

export default StudentGrades;