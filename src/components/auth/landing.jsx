import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import {
  BarChart3, Boxes, Briefcase, Building,
  Check, DollarSign, ShoppingCart, Users
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { AuthContext } from '../../AuthContext';
import { loginWithGoogleToken } from '../../services/auth/authService';

import Header from './header';

const QControlaLanding = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login: contextLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (tokenResponse) => {
    setIsGoogleLoading(true);
    try {
      const response = await loginWithGoogleToken(tokenResponse.access_token);
      if (response.token) {
        contextLogin(response.token, response.user);
        message.success('¡Bienvenido a QControla! Tu prueba gratuita de 14 días ha comenzado.', 3);
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
  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <HelmetProvider>
      <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
        <Helmet>
          <title>QControla | Software de Administración Financiera y de Inventario</title>
          <meta name="description" content="Toma el control total de tu negocio con QControla. Software en la nube para la gestión de finanzas, inventario y reportes. Plan de 6 meses por $250.000 COP." />
          <meta name="keywords" content="software administrativo, gestión financiera, control de inventario, software para pymes, QControla, administración de negocios" />
        </Helmet>

        <Header />

        <main>
          {/* Hero Section */}
          <section id="hero" className="relative h-screen flex items-center justify-center text-center text-white" style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(150deg, #030d1f 0%, #0a1f3d 50%, #030d1f 100%)' }} />
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="relative z-10 px-4"
            >
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
                Toma el Control Total de tu Negocio
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-slate-300">
                El software definitivo para la administración financiera y de inventario de tu institución o empresa.
              </p>
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                ✨ 14 días de prueba gratuita — sin tarjeta de crédito
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20QControla%20y%20me%20gustaría%20solicitar%20una%20demo."
                  target="_blank"
                  className="inline-flex items-center justify-center bg-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg"
                  style={{ color: '#0a1f3d' }}
                >
                  Solicitar una Demo
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  href="#pricing"
                  className="inline-flex items-center justify-center bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-lg text-lg"
                >
                  Ver Planes
                </motion.a>
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-slate-400 text-sm">o empieza gratis ahora mismo</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => openGoogleRegister()}
                    disabled={isGoogleLoading}
                    className="flex items-center gap-3 bg-white text-gray-800 font-semibold py-3 px-7 rounded-lg shadow-lg text-base transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {isGoogleLoading ? 'Cargando...' : 'Empieza gratis con Google'}
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Benefits Section */}
          <section id="benefits" className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">La Gestión de tu Negocio, Simplificada</h2>
                <p className="text-xl text-gray-600">Concéntrate en crecer, nosotros nos encargamos de la complejidad.</p>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8">
                  <DollarSign className="h-12 w-12 mb-6 mx-auto" style={{ color: '#1d4ed8' }} />
                  <h3 className="text-xl font-bold mb-2">Finanzas Claras y sin Estrés</h3>
                  <p className="text-gray-600">Visualiza ingresos, gastos y rentabilidad en tiempo real. Genera reportes con un solo clic.</p>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8">
                  <Boxes className="h-12 w-12 mb-6 mx-auto" style={{ color: '#1d4ed8' }} />
                  <h3 className="text-xl font-bold mb-2">Inventario Siempre Sincronizado</h3>
                  <p className="text-gray-600">Evita pérdidas y sobre-stock. Conoce qué tienes, qué necesitas y qué se vende más.</p>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8">
                  <BarChart3 className="h-12 w-12 mb-6 mx-auto" style={{ color: '#1d4ed8' }} />
                  <h3 className="text-xl font-bold mb-2">Decisiones Basadas en Datos</h3>
                  <p className="text-gray-600">Deja de adivinar. Accede a data crucial para planificar estrategias y optimizar recursos.</p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Todo lo que necesitas en un solo lugar</h2>
                  <p className="text-gray-600 mb-6">QControla integra las herramientas esenciales para que administres tu negocio de manera eficiente, segura y desde cualquier lugar.</p>
                  <ul className="space-y-4">
                    <li className="flex items-start"><Check className="h-6 w-6 mr-3 flex-shrink-0" style={{ color: '#1d4ed8' }} /><div><h4 className="font-semibold">Módulo Financiero</h4><p className="text-gray-600">Controla flujo de caja, cuentas por cobrar/pagar y conciliación bancaria.</p></div></li>
                    <li className="flex items-start"><Check className="h-6 w-6 mr-3 flex-shrink-0" style={{ color: '#1d4ed8' }} /><div><h4 className="font-semibold">Módulo de Inventario</h4><p className="text-gray-600">Gestiona productos, proveedores, órdenes de compra y alertas de stock.</p></div></li>
                    <li className="flex items-start"><Check className="h-6 w-6 mr-3 flex-shrink-0" style={{ color: '#1d4ed8' }} /><div><h4 className="font-semibold">Reportes Inteligentes</h4><p className="text-gray-600">Dashboards personalizables que te muestran la salud de tu negocio.</p></div></li>
                    <li className="flex items-start"><Check className="h-6 w-6 mr-3 flex-shrink-0" style={{ color: '#1d4ed8' }} /><div><h4 className="font-semibold">Acceso en la Nube</h4><p className="text-gray-600">Tu información segura y disponible 24/7 en cualquier dispositivo con internet.</p></div></li>
                  </ul>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="mt-8 md:mt-0">
                  <img src={''} alt="Dashboard de QControla" className="rounded-lg shadow-2xl" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-20 text-white" style={{ background: 'linear-gradient(135deg, #030d1f 0%, #0c2044 50%, #030d1f 100%)' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes para cada etapa de tu negocio</h2>
                <p className="text-xl text-slate-300 mb-4">Desde $39.900/mes. Todos los planes incluyen <strong>14 días de prueba gratuita</strong>.</p>
                <p className="text-slate-400 mb-10">Sin tarjeta de crédito · Sin contratos · Cancela cuando quieras</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
                  {[
                    { name: 'Básico', price: '$39.900/mes', users: '2 usuarios' },
                    { name: 'Profesional', price: '$79.900/mes', users: '5 usuarios', popular: true },
                    { name: 'Empresarial', price: '$125.000/mes', users: 'Ilimitados' },
                  ].map((p) => (
                    <div key={p.name} className={`p-4 rounded-xl border ${p.popular ? 'border-blue-400 bg-blue-900/40' : 'border-white/20 bg-white/10'}`}>
                      {p.popular && <div className="text-blue-300 text-xs font-bold mb-1">⭐ MÁS POPULAR</div>}
                      <div className="font-bold text-lg">{p.name}</div>
                      <div className="text-2xl font-extrabold my-1">{p.price}</div>
                      <div className="text-slate-300 text-sm">{p.users}</div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/precios"
                  className="inline-block text-white font-bold py-3 px-10 rounded-xl text-lg shadow-lg transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)', border: '2px solid rgba(255,255,255,0.2)' }}
                >
                  Ver Todos los Planes y Precios →
                </Link>
              </motion.div>
            </div>
          </section>

          {/* Target Audience Section */}
          <section id="for-who" className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Perfecto para Todo Tipo de Negocio</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <Briefcase className="h-10 w-10 mx-auto mb-4" style={{ color: '#1d4ed8' }} />
                  <h3 className="font-bold text-lg">PYMES</h3>
                </div>
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <Building className="h-10 w-10 mx-auto mb-4" style={{ color: '#1d4ed8' }} />
                  <h3 className="font-bold text-lg">Instituciones Educativas</h3>
                </div>
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-4" style={{ color: '#1d4ed8' }} />
                  <h3 className="font-bold text-lg">Comercios y Tiendas</h3>
                </div>
                <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <Users className="h-10 w-10 mx-auto mb-4" style={{ color: '#1d4ed8' }} />
                  <h3 className="font-bold text-lg">Emprendedores</h3>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Preguntas Frecuentes</h2>
              </motion.div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm"><h3 className="text-xl font-bold mb-2">¿Es difícil de usar QControla?</h3><p className="text-gray-600">No. Diseñamos QControla con una interfaz intuitiva y fácil de navegar. Además, ofrecemos tutoriales y soporte para que empieces a usarlo sin problemas.</p></div>
                <div className="bg-white p-6 rounded-lg shadow-sm"><h3 className="text-xl font-bold mb-2">¿Necesito instalar algo en mi computador?</h3><p className="text-gray-600">Absolutamente nada. QControla es 100% en la nube. Solo necesitas un navegador web y conexión a internet para acceder desde cualquier lugar.</p></div>
                <div className="bg-white p-6 rounded-lg shadow-sm"><h3 className="text-xl font-bold mb-2">¿Mis datos están seguros?</h3><p className="text-gray-600">Sí. La seguridad es nuestra máxima prioridad. Utilizamos encriptación de nivel bancario y copias de seguridad constantes para proteger tu información.</p></div>
                <div className="bg-white p-6 rounded-lg shadow-sm"><h3 className="text-xl font-bold mb-2">¿Qué tipo de soporte ofrecen?</h3><p className="text-gray-600">El Plan Crecimiento incluye soporte técnico prioritario a través de WhatsApp para resolver cualquier duda o inconveniente de manera rápida y personalizada.</p></div>
              </div>
            </div>
          </section>
        </main>

        <footer className="text-white" style={{ background: 'linear-gradient(135deg, #030d1f 0%, #0c2044 100%)' }}>
          <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">¿Listo para transformar la gestión de tu negocio?</h2>
            <p className="text-slate-300 mb-8">Solicita una demo gratuita y sin compromiso. Descubre cómo QControla puede ayudarte a crecer.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20QControla%20y%20me%20gustaría%20solicitar%20una%20demo."
                target="_blank"
                className="inline-block text-white font-bold py-3 px-10 rounded-lg text-lg shadow-lg transition duration-300"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
              >
                Solicitar Demo Gratuita
              </a>
              <button
                onClick={() => openGoogleRegister()}
                disabled={isGoogleLoading}
                className="flex items-center gap-3 bg-white text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-lg text-base transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isGoogleLoading ? 'Cargando...' : 'Empieza gratis con Google'}
              </button>
            </div>
            <div className="border-t border-white/10 mt-12 pt-8">
              <p className="text-slate-500">© {new Date().getFullYear()} QControla. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
};

export default QControlaLanding;
