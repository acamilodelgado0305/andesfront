import { cuentasPorPagarService, cuentasPorCobrarService } from '../../services/cuentas/cuentasService';

// Las dos clases de cuenta comparten pantalla (CuentasPage → pestañas →
// CuentasDashboard + CuentaForm);
// aquí vive todo lo que las diferencia: API, textos y color del saldo.
export const CUENTAS_CONFIG = {
  // Lo que el negocio debe a sus proveedores.
  pagar: {
    servicio:   cuentasPorPagarService,
    nombreCol:  'proveedor_nombre',
    colorSaldo: '#dc2626', // deuda → rojo
    generaEgreso: false,

    tab:              'Por pagar',
    subtitulo:        'Controla tus obligaciones y pagos a proveedores',
    botonNuevo:       'Nueva cuenta',
    columnaContacto:  'Proveedor',
    buscar:           'Buscar por título o proveedor...',
    errorCarga:       'Error al cargar cuentas por pagar',
    eliminada:        'Cuenta por pagar eliminada',
    tarjetaTotal:     'Total a pagar',
    abonadoEnMes:     'Pagado en el mes',
    saldarTodo:       'Pagar todo',
    movInicial:       'Deuda inicial',
    movAumento:       'Aumento de deuda',
    accionAumentar:   'Aumentar deuda',
    aumentoOk:        'Deuda aumentada correctamente',
    ayudaAumentar: (nombre) =>
      `Suma un nuevo monto a esta deuda (por ejemplo, si ${nombre || 'el proveedor'} te prestó otra vez). El saldo pendiente aumentará.`,

    form: {
      tituloNuevo:         'Nueva cuenta por pagar',
      tituloEditar:        'Editar cuenta por pagar',
      botonCrear:          'Crear cuenta',
      creada:              'Cuenta por pagar creada',
      actualizada:         'Cuenta por pagar actualizada',
      placeholderTitulo:   'Ej: Arriendo local, Préstamo Bancolombia...',
      seccionContacto:     'Contacto / Proveedor',
      placeholderNotas:    'Detalles, número de factura del proveedor, condiciones...',
      tipoContactoNuevo:   'PROVEEDOR',
      contactoObligatorio: false,
    },
  },

  // Préstamos que el negocio hace a sus contactos.
  cobrar: {
    servicio:   cuentasPorCobrarService,
    nombreCol:  'deudor_nombre',
    colorSaldo: '#0d9488', // plata que va a entrar → verde azulado
    // Prestar es plata que sale: el backend registra un egreso por el préstamo
    // y por cada "Prestar más", y los borra si se borra el préstamo.
    generaEgreso: true,

    tab:              'Por cobrar',
    subtitulo:        'Controla los préstamos que haces a tus contactos y lo que te van pagando',
    botonNuevo:       'Nuevo préstamo',
    columnaContacto:  'Deudor',
    buscar:           'Buscar por título o deudor...',
    errorCarga:       'Error al cargar cuentas por cobrar',
    eliminada:        'Préstamo eliminado',
    tarjetaTotal:     'Total por cobrar',
    abonadoEnMes:     'Cobrado en el mes',
    saldarTodo:       'Cobrar todo',
    movInicial:       'Préstamo inicial',
    movAumento:       'Nuevo préstamo',
    accionAumentar:   'Prestar más',
    aumentoOk:        'Préstamo aumentado correctamente',
    ayudaAumentar: (nombre) =>
      `Suma un nuevo monto a este préstamo (por ejemplo, si le prestaste otra vez a ${nombre || 'este contacto'}). El saldo por cobrar aumentará.`,

    form: {
      tituloNuevo:         'Nuevo préstamo',
      tituloEditar:        'Editar préstamo',
      botonCrear:          'Crear préstamo',
      creada:              'Préstamo creado',
      actualizada:         'Préstamo actualizado',
      placeholderTitulo:   'Ej: Préstamo a Juan, Adelanto de nómina...',
      seccionContacto:     'Contacto / Deudor',
      placeholderNotas:    'Detalles, acuerdo de pago, condiciones...',
      tipoContactoNuevo:   'CLIENTE',
      contactoObligatorio: true,
    },
  },
};
