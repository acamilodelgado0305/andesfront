import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button, Tooltip, Spin } from 'antd';
import {
  LeftOutlined, RightOutlined, FullscreenOutlined, FullscreenExitOutlined,
  FilePdfOutlined, FilePptOutlined, FileImageOutlined, Html5Outlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { getFlexAuthToken } from '../../utils/authToken';

// Visor de presentaciones de una clase, estilo diapositivas: llena un marco 16:9
// (mismo footprint que el reproductor de video) y avanza UNA diapositiva por paso,
// horizontalmente, con flechas ◀ ▶ + contador (y ← / → en pantalla completa).
//
// Cada archivo aporta una o varias diapositivas:
//   · pdf  → se renderiza con pdf.js, UNA página por diapositiva (no scroll vertical).
//   · html → se renderiza en un iframe AISLADO (sandbox); cada <div class="slide-container">
//            es una diapositiva. Cargan fuentes/íconos/imágenes/animaciones externas.
//   · svg  → 1 diapositiva (<img>, no inline: no ejecuta scripts embebidos).
//   · pptx → 1 "diapositiva" con el visor online de Microsoft Office.
// pdf y html se descargan por el proxy same-origin del backend (evita CORS de GCS).

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const API_BASE = import.meta.env.VITE_API_BACKEND;
const proxyUrl = (presId) => `${API_BASE}/api/clases/presentaciones/${presId}/file`;

const officeEmbed = (url) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

const iconFor = (tipo) => {
  if (tipo === 'pdf') return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  if (tipo === 'svg') return <FileImageOutlined style={{ color: '#0ea5e9' }} />;
  if (tipo === 'html') return <Html5Outlined style={{ color: '#6366f1' }} />;
  return <FilePptOutlined style={{ color: '#ea580c' }} />; // pptx / ppt
};

// Script + estilos que inyectamos en el HTML subido para convertirlo en diapositivas:
// muestra una .slide-container a la vez, la centra y la escala al viewport, y escucha
// mensajes del padre para cambiar de diapositiva. Corre en un iframe aislado.
const buildSrcdoc = (rawHtml, hasSlides) => {
  if (!hasSlides) return rawHtml;
  const inject = `
<style id="__qc_pres">
  html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#000!important;}
  .slide-container{display:none!important;position:fixed!important;top:50%!important;left:50%!important;margin:0!important;transform-origin:center center!important;}
  .slide-container.__qc_on{display:flex!important;}
</style>
<script>
(function(){
  var W=1280,H=720;
  var slides=[].slice.call(document.querySelectorAll('.slide-container'));
  var cur=0;
  function fit(){
    var el=slides[cur]; if(!el) return;
    var vw=window.innerWidth||W, vh=window.innerHeight||H;
    var s=Math.min(vw/W, vh/H)||1;
    el.style.transform='translate(-50%,-50%) scale('+s+')';
  }
  function show(i){
    if(!slides.length) return;
    cur=Math.max(0,Math.min(slides.length-1,i));
    slides.forEach(function(el,idx){ if(idx===cur){el.classList.add('__qc_on');} else {el.classList.remove('__qc_on');} });
    fit();
  }
  window.addEventListener('message',function(e){ var d=e.data||{}; if(d&&d.__qc==='goto') show(d.index|0); });
  window.addEventListener('resize',fit);
  show(0);
  try{ window.parent.postMessage({__qc:'ready',count:slides.length},'*'); }catch(_){}
})();
</script>`;
  return /<\/body>/i.test(rawHtml)
    ? rawHtml.replace(/<\/body>/i, () => `${inject}</body>`)
    : rawHtml + inject;
};

export default function PresentacionViewer({ presentaciones = [] }) {
  const [idx, setIdx] = useState(0);
  const [isFs, setIsFs] = useState(false);
  // Antes de "Iniciar" mostramos una portada con un botón central de arranque;
  // al iniciar se revelan las diapositivas y los controles grandes de navegación.
  const [started, setStarted] = useState(false);
  const [slides, setSlides] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const htmlIframeRef = useRef(null);
  const docsRef = useRef({});     // presId -> PDFDocumentProxy (cache)
  const htmlDocsRef = useRef({}); // presId -> { srcdoc, count }
  const curSlideRef = useRef(null);

  // Firma estable de la lista para no recomputar en cada render.
  const sig = useMemo(
    () => presentaciones.map((p) => `${p.id}:${p.tipo}`).join(','),
    [presentaciones],
  );

  // Construye la lista plana de diapositivas. PDF → una por página (pdf.js);
  // HTML → una por .slide-container (parseando el archivo vía proxy); SVG/PPTX → 1.
  // Si un archivo falla al cargar, cae a un modo de respaldo para no perderlo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!presentaciones.length) { setSlides([]); return; }
      setLoadingDocs(true);
      const token = getFlexAuthToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
      const built = [];
      for (const p of presentaciones) {
        if (p.tipo === 'pdf') {
          try {
            let doc = docsRef.current[p.id];
            if (!doc) {
              doc = await pdfjsLib.getDocument({ url: proxyUrl(p.id), httpHeaders: authHeaders }).promise;
              docsRef.current[p.id] = doc;
            }
            for (let n = 1; n <= doc.numPages; n += 1) {
              built.push({ key: `${p.id}-${n}`, kind: 'pdf', presId: p.id, pageNum: n, nombre: p.nombre, tipo: 'pdf' });
            }
          } catch {
            built.push({ key: `${p.id}-fb`, kind: 'pdf-fallback', url: p.url, nombre: p.nombre, tipo: 'pdf' });
          }
        } else if (p.tipo === 'html') {
          try {
            let info = htmlDocsRef.current[p.id];
            if (!info) {
              const res = await fetch(proxyUrl(p.id), { headers: authHeaders || {} });
              if (!res.ok) throw new Error(`http ${res.status}`);
              const rawHtml = await res.text();
              const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
              const n = parsed.querySelectorAll('.slide-container').length;
              const count = n > 0 ? n : 1;
              info = { srcdoc: buildSrcdoc(rawHtml, n > 0), count };
              htmlDocsRef.current[p.id] = info;
            }
            for (let s = 0; s < info.count; s += 1) {
              built.push({ key: `${p.id}-h${s}`, kind: 'html', presId: p.id, slideIndex: s, nombre: p.nombre, tipo: 'html' });
            }
          } catch {
            built.push({ key: `${p.id}-hfb`, kind: 'html-fallback', url: p.url, nombre: p.nombre, tipo: 'html' });
          }
        } else if (p.tipo === 'svg') {
          built.push({ key: `${p.id}-svg`, kind: 'svg', url: p.url, nombre: p.nombre, tipo: 'svg' });
        } else {
          built.push({ key: `${p.id}-pptx`, kind: 'pptx', url: p.url, nombre: p.nombre, tipo: 'pptx' });
        }
      }
      if (!cancelled) { setSlides(built); setIdx(0); setStarted(false); setLoadingDocs(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const total = slides.length;
  const slide = total ? slides[Math.min(idx, total - 1)] : null;
  curSlideRef.current = slide;

  // Renderiza la página del PDF actual en el canvas, ajustada al marco 16:9.
  useEffect(() => {
    if (!slide || slide.kind !== 'pdf') return undefined;
    let renderTask;
    let cancelled = false;
    (async () => {
      const doc = docsRef.current[slide.presId];
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      const page = await doc.getPage(slide.pageNum);
      if (cancelled) return;
      const box = canvas.parentElement;
      const cw = box?.clientWidth || 960;
      const ch = box?.clientHeight || 540;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(cw / base.width, ch / base.height) || 1;
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const ctx = canvas.getContext('2d');
      renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise.catch(() => {});
    })();
    return () => { cancelled = true; renderTask?.cancel?.(); };
  }, [slide, isFs, resizeTick]);

  // Le dice al iframe del HTML qué diapositiva mostrar (al cambiar de paso o al cargar).
  const postGoto = () => {
    const s = curSlideRef.current;
    const iframe = htmlIframeRef.current;
    if (s?.kind === 'html' && iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ __qc: 'goto', index: s.slideIndex }, '*');
    }
  };
  useEffect(() => {
    if (slide?.kind === 'html') postGoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  // Si cambia la lista y el índice queda fuera de rango, vuelve al inicio.
  useEffect(() => { if (idx > total - 1) setIdx(0); }, [total, idx]);

  // Sincroniza pantalla completa + re-render al redimensionar la ventana.
  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === wrapRef.current);
    const onResize = () => setResizeTick((t) => t + 1);
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Navegación con teclado solo en pantalla completa (para no mover la página).
  useEffect(() => {
    if (!isFs || total <= 1) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(total - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFs, total]);

  if (!presentaciones.length) return null;

  const multi = total > 1;
  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(total - 1, i + 1));
  const toggleFs = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  return (
    <div
      ref={wrapRef}
      className={`overflow-hidden border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] ${
        isFs ? 'flex flex-col w-screen h-screen' : 'rounded-lg'
      }`}
    >
      {/* Barra superior: nombre + navegación + pantalla completa */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-[#403e3a] bg-gray-50 dark:bg-[#262624]">
        <span className="flex items-center gap-2 min-w-0 text-sm text-gray-700 dark:text-[#faf9f5]">
          {iconFor(slide?.tipo)}
          <span className="truncate">Presentación</span>
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {multi && started && (
            <span className="text-xs text-gray-500 dark:text-[#a8a59e] tabular-nums">{idx + 1} / {total}</span>
          )}
          <Tooltip title={isFs ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            <Button size="small" type="text"
              icon={isFs ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFs} />
          </Tooltip>
        </div>
      </div>

      {/* Marco 16:9 (o flexible al ocupar toda la pantalla) */}
      <div
        className={`relative bg-black w-full ${isFs ? 'flex-1' : ''}`}
        style={isFs ? undefined : { aspectRatio: '16 / 9' }}
      >
        {loadingDocs && !total ? (
          <div className="absolute inset-0 flex items-center justify-center"><Spin /></div>
        ) : slide?.kind === 'pdf' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <canvas ref={canvasRef} />
          </div>
        ) : slide?.kind === 'html' ? (
          <iframe
            key={slide.presId}
            ref={htmlIframeRef}
            title={slide.nombre}
            srcDoc={htmlDocsRef.current[slide.presId]?.srcdoc}
            className="absolute inset-0 w-full h-full bg-black"
            style={{ border: 0 }}
            sandbox="allow-scripts"
            onLoad={postGoto}
          />
        ) : slide?.kind === 'html-fallback' ? (
          <iframe
            key={slide.presId}
            title={slide.nombre}
            src={slide.url}
            className="absolute inset-0 w-full h-full bg-white"
            style={{ border: 0 }}
          />
        ) : slide?.kind === 'svg' ? (
          <img src={slide.url} alt={slide.nombre} className="absolute inset-0 w-full h-full object-contain bg-white" />
        ) : slide?.kind === 'pptx' ? (
          <iframe
            title={slide.nombre}
            src={officeEmbed(slide.url)}
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
            allowFullScreen
          />
        ) : slide?.kind === 'pdf-fallback' ? (
          <iframe
            title={slide.nombre}
            src={`${slide.url}#toolbar=0&view=FitH`}
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
          />
        ) : null}

        {/* Portada: botón central "Iniciar" antes de comenzar la presentación */}
        {!started && total > 0 && !loadingDocs && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55 hover:bg-black/45 transition-colors cursor-pointer"
          >
            <span
              className="flex items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105"
              style={{ width: 84, height: 84, background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
            >
              <CaretRightOutlined style={{ fontSize: 42, color: '#fff', marginLeft: 6 }} />
            </span>
            <span className="text-white font-semibold text-lg">Iniciar</span>
            {multi && <span className="text-white/70 text-sm">{total} diapositivas</span>}
          </button>
        )}

        {/* Navegación grande y visible (flechas laterales + contador inferior) */}
        {started && multi && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={idx === 0}
              aria-label="Diapositiva anterior"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full text-white bg-black/45 hover:bg-black/70 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ width: 48, height: 48 }}
            >
              <LeftOutlined style={{ fontSize: 22 }} />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={idx === total - 1}
              aria-label="Diapositiva siguiente"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full text-white bg-black/45 hover:bg-black/70 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ width: 48, height: 48 }}
            >
              <RightOutlined style={{ fontSize: 22 }} />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-full bg-black/60 backdrop-blur px-4 py-1.5">
              <span className="text-white text-sm font-medium tabular-nums">{idx + 1} / {total}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
