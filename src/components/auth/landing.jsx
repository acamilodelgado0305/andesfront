import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './modallogin';
import Header from './header';
import { Book, Calendar, Clock, Users, Monitor, Star, MessageSquare, Mail, Facebook, Instagram, Linkedin } from 'lucide-react';
import imp1 from "../../../images/imp1.jpg";

const Landing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <Header onLoginClick={openModal} />

      <main className="mt-16">
        <section
          className="relative bg-cover bg-center py-60 px-4 sm:px-6 lg:px-8"
          style={{
            backgroundImage: `url(${imp1})`,
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>

          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4 text-white">
              Fundación Educativa Villa de los Andes
            </h1>
            <p className="text-xl mb-8 text-white">
              Educación flexible y de calidad: Validación de bachillerato y cursos técnicos 100% online con clases diarias
            </p>
            <Link
              to="/register/c"
              className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition duration-300"
            >
              ¡Comienza Tu Educación Hoy!
            </Link>
          </div>
        </section>

       

        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">
              ¿Por qué elegir Villa de los Andes?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Horarios Flexibles</h3>
                <p className="text-gray-600">Estudia a tu propio ritmo con acceso 24/7</p>
              </div>
              <div className="text-center">
                <Monitor className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Clases En Vivo</h3>
                <p className="text-gray-600">Sesiones interactivas diarias con profesores expertos</p>
              </div>
              <div className="text-center">
                <Book className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Material Actualizado</h3>
                <p className="text-gray-600">Contenido digital interactivo y recursos modernos</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Apoyo Personalizado</h3>
                <p className="text-gray-600">Tutorías individuales y seguimiento constante</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Nuestros Programas Educativos</h2>
            <div className="space-y-8">
              <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Validación de Bachillerato</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-blue-600 mr-2" />
                    <span>Modalidad 100% online con clases diarias en vivo</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-blue-600 mr-2" />
                    <span>Título oficial avalado por el Ministerio de Educación</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-blue-600 mr-2" />
                    <span>Tutorías personalizadas y seguimiento académico</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-blue-600 mr-2" />
                    <span>Plataforma virtual disponible 24/7</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link to="/bachillerato" className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300">
                    Ver Detalles del Programa
                  </Link>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4 text-center text-blue-600">Cursos Técnicos Especializados</h3>
                <p className="text-lg mb-4 text-gray-700">
                  Estudia con nosotros en modalidad <span className="font-bold">virtual</span>, con clases de lunes a viernes de <span className="font-bold">8:00 PM a 9:00 PM</span>.
                </p>
                <p className="text-lg font-semibold mb-4 text-gray-800">Requisitos:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Foto del diploma y acta de bachiller</li>
                  <li>Foto del documento de identidad</li>
                  <li>Llenar el formulario de inscripción</li>
                </ul>
                <p className="text-lg font-semibold mb-4 text-gray-800">Información del curso:</p>
                <ul className="list-disc pl-6 mb-6 text-gray-700">
                  <li>Duración: <span className="font-bold">2 semestres</span></li>
                  <li>Matrícula: <span className="font-bold">$90.000</span></li>
                  <li>Pensión mensual: <span className="font-bold">$70.000</span></li>
                </ul>
                <p className="text-lg font-semibold mb-4 text-gray-800">Nuestros cursos:</p>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Book className="h-5 w-5 text-blue-600 mr-2" />
                    Auxiliar en Asistente Administrativo y de Oficina
                  </li>
                  <li className="flex items-center">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    Asistente en Gestión Humana
                  </li>
                  <li className="flex items-center">
                    <Monitor className="h-5 w-5 text-blue-600 mr-2" />
                    Desarrollo y Análisis de Sistemas de Información
                  </li>
                  <li className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                    Auxiliar Educativo en Atención Integral a la Primera Infancia
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-blue-600 mr-2" />
                    Seguridad y Salud en el Trabajo
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <Link
                    to="/cursos-tecnicos"
                    className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300"
                  >
                    Más Información
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="bg-gray-100 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Testimonios de Nuestros Estudiantes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                </div>
                <p className="italic mb-4">"Las clases en línea son excelentes y los profesores están siempre disponibles para resolver dudas. Pude terminar mi bachillerato mientras trabajaba."</p>
                <p className="font-semibold">- María González, Graduada 2023</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                  <Star className="h-6 w-6 text-yellow-400 inline" />
                </div>
                <p className="italic mb-4">"El curso técnico de programación superó mis expectativas. Las clases diarias y el material práctico me ayudaron a conseguir trabajo rápidamente."</p>
                <p className="font-semibold">- Carlos Rodríguez, Graduado en Desarrollo Web</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">¡Comienza Tu Futuro Hoy!</h2>
            <p className="text-xl mb-8">Proceso de matrícula simple y rápido. Inicia tus clases de inmediato.</p>
            <Link to="/matricula" className="inline-block bg-green-500 text-white font-bold py-3 px-8 rounded-full text-xl hover:bg-green-600 transition duration-300">
              Matricúlate Ahora
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Villa de los Andes</h3>
              <p className="text-gray-400">
                Transformando vidas a través de la educación en línea
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <div className="flex items-center mb-2">
                <Mail className="h-5 w-5 mr-2" />
                <span>f.eduvativavilladelosandes@gmail.com</span>
              </div>
              <div className="flex items-center mb-2">
                <MessageSquare className="h-5 w-5 mr-2" />
                <span>+57 313 2529490</span>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Programas</h4>
              <ul className="space-y-2">
                <li>Validación de Bachillerato</li>
                <li>Cursos Técnicos</li>
                <li>Educación Continua</li>
                <li>Certificaciones</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Síguenos</h4>
              <div className="flex space-x-4">
                <Facebook className="h-6 w-6 cursor-pointer hover:text-blue-400" />
                <Instagram className="h-6 w-6 cursor-pointer hover:text-pink-400" />
                <Linkedin className="h-6 w-6 cursor-pointer hover:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Fundación Educativa Villa de los Andes. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h2 className="text-2xl font-bold mb-4">Iniciar Sesión</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Usuario:</label>
            <input type="text" id="username" name="username" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña:</label>
            <input type="password" id="password" name="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">
            Iniciar Sesión
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Landing;