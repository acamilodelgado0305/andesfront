// src/components/Students/StudentInformation.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { Tabs } from 'antd';
import StudentDetails from './StudentDetails';
import StudentInvoices from './StudentInvoices';
import StudentGrades from './StudentGrades';

const { TabPane } = Tabs;

function StudentInformation() {
  const { id } = useParams(); // Extrae el parámetro 'id' de la ruta

  return (
    <div style={{ padding: '20px' }}>
      <h1>Detalles del Estudiante</h1>
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