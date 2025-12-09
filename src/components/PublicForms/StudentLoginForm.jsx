import React from "react";
import { BankOutlined, UserOutlined, LockOutlined, SearchOutlined } from "@ant-design/icons";

function StudentLoginForm({
  usernameDoc,
  passwordDoc,
  loading,
  error,
  onChangeUsername,
  onChangePassword,
  onSubmit,
}) {
  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg md:p-8">
        {/* CABECERA INSTITUCIONAL */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <BankOutlined className="text-2xl text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Portal del Estudiante
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa tus credenciales institucionales
          </p>
        </div>

        {/* Línea separadora corta, con poco espacio para que no se vea tan lejos */}
        <div className="mt-4 mb-3 border-t border-slate-200" />

        {/* FORMULARIO */}
        <div className="space-y-3">
          {/* Documento */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Documento de Identidad
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <UserOutlined className="text-slate-400 text-base" />
              </span>
              <input
                type="text"
                placeholder="Ej. 1098765432"
                value={usernameDoc}
                onChange={(e) => onChangeUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                disabled={loading}
                autoComplete="username"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <LockOutlined className="text-slate-400 text-base" />
              </span>
              <input
                type="password"
                placeholder="Confirma tu documento"
                value={passwordDoc}
                onChange={(e) => onChangePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                disabled={loading}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* BOTÓN DE ACCIÓN */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-900 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/70"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Validando acceso...</span>
              </>
            ) : (
              <>
                <SearchOutlined className="text-base" />
                <span>Acceder al Portal</span>
              </>
            )}
          </button>

          {/* MANEJO DE ERRORES */}
          {error && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              <div>
                <p className="font-semibold">Error de Autenticación</p>
                <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* FOOTER PEQUEÑO */}
          <div className="mt-3 text-center">
            <p className="text-[11px] text-slate-500">
              ¿Problemas para ingresar? Contacta a soporte académico.
            </p>
          </div>

          {/* INDICADOR DE CARGA ADICIONAL (OPCIONAL) */}
          {loading && (
            <div className="mt-1 flex justify-center">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentLoginForm;
