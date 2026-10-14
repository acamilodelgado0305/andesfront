import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, DatePicker, Input, Modal, message } from 'antd';
import {
  AudioOutlined, CalendarOutlined, CloseOutlined, DeleteOutlined, DownOutlined,
  ExportOutlined, MailOutlined, ThunderboltFilled, UpOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import BottomSheet from '../../common/BottomSheet';
import EtiquetasSelector from '../components/EtiquetasSelector';
import ComprobanteAdjunto, { sincronizarComprobante } from '../components/ComprobanteAdjunto';
import ContactoRapido from './ContactoRapido';
import { cuentaOptions } from '../options';
import { itemEnviaCorreo } from '../envioDocumentos';
import { conceptoDe, itemsDe } from '../movimientos';
import {
  capitalizar, interpretarMovimiento, normalizar, sugerirEtiqueta, sugerirProducto,
} from './interpretarMovimiento';
import { useAmountShort, useTypedAmount } from '../../../hooks/useCurrency';
import {
  createEgreso, updateEgreso, deleteEgreso, subirComprobanteEgreso, quitarComprobanteEgreso,
  createIngreso, updateIngreso, deleteIngreso, subirComprobanteIngreso, quitarComprobanteIngreso,
} from '../../../services/controlapos/posService';

export const COLOR_TIPO = { gasto: '#dc2626', ingreso: '#16a34a' };

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

// Botón tipo "pastilla" para elegir una opción con el pulgar. Sin `color`
// usa el azul de marca del tema (más claro en modo oscuro para que se lea).
const Chip = ({ activo, color, onClick, children, style }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activo}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
      minHeight: 38, padding: '0 14px', borderRadius: 19, cursor: 'pointer',
      fontSize: 14, fontWeight: activo ? 700 : 500, whiteSpace: 'nowrap',
      border: `1.5px solid ${activo ? (color || 'var(--qc-azul)') : 'var(--qc-border)'}`,
      background: activo ? (color ? `${color}1f` : 'var(--qc-azul-suave)') : 'var(--qc-surface)',
      color: activo ? (color || 'var(--qc-azul)') : 'var(--qc-text)',
      transition: 'background .12s, border-color .12s',
      ...style,
    }}
  >
    {children}
  </button>
);

