import React, { useState } from 'react';
import {
  AlertCircle, ArrowLeft, ShieldCheck, Fingerprint, Clock,
  DownloadCloud, Loader2, FileText, CheckCircle2, Award,
  Landmark, ChevronRight, MapPin, Database
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notification } from 'antd';
// Asegúrate de que esta ruta sea la correcta en tu proyecto
import { getClientByCedula } from '../../services/controlapos/posService';

const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND || 'https://backendcoalianza.vercel.app/api';

// =============================================================================
// 1. UTILIDAD: Extracción de Intensidad Horaria
// =============================================================================
const extractIntensity = (courseName) => {
  if (!courseName) return '10';
  const numbers = courseName.match(/(\d+)/g);
  // Toma el último número encontrado, asumiendo que es la hora (ej: "Curso Nivel 2 x 40h")
  const hours = numbers && numbers.length > 0 ? numbers[numbers.length - 1] : '10';
  return `${hours}`;
};

// =============================================================================
// 2. COMPONENTE: Sello de Agua (Validez Nacional)
// =============================================================================
const OfficialSeal = () => (
  <div className="absolute -top-3 -right-3 w-20 h-20 opacity-10 pointer-events-none overflow-hidden">
    <svg viewBox="0 0 100 100" className="w-full h-full text-blue-900 animate-spin-slow">
      <path id="curve" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" fill="transparent" />
      <text width="500">
        <textPath href="#curve" className="text-[10px] font-bold uppercase fill-current tracking-widest">
          Qcontrola Verificación • Validez Nacional •
        </textPath>
      </text>
    </svg>
  </div>
);

