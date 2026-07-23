// src/components/Students/StudentDetailDrawer.jsx
import React from 'react';
import { Drawer, Grid } from 'antd';
import StudentDetailTabs from './StudentDetailTabs';

// Panel lateral (drawer) con la información del estudiante: datos, pagos, etc.
// Reemplaza al antiguo modal. Ancho responsivo: pantalla completa en móvil.
function StudentDetailDrawer({ open, studentId, onClose }) {
  const screens = Grid.useBreakpoint();
  const width = !screens.md ? '100%' : (screens.xl ? 1040 : '92%');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={width}
      placement="right"
      title="Detalles del Estudiante"
      destroyOnClose
      styles={{ body: { padding: 16 } }}
    >
      {studentId && <StudentDetailTabs studentId={studentId} />}
    </Drawer>
  );
}

export default StudentDetailDrawer;
