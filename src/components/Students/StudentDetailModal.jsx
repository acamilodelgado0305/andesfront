// src/components/Students/StudentDetailModal.jsx
import React from 'react';
import { Modal } from 'antd';
import StudentDetailTabs from './StudentDetailTabs';

function StudentDetailModal({ open, studentId, onClose }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      title="Detalles del Estudiante"
      destroyOnClose
      style={{ top: 24 }}
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
    >
      {studentId && <StudentDetailTabs studentId={studentId} />}
    </Modal>
  );
}

export default StudentDetailModal;
