import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';

// Reconocimiento de voz del navegador (Chrome/Android y Safari/iPhone). Si no
// existe, el botón del micrófono no se muestra; igual queda el dictado del
// propio teclado del celular.
const Reconocimiento = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
  : null;

/**
 * Dictar un movimiento ("almuerzo veinticinco mil"). El texto llega mientras
 * se habla (parcial) y la escucha se corta sola al terminar la frase.
 * `onTexto(texto, alternativas)`: alternativas = otras versiones de la frase.
 *
 * `iniciar` debe llamarse dentro del toque del usuario: Safari solo pide el
 * permiso del micrófono desde un gesto.
 */
const useDictado = () => {
  const [escuchando, setEscuchando] = useState(false);
  const rec = useRef(null);

  const detener = useCallback(() => {
    try { rec.current?.stop(); } catch { /* ya estaba detenido */ }
  }, []);

  const iniciar = useCallback((onTexto) => {
    if (!Reconocimiento) return false;
    try { rec.current?.abort(); } catch { /* nada que cortar */ }

    const r = new Reconocimiento();
    r.lang = 'es-CO';
    r.interimResults = true;
    r.continuous = false;
    // Varias versiones de lo dicho: quien recibe puede preferir la que trae un
    // monto. Safari suele dar una sola; Chrome en Android, varias.
    r.maxAlternatives = 3;
    r.onresult = (e) => {
      let previo = '';
      for (let i = 0; i < e.results.length - 1; i += 1) previo += e.results[i][0].transcript;
      const ultimo = e.results[e.results.length - 1];
      const versiones = Array.from(ultimo || [], (alt) => (previo + alt.transcript).trim());
      onTexto?.(versiones[0] || previo.trim(), versiones.slice(1));
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        message.warning('Permite el uso del micrófono para dictar.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        message.warning('No se pudo usar el dictado. Prueba con el micrófono del teclado.');
      }
    };
    r.onend = () => {
      setEscuchando(false);
      if (rec.current === r) rec.current = null;
    };

    try {
      r.start();
      rec.current = r;
      setEscuchando(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Si la pantalla se cierra con el micrófono abierto, se suelta.
  useEffect(() => () => { try { rec.current?.abort(); } catch { /* nada */ } }, []);

  return { disponible: !!Reconocimiento, escuchando, iniciar, detener };
};

export default useDictado;
