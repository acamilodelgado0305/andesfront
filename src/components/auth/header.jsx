import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuOutlined } from '@ant-design/icons'; // Importar el icono de hamburguesa

const Header = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para controlar el menú móvil

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-blue-600 text-white py-4 px-4 sm:px-6 lg:px-8 fixed w-full top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">IE Villa de los Andes</Link>

        <div className="flex items-center">
          {/* Botón de hamburguesa en pantallas pequeñas */}
          <button
            onClick={toggleMenu}
            className="text-white text-2xl lg:hidden focus:outline-none"
          >
            <MenuOutlined />
          </button>

          {/* Menú en pantallas grandes */}
          <nav className="hidden lg:block mx-4">
            <ul className="flex space-x-4">
              <li><Link to="/programas" className="hover:text-blue-200">Programas</Link></li>
              <li><Link to="/cursos" className="hover:text-blue-200">Cursos</Link></li>
              <li><Link to="/about" className="hover:text-blue-200">Nosotros</Link></li>
              <li><Link to="/contact" className="hover:text-blue-200">Contacto</Link></li>
            </ul>
          </nav>

          <button
            onClick={onLoginClick}
            className="hidden lg:block bg-white text-blue-600 font-bold py-2 px-4 rounded hover:bg-blue-100 transition duration-300"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>

      {/* Menú móvil, visible sólo si isMenuOpen es true */}
      {isMenuOpen && (
        <nav className="lg:hidden bg-blue-600 mt-2 p-4">
          <ul className="flex flex-col space-y-4">
            <li><Link to="/programas" className="hover:text-blue-200">Programas</Link></li>
            <li><Link to="/cursos" className="hover:text-blue-200">Cursos</Link></li>
            <li><Link to="/about" className="hover:text-blue-200">Nosotros</Link></li>
            <li><Link to="/contact" className="hover:text-blue-200">Contacto</Link></li>
            <li>
              <button
                onClick={onLoginClick}
                className="w-full bg-white text-blue-600 font-bold py-2 rounded hover:bg-blue-100 transition duration-300"
              >
                Iniciar Sesión
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Header;
