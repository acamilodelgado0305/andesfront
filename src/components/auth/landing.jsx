import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './modallogin';
import Header from './header';

const Landing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
       <Header onLoginClick={openModal} />

      <main className="mt-16"> {/* Added margin-top to account for fixed header */}
      <section className="bg-blue-600 text-white py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Institución Educativa Villa de los Andes</h1>
            <p className="text-xl mb-8">
              Tu futuro comienza aquí: Validación de bachillerato y cursos técnicos 100% online
            </p>
            <Link to="/register/c" className="inline-block bg-white text-blue-600 font-bold py-2 px-6 rounded-full hover:bg-blue-100 transition duration-300">
              Matricúlate Ahora
            </Link>
          </div>
        </section>

        <section className="bg-blue-50 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Nuestros Programas</h2>
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Validación de Bachillerato</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Programa flexible adaptado a tu horario</li>
                  <li>Acompañamiento personalizado de tutores expertos</li>
                  <li>Material didáctico interactivo y actualizado</li>
                  <li>Título oficial reconocido por el Ministerio de Educación</li>
                </ul>
                <Link to="/bachillerato" className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300">Más Información</Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Cursos Técnicos Online</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li>Programación y Desarrollo Web</li>
                  <li>Diseño Gráfico y Multimedia</li>
                  <li>Administración y Contabilidad</li>
                  <li>Marketing Digital y Redes Sociales</li>
                </ul>
                <Link to="/cursos" className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-700 transition duration-300">Ver Todos los Cursos</Link>
              </div>
            </div>
          </div>
        </section>

        <section id="matriculate" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">¡Matricúlate Ahora y Asegura tu Futuro!</h2>
            <p className="text-xl mb-8">Da el primer paso hacia tu éxito académico y profesional. Nuestro proceso de matrícula es sencillo y rápido.</p>
            <Link to="/matricula" className="inline-block bg-green-500 text-white font-bold py-3 px-8 rounded-full text-xl hover:bg-green-600 transition duration-300">Iniciar Matrícula</Link>
          </div>
        </section>

        <section className="bg-gray-200 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Testimonios de Nuestros Estudiantes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="italic mb-4">"Gracias a Villa de los Andes, pude terminar mi bachillerato mientras trabajaba. El sistema online me dio la flexibilidad que necesitaba."</p>
                <p className="font-semibold">- María G., Graduada 2023</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="italic mb-4">"Los cursos técnicos me abrieron las puertas a nuevas oportunidades laborales. La calidad de la enseñanza es excelente."</p>
                <p className="font-semibold">- Carlos R., Estudiante de Programación</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-blue-800 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="mb-4">&copy; 2024 Institución Educativa Villa de los Andes. Todos los derechos reservados.</p>
          <p>Contáctanos: info@villadelosandes.edu.co | Tel: (123) 456-7890</p>
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
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">Iniciar Sesión</button>
        </form>
      </Modal>
    </div>
  );
};

export default Landing;