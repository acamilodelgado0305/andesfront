import React, { useState, useContext } from 'react';
import { Form, Input, Button, message, Typography, Divider } from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  ShopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../../AuthContext';
import axios from 'axios';

const { Title, Text } = Typography;
const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
});

export default function Configuracion() {
  const { user, login } = useContext(AuthContext);

  const [nameForm] = Form.useForm();
  const [savingName, setSavingName] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingBusiness, setDeletingBusiness] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const businessName = user?.business_name || '';
  const DELETE_KEYWORD = 'ELIMINAR';

  const handleRename = async (values) => {
    setSavingName(true);
    try {
      await axios.put(
        `${API_AUTH_URL}/api/businesses/my`,
        { name: values.name },
        getAuthHeaders()
      );
      message.success('Nombre actualizado correctamente.');

      // Renovar token para reflejar el nuevo nombre en el contexto
      const { switchBusiness } = await import('../../services/auth/authService');
      const response = await switchBusiness(user.bid);
      if (response.token) {
        login(response.token, response.user);
        window.location.replace('/inicio/configuracion');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al actualizar el nombre.';
      message.error(msg);
      setSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== DELETE_KEYWORD) return;
    setDeletingBusiness(true);
    try {
      await axios.delete(`${API_AUTH_URL}/api/businesses/my`, getAuthHeaders());
      message.success('Negocio eliminado.');

      // Limpiar sesión y redirigir al login
      const { logout } = await import('../../services/auth/authService');
      logout();
      window.location.replace('/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar el negocio.';
      message.error(msg);
      setDeletingBusiness(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-gray-400">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <Title level={4} className="flex items-center gap-2 mb-1" style={{ color: '#155153' }}>
        <ShopOutlined /> Administración del Negocio
      </Title>
      <Text type="secondary" className="block mb-8">
        Gestiona la información y configuración de <strong>{businessName}</strong>.
      </Text>

      {/* ── Sección: Nombre ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <EditOutlined className="text-[#155153]" />
          <span className="font-semibold text-gray-700">Nombre del Negocio</span>
        </div>
        <Form
          form={nameForm}
          layout="vertical"
          initialValues={{ name: businessName }}
          onFinish={handleRename}
        >
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'Ingresa un nombre' }, { min: 2, message: 'Mínimo 2 caracteres' }]}
          >
            <Input size="large" placeholder="Nombre del negocio" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={savingName}
            style={{ backgroundColor: '#155153' }}
          >
            Guardar Nombre
          </Button>
        </Form>
      </div>

      {/* ── Sección: Zona de Peligro (solo superadmin) ── */}
      {isSuperAdmin && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <WarningOutlined className="text-red-500" />
            <span className="font-semibold text-red-600">Zona de Peligro</span>
          </div>
          <Text type="secondary" className="block mb-4 text-sm">
            Eliminar el negocio es una acción <strong>irreversible</strong>. Se borrarán todas las
            suscripciones y vínculos de usuarios asociados.
          </Text>

          <Divider className="my-4" />

          <div className="mb-3">
            <Text className="block text-sm text-gray-600 mb-2">
              Para confirmar, escribe <strong className="text-red-600">{DELETE_KEYWORD}</strong> a continuación:
            </Text>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder={DELETE_KEYWORD}
              className="max-w-xs"
              status={deleteConfirmText && deleteConfirmText !== DELETE_KEYWORD ? 'error' : ''}
            />
          </div>

          <Button
            danger
            type="primary"
            icon={<DeleteOutlined />}
            disabled={deleteConfirmText !== DELETE_KEYWORD}
            loading={deletingBusiness}
            onClick={handleDelete}
          >
            Eliminar Negocio Permanentemente
          </Button>
        </div>
      )}
    </div>
  );
}
