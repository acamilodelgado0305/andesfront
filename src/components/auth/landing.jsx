import React, { useState } from 'react';
import Modal from './modallogin';
import { Link } from 'react-router-dom';

export default function Landing() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Institución Educativa Villa de los Andes</h1>
          <p className="text-xl mb-8">
            Impulsando el futuro de nuestros estudiantes con excelencia y dedicación.
          </p>
          <div className="space-x-4">
            <Link to="/sigin" className="inline-block bg-white text-blue-600 font-bold py-2 px-6 rounded-full hover:bg-blue-100 transition duration-300">
              Sign Up
            </Link>
            <button 
              onClick={openModal}
              className="inline-block bg-transparent border-2 border-white text-white font-bold py-2 px-6 rounded-full hover:bg-white hover:text-blue-600 transition duration-300"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">¿Por qué elegirnos?</h2>
          <p className="text-xl text-gray-700 text-center">
            Ofrecemos una educación integral con un enfoque en el desarrollo académico y personal.
          </p>
          {/* You can add more content here */}
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username:</label>
            <input type="text" id="username" name="username" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password:</label>
            <input type="password" id="password" name="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">Login</button>
        </form>
      </Modal>
    </div>
  );
}