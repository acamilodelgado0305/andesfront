import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import axios from 'axios';
import {
  Check, Copy, ChevronRight, ShieldCheck,
  Building2, Smartphone, MessageCircle, Clock, AlertCircle
} from 'lucide-react';

const AUTH_URL = import.meta.env.VITE_API_AUTH_SERVICE || 'http://localhost:3001';

const BANK_INFO = {
  banco: 'Bancolombia',
  tipoCuenta: 'Cuenta de Ahorros',
  numeroCuenta: '123-456789-12',
  titular: 'Rapictrl SAS',
  nit: '901.234.567-8',
};

const fmt = (n) => n?.toLocaleString('es-CO');

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).catch(() => {});
};

const StepBadge = ({ n, label, active, done }) => (
  <div className="flex items-center gap-2">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
      done ? 'bg-green-500 text-white' : active ? 'text-white' : 'bg-gray-200 text-gray-500'
    }`} style={active && !done ? { background: 'linear-gradient(135deg, #1d4ed8, #0a1f3d)' } : {}}>
      {done ? <Check size={14} /> : n}
    </div>
    <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
  </div>
);

const CopyField = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copiar">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
        </button>
      </div>
    </div>
  );
};

const PAYMENT_METHODS = [
  { id: 'transfer', label: 'Transferencia bancaria', icon: Building2, desc: 'PSE / Cuenta bancaria' },
  { id: 'whatsapp', label: 'Coordinar por WhatsApp', icon: MessageCircle, desc: 'Te guiamos en el proceso' },
];

const Pago = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useContext(AuthContext);

  const [method, setMethod] = useState('transfer');
  const [step, setStep] = useState(1); // 1=selección, 2=instrucciones, 3=confirmado
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState('');
  const [subscriptionId, setSubscriptionId] = useState(null);

  const state = location.state;
  const plan = state?.plan;
  const isAnnual = state?.isAnnual ?? false;

  const price = isAnnual ? plan?.annualPrice : plan?.monthlyPrice;
  const planDbId = isAnnual ? plan?.planDbId?.annual : plan?.planDbId?.monthly;
  const billingLabel = isAnnual ? 'Anual' : 'Mensual';

  // Generar referencia única al cargar
  useEffect(() => {
    if (!plan) { navigate('/precios'); return; }
    if (!isAuthenticated) { navigate('/login'); return; }
    const bid = user?.business_id || user?.bid || '0';
    setReference(`QC-${bid}-${Date.now().toString().slice(-6)}`);
  }, []);

  if (!plan) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${AUTH_URL}/api/auth/subscriptions/request`,
        { planId: planDbId, billingType: isAnnual ? 'annual' : 'monthly', reference, amount: price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubscriptionId(data.subscriptionId);
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar la solicitud. Inténtalo de nuevo.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ─── PASO 3: Confirmación ─────────────────── */
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud registrada!</h1>
          <p className="text-gray-500 mb-6">
            Recibimos tu solicitud de suscripción al <strong>Plan {plan.name} — {billingLabel}</strong>.
            Una vez verifiquemos el pago, tu cuenta será activada en menos de 24 horas.
          </p>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-blue-600 font-semibold uppercase mb-2">Resumen de tu solicitud</p>
            <CopyField label="Referencia de pago" value={reference} />
            <CopyField label="Plan" value={`Plan ${plan.name} — ${billingLabel}`} />
            <CopyField label="Valor" value={`$${fmt(price)} COP`} />
          </div>

          <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 mb-8 text-left">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Recuerda incluir la referencia <strong>{reference}</strong> en el concepto de la transferencia para agilizar la activación.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://wa.me/570000000000?text=Hola,%20realicé%20el%20pago%20del%20Plan%20${encodeURIComponent(plan.name)}%20por%20$${fmt(price)}%20COP.%20Mi%20referencia%20es%20${reference}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: '#25d366' }}
            >
              <MessageCircle size={16} /> Confirmar por WhatsApp
            </a>
            <Link
              to="/inicio"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0a1f3d)' }}
            >
              Ir al inicio
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── PASOS 1 y 2 ──────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar mínima */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/precios" className="text-xl font-bold text-gray-900">Rapictrl</Link>
        <div className="hidden sm:flex items-center gap-6">
          <StepBadge n={1} label="Elige plan" done={true} />
          <ChevronRight size={14} className="text-gray-300" />
          <StepBadge n={2} label="Pago" active={true} />
          <ChevronRight size={14} className="text-gray-300" />
          <StepBadge n={3} label="Confirmación" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck size={14} className="text-green-500" /> Pago seguro
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Columna izquierda: Resumen del pedido ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header del plan */}
            <div className="p-5" style={{ background: 'linear-gradient(135deg, #030d1f 0%, #0a1f3d 100%)' }}>
              <p className="text-blue-300 text-xs font-semibold uppercase mb-1">Tu suscripción</p>
              <h2 className="text-white text-xl font-bold">Plan {plan.name}</h2>
              <p className="text-slate-400 text-sm">{billingLabel}</p>
            </div>

            {/* Precio */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-gray-900">${fmt(price)}</p>
                  <p className="text-sm text-gray-500">COP · Pago {billingLabel.toLowerCase()}</p>
                </div>
                {isAnnual && (
                  <div className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-lg">
                    Ahorra ${fmt(plan.savingsAnnual)}
                  </div>
                )}
              </div>
            </div>

            {/* Features incluidas */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Incluye</p>
              <ul className="space-y-2">
                {plan.features.filter(f => f.included).map(f => (
                  <li key={f.text} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={14} style={{ color: '#16a34a' }} className="flex-shrink-0" />
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cambiar plan */}
          <Link to="/precios" className="block text-center text-sm text-blue-600 hover:underline">
            ← Cambiar plan
          </Link>

          {/* Seguridad */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-green-500" />
              <span className="text-sm font-semibold text-gray-700">Pago 100% seguro</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-2"><Check size={11} className="text-green-500" /> Datos cifrados con SSL</div>
              <div className="flex items-center gap-2"><Check size={11} className="text-green-500" /> Activación en menos de 24h</div>
              <div className="flex items-center gap-2"><Check size={11} className="text-green-500" /> Soporte por WhatsApp</div>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: Método de pago ── */}
        <div className="lg:col-span-3 space-y-5">
          <h2 className="text-xl font-bold text-gray-900">Completa tu pago</h2>

          {/* Selector de método */}
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    method === m.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${method === m.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icon size={18} style={{ color: method === m.id ? '#1d4ed8' : '#6b7280' }} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${method === m.id ? 'text-blue-800' : 'text-gray-700'}`}>
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-500">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Contenido según método */}
          <motion.div
            key={method}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {method === 'transfer' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-1">Datos bancarios</h3>
                  <p className="text-sm text-gray-500">Realiza la transferencia con los siguientes datos y usa la referencia como concepto de pago.</p>
                </div>

                <div className="p-5">
                  <CopyField label="Banco" value={BANK_INFO.banco} />
                  <CopyField label="Tipo de cuenta" value={BANK_INFO.tipoCuenta} />
                  <CopyField label="Número de cuenta" value={BANK_INFO.numeroCuenta} />
                  <CopyField label="Titular" value={BANK_INFO.titular} />
                  <CopyField label="NIT" value={BANK_INFO.nit} />
                </div>

                <div className="mx-5 mb-5 bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Referencia de pago (obligatoria)</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-900 tracking-wider">{reference}</span>
                    <button
                      onClick={() => copyToClipboard(reference)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Copy size={13} /> Copiar
                    </button>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Incluye este código en el concepto de la transferencia.</p>
                </div>

                <div className="px-5 pb-5">
                  <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 mb-5">
                    <Clock size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Después de realizar la transferencia, haz clic en <strong>"Ya realicé el pago"</strong>. Verificaremos y activaremos tu cuenta en menos de 24 horas.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="w-full text-white font-bold py-3.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)' }}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Registrando solicitud...
                        </span>
                      ) : (
                        <>
                          <Check size={18} /> Ya realicé el pago
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/570000000000?text=Hola,%20quiero%20suscribirme%20al%20Plan%20${encodeURIComponent(plan.name)}%20${billingLabel}%20por%20$${fmt(price)}%20COP.%20Mi%20referencia%20es%20${reference}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle size={16} className="text-green-500" /> Coordinar pago por WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}

            {method === 'whatsapp' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={28} className="text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Coordina tu pago por WhatsApp</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Habla directamente con nuestro equipo. Te ayudamos a elegir el mejor método de pago y activamos tu cuenta de inmediato.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-semibold">Plan {plan.name} — {billingLabel}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Valor</span><span className="font-semibold">${fmt(price)} COP</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Referencia</span><span className="font-mono font-semibold text-blue-700">{reference}</span></div>
                </div>

                <a
                  href={`https://wa.me/570000000000?text=Hola,%20quiero%20suscribirme%20al%20Plan%20${encodeURIComponent(plan.name)}%20${billingLabel}%20por%20$${fmt(price)}%20COP.%20Mi%20referencia%20es%20${reference}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-bold text-base transition-opacity hover:opacity-90"
                  style={{ background: '#25d366' }}
                >
                  <MessageCircle size={20} /> Abrir WhatsApp
                </a>

                <p className="text-xs text-center text-gray-400">
                  Atención de lunes a viernes, 8am–6pm. Respuesta en menos de 2 horas.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Pago;
