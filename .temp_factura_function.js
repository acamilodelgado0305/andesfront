const generarReciboPDF = (pedido) => {
    const doc = new jsPDF();

    // Parseamos los items del pedido
    let items = [];
    try {
        items = typeof pedido.items_detalle === 'string'
            ? JSON.parse(pedido.items_detalle)
            : (pedido.items_detalle || []);
    } catch (e) {
        items = [];
    }

    // ENCABEZADO
    doc.setFontSize(20);
    doc.setTextColor(21, 81, 83);


    doc.setFontSize(14);
    doc.text("FACTURA", 105, 30, null, null, "center");

    // Línea separadora
    doc.setDrawColor(21, 81, 83);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // INFORMACIÓN DEL PEDIDO
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const fechaPedido = pedido.fecha_creacion
        ? new Date(pedido.fecha_creacion).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Factura No:", 20, 45);
    doc.text("Fecha:", 20, 52);
    doc.text("Estado:", 20, 59);

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`#${pedido.id}`, 50, 45);
    doc.text(fechaPedido, 50, 52);
    doc.text(pedido.estado || 'PENDIENTE', 50, 59);
    doc.setFont(undefined, 'normal');

    // INFORMACIÓN DEL CLIENTE
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENTE:", 20, 70);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(pedido.cliente_nombre || 'Cliente General', 20, 77);

    if (pedido.cliente_telefono) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Tel: ${pedido.cliente_telefono}`, 20, 83);
        doc.setTextColor(0, 0, 0);
    }

    // TABLA DE PRODUCTOS
    const productosParaTabla = items.map((item, index) => {
        const nombreProducto = item.producto || item.nombre || 'Producto';
        const cantidad = Number(item.cantidad) || 0;
        const precioUnitario = Number(item.precio) || 0;
        const subtotal = cantidad * precioUnitario;

        return [
            index + 1,
            nombreProducto,
            cantidad,
            precioUnitario > 0 ? formatCurrency(precioUnitario) : '-',
            precioUnitario > 0 ? formatCurrency(subtotal) : '-'
        ];
    });

    autoTable(doc, {
        startY: 90,
        head: [['#', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: productosParaTabla,
        theme: 'striped',
        headStyles: {
            fillColor: [21, 81, 83],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    // CÁLCULOS FINALES
    const finalY = doc.lastAutoTable.finalY || 90;
    const subtotal = Number(pedido.total) || 0;
    const iva = 0; // Puedes calcular IVA si es necesario: subtotal * 0.19
    const total = subtotal + iva;

    // RESUMEN DE TOTALES (alineado a la derecha)
    const startXTotales = 130;
    let currentY = finalY + 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(startXTotales, currentY - 5, 190, currentY - 5);

    doc.setFontSize(10);
    doc.text("Subtotal:", startXTotales, currentY);
    doc.text(formatCurrency(subtotal), 190, currentY, null, null, "right");

    if (iva > 0) {
        currentY += 7;
        doc.text("IVA (19%):", startXTotales, currentY);
        doc.text(formatCurrency(iva), 190, currentY, null, null, "right");
    }

    currentY += 7;
    doc.setDrawColor(21, 81, 83);
    doc.setLineWidth(0.5);
    doc.line(startXTotales, currentY - 3, 190, currentY - 3);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text("TOTAL:", startXTotales, currentY + 3);
    doc.text(formatCurrency(total), 190, currentY + 3, null, null, "right");
    doc.setFont(undefined, 'normal');

    // PIE DE PÁGINA
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const footerY = 270;
    doc.text("¡Gracias por su compra!", 105, footerY, null, null, "center");
    doc.setFontSize(8);


    // Guardar PDF
    doc.save(`Factura_${pedido.id}.pdf`);
    message.success('Factura descargada exitosamente');
};