/**
 * Registro rápido de un ingreso o gasto desde el celular, al estilo de MonAi:
 * se escribe o se dicta "almuerzo 25000" y la app separa el valor, la
 * descripción y sugiere la etiqueta (aprende de los gastos anteriores). Todo
 * queda editable antes de guardar. También sirve para editar uno existente.
 *
 * Lo poco común (cliente, documento soporte, varios productos, envío de
 * certificados) sigue disponible: en "Más detalles" o en el formulario completo.
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
  envio,                     // useEnvioDocumentos (certificados por correo)
  dictado,                   // useDictado
  receptorDictado,           // ref: el dictado iniciado afuera escribe aquí
  entradaPrevia,             // ref: campo puente que abrió el teclado del iPhone
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

  // El dictado que se inicia desde la barra de abajo escribe aquí.
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
    setFecha(d.hour(ahora.hour()).minute(ahora.minute()).second(ahora.second()));
  };

  const dictar = () => {
    if (!dictado?.disponible) return;
    if (dictado.escuchando) { dictado.detener(); return; }
    dictado.iniciar((t) => receptorDictado?.current?.(t));
  };

  // ── Datos derivados ──
  const color = COLOR_TIPO[tipo];
  const producto = tipo === 'ingreso' ? inventario.find((i) => String(i.id) === String(productoId)) : null;
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

  // ── Guardar ──
  const guardar = async () => {
    if (guardando) return;
    if (!(valor > 0)) {
      message.warning('Escribe el valor');
      montoRef.current?.focus();
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

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      height="92%"
      maxHeight="none"
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
              background: 'var(--qc-surface-2)', color: 'var(--qc-text)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
          >
            <CloseOutlined />
          </button>
          {titulo}
        </span>
      )}
      extra={(
        <Button
          type="primary"
          shape="round"
          loading={guardando}
          onClick={guardar}
          style={{ background: color, borderColor: color, fontWeight: 600 }}
        >
          Guardar
        </Button>
      )}
      footer={(
        <Button
          block
          type="primary"
          size="large"
          loading={guardando}
          onClick={guardar}
          style={{ height: 50, borderRadius: 14, fontWeight: 700, fontSize: 16, background: color, borderColor: color }}
        >
          {esEdicion ? 'Guardar cambios' : (tipo === 'gasto' ? 'Guardar gasto' : 'Guardar ingreso')}
        </Button>
      )}
    >
      {contextoModal}

      {/* ── Gasto / Ingreso ── */}
      {!esEdicion && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4,
          borderRadius: 14, background: 'var(--qc-surface-2)',
        }}>
          {['gasto', 'ingreso'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => cambiarTipo(t)}
              aria-pressed={tipo === t}
              style={{
                height: 40, borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 700,
                background: tipo === t ? COLOR_TIPO[t] : 'transparent',
                color: tipo === t ? '#fff' : 'var(--qc-text-muted)',
                transition: 'background .15s, color .15s',
              }}
            >
              {t === 'gasto' ? '− Gasto' : '+ Ingreso'}
            </button>
          ))}
        </div>
      )}

      {/* ── Valor ── */}
      <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--qc-text-muted)', letterSpacing: 1 }}>
          {codigo}
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
            textAlign: 'center', fontSize: 44, fontWeight: 800, lineHeight: 1.15,
            color, fontVariantNumeric: 'tabular-nums', padding: 0,
          }}
        />
      </div>

      {/* ── Texto libre (escribir o dictar) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
        padding: '2px 4px 2px 14px', borderRadius: 14,
        border: '1.5px solid var(--qc-border)', background: 'var(--qc-surface)',
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
            fontSize: 16, padding: '12px 0', color: 'var(--qc-text)',
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
              background: dictado.escuchando ? '#dc2626' : 'var(--qc-surface-2)',
              color: dictado.escuchando ? '#fff' : 'var(--qc-text)',
            }}
          >
            <AudioOutlined />
          </button>
        )}
      </div>
      <div style={{ minHeight: 18, marginTop: 6, fontSize: 12.5, color: 'var(--qc-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {dictado?.escuchando
          ? <span style={{ color: '#dc2626', fontWeight: 600 }}>Escuchando… di por ejemplo “almuerzo 25 mil”</span>
          : pista && (<><ThunderboltFilled style={{ color: '#f59e0b' }} /> {pista}</>)}
      </div>

      {/* ── Etiqueta (gastos) ── */}
      {tipo === 'gasto' && (
        <>
          <Etiqueta>Etiqueta</Etiqueta>
          <EtiquetasSelector
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
              style={{ marginBottom: 8, borderRadius: 12, fontSize: 16 }}
            />
          )}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px' }}>
            {productosOrdenados.map((item) => (
              <Chip
                key={item.id}
                activo={String(productoId) === String(item.id)}
                color={COLOR_TIPO.ingreso}
                onClick={() => elegirProducto(item)}
              >
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</span>
                {Number(item.monto) > 0 && (
                  <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>{montoCorto(item.monto)}</span>
                )}
              </Chip>
            ))}
            {productosOrdenados.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--qc-text-muted)' }}>Sin coincidencias</span>
            )}
          </div>
          {producto && itemEnviaCorreo(producto) && !esEdicion && (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 12, fontSize: 13,
              background: 'rgba(29,78,216,0.08)', color: 'var(--qc-text)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <MailOutlined style={{ color: 'var(--qc-azul)', fontSize: 16 }} />
              <span style={{ flex: 1 }}>Este producto envía certificado por correo. Para elegir el cliente y enviarlo, usa el formulario completo.</span>
              <Button size="small" onClick={abrirCompleto}>Abrir</Button>
            </div>
          )}
        </>
      )}

      {/* ── Cuenta ── */}
      <Etiqueta>{tipo === 'gasto' ? 'Pagado con' : 'Recibido en'}</Etiqueta>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cuentaOptions.map((c) => (
          <Chip key={c.value} activo={cuenta === c.value} onClick={() => setCuenta(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {/* ── Fecha ── */}
      <Etiqueta>Fecha</Etiqueta>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Chip activo={esHoy} onClick={() => elegirFecha(dayjs())}>Hoy</Chip>
        <Chip activo={esAyer} onClick={() => elegirFecha(dayjs().subtract(1, 'day'))}>Ayer</Chip>
        <DatePicker
          inputReadOnly
          allowClear={false}
          value={fecha}
          format="DD/MM/YYYY"
          onChange={(d) => d && elegirFecha(d)}
          disabledDate={(d) => d && d.isAfter(dayjs().endOf('day'))}
          suffixIcon={<CalendarOutlined />}
          placement="topLeft"
          style={{
            height: 38, borderRadius: 19, width: 150,
            borderColor: !esHoy && !esAyer ? 'var(--qc-azul)' : undefined,
            borderWidth: !esHoy && !esAyer ? 1.5 : 1,
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
          {tipo === 'ingreso' ? 'cliente, documento soporte' : 'documento soporte'}
        </span>
      </button>

      {masAbierto && (
        <div style={{ paddingBottom: 6 }}>
          {tipo === 'ingreso' && (
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

      {/* ── Acciones de un registro existente ── */}
      {esEdicion && tipo === 'ingreso' && envio?.puedeEnviar(registro.raw) && (
        <Button
          block
          size="large"
          icon={<MailOutlined />}
          loading={envio.enviandoId === registro.raw._id}
          onClick={() => envio.enviar(registro.raw)}
          style={{ marginTop: 12, borderRadius: 12 }}
        >
          Enviar {envio.documentosDe(registro.raw)} por correo
        </Button>
      )}

      <div style={{
        display: 'flex', justifyContent: esEdicion ? 'space-between' : 'center',
        alignItems: 'center', gap: 8, marginTop: 16,
      }}>
        {onAbrirCompleto && (
          <Button type="link" icon={<ExportOutlined />} onClick={abrirCompleto} style={{ paddingLeft: 0 }}>
            Formulario completo
          </Button>
        )}
        {esEdicion && (
          <Button danger type="text" icon={<DeleteOutlined />} onClick={eliminar}>
            Eliminar
          </Button>
        )}
      </div>
    </BottomSheet>
  );
};

export default RegistroRapido;
