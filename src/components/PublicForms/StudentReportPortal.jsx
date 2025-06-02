import React, { useState } from 'react';
import { Card, Typography, Input, Button, Spin, Alert, Space, Row, Col, Table, Descriptions, message } from 'antd';
import axios from 'axios';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
// Asegúrate que la ruta a generateGradeReportPDF es correcta
import { generateGradeReportPDF } from '../Utilidades/generateGradeReportPDF';

const { Title, Text } = Typography;

function StudentDocumentReport() {
  const [documentNumber, setDocumentNumber] = useState('');
  const [studentInfo, setStudentInfo] = useState(null); // Para el objeto student de la API
  const [gradesInfo, setGradesInfo] = useState([]);   // Para el array grades de la API
  const [currentStudentId, setCurrentStudentId] = useState(null); // Para el studentId de la API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const handleDocumentNumberChange = (e) => {
    setDocumentNumber(e.target.value);
    setError(null);
    setShowReport(false);
    setStudentInfo(null);
    setGradesInfo([]);
    setCurrentStudentId(null);
  };

  const fetchStudentAndGradesData = async () => {
    if (!documentNumber.trim()) {
      setError('Por favor, ingrese el número de documento del estudiante.');
      return;
    }

    setLoading(true);
    setError(null);
    setShowReport(false);
    setStudentInfo(null);
    setGradesInfo([]);
    setCurrentStudentId(null);

    try {
      const response = await axios.get(`https://back.app.validaciondebachillerato.com.co/api/grades/student/${documentNumber}`);
      // La data que llega es: { student: {...}, grades: [...], studentId: ... }
      const { student, grades, studentId } = response.data;

      // Validar que tengamos el objeto student y el studentId
      if (!student || !studentId) { // studentId es el del nivel raíz de la respuesta
        throw new Error('La respuesta de la API no contiene información válida del estudiante o el ID del estudiante.');
      }

      setStudentInfo(student);       // student es el objeto { nombre, apellido, ... }
      setGradesInfo(grades || []);    // grades es el array [{materia, nota}, ...]
      setCurrentStudentId(studentId); // studentId es el número/string del ID
      setShowReport(true);
      message.success('Consulta exitosa. Puede ver el reporte a continuación.');
    } catch (err) {
      console.error('Error fetching data:', err.response?.data || err.message);
      setError(
        err.response?.status === 404
          ? `No se encontró un estudiante con el número de documento: ${documentNumber}.`
          : err.message || 'Ocurrió un error al consultar los datos.'
      );
      setShowReport(false);
      setStudentInfo(null);
      setGradesInfo([]);
      setCurrentStudentId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    // studentInfo tiene el objeto student, gradesInfo el array de notas,
    // y currentStudentId tiene el ID del estudiante.
    if (!studentInfo || !currentStudentId) { // Verificamos studentInfo y currentStudentId
      setError('No hay datos de estudiante suficientes para generar el PDF.');
      message.error('No hay datos de estudiante suficientes para generar el PDF.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Pasamos studentInfo (el objeto), gradesInfo (el array), y currentStudentId (el ID)
      await generateGradeReportPDF(studentInfo, gradesInfo, currentStudentId);
      message.success('¡Reporte generado y descargado exitosamente!');
    } catch (pdfError) {
      console.error('Error generando PDF:', pdfError);
      setError(pdfError.message || 'Error al generar el PDF.');
      message.error(pdfError.message || 'Error al generar el PDF.');
    } finally {
      setLoading(false);
    }
  };

  const gradesColumns = [
    {
      title: 'Materia',
      dataIndex: 'materia',
      key: 'materia',
      width: '70%',
    },
    {
      title: 'Calificación',
      dataIndex: 'nota',
      key: 'nota',
      width: '30%',
      align: 'center',
      render: (nota) => {
        if (nota === null || nota === undefined || String(nota).trim().toUpperCase() === 'N/A' || String(nota).trim() === '') {
          return 'N/A';
        }
        const numericNota = parseFloat(nota);
        // La función toFixed(1) en generateGradeReportPDF ya maneja esto,
        // pero es bueno tenerlo consistente en la UI.
        return !isNaN(numericNota) ? numericNota.toFixed(1) : 'N/A';
      },
    },
  ];

  return (
    <Row justify="center" align="top" style={{ minHeight: '90vh', padding: '20px', background: '#f0f2f5' }}>
      <Col xs={24} sm={22} md={20} lg={18} xl={16}>
        <Card
          bordered={false}
          style={{
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <Title level={2} style={{ color: '#003366', marginBottom: '5px' }}>
              Reporte Académico Estudiantil
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Consulte y descargue el reporte académico.
            </Text>
          </div>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Input
              addonBefore={<Text strong>Número de Documento:</Text>}
              placeholder="Ingrese el número de documento"
              value={documentNumber}
              onChange={handleDocumentNumberChange}
              onPressEnter={fetchStudentAndGradesData}
              size="large"
              disabled={loading}
              style={{ borderRadius: '6px' }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchStudentAndGradesData}
              loading={loading && !showReport} // Muestra 'Consultando...' solo si no se está mostrando el reporte aún
              block
              size="large"
              style={{ borderRadius: '6px', backgroundColor: '#0056b3', borderColor: '#0056b3' }}
            >
              {loading && !showReport ? 'Consultando...' : 'Consultar Reporte'}
            </Button>

            {loading && ( // Este Spin se mostrará tanto al cargar datos como al generar PDF
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <Spin tip={showReport && loading ? 'Generando PDF...' : 'Cargando datos...'} />
              </div>
            )}

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ borderRadius: '6px' }}
              />
            )}
          </Space>

          {showReport && studentInfo && currentStudentId && ( // Asegurarse que currentStudentId también exista
            <div style={{ marginTop: '40px', borderTop: '1px solid #e8e8e8', paddingTop: '30px' }}>
              <Title level={3} style={{ color: '#003366', borderBottom: '2px solid #0056b3', paddingBottom: '10px', marginBottom: '20px' }}>
                Información del Estudiante
              </Title>
              <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 1, md: 1, sm: 1, xs: 1 }} size="default" layout="vertical">
                <Descriptions.Item labelStyle={{ fontWeight: 'bold' }} label="Nombres y Apellidos">
                  {/* studentInfo.nombre parece contener nombre completo en tu data */}
                  {studentInfo.nombre || 'N/A'}
                </Descriptions.Item>
                {/* Si tu backend devuelve 'apellido' separado, podrías tener otro Descriptions.Item para él.
                    Dado tu JSON, 'studentInfo.apellido' es igual a 'studentInfo.nombre'.
                    Si quieres mostrar el apellido de forma separada y tu backend no lo provee así,
                    necesitarías lógica para extraerlo del nombre completo o ajustar el backend.
                    Por ahora, asumo que 'studentInfo.nombre' es el campo principal para el nombre completo.
                */}
                <Descriptions.Item labelStyle={{ fontWeight: 'bold' }} label="Documento Consultado">
                  {documentNumber} {/* Muestra el número de documento que se ingresó */}
                </Descriptions.Item>
                <Descriptions.Item labelStyle={{ fontWeight: 'bold' }} label="ID Estudiante (interno)">
                  {currentStudentId || 'N/A'} {/* Usar el currentStudentId del estado */}
                </Descriptions.Item>
                <Descriptions.Item labelStyle={{ fontWeight: 'bold' }} label="Programa">
                  {studentInfo.programa_nombre || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item labelStyle={{ fontWeight: 'bold' }} label="Coordinador(a)">
                  {studentInfo.coordinador || 'N/A'}
                </Descriptions.Item>
              </Descriptions>

              <Title level={4} style={{ color: '#003366', marginTop: '30px', marginBottom: '15px' }}>
                Calificaciones
              </Title>
              <Table
                columns={gradesColumns}
                dataSource={gradesInfo.map((grade, index) => ({ ...grade, key: `${grade.materia}-${index}-${currentStudentId}` }))} // Key más único
                pagination={false}
                bordered
                size="middle"
                locale={{ emptyText: 'No hay calificaciones registradas para este estudiante.' }}
                style={{ borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              />
              <Button
                type="default" // O 'primary' si prefieres
                icon={<DownloadOutlined />}
                onClick={handleDownloadReport}
                loading={loading && showReport} // Muestra 'Descargando PDF...' solo si showReport es true y está cargando
                block
                size="large"
                style={{
                  marginTop: '30px',
                  borderRadius: '6px',
                  background: '#28a745', // Verde para descarga
                  color: 'white',
                  borderColor: '#28a745',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                disabled={!studentInfo || !currentStudentId} // Deshabilitar si no hay datos completos
              >
                {loading && showReport ? 'Descargando PDF...' : 'Descargar Reporte en PDF'}
              </Button>
              {gradesInfo.length === 0 && studentInfo && (
                <Text type="warning" style={{ display: 'block', textAlign: 'center', marginTop: '10px' }}>
                  El estudiante no tiene calificaciones registradas.
                </Text>
              )}
            </div>
          )}
          <Text style={{ display: 'block', textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#777' }}>
            Si tiene problemas para consultar o descargar su reporte, por favor contacte a la secretaría académica.
          </Text>
        </Card>
      </Col>
    </Row>
  );
}

export default StudentDocumentReport;