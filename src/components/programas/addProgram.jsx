import React, { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Row, Col, Divider, Typography } from "antd";
import Swal from "sweetalert2";
import { addProgram, updateProgram } from "../../services/programs/programService";

const { Option } = Select;
const { Text } = Typography;

const CreateProgramModal = ({ isOpen, onClose, onSuccess, programToEdit }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [totalCalculado, setTotalCalculado] = useState(0);

  // Detectar si es modo edición
  const isEditMode = !!programToEdit;

  // Efecto: Cargar datos si estamos editando o limpiar si estamos creando
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        // Mapear los campos de la DB al formulario
        form.setFieldsValue({
          ...programToEdit,
          // Aseguramos que los números sean tratados como tales
          valor_matricula: Number(programToEdit.valor_matricula),
          valor_mensualidad: Number(programToEdit.valor_mensualidad),
          duracion_meses: Number(programToEdit.duracion_meses),
          derechos_grado: Number(programToEdit.derechos_grado)
        });
        calculateTotal(); // Calcular total inicial
      } else {
        form.resetFields();
        setTotalCalculado(0);
      }
    }
  }, [isOpen, programToEdit, form]);

  // Función para calcular el total en tiempo real en el Frontend
  const calculateTotal = () => {
    const values = form.getFieldsValue(['duracion_meses', 'valor_mensualidad', 'valor_matricula', 'derechos_grado']);

    const duracion = Number(values.duracion_meses) || 0;
    const mensualidad = Number(values.valor_mensualidad) || 0;
    const matricula = Number(values.valor_matricula) || 0;
    const grado = Number(values.derechos_grado) || 0;

    const total = (duracion * mensualidad) + matricula + grado;
    setTotalCalculado(total);
  };

  const handleSubmit = async () => {
    try {
      // 1. Validar campos
      const values = await form.validateFields();
      setLoading(true);

      // Mostrar SweetAlert de carga
      Swal.fire({
        title: isEditMode ? 'Actualizando...' : 'Guardando...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // 2. Preparar payload (asegurar números)
      const payload = {
        ...values,
        duracion_meses: Number(values.duracion_meses),
        valor_matricula: Number(values.valor_matricula),
        valor_mensualidad: Number(values.valor_mensualidad),
        derechos_grado: Number(values.derechos_grado),
        // No enviamos monto_total, dejamos que el backend lo calcule o lo enviamos si queremos consistencia visual
        monto_total: totalCalculado
      };

      let response;

      // 3. Decidir si es CREATE o UPDATE
      if (isEditMode) {
        response = await updateProgram(programToEdit.id, payload);
      } else {
        response = await addProgram(payload);
      }

      // 4. Manejar respuesta
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: `Programa ${isEditMode ? 'actualizado' : 'creado'} correctamente`,
          timer: 2000,
          showConfirmButton: false
        });
        onSuccess(); // Recargar tabla
        onClose();   // Cerrar modal
      } else {
        throw new Error(response.error);
      }

    } catch (error) {
      console.error("Error submit:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error inesperado',
      });
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = (value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const currencyParser = (value) => value.replace(/\$\s?|(,*)/g, '');

  return (
    <Modal
      title={isEditMode ? "Editar Programa Académico" : "Crear Nuevo Programa"}
      open={isOpen}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={isEditMode ? "Actualizar" : "Guardar"}
      cancelText="Cancelar"
      width={700}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={calculateTotal} // Cada vez que cambia un input, recalcula
        initialValues={{
          tipo_programa: 'Tecnico',
          valor_matricula: 90000,
          valor_mensualidad: 90000,
          derechos_grado: 0
        }}
      >
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="nombre"
              label="Nombre del Programa"
              rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
            >
              <Input placeholder="Ej: Técnico en Sistemas" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="tipo_programa"
              label="Tipo"
              rules={[{ required: true, message: 'Seleccione el tipo' }]}
            >
              <Select>
                <Option value="Tecnico">Técnico</Option>
                <Option value="Validacion">Validación</Option>
                <Option value="Curso">Curso Corto</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="descripcion" label="Descripción (Opcional)">
          <Input.TextArea rows={2} placeholder="Breve descripción del programa..." />
        </Form.Item>

        <Divider orientation="left">Configuración Financiera</Divider>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="duracion_meses"
              label="Duración (Meses)"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <InputNumber min={1} max={36} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="valor_matricula"
              label="Vlr. Matrícula"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="valor_mensualidad"
              label="Vlr. Mensualidad"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="derechos_grado"
              label="Derechos Grado"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={currencyFormatter}
                parser={currencyParser}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Sección de Total Calculado Visualmente */}
        <div className="bg-gray-50 p-4 rounded-md mt-4 flex justify-between items-center border border-gray-200">
          <Text strong>Costo Total Estimado:</Text>
          <Text type="success" className="text-xl font-bold">
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalCalculado)}
          </Text>
        </div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          * Fórmula: (Duración × Mensualidad) + Matrícula + Derechos de Grado
        </Text>
      </Form>
    </Modal>
  );
};

export default CreateProgramModal;