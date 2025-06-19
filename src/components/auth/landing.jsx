import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import {
  Book, Calendar, Clock, Users, Monitor, Star,
  MessageSquare, Mail, Facebook, Instagram, Linkedin,
  Check, Award, GraduationCap, ArrowRight, Phone,
  MapPin, Shield, Trophy, Target, Zap, FileText // Usaremos FileText o BookOpen para las notas
} from 'lucide-react';
import Modal from './modallogin';
import Header from './header';
import { Alert } from 'antd';


import bgLanding from '../../../images/bglanding.png';

const Landing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [visibleSection, setVisibleSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    // Mostrar promoción después de 5 segundos
    const timer = setTimeout(() => setShowPromo(true), 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full min-h-screen bg-white-50 flex flex-col">
      <HelmetProvider >
        <title>Villa de los Andes | Educación Online - Validación Bachillerato y Cursos Técnicos</title>
        <meta name="description" content="Obtén tu título de bachiller y certificaciones técnicas 100% online. Clases en vivo, tutorías personalizadas y precios accesibles. ¡Comienza hoy!" />
        <meta name="keywords" content="validación bachillerato, educación online, cursos técnicos, clases virtuales, título bachiller" />
        <meta property="og:title" content="Villa de los Andes - Educación Online" />
        <meta property="og:description" content="Educación flexible y de calidad: Validación de bachillerato y cursos técnicos 100% online con clases diarias." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://villadelosandes.edu.co" />
      </HelmetProvider >

      <Header onLoginClick={() => setIsModalOpen(true)} />

      {showPromo && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Alert className="bg-red-50 border-red-200">

            ¡Matrícula GRATIS si te inscribes hoy! Oferta por tiempo limitado.

          </Alert>
        </motion.div>
      )}

      <main className="mt-16">
        {/* Hero Section */}
        <section id="hero" className="relative min-h-screen flex items-center">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgLanding})` }}
          />

          <div className="relative max-w-6xl mx-auto px-4  sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center"
            >
              <div className="bg-black bg-opacity-30 p-4 rounded-lg inline-block">
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight text-center">
                  Tu Futuro Educativo
                  <span className="block white-300">Comienza Aquí</span>
                </h1>
              </div>


              <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto">
                Educación flexible y personalizada con títulos oficiales.
                Clases en vivo y tutorías individuales.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/register/bachillerato"
                    className="inline-flex items-center bg-white text-red-900 font-bold py-4 px-8 rounded-lg hover:bg-white-100 transition duration-300 text-lg shadow-lg"
                  >
                    Validar Bachillerato
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/register/tecnico"
                    className="inline-flex items-center bg-white text-red-900 font-bold py-4 px-8 rounded-lg hover:bg-white-300 transition duration-300 text-lg shadow-lg"
                  >
                    Explorar Cursos Técnicos
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="beneficios" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                ¿Por Qué Elegirnos?
              </h2>
              <p className="text-xl text-white-600">
                Educación de calidad adaptada a tu vida
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: "Título Oficial",
                  description: "Certificaciones avaladas por el Ministerio de Educación"
                },
                {
                  icon: Clock,
                  title: "Flexibilidad Total",
                  description: "Estudia a tu ritmo con acceso 24/7 a la plataforma"
                },
                {
                  icon: Users,
                  title: "Apoyo Continuo",
                  description: "Tutorías personalizadas y seguimiento académico"
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="bg-white-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <benefit.icon className="h-12 w-12 text-red-600 mb-6 mx-auto" />
                  <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                  <p className="text-white-600">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section id="programas" className="py-20 bg-white-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Programas Educativos
              </h2>
              <p className="text-xl text-white-600">
                Elige el programa que mejor se adapte a tus objetivos
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Validación Card */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="bg-gradient-to-r from-red-600 to-red-800 p-6">
                  <h3 className="text-2xl font-bold text-white">Validación de Bachillerato</h3>
                  <p className="text-red-100 mt-2">Obtén tu título oficial</p>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-white-900">$85.000</p>
                    <p className="text-white-600">Matrícula única</p>
                  </div>
                  <p className="text-white-600 mb-6">Mensualidad: $65.000</p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Duración personalizada según tu nivel",
                      "Clases virtuales en vivo",
                      "Material didáctico digital",
                      "Tutorías individuales",
                      "Título oficial MEN"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-6 w-6 text-gray-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/bachillerato"
                    className="block text-center bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300"
                  >
                    Más Información
                  </Link>
                </div>
              </motion.div>

              {/* Cursos Técnicos Card */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="bg-gradient-to-r from-gray-600 to-gray-800 p-6">
                  <h3 className="text-2xl font-bold text-white">Cursos Técnicos</h3>
                  <p className="text-gray-100 mt-2">Formación profesional especializada</p>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-white-900">$90.000</p>
                    <p className="text-white-600">Matrícula única</p>
                  </div>
                  <p className="text-white-600 mb-6">Mensualidad: $70.000</p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Duración: 2 semestres",
                      "Clases L-V de 8:00 PM a 9:00 PM",
                      "Certificación profesional",
                      "Prácticas virtuales",
                      "Bolsa de empleo"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-6 w-6 text-gray-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/cursos-tecnicos"
                    className="block text-center bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition duration-300"
                  >
                    Ver Programas
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section id="estadisticas" className="py-20 bg-red-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { icon: GraduationCap, number: "1000+", label: "Graduados" },
                { icon: Trophy, number: "95%", label: "Tasa de Éxito" },
                { icon: Target, number: "100%", label: "Online" },
                { icon: Users, number: "50+", label: "Docentes" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="text-center"
                >
                  <stat.icon className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-4xl font-bold mb-2">{stat.number}</p>
                  <p className="text-red-200">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section
          id="matricula"
          className="py-20 relative bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${bgLanding})`
          }}
        >
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 to-red-800/90"></div>

          {/* Content */}
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                ¡Comienza Tu Futuro Educativo Hoy!
              </h2>
              <p className="text-xl text-red-100 mb-8">
                Matrícula simplificada y clases que inician de inmediato
              </p>
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/matricula"
                    className="inline-flex items-center bg-white text-red-600 font-bold py-4 px-8 rounded-lg hover:bg-white-100 transition duration-300 text-lg shadow-lg"
                  >
                    Matricúlate Ahora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <a
                    href="tel:+573132529490"
                    className="inline-flex items-center bg-transparent border-2 border-white text-white font-bold py-4 px-8 rounded-lg hover:bg-white hover:text-red-600 transition duration-300 text-lg"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Llámanos
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Preguntas Frecuentes
              </h2>
              <p className="text-xl text-white-600">
                Resolvemos tus dudas sobre nuestros programas
              </p>
            </motion.div>

            <div className="space-y-8">
              {[
                {
                  q: "¿Los títulos son oficiales?",
                  a: "Sí, todos nuestros títulos están avalados por el Ministerio de Educación Nacional y son válidos en todo el territorio colombiano."
                },
                {
                  q: "¿Cómo son las clases virtuales?",
                  a: "Las clases se realizan en vivo a través de nuestra plataforma. Son interactivas y quedan grabadas para que puedas repasarlas cuando lo necesites."
                },
                {
                  q: "¿Cuánto tiempo toma completar el bachillerato?",
                  a: "La duración depende de tu último grado aprobado y edad. En tu primera asesoría definiremos un plan personalizado para ti."
                },
                {
                  q: "¿Qué requisitos necesito para inscribirme?",
                  a: "Necesitas documento de identidad, certificados de estudios anteriores y acceso a internet. ¡Nosotros te guiamos en todo el proceso!"
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="bg-white-50 p-6 rounded-lg"
                >
                  <h3 className="text-xl font-bold mb-4">{faq.q}</h3>
                  <p className="text-white-600">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contacto" className="py-20 bg-white-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="grid grid-cols-1 md:grid-cols-2 gap-12"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  ¿Necesitas más información?
                </h2>
                <p className="text-xl text-white-600 mb-8">
                  Nuestro equipo está listo para responder todas tus preguntas
                </p>
                <div className="space-y-6">
                  <div className="flex items-center">
                    <Phone className="h-6 w-6 text-red-600 mr-4" />
                    <div>
                      <p className="font-semibold">Llámanos o escríbenos</p>
                      <a href="tel:+573132529490" className="text-red-600 hover:text-red-700">
                        +57 313 2529490
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-6 w-6 text-red-600 mr-4" />
                    <div>
                      <p className="font-semibold">Correo electrónico</p>
                      <a href="mailto:f.eduvativavilladelosandes@gmail.com" className="text-red-600 hover:text-red-700">
                        f.eduvativavilladelosandes@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-red-600 mr-4" />
                    <div>
                      <p className="font-semibold">Horario de atención</p>
                      <p>Lunes a Viernes: 8:00 AM - 6:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md">
                <h3 className="text-2xl font-bold mb-6">Solicita información</h3>
                <form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-2 border border-white-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2 border border-white-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-white-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-2 border border-white-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="program" className="block text-sm font-medium text-white-700 mb-1">
                      Programa de interés
                    </label>
                    <select
                      id="program"
                      className="w-full px-4 py-2 border border-white-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Selecciona un programa</option>
                      <option value="bachillerato">Validación de Bachillerato</option>
                      <option value="tecnico">Cursos Técnicos</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300"
                  >
                    Enviar Solicitud
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-red-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <h3 className="text-xl font-bold mb-4">Villa de los Andes</h3>
              <p className="text-white">
                Transformando vidas a través de la educación en línea desde 2015
              </p>
              <div className="flex space-x-4 mt-6">
                <a href="#" className="text-white hover:text-white transition duration-200">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="text-white hover:text-white transition duration-200">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="text-white hover:text-white transition duration-200">
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Programas</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/bachillerato" className="text-white-400 hover:text-white transition duration-200">
                    Validación de Bachillerato
                  </Link>
                </li>
                <li>
                  <Link to="/cursos-tecnicos" className="text-white-400 hover:text-white transition duration-200">
                    Cursos Técnicos
                  </Link>
                </li>
                <li>
                  <Link to="/matricula" className="text-white-400 hover:text-white transition duration-200">
                    Proceso de Matrícula
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-white-400" />
                  <a href="tel:+573132529490" className="text-white-400 hover:text-white transition duration-200">
                    +57 313 2529490
                  </a>
                </li>
                <li className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-white-400" />
                  <a href="mailto:f.eduvativavilladelosandes@gmail.com" className="text-white-400 hover:text-white transition duration-200">
                    f.eduvativavilladelosandes@gmail.com
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacidad" className="text-white-400 hover:text-white transition duration-200">
                    Política de Privacidad
                  </Link>
                </li>
                <li>
                  <Link to="/terminos" className="text-white-400 hover:text-white transition duration-200">
                    Términos y Condiciones
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white-800 mt-12 pt-8 text-center">
            <p className="text-white-400">
              © {new Date().getFullYear()} Fundación Educativa Villa de los Andes. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Iniciar Sesión</h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-white-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-white-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300"
            >
              Ingresar
            </button>
          </form>
        </div>
      </Modal>

      {/* Botón flotante para consultar notas (ajustado) */}
      <motion.a
        href="https://validaciondebachillerato.com.co/reporte"
        target="_blank" // Abre en una nueva pestaña
        rel="noopener noreferrer" // Seguridad recomendada para target="_blank"
        className="fixed top-1/2 right-6 -translate-y-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-red-700 transition duration-300 flex items-center justify-center space-x-2 z-50"
        initial={{ x: 100, opacity: 0 }} // Empieza fuera de la pantalla y transparente
        animate={{ x: 0, opacity: 1 }} // Se mueve a su posición final y se vuelve visible
        transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0.5 }} // Animación más pronunciada al aparecer
        title="Consultar mis Notas"
      >
        <FileText className="h-5 w-5" /> {/* Ícono a la izquierda del texto */}
        <span>Consultar Notas</span>
      </motion.a>
    </div>
  );
};

export default Landing;