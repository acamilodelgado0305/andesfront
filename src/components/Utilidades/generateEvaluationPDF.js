// src/components/Utilidades/generateEvaluationPDF.js
//
// Exporta una evaluación (con sus preguntas y opciones) a PDF, con el mismo
// lenguaje visual institucional del resto de documentos del sistema
// (paz y salvo, boletín de notas): logo + nombre del negocio, tarjeta de datos
// y colores suaves.
//
// Se generan dos variantes desde la misma función:
//   - incluirRespuestas: false → cuestionario para imprimir y contestar
//     (casillas vacías y renglones para las preguntas abiertas).
//   - incluirRespuestas: true  → clave de respuestas para el docente
//     (marca la opción correcta y la resalta en verde).
import jsPDF from 'jspdf';
import axios from 'axios';
import { getUser, getToken } from '../../services/auth/authService';

const API_AUTH = import.meta.env.VITE_API_AUTH_SERVICE;

const NAVY = [15, 52, 96];
const GREEN = [22, 163, 74];
const GRAY = [120, 120, 120];
const DARK = [30, 30, 30];

const TIPO_LABEL = {
  opcion_multiple: 'Opción múltiple',
  verdadero_falso: 'Verdadero / Falso',
  abierta: 'Abierta',
};

/** Carga una imagen (logo) y la convierte a Base64. Nunca lanza. */
const getImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.statusText);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('No se pudo cargar el logo para la evaluación:', error);
    return null;
  }
};

/**
 * Datos del negocio activo para el encabezado del PDF (nombre + logo).
 * Best-effort: si el endpoint falla se devuelve solo el nombre del JWT.
 */
