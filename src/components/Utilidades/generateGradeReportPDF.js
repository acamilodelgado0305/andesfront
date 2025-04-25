import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '../../../images/logo.png'; // Asegúrate de que la ruta sea correcta

export const generateGradeReportPDF = (student, grades, studentId) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;

    // Header on each page
    const addHeader = () => {
      const logoWidth = 25;
      const logoHeight = 25;
      doc.addImage(logoImage, 'PNG', margin, 10, logoWidth, logoHeight);

      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.text('Fundación Educativa Villa de los Andes', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text('Reporte Académico de Calificaciones', pageWidth / 2, 28, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Bogotá, Colombia | Tel: +57 313 2529490 | https://validaciondebachillerato.com.co',
        pageWidth / 2,
        35,
        { align: 'center' }
      );

      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.5);
      doc.line(margin, 40, pageWidth - margin, 40);
    };

    // Footer on each page
    const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const footerText = `Fundación Educativa Villa de los Andes | Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.setFontSize(40);
      doc.setTextColor(230, 230, 230);
      doc.setFont('times', 'bold');
      doc.text('FEVA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    };

    addHeader();

    // Student Information
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('Información del Estudiante', margin, 50);

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const studentName = student ? `${student.nombre} ${student.apellido}` : 'Desconocido';
    const program = student ? `${student.programa_nombre}` : 'Desconocido';
    const currentDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const coordinator = student ? student.coordinador : 'N/A';

    doc.text(`Estudiante: ${studentName}`, margin, 58);
    doc.text(`ID Estudiante: ${studentId}`, margin, 64);
    doc.text(`Programa: ${program}`, margin, 70);
    doc.text(`Coordinador: ${coordinator}`, margin, 76);
    doc.text(`Fecha de Emisión: ${currentDate}`, margin, 82);

    // Table of Grades
    autoTable(doc, {
      startY: 90,
      head: [['Materia', 'Calificación']],
      body: grades.map((grade) => [
        grade.materia || 'N/A',
        grade.nota !== null && !isNaN(grade.nota) ? Number(grade.nota).toFixed(1) : 'N/A',
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        font: 'times',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [50, 50, 50],
        font: 'times',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      margin: { left: margin, right: margin },
      styles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.2,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'center' },
      },
      didDrawPage: () => {
        addHeader();
        addFooter();
      },
    });

    // Final Notes and Signature Line
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('Observaciones', margin, finalY);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text('Las calificaciones reflejan el desempeño académico del estudiante en el mes evaluado.', margin, finalY + 6);

    const signatureY = finalY + 20;
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('Coordinador Académico', margin, signatureY);
    doc.setLineWidth(0.3);
    doc.line(margin, signatureY + 2, margin + 60, signatureY + 2);

    doc.save(`calificaciones_estudiante_${studentId}.pdf`);
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw new Error('Error al generar el PDF');
  }
};