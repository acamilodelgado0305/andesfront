// src/components/Onboarding/OnboardingWizard.jsx
import React, { useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { message, Input, Progress, Select } from 'antd';
// Pre-build the options array for the industry Select (Ant Design 5 `options` prop API)
// This avoids OptGroup/Option JSX children issues with showSearch + filterOption.
import {
  InstagramOutlined,
  RobotOutlined,
  SoundOutlined,
  TeamOutlined,
  LinkedinOutlined,
  TikTokOutlined,
  GoogleOutlined,
  YoutubeOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ShopOutlined,
  ToolOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LineChartOutlined,
  InboxOutlined,
  WalletOutlined,
  FileTextOutlined,
  ContactsOutlined,
  UserOutlined,
  TeamOutlined as AcademicOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../../AuthContext';
import { LATAM_COUNTRIES, getFlagUrl, COUNTRY_CURRENCY_MAP } from '../../utils/currency';

const API_AUTH_SERVICE = import.meta.env.VITE_API_AUTH_SERVICE;
const PRIMARY = '#1d4ed8';
const DARK = '#0a1f3d';

// ─────────────────────────────────────────────
// DATOS ESTÁTICOS
// ─────────────────────────────────────────────

const SOURCES = [
  { key: 'social',         label: 'Redes sociales',  icon: <InstagramOutlined /> },
  { key: 'ai',             label: 'IA / ChatGPT',    icon: <RobotOutlined /> },
  { key: 'google',         label: 'Google',          icon: <GoogleOutlined /> },
  { key: 'recommendation', label: 'Recomendación',   icon: <TeamOutlined /> },
  { key: 'linkedin',       label: 'LinkedIn',        icon: <LinkedinOutlined /> },
  { key: 'tiktok',         label: 'TikTok',          icon: <TikTokOutlined /> },
  { key: 'youtube',        label: 'YouTube',         icon: <YoutubeOutlined /> },
  { key: 'radio',          label: 'Radio / TV',      icon: <SoundOutlined /> },
  { key: 'other',          label: 'Otro',            icon: <QuestionCircleOutlined /> },
];

const OFFERINGS = [
  { key: 'products', label: 'Productos',             description: 'Vendo artículos físicos o digitales.', icon: <ShoppingOutlined /> },
  { key: 'services', label: 'Servicios',             description: 'Presto servicios a mis clientes.',     icon: <ToolOutlined /> },
  { key: 'both',     label: 'Productos y servicios', description: 'Ofrezco ambos.',                       icon: <AppstoreOutlined /> },
];

const TIMINGS = [
  { key: 'today',     label: 'Hoy mismo',    description: 'Quiero empezar a operar ya.',         icon: <RocketOutlined /> },
  { key: 'few_days',  label: 'En unos días', description: 'Voy a configurarla primero.',          icon: <ClockCircleOutlined /> },
  { key: 'exploring', label: 'Solo exploro', description: 'Estoy conociendo la herramienta.',     icon: <EyeOutlined /> },
];

// Propósitos de uso (selección múltiple)
const USE_PURPOSES = [
  { key: 'sales',      label: 'Controlar mis ventas',           icon: <LineChartOutlined /> },
  { key: 'inventory',  label: 'Gestionar inventario',           icon: <InboxOutlined /> },
  { key: 'finance',    label: 'Llevar mis finanzas',            icon: <WalletOutlined /> },
  { key: 'documents',  label: 'Emitir documentos / facturas',   icon: <FileTextOutlined /> },
  { key: 'clients',    label: 'Gestionar clientes',             icon: <ContactsOutlined /> },
  { key: 'orders',     label: 'Administrar pedidos',            icon: <ShoppingCartOutlined /> },
  { key: 'employees',  label: 'Gestionar empleados',            icon: <UserOutlined /> },
  { key: 'academic',   label: 'Control académico / estudiantes',icon: <AcademicOutlined /> },
  { key: 'other',      label: 'Otro',                           icon: <QuestionCircleOutlined /> },
];

// Sectores económicos — formato `options` de Ant Design 5 (compatible con showSearch)
const mkOpts = (list) => list.map((v) => ({ label: v, value: v }));

const INDUSTRY_OPTIONS = [
  { label: '🍽️ Alimentación y bebidas', options: mkOpts([
    'Restaurante / Comida',
    'Cafetería / Bar',
    'Panadería / Pastelería',
    'Heladería',
    'Comida rápida',
    'Catering / Eventos gastronómicos',
    'Distribuidora de alimentos',
    'Frutas y verduras',
  ])},
  { label: '🎓 Educación', options: mkOpts([
    'Colegio / Escuela',
    'Academia / Instituto de capacitación',
    'Centro de idiomas',
    'Jardín infantil / Guardería',
    'Universidad / Pregrado',
    'Cursos y talleres online',
    'Coaching / Mentoría',
    'Escuela de música / arte / danza',
  ])},
  { label: '🏥 Salud y bienestar', options: mkOpts([
    'Clínica / Consultorio médico',
    'Odontología',
    'Farmacia / Droguería',
    'Laboratorio clínico',
    'Gimnasio / Fitness',
    'Spa / Centro de estética',
    'Peluquería / Barbería',
    'Psicología / Terapia',
    'Nutrición / Dietética',
    'Óptica',
    'Veterinaria / Mascotas',
  ])},
  { label: '💻 Tecnología', options: mkOpts([
    'Venta de equipos y celulares',
    'Servicio técnico / Reparaciones',
    'Desarrollo de software / Apps',
    'Agencia digital / Marketing online',
    'Telecomunicaciones',
    'Electrónica y electrodomésticos',
    'Seguridad electrónica / CCTV',
  ])},
  { label: '👗 Moda y accesorios', options: mkOpts([
    'Tienda de ropa y moda',
    'Calzado',
    'Joyería / Bisutería',
    'Accesorios y carteras',
    'Ropa deportiva',
    'Ropa infantil',
    'Taller de costura / confección',
  ])},
  { label: '🛒 Comercio general', options: mkOpts([
    'Supermercado / Tienda de barrio',
    'Ferretería / Materiales de construcción',
    'Librería / Papelería',
    'Artículos del hogar / Muebles',
    'Juguetería',
    'Deportes / Outdoor / Camping',
    'Floristería',
    'Productos de limpieza',
    'Insumos médicos / Hospitalarios',
  ])},
  { label: '💼 Servicios profesionales', options: mkOpts([
    'Contabilidad / Finanzas',
    'Abogados / Consultoría legal',
    'Consultoría empresarial',
    'Marketing / Publicidad / Agencia',
    'Diseño gráfico / Creativo',
    'Arquitectura / Ingeniería',
    'Inmobiliaria / Bienes raíces',
    'Recursos humanos',
    'Seguros',
    'Traducción / Idiomas',
  ])},
  { label: '🏗️ Construcción y remodelación', options: mkOpts([
    'Construcción / Obra civil',
    'Remodelación / Acabados',
    'Pintura / Decoración de interiores',
    'Ventanas / Puertas / Vidrios',
    'Plomería',
    'Electricidad / Instalaciones',
    'Aire acondicionado / Refrigeración',
    'Paisajismo / Jardinería',
  ])},
  { label: '🌾 Agropecuario', options: mkOpts([
    'Agricultura / Cultivos',
    'Ganadería / Pecuario',
    'Floricultura',
    'Avicultura',
    'Piscicultura / Acuicultura',
    'Agroveterinaria',
    'Agroindustria / Procesamiento',
    'Vivero / Semillas',
  ])},
  { label: '🚗 Transporte y automotriz', options: mkOpts([
    'Transporte de personas / Taxi',
    'Mensajería / Domicilios / Delivery',
    'Mudanzas / Carga',
    'Taller mecánico / Automotriz',
    'Lavadero de carros',
    'Venta de repuestos / Autopartes',
    'Rentacar',
    'Motocicletas y repuestos',
  ])},
  { label: '🎉 Entretenimiento y turismo', options: mkOpts([
    'Eventos / Fiestas / Bodas',
    'Fotografía / Video / Producción',
    'Música / DJ / Entretenimiento',
    'Hotel / Hostal / Hospedaje',
    'Agencia de viajes / Turismo',
    'Parque / Recreación / Juegos',
    'Tatuajes / Piercing',
    'Cine / Teatro / Cultura',
  ])},
  { label: '⛪ Social y comunitario', options: mkOpts([
    'Iglesia / Organización religiosa',
    'ONG / Fundación',
    'Entidad pública / Gobierno',
    'Asociación / Cooperativa',
    'Club deportivo',
  ])},
  { label: '🏭 Industria y manufactura', options: mkOpts([
    'Manufactura / Producción industrial',
    'Textil / Confección industrial',
    'Plásticos / Empaques',
    'Metalmecánica',
    'Madera / Ebanistería',
    'Productos químicos',
    'Imprentas / Artes gráficas',
  ])},
  { label: '📦 Otro', options: mkOpts(['Otro sector']) },
];

// ─────────────────────────────────────────────
// COMPONENTES VISUALES REUTILIZABLES
// ─────────────────────────────────────────────

const CardOption = ({ active, onClick, icon, label, description, compact = false }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      textAlign: 'left',
      padding: compact ? '12px 14px' : '16px 18px',
      borderRadius: 12,
      border: `1.5px solid ${active ? PRIMARY : '#e5e7eb'}`,
      background: active ? '#eff6ff' : '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 2px 10px rgba(29,78,216,0.15)' : 'none',
      width: '100%',
    }}
  >
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: active ? PRIMARY : '#f3f4f6',
      color: active ? '#fff' : '#64748b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: active ? DARK : '#1f2937', marginBottom: description ? 2 : 0 }}>
        {label}
      </div>
      {description && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{description}</div>}
    </div>
    {active && <CheckCircleOutlined style={{ color: PRIMARY, fontSize: 16, flexShrink: 0 }} />}
  </button>
);

