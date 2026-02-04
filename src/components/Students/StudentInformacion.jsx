// src/components/Students/StudentInformation.jsx
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Button } from 'antd';
import StudentDetails from './StudentDetails';
import StudentInvoices from './StudentInvoices';
import StudentGrades from './StudentGrades';

const { TabPane } = Tabs;

function StudentInformation() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const handleBack = () => {
    const from = location.state?.from;
    if (from) {
      navigate(from);
    } else {
      navigate('/inicio/students');
    }
  };
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Button onClick={handleBack}>Volver al dashboard</Button>
        <h1 style={{ margin: 0 }}>Detalles del Estudiante</h1>
      </div>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Información" key="1">
          <StudentDetails studentId={id} />
        </TabPane>
        <TabPane tab="Pagos" key="2">
          <StudentInvoices studentId={id} />
        </TabPane>
        <TabPane tab="Calificaciones" key="3">
        <StudentGrades studentId={id} />
        </TabPane>
      </Tabs>
    </div>
  );
}

export default StudentInformation;
