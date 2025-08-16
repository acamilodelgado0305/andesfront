// src/components/EgresoDrawer.js

import React from 'react';
import { Drawer, Form, Button, Input, Select, DatePicker, Typography } from 'antd';
import { FileProtectOutlined } from '@ant-design/icons';
import { cuentaOptions } from '../options'; // Importamos las opciones

const { Text } = Typography;

// Formateador para pesos colombianos
const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
});

const EgresoDrawer = ({ open, onClose, onSubmit, loading }) => {
  const [form] = Form.useForm();

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const onFinish = (values) => {
    onSubmit(values); // La lógica de submit se maneja en el padre
  };

  return (
    <Drawer
      title={
        <div className="flex items-center">
          <FileProtectOutlined className="text-red-500 mr-2" />
          <span>Registrar Nuevo Egreso</span>
        </div>
      }
        placement="top"
      classNames={{ 
          wrapper: '!w-[500px] !right-0 !left-auto !h-[calc(100%-0px)] top-16 !rounded-tl-lg !rounded-tr-lg !border-0 !shadow-lg',
        }}
      width={420}
      onClose={handleClose}
      open={open}
      bodyStyle={{ paddingBottom: 80 }}
      headerStyle={{ borderBottom: '1px solid #f0f0f0' }}
      footer={
        <div className="flex justify-end">
          <Button onClick={handleClose} style={{ marginRight: 8 }}>
            Cancelar
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={() => form.submit()}
            className="bg-red-600 hover:bg-red-700 border-0"
          >
            Guardar Egreso
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <Text className="text-red-700 text-sm">
            Complete todos los campos para registrar un nuevo egreso. Los campos marcados con (*) son obligatorios.
          </Text>
        </div>
        <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Por favor seleccione la fecha' }]}>
          <DatePicker format="YYYY-MM-DD" placeholder="Seleccione la fecha" className="w-full" />
        </Form.Item>
        <Form.Item
          name="valor"
          label="Valor"
          rules={[
            { required: true, message: 'Por favor ingrese el valor' },
            { validator: (_, value) => (value && parseFloat(value) >= 0 ? Promise.resolve() : Promise.reject('El valor debe ser positivo')) },
          ]}
        >
          <Input
            placeholder="Ingrese el valor"
            type="number"
            prefix={<span className="text-gray-400">$</span>}
            formatter={(value) => (value ? currencyFormatter.format(value) : '')}
            parser={(value) => value.replace(/[^\d.]/g, '')}
          />
        </Form.Item>
        <Form.Item name="cuenta" label="Cuenta" rules={[{ required: true, message: 'Por favor seleccione una cuenta' }]}>
          <Select placeholder="Seleccione una cuenta" options={cuentaOptions} />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, message: 'Por favor ingrese una descripción' }]}>
          <Input.TextArea placeholder="Ingrese la descripción del egreso" rows={4} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default EgresoDrawer;