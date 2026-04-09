import React, { useState } from 'react';
import {
  AlertCircle, ArrowLeft, ShieldCheck, Fingerprint, Clock,
  DownloadCloud, Loader2, FileText, CheckCircle2, Award,
  Landmark, MapPin, Database, FolderOpen, Info, ChevronRight,
  Smartphone, Monitor, Apple
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notification } from 'antd';
import { getClientByCedula } from '../../services/controlapos/posService';

const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND || 'https://backendcoalianza.vercel.app/api';

const extractIntensity = (courseName) => {
  if (!courseName) return '10';
  const numbers = courseName.match(/(\d+)/g);
  const hours = numbers && numbers.length > 0 ? numbers[numbers.length - 1] : '10';
  return `${hours}`;
};

// Bandera de Colombia (pequeña, discreta)
const ColombiaBandera = ({ className = "w-9 h-6" }) => (
  <svg viewBox="0 0 300 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="200" fill="#FCD116" />
    <rect y="100" width="300" height="50" fill="#003893" />
    <rect y="150" width="300" height="50" fill="#CE1126" />
  </svg>
);

// Sello de agua en tarjetas
const OfficialSeal = () => (
  <div className="absolute -top-3 -right-3 w-20 h-20 opacity-[0.04] pointer-events-none overflow-hidden">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <path id="curve" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" fill="transparent" />
      <text fill="#003366" fontSize="9" fontWeight="bold">
        <textPath href="#curve" letterSpacing="3">QCONTROLA · VALIDEZ NACIONAL ·</textPath>
      </text>
    </svg>
  </div>
);

