import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ onLoginClick }) => {
  return (
    <header className="bg-blue-600 text-white py-4 px-4 sm:px-6 lg:px-8 fixed w-full top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">IE Villa de los Andes</Link>
        <nav>
          <ul className="flex space-x-4">
            <li><Link to="/programas" className="hover:text-blue-200">Programas</Link></li>
            <li><Link to="/cursos" className="hover:text-blue-200">Cursos</Link></li>
            <li><Link to="/about" className="hover:text-blue-200">Nosotros</Link></li>
            <li><Link to="/contact" className="hover:text-blue-200">Contacto</Link></li>
          </ul>
        </nav>
        <button 
          onClick={onLoginClick}
          className="bg-white text-blue-600 font-bold py-2 px-4 rounded hover:bg-blue-100 transition duration-300"
        >
          Iniciar Sesión
        </button>
      </div>
    </header>
  );
};

export default Header;