import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import {
  ArrowRight, BarChart3, Boxes, Briefcase, Building,
  Check, Cloud, DollarSign, FileText, PieChart,
  Settings, ShieldCheck, ShoppingCart, Target, Users
} from 'lucide-react';

import Header from './header'; // Asegúrate que la ruta sea correcta

// --- ¡IMPORTANTE! Reemplaza estas rutas con tus propias imágenes ---


const QControlaLanding = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const planFeatures = [
    "Gestión Financiera Completa",
    "Control de Inventario en Tiempo Real",
    "Reportes y Analíticas",
    "Base de Datos de Clientes y Proveedores",
    "Acceso desde cualquier dispositivo",
    "Soporte técnico vía WhatsApp",
    "Actualizaciones incluidas"
  ];

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
          <section id="hero" className="relative h-screen flex items-center justify-center text-center text-white" style={{ backgroundImage: `url(${''})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-green-900 bg-opacity-80" />
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="relative z-10 px-4"
            >
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
                Toma el Control Total de tu Negocio
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-green-100">
                El software definitivo para la administración financiera y de inventario de tu institución o empresa.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20QControla%20y%20me%20gustaría%20solicitar%20una%20demo."
                  target="_blank"
                  className="inline-flex items-center justify-center bg-white text-green-800 font-bold py-3 px-8 rounded-lg text-lg shadow-lg"
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
                  <DollarSign className="h-12 w-12 text-green-600 mb-6 mx-auto" />
                  <h3 className="text-xl font-bold mb-2">Finanzas Claras y sin Estrés</h3>
                  <p className="text-gray-600">Visualiza ingresos, gastos y rentabilidad en tiempo real. Genera reportes con un solo clic.</p>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8">
                  <Boxes className="h-12 w-12 text-green-600 mb-6 mx-auto" />
                  <h3 className="text-xl font-bold mb-2">Inventario Siempre Sincronizado</h3>
                  <p className="text-gray-600">Evita pérdidas y sobre-stock. Conoce qué tienes, qué necesitas y qué se vende más.</p>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8">
                  <BarChart3 className="h-12 w-12 text-green-600 mb-6 mx-auto" />
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
                    <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><div><h4 className="font-semibold">Módulo Financiero</h4><p className="text-gray-600">Controla flujo de caja, cuentas por cobrar/pagar y conciliación bancaria.</p></div></li>
                    <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><div><h4 className="font-semibold">Módulo de Inventario</h4><p className="text-gray-600">Gestiona productos, proveedores, órdenes de compra y alertas de stock.</p></div></li>
                    <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><div><h4 className="font-semibold">Reportes Inteligentes</h4><p className="text-gray-600">Dashboards personalizables que te muestran la salud de tu negocio.</p></div></li>
                    <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><div><h4 className="font-semibold">Acceso en la Nube</h4><p className="text-gray-600">Tu información segura y disponible 24/7 en cualquier dispositivo con internet.</p></div></li>
                  </ul>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="mt-8 md:mt-0">
                    <img src={''} alt="Dashboard de QControla" className="rounded-lg shadow-2xl" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-20 bg-green-700 text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Un Plan Simple y Transparente</h2>
                <p className="text-xl text-green-100 mb-12">Accede a todo el poder de QControla sin contratos ni costos ocultos.</p>
                <div className="bg-white text-gray-800 p-10 rounded-xl shadow-2xl max-w-lg mx-auto">
                  <h3 className="text-2xl font-bold">Plan Crecimiento</h3>
                  <p className="text-gray-500 mb-6">Ideal para pymes, instituciones y emprendedores.</p>
                  <div className="my-8">
                    <span className="text-5xl font-extrabold">$250.000</span>
                    <span className="text-xl text-gray-600"> COP</span>
                  </div>
                  <p className="text-lg font-semibold mb-6">Acceso completo por 6 meses</p>
                  <ul className="space-y-3 text-left mb-8">
                    {planFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://wa.me/570000000000?text=Hola,%20quiero%20adquirir%20el%20Plan%20Crecimiento%20de%20QControla%20por%206%20meses."
                    target="_blank"
                    className="w-full inline-block bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 text-lg"
                  >
                    Adquirir Plan Ahora
                  </a>
                </div>
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
                  <Briefcase className="h-10 w-10 mx-auto text-green-600 mb-4" />
                  <h3 className="font-bold text-lg">PYMES</h3>
                </div>
                 <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <Building className="h-10 w-10 mx-auto text-green-600 mb-4" />
                  <h3 className="font-bold text-lg">Instituciones Educativas</h3>
                </div>
                 <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <ShoppingCart className="h-10 w-10 mx-auto text-green-600 mb-4" />
                  <h3 className="font-bold text-lg">Comercios y Tiendas</h3>
                </div>
                 <div className="text-center p-6 border border-gray-200 rounded-lg">
                  <Users className="h-10 w-10 mx-auto text-green-600 mb-4" />
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

        <footer className="bg-gray-800 text-white">
          <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">¿Listo para transformar la gestión de tu negocio?</h2>
            <p className="text-gray-300 mb-8">Solicita una demo gratuita y sin compromiso. Descubre cómo QControla puede ayudarte a crecer.</p>
            <a href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20QControla%20y%20me%20gustaría%20solicitar%20una%20demo." target="_blank" className="inline-block bg-green-600 text-white font-bold py-3 px-10 rounded-lg hover:bg-green-700 transition duration-300 text-lg shadow-lg">
                Solicitar Demo Gratuita
            </a>
            <div className="border-t border-gray-700 mt-12 pt-8">
              <p className="text-gray-400">© {new Date().getFullYear()} QControla. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
};

export default QControlaLanding;