export const fetchInstitucionActual = async () => {
  const user = getUser();
  const nombre = user?.business_name || 'Institución Educativa';
  if (!user?.bid || !API_AUTH) return { nombre, logoUrl: null };
  try {
    const { data } = await axios.get(`${API_AUTH}/api/businesses/${user.bid}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return {
      nombre: data?.name || nombre,
      logoUrl: data?.profile_picture_url || data?.profilePictureUrl || null,
    };
  } catch {
    return { nombre, logoUrl: null };
  }
};

const formatFecha = (value) => {
  if (!value) return null;
  try {
    // Fechas DATE: se leen al mediodía para que no se corran un día por zona horaria.
    const iso = String(value);
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso;
    return new Date(soloFecha).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return null;
  }
};

const slug = (t) =>
  String(t || 'evaluacion')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'evaluacion';

/**
 * Genera y descarga el PDF de una evaluación.
 *
 * @param {object}  opts
 * @param {object}  opts.evaluacion    - Fila de `evaluaciones` (titulo, descripcion, intentos_max, ...).
 * @param {Array}   opts.preguntas     - [{ enunciado, tipo_pregunta, puntaje, opciones: [{ texto, es_correcta }] }]
 * @param {object}  [opts.materia]     - { nombre, programa_nombre } para el subtítulo.
 * @param {object}  [opts.institucion] - { nombre, logoUrl }. Si no se pasa, se consulta el negocio activo.
 * @param {boolean} [opts.incluirRespuestas=false] - true = clave de respuestas del docente.
 */
export const generateEvaluationPDF = async ({
  evaluacion,
  preguntas = [],
  materia = null,
  institucion = null,
  incluirRespuestas = false,
} = {}) => {
  if (!evaluacion) throw new Error('No hay evaluación para exportar.');

  const inst = institucion || (await fetchInstitucionActual());
  const logoBase64 = inst?.logoUrl ? await getImageAsBase64(inst.logoUrl) : null;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 20;

  const hoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  let y = margin;

  // ===== Encabezado (logo + institución + fecha) =====
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', margin, y, 18, 18); } catch { /* formato no soportado */ }
  }
  const headX = logoBase64 ? margin + 23 : margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(inst?.nombre || 'Institución Educativa', headX, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY);
  doc.text(
    incluirRespuestas ? 'Clave de respuestas' : 'Cuestionario de evaluación',
    headX, y + 13
  );
  doc.text(hoy, pageWidth - margin, y + 7, { align: 'right' });

  y += 24;
  doc.setDrawColor(225, 228, 232);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // ===== Título de la evaluación =====
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  const tituloLines = doc.splitTextToSize(evaluacion.titulo || 'Evaluación', contentW);
  doc.text(tituloLines, margin, y);
  y += tituloLines.length * 7.5;

  const contexto = [materia?.programa_nombre, materia?.nombre].filter(Boolean).join('  ·  ');
  if (contexto) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...GRAY);
    doc.text(contexto, margin, y);
    y += 6;
  }

  // ===== Tarjeta de datos generales =====
  const totalPuntaje = preguntas.reduce((acc, q) => acc + (parseFloat(q.puntaje) || 0), 0);
  const meta = [
    `${preguntas.length} ${preguntas.length === 1 ? 'pregunta' : 'preguntas'}`,
    `${Number(totalPuntaje.toFixed(2))} puntos en total`,
  ];
  if (evaluacion.tiempo_limite_min) meta.push(`Tiempo límite: ${evaluacion.tiempo_limite_min} min`);
  if (evaluacion.intentos_max) meta.push(`Intentos: ${evaluacion.intentos_max}`);
  const fi = formatFecha(evaluacion.fecha_inicio);
  const ff = formatFecha(evaluacion.fecha_fin);
  if (fi || ff) meta.push(`Vigencia: ${fi || '—'} a ${ff || '—'}`);

  // splitTextToSize mide con la fuente ACTIVA: hay que fijarla antes de medir,
  // o las líneas se cortan con el ancho equivocado y se desbordan al pintarlas.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const descLines = evaluacion.descripcion
    ? doc.splitTextToSize(evaluacion.descripcion, contentW - 16)
    : [];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const metaLines = doc.splitTextToSize(meta.join('   ·   '), contentW - 16);

  y += 6;
  const cardH = 10 + descLines.length * 5 + (descLines.length ? 3 : 0) + metaLines.length * 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, cardH, 3, 3, 'FD');

  let cy = y + 8;
  if (descLines.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(70, 70, 70);
    doc.text(descLines, margin + 8, cy);
    cy += descLines.length * 5 + 3;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(metaLines, margin + 8, cy);

  y += cardH + 10;

  // ===== Datos del estudiante (solo en el cuestionario en blanco) =====
  if (!incluirRespuestas) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('Nombre:', margin, y);
    doc.setDrawColor(200, 205, 212);
    doc.setLineWidth(0.3);
    doc.line(margin + 17, y + 1, margin + contentW * 0.55, y + 1);
    doc.text('Fecha:', margin + contentW * 0.62, y);
    doc.line(margin + contentW * 0.62 + 13, y + 1, pageWidth - margin, y + 1);
    y += 16;
  }

  // ===== Preguntas =====
  const ensureSpace = (h) => {
    if (y + h > bottomLimit) {
      doc.addPage();
      y = margin;
    }
  };

  if (preguntas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(...GRAY);
    doc.text('Esta evaluación aún no tiene preguntas.', margin, y);
  }

  const letra = (i) => String.fromCharCode(65 + i); // A, B, C...

  preguntas.forEach((q, index) => {
    const numW = 9;
    const textX = margin + numW;
    const textW = contentW - numW - 26; // deja aire para el puntaje a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const enunciadoLines = doc.splitTextToSize(q.enunciado || '', textW);

    // El bloque del enunciado no se parte entre páginas.
    ensureSpace(enunciadoLines.length * 5.5 + 10);

    // Número de la pregunta
    doc.setFillColor(...NAVY);
    doc.roundedRect(margin, y - 4.2, 6.6, 6.6, 1.4, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(String(index + 1), margin + 3.3, y + 0.4, { align: 'center' });

    // Enunciado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(enunciadoLines, textX, y);

    // Puntaje / tipo a la derecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`${Number(q.puntaje ?? 0)} pts`, pageWidth - margin, y, { align: 'right' });
    doc.text(TIPO_LABEL[q.tipo_pregunta] || 'Abierta', pageWidth - margin, y + 4.5, { align: 'right' });

    y += enunciadoLines.length * 5.5 + 3;

    const opciones = Array.isArray(q.opciones) ? q.opciones : [];

    if (q.tipo_pregunta === 'abierta' || opciones.length === 0) {
      // Renglones para responder (o nota en la clave de respuestas).
      if (incluirRespuestas) {
        ensureSpace(8);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(...GRAY);
        doc.text('Respuesta abierta — se califica manualmente.', textX, y + 2);
        y += 8;
      } else {
        for (let i = 0; i < 3; i += 1) {
          ensureSpace(8);
          doc.setDrawColor(215, 219, 225);
          doc.setLineWidth(0.25);
          doc.line(textX, y + 3, pageWidth - margin, y + 3);
          y += 7;
        }
        y += 2;
      }
    } else {
      opciones.forEach((opt, i) => {
        const correcta = incluirRespuestas && !!opt.es_correcta;
        doc.setFont('helvetica', correcta ? 'bold' : 'normal');
        doc.setFontSize(10.5);
        const optLines = doc.splitTextToSize(opt.texto || '', textW - 8);
        const rowH = Math.max(7, optLines.length * 5 + 2);
        ensureSpace(rowH + 2);

        const boxY = y - 3;

        if (correcta) {
          // Fondo verde suave para la opción correcta.
          doc.setFillColor(240, 253, 244);
          doc.setDrawColor(187, 247, 208);
          doc.setLineWidth(0.3);
          doc.roundedRect(textX - 2, boxY - 1.2, contentW - numW + 2, rowH, 2, 2, 'FD');
        }

        // Casilla / círculo de la opción
        doc.setLineWidth(0.35);
        if (correcta) {
          doc.setFillColor(...GREEN);
          doc.setDrawColor(...GREEN);
          doc.circle(textX + 2, boxY + 1.6, 2.1, 'FD');
          // Check dentro del círculo
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.6);
          doc.line(textX + 1, boxY + 1.6, textX + 1.8, boxY + 2.5);
          doc.line(textX + 1.8, boxY + 2.5, textX + 3.1, boxY + 0.7);
        } else {
          doc.setDrawColor(160, 165, 172);
          doc.circle(textX + 2, boxY + 1.6, 2.1, 'S');
        }

        doc.setFont('helvetica', correcta ? 'bold' : 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(...(correcta ? GREEN : [70, 70, 70]));
        doc.text(`${letra(i)}.`, textX + 6, y + 1);
        doc.text(optLines, textX + 11.5, y + 1);

        y += rowH;
      });
      y += 3;
    }

    // Separador entre preguntas
    ensureSpace(6);
    doc.setDrawColor(238, 240, 244);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  });

  // ===== Pie de página en todas las páginas =====
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    const pieIzq = [evaluacion.titulo, incluirRespuestas ? 'Clave de respuestas' : null]
      .filter(Boolean).join('  ·  ');
    doc.text(pieIzq, margin, pageHeight - 10, { maxWidth: contentW - 30 });
    doc.text(`Página ${p} de ${total}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  doc.save(`evaluacion_${slug(evaluacion.titulo)}${incluirRespuestas ? '_respuestas' : ''}.pdf`);
};

export default generateEvaluationPDF;
