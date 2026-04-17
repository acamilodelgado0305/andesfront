import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Popconfirm, message,
  Typography, Space, Tooltip, ConfigProvider, Divider, Tabs,
  Avatar, Upload, Spin, Tag, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, KeyOutlined, UserOutlined, MailOutlined,
  SafetyCertificateOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  WarningOutlined, ShopOutlined, EnvironmentOutlined, PhoneOutlined,
  GlobalOutlined, BankOutlined, CameraOutlined, BuildOutlined,
  CheckCircleOutlined, LoadingOutlined, TeamOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import { LATAM_COUNTRIES, getFlagUrl, COUNTRY_CURRENCY_MAP } from '../../utils/currency';

const { Title, Text } = Typography;
const { Option } = Select;

const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY_COLOR = '#155153';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
});

// ── Sectores económicos ────────────────────────────────────────────────────────
const mkOpts = (list) => list.map((v) => ({ label: v, value: v }));
const INDUSTRY_OPTIONS = [
  { label: '🍽️ Alimentación y bebidas', options: mkOpts(['Restaurante / Comida','Cafetería / Bar','Panadería / Pastelería','Heladería','Comida rápida','Catering / Eventos gastronómicos','Distribuidora de alimentos','Frutas y verduras']) },
  { label: '🎓 Educación', options: mkOpts(['Colegio / Escuela','Academia / Instituto de capacitación','Centro de idiomas','Jardín infantil / Guardería','Universidad / Pregrado','Cursos y talleres online','Coaching / Mentoría','Escuela de música / arte / danza']) },
  { label: '🏥 Salud y bienestar', options: mkOpts(['Clínica / Consultorio médico','Odontología','Farmacia / Droguería','Laboratorio clínico','Gimnasio / Fitness','Spa / Centro de estética','Peluquería / Barbería','Psicología / Terapia','Nutrición / Dietética','Óptica','Veterinaria / Mascotas']) },
  { label: '💻 Tecnología', options: mkOpts(['Venta de equipos y celulares','Servicio técnico / Reparaciones','Desarrollo de software / Apps','Agencia digital / Marketing online','Telecomunicaciones','Electrónica y electrodomésticos','Seguridad electrónica / CCTV']) },
  { label: '👗 Moda y accesorios', options: mkOpts(['Tienda de ropa y moda','Calzado','Joyería / Bisutería','Accesorios y carteras','Ropa deportiva','Ropa infantil','Taller de costura / confección']) },
  { label: '🛒 Comercio general', options: mkOpts(['Supermercado / Tienda de barrio','Ferretería / Materiales de construcción','Librería / Papelería','Artículos del hogar / Muebles','Juguetería','Deportes / Outdoor / Camping','Floristería','Productos de limpieza','Insumos médicos / Hospitalarios']) },
  { label: '💼 Servicios profesionales', options: mkOpts(['Contabilidad / Finanzas','Abogados / Consultoría legal','Consultoría empresarial','Marketing / Publicidad / Agencia','Diseño gráfico / Creativo','Arquitectura / Ingeniería','Inmobiliaria / Bienes raíces','Recursos humanos','Seguros','Traducción / Idiomas']) },
  { label: '🏗️ Construcción y remodelación', options: mkOpts(['Construcción / Obra civil','Remodelación / Acabados','Pintura / Decoración de interiores','Ventanas / Puertas / Vidrios','Plomería','Electricidad / Instalaciones','Aire acondicionado / Refrigeración','Paisajismo / Jardinería']) },
  { label: '🌾 Agropecuario', options: mkOpts(['Agricultura / Cultivos','Ganadería / Pecuario','Floricultura','Avicultura','Piscicultura / Acuicultura','Agroveterinaria','Agroindustria / Procesamiento','Vivero / Semillas']) },
  { label: '🚗 Transporte y automotriz', options: mkOpts(['Transporte de personas / Taxi','Mensajería / Domicilios / Delivery','Mudanzas / Carga','Taller mecánico / Automotriz','Lavadero de carros','Venta de repuestos / Autopartes','Rentacar','Motocicletas y repuestos']) },
  { label: '🎉 Entretenimiento y turismo', options: mkOpts(['Eventos / Fiestas / Bodas','Fotografía / Video / Producción','Música / DJ / Entretenimiento','Hotel / Hostal / Hospedaje','Agencia de viajes / Turismo','Parque / Recreación / Juegos','Tatuajes / Piercing','Cine / Teatro / Cultura']) },
  { label: '⛪ Social y comunitario', options: mkOpts(['Iglesia / Organización religiosa','ONG / Fundación','Entidad pública / Gobierno','Asociación / Cooperativa','Club deportivo']) },
  { label: '🏭 Industria y manufactura', options: mkOpts(['Manufactura / Producción industrial','Textil / Confección industrial','Plásticos / Empaques','Metalmecánica','Madera / Ebanistería','Productos químicos','Imprentas / Artes gráficas']) },
  { label: '📦 Otro', options: mkOpts(['Otro sector']) },
];

