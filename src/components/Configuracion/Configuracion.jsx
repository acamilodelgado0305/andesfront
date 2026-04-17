import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  Form, Input, Button, message, Typography, Divider,
  Spin, Avatar, Upload, Tag, Select, Row, Col, Tooltip,
} from 'antd';
import {
  EditOutlined, SaveOutlined, DeleteOutlined, ShopOutlined,
  WarningOutlined, EnvironmentOutlined, PhoneOutlined,
  MailOutlined, GlobalOutlined, BankOutlined, CameraOutlined,
  CheckCircleOutlined, LoadingOutlined, BuildOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import { LATAM_COUNTRIES, getFlagUrl, COUNTRY_CURRENCY_MAP } from '../../utils/currency';

const { Title, Text } = Typography;
const API_AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
});

// ── Sectores (mismo pool que el Onboarding) ──────────────────────────────────
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

// ── Sección contenedora ───────────────────────────────────────────────────────
const Section = ({ icon, title, subtitle, children, borderColor = '#e5e7eb' }) => (
  <div style={{
    background: '#fff',
    borderRadius: 16,
    border: `1px solid ${borderColor}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: 20,
    overflow: 'hidden',
  }}>
    <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: borderColor === '#fecaca' ? '#fef2f2' : '#f0fafa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: borderColor === '#fecaca' ? '#ef4444' : '#155153',
          fontSize: 16,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: borderColor === '#fecaca' ? '#dc2626' : '#1f2937' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
    <div style={{ padding: '20px 24px' }}>{children}</div>
  </div>
);

// ── Etiqueta de campo ─────────────────────────────────────────────────────────
const FieldLabel = ({ children, required }) => (
  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Configuracion() {
  const { user, login, patchUser } = useContext(AuthContext);

  const [infoForm] = Form.useForm();
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [bizData, setBizData]     = useState(null);

  const [uploadingLogo, setUploadingLogo]   = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingBusiness, setDeletingBusiness]   = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const DELETE_KEYWORD = 'ELIMINAR';

  // ── Opciones de país ─────────────────────────────────────────────────────────
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

  // ── Cargar datos del negocio ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.bid) return;
    setLoading(true);
    axios
      .get(`${API_AUTH_URL}/api/businesses/${user.bid}`, getAuthHeaders())
      .then(({ data }) => {
        setBizData(data);
        infoForm.setFieldsValue({
          name:          data.name        || '',
          country:       data.country     || user.country || 'CO',
          industry:      data.industry    || undefined,
          phone:         data.phone       || '',
          contact_email: data.contact_email || '',
          address:       data.address     || '',
          city:          data.city        || '',
          website:       data.website     || '',
        });
      })
      .catch(() => message.error('No se pudo cargar la información del negocio.'))
      .finally(() => setLoading(false));
  }, [user?.bid]);

  // ── Guardar información general ───────────────────────────────────────────────
  const handleSaveInfo = async (values) => {
    setSaving(true);
    try {
      const { data: updated } = await axios.put(
        `${API_AUTH_URL}/api/businesses/my`,
        {
          name:          values.name?.trim(),
          country:       values.country,
          industry:      values.industry   || null,
          phone:         values.phone?.trim()         || null,
          contact_email: values.contact_email?.trim() || null,
          address:       values.address?.trim()       || null,
          city:          values.city?.trim()          || null,
          website:       values.website?.trim()       || null,
        },
        getAuthHeaders()
      );
      setBizData(updated);
      message.success('Información actualizada correctamente.');

      // Refrescar token para que el nombre del negocio quede actualizado en toda la app
      if (values.name && values.name.trim() !== user?.business_name) {
        try {
          const { switchBusiness } = await import('../../services/auth/authService');
          const response = await switchBusiness(user.bid);
          if (response.token) {
            login(response.token, response.user);
          }
        } catch { /* no critico — el nombre se actualizó en la BD */ }
      }

      // Actualizar país en el contexto (afecta la moneda)
      if (values.country) patchUser({ country: values.country });

    } catch (err) {
      message.error(err.response?.data?.error || 'Error al guardar la información.');
    } finally {
      setSaving(false);
    }
  };

  // ── Subir logo ────────────────────────────────────────────────────────────────
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
      message.success('Logo actualizado correctamente.');
    } catch {
      message.error('No se pudo subir el logo.');
    } finally {
      setUploadingLogo(false);
    }
    return false; // evitar upload automático de antd
  };

  // ── Eliminar negocio ──────────────────────────────────────────────────────────
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

  // ── Acceso denegado ───────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  const logoUrl = bizData?.profile_picture_url || bizData?.profilePictureUrl;
  const initials = (bizData?.name || user?.business_name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>

      {/* ── ENCABEZADO ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #155153 0%, #1d8a8d 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BuildOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#155153' }}>
              Administración del Negocio
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Configura la información de <strong>{user?.business_name}</strong>
            </Text>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* ── LOGO ── */}
          <Section icon={<CameraOutlined />} title="Logo del negocio" subtitle="Imagen que representa tu negocio en documentos y el sistema">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative' }}>
                <Avatar
                  size={88}
                  src={logoUrl || undefined}
                  style={{
                    background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #155153 0%, #1d8a8d 100%)',
                    fontSize: 28, fontWeight: 700, border: '3px solid #e5e7eb',
                  }}
                >
                  {!logoUrl && initials}
                </Avatar>
              </div>
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6b7280' }}>
                  Sube el logo de tu empresa. Aparecerá en documentos y facturas.
                  <br />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Formatos: JPG, PNG, WEBP — máx. 5 MB</span>
                </p>
                <Upload showUploadList={false} beforeUpload={handleLogoUpload} accept="image/*">
                  <Button
                    icon={uploadingLogo ? <LoadingOutlined /> : <CameraOutlined />}
                    loading={uploadingLogo}
                    style={{ borderColor: '#155153', color: '#155153' }}
                  >
                    {logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </Button>
                </Upload>
              </div>
            </div>
          </Section>

          {/* ── INFORMACIÓN GENERAL ── */}
          <Section
            icon={<ShopOutlined />}
            title="Información del negocio"
            subtitle="Datos generales, de contacto y ubicación"
          >
            <Form
              form={infoForm}
              layout="vertical"
              onFinish={handleSaveInfo}
              requiredMark={false}
            >
              {/* Nombre */}
              <Form.Item
                name="name"
                label={<FieldLabel required>Nombre del negocio</FieldLabel>}
                rules={[{ required: true, message: 'El nombre es obligatorio' }, { min: 2, message: 'Mínimo 2 caracteres' }]}
                style={{ marginBottom: 16 }}
              >
                <Input size="large" prefix={<ShopOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Mi Empresa S.A.S." />
              </Form.Item>

              <Divider style={{ margin: '4px 0 18px' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>UBICACIÓN</span>
              </Divider>

              <Row gutter={14}>
                {/* País */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="country"
                    label={<FieldLabel>País</FieldLabel>}
                    style={{ marginBottom: 16 }}
                  >
                    <Select
                      size="large"
                      showSearch
                      placeholder="Selecciona tu país..."
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
                {/* Ciudad */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="city"
                    label={<FieldLabel>Ciudad</FieldLabel>}
                    style={{ marginBottom: 16 }}
                  >
                    <Input size="large"
                      prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Bogotá, Medellín, Cali..." />
                  </Form.Item>
                </Col>
              </Row>

              {/* Dirección */}
              <Form.Item
                name="address"
                label={<FieldLabel>Dirección</FieldLabel>}
                style={{ marginBottom: 16 }}
              >
                <Input size="large"
                  prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Cra. 7 #45-23, Barrio Centro..." />
              </Form.Item>

              <Divider style={{ margin: '4px 0 18px' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>SECTOR Y CONTACTO</span>
              </Divider>

              {/* Industria */}
              <Form.Item
                name="industry"
                label={<FieldLabel>Sector / Industria</FieldLabel>}
                style={{ marginBottom: 16 }}
              >
                <Select
                  size="large"
                  showSearch
                  allowClear
                  placeholder="Busca o selecciona el sector de tu negocio..."
                  options={INDUSTRY_OPTIONS}
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              <Row gutter={14}>
                {/* Teléfono */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    label={<FieldLabel>Teléfono</FieldLabel>}
                    style={{ marginBottom: 16 }}
                  >
                    <Input size="large"
                      prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="+57 300 000 0000" />
                  </Form.Item>
                </Col>
                {/* Email de contacto */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="contact_email"
                    label={<FieldLabel>Correo de contacto</FieldLabel>}
                    rules={[{ type: 'email', message: 'Correo inválido' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input size="large"
                      prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="contacto@tunegocio.com" type="email" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Sitio web */}
              <Form.Item
                name="website"
                label={<FieldLabel>Sitio web</FieldLabel>}
                style={{ marginBottom: 20 }}
              >
                <Input size="large"
                  prefix={<GlobalOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="https://www.tunegocio.com" />
              </Form.Item>

              {/* Estado actual (solo lectura) */}
              {bizData && (
                <div style={{
                  background: '#f8fafc', borderRadius: 10, padding: '12px 16px',
                  border: '1px solid #e5e7eb', marginBottom: 20,
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                }}>
                  {bizData.industry && (
                    <Tag icon={<BankOutlined />} color="blue">{bizData.industry}</Tag>
                  )}
                  {bizData.country && (
                    <Tag>
                      <img
                        src={getFlagUrl(bizData.country)}
                        width={14} height={10} alt={bizData.country}
                        style={{ borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}
                      />
                      {LATAM_COUNTRIES.find((c) => c.value === bizData.country)?.name || bizData.country}
                    </Tag>
                  )}
                  {bizData.city && <Tag icon={<EnvironmentOutlined />}>{bizData.city}</Tag>}
                  {bizData.onboarding_completed_at && (
                    <Tooltip title={`Onboarding completado: ${new Date(bizData.onboarding_completed_at).toLocaleDateString('es')}`}>
                      <Tag color="green" icon={<CheckCircleOutlined />}>Onboarding completo</Tag>
                    </Tooltip>
                  )}
                </div>
              )}

              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
                size="large"
                style={{ backgroundColor: '#155153', borderColor: '#155153', paddingInline: 28 }}
              >
                Guardar cambios
              </Button>
            </Form>
          </Section>

          {/* ── ZONA DE PELIGRO (solo superadmin) ── */}
          {isSuperAdmin && (
            <Section
              icon={<WarningOutlined />}
              title="Zona de Peligro"
              subtitle="Acciones irreversibles sobre el negocio"
              borderColor="#fecaca"
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                Eliminar el negocio borrará <strong>todas las suscripciones y usuarios vinculados</strong>.
                Esta acción <strong>no se puede deshacer</strong>.
              </Text>

              <div>
                <Text style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                  Para confirmar, escribe <strong style={{ color: '#dc2626' }}>{DELETE_KEYWORD}</strong>:
                </Text>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder={DELETE_KEYWORD}
                  style={{ maxWidth: 220, marginBottom: 16 }}
                  status={deleteConfirmText && deleteConfirmText !== DELETE_KEYWORD ? 'error' : ''}
                />
              </div>

              <Button
                danger type="primary"
                icon={<DeleteOutlined />}
                disabled={deleteConfirmText !== DELETE_KEYWORD}
                loading={deletingBusiness}
                onClick={handleDelete}
              >
                Eliminar Negocio Permanentemente
              </Button>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
