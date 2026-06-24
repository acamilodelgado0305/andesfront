import jsPDF from "jspdf";

/**
 * Carga una imagen desde una URL y la convierte a Base64 (para el logo).
 */
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
    console.warn("No se pudo cargar el logo para el documento:", error);
    return null;
  }
};

const formatFecha = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

/**
 * Genera e inicia la descarga de una Constancia de Paz y Salvo en PDF.
 * Documento informativo, sencillo y sin firma.
 * @param {object} studentInfo - Datos del estudiante (incluye flags de paz y salvo).
 */
export const generatePazSalvoPDF = async (studentInfo) => {
  if (!studentInfo) {
    throw new Error("No hay información del estudiante para generar el documento.");
  }

  const academico = !!studentInfo.paz_salvo_academico;
  const financiero = !!studentInfo.paz_salvo_financiero;

  if (!academico && !financiero) {
    throw new Error("El estudiante no se encuentra a paz y salvo en ningún área.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const cx = pageWidth / 2;

  const businessName =
    studentInfo?.business?.name ||
    studentInfo?.businessName ||
    studentInfo?.institucion ||
    "Institución Educativa";
  const logoUrl =
    studentInfo?.business?.profilePictureUrl || studentInfo?.logoUrl;

  const nombre =
    studentInfo.nombre_completo ||
    `${studentInfo.nombre || ""} ${studentInfo.apellido || ""}`.trim() ||
    "Estudiante";
  const documento = studentInfo.documento || studentInfo.numero_documento || "—";
  const programa =
    studentInfo.programa_nombre ||
    (studentInfo.programas_asociados || [])
      .map((p) => p.nombre)
      .filter(Boolean)
      .join(", ");

  const hoy = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ===== Encabezado (logo + nombre institución) =====
  let y = margin;

  if (logoUrl) {
    const logo = await getImageAsBase64(logoUrl);
    if (logo) {
      try {
        doc.addImage(logo, "PNG", margin, y, 18, 18);
      } catch {
        /* formato no válido, se omite */
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 52, 96);
  doc.text(businessName, logoUrl ? margin + 23 : margin, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(130, 130, 130);
  doc.text("Constancia informativa", logoUrl ? margin + 23 : margin, y + 13);

  // Fecha alineada a la derecha
  doc.setFontSize(9.5);
  doc.setTextColor(130, 130, 130);
  doc.text(hoy, pageWidth - margin, y + 7, { align: "right" });

  y += 24;
  doc.setDrawColor(225, 228, 232);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // ===== Título =====
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Paz y Salvo", margin, y);

  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "Este documento informa el estado de paz y salvo del estudiante.",
    margin,
    y
  );

  // ===== Datos del estudiante (tarjeta) =====
  y += 10;
  const cardH = programa ? 36 : 29;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, cardH, 3, 3, "FD");

  const px = margin + 8;
  let py = y + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(nombre, px, py);

  py += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Documento: ${documento}`, px, py);

  if (programa) {
    py += 6;
    const progLines = doc.splitTextToSize(
      `Programa(s): ${programa}`,
      pageWidth - margin * 2 - 16
    );
    doc.text(progLines, px, py);
  }

  y += cardH + 14;

  // ===== Estado por área =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text("ESTADO", margin, y);
  y += 6;

  const drawEstado = (label, isClear, fecha) => {
    const rowH = 16;
    const green = [22, 163, 74];
    const amber = [217, 119, 6];
    const color = isClear ? green : amber;

    // Fondo suave
    doc.setFillColor(isClear ? 240 : 255, isClear ? 253 : 251, isClear ? 244 : 235);
    doc.setDrawColor(isClear ? 187 : 253, isClear ? 247 : 230, isClear ? 208 : 138);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - margin * 2, rowH, 2.5, 2.5, "FD");

    // Etiqueta del área
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(label, margin + 7, y + 7);

    // Fecha / detalle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      isClear && fecha ? `Otorgado el ${fecha}` : "Sin otorgar",
      margin + 7,
      y + 12.5
    );

    // Estado a la derecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(
      isClear ? "A PAZ Y SALVO" : "PENDIENTE",
      pageWidth - margin - 7,
      y + 9.5,
      { align: "right" }
    );

    y += rowH + 6;
  };

  drawEstado("Académico", academico, formatFecha(studentInfo.paz_salvo_academico_fecha));
  drawEstado("Financiero", financiero, formatFecha(studentInfo.paz_salvo_financiero_fecha));

  // ===== Resumen =====
  y += 4;
  const areasTexto =
    academico && financiero
      ? "académico y financiero"
      : academico
      ? "académico"
      : "financiero";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const resumen = `A la fecha, ${nombre} se encuentra a paz y salvo con la institución por concepto ${areasTexto}.`;
  const resumenLines = doc.splitTextToSize(resumen, pageWidth - margin * 2);
  doc.text(resumenLines, margin, y);

  // ===== Nota al pie (informativa, sin firma) =====
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Documento informativo generado desde el portal estudiantil. Refleja el estado a la fecha de emisión.",
    margin,
    pageHeight - margin,
    { maxWidth: pageWidth - margin * 2 }
  );

  // ===== Guardar =====
  doc.save(`paz_y_salvo_${nombre.replace(/\s+/g, "_")}.pdf`);
};
