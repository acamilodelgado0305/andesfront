import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';

import { clienteDe, conceptoDe } from './movimientos';

/**
 * Descarga el reporte en PDF de los ingresos o gastos que se están viendo.
 * Lo usan la tabla de escritorio y la vista del celular.
 *
 * @param {'ingresos'|'egresos'} type
 * @param {object[]} registros  lo que está en pantalla (ya filtrado)
 * @param {[moment, moment]} dateRange
 * @param {Record<string,string>} userMap  id de usuario → nombre
 * @param {(n:number)=>string} fmt  formato de moneda (useCurrency)
 */
export const generarPdfMovimientos = ({ type, registros, dateRange, userMap = {}, fmt }) => {
  const doc = new jsPDF();
  const esIngreso = type === 'ingresos';
  const title = esIngreso ? 'Reporte de Ventas' : 'Reporte de Gastos';
  const periodo = `${moment(dateRange[0]).format('DD/MM/YYYY')} - ${moment(dateRange[1]).format('DD/MM/YYYY')}`;
  doc.setFontSize(14);
  doc.text(`${title} - ${periodo}`, 14, 20);
  doc.autoTable({
    head: [['Fecha', esIngreso ? 'Cliente' : 'Descripción', esIngreso ? 'Producto' : 'Etiqueta', 'Cuenta', 'Usuario', 'Valor']],
    body: registros.map((item) => [
      moment(item[esIngreso ? 'createdAt' : 'fecha']).format('DD/MM/YYYY'),
      esIngreso ? clienteDe(item) : (item.descripcion || ''),
      esIngreso ? conceptoDe(item) : (item.categoria_nombre || 'Sin etiqueta'),
      item.cuenta || '',
      userMap[String(item.usuario)] || (item.usuario ? `ID ${item.usuario}` : '-'),
      fmt(item.valor),
    ]),
    startY: 26,
  });
  doc.save(`${title.replace(/\s+/g, '_')}_${moment(dateRange[0]).format('DD_MM_YYYY')}.pdf`);
};