// =============================================================================
// PANEL DE INSTRUCCIONES DE DESCARGA — prominente y claro
// =============================================================================
const DownloadInstructions = () => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden"
  >
    {/* Cabecera */}
    <div className="bg-[#003366] px-5 py-3 flex items-center gap-2">
      <FolderOpen className="w-4 h-4 text-white/80" />
      <h4 className="text-sm font-bold text-white uppercase tracking-wide">
        ¿Cómo descargar y dónde encontrar sus documentos?
      </h4>
    </div>

    <div className="p-5 space-y-4">
      {/* Paso a paso */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="w-6 h-6 rounded-full bg-[#003366] text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Haga clic en el botón <strong className="text-[#003366]">CERTIFICADO PDF</strong> o <strong className="text-[#003366]">CARNET DIGITAL</strong> de su curso.
          </p>
        </div>
        <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="w-6 h-6 rounded-full bg-[#003366] text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            El archivo <strong>se descarga automáticamente</strong> — no necesita hacer nada más, espere unos segundos.
          </p>
        </div>
        <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="w-6 h-6 rounded-full bg-[#003366] text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Busque el archivo en la <strong className="text-[#003366]">carpeta Descargas</strong> de su dispositivo según la guía de abajo.
          </p>
        </div>
      </div>

      {/* Dónde encontrarlo por dispositivo */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dónde encontrar la carpeta Descargas:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <Monitor className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-700">PC (Windows / Mac)</p>
              <p className="text-[11px] text-slate-500">Carpeta <span className="font-semibold text-slate-700">"Descargas"</span> o <span className="font-semibold text-slate-700">"Downloads"</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <Smartphone className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-700">Android</p>
              <p className="text-[11px] text-slate-500"><span className="font-semibold text-slate-700">Mis Archivos</span> → <span className="font-semibold text-slate-700">Descargas</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <Apple className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-700">iPhone / iPad</p>
              <p className="text-[11px] text-slate-500">App <span className="font-semibold text-slate-700">"Archivos"</span> → <span className="font-semibold text-slate-700">Descargas</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// =============================================================================
// TARJETA DE CURSO
// =============================================================================
const CourseCard = ({ courseName, userData, onDownload, downloading }) => {
  const formatDate = (ds) => format(new Date(ds), "dd 'de' MMMM, yyyy", { locale: es });
  const nameLower = courseName.toLowerCase();
  const isFoodHandling = nameLower.includes('manipulac') || nameLower.includes('alimentos');
  const isExcel = nameLower.includes('excel');

  let legalContext = {
    title: "Certificación de Competencias",
    law: "Normativa Educativa Vigente",
    accent: "border-slate-300",
  };
  if (isFoodHandling) {
    legalContext = {
      title: "Validez Nacional (Colombia)",
      law: "Res. 2674/2013 — Dec. 3075/1997",
      accent: "border-[#003366]",
    };
  } else if (isExcel) {
    legalContext = {
      title: "Formación Laboral",
      law: "Habilidades Ofimáticas y Digitales",
      accent: "border-slate-400",
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden relative border border-slate-200"
    >
      <OfficialSeal />

      {/* Cabecera de la tarjeta */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Folio: {userData.numeroDeDocumento}
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase border border-green-200">
          <CheckCircle2 className="w-3 h-3" /> Vigente
        </span>
      </div>

      <div className="p-6">
        <h3 className="text-base font-extrabold text-[#003366] leading-snug mb-3">{courseName}</h3>

        {/* Contexto legal */}
        <div className={`pl-3 py-2 mb-4 bg-slate-50 border-l-4 ${legalContext.accent} rounded-r text-xs text-slate-600`}>
          <p className="font-bold uppercase flex items-center gap-1 text-slate-700">
            <MapPin className="w-3 h-3" /> {legalContext.title}
          </p>
          <p className="italic mt-0.5 text-slate-400">{legalContext.law}</p>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600 mb-5">
          <div className="col-span-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#003366]" />
            <span className="font-medium">Intensidad:</span>
            <span className="font-bold text-[#003366]">{extractIntensity(courseName)} horas</span>
          </div>
          <div>
            <span className="text-slate-400">Expedición: </span>
            <span className="font-semibold">{userData.createdAt ? formatDate(userData.createdAt) : 'N/A'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Vence: </span>
            <span className="font-bold text-[#003366]">{userData.fechaVencimiento ? formatDate(userData.fechaVencimiento) : 'N/A'}</span>
          </div>
        </div>

        {/* Aval */}
        <div className="flex items-start gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <Landmark className="w-5 h-5 text-[#003366] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <strong className="text-[#003366]">Cobertura Nacional</strong> — Válido ante entes de control en todo el territorio de la República de Colombia.
          </p>
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onDownload('certificado', courseName)}
            disabled={!!downloading}
            className={`flex items-center justify-center gap-2 py-3 px-3 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-lg shadow transition-colors disabled:opacity-60 active:scale-95 ${isExcel ? 'col-span-2' : ''}`}
          >
            {downloading === 'certificado'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <DownloadCloud className="w-4 h-4" />}
            CERTIFICADO PDF
          </button>

          {isFoodHandling && (
            <button
              onClick={() => onDownload('carnet', courseName)}
              disabled={!!downloading}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-white border-2 border-[#003366] text-[#003366] text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60 active:scale-95"
            >
              {downloading === 'carnet'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />}
              CARNET DIGITAL
            </button>
          )}
        </div>

        {/* Recordatorio de descarga */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <FolderOpen className="w-3 h-3" />
          <span>Su archivo se guardará en <strong className="text-slate-500">Descargas</strong> de su dispositivo</span>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
const Verificacion = () => {
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const handleValidate = async () => {
    if (!cedula.trim() || cedula.length < 5) {
      setError('Por favor ingrese un número de documento válido.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await getClientByCedula(cedula);
      if (!data || !data.numeroDeDocumento) throw new Error('Datos inválidos.');
      setStudentData(data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('El documento no registra certificaciones activas en la base de datos de Qcontrola.');
      } else {
        setError('No se pudo conectar con el servidor de Qcontrola. Intente más tarde.');
      }
      setStudentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (docType, courseName) => {
    const intensity = extractIntensity(courseName);
    const notificationKey = 'download-toast';
    setDownloading(docType);

    notification.open({
      key: notificationKey,
      message: 'Generando documento...',
      description: 'Esto puede tardar unos segundos. No cierre esta página.',
      icon: <Loader2 className="text-[#003366] animate-spin" />,
      duration: 0,
    });

    try {
      const { nombre, apellido, numeroDeDocumento } = studentData;
      const tipoDocumento =
        studentData.tipoDeDocumento ||
        studentData.tipoDocumento ||
        studentData.tipo_documento ||
        'C.C';
      const fullName = `${nombre} ${apellido}`;

      let endpoint = '';
      if (docType === 'certificado') {
        endpoint = courseName.toLowerCase().includes('excel')
          ? `${API_BACKEND_URL}/api/generar-certificado-pdf`
          : `${API_BACKEND_URL}/api/generar-certificado`;
      } else {
        endpoint = `${API_BACKEND_URL}/api/generar-carnet`;
      }

      const requestOptions = { method: 'POST' };
      if (docType === 'certificado') {
        requestOptions.headers = { 'Content-Type': 'application/json' };
        requestOptions.body = JSON.stringify({
          nombre: fullName,
          numeroDocumento: numeroDeDocumento,
          tipoDocumento,
          curso: courseName,
          intensidadHoraria: intensity,
        });
      } else {
        const fd = new FormData();
        fd.append('nombre', fullName);
        fd.append('numeroDocumento', numeroDeDocumento);
        fd.append('tipoDocumento', tipoDocumento);
        fd.append('intensidadHoraria', intensity);
        requestOptions.body = fd;
      }

      const response = await fetch(endpoint, requestOptions);
      if (!response.ok) throw new Error('Error server');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${docType}_${fullName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      notification.success({
        message: 'Descarga exitosa',
        description: (
          <span>
            Su documento fue descargado. Búsquelo en la carpeta{' '}
            <strong>Descargas</strong> de su dispositivo.
          </span>
        ),
        duration: 8,
      });
    } catch {
      notification.error({ message: 'Error', description: 'No se pudo generar el documento. Intente nuevamente.' });
    } finally {
      notification.destroy(notificationKey);
      setDownloading(null);
    }
  };

  const resetForm = () => {
    setCedula('');
    setError('');
    setStudentData(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans text-slate-800">

      {/* ── HEADER limpio ── */}
      <header className="bg-[#003366] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">

          {/* Logo + bandera */}
          <div className="flex items-center gap-3">
            <ColombiaBandera className="w-10 h-7 rounded shadow border border-white/20" />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight uppercase leading-none">QCONTROLA</h1>
              <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-[0.2em] mt-0.5">
                Portal de Verificación · Colombia
              </p>
            </div>
          </div>

          {/* Estado activo + volver */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/15">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-green-200 uppercase tracking-wider">En línea</span>
            </div>
            <Link
              to="/"
              className="text-xs font-bold text-white/80 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg border border-white/10 transition-colors uppercase tracking-wide"
            >
              <ArrowLeft className="w-3 h-3" /> Volver
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── FORMULARIO ── */}
          {!studentData ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">

                {/* Encabezado */}
                <div className="bg-[#003366] px-8 pt-8 pb-7 text-center">
                  <div className="inline-flex p-3.5 bg-white/10 rounded-2xl mb-4 border border-white/20">
                    <ShieldCheck className="w-9 h-9 text-white" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white leading-tight">Consulta de Certificados</h2>
                  <p className="text-blue-200 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                    Ingrese su número de documento para ver y descargar sus certificados oficiales.
                  </p>
                </div>

                {/* Campos */}
                <div className="px-8 py-7 space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Documento de Identidad
                    </label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#003366]" />
                      <input
                        type="text"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none transition-all font-semibold text-lg placeholder:text-slate-300 text-slate-800"
                        placeholder="Ej: 1012345678"
                        maxLength={12}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Solo números, sin puntos ni espacios
                    </p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2.5 border border-red-200"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button
                    onClick={handleValidate}
                    disabled={isLoading || !cedula}
                    className="w-full py-3.5 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Consultando...</>
                    ) : (
                      <><Database className="w-4 h-4" /> Consultar <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <ShieldCheck className="w-3 h-3 text-green-500" /> Consulta segura y confidencial
                  </span>
                  <span className="hidden sm:block text-slate-200">·</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <ColombiaBandera className="w-5 h-3.5 rounded-sm" /> Validez en Colombia
                  </span>
                </div>
              </div>
            </motion.div>

          ) : (

            /* ── RESULTADOS ── */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >

              {/* Datos del titular */}
              <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 mb-5 border-l-4 border-l-[#003366] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#003366] rounded-xl flex items-center justify-center text-white text-xl font-extrabold shadow-md flex-shrink-0">
                    {studentData.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 capitalize leading-tight">
                      {studentData.nombre} {studentData.apellido}
                    </h2>
                    <p className="text-slate-500 text-sm flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-medium text-slate-600">
                        {studentData.tipoDeDocumento || studentData.tipoDocumento || studentData.tipo_documento || 'C.C'} {studentData.numeroDeDocumento}
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 border border-green-200">
                        <CheckCircle2 className="w-3 h-3" /> Validado
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="text-xs font-bold text-[#003366] border-2 border-[#003366] px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wide"
                >
                  Nueva consulta
                </button>
              </div>

              {/* INSTRUCCIONES DE DESCARGA */}
              <DownloadInstructions />

              {/* Certificaciones */}
              <div className="mb-6">
                <h3 className="text-base font-extrabold text-[#003366] mb-4 flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Award className="w-5 h-5" /> Certificaciones Disponibles
                </h3>

                {Array.isArray(studentData.tipo) && studentData.tipo.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {studentData.tipo.map((curso, idx) => (
                      <CourseCard
                        key={idx}
                        courseName={curso}
                        userData={studentData}
                        onDownload={handleDownload}
                        downloading={downloading}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No hay cursos activos para este usuario.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <ColombiaBandera className="w-8 h-5 rounded shadow-sm" />
                  <p className="text-xs text-slate-500">
                    <strong className="text-[#003366]">Qcontrola</strong> — Certificados con validez en la República de Colombia.
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  © {new Date().getFullYear()} Qcontrola · Res. 2674/2013
                </p>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default Verificacion;
