import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { addSubject } from '../../services/studentService';
import { getPrograms } from '../../services/studentService';

const { Option } = Select;

const CreateMateriaModal = ({ isOpen, onClose, onMateriaAdded }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const data = await getPrograms();
      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
      message.error('Error al cargar los programas');
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await addSubject(values);
      message.success('Materia creada exitosamente');
      form.resetFields();
      onMateriaAdded();
      onClose();
    } catch (error) {
      console.error("Error creating materia:", error);
      message.error('Error al crear la materia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Crear Nueva Materia"
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="nombre"
          label="Nombre"
          rules={[{ required: true, message: 'Por favor ingrese el nombre de la materia' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="codigo"
          label="Código"
          rules={[{ required: true, message: 'Por favor ingrese el código de la materia' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="descripcion"
          label="Descripción"
          rules={[{ required: true, message: 'Por favor ingrese la descripción de la materia' }]}
        >
          <Input.TextArea />
        </Form.Item>

        <Form.Item
          name="program_id"
          label="Programa"
          rules={[{ required: true, message: 'Por favor seleccione el programa' }]}
        >
          <Select placeholder="Seleccione un programa">
            {programs.map(program => (
              <Option key={program.id} value={program.id}>{program.nombre}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateMateriaModal;