import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tag, Button, Spin, notification, Modal } from "antd";
import {
  BookOutlined,
  CameraOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  LockOutlined,
} from "@ant-design/icons";
import {
  getMiPerfil,
  updateMiPerfil,
  uploadMiFoto,
  deleteMiFoto,
  mensajeDeError,
} from "../../services/student/studentSelfService";

// =============================================================================
// "Mi Información" del portal del estudiante.
// El estudiante ve y edita SUS datos personales y cambia su foto de perfil.
// Su identidad (nombre, apellido y documento) es de solo lectura: se imprime en
// diplomas y el número de documento es su usuario de acceso, así que esos
// cambios los sigue haciendo la secretaría.
// =============================================================================

const TIPOS_DOCUMENTO = ["CC", "TI", "CE", "PA", "PEP", "NIT"];
const TIPOS_SANGRE = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Campos editables agrupados como los lee una persona: contacto, nacimiento,
// salud y acudiente. `tipo` define qué control se pinta en modo edición.
const GRUPOS = [
  {
    titulo: "Contacto",
    campos: [
      { name: "email", label: "Correo electrónico", tipo: "email", required: true },
      { name: "telefono_whatsapp", label: "WhatsApp", tipo: "tel" },
      { name: "telefono_llamadas", label: "Teléfono de llamadas", tipo: "tel" },
    ],
  },
  {
    titulo: "Nacimiento y documento",
    campos: [
      { name: "fecha_nacimiento", label: "Fecha de nacimiento", tipo: "date" },
      { name: "lugar_nacimiento", label: "Lugar de nacimiento", tipo: "text" },
      { name: "lugar_expedicion", label: "Lugar de expedición del documento", tipo: "text" },
    ],
  },
  {
    titulo: "Salud",
    campos: [
      { name: "eps", label: "EPS", tipo: "text" },
      { name: "rh", label: "Grupo sanguíneo (RH)", tipo: "select", opciones: TIPOS_SANGRE },
    ],
  },
  {
    titulo: "Acudiente",
    campos: [
      { name: "nombre_acudiente", label: "Nombre del acudiente", tipo: "text" },
      {
        name: "tipo_documento_acudiente",
        label: "Tipo de documento del acudiente",
        tipo: "select",
        opciones: TIPOS_DOCUMENTO,
      },
      { name: "telefono_acudiente", label: "Teléfono del acudiente", tipo: "tel" },
      { name: "direccion_acudiente", label: "Dirección del acudiente", tipo: "text" },
    ],
  },
];

const CAMPOS_EDITABLES = GRUPOS.flatMap((g) => g.campos.map((c) => c.name));

// 'YYYY-MM-DD' → '15 de abril de 1997' (sin pasar por Date, que restaría un día
// al interpretar la fecha como UTC).
const formatearFecha = (valor) => {
  if (!valor) return "";
  const [y, m, d] = String(valor).split("-");
  if (!y || !m || !d) return valor;
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${Number(d)} de ${meses[Number(m) - 1] || ""} de ${y}`;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "outline-none transition focus:border-[#155153] focus:ring-2 focus:ring-[#155153]/20 " +
  "dark:border-[#403e3a] dark:bg-[#262624] dark:text-[#faf9f5]";

function StudentInfoTab({ studentInfo, documentNumber, onFotoChange }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef(null);
  // Modal por hook (no estático): así el diálogo hereda el tema oscuro del
  // ConfigProvider. El Modal.confirm estático se queda siempre en claro.
  const [modal, modalContextHolder] = Modal.useModal();

  const cargarPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMiPerfil();
      setPerfil(data);
    } catch (err) {
      console.warn("No se pudo cargar el perfil del estudiante:", err);
      setPerfil(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  const empezarEdicion = () => {
    const inicial = {};
    CAMPOS_EDITABLES.forEach((campo) => {
      inicial[campo] = perfil?.[campo] ?? "";
    });
    setForm(inicial);
    setEditando(true);
  };

  const cambiar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    if (!String(form.email || "").trim()) {
      notification.warning({ message: "El correo electrónico es obligatorio." });
      return;
    }
    setGuardando(true);
    try {
      const actualizado = await updateMiPerfil(form);
      setPerfil(actualizado);
      setEditando(false);
      notification.success({ message: "Tus datos se actualizaron correctamente." });
    } catch (err) {
      notification.error({
        message: mensajeDeError(err, "No se pudieron guardar tus datos."),
      });
    } finally {
      setGuardando(false);
    }
  };

  // ===== Foto de perfil =====
  const elegirFoto = () => fileInputRef.current?.click();

  const subirFoto = async (event) => {
    const file = event.target.files?.[0];
    // Se limpia el input siempre: si no, elegir la MISMA foto otra vez no
    // dispara el change y parece que el botón no funciona.
    event.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notification.warning({ message: "La imagen no puede pesar más de 5 MB." });
      return;
    }

    setSubiendoFoto(true);
    try {
      const fotoUrl = await uploadMiFoto(file);
      setPerfil((prev) => (prev ? { ...prev, foto_url: fotoUrl } : prev));
      onFotoChange?.(fotoUrl);
      notification.success({ message: "Foto actualizada." });
    } catch (err) {
      notification.error({ message: mensajeDeError(err, "No se pudo subir la foto.") });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = () => {
    modal.confirm({
      title: "¿Quitar tu foto de perfil?",
      content: "Podrás subir otra cuando quieras.",
      okText: "Quitar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await deleteMiFoto();
          setPerfil((prev) => (prev ? { ...prev, foto_url: null } : prev));
          onFotoChange?.(null);
          notification.success({ message: "Foto eliminada." });
        } catch (err) {
          notification.error({ message: mensajeDeError(err, "No se pudo quitar la foto.") });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spin size="large" />
        <span className="text-sm text-gray-500 dark:text-[#a8a59e]">Cargando tus datos...</span>
      </div>
    );
  }

  if (!perfil && !studentInfo) {
    return (
      <div className="py-10 text-center text-gray-400 dark:text-[#a8a59e]">
        No se encontró tu información. Intenta iniciar sesión nuevamente.
      </div>
    );
  }

  const datos = perfil || {};
  const nombreCompleto =
    `${datos.nombre || studentInfo?.nombre || ""} ${datos.apellido || studentInfo?.apellido || ""}`.trim() ||
    studentInfo?.nombre_completo ||
    "Estudiante";
  const doc = datos.numero_documento || documentNumber || studentInfo?.documento || "—";
  const activo = ["true", "activo", "1"].includes(String(datos.activo ?? studentInfo?.activo).toLowerCase());
  const programas = studentInfo?.programas_asociados || [];
  const iniciales = nombreCompleto.charAt(0).toUpperCase() || "E";

  return (
    <div>
      {modalContextHolder}
      {/* ===== Encabezado con foto ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 mb-5 border-b border-gray-200 dark:border-[#403e3a]">
        <div className="relative flex-shrink-0 self-center sm:self-auto">
          {datos.foto_url ? (
            <img
              src={datos.foto_url}
              alt={nombreCompleto}
              className="h-24 w-24 rounded-full object-cover border-2 border-white shadow-md dark:border-[#403e3a]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#155153] text-3xl font-bold text-white">
              {iniciales}
            </div>
          )}
          <button
            type="button"
            onClick={elegirFoto}
            disabled={subiendoFoto}
            title="Cambiar foto"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#155153] text-white shadow-md transition hover:bg-[#0f3d3e] disabled:opacity-60"
          >
            {subiendoFoto ? <Spin size="small" /> : <CameraOutlined />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={subirFoto}
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="m-0 text-lg font-bold text-gray-800 dark:text-[#faf9f5]">{nombreCompleto}</h3>
          <p className="mt-1 mb-2 text-sm text-gray-500 dark:text-[#a8a59e]">
            {datos.tipo_documento ? `${datos.tipo_documento} ` : ""}
            {doc}
            {studentInfo?.business_name ? ` · ${studentInfo.business_name}` : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Tag color={activo ? "success" : "error"} className="rounded-lg font-semibold">
              {activo ? "Activo" : "Inactivo"}
            </Tag>
            <Button size="small" icon={<CameraOutlined />} onClick={elegirFoto} loading={subiendoFoto}>
              {datos.foto_url ? "Cambiar foto" : "Subir foto"}
            </Button>
            {datos.foto_url && (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={quitarFoto}>
                Quitar
              </Button>
            )}
          </div>
          <p className="mt-2 mb-0 text-[11px] text-gray-400 dark:text-[#a8a59e]">
            JPG, PNG o WebP · máximo 5 MB
          </p>
        </div>
      </div>

      {/* ===== Datos personales ===== */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="m-0 text-base font-bold text-gray-800 dark:text-[#faf9f5]">Datos personales</h4>
          <p className="m-0 text-xs text-gray-400 dark:text-[#a8a59e]">
            Mantén tus datos de contacto al día para que la institución pueda comunicarse contigo.
          </p>
        </div>
        {!editando ? (
          <Button type="primary" icon={<EditOutlined />} onClick={empezarEdicion} disabled={!perfil}>
            Editar
          </Button>
        ) : (
          <div className="flex flex-shrink-0 gap-2">
            <Button icon={<CloseOutlined />} onClick={() => setEditando(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={guardar} loading={guardando}>
              Guardar
            </Button>
          </div>
        )}
      </div>

      {!perfil && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          No pudimos cargar tus datos personales en este momento. Vuelve a intentarlo más tarde.
        </div>
      )}

      <div className="space-y-5">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
              {grupo.titulo}
            </span>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {grupo.campos.map((campo) =>
                editando ? (
                  <CampoEditable
                    key={campo.name}
                    campo={campo}
                    valor={form[campo.name] ?? ""}
                    onChange={(v) => cambiar(campo.name, v)}
                  />
                ) : (
                  <CampoLectura
                    key={campo.name}
                    label={campo.label}
                    valor={
                      campo.tipo === "date"
                        ? formatearFecha(datos[campo.name])
                        : datos[campo.name]
                    }
                  />
                )
              )}
            </div>
          </div>
        ))}

        {/* Identidad: se muestra, pero no se edita desde el portal */}
        <div>
          <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
            <LockOutlined /> Identidad (solo la institución puede cambiarla)
          </span>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <CampoLectura label="Nombres" valor={datos.nombre || studentInfo?.nombre} bloqueado />
            <CampoLectura label="Apellidos" valor={datos.apellido || studentInfo?.apellido} bloqueado />
            <CampoLectura label="Tipo de documento" valor={datos.tipo_documento} bloqueado />
            <CampoLectura label="Número de documento" valor={doc} bloqueado />
          </div>
        </div>
      </div>

      {/* ===== Programas inscritos ===== */}
      {programas.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-[#faf9f5]">
            <BookOutlined style={{ color: "#4338ca" }} /> Programas inscritos
          </h4>
          <div className="flex flex-col gap-2.5">
            {programas.map((prog, idx) => (
              <div
                key={prog.programa_id || idx}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-[#403e3a] dark:bg-[#262624]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-[#faf9f5]">
                    {prog.nombre || "Programa sin nombre"}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400 dark:text-[#a8a59e]">
                    {prog.tipo_programa || "—"}
                    {prog.duracion_meses ? ` · ${prog.duracion_meses} meses` : ""}
                  </div>
                </div>
                <Tag
                  color={
                    prog.tipo_programa === "Tecnicos" || prog.tipo_programa === "Tecnico"
                      ? "blue"
                      : "purple"
                  }
                  className="rounded-lg font-semibold"
                >
                  {prog.tipo_programa === "Tecnicos" || prog.tipo_programa === "Tecnico"
                    ? "Técnico"
                    : "Validación"}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500 dark:border-[#403e3a] dark:bg-[#262624] dark:text-[#a8a59e]">
        Si tu nombre, tipo o número de documento están mal, comunícate con la secretaría académica:
        esos datos se imprimen en tus certificados y tu número de documento es tu usuario de acceso.
      </p>
    </div>
  );
}

/* ===== Campo en modo lectura ===== */
function CampoLectura({ label, valor, bloqueado }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        bloqueado
          ? "border-gray-100 bg-gray-50 dark:border-[#403e3a] dark:bg-[#262624]"
          : "border-gray-100 bg-white dark:border-[#403e3a] dark:bg-[#30302e]"
      }`}
    >
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
        {label}
      </span>
      <div className="mt-1 break-words text-sm font-semibold text-gray-800 dark:text-[#faf9f5]">
        {valor || <span className="font-normal text-gray-300 dark:text-[#6b6862]">Sin registrar</span>}
      </div>
    </div>
  );
}

/* ===== Campo en modo edición ===== */
function CampoEditable({ campo, valor, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
        {campo.label}
        {campo.required && <span className="text-red-500"> *</span>}
      </span>
      {campo.tipo === "select" ? (
        <select className={inputClass} value={valor} onChange={(e) => onChange(e.target.value)}>
          <option value="">Sin registrar</option>
          {campo.opciones.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={campo.tipo}
          className={inputClass}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.tipo === "date" ? undefined : campo.label}
        />
      )}
    </label>
  );
}

export default StudentInfoTab;
