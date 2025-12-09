import React, { useState } from 'react';
import { Card, Button, Row, Col, Tag, Typography, notification, Spin, Empty, Alert, Modal } from 'antd';
import { 
  DownloadOutlined, 
  SafetyCertificateOutlined, 
  IdcardOutlined, 
  CheckCircleOutlined,
  EyeOutlined,
  TrophyOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// Asegúrate de que esta variable sea correcta
const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND || 'https://backendcoalianza.vercel.app/api';

const StudentCertificationsTab = ({ studentInfo }) => {
  const [loadingAction, setLoadingAction] = useState(null); // 'certificado-CursoName' o null
  const [previewUrl, setPreviewUrl] = useState(null);       // URL del Blob PDF para el iframe
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentCourseName, setCurrentCourseName] = useState(''); // Para usarlo al descargar
  const [currentDocType, setCurrentDocType] = useState('');       // 'certificado' o 'carnet'

  const courses = Array.isArray(studentInfo?.tipo) 
    ? studentInfo.tipo 
    : (studentInfo?.tipo ? [studentInfo.tipo] : []);

  // --- 1. FUNCIÓN PARA OBTENER EL PDF DEL SERVIDOR ---
  const fetchPdfBlob = async (docType, courseName) => {
    setLoadingAction(`${docType}-${courseName}`);
    
    try {
      const fullName = studentInfo.nombre_completo || `${studentInfo.nombre} ${studentInfo.apellido}`;
      
      const payload = {
          nombre: fullName,
          numeroDocumento: studentInfo.numeroDeDocumento || studentInfo.documento,
          tipoDocumento: studentInfo.tipoDeDocumento || 'C.C.',
          curso: courseName, 
          fechaFinalizacion: studentInfo.createdAt || new Date() 
      };

      let endpoint = docType === 'certificado' 
        ? `${API_BACKEND_URL}/api/generar-certificado-pdf`
        : `${API_BACKEND_URL}/generar-carnet`;

      let requestOptions = { method: 'POST' };

      if (docType === 'certificado') {
        requestOptions.headers = { 'Content-Type': 'application/json' };
        requestOptions.body = JSON.stringify(payload);
      } else {
        const formData = new FormData();
        formData.append('nombre', fullName);
        formData.append('numeroDocumento', payload.numeroDocumento);
        formData.append('tipoDocumento', payload.tipoDocumento);
        formData.append('curso', courseName);
        requestOptions.body = formData;
      }

      const response = await fetch(endpoint, requestOptions);

      // --- CORRECCIÓN DEL ERROR ---
      // Si el backend falla, NO intentamos crear el blob, lanzamos error
      if (!response.ok) {
        const errorText = await response.text(); // Leemos el error como texto
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      // Si todo sale bien, obtenemos el Blob (archivo binario)
      const blob = await response.blob();
      return blob;

    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Error al cargar documento',
        description: 'Hubo un problema generando el documento. Intenta de nuevo más tarde.',
        icon: <CloseCircleOutlined style={{ color: 'red' }} />
      });
      return null;
    } finally {
      setLoadingAction(null);
    }
  };

  // --- 2. MANEJAR CLIC EN "VER DIPLOMA" ---
  const handlePreview = async (docType, courseName) => {
    const blob = await fetchPdfBlob(docType, courseName);
    
    if (blob) {
      // Creamos una URL temporal local para el archivo
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setCurrentCourseName(courseName);
      setCurrentDocType(docType);
      setIsModalVisible(true);
    }
  };

  // --- 3. MANEJAR LA DESCARGA DESDE EL MODAL ---
  const handleDownloadFromModal = () => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    
    // Nombre del archivo limpio
    const fullName = studentInfo.nombre_completo || `${studentInfo.nombre} ${studentInfo.apellido}`;
    const safeName = fullName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCourse = currentCourseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    link.setAttribute('download', `${currentDocType}_${safeCourse}_${safeName}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    notification.success({
      message: 'Descarga Iniciada',
      description: 'El archivo se ha guardado en tu dispositivo.',
    });
  };

  // Limpiar la URL cuando se cierra el modal para liberar memoria
  const handleCloseModal = () => {
    setIsModalVisible(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (courses.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tienes certificaciones registradas." />;
  }

  return (
    <div style={{ padding: '10px' }}>
      <Alert 
        message="Diplomas y Certificaciones"
        description="Aquí puedes visualizar y descargar tus certificados oficiales firmados."
        type="success"
        showIcon
        icon={<TrophyOutlined />}
        style={{ marginBottom: '24px', border: '1px solid #b7eb8f', background: '#f6ffed' }}
      />

      <Row gutter={[24, 24]}>
        {courses.map((courseName, index) => {
          const isFoodHandling = courseName.toLowerCase().includes('manipulac') || 
                                 courseName.toLowerCase().includes('alimentos');

          return (
            <Col xs={24} md={12} lg={12} key={index}>
              <Card
                hoverable
                style={{ borderRadius: '12px', border: '1px solid #f0f0f0' }}
                actions={[
                  // BOTÓN: VER DIPLOMA
                  <Button 
                    type="primary" 
                    ghost
                    icon={loadingAction === `certificado-${courseName}` ? <Spin size="small"/> : <EyeOutlined />}
                    onClick={() => handlePreview('certificado', courseName)}
                    disabled={!!loadingAction}
                    style={{ border: 'none' }}
                  >
                    Ver Diploma
                  </Button>,
                  
                  // BOTÓN: VER CARNET (Si aplica)
                  <Button 
                    type="default" 
                    ghost
                    icon={loadingAction === `carnet-${courseName}` ? <Spin size="small"/> : <IdcardOutlined />}
                    onClick={() => handlePreview('carnet', courseName)}
                    disabled={!!loadingAction}
                    style={{ border: 'none', color: '#666' }}
                  >
                    Ver Carnet
                  </Button>
                ]}
              >
                <Card.Meta
                  avatar={
                    <div style={{ 
                        backgroundColor: isFoodHandling ? '#f6ffed' : '#e6f7ff', 
                        padding: '16px', 
                        borderRadius: '12px',
                    }}>
                       {isFoodHandling 
                         ? <SafetyCertificateOutlined style={{ fontSize: '28px', color: '#52c41a' }} />
                         : <TrophyOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
                       }
                    </div>
                  }
                  title={
                    <div style={{ whiteSpace: 'normal', fontSize: '16px', fontWeight: 'bold', color: '#003366' }}>
                      {courseName}
                    </div>
                  }
                  description={
                    <div style={{ marginTop: '12px' }}>
                      <Tag color={isFoodHandling ? "green" : "blue"}>
                         {isFoodHandling ? "Normativa Sanitaria" : "Formación Profesional"}
                      </Tag>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                         Certificado por Fundación Villa de los Andes
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* --- MODAL DE VISTA PREVIA --- */}
      <Modal
        title={`Vista Previa: ${currentCourseName}`}
        open={isModalVisible}
        onCancel={handleCloseModal}
        width={1000} // Ancho grande para ver bien el PDF
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Cerrar
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadFromModal}
            size="large"
          >
            Descargar PDF
          </Button>,
        ]}
      >
        {previewUrl ? (
          <div style={{ height: '600px', width: '100%', background: '#f0f0f0', borderRadius: '8px' }}>
            {/* IFRAME PARA MOSTRAR EL PDF */}
            <iframe 
              src={previewUrl} 
              title="Vista Previa Documento"
              width="100%" 
              height="100%" 
              style={{ border: 'none', borderRadius: '8px' }}
            />
          </div>
        ) : (
          <div style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" tip="Cargando vista previa..." />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentCertificationsTab;