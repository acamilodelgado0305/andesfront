import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// ELIMINADO: Ya no importamos un logo por defecto.

/**
 * Función auxiliar para cargar una imagen desde una URL y convertirla a formato Base64.
 * @param {string} url - La URL de la imagen a cargar.
 * @returns {Promise<string|null>} Una promesa que se resuelve con la imagen en Base64 o null si hay un error.
 */
const getImageAsBase64 = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`La respuesta de la red no fue exitosa: ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("No se pudo cargar la imagen para el PDF desde la URL:", error);
        return null; // Si algo falla, devolvemos null.
    }
};

/**
 * Genera un reporte de calificaciones en PDF para un estudiante.
 * @param {object} student - El objeto del estudiante con su información y la del negocio anidada.
 * @param {Array} grades - Un arreglo de objetos con las calificaciones del estudiante.
 */
export const generateGradeReportPDF = async (student, grades) => {
    if (!student) {
        throw new Error('Los datos del estudiante no están disponibles para generar el PDF.');
    }

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        // --- 1. Obtenemos los Datos Dinámicos ---
        const businessName = student?.business?.name || 'Institución Educativa';
        const businessLogoUrl = student?.business?.profilePictureUrl;
        
        // La variable para el logo empieza como nula.
        let logoForPdf = null; 

        // Si el estudiante tiene una URL de logo en su negocio, intentamos cargarla.
        if (businessLogoUrl) {
            logoForPdf = await getImageAsBase64(businessLogoUrl);
        }

        // --- 2. Definimos Header y Footer Dinámicos ---
        const addHeader = () => {
            // CAMBIO: La imagen solo se añade al PDF si se cargó exitosamente.
            if (logoForPdf) {
                doc.addImage(logoForPdf, 'PNG', margin, 10, 25, 25);
            }

            doc.setFont('times', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(0, 51, 102);
            doc.text(businessName, pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(80, 80, 80);
            doc.text('Reporte Académico de Calificaciones', pageWidth / 2, 28, { align: 'center' });
            
            doc.setDrawColor(0, 51, 102);
            doc.setLineWidth(0.5);
            doc.line(margin, 40, pageWidth - margin, 40);
        };

        const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFont('times', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const footerText = `${businessName} | Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`;
            doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        };
        
        // --- 3. Construimos el Contenido del PDF ---
        addHeader();

        // Información del Estudiante
        doc.setFont('times', 'bold').setFontSize(11).setTextColor(0, 51, 102);
        doc.text('Información del Estudiante', margin, 50);

        doc.setFont('times', 'normal').setFontSize(10).setTextColor(50, 50, 50);
        const studentName = `${student.nombre} ${student.apellido}`;
        const coordinatorName = student.coordinador ? student.coordinador.nombre : 'N/A';
        const currentDate = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.text(`Estudiante: ${studentName}`, margin, 58);
        doc.text(`Coordinador: ${coordinatorName}`, margin, 64);
        doc.text(`Fecha de Emisión: ${currentDate}`, margin, 70);

        // Tabla de Calificaciones
        autoTable(doc, {
            startY: 80,
            head: [['Materia', 'Calificación']],
            body: grades.map(grade => [
                grade.materia || 'N/A',
                (grade.nota !== null && !isNaN(grade.nota)) ? Number(grade.nota).toFixed(1) : 'N/A'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], font: 'times', fontStyle: 'bold' },
            bodyStyles: { font: 'times' },
            didDrawPage: () => {
                addHeader();
                addFooter();
            }
        });
        
        addFooter();
        
        // --- 4. Guardamos el PDF ---
        doc.save(`calificaciones_${studentName.replace(/\s/g, '_')}.pdf`);

    } catch (err) {
        console.error('Error al generar el PDF:', err);
        throw err;
    }
};