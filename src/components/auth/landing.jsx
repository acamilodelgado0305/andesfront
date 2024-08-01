// Landing.js
import React, { useState } from 'react';
import './auth.css';
import Modal from './modallogin'; 
import { Link } from 'react-router-dom';

function Landing() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1>Institución Educativa Villa de los Andes</h1>
        <p>
          Impulsando el futuro de nuestros estudiantes con excelencia y
          dedicación.
        </p>
        <div className="button-container">
          <Link to="sigin">
            <button className="btn btn-primary">Sign Up</button>
          </Link>
          <button className="btn btn-secondary" onClick={openModal}>Login</button>
        </div>
      </header>
      <section className="landing-content">
        <h2>¿Por qué elegirnos?</h2>
        <p>
          Ofrecemos una educación integral con un enfoque en el desarrollo
          académico y personal.
        </p>
        {/* Puedes agregar más contenido aquí */}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h2>Login</h2>
        {/* Aquí puedes agregar el formulario de login o cualquier contenido adicional */}
        <form>
          <label>
            Username:
            <input type="text" />
          </label>
          <label>
            Password:
            <input type="password" />
          </label>
          <button type="submit">Login</button>
        </form>
      </Modal>
    </div>
  );
}

export default Landing;
