// src/components/tareas/useTablero.js
// Estado de un proyecto abierto (listas, etiquetas, tarjetas) y sus cambios.
// Todo es optimista: la pantalla cambia al instante y si el servidor falla se
// recarga lo real.
import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';

const PASO = 1024;
const porPosicion = (a, b) => a.posicion - b.posicion || a.id - b.id;

/** Misma cuenta del backend: posición para quedar debajo de `despuesDe` (null = arriba). */
export const posicionLocal = (vecinos, despuesDe) => {
  let i = 0;
  if (despuesDe != null) {
    const k = vecinos.findIndex((v) => v.id === despuesDe);
    i = k >= 0 ? k + 1 : vecinos.length;
  }
  const antes = vecinos[i - 1]?.posicion;
  const despues = vecinos[i]?.posicion;
  if (antes === undefined && despues === undefined) return PASO;
  if (antes === undefined) return despues - PASO;
  if (despues === undefined) return antes + PASO;
  return (antes + despues) / 2;
};

const useTablero = (tableroId, { onTarjetaNueva } = {}) => {
  const [datos, setDatos] = useState(null); // { tablero, listas, etiquetas, tarjetas }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const vivo = useRef(true);
  const avisarNueva = useRef(onTarjetaNueva);
  avisarNueva.current = onTarjetaNueva;

  const recargar = useCallback(async (silencioso = false) => {
    if (!tableroId) return;
    if (!silencioso) setCargando(true);
    try {
      const d = await api.getTablero(tableroId);
      if (!vivo.current) return;
      d.listas.sort(porPosicion);
      d.tarjetas.sort(porPosicion);
      setDatos(d);
      setError(null);
    } catch (e) {
      if (vivo.current) setError(mensajeError(e, 'No se pudo abrir el proyecto'));
    } finally {
      if (vivo.current) setCargando(false);
    }
  }, [tableroId]);

  useEffect(() => {
    vivo.current = true;
    setDatos(null);
    recargar();
    return () => { vivo.current = false; };
  }, [recargar]);

  const fallo = useCallback((e, texto) => {
    message.error(mensajeError(e, texto));
    recargar(true);
  }, [recargar]);

  // ── tarjetas ──────────────────────────────────────────────────────────────
  const ponerTarjeta = useCallback((t) => {
    if (!t) return;
    setDatos((d) => {
      if (!d) return d;
      if (t.tablero_id !== d.tablero.id || t.archivada) {
        return { ...d, tarjetas: d.tarjetas.filter((x) => x.id !== t.id) };
      }
      const existe = d.tarjetas.some((x) => x.id === t.id);
      const tarjetas = existe ? d.tarjetas.map((x) => (x.id === t.id ? { ...x, ...t } : x)) : [...d.tarjetas, t];
      return { ...d, tarjetas: tarjetas.sort(porPosicion) };
    });
  }, []);

  const quitarTarjeta = useCallback((id) => {
    setDatos((d) => (d ? { ...d, tarjetas: d.tarjetas.filter((x) => x.id !== id) } : d));
  }, []);

  // La API devuelve `siguiente` cuando completar una tarea que se repite hizo
  // nacer la próxima.
  const recibirSiguiente = useCallback((resp) => {
    if (resp?.siguiente) {
      ponerTarjeta(resp.siguiente);
      avisarNueva.current?.(resp.siguiente);
    }
  }, [ponerTarjeta]);

  const crearTarjeta = useCallback(async (listaId, body) => {
    try {
      const t = await api.crearTarjeta(listaId, body);
      ponerTarjeta(t);
      return t;
    } catch (e) {
      fallo(e, 'No se pudo crear la tarjeta');
      return null;
    }
  }, [ponerTarjeta, fallo]);

  const moverTarjeta = useCallback(async (id, listaId, despuesDe) => {
    let local = null;
    setDatos((d) => {
      if (!d) return d;
      const vecinos = d.tarjetas.filter((x) => x.lista_id === listaId && x.id !== id).sort(porPosicion);
      const posicion = posicionLocal(vecinos, despuesDe);
      const lista = d.listas.find((l) => l.id === listaId);
      local = posicion;
      return {
        ...d,
        tarjetas: d.tarjetas.map((x) => (x.id === id
          ? { ...x, lista_id: listaId, posicion, ...(lista?.es_final ? { completada: true } : {}) }
          : x)).sort(porPosicion),
      };
    });
    try {
      const resp = await api.moverTarjeta(id, listaId, despuesDe);
      ponerTarjeta(resp);
      recibirSiguiente(resp);
      // El servidor renumeró la lista: se traen las posiciones reales.
      if (local !== null && Math.abs(resp.posicion - local) > 1e-6) recargar(true);
    } catch (e) {
      fallo(e, 'No se pudo mover la tarjeta');
    }
  }, [ponerTarjeta, recibirSiguiente, fallo, recargar]);

  const actualizarTarjeta = useCallback(async (id, cambios) => {
    setDatos((d) => (d ? { ...d, tarjetas: d.tarjetas.map((x) => (x.id === id ? { ...x, ...cambios } : x)) } : d));
    try {
      const resp = await api.actualizarTarjeta(id, cambios);
      const { lista_subtareas, lista_comentarios, lista_adjuntos, siguiente, ...resumen } = resp;
      ponerTarjeta(resumen);
      recibirSiguiente(resp);
      return resp;
    } catch (e) {
      fallo(e, 'No se pudo guardar');
      return null;
    }
  }, [ponerTarjeta, recibirSiguiente, fallo]);

  // ── listas ────────────────────────────────────────────────────────────────
  const crearLista = useCallback(async (nombre) => {
    try {
      const l = await api.crearLista(tableroId, { nombre });
      setDatos((d) => (d ? { ...d, listas: [...d.listas, l].sort(porPosicion) } : d));
      return l;
    } catch (e) { fallo(e, 'No se pudo crear la lista'); return null; }
  }, [tableroId, fallo]);

  const actualizarLista = useCallback(async (id, cambios) => {
    setDatos((d) => (d ? { ...d, listas: d.listas.map((l) => (l.id === id ? { ...l, ...cambios } : l)) } : d));
    try {
      await api.actualizarLista(id, cambios);
      if (cambios.es_final) recargar(true); // sus tarjetas quedaron completadas
    } catch (e) { fallo(e, 'No se pudo guardar la lista'); }
  }, [fallo, recargar]);

  const moverLista = useCallback(async (id, despuesDe) => {
    setDatos((d) => {
      if (!d) return d;
      const vecinos = d.listas.filter((l) => l.id !== id);
      const posicion = posicionLocal(vecinos, despuesDe);
      return { ...d, listas: d.listas.map((l) => (l.id === id ? { ...l, posicion } : l)).sort(porPosicion) };
    });
    try { await api.moverLista(id, despuesDe); } catch (e) { fallo(e, 'No se pudo mover la lista'); }
  }, [fallo]);

  const eliminarLista = useCallback(async (id, moverA) => {
    try {
      await api.eliminarLista(id, moverA);
      await recargar(true);
      return true;
    } catch (e) { fallo(e, 'No se pudo eliminar la lista'); return false; }
  }, [fallo, recargar]);

  // ── etiquetas y proyecto ──────────────────────────────────────────────────
  const setEtiquetas = useCallback((fn) => {
    setDatos((d) => (d ? { ...d, etiquetas: fn(d.etiquetas) } : d));
  }, []);

  const actualizarTablero = useCallback(async (cambios) => {
    setDatos((d) => (d ? { ...d, tablero: { ...d.tablero, ...cambios } } : d));
    try {
      const t = await api.actualizarTablero(tableroId, cambios);
      setDatos((d) => (d ? { ...d, tablero: t } : d));
      return t;
    } catch (e) { fallo(e, 'No se pudo guardar el proyecto'); return null; }
  }, [tableroId, fallo]);

  return {
    datos, cargando, error, recargar,
    ponerTarjeta, quitarTarjeta, crearTarjeta, moverTarjeta, actualizarTarjeta,
    crearLista, actualizarLista, moverLista, eliminarLista,
    setEtiquetas, actualizarTablero,
  };
};

export default useTablero;
