// src/components/Students/StudentDetailTabs.jsx
import React from 'react';
import StudentDetails from './StudentDetails';

// Las pestañas (Información, Estado y documentos, Pagos, Calificaciones,
// Comentarios) viven ahora DENTRO de StudentDetails, debajo del encabezado
// con la foto: así el encabezado queda fijo mientras se cambia de vista.
function StudentDetailTabs({ studentId }) {
  return <StudentDetails studentId={studentId} />;
}

export default StudentDetailTabs;
