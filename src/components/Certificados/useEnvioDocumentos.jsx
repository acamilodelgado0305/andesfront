import React, { useMemo, useState } from 'react';
import { message } from 'antd';

import {
  PLANTILLA_ACREDITACION,
  PLANTILLAS,
  construirEnvio,
  enviarDocumentosPorCorreo,
  fechaExpedicionPorDefecto,
  intensidadDeItem,
  itemEnviaCorreo,
  periodoPorDefecto,
  plantillaDeItem,
} from './envioDocumentos';
import EnvioAcreditacionModal from './components/EnvioAcreditacionModal';
import { conceptoDe, itemsDe } from './movimientos';

// Microservicio académico (andesback) que genera/envía los documentos del curso
const API_CERT_URL = import.meta.env.VITE_API_BACKEND;

/**
 * Envío por correo de los documentos del curso (certificado, carnet, diploma)
 * de una venta ya registrada. Lo usan la tabla de escritorio y la vista del
 * celular, para que las dos manden exactamente lo mismo.
 *
 * Qué se manda lo decide el ítem del inventario vendido (`plantilla_correo`),
 * no el código. Devuelve `modal`, que quien lo use debe pintar: es la
 * confirmación de curso, horas y periodo antes de mandar un diploma.
 */
const useEnvioDocumentos = (inventario = []) => {
  const [enviandoId, setEnviandoId] = useState(null);
  // Venta pendiente de confirmar antes de mandar el diploma (null = modal cerrado)
  const [envioAcreditacion, setEnvioAcreditacion] = useState(null);

  // Ítems del inventario con el envío de correo activo, indexados por id y por
  // nombre. Se guarda el ítem COMPLETO (no un booleano) porque de él salen la
  // plantilla de documentos y la intensidad horaria del envío.
  const porItem = useMemo(() => {
    const byId = {};
    const byName = {};
    (inventario || []).forEach((i) => {
      if (itemEnviaCorreo(i)) {
        if (i.id != null) byId[String(i.id)] = i;
        const nm = (i.nombre || i.name || '').trim().toLowerCase();
        if (nm) byName[nm] = i;
      }
    });
    return { byId, byName };
  }, [inventario]);

  // Ítem de la venta que dispara el envío (el primero que lo tenga activo), o
  // null si la venta no certifica nada.
  const itemCertificable = (r = {}) => {
    const items = itemsDe(r);
    if (items.length > 0) {
      for (const it of items) {
        const porId = it.inventario_id != null ? porItem.byId[String(it.inventario_id)] : null;
        const porNombre = porItem.byName[(it.descripcion || it.nombre_producto || '').trim().toLowerCase()];
        if (porId || porNombre) return porId || porNombre;
      }
      return null;
    }
    return porItem.byName[(r.producto || '').trim().toLowerCase()] || null;
  };

  const puedeEnviar = (r) => !!itemCertificable(r);

  /** Qué documentos se mandan para esa venta ("el certificado y el carnet", …). */
  const documentosDe = (r) => PLANTILLAS[plantillaDeItem(itemCertificable(r))].documentos;

  // Datos del cliente de la venta, en el formato que esperan los endpoints de
  // documentos de andesback.
  const clienteDeRegistro = (r = {}) => ({
    nombre: `${r.cliente_nombre || r.nombre || ''} ${r.persona_id != null ? (r.cliente_apellido ?? '') : (r.apellido || '')}`.trim(),
    numeroDocumento: r.cliente_documento || r.numeroDeDocumento || '0',
    tipoDocumento: r.cliente_tipo_doc || r.tipoDocumento || 'C.C.',
    email: r.customer_email || r.cliente_email,
  });

  // Dispara un envío ya resuelto (plantilla, curso, fechas) y avisa del resultado.
  const despachar = async (registro, envio, email) => {
    setEnviandoId(registro._id);
    const hide = message.loading(`Enviando ${envio.documentos} a ${email}...`, 0);
    try {
      await enviarDocumentosPorCorreo(API_CERT_URL, envio);
      message.success(`Se enviaron ${envio.documentos} a ${email}`);
    } catch (err) {
      message.error(`No se pudo enviar el correo: ${err.message}`);
    } finally {
      hide();
      setEnviandoId(null);
    }
  };

  // Enviar al correo del cliente los documentos que le corresponden a la venta.
  // La plantilla de alimentos sale de una: trae el curso impreso y no necesita
  // fechas. La de acreditación (diploma + certificado) sirve para cualquier
  // curso, así que antes de enviar se confirman curso, horas y periodo.
  const enviar = async (r) => {
    const cliente = clienteDeRegistro(r);
    if (!cliente.email) {
      message.warning('El cliente de esta venta no tiene correo registrado.');
      return;
    }

    const item = itemCertificable(r);
    const plantilla = plantillaDeItem(item);

    if (plantilla === PLANTILLA_ACREDITACION) {
      setEnvioAcreditacion({
        registro: r,
        cliente,
        curso: item?.nombre || item?.name || conceptoDe(r),
        intensidadHoraria: intensidadDeItem(item),
        periodo: periodoPorDefecto(r.createdAt),
        fechaExpedicion: fechaExpedicionPorDefecto(r.createdAt),
      });
      return;
    }

    await despachar(
      r,
      construirEnvio({ plantilla, cliente, intensidadHoraria: intensidadDeItem(item) }),
      cliente.email,
    );
  };

  // Confirmación del modal de acreditación.
  const confirmarAcreditacion = async (valores) => {
    const { registro, cliente } = envioAcreditacion;
    const envio = construirEnvio({
      plantilla: PLANTILLA_ACREDITACION,
      cliente,
      curso: valores.curso,
      intensidadHoraria: valores.intensidadHoraria,
      periodo: valores.periodo,
      fechaExpedicion: valores.fechaExpedicion,
    });
    setEnvioAcreditacion(null);
    await despachar(registro, envio, cliente.email);
  };

  const modal = (
    <EnvioAcreditacionModal
      envio={envioAcreditacion}
      onCancel={() => setEnvioAcreditacion(null)}
      onConfirm={confirmarAcreditacion}
    />
  );

  return { itemCertificable, puedeEnviar, documentosDe, enviar, enviandoId, modal };
};

export default useEnvioDocumentos;
