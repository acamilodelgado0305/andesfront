import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ExternalLink, MessageCircle, LogOut, Lock } from 'lucide-react';
import { AuthContext } from '../AuthContext';

const fmt = (n) => n.toLocaleString('es-CO');

const PLANS = [
  {
    name: 'Básico',
    price: 19900,
    businesses: '1 negocio',
    users: '1 usuario',
    wompiLink: 'https://checkout.wompi.co/l/HtCdUL',
    features: ['POS', 'Inventario', 'Movimientos'],
  },
  {
    name: 'Intermedio',
    price: 39900,
    businesses: '1 negocio',
    users: '2 usuarios',
    wompiLink: null,
    features: ['POS', 'Inventario', 'Movimientos', 'Personas', 'Documentos'],
  },
  {
    name: 'Profesional',
    price: 79900,
    businesses: '2 negocios',
    users: '5 usuarios / negocio',
    wompiLink: null,
    badge: 'Popular',
    features: ['POS', 'Inventario', 'Movimientos', 'Personas', 'Documentos', 'Reportes avanzados'],
  },
  {
    name: 'Empresarial',
    price: 125000,
    businesses: '5 negocios',
    users: 'Ilimitados',
    wompiLink: null,
    features: ['Todo lo anterior', 'Módulo Académico', 'Onboarding', 'Soporte dedicado'],
  },
];

const WA_NUMBER = '570000000000';

const PaymentWall = ({ reason = 'trial_expired' }) => {
  const { logout, user } = useContext(AuthContext);
  const waText = encodeURIComponent(
    `Hola, quiero suscribirme a QControla. Mi correo es ${user?.email || ''}`
  );

  const isTrialExpired = reason === 'trial_expired';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header mínimo */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Rapictrl" className="h-7 w-7 object-contain" />
          <span className="text-base font-bold text-gray-900">Rapictrl</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 py-12">
        {/* Mensaje principal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-xl"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            {isTrialExpired ? 'Tu prueba gratuita ha terminado' : 'Tu suscripción ha vencido'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {isTrialExpired
              ? 'Esperamos que hayas disfrutado los 14 días de acceso completo. Para seguir usando la plataforma, elige un plan a continuación.'
              : 'Tu plan venció. Renueva tu suscripción para recuperar el acceso a todos tus datos y funciones.'}
          </p>
        </motion.div>

        {/* Planes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-6xl">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-white rounded-2xl border flex flex-col overflow-hidden ${
                plan.badge ? 'border-blue-400 shadow-lg shadow-blue-100 ring-1 ring-blue-400' : 'border-gray-200 shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="text-center py-1.5 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0a1f3d)' }}>
                  ★ {plan.badge}
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-gray-900 mb-0.5">Plan {plan.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{plan.businesses} · {plan.users}</p>

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-gray-900">${fmt(plan.price)}</span>
                  <span className="text-gray-400 text-xs ml-1">/mes</span>
                </div>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check size={12} className="text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {plan.wompiLink ? (
                  <a
                    href={plan.wompiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #0a1f3d)' }}
                  >
                    Pagar ahora <ExternalLink size={13} />
                  </a>
                ) : (
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle size={13} className="text-green-500" /> Contratar
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pie */}
        <p className="text-xs text-gray-400 mt-10 text-center">
          ¿Tienes dudas? Escríbenos a{' '}
          <a href={`https://wa.me/${WA_NUMBER}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="text-green-600 font-medium">
            WhatsApp
          </a>{' '}
          y te ayudamos a elegir el plan correcto.
        </p>
      </div>
    </div>
  );
};

export default PaymentWall;
