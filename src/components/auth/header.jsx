import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';

const Header = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Manejar el scroll para cambiar el estilo del header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar el menú móvil cuando se cambia de ruta
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { to: '/programas', label: 'Programas' },
    { to: '/cursos', label: 'Cursos' },
    { to: '/about', label: 'Nosotros' },
    { to: '/contact', label: 'Contacto' }
  ];

  return (
    <header 
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-md py-2' 
          : 'bg-white/90 backdrop-blur-sm py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="text-2xl font-bold text-blue-600 hover:text-yellow-400 transition-colors duration-300"
          >
            IE Villa de los Andes
          </Link>

          <div className="flex items-center gap-4">
            {/* Menú en pantallas grandes */}
            <nav className="hidden lg:block">
              <ul className="flex space-x-8">
                {navLinks.map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className={`font-medium transition-colors duration-300 ${
                        location.pathname === to
                          ? 'text-yellow-400'
                          : 'text-gray-600 hover:text-yellow-400'
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <button
              onClick={onLoginClick}
              className="hidden lg:block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors duration-300"
            >
              Iniciar Sesión
            </button>

            {/* Botón de menú móvil */}
            <button
              onClick={toggleMenu}
              className="lg:hidden text-gray-600 hover:text-yellow-400 transition-colors duration-300 p-2"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="py-4">
            <ul className="space-y-4">
              {navLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`block font-medium py-2 transition-colors duration-300 ${
                      location.pathname === to
                        ? 'text-yellow-400'
                        : 'text-gray-600 hover:text-yellow-400'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={onLoginClick}
                  className="w-full bg-yellow-400 text-white font-semibold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors duration-300"
                >
                  Iniciar Sesión
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;