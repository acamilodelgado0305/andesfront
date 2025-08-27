import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Se importa Link para la navegación
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navLinks = [
    { href: '#benefits', label: 'Beneficios' },
    { href: '#features', label: 'Funciones' },
    { href: '#pricing', label: 'Precios' },
    { href: '#faq', label: 'FAQ' },
  ];

  const linkClasses = (scrolled) => 
    `font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-green-700' : 'text-green-100 hover:text-white'}`;

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <a href="#hero" className={`text-3xl font-bold transition-colors ${isScrolled ? 'text-green-800' : 'text-white'}`}>
            QControla
          </a>
          
          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center space-x-8">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className={linkClasses(isScrolled)}>
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-6">
                {/* BOTÓN DE INICIAR SESIÓN PARA ESCRITORIO */}
                <Link to="/login" className={linkClasses(isScrolled)}>
                    Iniciar Sesión
                </Link>

                <a 
                  href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20QControla%20y%20me%20gustaría%20solicitar%20una%20demo." 
                  target="_blank"
                  className="bg-green-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-green-700 transition-colors duration-300"
                >
                  Solicitar Demo
                </a>
            </div>
          </div>
          
          {/* Botón de Menú Móvil */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-md transition-colors ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/20'}`}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Menú Móvil */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-96 mt-4' : 'max-h-0'}`}>
           <div className={`rounded-lg ${isScrolled ? 'bg-white' : 'bg-green-900 bg-opacity-95'}`}>
              <nav className="py-4 px-5 space-y-2">
                {navLinks.map(link => (
                  <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className={`block font-medium py-2 rounded-md text-center transition-colors ${isScrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-green-100 hover:bg-white/20'}`}>
                    {link.label}
                  </a>
                ))}
                
                {/* BOTÓN DE INICIAR SESIÓN PARA MÓVIL */}
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className={`block font-medium py-2 rounded-md text-center transition-colors ${isScrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-green-100 hover:bg-white/20'}`}>
                    Iniciar Sesión
                </Link>

                <div className="border-t pt-4 mt-2 border-gray-500/50">
                    <a 
                        href="https://wa.me/570000000000?text=Hola,%20estoy%20interesado%20en%20QControla%20y%20me%20gustaría%20solicitar%20una%20demo." 
                        target="_blank"
                        className="block w-full text-center bg-green-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-green-700 transition-colors duration-300"
                    >
                        Solicitar Demo
                    </a>
                </div>
              </nav>
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;