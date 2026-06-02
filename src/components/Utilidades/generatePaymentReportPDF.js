import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Respuesta de red no exitosa: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('No se pudo cargar el logo para el PDF:', error);
    return null;
  }
};

const money = (value) => {
  const n = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Genera un extracto de pagos (estilo bancario) de un estudiante en PDF.
 * @param {object} student - Datos del estudiante (incluye business para logo/nombre).
 * @param {Array}  payments - Historial de pagos del estudiante.
 * @param {Array}  financialData - Estado de cuenta por programa (monto_total, total_abonado, saldo_pendiente).
 */
export const generatePaymentReportPDF = async (student, payments = [], financialData = []) => {
  if (!student) {
    throw new Error('Los datos del estudiante no están disponibles para generar el PDF.');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const businessName = student?.business?.name || 'Institución Educativa';
  const businessLogoUrl = student?.business?.profilePictureUrl;
  let logoForPdf = null;
  if (businessLogoUrl) {
    logoForPdf = await getImageAsBase64(businessLogoUrl);
  }

  const addHeader = () => {
    if (logoForPdf) {
      doc.addImage(logoForPdf, 'PNG', margin, 10, 25, 25);
    }
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(21, 81, 83);
    doc.text(businessName, pageWidth / 2, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(12).setTextColor(80, 80, 80);
    doc.text('Extracto de Pagos', pageWidth / 2, 28, { align: 'center' });
    doc.setDrawColor(21, 81, 83).setLineWidth(0.5);
    doc.line(margin, 36, pageWidth - margin, 36);
  };

  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(120, 120, 120);
    const text = `${businessName}  |  Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`;
    doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  addHeader();

  // --- Datos del estudiante ---
  const studentName = `${student.nombre || ''} ${student.apellido || ''}`.trim();
  const coordinador = student.coordinador_nombre || student.coordinador?.nombre || 'N/A';
  const documento = student.numero_documento || 'N/A';
  const emision = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(21, 81, 83);
  doc.text('Información del Estudiante', margin, 46);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(50, 50, 50);
  doc.text(`Estudiante: ${studentName}`, margin, 53);
  doc.text(`Documento: ${documento}`, margin, 59);
  doc.text(`Coordinador: ${coordinador}`, margin, 65);
  doc.text(`Fecha de emisión: ${emision}`, margin, 71);

  // --- Resumen de cuenta por programa ---
  const totalCosto = financialData.reduce((s, p) => s + parseFloat(p.monto_total || 0), 0);
  const totalAbonado = financialData.reduce((s, p) => s + parseFloat(p.total_abonado || 0), 0);
  const totalPendiente = financialData.reduce((s, p) => s + parseFloat(p.saldo_pendiente || 0), 0);

  autoTable(doc, {
    startY: 78,
    head: [['Programa', 'Costo Total', 'Abonado', 'Pendiente', 'Estado']],
    body: financialData.map((p) => {
      const pagado = parseFloat(p.saldo_pendiente || 0) <= 0;
      return [
        p.programa_nombre || 'N/A',
        money(p.monto_total),
        money(p.total_abonado),
        money(p.saldo_pendiente),
        pagado ? 'Paz y salvo' : 'Pendiente',
      ];
    }),
    foot: [[
      'TOTAL',
      money(totalCosto),
      money(totalAbonado),
      money(totalPendiente),
      totalPendiente <= 0 ? 'Paz y salvo' : 'Pendiente',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [21, 81, 83], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [219, 234, 254], textColor: [21, 41, 89], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    didDrawPage: () => { addHeader(); addFooter(); },
  });

  // --- Movimientos (estilo extracto: saldo decreciente) ---
  const pagados = payments
    .filter((p) => p.estado === 'Pagado')
    .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago));

  let saldo = totalCosto; // saldo inicial = total a pagar
  const movimientos = pagados.map((p) => {
    const abono = parseFloat(p.monto || 0);
    saldo -= abono;
    return [
      formatDate(p.fecha_pago),
      p.tipo_pago_nombre || 'Pago',
      p.programa_nombre || 'General',
      p.metodo_pago || '—',
      p.referencia_transaccion || '—',
      money(abono),
      money(saldo),
    ];
  });

  const afterSummaryY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(21, 81, 83);
  doc.text('Movimientos', margin, afterSummaryY);

  autoTable(doc, {
    startY: afterSummaryY + 4,
    head: [['Fecha', 'Concepto', 'Programa', 'Método', 'Referencia', 'Abono', 'Saldo']],
    body: movimientos.length
      ? movimientos
      : [[{ content: 'No hay pagos registrados.', colSpan: 7, styles: { halign: 'center', textColor: [120, 120, 120] } }]],
    theme: 'striped',
    headStyles: { fillColor: [21, 81, 83], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    styles: { fontSize: 9, cellPadding: 2 },
    didDrawPage: () => { addHeader(); addFooter(); },
  });

  // --- Totales del extracto ---
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(50, 50, 50);
  doc.text(`Total abonado: ${money(totalAbonado)}`, pageWidth - margin, finalY, { align: 'right' });
  doc.text(`Saldo pendiente: ${money(totalPendiente)}`, pageWidth - margin, finalY + 6, { align: 'right' });

  addFooter();

  const safeName = studentName.replace(/\s/g, '_') || 'estudiante';
  doc.save(`extracto_pagos_${safeName}.pdf`);
};
