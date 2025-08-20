// src/constants/options.js

/**
 * Opciones para el tipo de certificado en el formulario de ingresos.
 */
export const tipoOptions = [
  { label: 'Manipulación de alimentos', value: 'Manipulación de alimentos' },
  { label: 'Aseo Hospitalario', value: 'Aseo Hospitalario' },
  // Puedes agregar más tipos de certificados aquí
];

/**
 * Opciones para la cuenta bancaria, usadas tanto en ingresos como en egresos.
 */
export const cuentaOptions = [
   { label: 'Efectivo', value: 'Efectivo' },
  { label: 'Nequi', value: 'Nequi' },
  { label: 'Daviplata', value: 'Daviplata' },
  { label: 'Bancolombia', value: 'Bancolombia' },
  { label: 'Otra', value: 'Otra' },
  // Puedes agregar más cuentas aquí
];