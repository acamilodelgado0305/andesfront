// Validacion.jsx
import React, { useState, useId } from 'react';
import { AlertCircle, CheckCircle, ArrowLeft, ShieldCheck, Fingerprint, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENTE: Formulario de Verificación ---
const VerificationForm = ({ cedula, setCedula, handleValidate, isLoading, error }) => (
  <div className="space-y-6">
    <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Verifique la autenticidad del certificado</h3>
      <p className="text-slate-600">
        Ingrese el número de documento para validar la certificación en Buenas Prácticas de Manipulación de Alimentos (BPM).
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
        onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} // Solo permite números
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
          Verificando...
        </span>
      ) : 'Validar Certificado'}
    </button>
  </div>
);

// --- SUB-COMPONENTE: Despliegue del Certificado ---
const CertificateDisplay = ({ data, resetForm, verificationId }) => {
  const formatDate = (dateString) => format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es });
  const formatDateTime = (date) => format(date, "d 'de' MMMM 'de' yyyy, h:mm:ss a", { locale: es });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Certificado Válido y Verificado</h2>
        <p className="text-slate-500">La siguiente certificación ha sido encontrada y validada en el sistema de SixNyx.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {/* Encabezado del Certificado */}
        <div className="bg-slate-50 px-6 py-4 rounded-t-lg border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Registro de Certificación</h3>
        </div>
        
        {/* Cuerpo del Certificado */}
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
              <div>
                <dt className="text-sm font-medium text-slate-500">Tipo de Certificación</dt>
                <dd className="text-lg font-semibold text-slate-900">Buenas Prácticas de Manipulación (BPM)</dd>
              </div>
               <div>
                <dt className="text-sm font-medium text-slate-500">Estado</dt>
                <dd className="text-lg font-semibold text-green-600">Vigente</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Fecha de Expedición</dt>
                <dd className="text-lg font-semibold text-slate-900">{formatDate(data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Fecha de Vencimiento</dt>
                <dd className="text-lg font-semibold text-slate-900">{formatDate(data.fechaVencimiento)}</dd>
              </div>
            </dl>
        </div>

        {/* Detalles de la Certificación */}
        <div className="border-t border-slate-200 p-6 space-y-3 text-sm">
             <p className="text-slate-800"><span className="font-semibold">Detalle:</span> Recibió y aprobó la capacitación en Buenas Prácticas de Manipulación de Alimentos (BPM) de acuerdo con el Decreto 3075 de 1997 y la Resolución 2674 de 2013, actualizados según las normativas vigentes en Colombia para 2025.</p>
             <p className="text-slate-800"><span className="font-semibold">Avalado por:</span> Seccional de Salud de Antioquia CSO-2018</p>
             <p className="text-slate-800"><span className="font-semibold">Certificador:</span> William Alzate - NIT 712.121.85-2</p>
        </div>
        
        {/* Pie de página del Certificado con datos de confianza */}
        <div className="bg-slate-50 px-6 py-4 rounded-b-lg border-t border-slate-200 space-y-3">
            <div className="flex items-center text-xs text-slate-500">
                <Fingerprint className="w-4 h-4 mr-2" />
                <strong>ID de Verificación:</strong><span className="ml-1 font-mono">{verificationId}</span>
            </div>
            <div className="flex items-center text-xs text-slate-500">
                <Clock className="w-4 h-4 mr-2" />
                <strong>Fecha de Consulta:</strong><span className="ml-1">{formatDateTime(new Date())}</span>
            </div>
        </div>
      </div>

      <button
        onClick={resetForm}
        className="w-full px-6 py-3 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors font-semibold uppercase tracking-wider"
      >
        Verificar otro certificado
      </button>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---
const Verificacion = () => {
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState('');
  const [certificateData, setCertificateData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const verificationId = useId();

  const handleValidate = async () => {
    if (!cedula.trim() || cedula.length < 5) {
      setError('Por favor ingrese un número de documento válido.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`https://backendcoalianza.vercel.app/api/v1/clients/${cedula}`);
      if (!response.ok) {
        throw new Error('Certificado no encontrado');
      }
      const data = await response.json();
      setCertificateData(data);
      setValidationSuccess(true);
    } catch (error) {
      setError('No se encontró un certificado válido para este número de documento.');
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
    <div className="min-h-screen bg-slate-100   ">
      <div className=" mx-auto">
        
        {/* Contenedor Principal */}
        <div className="bg-white rounded-lg shadow-lg border border-slate-200">
          {/* Encabezado */}
          <div className="p-6 md:p-8 border-b border-slate-200">
            <Link to="/" className="inline-flex items-center text-sm text-green-600 hover:text-green-800 mb-6 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Validación de Certificados</h1>
              </div>
              <div className="flex-shrink-0 flex items-center bg-green-100 text-green-800 px-3 py-1.5 rounded-md text-sm font-semibold">
                <ShieldCheck className="w-5 h-5 mr-2" />
                <span>Certificación Oficial</span>
              </div>
            </div>
          </div>
          
          {/* Cuerpo (Formulario o Resultado) */}
          <div className="p-6 md:p-8">
             <AnimatePresence mode="wait">
                <motion.div
                    key={validationSuccess ? 'result' : 'form'}
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
                      <CertificateDisplay
                        data={certificateData}
                        resetForm={resetForm}
                        verificationId={verificationId}
                      />
                    )}
                </motion.div>
             </AnimatePresence>
          </div>
        </div>
        
        {/* Pie de página */}
        <div className="mt-8 text-center text-sm text-slate-500">
             <p className="font-semibold">Alimentos Inocuos - NIT 712.121.85-2</p>
             <p>Avalado por Seccional de Salud de Antioquia CSO-2018</p>
             <p className="mt-4">Todos los derechos reservados © 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Verificacion;