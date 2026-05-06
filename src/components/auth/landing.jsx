import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import {
  BarChart3, Boxes, Briefcase, Building,
  Check, DollarSign, ShoppingCart, Users,
  TrendingUp, AlertTriangle, Clock, Eye,
  ArrowRight, ChevronRight, Shield, Zap,
  Package, FileText, CreditCard, Bell
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { AuthContext } from '../../AuthContext';
import { loginWithGoogleToken } from '../../services/auth/authService';
import Header from './header';

/* ─── UI Mockups ──────────────────────────────────────────────── */

const DashboardMockup = () => (
  <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 text-left" style={{ background: '#0f172a' }}>
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10" style={{ background: '#1e293b' }}>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <div className="w-3 h-3 rounded-full bg-green-400/70" />
      </div>
      <div className="flex-1 mx-3 bg-white/10 rounded px-3 py-1 text-[11px] text-slate-400">app.rapictrl.com/inicio</div>
    </div>
    <div className="flex" style={{ minHeight: 260 }}>
      <div className="w-11 py-4 flex flex-col items-center gap-3 border-r border-white/5" style={{ background: '#030d1f' }}>
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-sm opacity-90" />
        </div>
        {[BarChart3, Boxes, DollarSign, Users, FileText].map((Icon, i) => (
          <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-blue-600/20' : ''}`}>
            <Icon className="w-3.5 h-3.5 text-slate-500" />
          </div>
        ))}
      </div>
      <div className="flex-1 p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white text-xs font-semibold">Dashboard · Mayo 2025</div>
          <div className="text-[10px] text-blue-400 bg-blue-400/10 rounded px-2 py-0.5">En vivo ●</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Ingresos Hoy', value: '$2.847.000', sub: '+12% vs ayer', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { label: 'Gastos del Mes', value: '$1.240.000', sub: 'Actualizado ahora', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { label: 'Utilidad Neta', value: '$1.607.000', sub: 'Margen 56%', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'Stock crítico', value: '3 productos', sub: 'Requieren atención', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-2.5 border ${s.bg} ${s.border}`}>
              <div className="text-[9px] text-slate-400 mb-1">{s.label}</div>
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 border border-white/5" style={{ background: '#1e293b' }}>
          <div className="text-[10px] text-slate-400 mb-2">Ingresos vs Gastos — últimos 7 días</div>
          <div className="flex items-end gap-1.5 h-14">
            {[55, 75, 48, 88, 65, 80, 92].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col-reverse gap-0.5">
                <div className="w-full rounded-sm" style={{ height: `${h * 0.56}px`, background: 'rgba(29,78,216,0.7)' }} />
                <div className="w-full rounded-sm" style={{ height: `${h * 0.28}px`, background: 'rgba(248,113,113,0.5)' }} />
              </div>
            ))}
          </div>
          <div className="flex mt-1.5 gap-1.5">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="flex-1 text-center text-[9px] text-slate-600">{d}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const InventoryMockup = () => (
  <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 text-left" style={{ background: '#0f172a' }}>
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10" style={{ background: '#1e293b' }}>
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="flex-1 mx-3 bg-white/10 rounded px-3 py-0.5 text-[10px] text-slate-400">app.rapictrl.com/inventario</div>
    </div>
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white text-xs font-semibold">Control de Inventario</div>
        <div className="text-[10px] bg-blue-600 text-white rounded px-2 py-0.5">+ Nuevo producto</div>
      </div>
      <div className="space-y-1.5">
        {[
          { name: 'Laptop Dell 15"', stock: 12, status: 'ok', price: '$2.800.000' },
          { name: 'Mouse Inalámbrico', stock: 3, status: 'low', price: '$45.000' },
          { name: 'Teclado Mecánico', stock: 8, status: 'ok', price: '$180.000' },
          { name: 'Monitor 24"', stock: 0, status: 'out', price: '$650.000' },
          { name: 'Audífonos BT', stock: 5, status: 'ok', price: '$120.000' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/5" style={{ background: '#1e293b' }}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'ok' ? 'bg-green-400' : item.status === 'low' ? 'bg-yellow-400' : 'bg-red-500'}`} />
            <div className="text-[11px] text-slate-200 flex-1 truncate">{item.name}</div>
            <div className="text-[10px] text-slate-400">Cant: <span className={`font-semibold ${item.status === 'out' ? 'text-red-400' : 'text-white'}`}>{item.stock}</span></div>
            <div className="text-[10px] text-blue-400 font-semibold">{item.price}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[10px]">
        <div className="flex items-center gap-1 text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-400" />OK</div>
        <div className="flex items-center gap-1 text-yellow-400"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Stock bajo</div>
        <div className="flex items-center gap-1 text-red-400"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />Agotado</div>
      </div>
    </div>
  </div>
);

const FinancialMockup = () => (
  <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 text-left" style={{ background: '#0f172a' }}>
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10" style={{ background: '#1e293b' }}>
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="flex-1 mx-3 bg-white/10 rounded px-3 py-0.5 text-[10px] text-slate-400">app.rapictrl.com/finanzas</div>
    </div>
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white text-xs font-semibold">Resumen Financiero</div>
        <div className="text-[10px] text-slate-400 border border-white/10 rounded px-2 py-0.5">Abril 2025</div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Total Ingresos', value: '$18.4M', color: 'text-green-400' },
          { label: 'Total Egresos', value: '$9.2M', color: 'text-red-400' },
          { label: 'Utilidad', value: '$9.2M', color: 'text-blue-400' },
        ].map((s, i) => (
          <div key={i} className="rounded-lg p-2 border border-white/5 text-center" style={{ background: '#1e293b' }}>
            <div className="text-[9px] text-slate-400">{s.label}</div>
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/5 overflow-hidden" style={{ background: '#1e293b' }}>
        <div className="grid grid-cols-3 px-3 py-1.5 border-b border-white/5 text-[9px] text-slate-500 font-semibold">
          <span>Concepto</span><span className="text-center">Tipo</span><span className="text-right">Valor</span>
        </div>
        {[
          { desc: 'Venta Producto A', tipo: 'Ingreso', val: '+$340.000', color: 'text-green-400' },
          { desc: 'Arriendo Local', tipo: 'Egreso', val: '-$800.000', color: 'text-red-400' },
          { desc: 'Servicios Web', tipo: 'Ingreso', val: '+$215.000', color: 'text-green-400' },
          { desc: 'Nómina Mayo', tipo: 'Egreso', val: '-$3.200.000', color: 'text-red-400' },
        ].map((t, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[10px] text-slate-300 truncate">{t.desc}</span>
            <span className="text-[10px] text-slate-500 text-center">{t.tipo}</span>
            <span className={`text-[10px] font-semibold text-right ${t.color}`}>{t.val}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Animation variants ────────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const fadeLeft = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } };
const fadeRight = { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } };

/* ─── Google SVG ─────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ─── Landing Page ───────────────────────────────────────────────── */
const RapictrlLanding = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login: contextLogin } = useContext(AuthContext);
  const navigate = useNavigate();

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

  return (
    <HelmetProvider>
      <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
        <Helmet>
          <title>Rapictrl | Conoce el Estado Exacto de tu Negocio en Tiempo Real</title>
          <meta name="description" content="Rapictrl te da visibilidad total sobre tus finanzas, inventario y rentabilidad. Sabe exactamente en qué punto está tu negocio, en todo momento. Prueba 14 días gratis." />
          <meta name="keywords" content="software administrativo, gestión financiera, control de inventario, software para pymes, Rapictrl, administración de negocios" />
        </Helmet>

        <Header />

        <main>

          {/* ── HERO ─────────────────────────────────────────────── */}
          <section id="hero" className="relative min-h-screen flex items-center pt-16 pb-12 overflow-hidden"
            style={{ background: 'linear-gradient(150deg, #030d1f 0%, #0a1f3d 55%, #030d1f 100%)' }}>

            {/* Background grid */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* Blue glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, #1d4ed8 0%, transparent 70%)' }} />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="grid lg:grid-cols-2 gap-12 items-center">

                {/* Left — copy */}
                <motion.div initial="hidden" animate="visible" variants={fadeLeft} className="text-white text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                    ✨ 14 días de prueba gratuita — sin tarjeta de crédito
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5">
                    Sabe exactamente en qué punto está tu negocio,{' '}
                    <span style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      en todo momento
                    </span>
                  </h1>
                  <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                    Finanzas, inventario y reportes en un solo lugar. Toma decisiones con datos reales, no con suposiciones.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                    <motion.a
                      whileHover={{ scale: 1.04 }}
                      href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20Rapictrl%20y%20me%20gustaría%20solicitar%20una%20demo."
                      target="_blank"
                      className="inline-flex items-center justify-center bg-white font-bold py-3.5 px-8 rounded-xl text-base shadow-xl gap-2"
                      style={{ color: '#0a1f3d' }}
                    >
                      Solicitar Demo Gratuita <ArrowRight className="w-4 h-4" />
                    </motion.a>
                    <motion.a
                      whileHover={{ scale: 1.04 }}
                      href="/precios"
                      className="inline-flex items-center justify-center bg-white/10 border border-white/20 text-white font-semibold py-3.5 px-8 rounded-xl text-base backdrop-blur-sm"
                    >
                      Ver Planes y Precios
                    </motion.a>
                  </div>

                  <div className="flex flex-col items-center lg:items-start gap-2">
                    <p className="text-slate-400 text-sm">o empieza gratis ahora mismo</p>
                    <button
                      onClick={() => openGoogleRegister()}
                      disabled={isGoogleLoading}
                      className="flex items-center gap-3 bg-white text-gray-800 font-semibold py-3 px-6 rounded-xl shadow-lg text-base transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <GoogleIcon />
                      {isGoogleLoading ? 'Cargando...' : 'Empieza gratis con Google'}
                    </button>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-slate-400">
                    {['Sin tarjeta de crédito', 'Sin contratos', 'Cancela cuando quieras'].map(t => (
                      <div key={t} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-400" /> {t}
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Right — dashboard mockup */}
                <motion.div initial="hidden" animate="visible" variants={fadeRight} className="hidden lg:block">
                  <DashboardMockup />
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── PAIN POINTS ──────────────────────────────────────── */}
          <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
                <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">¿Te suena familiar?</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Gestionar un negocio sin las herramientas correctas es agotador
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  La mayoría de dueños de negocio toman decisiones importantes sin datos claros. Eso tiene un costo enorme.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: <AlertTriangle className="w-7 h-7 text-orange-500" />,
                    bg: 'bg-orange-50 border-orange-100',
                    title: '¿Cuánto gané hoy?',
                    desc: 'Terminas el día y no sabes exactamente si fuiste rentable. Revisas cuadernos, Excel o mensajes de WhatsApp buscando los números.',
                  },
                  {
                    icon: <Boxes className="w-7 h-7 text-red-500" />,
                    bg: 'bg-red-50 border-red-100',
                    title: 'El inventario es un misterio',
                    desc: 'Pierdes ventas por no saber qué tienes. O descubres que tienes mercancía que lleva meses sin moverse y ya no vale lo mismo.',
                  },
                  {
                    icon: <Clock className="w-7 h-7 text-purple-500" />,
                    bg: 'bg-purple-50 border-purple-100',
                    title: 'Horas perdidas en reportes',
                    desc: 'Cuando necesitas un resumen financiero para tomar una decisión, tardes horas compilando información que debería estar a un clic.',
                  },
                ].map((p, i) => (
                  <motion.div
                    key={i}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: i * 0.12 } } }}
                    className={`p-7 rounded-2xl border ${p.bg}`}
                  >
                    <div className="mb-4">{p.icon}</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{p.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{p.desc}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="mt-10 text-center p-6 rounded-2xl border border-blue-100 bg-blue-50">
                <p className="text-blue-800 font-semibold text-lg">
                  Con Rapictrl, tienes la respuesta a todas esas preguntas en tiempo real, desde cualquier dispositivo.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ── KEY BENEFIT CALLOUT ───────────────────────────────── */}
          <section className="py-24 text-white overflow-hidden"
            style={{ background: 'linear-gradient(150deg, #030d1f 0%, #0c2044 50%, #030d1f 100%)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-14 items-center">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeLeft}>
                  <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 px-3 py-1 rounded-full text-sm mb-6">
                    <Eye className="w-4 h-4" /> Visibilidad total
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-snug">
                    Conoce el estado exacto de tu negocio,{' '}
                    <span className="text-blue-400">en todo momento</span>
                  </h2>
                  <p className="text-slate-300 text-lg mb-8">
                    Tu dashboard en tiempo real te muestra los números que importan: ingresos del día, rentabilidad del mes, productos por agotarse y cuentas pendientes. Todo en una sola pantalla.
                  </p>
                  <div className="space-y-4">
                    {[
                      { icon: <TrendingUp className="w-5 h-5 text-green-400" />, title: 'Ingresos y gastos actualizados al instante', desc: 'Cada venta, cada egreso — reflejado de inmediato sin que tengas que hacer nada.' },
                      { icon: <Bell className="w-5 h-5 text-yellow-400" />, title: 'Alertas antes de que sea un problema', desc: 'Stock bajo, pagos próximos a vencer, variaciones inusuales. Te avisamos antes de que impacten tu negocio.' },
                      { icon: <BarChart3 className="w-5 h-5 text-blue-400" />, title: 'Reportes listos en un clic', desc: 'Sin exportar ni consolidar. Genera tu cierre del mes, resumen de ventas o informe de inventario en segundos.' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="mt-0.5">{item.icon}</div>
                        <div>
                          <div className="font-semibold text-white mb-1">{item.title}</div>
                          <div className="text-slate-400 text-sm">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeRight}>
                  <DashboardMockup />
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── BENEFITS ─────────────────────────────────────────── */}
          <section id="benefits" className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
                <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Beneficios clave</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  La gestión de tu negocio, simplificada
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Concéntrate en crecer. Nosotros nos encargamos de la complejidad operativa.
                </p>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    icon: <DollarSign className="h-10 w-10" style={{ color: '#1d4ed8' }} />,
                    title: 'Finanzas claras, sin estrés',
                    desc: 'Visualiza ingresos, gastos y rentabilidad en tiempo real. Genera reportes financieros con un solo clic y cierra el mes en minutos, no días.',
                    points: ['Flujo de caja en vivo', 'Cuentas por cobrar y pagar', 'Conciliación automática'],
                  },
                  {
                    icon: <Boxes className="h-10 w-10" style={{ color: '#1d4ed8' }} />,
                    title: 'Inventario siempre sincronizado',
                    desc: 'Evita pérdidas y sobre-stock. Sabe qué tienes, qué necesitas y qué se vende más, sin depender de conteos manuales o planillas.',
                    points: ['Alertas de stock crítico', 'Movimiento por producto', 'Control de proveedores'],
                  },
                  {
                    icon: <BarChart3 className="h-10 w-10" style={{ color: '#1d4ed8' }} />,
                    title: 'Decisiones basadas en datos',
                    desc: 'Deja de adivinar. Accede a la data que necesitas para planificar estrategias, negociar con proveedores y optimizar tus recursos.',
                    points: ['Tendencias y comparativos', 'Productos más rentables', 'Análisis de temporada'],
                  },
                ].map((b, i) => (
                  <motion.div
                    key={i}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: i * 0.1 } } }}
                    className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(29,78,216,0.08)' }}>
                      {b.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{b.title}</h3>
                    <p className="text-gray-500 text-sm mb-5 leading-relaxed">{b.desc}</p>
                    <ul className="space-y-2">
                      {b.points.map(pt => (
                        <li key={pt} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" /> {pt}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FEATURES WITH MOCKUPS ────────────────────────────── */}
          <section id="features" className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
                <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">La plataforma</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Todo lo que necesitas en un solo lugar
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Rapictrl integra las herramientas esenciales para administrar tu negocio de forma eficiente, segura y desde cualquier lugar.
                </p>
              </motion.div>

              {/* Feature 1 — Inventory */}
              <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeLeft}>
                  <div className="inline-flex items-center gap-2 text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-sm font-semibold mb-5">
                    <Package className="w-4 h-4" /> Módulo de Inventario
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    Nunca más pierdas una venta por falta de stock
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Controla cada producto en tiempo real. Recibe alertas antes de agotarte, registra entradas y salidas automáticamente, y sabe exactamente cuánto vale tu inventario en este momento.
                  </p>
                  <ul className="space-y-3">
                    {['Gestión de productos y categorías', 'Alertas automáticas de stock mínimo', 'Control de proveedores y órdenes de compra', 'Valoración del inventario en tiempo real'].map(f => (
                      <li key={f} className="flex items-start gap-3 text-gray-700">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeRight}>
                  <InventoryMockup />
                </motion.div>
              </div>

              {/* Feature 2 — Financial */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeRight} className="order-2 md:order-1">
                  <FinancialMockup />
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeLeft} className="order-1 md:order-2">
                  <div className="inline-flex items-center gap-2 text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-sm font-semibold mb-5">
                    <DollarSign className="w-4 h-4" /> Módulo Financiero
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    Cierra el mes en minutos, no en días
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Registra ingresos y egresos, gestiona cuentas por cobrar y pagar, y genera reportes financieros completos con un solo clic. Sin Excel, sin cuadernos, sin dolores de cabeza.
                  </p>
                  <ul className="space-y-3">
                    {['Flujo de caja actualizado en tiempo real', 'Gestión de cuentas por cobrar / pagar', 'Reportes automáticos de rentabilidad', 'Historial completo de movimientos'].map(f => (
                      <li key={f} className="flex items-start gap-3 text-gray-700">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ─────────────────────────────────────── */}
          <section className="py-20 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
                <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Empezar es fácil</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tres pasos para tomar el control</h2>
                <p className="text-gray-500 text-lg">Sin instalaciones, sin configuraciones complicadas.</p>
              </motion.div>
              <div className="grid md:grid-cols-3 gap-8 relative">
                <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-blue-100" />
                {[
                  { step: '01', icon: <Zap className="w-8 h-8 text-blue-600" />, title: 'Crea tu cuenta', desc: 'Regístrate en menos de 2 minutos con tu correo o Google. Sin tarjeta de crédito requerida.' },
                  { step: '02', icon: <Package className="w-8 h-8 text-blue-600" />, title: 'Configura tu negocio', desc: 'Agrega tus productos, servicios y categorías. Nuestro asistente de onboarding te guía paso a paso.' },
                  { step: '03', icon: <Eye className="w-8 h-8 text-blue-600" />, title: 'Toma el control', desc: 'Empieza a registrar tus operaciones y observa cómo tu dashboard cobra vida con datos reales.' },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: i * 0.15 } } }}
                    className="text-center relative"
                  >
                    <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-sm relative" style={{ background: 'rgba(29,78,216,0.08)', border: '2px solid rgba(29,78,216,0.15)' }}>
                      {s.icon}
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{s.step.slice(1)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FOR WHO ──────────────────────────────────────────── */}
          <section id="for-who" className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
                <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">¿Para quién es?</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Perfecto para cualquier negocio que quiera crecer</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Si manejas dinero, inventario o clientes, Rapictrl es para ti.
                </p>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: <Briefcase className="h-10 w-10" style={{ color: '#1d4ed8' }} />, title: 'PYMES', desc: 'Pequeñas y medianas empresas que necesitan control sin complejidad.' },
                  { icon: <Building className="h-10 w-10" style={{ color: '#1d4ed8' }} />, title: 'Instituc. Educativas', desc: 'Colegios, academias e institutos que gestionan pagos, inventario y reportes.' },
                  { icon: <ShoppingCart className="h-10 w-10" style={{ color: '#1d4ed8' }} />, title: 'Comercios y Tiendas', desc: 'Negocios con flujo de caja diario que necesitan visibilidad inmediata.' },
                  { icon: <Users className="h-10 w-10" style={{ color: '#1d4ed8' }} />, title: 'Emprendedores', desc: 'Startups y emprendedores que quieren crecer con bases sólidas desde el día uno.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: i * 0.1 } } }}
                    className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
                  >
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(29,78,216,0.08)' }}>
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PRICING ──────────────────────────────────────────── */}
          <section id="pricing" className="py-20 text-white"
            style={{ background: 'linear-gradient(135deg, #030d1f 0%, #0c2044 50%, #030d1f 100%)' }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">Precios</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes para cada etapa de tu negocio</h2>
                <p className="text-slate-300 text-lg mb-2">Desde <strong>$19.900/mes</strong>. Todos incluyen <strong>14 días de prueba gratuita</strong>.</p>
                <p className="text-slate-500 text-sm mb-12">Sin tarjeta de crédito · Sin contratos · Cancela cuando quieras</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto mb-12">
                  {[
                    { name: 'Básico', price: '$19.900', period: '/mes', users: '2 usuarios', features: ['Dashboard básico', 'Inventario', 'Reportes esenciales'] },
                    { name: 'Profesional', price: '$79.900', period: '/mes', users: '5 usuarios', popular: true, features: ['Todo lo de Básico', 'Módulo financiero completo', 'Soporte prioritario WhatsApp'] },
                    { name: 'Empresarial', price: '$125.000', period: '/mes', users: 'Usuarios ilimitados', features: ['Todo lo de Profesional', 'Multi-sede', 'Soporte dedicado'] },
                  ].map((p) => (
                    <div key={p.name} className={`p-6 rounded-2xl border text-left relative ${p.popular ? 'border-blue-400 bg-blue-900/40 scale-105 shadow-xl shadow-blue-900/30' : 'border-white/15 bg-white/8'}`}>
                      {p.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">⭐ Más popular</div>
                      )}
                      <div className="text-slate-400 text-sm font-semibold mb-1">{p.name}</div>
                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-3xl font-extrabold text-white">{p.price}</span>
                        <span className="text-slate-400 text-sm mb-1">{p.period}</span>
                      </div>
                      <div className="text-blue-300 text-sm mb-4">{p.users}</div>
                      <ul className="space-y-2">
                        {p.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                            <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <Link
                  to="/precios"
                  className="inline-flex items-center gap-2 text-white font-bold py-3.5 px-10 rounded-xl text-lg shadow-lg transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a6e 100%)', border: '2px solid rgba(255,255,255,0.15)' }}
                >
                  Ver todos los planes y precios <ChevronRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <section id="faq" className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
                <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">FAQ</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Preguntas frecuentes</h2>
              </motion.div>
              <div className="space-y-4">
                {[
                  { q: '¿Es difícil de usar Rapictrl?', a: 'No. Diseñamos Rapictrl con una interfaz intuitiva y fácil de navegar. Además, ofrecemos un asistente de onboarding que te guía desde el primer día, más tutoriales y soporte para que empieces sin complicaciones.' },
                  { q: '¿Necesito instalar algo en mi computador?', a: 'Absolutamente nada. Rapictrl es 100% en la nube. Solo necesitas un navegador web y conexión a internet para acceder desde cualquier lugar, en cualquier dispositivo.' },
                  { q: '¿Mis datos están seguros?', a: 'Sí. La seguridad es nuestra máxima prioridad. Utilizamos encriptación de nivel bancario y realizamos copias de seguridad constantes para proteger tu información empresarial.' },
                  { q: '¿Qué pasa cuando termina la prueba gratuita?', a: 'Al terminar los 14 días, simplemente elige el plan que mejor se adapte a tu negocio y continúa sin interrupciones. Si no lo necesitas, puedes cancelar sin ningún costo.' },
                  { q: '¿Qué tipo de soporte ofrecen?', a: 'El Plan Profesional y Empresarial incluyen soporte técnico prioritario a través de WhatsApp para resolver cualquier duda de manera rápida y personalizada.' },
                ].map((faq, i) => (
                  <motion.div
                    key={i}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.5, delay: i * 0.07 } } }}
                    className="bg-gray-50 border border-gray-100 p-6 rounded-2xl"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.q}</h3>
                    <p className="text-gray-500 leading-relaxed">{faq.a}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

        </main>

        {/* ── FOOTER CTA ───────────────────────────────────────── */}
        <footer className="text-white" style={{ background: 'linear-gradient(150deg, #030d1f 0%, #0c2044 50%, #030d1f 100%)' }}>
          <div className="max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 px-3 py-1 rounded-full text-sm mb-6">
                <Shield className="w-4 h-4" /> 14 días gratis, sin tarjeta de crédito
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                ¿Listo para saber exactamente en qué punto está tu negocio?
              </h2>
              <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
                Únete a los negocios que ya toman decisiones con datos reales. Comienza hoy mismo, gratis.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <motion.a
                  whileHover={{ scale: 1.04 }}
                  href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20Rapictrl%20y%20me%20gustaría%20solicitar%20una%20demo."
                  target="_blank"
                  className="inline-flex items-center gap-2 text-white font-bold py-3.5 px-10 rounded-xl text-lg shadow-xl transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a6e 100%)', border: '2px solid rgba(255,255,255,0.15)' }}
                >
                  Solicitar Demo Gratuita <ArrowRight className="w-5 h-5" />
                </motion.a>
                <button
                  onClick={() => openGoogleRegister()}
                  disabled={isGoogleLoading}
                  className="flex items-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-8 rounded-xl shadow-xl text-base transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <GoogleIcon />
                  {isGoogleLoading ? 'Cargando...' : 'Empieza gratis con Google'}
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm text-slate-500">
                {['Sin tarjeta de crédito', 'Sin contratos', 'Cancela cuando quieras', 'Soporte incluido'].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-400" /> {t}
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="border-t border-white/10 mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
              <p>© {new Date().getFullYear()} Rapictrl. Todos los derechos reservados.</p>
              <div className="flex gap-6">
                <Link to="/precios" className="hover:text-slate-400 transition-colors">Precios</Link>
                <a href="https://wa.me/570000000000" target="_blank" className="hover:text-slate-400 transition-colors">Contacto</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
};

export default RapictrlLanding;
