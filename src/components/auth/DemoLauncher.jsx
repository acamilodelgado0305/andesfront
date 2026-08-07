// src/components/auth/DemoLauncher.jsx
//
// Pantalla puente del demo educativo (/demo). El visitante llega aquí desde
// la landing o desde Precios y no tiene que hacer nada: pedimos el sandbox,
// guardamos la sesión y lo soltamos dentro de la plataforma.
//
// El montaje del negocio demo tarda un par de segundos (crea el negocio y
// siembra tres programas con sus materias, clases y estudiantes), así que en
// vez de un spinner mudo mostramos los pasos: la espera se siente corta y de
// paso el visitante se entera de lo que va a encontrar adentro.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Check, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import { startEducationDemo } from '../../services/auth/authService';

const PASOS = [
  'Creando tu institución de prueba',
  'Cargando programas y materias',
  'Matriculando estudiantes de ejemplo',
  'Generando notas y avances',
];

export default function DemoLauncher() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [pasoActual, setPasoActual] = useState(0);
  const [error, setError] = useState(null);
  // StrictMode monta dos veces en desarrollo; sin esto se crearían dos demos.
  const yaArranco = useRef(false);

  useEffect(() => {
    if (yaArranco.current) return;
    yaArranco.current = true;

    // Los pasos avanzan solos. Son honestos respecto a lo que hace el backend,
    // pero no están sincronizados con él: el objetivo es acompañar la espera.
    const intervalo = setInterval(() => {
      setPasoActual((p) => Math.min(p + 1, PASOS.length - 1));
    }, 900);

    const arrancar = async () => {
      try {
        const data = await startEducationDemo();
        setPasoActual(PASOS.length);
        login(data.token, data.user, data.refreshToken);
        navigate('/inicio/dashboard', { replace: true });
      } catch (err) {
        const mensaje =
          err?.response?.data?.error ||
          'No pudimos preparar el demo en este momento. Intenta de nuevo en unos minutos.';
        setError(mensaje);
      } finally {
        clearInterval(intervalo);
      }
    };

    arrancar();
    return () => clearInterval(intervalo);
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#fff1eb] to-[#dff0fb] dark:from-[#262624] dark:to-[#1f1e1d]">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#30302e] border border-gray-200 dark:border-[#403e3a] shadow-xl p-8">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-5">
              <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#faf9f5] m-0 mb-2">
              El demo no está disponible
            </h1>
            <p className="text-sm text-gray-600 dark:text-[#a8a59e] mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold"
              >
                Reintentar
              </button>
              <button
                onClick={() => navigate('/precios')}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-[#403e3a] text-gray-700 dark:text-[#d6d3ca] text-sm font-semibold"
              >
                Ver planes
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-5">
              <GraduationCap className="text-blue-700 dark:text-blue-400" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#faf9f5] m-0 mb-2">
              Preparando tu institución demo
            </h1>
            <p className="text-sm text-gray-600 dark:text-[#a8a59e] mb-7">
              Estamos montando un instituto completo, solo para ti. Todo lo que veas es de
              ejemplo: puedes crear, editar y borrar sin miedo.
            </p>

            <ul className="flex flex-col gap-3 m-0 p-0 list-none">
              {PASOS.map((paso, i) => {
                const hecho = i < pasoActual;
                const enCurso = i === pasoActual;
                return (
                  <li key={paso} className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        hecho
                          ? 'bg-blue-700 dark:bg-blue-500'
                          : 'border-2 border-gray-300 dark:border-[#403e3a]'
                      }`}
                    >
                      {hecho && <Check size={12} className="text-white" strokeWidth={3} />}
                      {enCurso && (
                        <span className="w-2 h-2 rounded-full bg-blue-700 dark:bg-blue-400 animate-pulse" />
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        hecho || enCurso
                          ? 'text-gray-900 dark:text-[#faf9f5] font-medium'
                          : 'text-gray-400 dark:text-[#a8a59e]'
                      }`}
                    >
                      {paso}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
