import React, { useState, useEffect, useContext } from 'react';
import { Avatar, Button, Upload, Tag, message, Typography, Spin } from 'antd';
import { UserOutlined, CameraOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { AuthContext } from '../../AuthContext';
import { useTheme } from '../../ThemeContext';
import { getMyProfile, uploadMyAvatar, deleteMyAvatar } from '../../services/user/userProfileService';

const { Title, Text } = Typography;

// Página "Mi perfil" (accesible desde el dropdown del header). Muestra la foto
// del usuario y permite subirla / cambiarla / quitarla.
export default function MiPerfil() {
  const { user, patchUser } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [profile, setProfile]                 = useState(null);
  const [avatarUrl, setAvatarUrl]             = useState(user?.avatar_url || null);
  const [loading, setLoading]                 = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar]   = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setAvatarUrl(p.avatar_url || null);
        if ((p.avatar_url || null) !== (user?.avatar_url || null)) {
          patchUser({ avatar_url: p.avatar_url || null });
        }
      })
      .catch(() => { /* silencioso: igual se puede subir foto */ })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarUpload = async (file) => {
    setUploadingAvatar(true);
    try {
      const { avatar_url } = await uploadMyAvatar(file);
      setAvatarUrl(avatar_url);
      patchUser({ avatar_url });
      message.success('Foto de perfil actualizada.');
    } catch {
      message.error('No se pudo subir la foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
    return false; // evitar upload automático de antd
  };

  const handleAvatarRemove = async () => {
    setRemovingAvatar(true);
    try {
      await deleteMyAvatar();
      setAvatarUrl(null);
      patchUser({ avatar_url: null });
      message.success('Foto de perfil eliminada.');
    } catch {
      message.error('No se pudo eliminar la foto de perfil.');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const userInitials = (profile?.name || user?.name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const nombre = profile?.name  || user?.name  || 'Usuario';
  const email  = profile?.email || user?.email || '';
  const role   = profile?.role  || user?.role;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: '#155153' }}>Mi perfil</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Tu foto y datos personales. La foto ayuda a identificarte en la plataforma.
        </Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div style={{
          background: isDark ? '#30302e' : '#fff',
          border: `1px solid ${isDark ? '#403e3a' : '#e5e7eb'}`,
          borderRadius: 16,
          padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Avatar
              size={96}
              src={avatarUrl || undefined}
              style={{
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #155153 0%, #1d8a8d 100%)',
                fontSize: 30, fontWeight: 700, border: '3px solid #e5e7eb', flexShrink: 0,
              }}
            >
              {!avatarUrl && (userInitials || <UserOutlined />)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: isDark ? '#faf9f5' : '#1f2937' }}>{nombre}</div>
              <div style={{ fontSize: 13, color: isDark ? '#a8a59e' : '#6b7280' }}>{email}</div>
              {role && <Tag color="cyan" style={{ marginTop: 8, textTransform: 'capitalize' }}>{role}</Tag>}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Upload showUploadList={false} beforeUpload={handleAvatarUpload} accept="image/*">
              <Button
                icon={uploadingAvatar ? <LoadingOutlined /> : <CameraOutlined />}
                loading={uploadingAvatar}
                style={{ borderColor: '#155153', color: '#155153' }}
              >
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </Button>
            </Upload>
            {avatarUrl && (
              <Button danger icon={<DeleteOutlined />} loading={removingAvatar} onClick={handleAvatarRemove}>
                Quitar
              </Button>
            )}
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>Formatos: JPG, PNG, WEBP — máx. 5 MB</Text>
          </div>
        </div>
      )}
    </div>
  );
}
