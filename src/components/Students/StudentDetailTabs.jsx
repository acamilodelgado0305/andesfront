// src/components/Students/StudentDetailTabs.jsx
import React from 'react';
import { Tabs } from 'antd';
import StudentDetails from './StudentDetails';
import StudentInvoices from './StudentInvoices';
import StudentGrades from './StudentGrades';
import StudentComments from './StudentComments';

function StudentDetailTabs({ studentId }) {
  const items = [
    {
      key: '1',
      label: 'Información',
      children: <StudentDetails studentId={studentId} />,
    },
    {
      key: '2',
      label: 'Pagos',
      children: <StudentInvoices studentId={studentId} />,
    },
    {
      key: '3',
      label: 'Calificaciones',
      children: <StudentGrades studentId={studentId} />,
    },
    {
      key: '4',
      label: 'Comentarios',
      children: <StudentComments studentId={studentId} />,
    },
  ];

  return <Tabs defaultActiveKey="1" items={items} destroyInactiveTabPane />;
}

export default StudentDetailTabs;
