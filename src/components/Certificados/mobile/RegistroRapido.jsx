import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker, Input, Modal, Switch, message } from 'antd';
import {
  AudioOutlined, CalendarOutlined, CloseOutlined, DeleteOutlined, DownOutlined,
  ExportOutlined, MailOutlined, ThunderboltFilled, UpOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import BottomSheet from '../../common/BottomSheet';
import EtiquetasSelector from '../components/EtiquetasSelector';
import ComprobanteAdjunto, { sincronizarComprobante } from '../components/ComprobanteAdjunto';
import ContactoRapido from './ContactoRapido';
import { BotonPrincipal, ChipOpcion, CORAL, PuntoSigno } from './piezas';
import { cuentaOptions } from '../options';
import {
  PLANTILLAS,
  construirEnvio,
  enviarDocumentosPorCorreo,
  fechaExpedicionPorDefecto,
  intensidadDeItem,
  itemEnviaCorreo,
  periodoPorDefecto,
  plantillaDeItem,
} from '../envioDocumentos';
import { conceptoDe, itemsDe } from '../movimientos';
import {
  capitalizar, interpretarMovimiento, normalizar, sugerirEtiqueta, sugerirProducto,
} from './interpretarMovimiento';
import { useAmountShort, useTypedAmount } from '../../../hooks/useCurrency';
import {
  createEgreso, updateEgreso, deleteEgreso, subirComprobanteEgreso, quitarComprobanteEgreso,
  createIngreso, updateIngreso, deleteIngreso, subirComprobanteIngreso, quitarComprobanteIngreso,
} from '../../../services/controlapos/posService';

// Backend académico (andesback): ahí viven los endpoints que envían los documentos.
const API_CERT_URL = import.meta.env.VITE_API_BACKEND;

// En monedas de unidad pequeña un número suelto menor a esto no es plata:
// "cuota 3 de 12" no es un gasto de 12 pesos.
const MONEDAS_SIN_CENTAVOS_UTILES = ['COP', 'CLP', 'PYG'];

// La cuenta usada la última vez (por tipo) queda elegida la próxima.
const claveCuenta = (tipo) => `qc-ultima-cuenta-${tipo}`;
const ultimaCuenta = (tipo) => { try { return localStorage.getItem(claveCuenta(tipo)); } catch { return null; } };
const recordarCuenta = (tipo, cuenta) => { try { localStorage.setItem(claveCuenta(tipo), cuenta); } catch { /* sin almacenamiento */ } };

const Etiqueta = ({ children }) => (
  <div style={{
    fontSize: 11.5, fontWeight: 700, color: 'var(--qc-text-muted)', textTransform: 'uppercase',
    letterSpacing: 0.4, margin: '18px 0 8px',
  }}>
    {children}
  </div>
);

const Aviso = ({ children }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 13, color: 'var(--qc-text)' }}>
    <WarningOutlined style={{ color: '#d97706', marginTop: 2 }} />
    <span>{children}</span>
  </div>
);

/**
 * Registro rápido de un ingreso o gasto desde el celular, al estilo de MonAi:
 * se escribe o se dicta "almuerzo 25000" y la app separa el valor, la
 * descripción y sugiere la etiqueta (aprende de los gastos anteriores). Todo
 * queda editable antes de guardar. También sirve para editar uno existente.
 *
 * Si se vende un producto del inventario que envía certificado por correo, aquí
 * mismo se elige el cliente y se envía al guardar (igual que en el formulario
 * completo). Lo poco común (documento soporte, varios productos) queda en "Más
 * detalles" o en el formulario completo.
 */
