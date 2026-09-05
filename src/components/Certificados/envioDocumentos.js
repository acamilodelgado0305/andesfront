// src/components/Certificados/envioDocumentos.js
//
// Envío de los documentos del curso al correo del cliente cuando se vende un
// ítem del inventario marcado con `send_mail`.
//
// Hay dos plantillas y cada ítem del inventario dice cuál le toca
// (`plantilla_correo`). Antes solo existía la primera y estaba clavada en el
// código, por eso al vender un curso distinto llegaba el carnet de alimentos:
//
//   · 'alimentos'    → certificado + carnet   → POST /api/enviar-documentos
//   · 'acreditacion' → diploma + certificado  → POST /api/enviar-acreditacion
//                      (plantilla de Alianza Capacitarte: sirve para cualquier
//                       curso — Auxiliar de Bodega, Aseo Hospitalario…)
//
// Los endpoints viven en andesback (VITE_API_BACKEND).

import dayjs from 'dayjs';

export const PLANTILLA_ALIMENTOS = 'alimentos';
export const PLANTILLA_ACREDITACION = 'acreditacion';

// Horas que se imprimen cuando el ítem del inventario no las trae configuradas.
// Cada plantilla tiene su respaldo: 10 h es lo que se venía enviando en
// manipulación de alimentos y 40 h es la duración de los cursos de acreditación.
export const INTENSIDAD_HORARIA_DEFAULT = '10';
const INTENSIDAD_POR_PLANTILLA = {
    [PLANTILLA_ALIMENTOS]: INTENSIDAD_HORARIA_DEFAULT,
    [PLANTILLA_ACREDITACION]: '40',
};

// Días de curso que se asumen cuando nadie indica el periodo. Solo lo usa la
// plantilla de acreditación, que imprime "INICIO … FINALIZO …" en el diploma.
const DIAS_CURSO_POR_DEFECTO = 30;

export const PLANTILLAS = {
    [PLANTILLA_ALIMENTOS]: {
        label: 'Certificado + carnet (Manipulación de Alimentos)',
        endpoint: '/api/enviar-documentos',
        documentos: 'certificado y carnet',
        pidePeriodo: false,
    },
    [PLANTILLA_ACREDITACION]: {
        label: 'Diploma + certificado (Alianza Capacitarte)',
        endpoint: '/api/enviar-acreditacion',
        documentos: 'diploma y certificado',
        pidePeriodo: true,
    },
};

/** Plantilla que le corresponde a un ítem del inventario. */
export const plantillaDeItem = (item) =>
    item?.plantilla_correo === PLANTILLA_ACREDITACION
        ? PLANTILLA_ACREDITACION
        : PLANTILLA_ALIMENTOS;

/** ¿Este ítem manda documentos por correo al venderse? */
export const itemEnviaCorreo = (item) => item?.send_mail === true;

/** Horas del ítem; si no las tiene configuradas, el respaldo de su plantilla. */
export const intensidadDeItem = (item) =>
    String(item?.intensidad_horaria || INTENSIDAD_POR_PLANTILLA[plantillaDeItem(item)]);

/** Fecha de referencia válida (la de la venta, o hoy si no viene o es inválida). */
const referencia = (fecha) => {
    const d = fecha ? dayjs(fecha) : dayjs();
    return d.isValid() ? d : dayjs();
};

/**
 * Periodo sugerido del curso: TERMINA EL DÍA ANTERIOR a la venta y arranca un mes
 * antes de ese fin. Cerrarlo el día anterior evita el sinsentido de un diploma
 * que dice que el curso finalizó el mismo día en que se expide.
 * Es solo el valor inicial del formulario — quien envía puede corregirlo.
 */
export const periodoPorDefecto = (fechaVenta) => {
    const fin = referencia(fechaVenta).subtract(1, 'day');
    return [fin.subtract(DIAS_CURSO_POR_DEFECTO, 'day'), fin];
};

/** Fecha de expedición sugerida: el día de la venta (el curso cerró la víspera). */
export const fechaExpedicionPorDefecto = (fechaVenta) => referencia(fechaVenta);

const aISO = (d) => (d && dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : undefined);

/**
 * Arma la petición de envío.
 *
 * @param {Object} opts
 * @param {string} opts.plantilla   - PLANTILLA_ALIMENTOS | PLANTILLA_ACREDITACION
 * @param {Object} opts.cliente     - { nombre, numeroDocumento, tipoDocumento, email }
 * @param {string} opts.curso       - Nombre del ítem vendido (obligatorio en acreditación)
 * @param {string} opts.intensidadHoraria
 * @param {Array}  [opts.periodo]   - [inicio, fin] (dayjs/Date) para la acreditación
 * @param {*}      [opts.fechaExpedicion]
 * @returns {{endpoint: string, body: Object, documentos: string}}
 */
export const construirEnvio = ({
    plantilla,
    cliente,
    curso,
    intensidadHoraria,
    periodo,
    fechaExpedicion,
}) => {
    const config = PLANTILLAS[plantilla] || PLANTILLAS[PLANTILLA_ALIMENTOS];

    const base = {
        nombre: cliente.nombre || 'Cliente',
        numeroDocumento: cliente.numeroDocumento || '0',
        tipoDocumento: cliente.tipoDocumento || 'C.C.',
        intensidadHoraria: intensidadHoraria || INTENSIDAD_HORARIA_DEFAULT,
        email: cliente.email,
    };

    if (config === PLANTILLAS[PLANTILLA_ALIMENTOS]) {
        // La plantilla de alimentos trae el curso impreso; no se le manda.
        return { endpoint: config.endpoint, body: base, documentos: config.documentos };
    }

    return {
        endpoint: config.endpoint,
        documentos: config.documentos,
        body: {
            ...base,
            curso,
            fechaInicio: aISO(periodo?.[0]),
            fechaFin: aISO(periodo?.[1]),
            fechaExpedicion: aISO(fechaExpedicion) || aISO(periodo?.[1]),
        },
    };
};

/**
 * Ejecuta el envío contra andesback. Lanza Error con el detalle del backend si
 * falla, para que quien llama muestre un mensaje útil en vez de "falló el envío".
 */
export const enviarDocumentosPorCorreo = async (apiUrl, { endpoint, body }) => {
    const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let detalle = `El servidor respondió ${res.status}.`;
        try {
            const data = await res.json();
            detalle = data.error || data.details || detalle;
        } catch { /* la respuesta no era JSON */ }
        throw new Error(detalle);
    }

    return res.json().catch(() => ({}));
};
