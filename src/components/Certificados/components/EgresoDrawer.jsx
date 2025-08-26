import React, { useEffect } from 'react';
import { Drawer, Form, Button, Input, Select, DatePicker, Typography } from 'antd';
import { EditOutlined, FileProtectOutlined } from '@ant-design/icons';
import { cuentaOptions } from '../options';
import dayjs from 'dayjs';

const { Text } = Typography;

const EgresoDrawer = ({ open, onClose, onSubmit, loading, userName, initialValues }) => {
  const [form] = Form.useForm();

  // Función para manejar el cambio de fecha
  const onChange = (date, dateString) => {
    console.log('DatePicker onChange:', { date, dateString });
  };

  useEffect(() => {
    if (open) {
      if (initialValues) {
        // MODO EDICIÓN
        form.setFieldsValue({
          ...initialValues,

          fecha: initialValues.fecha ? dayjs(initialValues.fecha.substring(0, 10)) : null,
          // ============================================================================
        });
      } else {
        // MODO CREACIÓN
        form.resetFields();
        form.setFieldsValue({
          vendedor: userName,
        });
      }
    }
  }, [open, initialValues, form, userName]);

  const onFinish = (values) => {
    const formattedValues = {
      ...values,
      // SOLUCIÓN: Usamos la nueva fecha (values.fecha) y la formateamos.
      fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : null,
    };
    onSubmit(formattedValues);
  };

  return (
    <Drawer
      title={
        <div className="flex items-center">
          {initialValues ? <EditOutlined className="text-red-500 mr-2" /> : <FileProtectOutlined className="text-red-500 mr-2" />}
          <span>{initialValues ? 'Editar Egreso' : 'Registrar Nuevo Egreso'}</span>
        </div>
      }
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      bodyStyle={{ paddingBottom: 80 }}
      headerStyle={{ borderBottom: '1px solid #f0f0f0' }}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancelar
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={() => form.submit()}
            className="bg-red-600 hover:bg-red-700 border-0"
          >
            {initialValues ? 'Guardar Cambios' : 'Guardar Egreso'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <Text className="text-red-700 text-sm">
            Complete los campos para registrar o modificar el egreso.
          </Text>
        </div>

        <Form.Item
          name="fecha"
          label="Fecha del Egreso"
          rules={[{ required: true, message: 'Por favor seleccione la fecha' }]}
        >
          <DatePicker
            onChange={onChange}
            className="w-full"
            format="YYYY-MM-DD"
            allowClear
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="valor"
          label="Valor"
          rules={[{ required: true, message: 'Por favor ingrese el valor' }]}
        >
          <Input
            placeholder="Ingrese el valor del egreso"
            type="number"
            prefix={<span className="text-gray-400">$</span>}
          />
        </Form.Item>

        <Form.Item
          name="cuenta"
          label="Cuenta de Origen"
          rules={[{ required: true, message: 'Por favor seleccione una cuenta' }]}
        >
          <Select placeholder="¿De qué cuenta salió el dinero?" options={cuentaOptions} />
        </Form.Item>

        <Form.Item
          name="descripcion"
          label="Descripción"
          rules={[{ required: true, message: 'Por favor ingrese una descripción' }]}
        >
          <Input.TextArea placeholder="Ej: Pago de servicios, compra de insumos, etc." rows={4} />
        </Form.Item>

        <Form.Item name="vendedor" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default EgresoDrawer;