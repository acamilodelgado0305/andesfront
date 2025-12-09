import React, { useState, useId } from 'react';
// ICONOS Y UTILIDADES
import { 
  AlertCircle, ArrowLeft, ShieldCheck, Fingerprint, Clock, 
  DownloadCloud, Loader2, FileText, GraduationCap, User, 
  Calendar, Award 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notification } from 'antd';

// VARIABLES DE ENTORNO
const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND || 'https://backendcoalianza.vercel.app/api/v1';
const API_BACKEND_FINANZAS = import.meta.env.VITE_API_FINANZAS || 'https://backendcoalianza.vercel.app/api/v1';

// --- SUB-COMPONENTE: Tarjeta de Curso Individual ---
const CourseCard = ({ courseName, userData, onDownload, downloading }) => {
  const formatDate = (dateString) => format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
  
  // 1. Validamos si este curso específico es de Alimentos
  const isFoodHandling = courseName.toLowerCase().includes('manipulac') || 
                         courseName.toLowerCase().includes('alimentos');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full"
    >
      {/* Encabezado de la Tarjeta */}
      <div className={`px-6 py-4 border-b ${isFoodHandling ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg ${isFoodHandling ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {isFoodHandling ? <Award className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
            Vigente
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-900 leading-tight min-h-[3.5rem] flex items-center">
          {courseName}
        </h3>
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div className="p-6 flex-grow space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-slate-600">
            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
            <span className="font-medium mr-1">Expedición:</span> 
            {formatDate(userData.createdAt)}
          </div>
          <div className="flex items-center text-slate-600">
            <Clock className="w-4 h-4 mr-2 text-slate-400" />
            <span className="font-medium mr-1">Vence:</span> 
            {formatDate(userData.fechaVencimiento)}
          </div>
        </div>
        
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-100">
            {isFoodHandling 
                ? "Cumple con Decreto 3075/1997 y Res. 2674/2013." 
                : "Certificación de competencias laborales y académicas."}
        </div>
      </div>

      {/* Pie de la Tarjeta (Acciones) */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        {isFoodHandling ? (
          <div className="grid grid-cols-2 gap-3">
             <button
              onClick={() => onDownload('certificado', courseName)}
              disabled={!!downloading}
              className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors text-xs font-medium text-slate-600 disabled:opacity-50"
            >
              {downloading === 'certificado' ? <Loader2 className="w-5 h-5 animate-spin mb-1"/> : <DownloadCloud className="w-5 h-5 mb-1"/>}
              Certificado
            </button>
            <button
              onClick={() => onDownload('carnet', courseName)}
              disabled={!!downloading}
              className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors text-xs font-medium text-slate-600 disabled:opacity-50"
            >
              {downloading === 'carnet' ? <Loader2 className="w-5 h-5 animate-spin mb-1"/> : <FileText className="w-5 h-5 mb-1"/>}
              Carnet
            </button>
          </div>
        ) : (
          <div className="w-full py-2 flex items-center justify-center text-slate-400 bg-slate-100 rounded border border-slate-200 cursor-not-allowed">
            <ShieldCheck className="w-4 h-4 mr-2" />
            <span className="text-xs font-medium">Solo Verificación Web</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};


// --- SUB-COMPONENTE: Portal de Usuario (Reemplaza CertificateDisplay) ---
const StudentPortal = ({ data, resetForm, onDownload, downloading }) => {
  // Manejo defensivo: asegurar que data.tipo sea un array
  const courses = Array.isArray(data.tipo) ? data.tipo : [data.tipo || "Certificación General"];
  const fullName = `${data.nombre} ${data.apellido}`;

  return (
    <div className="space-y-8">
      {/* Cabecera del Portal */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 flex-shrink-0">
          <User className="w-8 h-8 text-slate-500" />
        </div>
        <div className="flex-grow">
          <h2 className="text-2xl font-bold text-slate-900 capitalize">Hola, {data.nombre}</h2>
          <p className="text-slate-500 flex items-center justify-center sm:justify-start mt-1">
             <Fingerprint className="w-4 h-4 mr-1"/> Documento: {data.numeroDeDocumento}
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
             <ShieldCheck className="w-3 h-3 mr-1" /> Cuenta Verificada
          </div>
        </div>
        <button
           onClick={resetForm}
           className="text-sm text-slate-500 underline hover:text-slate-800"
        >
          Salir / Consultar otro
        </button>
      </div>

      {/* Grid de Cursos */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-green-600"/>
            Mis Certificaciones ({courses.length})
        </h3>
        
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {courses.map((courseName, index) => (
              <CourseCard 
                key={index}
                courseName={courseName}
                userData={data}
                onDownload={onDownload}
                downloading={downloading}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            <p className="text-slate-500">No se encontraron certificaciones activas para mostrar.</p>
          </div>
        )}
      </div>

      {/* Footer Informativo */}
      <div className="text-center text-xs text-slate-400 pt-8 border-t border-slate-200">
        <p>Los certificados digitales son generados en tiempo real. Si presentas inconvenientes, contacta soporte.</p>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---
const Verificacion = () => {
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloading, setDownloading] = useState(null); // 'certificado' | 'carnet' | null

  // --- LÓGICA DE VALIDACIÓN ---
  const handleValidate = async () => {
    if (!cedula.trim() || cedula.length < 5) {
      setError('Por favor ingrese un número de documento válido.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    try {
      // 1. Fetch al endpoint de clientes
      const response = await fetch(`${API_BACKEND_FINANZAS}/clients/${cedula}`);
      
      if (response.status === 404) {
        throw new Error('No se encontraron registros para este documento.');
      }
      if (!response.ok) {
        throw new Error('Error de conexión con el servidor.');
      }
      
      const data = await response.json();
      
      // Validación básica de que llegue data
      if (!data || !data.numeroDeDocumento) {
          throw new Error('Datos inválidos recibidos.');
      }

      setStudentData(data);
    } catch (error) {
      console.error(error);
      setError(error.message || 'No se encontró información.');
      setStudentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (docType, courseNameForValidation) => {
    // DOBLE CHECK: Solo permitimos descargar si es Manipulación (seguridad por si hackean el botón)
    const isFood = courseNameForValidation.toLowerCase().includes('manipulac') || 
                   courseNameForValidation.toLowerCase().includes('alimentos');

    if (!isFood) {
       notification.warning({ message: 'Descarga no disponible', description: 'Este certificado aún no tiene plantilla digital.' });
       return;
    }

    setDownloading(docType);
    const notificationKey = 'download-toast';
    
    notification.open({
        key: notificationKey,
        message: 'Generando Documento',
        description: 'Por favor espera mientras preparamos tu PDF...',
        icon: <Loader2 className="text-blue-500 animate-spin" />,
        duration: 0,
    });

    try {
      const { nombre, apellido, numeroDeDocumento, tipoDeDocumento } = studentData;
      const fullName = `${nombre} ${apellido}`;

      let endpoint = '';
      let requestOptions = { method: 'POST' };

      // NOTA IMPORTANTE:
      // Aquí estamos llamando al endpoint GENÉRICO que tenías antes. 
      // Si en el futuro tienes endpoints diferentes por curso, aquí usarías "courseNameForValidation" para decidir la URL.
      // Por ahora, como dijiste que solo "Manipulación" genera PDF, usamos la lógica actual.

      if (docType === 'certificado') {
        endpoint = `${API_BACKEND_URL}/api/generar-certificado`;
        requestOptions.headers = { 'Content-Type': 'application/json' };
        requestOptions.body = JSON.stringify({
          nombre: fullName,
          numeroDocumento: numeroDeDocumento,
          tipoDocumento: tipoDeDocumento || 'C.C',
        });
      } else {
        endpoint = `${API_BACKEND_URL}/api/generar-carnet`;
        const formData = new FormData();
        formData.append('nombre', fullName);
        formData.append('numeroDocumento', numeroDeDocumento);
        formData.append('tipoDocumento', tipoDeDocumento || 'C.C');
        requestOptions.body = formData;
      }

      const response = await fetch(endpoint, requestOptions);
      if (!response.ok) throw new Error('Error al generar el archivo en el servidor.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Nombre del archivo limpio
      link.setAttribute('download', `${docType}_${fullName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notification.success({ message: 'Descarga Completada', description: 'El archivo se ha guardado en tu dispositivo.' });

    } catch (err) {
      notification.error({ message: 'Error', description: 'No se pudo generar el documento. Intenta de nuevo.' });
      console.error(err);
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
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header General */}
        {!studentData && (
             <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Portal de Certificaciones</h1>
                <p className="text-slate-500 mt-2">Consulta y descarga tus documentos oficiales de Coalianza / Alimentos Inocuos</p>
             </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Barra superior de navegación (Solo si hay datos o si queremos volver) */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
             <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Inicio
             </Link>
             <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-slate-700 hidden sm:inline">Plataforma Segura</span>
             </div>
          </div>

          <div className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {!studentData ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* --- FORMULARIO DE BÚSQUEDA --- */}
                  <div className="max-w-xl mx-auto space-y-8">
                    <div className="text-center space-y-4">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Fingerprint className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Verificar Identidad</h2>
                        <p className="text-slate-600">Ingresa tu número de documento para acceder a tus certificaciones vigentes.</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-700 ml-1">Número de Documento</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ej: 10203040"
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                                className="w-full pl-4 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-lg focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all text-lg outline-none"
                            />
                        </div>
                        
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-600 bg-red-50 p-3 rounded-lg text-sm flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleValidate}
                            disabled={isLoading || !cedula.trim()}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center text-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Consultar Ahora'}
                        </button>
                    </div>
                  </div>

                </motion.div>
              ) : (
                <motion.div
                  key="portal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* --- PORTAL DE RESULTADOS --- */}
                  <StudentPortal 
                    data={studentData} 
                    resetForm={resetForm} 
                    onDownload={handleDownload}
                    downloading={downloading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="mt-12 text-center space-y-2">
            <p className="text-slate-400 text-sm">© 2025 Alimentos Inocuos S.A.S - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default Verificacion;