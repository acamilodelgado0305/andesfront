import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CuentasDashboard from './CuentasDashboard';
import { CUENTAS_CONFIG } from './cuentasConfig';

// Una sola entrada de menú para Cuentas por Pagar y por Cobrar: la pestaña
// activa va en la URL (?tab=cobrar) para que recargar o compartir el enlace
// abra la misma. Sin parámetro se muestra Por Pagar.
const CuentasPage = () => {
  const [params, setParams] = useSearchParams();
  const tab  = params.get('tab');
  const tipo = CUENTAS_CONFIG[tab] ? tab : 'pagar';

  const cambiarTipo = (nuevo) =>
    setParams(nuevo === 'pagar' ? {} : { tab: nuevo }, { replace: true });

  // El key remonta el tablero al cambiar de pestaña: así no se arrastran
  // búsqueda, datos ni modales de una cuenta a la otra.
  return <CuentasDashboard key={tipo} tipo={tipo} onCambiarTipo={cambiarTipo} />;
};

export default CuentasPage;
