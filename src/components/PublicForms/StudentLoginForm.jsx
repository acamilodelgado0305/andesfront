import React from "react";
import {
  UserOutlined, LockOutlined, ArrowRightOutlined,
  ReadOutlined, TrophyOutlined, SolutionOutlined,
} from "@ant-design/icons";

// Paleta vino tinto / rojizo institucional
const WINE = "#7a1f2b";

// Emblema académico (birrete) — SVG autocontenido, sin imágenes externas.
const EmblemaBirrete = () => (
  <svg width="104" height="104" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
    <circle cx="60" cy="60" r="45" fill="rgba(255,255,255,0.08)" />
    {/* base del birrete (donde va la cabeza) */}
    <path d="M42 59 L42 74 Q42 82 60 82 Q78 82 78 74 L78 59 L60 66 Z" fill="#ffffff" fillOpacity="0.9" />
    {/* tabla del birrete (rombo) */}
    <path d="M60 38 L26 52 L60 66 L94 52 Z" fill="#ffffff" />
    {/* borla */}
    <path d="M94 52 L94 74" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="94" cy="78" r="4.5" fill="#ffffff" />
  </svg>
);

function StudentLoginForm({
  usernameDoc,
  passwordDoc,
  loading,
  error,
  onChangeUsername,
  onChangePassword,
  onSubmit,
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition " +
    "focus:border-[#7a1f2b] focus:ring-2 focus:ring-[#f3d9dd] disabled:cursor-not-allowed disabled:bg-slate-100 " +
    "dark:border-[#403e3a] dark:bg-[#30302e] dark:text-[#faf9f5] dark:focus:ring-[#7a1f2b]/30";

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#262624]">
      {/* ── PANEL INSTITUCIONAL (izquierda) ── */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 text-white md:flex"
        style={{ background: "linear-gradient(160deg,#4d0f18 0%,#7a1f2b 55%,#9b2b39 100%)" }}
      >
        {/* círculos decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

        {/* marca */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.14)" }}>
            <ReadOutlined className="text-xl" />
          </div>
          <span className="text-lg font-semibold tracking-wide">Campus Virtual</span>
        </div>

        {/* emblema + titular + beneficios */}
        <div className="relative z-10">
          <EmblemaBirrete />
          <h2 className="mt-6 text-3xl font-bold leading-tight">
            Bienvenido a tu<br />campus institucional
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            Accede a tus clases, materiales y evaluaciones desde un solo lugar, cuando quieras.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              { icon: <ReadOutlined />, t: "Clases y materiales de estudio" },
              { icon: <TrophyOutlined />, t: "Evaluaciones y calificaciones" },
              { icon: <SolutionOutlined />, t: "Tu avance académico al día" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.14)" }}>
                  {f.icon}
                </span>
                {f.t}
              </li>
            ))}
          </ul>
        </div>

        {/* pie */}
        <div className="relative z-10 text-xs text-white/60">
          © {new Date().getFullYear()} · Portal del Estudiante
        </div>
      </div>

      {/* ── FORMULARIO (derecha) ── */}
      <div className="flex w-full items-center justify-center px-5 py-10 md:w-1/2">
        <div className="w-full max-w-sm">
          {/* cabecera (con emblema en móvil) */}
          <div className="mb-8 flex flex-col items-center text-center md:items-start md:text-left">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl md:hidden"
              style={{ background: "#fbeaec" }}
            >
              <ReadOutlined className="text-2xl" style={{ color: WINE }} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-[#faf9f5]">
              Portal del Estudiante
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#a8a59e]">
              Ingresa con tu documento de identidad
            </p>
          </div>

          <div className="space-y-4">
            {/* Documento */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#e7e5e0]">
                Documento de identidad
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <UserOutlined className="text-base text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Ej. 1098765432"
                  value={usernameDoc}
                  onChange={(e) => onChangeUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                  disabled={loading}
                  autoComplete="username"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#e7e5e0]">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <LockOutlined className="text-base text-slate-400" />
                </span>
                <input
                  type="password"
                  placeholder="Confirma tu documento"
                  value={passwordDoc}
                  onChange={(e) => onChangePassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                  disabled={loading}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
            </div>

            {/* BOTÓN DE ACCIÓN (vino tinto) */}
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7a1f2b] text-sm font-semibold text-white shadow-md transition hover:bg-[#661a24] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Validando acceso...</span>
                </>
              ) : (
                <>
                  <span>Acceder al campus</span>
                  <ArrowRightOutlined className="text-base" />
                </>
              )}
            </button>

            {/* MANEJO DE ERRORES */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <span className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                <div>
                  <p className="font-semibold">Error de autenticación</p>
                  <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div className="pt-1 text-center md:text-left">
              <p className="text-[11px] text-slate-500 dark:text-[#a8a59e]">
                ¿Problemas para ingresar? Contacta a soporte académico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentLoginForm;
