import React from 'react';
import CuentasApp from './CuentasApp';

// Una sola pantalla para lo que me deben y lo que debo. El filtro de lado va
// en la URL (?tab=cobrar | ?tab=pagar) para que los enlaces viejos sigan
// abriendo la misma vista; sin parámetro se ven las dos.
const CuentasPage = () => <CuentasApp />;

export default CuentasPage;
