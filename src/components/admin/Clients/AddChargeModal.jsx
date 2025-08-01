// src/components/admin/Clients/modals/AddChargeModal.js

import React from 'react';
import { Modal, Form, DatePicker, InputNumber, Input, Button, message } from 'antd';
import { createExtraChargeApi } from '../../../services/adminService';
import moment from 'moment';

const { TextArea } = Input;

function AddChargeModal({ visible, onCancel, subscriptionId, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleFinish = async (values) => {
    setLoading(true);
    const payload = {
      subscriptionId: subscriptionId,
      chargeDate: values.chargeDate.format('YYYY-MM-DD'),
      amount: values.amount,
      description: values.description
    };
    try {
      await createExtraChargeApi(payload);
      message.success('Cargo extra añadido exitosamente!');
      onSuccess();
      form.resetFields();
    } catch (error) {
      message.error('Error al añadir el cargo extra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Añadir Cargo a Suscripción #${subscriptionId}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ chargeDate: moment() }}>
        <Form.Item
          name="chargeDate"
          label="Fecha del Cargo"
          rules={[{ required: true, message: 'Seleccione la fecha del cargo.' }]}
        >
           <DatePicker className="w-full h-10" format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Monto (COP)"
          rules={[{ required: true, message: 'Ingrese el monto.' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Descripción"
          rules={[{ required: true, message: 'Ingrese una descripción.' }]}
        >
          <TextArea rows={2} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
            Añadir Cargo
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default AddChargeModal;