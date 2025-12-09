import React, { useState, useId } from 'react';
// ICONOS Y UTILIDADES
import {
  AlertCircle, ArrowLeft, ShieldCheck, Fingerprint, Clock, Loader2,
  Info, // Icono para "Información"
  DollarSign // Icono para "Pago"
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// Se mantiene 'notification' para los errores
import { notification } from 'antd';

// URL del backend (son las mismas)
const API_BACKEND_FINANZAS = import.meta.env.VITE_API_FINANZAS || 'https://backendcoalianza.vercel.app/api';

// --- SUB-COMPONENTE: Formulario de Verificación (sin cambios) ---
// Este componente es idéntico al de Verificacion.jsx
const VerificationForm = ({ cedula, setCedula, handleValidate, isLoading, error }) => (
  <div className="space-y-6">
    <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Consulte su Pre-Registro</h3>
      <p className="text-slate-600">
        Ingrese su número de documento para validar la información de su pre-registro.
      </p>
    </div>
    <div>
      <label htmlFor="cedula" className="block text-sm font-medium text-slate-700 mb-2">
        Número de Documento <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="cedula"
        placeholder="Ingrese el número de documento sin puntos ni comas"
        value={cedula}
        onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
        className="w-full p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
      />
    </div>

    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center text-red-700 bg-red-50 p-4 rounded-md border border-red-200"
        >
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}
    </AnimatePresence>

    <button
      onClick={handleValidate}
      disabled={isLoading || !cedula.trim()}
      className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold uppercase tracking-wider shadow-sm"
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Consultando...
        </span>
      ) : 'Consultar Pre-Registro'}
    </button>
  </div>
);

// --- ¡NUEVO! SUB-COMPONENTE: Despliegue del Pre-Registro ---
// Este componente reemplaza a 'CertificateDisplay'.
// Muestra los datos y el mensaje de pago, SIN descargas.
const PreRegistroDisplay = ({ data, resetForm }) => {
  const formatDateTime = (date) => format(date, "d 'de' MMMM 'de' yyyy, h:mm:ss a", { locale: es });
  const verificationId = useId();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200">
        
        {/* Cabecera */}
        <div className="bg-slate-50 px-6 py-4 rounded-t-lg border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Resultado de Pre-Registro</h3>
        </div>

        {/* Mensaje de Info */}
        <div className="text-center p-6 border-b border-slate-200">
          <Info className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Pre-Registro Encontrado</h2>
          <p className="text-slate-500">Hemos validado su pre-registro en nuestro sistema. Por favor, verifique que sus datos sean correctos.</p>
        </div>

        {/* Datos del Usuario */}
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-slate-500">Nombre Completo</dt>
              <dd className="text-lg font-semibold text-slate-900">{`${data.nombre} ${data.apellido}`}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Documento de Identidad</dt>
              <dd className="text-lg font-semibold text-slate-900">{data.numeroDeDocumento}</dd>
            </div>
            {/* Puedes añadir más campos del 'data' aquí si los necesitas (ej. email, teléfono) */}
          </dl>
        </div>

        {/* === ZONA DE PAGO (LA PARTE CLAVE) === */}
        <div className="border-t border-slate-200 p-6 space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-yellow-700" />
              </div>
              <div className="ml-3">
                <h4 className="text-base font-semibold text-yellow-800">Acción Requerida: Completar Pago</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Sus datos de pre-registro son correctos. Para finalizar su inscripción y obtener su <strong>certificado y carnet</strong> de manipulación de alimentos, debe realizar el pago correspondiente.
                </p>
                {/* AQUÍ DEBES ENLAZAR A TU PÁGINA DE PAGOS.
                  Puede ser un link a otra ruta de tu app React...
                */}
                <Link 
                  to="/zona-de-pagos" // O la URL de tu pasarela de pago (Wompi, MercadoPago, etc.)
                  className="inline-flex items-center justify-center mt-4 px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold shadow-sm transition-colors"
                >
                  Realizar Pago Ahora
                </Link>
                {/* ...o puedes poner un botón que abra un modal de pago. */}
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página de consulta */}
        <div className="bg-slate-50 px-6 py-4 rounded-b-lg border-t border-slate-200 space-y-3">
          <div className="flex items-center text-xs text-slate-500">
            <Fingerprint className="w-4 h-4 mr-2" />
            <strong>ID de Consulta:</strong><span className="ml-1 font-mono">{verificationId}</span>
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <Clock className="w-4 h-4 mr-2" />
            <strong>Fecha de Consulta:</strong><span className="ml-1">{formatDateTime(new Date())}</span>
          </div>
        </div>

      </div>

      {/* Botón de reset */}
      <button
        onClick={resetForm}
        className="w-full px-6 py-3 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors font-semibold uppercase tracking-wider"
      >
        Consultar otro documento
      </button>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL (MODIFICADO) ---
const ConsultaPreRegistro = () => {
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState('');
  const [certificateData, setCertificateData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  // ¡ELIMINADOS! No se necesitan 'downloading' ni 'handleDownload'

  // --- LÓGICA DE VALIDACIÓN (sin cambios) ---
  const handleValidate = async () => {
    if (!cedula.trim() || cedula.length < 5) {
      setError('Por favor ingrese un número de documento válido.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Se asume que el mismo endpoint sirve para pre-registros y registros
      const response = await fetch(`${API_BACKEND_FINANZAS}/clients/${cedula}`);
      
      if (response.status === 404) {
        throw new Error('Pre-registro no encontrado');
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ocurrió un error en la consulta');
      }
      
      const data = await response.json();
      
      // NOTA: Si tu API devuelve un campo como "esPreRegistro: false" 
      // para gente que YA pagó, podrías querer añadir un 'if' aquí
      // para redirigirlos a la página de /verificacion.
      // Pero por ahora, asumimos que este endpoint SÓLO valida pre-registros.

      setCertificateData(data);
      setValidationSuccess(true);
    } catch (error) {
      setError('No se encontró un pre-registro válido para este número de documento.');
      setCertificateData(null);
      setValidationSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCedula('');
    setError('');
    setCertificateData(null);
    setValidationSuccess(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-slate-200">
          
          {/* --- Encabezado Modificado --- */}
          <div className="p-6 md:p-8 border-b border-slate-200">
            <Link to="/" className="inline-flex items-center text-sm text-green-600 hover:text-green-800 mb-6 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Consulta de Pre-Registro</h1>
              </div>
              <div className="flex-shrink-0 flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-md text-sm font-semibold">
                <Info className="w-5 h-5 mr-2" />
                <span>Validación de Datos</span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={validationSuccess ? 'result-preregistro' : 'form-preregistro'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {!validationSuccess ? (
                  <VerificationForm
                    cedula={cedula}
                    setCedula={setCedula}
                    handleValidate={handleValidate}
                    isLoading={isLoading}
                    error={error}
                  />
                ) : (
                  // --- Renderizado Modificado ---
                  // Aquí se llama al nuevo componente PreRegistroDisplay
                  <PreRegistroDisplay
                    data={certificateData}
                    resetForm={resetForm}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* --- Footer (sin cambios) --- */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p className="font-semibold">Alimentos Inocuos - NIT 712.121.85-2</p>
          <p>Avalado por Seccional de Salud de Antioquia CSO-2018</p>
          <p className="mt-4">Todos los derechos reservados © 2025</p>
        </div>
      </div>
    </div>
  );
};

export default ConsultaPreRegistro;