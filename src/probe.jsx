import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import Dashboard from './components/documentosVenta/DocumentosVentaDashboard';
import { AuthContext } from './AuthContext';
import { ThemeProvider } from './ThemeContext';

// ?crudo=1 -> el backend viejo, que responde las fechas como ISO con Z
const CRUDO = new URLSearchParams(location.search).has('crudo');
const RAW = await fetch('/__docs.json').then(r => r.json());

// El backend nuevo responde 'YYYY-MM-DD'; el viejo, el ISO completo.
const ROWS = RAW.map(d => ({
  ...d,
  fecha_emision:     CRUDO ? d.fecha_emision     : (d.fecha_emision     || '').slice(0,10) || null,
  fecha_vencimiento: CRUDO ? d.fecha_vencimiento : (d.fecha_vencimiento || '').slice(0,10) || null,
}));

window.__cap = [];
const O = window.XMLHttpRequest;
window.XMLHttpRequest = function () {
  const x = new O(); const open = x.open, send = x.send;
  x.open = function(m,u){ this.__m=m; this.__u=u; return open.apply(this,arguments); };
  x.send = function(b){
    window.__cap.push({m:this.__m,u:this.__u,body:b});
    const url=this.__u||''; let p=null;
    const mes = (url.match(/mes=(\d{4}-\d{2})/) || [])[1] || null;
    const enMes = (r) => !mes || String(r.fecha_emision || '').slice(0,7) === mes;
    if (url.includes('/stats')) {
      const f = ROWS.filter(enMes);
      p = [{ tipo:'FACTURA', estado:'EMITIDA', cantidad:f.length, total_suma:f.reduce((a,x)=>a+Number(x.total||0),0) }];
    } else if (url.includes('/documentos-venta')) {
      p = ROWS.filter(enMes);
    }
    if (p!==null){
      Object.defineProperty(this,'readyState',{value:4,configurable:true});
      Object.defineProperty(this,'status',{value:200,configurable:true});
      Object.defineProperty(this,'response',{value:JSON.stringify(p),configurable:true});
      Object.defineProperty(this,'responseText',{value:JSON.stringify(p),configurable:true});
      this.getAllResponseHeaders=()=>'content-type: application/json';
      this.getResponseHeader=()=>'application/json';
      setTimeout(()=>{this.onreadystatechange&&this.onreadystatechange();this.onload&&this.onload();this.onloadend&&this.onloadend();},10);
      return;
    }
    return send.apply(this,arguments);
  };
  return x;
};
const AUTH = { user: { id: 1, name: 'Probe', business_id: 34, rol: 'admin' }, login: () => {}, logout: () => {}, loading: false };
ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider><AuthContext.Provider value={AUTH}><Dashboard /></AuthContext.Provider></ThemeProvider>
);