// ── Tarjeta sección ────────────────────────────────────────────────────────────
const SectionCard = ({ children, style = {} }) => (
  <div style={{
    background: '#fff', borderRadius: 14,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    padding: '20px 24px',
    marginBottom: 20,
    ...style,
  }}>
    {children}
  </div>
);

const FieldLabel = ({ children, required }) => (
  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA 1 — INFORMACIÓN DEL NEGOCIO
// ═══════════════════════════════════════════════════════════════════════════════
const TabInfoNegocio = ({ user, login, patchUser }) => {
  const [infoForm] = Form.useForm();
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bizData, setBizData] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const countryOptions = useMemo(() =>
    LATAM_COUNTRIES.map((c) => ({
      value: c.value,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={getFlagUrl(c.value)} width={18} height={13} alt={c.value}
            style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
          {c.name}
        </span>
      ),
      searchLabel: c.name,
    })),
  []);

  useEffect(() => {
    if (!user?.bid) return;
    setLoadingBiz(true);
    axios.get(`${API_AUTH_URL}/api/businesses/${user.bid}`, getAuthHeaders())
      .then(({ data }) => {
        setBizData(data);
        infoForm.setFieldsValue({
          name:          data.name          || '',
          country:       data.country       || user.country || 'CO',
          city:          data.city          || '',
          address:       data.address       || '',
          industry:      data.industry      || undefined,
          phone:         data.phone         || '',
          contact_email: data.contact_email || '',
          website:       data.website       || '',
        });
      })
      .catch(() => message.error('No se pudo cargar la información del negocio.'))
      .finally(() => setLoadingBiz(false));
  }, [user?.bid]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const { data: updated } = await axios.put(
        `${API_AUTH_URL}/api/businesses/my`,
        {
          name:          values.name?.trim(),
          country:       values.country       || null,
          city:          values.city?.trim()          || null,
          address:       values.address?.trim()       || null,
          industry:      values.industry              || null,
          phone:         values.phone?.trim()         || null,
          contact_email: values.contact_email?.trim() || null,
          website:       values.website?.trim()       || null,
        },
        getAuthHeaders()
      );
      setBizData(updated);
      message.success('Información actualizada correctamente.');

      // Refrescar token si cambió el nombre
      if (values.name?.trim() !== user?.business_name) {
        try {
          const { switchBusiness } = await import('../../services/auth/authService');
          const resp = await switchBusiness(user.bid);
          if (resp.token) login(resp.token, resp.user);
        } catch { /* no crítico */ }
      }
      if (values.country && patchUser) patchUser({ country: values.country });
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('profilePicture', file);
      const { data } = await axios.put(
        `${API_AUTH_URL}/api/businesses/${user.bid}/picture`,
        fd,
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      setBizData((prev) => ({ ...prev, profile_picture_url: data.url }));
      message.success('Logo actualizado.');
    } catch {
      message.error('No se pudo subir el logo.');
    } finally {
      setUploadingLogo(false);
    }
    return false;
  };

  if (loadingBiz) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  const logoUrl = bizData?.profile_picture_url || bizData?.profilePictureUrl;
  const initials = (bizData?.name || user?.business_name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return (
    <div>
      {/* ── Logo ── */}
      <SectionCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CameraOutlined style={{ color: PRIMARY_COLOR }} />
          <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>Logo del negocio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar
            size={80}
            src={logoUrl || undefined}
            style={{
              background: logoUrl ? 'transparent'
                : `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #1d8a8d 100%)`,
              fontSize: 26, fontWeight: 700, border: '3px solid #e5e7eb', flexShrink: 0,
            }}
          >
            {!logoUrl && initials}
          </Avatar>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6b7280' }}>
              Sube el logo de tu empresa. Aparecerá en documentos y facturas.<br />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>JPG, PNG, WEBP — máx. 5 MB</span>
            </p>
            <Upload showUploadList={false} beforeUpload={handleLogoUpload} accept="image/*">
              <Button
                icon={uploadingLogo ? <LoadingOutlined /> : <CameraOutlined />}
                loading={uploadingLogo}
                style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
              >
                {logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </Button>
            </Upload>
          </div>
        </div>
      </SectionCard>

      {/* ── Formulario info ── */}
      <SectionCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <ShopOutlined style={{ color: PRIMARY_COLOR }} />
          <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>Información del negocio</span>
        </div>

        <Form form={infoForm} layout="vertical" onFinish={handleSave} requiredMark={false}>

          {/* Nombre */}
          <Form.Item
            name="name"
            label={<FieldLabel required>Nombre del negocio</FieldLabel>}
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
            style={{ marginBottom: 16 }}
          >
            <Input size="large" prefix={<ShopOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Mi Empresa S.A.S." />
          </Form.Item>

          <Divider style={{ margin: '4px 0 18px' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>UBICACIÓN</span>
          </Divider>

          <Row gutter={14}>
            <Col xs={24} sm={12}>
              <Form.Item name="country" label={<FieldLabel>País</FieldLabel>} style={{ marginBottom: 16 }}>
                <Select
                  size="large" showSearch placeholder="Selecciona tu país..."
                  options={countryOptions}
                  filterOption={(input, option) =>
                    String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(v) => {
                    const info = COUNTRY_CURRENCY_MAP?.[v];
                    const currentPhone = infoForm.getFieldValue('phone') || '';
                    if (info?.phoneCode && (!currentPhone || /^\+\d{1,4}\s*$/.test(currentPhone.trim()))) {
                      infoForm.setFieldsValue({ phone: info.phoneCode });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="city" label={<FieldLabel>Ciudad</FieldLabel>} style={{ marginBottom: 16 }}>
                <Input size="large" prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Bogotá, Medellín..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label={<FieldLabel>Dirección</FieldLabel>} style={{ marginBottom: 16 }}>
            <Input size="large" prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Cra. 7 #45-23, Barrio Centro..." />
          </Form.Item>

          <Divider style={{ margin: '4px 0 18px' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>SECTOR Y CONTACTO</span>
          </Divider>

          <Form.Item name="industry" label={<FieldLabel>Sector / Industria</FieldLabel>} style={{ marginBottom: 16 }}>
            <Select
              size="large" showSearch allowClear
              placeholder="Busca o selecciona el sector..."
              options={INDUSTRY_OPTIONS}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Row gutter={14}>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label={<FieldLabel>Teléfono</FieldLabel>} style={{ marginBottom: 16 }}>
                <Input size="large" prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="+57 300 000 0000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="contact_email" label={<FieldLabel>Correo de contacto</FieldLabel>}
                rules={[{ type: 'email', message: 'Correo inválido' }]}
                style={{ marginBottom: 16 }}
              >
                <Input size="large" prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="contacto@tunegocio.com" type="email" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="website" label={<FieldLabel>Sitio web</FieldLabel>} style={{ marginBottom: 20 }}>
            <Input size="large" prefix={<GlobalOutlined style={{ color: '#94a3b8' }} />}
              placeholder="https://www.tunegocio.com" />
          </Form.Item>

          {/* Tags resumen */}
          {bizData && (
            <div style={{
              background: '#f8fafc', borderRadius: 10, padding: '12px 16px',
              border: '1px solid #e5e7eb', marginBottom: 20,
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {bizData.industry && <Tag icon={<BankOutlined />} color="blue">{bizData.industry}</Tag>}
              {bizData.country && (
                <Tag>
                  <img src={getFlagUrl(bizData.country)} width={14} height={10} alt={bizData.country}
                    style={{ borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
                  {LATAM_COUNTRIES.find((c) => c.value === bizData.country)?.name || bizData.country}
                </Tag>
              )}
              {bizData.city && <Tag icon={<EnvironmentOutlined />}>{bizData.city}</Tag>}
              {bizData.onboarding_completed_at && (
                <Tag color="green" icon={<CheckCircleOutlined />}>Onboarding completo</Tag>
              )}
            </div>
          )}

          <Button
            type="primary" htmlType="submit" icon={<SaveOutlined />}
            loading={saving} size="large"
            style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, paddingInline: 28 }}
          >
            Guardar cambios
          </Button>
        </Form>
      </SectionCard>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA 2 — USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════
const TabUsuarios = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm] = Form.useForm();

  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdForm] = Form.useForm();
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_AUTH_URL}/api/businesses/my/users`, getAuthHeaders());
      setUsers(data);
    } catch {
      message.error('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreateSubmit = async (values) => {
    setIsCreating(true);
    try {
      await axios.post(`${API_AUTH_URL}/api/businesses/my/users`, values, getAuthHeaders());
      message.success('Usuario agregado correctamente.');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al agregar usuario.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete(`${API_AUTH_URL}/api/businesses/my/users/${userId}`, getAuthHeaders());
      message.success('Usuario eliminado del negocio.');
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al eliminar usuario.');
    }
  };

  const handleOpenPwdModal = (userId) => {
    setSelectedUserId(userId);
    pwdForm.resetFields();
    setIsPwdModalOpen(true);
  };

  const handlePwdSubmit = async (values) => {
    setIsChangingPwd(true);
    try {
      await axios.put(
        `${API_AUTH_URL}/api/businesses/my/users/${selectedUserId}/password`,
        { newPassword: values.newPassword },
        getAuthHeaders()
      );
      message.success('Contraseña actualizada.');
      setIsPwdModalOpen(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al cambiar la contraseña.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `${API_AUTH_URL}/api/businesses/my/users/${userId}/role`,
        { role: newRole },
        getAuthHeaders()
      );
      message.success('Rol actualizado.');
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al cambiar el rol.');
      fetchUsers();
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} style={{ background: PRIMARY_COLOR, fontSize: 13, fontWeight: 700 }}>
            {(text || '?').charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{text}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      width: 180,
      render: (role, record) => (
        <Select
          defaultValue={role}
          style={{ width: 150 }}
          onChange={(val) => handleRoleChange(record.id, val)}
          size="small"
        >
          <Option value="user">Colaborador</Option>
          <Option value="admin">Administrador</Option>
        </Select>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Cambiar contraseña">
            <Button type="dashed" icon={<KeyOutlined />}
              onClick={() => handleOpenPwdModal(record.id)} size="small" />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar usuario del negocio?"
            description="Este usuario perderá el acceso."
            onConfirm={() => handleRemoveUser(record.id)}
            okText="Sí, eliminar" cancelText="Cancelar"
          >
            <Tooltip title="Eliminar del negocio">
              <Button danger type="text" icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SectionCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined style={{ color: PRIMARY_COLOR }} />
            <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>
              Usuarios del negocio
            </span>
            <span style={{
              background: '#eff6ff', color: '#1d4ed8', fontSize: 11,
              fontWeight: 700, padding: '1px 8px', borderRadius: 20,
            }}>
              {users.length}
            </span>
          </div>
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            Agregar usuario
          </Button>
        </div>

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, size: 'small' }}
          size="middle"
          scroll={{ x: 500 }}
          locale={{ emptyText: 'Sin usuarios registrados aún.' }}
        />
      </SectionCard>

      {/* MODAL CREAR */}
      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserOutlined /> Agregar Usuario</span>}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null} destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nombre completo" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Juan Pérez" size="large" />
          </Form.Item>
          <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="juan@empresa.com" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña provisional" rules={[{ required: true, min: 6 }]}>
            <Input.Password prefix={<KeyOutlined style={{ color: '#94a3b8' }} />} placeholder="Mínimo 6 caracteres" size="large" />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select placeholder="Selecciona el nivel de acceso" size="large">
              <Option value="user">Colaborador</Option>
              <Option value="admin">Administrador</Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button size="large" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button size="large" type="primary" htmlType="submit" loading={isCreating}
              style={{ backgroundColor: PRIMARY_COLOR }}>
              Crear usuario
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SafetyCertificateOutlined /> Cambiar Contraseña</span>}
        open={isPwdModalOpen}
        onCancel={() => setIsPwdModalOpen(false)}
        footer={null} destroyOnClose width={400}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handlePwdSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="newPassword" label="Nueva contraseña"
            rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres.' }]}>
            <Input.Password prefix={<KeyOutlined style={{ color: '#94a3b8' }} />}
              size="large" placeholder="Escribe la nueva contraseña" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setIsPwdModalOpen(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={isChangingPwd}
              style={{ backgroundColor: PRIMARY_COLOR }}>
              Guardar
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA 3 — ZONA DE PELIGRO
// ═══════════════════════════════════════════════════════════════════════════════
const TabPeligro = ({ user }) => {
  const isSuperAdmin = user?.role === 'superadmin';
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingBusiness, setDeletingBusiness] = useState(false);
  const DELETE_KEYWORD = 'ELIMINAR';

  const handleDelete = async () => {
    if (deleteConfirmText !== DELETE_KEYWORD) return;
    setDeletingBusiness(true);
    try {
      await axios.delete(`${API_AUTH_URL}/api/businesses/my`, getAuthHeaders());
      message.success('Negocio eliminado.');
      const { logout } = await import('../../services/auth/authService');
      logout();
      window.location.replace('/login');
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al eliminar el negocio.');
      setDeletingBusiness(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <SectionCard>
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
          <WarningOutlined style={{ fontSize: 32, marginBottom: 12 }} />
          <p>Solo el superadministrador puede acceder a esta sección.</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard style={{ border: '1px solid #fecaca' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <WarningOutlined style={{ color: '#ef4444' }} />
        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>Zona de Peligro</span>
      </div>
      <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 20 }}>
        Eliminar el negocio borrará <strong>todas las suscripciones y usuarios vinculados</strong>.
        Esta acción es <strong>irreversible</strong>.
      </Text>

      <Divider style={{ margin: '0 0 16px' }} />

      <Text style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
        Para confirmar, escribe <strong style={{ color: '#dc2626' }}>{DELETE_KEYWORD}</strong>:
      </Text>
      <Input
        value={deleteConfirmText}
        onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
        placeholder={DELETE_KEYWORD}
        style={{ maxWidth: 220, marginBottom: 18 }}
        status={deleteConfirmText && deleteConfirmText !== DELETE_KEYWORD ? 'error' : ''}
      />
      <br />
      <Button
        danger type="primary" icon={<DeleteOutlined />}
        disabled={deleteConfirmText !== DELETE_KEYWORD}
        loading={deletingBusiness}
        onClick={handleDelete}
      >
        Eliminar Negocio Permanentemente
      </Button>
    </SectionCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const UsersDashboard = () => {
  const { user, login, patchUser } = useContext(AuthContext);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  const tabItems = [
    {
      key: 'info',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BuildOutlined /> Información del Negocio
        </span>
      ),
      children: <TabInfoNegocio user={user} login={login} patchUser={patchUser} />,
    },
    {
      key: 'usuarios',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TeamOutlined /> Usuarios
        </span>
      ),
      children: <TabUsuarios />,
    },
    {
      key: 'peligro',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
          <WarningOutlined /> Zona de Peligro
        </span>
      ),
      children: <TabPeligro user={user} />,
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: PRIMARY_COLOR } }}>
      <div style={{
        maxWidth: 860, margin: '0 auto',
        padding: '24px 16px',
        minHeight: 'calc(100vh - 64px)',
      }}>
        {/* Header */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          padding: '20px 28px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #1d8a8d 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BuildOutlined style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: PRIMARY_COLOR }}>
              Administra tu Negocio
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Gestiona la información, los accesos y la configuración de{' '}
              <strong>{user?.business_name}</strong>.
            </Text>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          defaultActiveKey="info"
          items={tabItems}
          tabBarStyle={{ marginBottom: 20 }}
          size="middle"
        />
      </div>
    </ConfigProvider>
  );
};

export default UsersDashboard;
