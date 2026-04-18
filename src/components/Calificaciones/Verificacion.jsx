import React, { useState } from 'react';
import {
  AlertCircle, ArrowLeft, ShieldCheck, Fingerprint,
  Clock, DownloadCloud, Loader2, FileText, CheckCircle2,
  Search, Award, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { notification } from 'antd';
import { getClientByCedula } from '../../services/controlapos/posService';

const API_BACKEND_URL = import.meta.env.VITE_API_BACKEND || 'https://backendcoalianza.vercel.app';

const extractIntensity = (courseName) => {
  if (!courseName) return '10';
  const numbers = courseName.match(/(\d+)/g);
  return numbers?.length ? numbers[numbers.length - 1] : '10';
};

const fmt = (ds) => format(new Date(ds), "d 'de' MMMM 'de' yyyy", { locale: es });

// ─── Bandera Colombia minimalista ───────────────────────────
const Flag = () => (
  <svg viewBox="0 0 3 2" className="w-7 h-5 rounded-sm shadow-sm" xmlns="http://www.w3.org/2000/svg">
    <rect width="3" height="1" fill="#FCD116"/>
    <rect y="1" width="3" height="0.5" fill="#003893"/>
    <rect y="1.5" width="3" height="0.5" fill="#CE1126"/>
  </svg>
);

// ─── Tarjeta de curso ────────────────────────────────────────
const CursoCard = ({ courseName, userData, onDownload, downloading }) => {
  const nameLower = courseName.toLowerCase();
  const isFoodHandling = nameLower.includes('manipulac') || nameLower.includes('alimentos');
  const isExcel = nameLower.includes('excel');
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Cabecera curso */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1a3c5e]/8 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-[#1a3c5e]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 leading-snug text-sm">{courseName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Intensidad: <span className="font-medium text-gray-600">{extractIntensity(courseName)} horas</span>
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Vigente
        </span>
      </div>

      {/* Fechas */}
      <div className="px-6 py-3 grid grid-cols-2 gap-4 text-xs bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-gray-400 mb-0.5">Fecha de expedición</p>
          <p className="font-medium text-gray-700">{userData.createdAt ? fmt(userData.createdAt) : '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Fecha de vencimiento</p>
          <p className="font-medium text-gray-700">{userData.fechaVencimiento ? fmt(userData.fechaVencimiento) : '—'}</p>
        </div>
      </div>

      {/* Referencia legal colapsable */}
      {isFoodHandling && (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full px-6 py-2.5 flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 border-b border-gray-100 transition-colors"
        >
          <span>Resolución 2674/2013 — Decreto 3075/1997</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {open && isFoodHandling && (
        <div className="px-6 py-3 text-xs text-gray-500 bg-gray-50 border-b border-gray-100 leading-relaxed">
          Certificado con validez nacional en Colombia. Expedido conforme a la normativa de inocuidad alimentaria
          vigente ante entes de control en todo el territorio de la República.
        </div>
      )}

      {/* Acciones */}
      <div className="px-6 py-4 flex flex-wrap gap-2">
        <button
          onClick={() => onDownload('certificado', courseName)}
          disabled={!!downloading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a3c5e] hover:bg-[#122c47] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {downloading === 'certificado'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <DownloadCloud className="w-3.5 h-3.5" />}
          Descargar certificado
        </button>

        {isFoodHandling && (
          <button
            onClick={() => onDownload('carnet', courseName)}
            disabled={!!downloading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-[#1a3c5e] hover:text-[#1a3c5e] text-gray-600 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {downloading === 'carnet'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FileText className="w-3.5 h-3.5" />}
            Descargar carnet
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────
const Verificacion = () => {
  const [cedula, setCedula]           = useState('');
  const [error, setError]             = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [downloading, setDownloading] = useState(null);

  const handleValidate = async () => {
    if (!cedula.trim() || cedula.length < 5) {
      setError('Ingrese un número de documento válido (mínimo 5 dígitos).');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await getClientByCedula(cedula);
      if (!data || !data.numeroDeDocumento) throw new Error('Datos inválidos.');
      setStudentData(data);
    } catch (err) {
      setStudentData(null);
      setError(
        err.response?.status === 404
          ? 'El documento no registra certificaciones activas en nuestra base de datos.'
          : 'No fue posible conectarse con el servidor. Intente nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (docType, courseName) => {
    const intensity = extractIntensity(courseName);
    setDownloading(docType);
    notification.open({
      key: 'dl',
      message: 'Generando documento…',
      description: 'Espere unos segundos. No cierre esta página.',
      icon: <Loader2 className="text-[#1a3c5e] animate-spin" />,
      duration: 0,
    });

    try {
      const { nombre, apellido, numeroDeDocumento } = studentData;
      const tipoDocumento =
        studentData.tipoDeDocumento || studentData.tipoDocumento || studentData.tipo_documento || 'C.C';

      let endpoint = '';
      const opts = { method: 'POST' };

      if (docType === 'certificado') {
        endpoint = courseName.toLowerCase().includes('excel')
          ? `${API_BACKEND_URL}/api/generar-certificado-pdf`
          : `${API_BACKEND_URL}/api/generar-certificado`;
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify({
          nombre: `${nombre} ${apellido}`,
          numeroDocumento: numeroDeDocumento,
          tipoDocumento,
          curso: courseName,
          intensidadHoraria: intensity,
        });
      } else {
        endpoint = `${API_BACKEND_URL}/api/generar-carnet`;
        const fd = new FormData();
        fd.append('nombre', `${nombre} ${apellido}`);
        fd.append('numeroDocumento', numeroDeDocumento);
        fd.append('tipoDocumento', tipoDocumento);
        fd.append('intensidadHoraria', intensity);
        opts.body = fd;
      }

      const res = await fetch(endpoint, opts);
      if (!res.ok) throw new Error('Error del servidor');

      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `${docType}_${nombre}_${apellido}.pdf`.replace(/\s+/g, '_'));
      document.body.appendChild(a);
      a.click();
      a.remove();

      notification.success({
        message: 'Descarga lista',
        description: 'Búsquelo en la carpeta Descargas de su dispositivo.',
        duration: 6,
      });
    } catch {
      notification.error({ message: 'Error', description: 'No se pudo generar el documento. Intente nuevamente.' });
    } finally {
      notification.destroy('dl');
      setDownloading(null);
    }
  };

  const reset = () => { setCedula(''); setError(''); setStudentData(null); };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">

      {/* ── CABECERA ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag />
            <div>
              <p className="font-bold text-[#1a3c5e] text-sm leading-tight tracking-tight">
                Portal de Verificación de Certificados
              </p>
              <p className="text-[10px] text-gray-400 tracking-wide">Colombia · Validez Nacional</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1a3c5e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {!studentData ? (

          /* ── FORMULARIO DE BÚSQUEDA ── */
          <div className="max-w-md mx-auto">

            {/* Icono institucional */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1a3c5e]/8 flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7 text-[#1a3c5e]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Verificación de Certificados</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Ingrese su número de documento para consultar y descargar sus certificados oficiales.
              </p>
            </div>

            {/* Tarjeta del formulario */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-8 py-7 space-y-5">

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Número de Documento
                  </label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" style={{ width: 18, height: 18 }} />
                    <input
                      type="text"
                      value={cedula}
                      onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleValidate()}
                      placeholder="Ej: 1012345678"
                      maxLength={12}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-[#1a3c5e] focus:ring-2 focus:ring-[#1a3c5e]/15 outline-none transition text-base text-gray-900 placeholder:text-gray-300 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">Solo números, sin puntos ni espacios</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleValidate}
                  disabled={isLoading || cedula.length < 5}
                  className="w-full py-3 bg-[#1a3c5e] hover:bg-[#122c47] text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando…</>
                    : <><Search className="w-4 h-4" /> Consultar certificados</>
                  }
                </button>
              </div>

              <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                Consulta segura · Información confidencial
              </div>
            </div>
          </div>

        ) : (

          /* ── RESULTADOS ── */
          <div className="space-y-5">

            {/* Titular */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1a3c5e] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {studentData.nombre?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 capitalize leading-tight">
                    {studentData.nombre} {studentData.apellido}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {studentData.tipoDeDocumento || studentData.tipoDocumento || 'C.C.'}{' '}
                    <span className="font-medium text-gray-700">{studentData.numeroDeDocumento}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1a3c5e] bg-[#1a3c5e]/8 hover:bg-[#1a3c5e]/15 border border-[#1a3c5e]/20 px-4 py-2 rounded-lg transition"
              >
                <Search className="w-3.5 h-3.5" /> Consultar otro documento
              </button>
            </div>

            {/* Título sección */}
            <div className="flex items-center gap-2 px-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-600">Certificaciones disponibles</p>
              <span className="ml-auto text-xs text-gray-400">
                {studentData.tipo?.length || 0} registro(s)
              </span>
            </div>

            {/* Cards de cursos */}
            {Array.isArray(studentData.tipo) && studentData.tipo.length > 0 ? (
              <div className="space-y-3">
                {studentData.tipo.map((curso, idx) => (
                  <CursoCard
                    key={idx}
                    courseName={curso}
                    userData={studentData}
                    onDownload={handleDownload}
                    downloading={downloading}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
                No hay certificaciones activas para este usuario.
              </div>
            )}

            {/* Nota de descarga */}
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 text-xs text-gray-500 leading-relaxed">
              <p className="font-semibold text-gray-700 mb-1">¿Dónde encontrar el archivo descargado?</p>
              <p>El archivo se guarda automáticamente en la carpeta <strong>Descargas</strong> de su dispositivo.
              En Android: <em>Mis Archivos → Descargas</em>. En iPhone: App <em>Archivos → Descargas</em>.</p>
            </div>

          </div>
        )}
      </main>

      {/* ── PIE ── */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-3xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-2">
            <Flag />
            <span>Portal de Verificación de Certificados · República de Colombia</span>
          </div>
          <span>Res. 2674/2013 &nbsp;·&nbsp; Dec. 3075/1997 &nbsp;·&nbsp; © {new Date().getFullYear()}</span>
        </div>
      </footer>

    </div>
  );
};

export default Verificacion;
