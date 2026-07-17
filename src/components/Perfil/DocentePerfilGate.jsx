// Gate de perfil del docente (primer ingreso).
//
// Cuando un usuario con rol 'docente' inicia sesión y aún no completó su perfil
// (docentes.perfil_completado_at == null), este componente muestra un modal
// obligatorio pidiendo sus datos + foto. La foto reutiliza el avatar del usuario
// de auth-service (users.avatar_url), que ya se muestra en el sidebar/header/foro.
//
// Se monta en el shell (root.jsx) para que envuelva toda el área interna.
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Upload, Avatar, message, Typography, Space } from 'antd';
import { UserOutlined, CameraOutlined, PhoneOutlined, ReadOutlined } from '@ant-design/icons';
import { getMyDocenteProfile, updateMyDocenteProfile } from '../../services/docentes/serviceDocente';
import { uploadMyAvatar } from '../../services/user/userProfileService';

const { Title, Text } = Typography;

function DocentePerfilGate({ user, onAvatarUpdated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form] = Form.useForm();

  const isDocente = user?.role === 'docente';

  useEffect(() => {
    if (!isDocente) return;
    let cancel = false;
    (async () => {
      try {
        const perfil = await getMyDocenteProfile();
        if (cancel) return;
        if (!perfil?.perfil_completo) {
          form.setFieldsValue({
            nombre_completo: perfil?.nombre_completo || user?.name || '',
            especialidad: perfil?.especialidad || '',
            telefono: perfil?.telefono || '',
            bio: perfil?.bio || '',
          });
          setOpen(true);
        }
      } catch {
        // Si no hay fila de docente enlazada u ocurre un error, no bloqueamos:
        // el admin debe revisar el enlace de acceso.
      }
    })();
    return () => { cancel = true; };
  }, [isDocente, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const beforePhoto = (file) => {
    const isImg = file.type?.startsWith('image/');
    if (!isImg) {
      message.error('Selecciona una imagen.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('La imagen debe pesar menos de 5MB.');
      return Upload.LIST_IGNORE;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    return false; // subida manual al guardar
  };

  const handleFinish = async (values) => {
    setSaving(true);
    try {
      // 1) Guardar datos del perfil (andesback). Marca perfil_completado_at.
      await updateMyDocenteProfile(values);

      // 2) Subir la foto si el docente eligió una (auth-service → users.avatar_url).
      if (photoFile) {
        try {
          const { avatar_url } = await uploadMyAvatar(photoFile);
          if (avatar_url && onAvatarUpdated) onAvatarUpdated(avatar_url);
        } catch {
          message.warning('Tu perfil se guardó, pero la foto no se pudo subir. Puedes intentarlo luego desde Mi perfil.');
        }
      }

      message.success('¡Perfil completado! Bienvenido.');
      setOpen(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'No se pudo guardar tu perfil. Intenta de nuevo.';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isDocente) return null;

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      width={520}
      title={null}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <Title level={3} style={{ marginBottom: 4 }} className="dark:text-[#faf9f5]">
          Completa tu perfil de docente
        </Title>
        <Text type="secondary" className="dark:text-[#a8a59e]">
          Necesitamos algunos datos tuyos antes de continuar. Solo toma un minuto.
        </Text>
      </div>

      {/* Foto */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0 8px' }}>
        <Avatar
          size={96}
          src={photoPreview || user?.avatar_url || undefined}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#1d4ed8' }}
        />
        <Upload beforeUpload={beforePhoto} showUploadList={false} accept="image/*">
          <Button type="link" icon={<CameraOutlined />} style={{ marginTop: 8 }}>
            {photoPreview ? 'Cambiar foto' : 'Subir foto de perfil'}
          </Button>
        </Upload>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="nombre_completo"
          label="Nombre completo"
          rules={[{ required: true, message: 'Ingresa tu nombre completo' }]}
        >
          <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Tu nombre y apellidos" />
        </Form.Item>

        <Form.Item name="especialidad" label="Especialidad / área">
          <Input prefix={<ReadOutlined style={{ color: '#9ca3af' }} />} placeholder="Ej. Matemáticas, Enfermería, Sistemas..." />
        </Form.Item>

        <Form.Item name="telefono" label="Teléfono / WhatsApp">
          <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="Número de contacto" />
        </Form.Item>

        <Form.Item name="bio" label="Sobre ti (opcional)">
          <Input.TextArea rows={3} placeholder="Una breve descripción profesional." maxLength={500} showCount />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button type="primary" htmlType="submit" block size="large" loading={saving}>
            Guardar y continuar
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default DocentePerfilGate;
