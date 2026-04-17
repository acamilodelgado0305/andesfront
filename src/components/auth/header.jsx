import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ShoppingCart, Package, DollarSign, Users, GraduationCap, FileText, BarChart3, HelpCircle, MessageCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { AuthContext } from '../../AuthContext';
import { loginWithGoogleToken } from '../../services/auth/authService';

const funcionalidades = [
  { icon: ShoppingCart, label: 'Punto de Venta', description: 'Gestiona ventas y caja rápidamente', href: '/#features' },
  { icon: Package, label: 'Control de Inventario', description: 'Stock en tiempo real, alertas y proveedores', href: '/#features' },
  { icon: DollarSign, label: 'Gestión Financiera', description: 'Ingresos, egresos y flujo de caja', href: '/#features' },
  { icon: Users, label: 'Gestión de Personas', description: 'Clientes, proveedores y empleados', href: '/#features' },
  { icon: GraduationCap, label: 'Módulo Académico', description: 'Estudiantes, programas y calificaciones', href: '/#features' },
  { icon: FileText, label: 'Generación de Documentos', description: 'Certificados, facturas y reportes', href: '/#features' },
  { icon: BarChart3, label: 'Reportes y Analíticas', description: 'Dashboards y datos para tomar decisiones', href: '/#features' },
];

const recursos = [
  { icon: HelpCircle, label: 'Preguntas Frecuentes', href: '/#faq' },
  { icon: MessageCircle, label: 'Soporte por WhatsApp', href: 'https://wa.me/570000000000?text=Hola,%20necesito%20ayuda%20con%20Rapictrl', external: true },
  { icon: ShoppingCart, label: 'Solicitar Demo Gratuita', href: 'https://wa.me/570000000000?text=Hola,%20quisiera%20una%20demo%20de%20Rapictrl', external: true },
];

const Dropdown = ({ label, items, isScrolled, isMobile = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const textColor = isScrolled ? 'text-gray-600 hover:text-blue-800' : 'text-slate-300 hover:text-white';

  if (isMobile) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center justify-center gap-1 w-full font-medium py-2 rounded-md transition-colors ${isScrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-slate-300 hover:bg-white/10'}`}
        >
          {label} <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-1 space-y-1 pl-2">
            {items.map((item) => (
              item.external
                ? <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                    className={`block text-sm py-1.5 px-2 rounded transition-colors ${isScrolled ? 'text-gray-500 hover:bg-gray-100' : 'text-slate-400 hover:bg-white/10'}`}>
                    {item.label}
                  </a>
                : <a key={item.label} href={item.href}
                    className={`block text-sm py-1.5 px-2 rounded transition-colors ${isScrolled ? 'text-gray-500 hover:bg-gray-100' : 'text-slate-400 hover:bg-white/10'}`}>
                    {item.label}
                  </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        className={`flex items-center gap-1 font-medium transition-colors ${textColor}`}
      >
        {label} <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
          style={{ minWidth: label === 'Funcionalidades' ? '340px' : '240px' }}
        >
          <div className="p-2">
            {items.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="mt-0.5 p-1.5 rounded-md" style={{ background: '#eff6ff' }}>
                    <Icon size={16} style={{ color: '#1d4ed8' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  </div>
                </div>
              );
              return item.external
                ? <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">{content}</a>
                : <a key={item.label} href={item.href}>{content}</a>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login: contextLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoogleSuccess = async (tokenResponse) => {
    setIsLoading(true);
    try {
      const response = await loginWithGoogleToken(tokenResponse.access_token);
      if (response.token) {
        contextLogin(response.token, response.user);
        message.success('¡Bienvenido a Rapictrl! Tu prueba gratuita de 14 días ha comenzado.', 3);
        navigate('/inicio');
      }
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al registrarse con Google.';
      message.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const openGoogleRegister = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => message.error('No se pudo completar el registro con Google.'),
    flow: 'implicit',
  });

  const linkColor = isScrolled ? 'text-gray-600 hover:text-blue-800' : 'text-slate-300 hover:text-white';

  return (
    <header
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'py-4'}`}
      style={!isScrolled ? { background: 'transparent' } : {}}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">

          {/* LEFT: Logo + Nav */}
          <div className="flex items-center gap-8">
            <a
              href="/#hero"
              className={`text-2xl font-bold transition-colors whitespace-nowrap ${isScrolled ? 'text-gray-900' : 'text-white'}`}
            >
              Rapictrl
            </a>

            <nav className="hidden lg:flex items-center gap-7">
              <Dropdown label="Funcionalidades" items={funcionalidades} isScrolled={isScrolled} />
              <Dropdown label="Recursos" items={recursos} isScrolled={isScrolled} />
              <Link to="/precios" className={`font-medium transition-colors ${linkColor}`}>
                Precios
              </Link>
            </nav>
          </div>

          {/* RIGHT: Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className={`font-medium transition-colors px-3 py-2 ${linkColor}`}>
              Iniciar Sesión
            </Link>
            <a
              href="https://wa.me/570000000000?text=Hola,%20me%20gustaría%20solicitar%20una%20demo%20de%20Rapictrl."
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium transition-colors px-4 py-2 rounded-lg border-2 ${
                isScrolled
                  ? 'border-blue-800 text-blue-800 hover:bg-blue-50'
                  : 'border-white/60 text-white hover:bg-white/10'
              }`}
            >
              Solicita una Demo
            </a>
            <button
              onClick={() => openGoogleRegister()}
              disabled={isLoading}
              className="flex items-center gap-2 text-white font-semibold py-2 px-5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isLoading ? 'Cargando...' : 'Regístrate'}
            </button>
          </div>

          {/* Mobile menu button */}
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

        {/* Mobile Menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-screen mt-4' : 'max-h-0'}`}>
          <div
            className="rounded-lg"
            style={isScrolled ? { backgroundColor: '#ffffff' } : { background: 'linear-gradient(135deg, #030d1f 0%, #0c2044 100%)' }}
          >
            <nav className="py-4 px-5 space-y-2">
              <Dropdown label="Funcionalidades" items={funcionalidades} isScrolled={isScrolled} isMobile />
              <Dropdown label="Recursos" items={recursos} isScrolled={isScrolled} isMobile />

              <Link
                to="/precios"
                onClick={() => setIsMenuOpen(false)}
                className={`block font-medium py-2 rounded-md text-center transition-colors ${isScrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-slate-300 hover:bg-white/10'}`}
              >
                Precios
              </Link>
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className={`block font-medium py-2 rounded-md text-center transition-colors ${isScrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-slate-300 hover:bg-white/10'}`}
              >
                Iniciar Sesión
              </Link>

              <div className="border-t pt-4 mt-2 space-y-2 border-white/10">
                <a
                  href="https://wa.me/570000000000?text=Hola,%20me%20gustaría%20solicitar%20una%20demo%20de%20Rapictrl."
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full text-center font-semibold py-2 px-5 rounded-lg border-2 ${
                    isScrolled ? 'border-blue-800 text-blue-800' : 'border-white/60 text-white'
                  }`}
                >
                  Solicita una Demo
                </a>
                <button
                  onClick={() => { setIsMenuOpen(false); openGoogleRegister(); }}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 w-full text-white font-semibold py-2 px-5 rounded-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Regístrate con Google
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
