import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, RefreshCw, MessageCircle, ArrowRight, Loader } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE || 'http://localhost:3001';

const PLAN_NAMES = {
  'qc-admin-mon':    'Plan Admin Mensual',
  'qc-admin-ann':    'Plan Admin Anual',
  'qc-edu-mon':      'Plan Educativo Mensual',
  'qc-edu-ann':      'Plan Educativo Anual',
  'qc-pos-ba-mon':   'Plan POS Básico Mensual',
  'qc-pos-ba-ye':    'Plan POS Básico Anual',
  'qc-edu-pos-mon':  'Plan Educativo+POS Mensual',
  'qc-edu-pos-ann':  'Plan Educativo+POS Anual',
  'qc-pos-ali-mon':  'Plan POS Alianza Mensual',
  'qc-pos-ali-ann':  'Plan POS Alianza Anual',
};

const PagoResultado = () => {
  const [params] = useSearchParams();
  const { token } = useContext(AuthContext);

  const wompiId = params.get('id')        || '';
  const status  = params.get('status')?.toUpperCase() || 'PENDING';
  const sku     = params.get('reference') || '';
  const planName = PLAN_NAMES[sku] || sku;

  // Estado de verificación de suscripción (solo para APPROVED)
  const [verifying, setVerifying]       = useState(status === 'APPROVED');
  const [subActive, setSubActive]       = useState(false);
  const [subDetails, setSubDetails]     = useState(null);
  const [verifyFailed, setVerifyFailed] = useState(false);

  // Puntos animados para PENDING
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (status !== 'PENDING') return;
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, [status]);

  // Verificar si la suscripción quedó activa (máx 5 intentos, cada 2s)
  useEffect(() => {
    if (status !== 'APPROVED' || !token) {
      setVerifying(false);
      return;
    }

    let attempts = 0;
    const MAX    = 6;
    const DELAY  = 2500; // ms entre intentos

    const check = async () => {
      attempts++;
      try {
        const { data } = await axios.get(`${AUTH_URL}/api/businesses/my/subscription`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.active) {
          setSubActive(true);
          setSubDetails(data.subscription);
          setVerifying(false);
          return;
        }
      } catch (_) {
        // silenciar errores de red, seguir intentando
      }

      if (attempts < MAX) {
        setTimeout(check, DELAY);
      } else {
        // Agotamos intentos: el webhook probablemente aún está en camino
        setVerifyFailed(true);
        setVerifying(false);
      }
    };

    // Primer intento después de 2s para dar tiempo al webhook
    setTimeout(check, 2000);
  }, [status, token]);

  /* ─── Pantalla de verificando ─────────────────────────── */
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-6">
        <Link to="/" className="text-2xl font-bold text-gray-900">Rapictrl</Link>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl border border-blue-100 w-full max-w-md p-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <Loader size={36} className="text-blue-500 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Confirmando tu pago…</h1>
          <p className="text-gray-500 text-sm">
            Wompi aprobó tu transacción. Estamos activando tu suscripción, tarda unos segundos.
          </p>
        </motion.div>
      </div>
    );
  }

  /* ─── Pantalla de resultado final ─────────────────────── */
  const isApproved  = status === 'APPROVED';
  const isDeclined  = status === 'DECLINED' || status === 'ERROR';
  const isPending   = status === 'PENDING';
  const isVoided    = status === 'VOIDED';

  const config = {
    APPROVED: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200',
      title: subActive ? '¡Suscripción activa!' : '¡Pago aprobado!',
      subtitle: subActive
        ? `Tu plan "${subDetails?.plan_name || planName}" está activo. Puedes usar la plataforma ahora mismo.`
        : verifyFailed
          ? 'Tu pago fue aprobado por Wompi. La activación del plan puede tardar 1–2 minutos. Si en 5 minutos no ves tu plan activo, contáctanos.'
          : 'Tu pago fue aprobado. Tu suscripción ha sido activada.' },
    DECLINED: { icon: XCircle,    color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-200',
      title: 'Pago rechazado',
      subtitle: 'La transacción no pudo completarse. Verifica los datos de tu método de pago e intenta de nuevo.' },
    PENDING:  { icon: Clock,      color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200',
      title: `Pago en proceso${dots}`,
      subtitle: 'Tu pago está siendo procesado. Recibirás una confirmación en tu correo cuando sea aprobado.' },
    VOIDED:   { icon: XCircle,    color: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-200',
      title: 'Transacción anulada',
      subtitle: 'La transacción fue anulada. Si crees que esto es un error, contáctanos por WhatsApp.' },
    ERROR:    { icon: RefreshCw,  color: 'text-orange-500',bg: 'bg-orange-50',border: 'border-orange-200',
      title: 'Error en la transacción',
      subtitle: 'Ocurrió un problema técnico. Por favor intenta de nuevo o contáctanos.' },
  };

  const cfg  = config[status] || config.PENDING;
  const Icon = cfg.icon;

  const whatsappText = encodeURIComponent(
    `Hola, realicé un pago en QControla.\nID Wompi: ${wompiId}\nEstado: ${status}\nPlan: ${planName}`
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link to="/" className="text-2xl font-bold text-gray-900 mb-10">Rapictrl</Link>

      <AnimatePresence>
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`bg-white rounded-2xl shadow-xl border ${cfg.border} w-full max-w-md p-8 text-center`}
        >
          {/* Ícono */}
          <div className={`w-20 h-20 rounded-full ${cfg.bg} flex items-center justify-center mx-auto mb-5`}>
            <Icon size={40} className={cfg.color} />
          </div>

          {/* Título y subtítulo */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{cfg.title}</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">{cfg.subtitle}</p>

          {/* Detalle de la transacción */}
          <div className={`${cfg.bg} rounded-xl p-4 text-left mb-6 space-y-2`}>
            {planName && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-semibold text-gray-800">{planName}</span>
              </div>
            )}
            {isApproved && subActive && subDetails?.end_date && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Válido hasta</span>
                <span className="font-semibold text-gray-800">
                  {new Date(subDetails.end_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            {wompiId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ID transacción</span>
                <span className="font-mono text-xs text-gray-500 break-all">{wompiId}</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-3">
            {isApproved && (
              <Link
                to="/inicio"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
              >
                Ir a la plataforma <ArrowRight size={16} />
              </Link>
            )}

            {(isDeclined) && (
              <Link
                to="/precios"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
              >
                <RefreshCw size={16} /> Intentar de nuevo
              </Link>
            )}

            {(isPending || isVoided) && (
              <Link
                to="/inicio"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
              >
                Ir a la plataforma <ArrowRight size={16} />
              </Link>
            )}

            <a
              href={`https://wa.me/570000000000?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              <MessageCircle size={16} className="text-green-500" /> ¿Necesitas ayuda?
            </a>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-xs text-gray-400 mt-6">
        Procesado de forma segura por <strong>Wompi</strong>
      </p>
    </div>
  );
};

export default PagoResultado;
