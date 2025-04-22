import React, { useState, useEffect } from 'react';
import { Table, Button, Card, message, Typography, Row, Col } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStudentById } from '../../services/studentService';
import logoImage from '../../../images/logo.png';

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
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;

      // Header on each page
      const addHeader = () => {
        // Logo
        const logoWidth = 25;
        const logoHeight = 25;
        doc.addImage(logoImage, 'PNG', margin, 10, logoWidth, logoHeight);

        // Institution Name and Title
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0, 51, 102); // Dark blue for professionalism
        doc.text('Fundación Educativa Villa de los Andes', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text('Reporte Académico de Calificaciones', pageWidth / 2, 28, { align: 'center' });

        // Contact Info
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Bogotá, Colombia | Tel: +57 313 2529490 | https://validaciondebachillerato.com.co', pageWidth / 2, 35, { align: 'center' });

        // Separator Line
        doc.setDrawColor(0, 51, 102);
        doc.setLineWidth(0.5);
        doc.line(margin, 40, pageWidth - margin, 40);
      };

      // Footer on each page
      const addFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFont('times', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const footerText = `Fundación Educativa Villa de los Andes | Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Watermark (subtle)
        doc.setFontSize(40);
        doc.setTextColor(230, 230, 230);
        doc.setFont('times', 'bold');
        doc.text('FEVA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
      };

      // Add header to first page
      addHeader();

      // Student Information
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.text('Información del Estudiante', margin, 50);

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const studentName = student ? `${student.nombre} ${student.apellido}` : 'Desconocido';
      const program = student ? `${student.programa_nombre} ` : 'Desconocido';
      const currentDate = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const coordinator = student ? student.coordinador : 'N/A';

      doc.text(`Estudiante: ${studentName}`, margin, 58);
      doc.text(`ID Estudiante: ${studentId}`, margin, 64);
      doc.text(`Programa: ${program}`, margin, 70);
      doc.text(`Coordinador: ${coordinator}`, margin, 76);
      doc.text(`Fecha de Emisión: ${currentDate}`, margin, 82);

      // Table of Grades
      autoTable(doc, {
        startY: 90,
        head: [['Materia', 'Calificación']],
        body: grades.map((grade) => [
          grade.materia || 'N/A',
          grade.nota !== null && !isNaN(grade.nota) ? Number(grade.nota).toFixed(1) : 'N/A',
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          font: 'times',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
          font: 'times',
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        margin: { left: margin, right: margin },
        styles: {
          lineColor: [150, 150, 150],
          lineWidth: 0.2,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30, halign: 'center' },
        },
        didDrawPage: (data) => {
          addHeader();
          addFooter();
        },
      });

      // Final Notes and Signature Line
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.text('Observaciones', margin, finalY);

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text('Las calificaciones reflejan el desempeño académico del estudiante en el mes evaluado.', margin, finalY + 6);

      // Signature Line
      const signatureY = finalY + 20;
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text('Coordinador Académico', margin, signatureY);
      doc.setLineWidth(0.3);
      doc.line(margin, signatureY + 2, margin + 60, signatureY + 2);

      // Save the PDF
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