import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Check, X, Zap, Shield, Users, Star, CreditCard } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { AuthContext } from '../../AuthContext';
import { loginWithGoogleToken } from '../../services/auth/authService';
import Header from './header';

// Orden: Empresarial (izq) → Profesional (centro) → Básico (der)
const PLANS = [
  {
    id: 'empresarial',
    planDbId: { monthly: 13, annual: 14 },
    name: 'Empresarial',
    subtitle: 'Sin límites para instituciones y empresas',
    monthlyPrice: 125000,
    annualPrice: 1400000,
    annualMonthly: 116667,
    savingsAnnual: 100000,
    maxUsers: 'Usuarios ilimitados',
    badge: null,
    features: [
      { text: 'Punto de Venta (POS)', included: true },
      { text: 'Control de Inventario', included: true },
      { text: 'Movimientos Financieros', included: true },
      { text: 'Gestión de Personas', included: true },
      { text: 'Generación de Documentos', included: true },
      { text: 'Módulo Académico completo', included: true },
      { text: 'Administración avanzada', included: true },
      { text: 'Usuarios ilimitados', included: true },
      { text: 'Soporte dedicado', included: true },
      { text: 'Onboarding personalizado', included: true },
    ],
  },
  {
    id: 'profesional',
    planDbId: { monthly: 11, annual: 12 },
    name: 'Profesional',
    subtitle: 'Para equipos en crecimiento',
    monthlyPrice: 79900,
    annualPrice: 890000,
    annualMonthly: 74167,
    savingsAnnual: 68800,
    maxUsers: '5 usuarios',
    badge: 'Más popular',
    features: [
      { text: 'Punto de Venta (POS)', included: true },
      { text: 'Control de Inventario', included: true },
      { text: 'Movimientos Financieros', included: true },
      { text: 'Gestión de Personas', included: true },
      { text: 'Generación de Documentos', included: true },
      { text: 'Módulo Académico', included: false },
      { text: 'Administración avanzada', included: false },
      { text: '5 usuarios incluidos', included: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Reportes avanzados', included: true },
    ],
  },
  {
    id: 'basico',
    planDbId: { monthly: 9, annual: 10 },
    name: 'Básico',
    subtitle: 'Ideal para emprendedores',
    monthlyPrice: 39900,
    annualPrice: 456000,
    annualMonthly: 38000,
    savingsAnnual: 22800,
    maxUsers: '2 usuarios',
    badge: null,
    features: [
      { text: 'Punto de Venta (POS)', included: true },
      { text: 'Control de Inventario', included: true },
      { text: 'Movimientos Financieros', included: true },
      { text: 'Gestión de Personas', included: false },
      { text: 'Generación de Documentos', included: false },
      { text: 'Módulo Académico', included: false },
      { text: 'Administración avanzada', included: false },
      { text: '2 usuarios incluidos', included: true },
      { text: 'Soporte por WhatsApp', included: true },
      { text: 'Reportes básicos', included: true },
    ],
  },
];

const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const PreciosPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login: contextLogin, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const fmt = (n) => n.toLocaleString('es-CO');

  const handleGoogleSuccess = async (tokenResponse) => {
    setIsGoogleLoading(true);
    try {
      const response = await loginWithGoogleToken(tokenResponse.access_token);
      if (response.token) {
        contextLogin(response.token, response.user);
        message.success('¡Bienvenido a Rapictrl! Tu prueba gratuita de 14 días ha comenzado.', 3);
        navigate('/inicio');
      }
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al registrarse con Google.';
      message.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const openGoogleRegister = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => message.error('No se pudo completar el registro con Google.'),
    flow: 'implicit',
  });

  const handleSubscribe = (plan) => {
    if (!isAuthenticated) {
      openGoogleRegister();
      return;
    }
    navigate('/pago', { state: { plan, isAnnual } });
  };

  return (
    <HelmetProvider>
      <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
        <Helmet>
          <title>Planes y Precios | Rapictrl</title>
          <meta name="description" content="Elige el plan perfecto para tu negocio. Desde $39.900/mes con prueba gratuita de 14 días." />
        </Helmet>

        <Header />

        <main className="flex-1 pt-24 pb-16">
          {/* Hero */}
          <section className="py-16 text-center" style={{ background: 'linear-gradient(150deg, #030d1f 0%, #0a1f3d 50%, #030d1f 100%)' }}>
            <motion.div initial="hidden" animate="visible" variants={fadeIn} className="px-4">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Zap size={14} /> Prueba gratis 14 días — sin tarjeta de crédito
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                Planes simples y transparentes
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
                Empieza gratis. Cancela cuando quieras. Sin contratos ni costos ocultos.
              </p>

              {/* Toggle mensual / anual */}
              <div className="inline-flex items-center gap-0 bg-white/10 rounded-full p-1">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${!isAnnual ? 'bg-white text-gray-900 shadow' : 'text-slate-300 hover:text-white'}`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${isAnnual ? 'bg-white text-gray-900 shadow' : 'text-slate-300 hover:text-white'}`}
                >
                  Anual
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">Ahorra</span>
                </button>
              </div>
            </motion.div>
          </section>

          {/* Cards */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {PLANS.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial="hidden"
                  animate="visible"
                  variants={{ ...fadeIn, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: idx * 0.1 } } }}
                  className={`relative bg-white rounded-2xl shadow-lg flex flex-col ${plan.badge ? 'ring-2 ring-blue-600 scale-[1.03]' : ''}`}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
                    >
                      <Star size={13} fill="white" /> {plan.badge}
                    </div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-5">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Plan {plan.name}</h2>
                      <p className="text-sm text-gray-500">{plan.subtitle}</p>
                    </div>

                    {/* Precio */}
                    <div className="mb-2">
                      {isAnnual ? (
                        <>
                          <div className="flex items-end gap-1">
                            <span className="text-4xl font-extrabold text-gray-900">${fmt(plan.annualPrice)}</span>
                            <span className="text-gray-500 mb-1 text-sm">/año</span>
                          </div>
                          <p className="text-sm text-gray-400">≈ ${fmt(plan.annualMonthly)}/mes</p>
                          <div className="mt-1.5 inline-flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 px-2 py-1 rounded-full">
                            <Check size={11} /> Ahorra ${fmt(plan.savingsAnnual)} al año
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-end gap-1">
                            <span className="text-4xl font-extrabold text-gray-900">${fmt(plan.monthlyPrice)}</span>
                            <span className="text-gray-500 mb-1 text-sm">/mes</span>
                          </div>
                          <p className="text-sm text-gray-400">Facturación mensual</p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 mb-6">
                      <div className="p-1.5 rounded-md bg-blue-50">
                        <Users size={13} style={{ color: '#1d4ed8' }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{plan.maxUsers}</span>
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f.text} className="flex items-start gap-2.5">
                          {f.included
                            ? <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                            : <X size={15} className="mt-0.5 flex-shrink-0 text-gray-300" />
                          }
                          <span className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>{f.text}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="space-y-2">
                      {isAuthenticated ? (
                        <button
                          onClick={() => handleSubscribe(plan)}
                          className="flex items-center justify-center gap-2 w-full text-white font-bold py-3 px-6 rounded-xl text-sm transition-opacity hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
                        >
                          <CreditCard size={16} />
                          Suscribirme a este plan
                        </button>
                      ) : (
                        <button
                          onClick={() => openGoogleRegister()}
                          disabled={isGoogleLoading}
                          className="flex items-center justify-center gap-2 w-full text-white font-bold py-3 px-6 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
                        >
                          <GoogleIcon size={16} />
                          {isGoogleLoading ? 'Cargando...' : 'Empezar Gratis con Google'}
                        </button>
                      )}
                      <p className="text-xs text-center text-gray-400">
                        {isAuthenticated ? 'Pago manual · Activación en 24h' : '14 días gratis · Sin tarjeta de crédito'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="mt-10 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
                <Shield size={16} className="text-green-500" />
                <span>Todos los planes incluyen <strong>14 días de prueba gratuita</strong> con acceso a los módulos de administración. Sin tarjeta de crédito.</span>
              </div>
            </motion.div>
          </section>

          {/* Tabla comparativa */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Compara los planes</h2>
              <p className="text-gray-500">Ve exactamente qué incluye cada plan</p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[540px]">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #030d1f 0%, #0a1f3d 100%)' }}>
                      <th className="text-left py-4 px-6 text-white font-semibold w-1/2">Funcionalidad</th>
                      {/* Mismo orden: Empresarial, Profesional, Básico */}
                      <th className="py-4 px-4 text-white font-semibold text-center">Empresarial</th>
                      <th className="py-4 px-4 text-white font-semibold text-center">
                        <span>Profesional</span>
                        <span className="ml-1 text-xs bg-blue-500 px-1.5 py-0.5 rounded-full">★</span>
                      </th>
                      <th className="py-4 px-4 text-white font-semibold text-center">Básico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Punto de Venta (POS)',        values: [true,  true,  true]  },
                      { label: 'Control de Inventario',       values: [true,  true,  true]  },
                      { label: 'Movimientos Financieros',     values: [true,  true,  true]  },
                      { label: 'Reportes y Analíticas',       values: [true,  true,  true]  },
                      { label: 'Gestión de Personas',         values: [true,  true,  false] },
                      { label: 'Generación de Documentos',    values: [true,  true,  false] },
                      { label: 'Módulo Académico',            values: [true,  false, false] },
                      { label: 'Administración avanzada',     values: [true,  false, false] },
                      { label: 'Onboarding personalizado',    values: [true,  false, false] },
                      { label: 'Usuarios incluidos',          values: ['Ilimitados', '5', '2'] },
                      { label: 'Soporte',                     values: ['Dedicado', 'Prioritario', 'WhatsApp'] },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-3.5 px-6 text-sm text-gray-700 font-medium">{row.label}</td>
                        {row.values.map((v, j) => (
                          <td key={j} className="py-3.5 px-4 text-center">
                            {typeof v === 'boolean'
                              ? v
                                ? <Check size={18} className="inline" style={{ color: '#16a34a' }} />
                                : <X size={18} className="inline text-gray-300" />
                              : <span className="text-sm font-semibold text-gray-700">{v}</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto px-4 mt-20">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Preguntas frecuentes</h2>
            </motion.div>
            <div className="space-y-4">
              {[
                { q: '¿Cómo funciona la prueba gratuita?', a: 'Al registrarte obtienes 14 días de acceso a todas las funcionalidades de administración (POS, Inventario, Personas, Movimientos, Generación de documentos), sin necesidad de tarjeta de crédito. El módulo Académico está disponible desde el Plan Empresarial. Al finalizar, elige el plan que más se adapte a tu negocio.' },
                { q: '¿Cómo realizo el pago?', a: 'Aceptamos transferencia bancaria, PSE y pagos en efectivo. Al seleccionar un plan te mostramos los datos bancarios y un código de referencia. Una vez verificado el pago, tu suscripción se activa en menos de 24 horas.' },
                { q: '¿Puedo cambiar de plan después?', a: 'Sí, puedes subir o bajar de plan en cualquier momento contactándonos por WhatsApp. El ajuste aplica desde el siguiente ciclo.' },
                { q: '¿Qué pasa cuando vence el trial?', a: 'Al terminar los 14 días, tu acceso quedará en espera. Elige un plan desde esta página y realiza el pago para reactivarlo de inmediato.' },
              ].map((item) => (
                <div key={item.q} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Final */}
          <section className="max-w-3xl mx-auto px-4 mt-20 text-center">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
              className="rounded-2xl p-10 text-white"
              style={{ background: 'linear-gradient(135deg, #030d1f 0%, #0a1f3d 100%)' }}
            >
              <h2 className="text-3xl font-bold mb-3">¿Listo para empezar?</h2>
              <p className="text-slate-300 mb-8">Prueba Rapictrl gratis 14 días. Sin tarjeta de crédito.</p>
              <button
                onClick={() => openGoogleRegister()}
                disabled={isGoogleLoading}
                className="inline-flex items-center gap-3 bg-white text-gray-800 font-bold py-3 px-8 rounded-xl text-lg shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <GoogleIcon size={22} />
                {isGoogleLoading ? 'Cargando...' : 'Empezar Gratis con Google'}
              </button>
            </motion.div>
          </section>
        </main>

        <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-200">
          <p>© {new Date().getFullYear()} Rapictrl. Todos los derechos reservados.</p>
          <Link to="/" className="text-blue-600 hover:underline mt-1 inline-block">Volver al inicio</Link>
        </footer>
      </div>
    </HelmetProvider>
  );
};

export default PreciosPage;