// Card seleccionable para propósitos múltiples
const CheckCard = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '12px 14px',
      borderRadius: 10,
      border: `1.5px solid ${active ? PRIMARY : '#e5e7eb'}`,
      background: active ? '#eff6ff' : '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 2px 8px rgba(29,78,216,0.12)' : 'none',
      width: '100%',
    }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: active ? PRIMARY : '#f3f4f6',
      color: active ? '#fff' : '#64748b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, flexShrink: 0,
    }}>
      {icon}
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: active ? DARK : '#374151', flex: 1, textAlign: 'left' }}>
      {label}
    </span>
    <div style={{
      width: 18, height: 18, borderRadius: 4,
      border: `2px solid ${active ? PRIMARY : '#d1d5db'}`,
      background: active ? PRIMARY : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {active && <CheckCircleOutlined style={{ color: '#fff', fontSize: 10 }} />}
    </div>
  </button>
);

const YesNoPick = ({ value, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    {[{ v: true, label: '✅ Sí' }, { v: false, label: '❌ No' }].map(({ v, label }) => (
      <button
        key={String(v)}
        type="button"
        onClick={() => onChange(v)}
        style={{
          padding: '22px 16px',
          borderRadius: 12,
          border: `1.5px solid ${value === v ? PRIMARY : '#e5e7eb'}`,
          background: value === v ? '#eff6ff' : '#fff',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 600,
          color: value === v ? DARK : '#475569',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    ))}
  </div>
);

const StepTitle = ({ eyebrow, title, subtitle }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
      {eyebrow}
    </div>
    <h2 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 800, color: DARK, lineHeight: 1.3 }}>{title}</h2>
    {subtitle && <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{subtitle}</p>}
  </div>
);

const LabeledInput = ({ label, value, onChange, placeholder, type = 'text', prefix }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
      {label}
    </label>
    <Input
      size="large"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      prefix={prefix}
    />
  </div>
);

// ─────────────────────────────────────────────
// WIZARD PRINCIPAL
// ─────────────────────────────────────────────

const OnboardingWizard = ({ open, onClose }) => {
  const { user, patchUser } = useContext(AuthContext);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState({
    referral_source: null,
    referral_source_other: '',
    used_before: null,
    offering_type: null,
    has_physical_store: null,
    use_purposes: [],      // array de keys (selección múltiple)
    use_purpose_other: '', // texto libre si eligió 'other'
    start_timing: null,
    // Datos del negocio
    name: user?.business_name || '',
    country: user?.country || 'CO',
    industry: null,
    phone: COUNTRY_CURRENCY_MAP[user?.country || 'CO']?.phoneCode || '+57',
    contact_email: user?.email || '',
    address: '',
    city: '',
    website: '',
  });

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));

  // Opciones de país con banderas reales (imagen CDN, no emoji — funciona en Windows)
  const countryOptions = useMemo(() =>
    LATAM_COUNTRIES.map((c) => ({
      value: c.value,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src={getFlagUrl(c.value)}
            width={20}
            height={14}
            alt={c.value}
            style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
          />
          {c.name}
        </span>
      ),
      searchLabel: c.name, // usado en filterOption para búsqueda por texto
    })),
  []);

  const togglePurpose = (key) => {
    setData((prev) => {
      const already = prev.use_purposes.includes(key);
      return {
        ...prev,
        use_purposes: already
          ? prev.use_purposes.filter((k) => k !== key)
          : [...prev.use_purposes, key],
        use_purpose_other: key === 'other' && already ? '' : prev.use_purpose_other,
      };
    });
  };

  const TOTAL_STEPS = 7;

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        if (!data.referral_source) return false;
        if (data.referral_source === 'other' && !data.referral_source_other.trim()) return false;
        return true;
      case 1: return data.used_before !== null;
      case 2: return !!data.offering_type;
      case 3: return data.has_physical_store !== null;
      case 4: {
        if (data.use_purposes.length === 0) return false;
        if (data.use_purposes.includes('other') && !data.use_purpose_other.trim()) return false;
        return true;
      }
      case 5: return !!data.start_timing;
      case 6: return data.name.trim().length >= 2 && !!data.country && !!data.industry;
      default: return true;
    }
  }, [step, data]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');

      // Convertir use_purposes (array) a un texto legible para guardar en la BD
      const selectedLabels = data.use_purposes
        .map((k) => {
          if (k === 'other') return data.use_purpose_other.trim();
          return USE_PURPOSES.find((p) => p.key === k)?.label || k;
        })
        .filter(Boolean)
        .join(', ');

      const payload = {
        referral_source: data.referral_source,
        referral_source_other: data.referral_source === 'other' ? data.referral_source_other.trim() : null,
        used_before: data.used_before,
        offering_type: data.offering_type,
        has_physical_store: data.has_physical_store,
        use_purpose: selectedLabels || null,
        start_timing: data.start_timing,
        name: data.name.trim(),
        country: data.country || 'CO',
        industry: data.industry || null,
        phone: data.phone.trim() || null,
        contact_email: data.contact_email.trim() || null,
        address: data.address.trim() || null,
        city: data.city.trim() || null,
        website: data.website.trim() || null,
      };

      const { data: biz } = await axios.post(
        `${API_AUTH_SERVICE}/api/businesses/my/onboarding`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      patchUser({
        onboarding_completed_at: biz.onboarding_completed_at,
        business_name: biz.name,
        country: biz.country || data.country,
      });

      message.success('¡Listo! Bienvenido a Rapictrl.');
      onClose?.();
    } catch (err) {
      console.error('Onboarding error:', err);
      message.error(err.response?.data?.error || 'No pudimos guardar la información. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // ─── Render por paso ───
  const renderStep = () => {
    switch (step) {

      // PASO 1 — ¿Cómo nos conociste?
      case 0:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 1 de ${TOTAL_STEPS}`}
              title="¿Cómo nos conociste?"
              subtitle="Nos ayuda a entender qué canales funcionan mejor."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
              {SOURCES.map((s) => (
                <CardOption
                  key={s.key}
                  active={data.referral_source === s.key}
                  onClick={() => update({ referral_source: s.key })}
                  icon={s.icon}
                  label={s.label}
                  compact
                />
              ))}
            </div>
            {data.referral_source === 'other' && (
              <div style={{ marginTop: 14 }}>
                <Input
                  placeholder="Cuéntanos de dónde..."
                  value={data.referral_source_other}
                  onChange={(e) => update({ referral_source_other: e.target.value })}
                  size="large"
                />
              </div>
            )}
          </>
        );

      // PASO 2 — ¿Has usado Rapictrl antes?
      case 1:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 2 de ${TOTAL_STEPS}`}
              title="¿Has usado Rapictrl antes?"
              subtitle="Queremos saber si eres nuevo por aquí o nos estás reencontrando."
            />
            <YesNoPick value={data.used_before} onChange={(v) => update({ used_before: v })} />
          </>
        );

      // PASO 3 — ¿Qué ofrece tu empresa?
      case 2:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 3 de ${TOTAL_STEPS}`}
              title="¿Qué ofrece tu empresa?"
              subtitle="Esto nos ayuda a configurar tu experiencia."
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {OFFERINGS.map((o) => (
                <CardOption
                  key={o.key}
                  active={data.offering_type === o.key}
                  onClick={() => update({ offering_type: o.key })}
                  icon={o.icon}
                  label={o.label}
                  description={o.description}
                />
              ))}
            </div>
          </>
        );

      // PASO 4 — ¿Tienes tienda física?
      case 3:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 4 de ${TOTAL_STEPS}`}
              title="¿Tienes tienda física?"
              subtitle="Local abierto al público, oficina, bodega o similar."
            />
            <YesNoPick value={data.has_physical_store} onChange={(v) => update({ has_physical_store: v })} />
          </>
        );

      // PASO 5 — ¿Para qué usarás Rapictrl? (selección múltiple)
      case 4:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 5 de ${TOTAL_STEPS}`}
              title="¿Para qué usarás Rapictrl?"
              subtitle="Selecciona todo lo que aplique a tu negocio."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {USE_PURPOSES.map((p) => (
                <CheckCard
                  key={p.key}
                  active={data.use_purposes.includes(p.key)}
                  onClick={() => togglePurpose(p.key)}
                  icon={p.icon}
                  label={p.label}
                />
              ))}
            </div>
            {data.use_purposes.includes('other') && (
              <div style={{ marginTop: 14 }}>
                <Input
                  placeholder="Describe para qué lo usarás..."
                  value={data.use_purpose_other}
                  onChange={(e) => update({ use_purpose_other: e.target.value })}
                  size="large"
                  maxLength={200}
                />
              </div>
            )}
            {data.use_purposes.length > 0 && (
              <p style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                {data.use_purposes.length} opción{data.use_purposes.length > 1 ? 'es' : ''} seleccionada{data.use_purposes.length > 1 ? 's' : ''}
              </p>
            )}
          </>
        );

      // PASO 6 — ¿Cuándo quieres empezar?
      case 5:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 6 de ${TOTAL_STEPS}`}
              title="¿Cuándo quieres empezar?"
              subtitle="Adaptamos el ritmo según tu intención."
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {TIMINGS.map((t) => (
                <CardOption
                  key={t.key}
                  active={data.start_timing === t.key}
                  onClick={() => update({ start_timing: t.key })}
                  icon={t.icon}
                  label={t.label}
                  description={t.description}
                />
              ))}
            </div>
          </>
        );

      // PASO 7 — Datos del negocio
      case 6:
        return (
          <>
            <StepTitle
              eyebrow={`Paso 7 de ${TOTAL_STEPS}`}
              title="Datos del negocio"
              subtitle="Para tus documentos y para poder contactarte si lo necesitas."
            />
            <div style={{ display: 'grid', gap: 14 }}>
              <LabeledInput
                label="Nombre del negocio *"
                value={data.name}
                onChange={(v) => update({ name: v })}
                placeholder="Mi Negocio S.A.S."
                prefix={<ShopOutlined />}
              />

              {/* País */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  País *
                </label>
                <Select
                  size="large"
                  showSearch
                  placeholder="Selecciona tu país..."
                  value={data.country}
                  onChange={(v) => {
                    const countryInfo = COUNTRY_CURRENCY_MAP[v];
                    const autoPhone = countryInfo?.phoneCode || '';
                    update({
                      country: v,
                      // Auto-completar el teléfono solo si está vacío o solo tiene un código de país
                      phone: (!data.phone || /^\+\d{1,4}\s*$/.test(data.phone.trim()))
                        ? autoPhone
                        : data.phone,
                    });
                  }}
                  style={{ width: '100%' }}
                  options={countryOptions}
                  filterOption={(input, option) =>
                    String(option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  dropdownStyle={{ zIndex: 10100 }}
                  listHeight={280}
                  getPopupContainer={(trigger) => trigger.parentElement}
                />
              </div>

              {/* Sector / Industria — SELECT con todos los sectores */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Sector / industria *
                </label>
                <Select
                  size="large"
                  showSearch
                  placeholder="Busca o selecciona tu sector..."
                  value={data.industry}
                  onChange={(v) => update({ industry: v })}
                  style={{ width: '100%' }}
                  options={INDUSTRY_OPTIONS}
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  dropdownStyle={{ zIndex: 10100 }}
                  listHeight={320}
                  getPopupContainer={(trigger) => trigger.parentElement}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <LabeledInput
                  label="Teléfono"
                  value={data.phone}
                  onChange={(v) => update({ phone: v })}
                  placeholder="+57 300 000 0000"
                />
                <LabeledInput
                  label="Correo de contacto"
                  value={data.contact_email}
                  onChange={(v) => update({ contact_email: v })}
                  placeholder="contacto@tunegocio.com"
                  type="email"
                />
              </div>

              <LabeledInput
                label="Dirección"
                value={data.address}
                onChange={(v) => update({ address: v })}
                placeholder="Calle, número, barrio..."
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <LabeledInput
                  label="Ciudad"
                  value={data.city}
                  onChange={(v) => update({ city: v })}
                  placeholder="Bogotá, Medellín..."
                />
                <LabeledInput
                  label="Sitio web"
                  value={data.website}
                  onChange={(v) => update({ website: v })}
                  placeholder="www.tunegocio.com"
                />
              </div>
            </div>
          </>
        );

      default: return null;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(3, 13, 31, 0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      overflow: 'auto',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        width: '100%',
        maxWidth: 700,
        maxHeight: 'calc(100vh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Hola, {user?.name?.split(' ')[0] || 'bienvenido'} 👋
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Paso {step + 1} de {TOTAL_STEPS}
            </span>
          </div>
          <Progress
            percent={Math.round(((step + 1) / TOTAL_STEPS) * 100)}
            showInfo={false}
            strokeColor={PRIMARY}
            trailColor="#e5e7eb"
            size={[null, 6]}
          />
        </div>

        {/* Body */}
        <div style={{ padding: '28px 28px 16px', overflowY: 'auto', flex: 1 }}>
          {renderStep()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: step === 0 ? '#cbd5e1' : '#475569',
              fontWeight: 600,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 14,
            }}
          >
            <ArrowLeftOutlined /> Atrás
          </button>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Saltar (solo si no es el último paso) */}
            {step < TOTAL_STEPS - 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                style={{
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Saltar
              </button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => canNext && setStep((s) => s + 1)}
                disabled={!canNext}
                style={{
                  padding: '11px 24px',
                  background: canNext ? PRIMARY : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: canNext ? '0 4px 12px rgba(29,78,216,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                Siguiente <ArrowRightOutlined />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canNext || submitting}
                style={{
                  padding: '11px 28px',
                  background: canNext && !submitting ? PRIMARY : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: canNext && !submitting ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: canNext && !submitting ? '0 4px 12px rgba(29,78,216,0.25)' : 'none',
                }}
              >
                {submitting ? 'Guardando...' : 'Completar'} <CheckCircleOutlined />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
