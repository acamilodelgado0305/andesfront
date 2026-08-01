import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
        console.warn('No se pudo cargar el logo para el boletín:', error);
        return null;
    }
};

const NAVY = [15, 52, 96];
const GREEN = [22, 163, 74];
const AMBER = [217, 119, 6];
const NOTA_APROBACION = 3.0;

/**
 * Genera un boletín de calificaciones en PDF, con el mismo lenguaje visual
 * institucional que el resto de documentos del portal del estudiante
 * (constancia de paz y salvo): logo, tarjeta de datos, colores suaves.
 * @param {object} student - Datos del estudiante, incluye `business` { name, profilePictureUrl }.
 * @param {Array}  grades  - [{ materia, nota }]
 */
export const generateGradeReportPDF = async (student, grades = []) => {
    if (!student) {
        throw new Error('Los datos del estudiante no están disponibles para generar el PDF.');
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;

    const businessName = student?.business?.name || 'Institución Educativa';
    const logoUrl = student?.business?.profilePictureUrl;
    const nombre = `${student.nombre || ''} ${student.apellido || ''}`.trim() || 'Estudiante';
    const documento = student.documento || student.numero_documento || '—';
    const programa = student.programa_nombre || '';
    const coordinatorName = student.coordinador ? student.coordinador.nombre : null;
    const hoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    let logoBase64 = null;
    if (logoUrl) logoBase64 = await getImageAsBase64(logoUrl);

    const notasValidas = grades
        .map((g) => Number(g.nota))
        .filter((n) => !isNaN(n));
    const promedio = notasValidas.length
        ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length
        : null;

    // ===== Encabezado (logo + institución) — repetido en cada página =====
    const addHeader = () => {
        let y = margin;
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'PNG', margin, y, 18, 18); } catch { /* formato no válido */ }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...NAVY);
        doc.text(businessName, logoBase64 ? margin + 23 : margin, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(130, 130, 130);
        doc.text('Boletín de calificaciones', logoBase64 ? margin + 23 : margin, y + 13);

        doc.setFontSize(9.5);
        doc.setTextColor(130, 130, 130);
        doc.text(hoy, pageWidth - margin, y + 7, { align: 'right' });

        y += 24;
        doc.setDrawColor(225, 228, 232);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageWidth - margin, y);
        return y;
    };

    const addFooter = () => {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(150, 150, 150);
        doc.text(
            'Documento generado desde el portal estudiantil. Refleja las calificaciones a la fecha de emisión.',
            margin, pageHeight - 12, { maxWidth: pageWidth - margin * 2 }
        );
        const page = doc.internal.getCurrentPageInfo().pageNumber;
        doc.text(`Página ${page}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
    };

    let y = addHeader();

    // ===== Título =====
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text('Boletín de Notas', margin, y);

    // ===== Tarjeta de datos del estudiante =====
    y += 10;
    const cardH = programa ? 36 : 29;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - margin * 2, cardH, 3, 3, 'FD');

    const px = margin + 8;
    let py = y + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(nombre, px, py);

    py += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(90, 90, 90);
    let linea2 = `Documento: ${documento}`;
    if (coordinatorName) linea2 += `   ·   Coordinador: ${coordinatorName}`;
    doc.text(linea2, px, py);

    if (programa) {
        py += 6;
        const progLines = doc.splitTextToSize(`Programa(s): ${programa}`, pageWidth - margin * 2 - 16);
        doc.text(progLines, px, py);
    }

    // Promedio general, destacado a la derecha de la tarjeta
    if (promedio !== null) {
        const badgeColor = promedio >= NOTA_APROBACION ? GREEN : AMBER;
        const badgeW = 34;
        const badgeX = pageWidth - margin - badgeW - 6;
        const badgeY = y + 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...badgeColor);
        doc.text(promedio.toFixed(1), badgeX + badgeW / 2, badgeY + 12, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('PROMEDIO', badgeX + badgeW / 2, badgeY + 18, { align: 'center' });
    }

    y += cardH + 12;

    // ===== Tabla de calificaciones =====
    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Materia', 'Calificación']],
        body: grades.map((grade) => [
            grade.materia || 'N/A',
            (grade.nota !== null && grade.nota !== undefined && !isNaN(grade.nota))
                ? Number(grade.nota).toFixed(1)
                : 'N/A',
        ]),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 10.5, textColor: [50, 50, 50], lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 1: { halign: 'center', cellWidth: 40 } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const n = Number(data.cell.raw);
                if (!isNaN(n)) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = n >= NOTA_APROBACION ? GREEN : AMBER;
                }
            }
        },
        didDrawPage: () => {
            addHeader();
            addFooter();
        },
    });

    addFooter();

    doc.save(`boletin_${nombre.replace(/\s+/g, '_')}.pdf`);
};
