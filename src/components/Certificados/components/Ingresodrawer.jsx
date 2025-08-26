// src/components/IngresoDrawer.js

import React, { useState, useEffect } from 'react';
import { Drawer, Form, Button, Input, Select, Typography, Tag, Divider, message, Spin } from 'antd';
import {
    FileDoneOutlined,
    UserOutlined,
    IdcardOutlined,
    ShoppingOutlined,
    DollarCircleOutlined,
    WalletOutlined,
    EditOutlined
} from '@ant-design/icons';
import { cuentaOptions } from '../options'; // Mantenemos las de cuenta si son estáticas

const { Title } = Typography;




const IngresoDrawer = ({ open, onClose, onSubmit, loading, userName, initialValues }) => {
    const [form] = Form.useForm();

    // --- LÓGICA DE DATOS INTEGRADA EN EL DRAWER ---
    const [inventario, setInventario] = useState([]);
    const [loadingInventario, setLoadingInventario] = useState(false);



    // useEffect para cargar el inventario cuando se abre el drawer
    useEffect(() => {
        const fetchUserInventario = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                message.error("No se pudo obtener el ID de usuario. Asegúrese de iniciar sesión.");
                return;
            }

            setLoadingInventario(true);
            try {
                const apiUrl = import.meta.env.VITE_API_BACKEND
                    ? `${import.meta.env.VITE_API_BACKEND}/inventario/user/${userId}`
                    : `https://clasit-backend-api-570877385695.us-central1.run.app/api/inventario/user/${userId}`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const data = await response.json();
                    setInventario(data);
                } else {
                    const errorData = await response.json();
                    console.error("Error al obtener el inventario:", errorData);
                    message.error(`Error al cargar productos: ${errorData.error || response.statusText}`);
                }
            } catch (err) {
                console.error("Error de conexión al cargar inventario:", err);
                message.error("Error de conexión al cargar los productos.");
            } finally {
                setLoadingInventario(false);
            }
        };

        if (open) {
            form.resetFields();
            form.setFieldsValue({ vendedor: userName });
            fetchUserInventario(); // Llamamos a la función de carga
        }
    }, [open, userName, form]); // Se ejecuta cada vez que se abre el drawer

    useEffect(() => {
        if (open) {
            if (initialValues) {
                // MODO EDICIÓN: Llenamos el form con los datos existentes
                form.setFieldsValue({
                    ...initialValues,
                    // El formulario tiene 'nombreCompleto', pero los datos tienen 'nombre' y 'apellido'
                    nombreCompleto: `${initialValues.nombre || ''} ${initialValues.apellido || ''}`.trim(),
                });
            } else {
                // MODO CREACIÓN: Reseteamos el form y ponemos el vendedor
                form.resetFields();
                form.setFieldsValue({ vendedor: userName });
            }
            // La lógica de fetchUserInventario se mantiene aquí también
        }
    }, [open, initialValues, form, userName]);

    const onFinish = (values) => {
        // La lógica para separar nombre y apellido ya está aquí y funciona para ambos casos.
        const nombreCompleto = (values.nombreCompleto || '').trim();
        const partesNombre = nombreCompleto.split(' ').filter(p => p);

        let nombre = partesNombre.length > 0 ? partesNombre.shift() : '';
        let apellido = partesNombre.length > 0 ? partesNombre.join(' ') : '.';

        const dataToSend = { ...values, nombre, apellido };
        delete dataToSend.nombreCompleto;
        onSubmit(dataToSend);
    };



    const handleValuesChange = (changedValues) => {
        if (changedValues.tipo !== undefined) {
            const selectedItems = changedValues.tipo;
            let total = 0;
            selectedItems.forEach(itemName => {
                const inventarioItem = inventario.find(item => item.nombre === itemName);
                if (inventarioItem && inventarioItem.monto) {
                    total += parseFloat(inventarioItem.monto);
                }
            });
            form.setFieldsValue({ valor: total });
        }
    };

    const inventarioOptions = inventario.map(item => ({
        label: `${item.nombre} - ($${parseFloat(item.monto).toLocaleString('es-CO')})`,
        value: item.nombre,
    }));

    return (
        <Drawer
            title={
                <div className="flex items-center gap-3">
                    {initialValues ? <EditOutlined className="text-blue-600" /> : <FileDoneOutlined className="text-blue-600" />}
                    <span className="font-semibold text-gray-800">
                        {initialValues ? 'Editar Ingreso' : 'Registrar Nuevo Ingreso'}
                    </span>
                </div>
            }
            placement="right"
            width={480}
            onClose={onClose}
            open={open}
            bodyStyle={{ background: '#f9fafb' }}
            headerStyle={{ borderBottom: '1px solid #e5e7eb' }}
            footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {/* --- MODIFICADO: Texto del botón dinámico --- */}
            {initialValues ? 'Guardar Cambios' : 'Guardar Ingreso'}
          </Button>
        </div>
      }
        >
            <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleValuesChange}>
                <div className="p-4 bg-white">
                    <Title level={5} className="!mb-4">Información del Cliente</Title>
                    <div className="space-y-4">
                        <Form.Item name="nombreCompleto" label="Nombre Completo" rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}>
                            <Input size="large" placeholder="Ej: Valentina Restrepo" prefix={<UserOutlined className="text-gray-400" />} />
                        </Form.Item>
                        <Form.Item name="numeroDeDocumento" label="Número de Documento" rules={[{ required: true, message: 'Por favor ingrese el documento' }]}>
                            <Input size="large" placeholder="Ej: 1020304050" prefix={<IdcardOutlined className="text-gray-400" />} />
                        </Form.Item>
                    </div>
                </div>
                <Divider />
                <div className="p-4 bg-white ">
                    <Title level={5} className="!mb-4">Detalles del Ingreso</Title>
                    <div className="space-y-4">
                        <Form.Item name="tipo" label="Concepto / Servicio" rules={[{ required: true, message: 'Por favor seleccione un concepto' }]}>
                            <Select
                                mode="multiple"
                                size="large"
                                placeholder={loadingInventario ? "Cargando productos..." : "Buscar y seleccionar productos"}
                                options={inventarioOptions}
                                loading={loadingInventario} // Muestra un spinner mientras carga
                                disabled={loadingInventario} // Deshabilita mientras carga
                                showSearch
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            />
                        </Form.Item>
                        <Form.Item name="valor" label="Valor Recibido" rules={[{ required: true, message: 'El valor se calcula automáticamente' }]}>
                            <Input size="large" placeholder="Se calculará automáticamente" prefix={<DollarCircleOutlined className="text-gray-400" />} />
                        </Form.Item>
                        <Form.Item name="cuenta" label="Cuenta de Destino" rules={[{ required: true, message: 'Por favor seleccione una cuenta' }]}>
                            <Select size="large" placeholder="¿En qué cuenta se recibió?" options={cuentaOptions} />
                        </Form.Item>
                    </div>
                </div>
                <Form.Item name="vendedor" hidden><Input /></Form.Item>
            </Form>
        </Drawer>
    );
};

export default IngresoDrawer;