const RegistroRapido = ({
  open,
  onClose,
  tipoInicial = 'gasto',
  textoInicial = '',
  registro = null,           // { tipo: 'gasto'|'ingreso', raw } para editar
  etiquetas = [],
  historial = [],
  inventario = [],
  usoProductos = {},
  userName,
  onGuardado,
  onAbrirCompleto,
  onEtiquetasCambiaron,
  envio,                     // useEnvioDocumentos (reenviar certificados de una venta guardada)
  dictado,                   // useDictado
  receptorDictado,           // ref: el dictado iniciado afuera escribe aquí
  entradaPrevia,             // ref: campo puente que abrió el teclado del iPhone
  lateral = false,           // computador: panel a la derecha en vez de hoja inferior
}) => {
  const { codigo, formatear, desdeValor } = useTypedAmount();
  const montoCorto = useAmountShort();
  const [modal, contextoModal] = Modal.useModal();
  const montoMinimo = MONEDAS_SIN_CENTAVOS_UTILES.includes(codigo) ? 50 : 0;
  const leer = (t) => interpretarMovimiento(t, { montoMinimo });
  const esEdicion = !!registro;

  const [tipo, setTipo] = useState('gasto');
  const [texto, setTexto] = useState('');
  const [valor, setValor] = useState(null);
  const [valorTexto, setValorTexto] = useState('');
  // Etiqueta elegida a mano: undefined = no la ha tocado (manda la sugerida),
  // null = la quitó, número = la eligió.
  const [etiquetaManual, setEtiquetaManual] = useState(undefined);
  const [productoId, setProductoId] = useState(null);
  const [cuenta, setCuenta] = useState('Nequi');
  const [fecha, setFecha] = useState(() => dayjs());
  const [persona, setPersona] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState(null);
  const [masAbierto, setMasAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [buscarProducto, setBuscarProducto] = useState('');
  // Envío de los documentos del curso al guardar (producto con correo activo).
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [periodoCurso, setPeriodoCurso] = useState(() => periodoPorDefecto());
  const [horasCurso, setHorasCurso] = useState('');

  // Lo que el usuario cambió a mano ya no lo toca la interpretación del texto.
  const tocado = useRef({});
  const textoRef = useRef(null);
  const montoRef = useRef(null);

  const ponerValor = (v) => { setValor(v); setValorTexto(desdeValor(v)); };

  // La etiqueta sugerida se calcula en cada render (no se guarda): así nunca
  // queda vieja si las etiquetas o el historial llegan mientras se escribe.
  const etiquetaSugerida = useMemo(
    () => (tipo === 'gasto' ? sugerirEtiqueta(leer(texto).descripcion, etiquetas, historial) : null),
    [tipo, texto, etiquetas, historial], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const etiquetaId = etiquetaManual !== undefined ? etiquetaManual : etiquetaSugerida;

  // ── Al abrir: llenar con el registro a editar o con lo que se escribió ──
  useEffect(() => {
    if (!open) return;
    setArchivo(null);
    setGuardando(false);
    setBuscarProducto('');
    setEnviarCorreo(true);
    setHorasCurso('');

    if (esEdicion) {
      const r = registro.raw;
      const t = registro.tipo;
      tocado.current = { tipo: true, valor: true, producto: true, fecha: false };
      setTipo(t);
      setTexto(t === 'gasto' ? (r.descripcion || '') : (conceptoDe(r) || r.descripcion || ''));
      ponerValor(Number(r.valor) || null);
      setEtiquetaManual(r.categoria_id ?? null);
      const items = itemsDe(r);
      setProductoId(items.length === 1 ? (items[0].inventario_id ?? null) : null);
      setCuenta(r.cuenta || 'Nequi');
      setFecha(dayjs(t === 'gasto' ? r.fecha : r.createdAt));
      setPersona(t === 'ingreso' && r.persona_id ? {
        id: r.persona_id,
        nombre: r.cliente_nombre || r.nombre,
        apellido: r.cliente_apellido ?? r.apellido,
        numero_documento: r.cliente_documento,
        tipo_documento: r.cliente_tipo_doc,
        email: r.customer_email,
      } : null);
      setComprobanteUrl(r.comprobante_url || null);
      setMasAbierto(!!r.comprobante_url || (t === 'ingreso' && !!r.persona_id));
      setPeriodoCurso(periodoPorDefecto(r.createdAt));
      return;
    }

    // Nuevo. Si viene texto de la barra ("almuerzo 25000"), ya se reparte:
    // el valor al monto y el resto a la descripción.
    const p = leer(textoInicial);
    const t = p.tipo || tipoInicial;
    tocado.current = { tipo: !!p.tipo, valor: p.valor != null, producto: false, fecha: false };
    setTipo(t);
    setTexto(p.valor != null ? p.descripcion : textoInicial);
    ponerValor(p.valor);
    setEtiquetaManual(undefined);
    const prod = t === 'ingreso' ? sugerirProducto(p.descripcion, inventario) : null;
    setProductoId(prod?.id ?? null);
    if (prod && p.valor == null && Number(prod.monto) > 0) ponerValor(Number(prod.monto));
    setCuenta(ultimaCuenta(t) || 'Nequi');
    setFecha(dayjs());
    setPersona(null);
    setComprobanteUrl(null);
    setMasAbierto(false);
    setPeriodoCurso(periodoPorDefecto());
  }, [open, registro]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enfocar cuando la hoja termina de abrir (solo al crear): durante la
  // animación el Drawer vuelve a montar su contenido y un foco puesto antes se
  // pierde. Mientras tanto el campo puente (`entradaPrevia`) mantiene abierto el
  // teclado del iPhone, y lo que se alcanzó a escribir en él pasa al texto.
  // Si ya traía descripción (vino de la barra), lo que falta es el monto.
  const alTerminarDeAbrir = (abierta) => {
    if (!abierta || esEdicion) return;
    const previo = entradaPrevia?.current?.value || '';
    if (previo) {
      entradaPrevia.current.value = '';
      cambiarTexto(previo);
      textoRef.current?.focus({ preventScroll: true });
      return;
    }
    const p = leer(textoInicial);
    const destino = textoInicial && p.valor == null ? montoRef : textoRef;
    destino.current?.focus({ preventScroll: true });
  };

  // ── Texto libre: se interpreta mientras se escribe o se dicta ──
  const cambiarTexto = (t) => {
    setTexto(t);
    const p = leer(t);
    let tipoEf = tipo;
    if (!tocado.current.tipo && p.tipo && p.tipo !== tipo) {
      tipoEf = p.tipo;
      setTipo(p.tipo);
    }
    if (!tocado.current.valor) ponerValor(p.valor);
    if (tipoEf === 'ingreso' && !tocado.current.producto) {
      const prod = sugerirProducto(p.descripcion, inventario);
      setProductoId(prod?.id ?? null);
      if (prod && !tocado.current.valor && p.valor == null && Number(prod.monto) > 0) ponerValor(Number(prod.monto));
    }
  };

  // El dictado que se inicia desde el botón del micrófono escribe aquí.
  useEffect(() => { if (receptorDictado) receptorDictado.current = cambiarTexto; });

  // Al salir del texto, el valor que venía en él pasa al campo del monto.
  const alSalirDelTexto = () => {
    if (tocado.current.valor) return;
    const p = leer(texto);
    if (p.valor != null) {
      setTexto(p.descripcion);
      tocado.current.valor = true;
    }
  };

  const cambiarMonto = (raw) => {
    // Si el monto venía del texto, se saca de ahí para que no quede repetido.
    if (!tocado.current.valor) {
      const p = leer(texto);
      if (p.valor != null && p.valor === valor) setTexto(p.descripcion);
    }
    tocado.current.valor = true;
    const r = formatear(raw);
    setValorTexto(r.texto);
    setValor(r.valor);
  };

  const cambiarTipo = (t) => {
    if (t === tipo) return;
    tocado.current.tipo = true;
    setTipo(t);
    setCuenta(ultimaCuenta(t) || cuenta);
    if (t === 'ingreso' && !tocado.current.producto) setProductoId(sugerirProducto(leer(texto).descripcion, inventario)?.id ?? null);
  };

  const elegirProducto = (item) => {
    tocado.current.producto = true;
    if (String(productoId) === String(item.id)) { setProductoId(null); return; }
    setProductoId(item.id);
    // El precio del catálogo solo llena el monto si el usuario no puso uno.
    if (!tocado.current.valor || !(valor > 0)) {
      ponerValor(Number(item.monto) || null);
      tocado.current.valor = true;
    }
  };

  const elegirFecha = (d) => {
    tocado.current.fecha = true;
    // Se conserva la hora actual para que el orden dentro del día sea natural.
    const ahora = dayjs();
    const nueva = d.hour(ahora.hour()).minute(ahora.minute()).second(ahora.second());
    setFecha(nueva);
    // El periodo del curso cierra la víspera de la venta: se corre con la fecha.
    setPeriodoCurso(periodoPorDefecto(nueva));
  };

  const dictar = () => {
    if (!dictado?.disponible) return;
    if (dictado.escuchando) { dictado.detener(); return; }
    dictado.iniciar((t) => receptorDictado?.current?.(t));
  };

  // ── Datos derivados ──
  const producto = tipo === 'ingreso' ? inventario.find((i) => String(i.id) === String(productoId)) : null;
  // ¿El producto vendido envía documentos por correo? (se activa en el inventario)
  const certificable = !esEdicion && !!producto && itemEnviaCorreo(producto);
  const configCorreo = PLANTILLAS[plantillaDeItem(producto)];
  const clienteTieneCorreo = !!persona?.email;
  const enviaraCorreo = certificable && enviarCorreo;

  const interpretado = leer(texto);
  const pista = (() => {
    const partes = [];
    if (!tocado.current.valor && interpretado.valor != null) partes.push(`valor ${montoCorto(interpretado.valor)}`);
    if (tipo === 'gasto' && etiquetaManual === undefined && etiquetaId != null) {
      const e = etiquetas.find((x) => x.id === etiquetaId);
      if (e) partes.push(`etiqueta ${e.nombre}`);
    }
    if (tipo === 'ingreso' && !tocado.current.producto && producto) partes.push(producto.nombre);
    return partes.length ? `Detecté: ${partes.join(' · ')}` : null;
  })();

  // El elegido primero (si no, en una fila larga queda fuera de vista); luego
  // los más vendidos y por nombre.
  const productosOrdenados = useMemo(() => {
    const q = normalizar(buscarProducto);
    const elegido = (i) => (String(i.id) === String(productoId) ? 1 : 0);
    return [...inventario]
      .filter((i) => !q || normalizar(i.nombre).includes(q))
      .sort((a, b) => (elegido(b) - elegido(a))
        || ((usoProductos[b.id] || 0) - (usoProductos[a.id] || 0))
        || String(a.nombre).localeCompare(String(b.nombre), 'es'));
  }, [inventario, usoProductos, buscarProducto, productoId]);

  const hoy = dayjs();
  const esHoy = fecha.isSame(hoy, 'day');
  const esAyer = fecha.isSame(hoy.subtract(1, 'day'), 'day');

  // Documentos del curso al correo del cliente (misma lógica del formulario completo).
  const enviarDocumentos = async () => {
    const datos = construirEnvio({
      plantilla: plantillaDeItem(producto),
      cliente: {
        nombre: `${persona.nombre || ''} ${persona.apellido || ''}`.trim(),
        numeroDocumento: persona.numero_documento || '0',
        tipoDocumento: persona.tipo_documento || 'C.C.',
        email: persona.email,
      },
      curso: producto?.nombre,
      intensidadHoraria: horasCurso || intensidadDeItem(producto),
      periodo: periodoCurso,
      fechaExpedicion: fechaExpedicionPorDefecto(fecha),
    });
    await enviarDocumentosPorCorreo(API_CERT_URL, datos);
    return datos.documentos;
  };

  // ── Guardar ──
  const guardar = async () => {
    if (guardando) return;
    if (!(valor > 0)) {
      message.warning('Escribe el valor');
      montoRef.current?.focus();
      return;
    }
    // Se pidió enviar el certificado: sin cliente con correo no hay a quién.
    if (enviaraCorreo && !persona) {
      message.warning(`Elige el cliente para enviarle el ${configCorreo.documentos}, o desactiva el envío.`);
      return;
    }
    if (enviaraCorreo && !clienteTieneCorreo) {
      message.warning('El cliente no tiene correo. Agrégaselo en Contactos o desactiva el envío.');
      return;
    }

    const p = leer(texto);
    const base = (!tocado.current.valor && p.valor != null ? p.descripcion : texto).trim();
    const etiqueta = tipo === 'gasto' ? etiquetas.find((e) => e.id === etiquetaId) : null;
    const descripcion = capitalizar(
      base
      || producto?.nombre
      || (etiqueta?.nombre || '').replace(/^\p{Extended_Pictographic}️?\s*/u, '')
      || (tipo === 'gasto' ? 'Gasto' : 'Ingreso'),
    );

    setGuardando(true);
    try {
      let id = registro?.raw?._id;
      let falla = null;

      if (tipo === 'gasto') {
        const payload = {
          descripcion,
          valor,
          cuenta,
          fecha: fecha.toISOString(),
          categoria_id: etiquetaId ?? null,
          vendedor: userName,
        };
        if (id) await updateEgreso(id, payload);
        else id = (await createEgreso(payload))?._id;
        falla = await sincronizarComprobante({
          id, archivo, url: comprobanteUrl, urlInicial: registro?.raw?.comprobante_url,
          subir: subirComprobanteEgreso, quitar: quitarComprobanteEgreso,
        });
      } else {
        // Con producto: una línea al precio cobrado (puede diferir del catálogo).
        // Al editar uno que ya tenía su línea, se reemplaza para que cuadre el total.
        let items;
        if (producto) {
          items = [{ inventario_id: producto.id, descripcion: producto.nombre, cantidad: 1, precio_unitario: valor }];
        } else if (esEdicion && itemsDe(registro.raw).length > 0) {
          items = [{ inventario_id: null, descripcion, cantidad: 1, precio_unitario: valor }];
        }
        const cliente = persona
          ? {
            persona_id: persona.id,
            nombre: persona.nombre,
            apellido: persona.apellido || '',
            numeroDeDocumento: persona.numero_documento || '0',
            tipoDocumento: persona.tipo_documento || 'CC',
          }
          : (esEdicion ? {} : { nombre: 'Cliente', apellido: 'General', numeroDeDocumento: '0', tipoDocumento: 'N/A' });
        const payload = {
          ...cliente,
          descripcion,
          valor,
          cuenta,
          vendedor: userName,
          ...(items ? { items } : {}),
          // Al editar, la fecha solo viaja si se cambió.
          ...(!esEdicion || tocado.current.fecha ? { fecha: fecha.toISOString() } : {}),
        };
        if (id) await updateIngreso(id, payload);
        else id = (await createIngreso(payload))?.data?._id;
        falla = await sincronizarComprobante({
          id, archivo, url: comprobanteUrl, urlInicial: registro?.raw?.comprobante_url,
          subir: subirComprobanteIngreso, quitar: quitarComprobanteIngreso,
        });
      }

      recordarCuenta(tipo, cuenta);
      message.success(esEdicion ? 'Cambios guardados' : (tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado'));
      if (falla) message.warning(`Se guardó, pero ${falla}`, 6);

      // Certificado al correo: la venta ya quedó guardada pase lo que pase.
      if (enviaraCorreo) {
        const ocultar = message.loading(`Enviando ${configCorreo.documentos} a ${persona.email}…`, 0);
        try {
          const documentos = await enviarDocumentos();
          message.success(`Se enviaron ${documentos} a ${persona.email}`);
        } catch (mailErr) {
          message.warning(`El ingreso se guardó, pero no se pudieron enviar los documentos: ${mailErr.message}`, 8);
        } finally {
          ocultar();
        }
      }

      onGuardado?.(tipo);
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.message || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = () => {
    modal.confirm({
      title: tipo === 'gasto' ? '¿Eliminar este gasto?' : '¿Eliminar este ingreso?',
      content: 'Se borra del todo y no se puede deshacer.',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      centered: true,
      onOk: async () => {
        try {
          if (tipo === 'gasto') await deleteEgreso(registro.raw._id);
          else await deleteIngreso(registro.raw._id);
          message.success('Eliminado');
          onGuardado?.(tipo);
          onClose();
        } catch {
          message.error('No se pudo eliminar');
        }
      },
    });
  };

  const abrirCompleto = () => {
    if (esEdicion) { onAbrirCompleto?.(tipo, registro.raw); return; }
    // Lo ya escrito pasa al formulario completo (sin _id: se crea al guardar).
    const p = leer(texto);
    const descripcion = (!tocado.current.valor && p.valor != null ? p.descripcion : texto).trim();
    onAbrirCompleto?.(tipo, tipo === 'gasto'
      ? { descripcion: capitalizar(descripcion), valor, cuenta, fecha: fecha.toISOString(), categoria_id: etiquetaId }
      : { valor, cuenta, ...(producto ? { producto: producto.nombre } : {}) });
  };

  const titulo = esEdicion
    ? (tipo === 'gasto' ? 'Editar gasto' : 'Editar ingreso')
    : (tipo === 'gasto' ? 'Nuevo gasto' : 'Nuevo ingreso');

  // El cliente va en el bloque del certificado cuando se va a enviar; si no, en "Más detalles".
  const clienteEnCertificado = certificable && enviarCorreo;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      height="92%"
      maxHeight="none"
      lateral={lateral}
      width={480}
      autoFocus={false}
      afterOpenChange={alTerminarDeAbrir}
      title={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--qc-relleno)', color: 'var(--qc-text)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
          >
            <CloseOutlined />
          </button>
          {titulo}
        </span>
      )}
      extra={(
        <BotonPrincipal onClick={guardar} cargando={guardando} style={{ height: 36, padding: '0 18px', borderRadius: 18, fontSize: 14 }}>
          Guardar
        </BotonPrincipal>
      )}
      footer={(
        <BotonPrincipal onClick={guardar} cargando={guardando} style={{ width: '100%', height: 52, borderRadius: 16, fontSize: 16 }}>
          {esEdicion ? 'Guardar cambios' : (tipo === 'gasto' ? 'Guardar gasto' : 'Guardar ingreso')}
        </BotonPrincipal>
      )}
    >
      {contextoModal}

      {/* ── Gasto / Ingreso ── */}
      {!esEdicion && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4,
          borderRadius: 16, background: 'var(--qc-relleno)',
        }}>
          {['gasto', 'ingreso'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => cambiarTipo(t)}
              aria-pressed={tipo === t}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 42, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
                background: tipo === t ? 'var(--qc-surface)' : 'transparent',
                boxShadow: tipo === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                color: tipo === t ? 'var(--qc-text)' : 'var(--qc-text-muted)',
              }}
            >
              <PuntoSigno tipo={t} size={16} />
              {t === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
      )}

      {/* ── Valor ── */}
      <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--qc-text-muted)', letterSpacing: 1 }}>
          <PuntoSigno tipo={tipo} size={15} /> {codigo}
        </div>
        <input
          ref={montoRef}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          aria-label="Valor"
          placeholder="0"
          value={valorTexto}
          onChange={(e) => cambiarMonto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (texto.trim()) guardar(); else textoRef.current?.focus();
          }}
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            textAlign: 'center', fontSize: 46, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1,
            color: 'var(--qc-text)', fontVariantNumeric: 'tabular-nums', padding: 0,
          }}
        />
      </div>

      {/* ── Texto libre (escribir o dictar) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
        padding: '2px 4px 2px 16px', borderRadius: 18, background: 'var(--qc-relleno)',
      }}>
        <input
          ref={textoRef}
          value={texto}
          onChange={(e) => cambiarTexto(e.target.value)}
          onBlur={alSalirDelTexto}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } }}
          enterKeyHint="done"
          autoComplete="off"
          aria-label="Descripción"
          placeholder={tipo === 'gasto' ? '¿En qué? Ej: almuerzo 25.000' : '¿De qué? Ej: venta curso 80.000'}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 16, padding: '13px 0', color: 'var(--qc-text)',
          }}
        />
        {dictado?.disponible && (
          <button
            type="button"
            onClick={dictar}
            aria-label={dictado.escuchando ? 'Detener dictado' : 'Dictar'}
            className={dictado.escuchando ? 'qc-dictando' : undefined}
            style={{
              width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              background: dictado.escuchando ? CORAL : 'transparent',
              color: dictado.escuchando ? '#fff' : 'var(--qc-text)',
            }}
          >
            <AudioOutlined />
          </button>
        )}
      </div>
      <div style={{ minHeight: 18, marginTop: 6, fontSize: 12.5, color: 'var(--qc-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {dictado?.escuchando
          ? <span style={{ color: 'var(--qc-text)', fontWeight: 600 }}>Escuchando… di por ejemplo “almuerzo 25 mil”</span>
          : pista && (<><ThunderboltFilled /> {pista}</>)}
      </div>

      {/* ── Etiqueta (gastos) ── */}
      {tipo === 'gasto' && (
        <>
          <Etiqueta>Etiqueta</Etiqueta>
          <EtiquetasSelector
            sutil
            value={etiquetaId}
            onChange={(id) => setEtiquetaManual(id ?? null)}
            onCambios={onEtiquetasCambiaron}
          />
        </>
      )}

      {/* ── Producto o servicio (ingresos) ── */}
      {tipo === 'ingreso' && inventario.length > 0 && (
        <>
          <Etiqueta>Producto o servicio (opcional)</Etiqueta>
          {inventario.length > 10 && (
            <Input
              allowClear
              placeholder="Buscar en el inventario"
              value={buscarProducto}
              onChange={(e) => setBuscarProducto(e.target.value)}
              style={{ marginBottom: 8, borderRadius: 14, fontSize: 16 }}
            />
          )}
          <div className="qc-sin-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px' }}>
            {productosOrdenados.map((item) => {
              const activo = String(productoId) === String(item.id);
              return (
                <ChipOpcion key={item.id} activo={activo} onClick={() => elegirProducto(item)}>
                  <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</span>
                  {itemEnviaCorreo(item) && <MailOutlined style={{ fontSize: 12, opacity: 0.7 }} />}
                  {Number(item.monto) > 0 && (
                    <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 500 }}>{montoCorto(item.monto)}</span>
                  )}
                </ChipOpcion>
              );
            })}
            {productosOrdenados.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>Sin coincidencias</span>
            )}
          </div>
        </>
      )}

      {/* ── Certificado por correo (producto con envío activo) ── */}
      {certificable && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 18, background: 'var(--qc-relleno)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <Switch checked={enviarCorreo} onChange={setEnviarCorreo} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--qc-text)', lineHeight: 1.3 }}>
              <MailOutlined /> Enviar {configCorreo.documentos} al correo del cliente
            </span>
          </label>

          {enviarCorreo && (
            <>
              <Etiqueta>Cliente</Etiqueta>
              <ContactoRapido value={persona} onChange={setPersona} />
              {persona && !clienteTieneCorreo && (
                <Aviso>Este cliente no tiene correo. Agrégaselo en Contactos o elige otro.</Aviso>
              )}
              {persona && clienteTieneCorreo && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--qc-text-muted)' }}>
                  Se envían a <b style={{ color: 'var(--qc-text)' }}>{persona.email}</b> al guardar.
                </div>
              )}

              {/* El diploma imprime periodo y horas; la plantilla de alimentos los trae impresos. */}
              {configCorreo.pidePeriodo && (
                <>
                  <Etiqueta>Periodo del curso</Etiqueta>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <DatePicker
                      inputReadOnly
                      allowClear={false}
                      format="DD/MM/YYYY"
                      placeholder="Inicio"
                      value={periodoCurso?.[0]}
                      onChange={(d) => d && setPeriodoCurso(([, fin]) => [d, fin])}
                      style={{ flex: 1, height: 42, borderRadius: 14 }}
                    />
                    <DatePicker
                      inputReadOnly
                      allowClear={false}
                      format="DD/MM/YYYY"
                      placeholder="Fin"
                      value={periodoCurso?.[1]}
                      onChange={(d) => d && setPeriodoCurso(([ini]) => [ini, d])}
                      style={{ flex: 1, height: 42, borderRadius: 14 }}
                    />
                  </div>
                  <Etiqueta>Intensidad horaria</Etiqueta>
                  <Input
                    inputMode="numeric"
                    placeholder={intensidadDeItem(producto)}
                    value={horasCurso}
                    onChange={(e) => setHorasCurso(e.target.value)}
                    suffix="horas"
                    style={{ borderRadius: 14, fontSize: 16 }}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Cuenta ── */}
      <Etiqueta>{tipo === 'gasto' ? 'Pagado con' : 'Recibido en'}</Etiqueta>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cuentaOptions.map((c) => (
          <ChipOpcion key={c.value} activo={cuenta === c.value} onClick={() => setCuenta(c.value)}>
            {c.label}
          </ChipOpcion>
        ))}
      </div>

      {/* ── Fecha ── */}
      <Etiqueta>Fecha</Etiqueta>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <ChipOpcion activo={esHoy} onClick={() => elegirFecha(dayjs())}>Hoy</ChipOpcion>
        <ChipOpcion activo={esAyer} onClick={() => elegirFecha(dayjs().subtract(1, 'day'))}>Ayer</ChipOpcion>
        <DatePicker
          inputReadOnly
          allowClear={false}
          variant="borderless"
          value={fecha}
          format="DD/MM/YYYY"
          onChange={(d) => d && elegirFecha(d)}
          disabledDate={(d) => d && d.isAfter(dayjs().endOf('day'))}
          suffixIcon={<CalendarOutlined style={{ color: !esHoy && !esAyer ? 'var(--qc-bg)' : 'var(--qc-text-muted)' }} />}
          placement="topLeft"
          className={!esHoy && !esAyer ? 'qc-fecha-elegida' : undefined}
          style={{
            height: 40, borderRadius: 20, width: 150,
            background: !esHoy && !esAyer ? 'var(--qc-text)' : 'var(--qc-relleno)',
          }}
        />
      </div>

      {/* ── Más detalles ── */}
      <button
        type="button"
        onClick={() => setMasAbierto((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 20,
          padding: '12px 0', border: 'none', borderTop: '1px solid var(--qc-border)',
          background: 'transparent', cursor: 'pointer', color: 'var(--qc-text)', fontSize: 14, fontWeight: 600,
        }}
      >
        {masAbierto ? <UpOutlined /> : <DownOutlined />}
        Más detalles
        <span style={{ fontWeight: 400, color: 'var(--qc-text-muted)', fontSize: 12.5 }}>
          {tipo === 'ingreso' && !clienteEnCertificado ? 'cliente, documento soporte' : 'documento soporte'}
        </span>
      </button>

      {masAbierto && (
        <div style={{ paddingBottom: 6 }}>
          {tipo === 'ingreso' && !clienteEnCertificado && (
            <>
              <Etiqueta>Cliente</Etiqueta>
              <ContactoRapido value={persona} onChange={setPersona} />
            </>
          )}
          <Etiqueta>Documento soporte</Etiqueta>
          <ComprobanteAdjunto
            archivo={archivo}
            url={comprobanteUrl}
            onArchivo={setArchivo}
            onQuitar={() => { setArchivo(null); setComprobanteUrl(null); }}
          />
        </div>
      )}

      {/* ── Reenviar los documentos de una venta ya guardada ── */}
      {esEdicion && tipo === 'ingreso' && envio?.puedeEnviar(registro.raw) && (
        <ChipOpcion
          onClick={() => envio.enviar(registro.raw)}
          disabled={envio.enviandoId === registro.raw._id}
          style={{ width: '100%', minHeight: 48, borderRadius: 14, marginTop: 12 }}
        >
          <MailOutlined /> {envio.enviandoId === registro.raw._id ? 'Enviando…' : `Enviar ${envio.documentosDe(registro.raw)} por correo`}
        </ChipOpcion>
      )}

      <div style={{
        display: 'flex', justifyContent: esEdicion ? 'space-between' : 'center',
        alignItems: 'center', gap: 8, marginTop: 16,
      }}>
        {onAbrirCompleto && (
          <button
            type="button"
            onClick={abrirCompleto}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--qc-text)', fontSize: 14, fontWeight: 600, padding: '8px 0' }}
          >
            <ExportOutlined /> Formulario completo
          </button>
        )}
        {esEdicion && (
          <button
            type="button"
            onClick={eliminar}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, fontWeight: 600, padding: '8px 0' }}
          >
            <DeleteOutlined /> Eliminar
          </button>
        )}
      </div>
    </BottomSheet>
  );
};

export default RegistroRapido;