// =============================================================================
// 3. TARJETA DEL CURSO (Diseño Institucional)
// =============================================================================
const CourseCard = ({ courseName, userData, onDownload, downloading }) => {
  const formatDate = (dateString) => format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: es });
  const nameLower = courseName.toLowerCase();

  const isFoodHandling = nameLower.includes('manipulac') || nameLower.includes('alimentos');
  const isExcel = nameLower.includes('excel');

  // Configuración de textos legales
  let legalContext = {
    title: "Certificación de Competencias",
    law: "Normativa Educativa Vigente",
    color: "border-l-4 border-gray-400"
  };

  if (isFoodHandling) {
    legalContext = {
      title: "Validez Nacional (Colombia)",
      law: "Res. 2674/2013 - Dec. 3075/1997",
      color: "border-l-4 border-green-600"
    };
  } else if (isExcel) {
    legalContext = {
      title: "Formación Laboral",
      law: "Habilidades Ofimáticas y Digitales",
      color: "border-l-4 border-blue-500"
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative group border border-slate-200"
    >
      <OfficialSeal />

      {/* Encabezado Técnico */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isFoodHandling ? 'bg-green-500' : 'bg-blue-900'}`}></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Folio: {userData.numeroDeDocumento}
          </span>
        </div>
        <div className="flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold uppercase border border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Vigente
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-extrabold text-[#003366] leading-snug mb-2 font-serif">
          Curso Manipulación de Alimentos (BPM)
        </h3>

        {/* Sección Legal con énfasis en Validez Nacional */}
        <div className={`pl-3 py-2 mb-4 bg-slate-50 ${legalContext.color} text-xs text-slate-700`}>
          <p className="font-bold uppercase flex items-center">
            <MapPin className="w-3 h-3 mr-1" /> {legalContext.title}
          </p>
          <p className="italic text-slate-500">{legalContext.law}</p>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-700 mb-5">
          <div className="col-span-2 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[#003366]" />
            <span className="font-medium mr-1">Intensidad:</span>
            {extractIntensity(courseName)}
          </div>
          <div className="flex items-center">
            <span className="text-slate-400 text-xs mr-2">Expedición:</span>
            <span className="font-medium">{userData.createdAt ? formatDate(userData.createdAt) : 'N/A'}</span>
          </div>
          <div className="flex items-center justify-end">
            <span className="text-slate-400 text-xs mr-2">Vence:</span>
            <span className="font-bold text-[#003366]">{userData.fechaVencimiento ? formatDate(userData.fechaVencimiento) : 'N/A'}</span>
          </div>
        </div>

        {/* Footer de Aval - TEXTO REFORZADO */}
        <div className="flex items-start gap-2 mb-5 p-2 bg-blue-50/50 rounded border border-blue-100">
          <Landmark className="w-8 h-8 text-[#003366] flex-shrink-0" />
          <div className="text-[10px] leading-tight text-slate-600">
            <strong className="block text-[#003366] mb-0.5">COBERTURA NACIONAL</strong>
            Documento válido ante entes de control en todo el territorio nacional.
          </div>
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button
            onClick={() => onDownload('certificado', courseName)}
            disabled={!!downloading}
            className={`flex items-center justify-center py-2.5 px-3 bg-[#003366] text-white text-xs font-bold rounded shadow-sm hover:bg-[#002244] transition-colors disabled:opacity-70 ${isExcel ? 'col-span-2' : ''}`}
          >
            {downloading === 'certificado' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
            CERTIFICADO PDF
          </button>

          {isFoodHandling && (
            <button
              onClick={() => onDownload('carnet', courseName)}
              disabled={!!downloading}
              className="flex items-center justify-center py-2.5 px-3 bg-white border border-[#003366] text-[#003366] text-xs font-bold rounded shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-70"
            >
              {downloading === 'carnet' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              CARNET DIGITAL
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// 4. PANTALLA PRINCIPAL: QCONTROLA VERIFICACIÓN
// =============================================================================
const Verificacion = () => {
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  // --- CONSULTA A LA BASE DE DATOS DE QCONTROLA ---
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
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setError('El documento no registra certificaciones activas en la base de datos de Qcontrola.');
      } else {
        setError('No se pudo conectar con el servidor de Qcontrola. Intente más tarde.');
      }
      setStudentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- DESCARGA DE DOCUMENTOS ---
  const handleDownload = async (docType, courseName) => {
    const intensity = extractIntensity(courseName);
    const notificationKey = 'download-toast';
    setDownloading(docType);

    notification.open({
      key: notificationKey,
      message: 'Generando Documento Oficial',
      description: 'Validando firma digital en Qcontrola...',
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

      // Determinación de Endpoints
      let endpoint = '';
      if (docType === 'certificado') {
        endpoint = courseName.toLowerCase().includes('excel')
          ? `${API_BACKEND_URL}/api/generar-certificado-pdf`
          : `${API_BACKEND_URL}/api/generar-certificado`;
      } else {
        endpoint = `${API_BACKEND_URL}/api/generar-carnet`;
      }

      const requestOptions = { method: 'POST' };

      // Configuración del Payload
      if (docType === 'certificado') {
        requestOptions.headers = { 'Content-Type': 'application/json' };
        requestOptions.body = JSON.stringify({
          nombre: fullName,
          numeroDocumento: numeroDeDocumento,
          tipoDocumento: tipoDocumento,
          curso: courseName,
          intensidadHoraria: intensity // Se envía la intensidad calculada o por defecto (10)
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

      notification.success({ message: 'Descarga Exitosa', description: 'Documento oficial guardado.' });
    } catch (e) {
      notification.error({ message: 'Error', description: 'No se pudo generar el documento.' });
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
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">

      {/* HEADER: QCONTROLA VERIFICACIÓN */}
      <header className="bg-[#003366] text-white py-5 shadow-md border-b-4 border-green-500">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icono de Marca */}

            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none uppercase">QCONTROLA</h1>
              <p className="text-xs font-bold text-green-400 tracking-widest uppercase">Portal de Verificación</p>
            </div>
          </div>
          <Link to="/" className="text-xs font-bold text-white/90 hover:text-white flex items-center transition-colors bg-white/10 px-4 py-2 rounded hover:bg-white/20 uppercase tracking-wide">
            <ArrowLeft className="w-3 h-3 mr-2" /> Volver
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        <AnimatePresence mode="wait">
          {!studentData ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="max-w-lg mx-auto"
            >
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
                <div className="p-8 pb-6 text-center">
                  <div className="inline-flex p-3 bg-blue-50 rounded-full mb-4">
                    <Database className="w-8 h-8 text-[#003366]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#003366]">Consulta Pública</h2>
                  <p className="text-slate-500 mt-2 text-sm px-4">
                    Ingrese el documento de identidad para validar la autenticidad de certificados .
                  </p>
                </div>

                <div className="px-8 pb-8 space-y-6">
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none transition-all font-medium text-lg placeholder:text-slate-400"
                      placeholder="Número de Documento"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded flex items-center border border-red-100 animate-pulse">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <button
                    onClick={handleValidate}
                    disabled={isLoading || !cedula}
                    className="w-full py-3.5 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Validar Documento'}
                  </button>
                </div>
                <div className="bg-slate-50 p-3 text-center text-[10px] text-slate-400 border-t border-slate-100 uppercase tracking-wide">
                  Powered by Qcontrola Technology
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              {/* DATOS DEL ESTUDIANTE */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-[#003366]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#003366] rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {studentData.nombre.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 capitalize">{studentData.nombre} {studentData.apellido}</h2>
                    <p className="text-slate-500 text-sm font-medium flex items-center">
                      {(studentData.tipoDeDocumento || studentData.tipoDocumento || studentData.tipo_documento || 'C.C')}. {studentData.numeroDeDocumento}
                      <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full flex items-center border border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Validado
                      </span>
                    </p>
                  </div>
                </div>
                <button onClick={resetForm} className="text-xs font-bold text-[#003366] hover:text-[#002244] border border-[#003366] px-4 py-2 rounded hover:bg-slate-50 transition-colors uppercase">
                  Nueva consulta
                </button>
              </div>

              {/* LISTA DE CERTIFICADOS */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#003366] mb-4 flex items-center pb-2 border-b border-slate-200">
                  <Award className="w-5 h-5 mr-2" /> Certificaciones Disponibles
                </h3>

                {Array.isArray(studentData.tipo) && studentData.tipo.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="p-10 text-center bg-white rounded-lg border border-dashed border-slate-300">
                    <p className="text-slate-500">El usuario existe en Qcontrola pero no tiene cursos activos visualizables.</p>
                  </div>
                )}
              </div>

              {/* DISCLAIMER DE LA FUENTE DE DATOS */}
              <div className="text-center space-y-2 mt-8 opacity-70">
                <p className="text-xs text-slate-500 max-w-2xl mx-auto">
                  <Database className="w-3 h-3 inline mr-1 mb-0.5" />
                  La información aquí presentada reposa en las <strong>bases de datos de Qcontrola</strong> y certifica la autenticidad de los documentos físicos.
                  Cualquier inconsistencia favor reportarla a soporte.
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  © 2025 Qcontrola - Todos los derechos reservados.
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
