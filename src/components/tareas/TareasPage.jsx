// src/components/tareas/TareasPage.jsx
// /inicio/tareas — el "Trello" propio de Rapictrl.
//
// La URL manda (así el botón atrás y los avisos del celular funcionan):
//   ?tablero=ID   proyecto abierto (si no, el inicio de Tareas)
//   ?tarjeta=ID   detalle de una tarjeta encima de la vista
//   ?negocio=ID   el aviso venía de otro negocio: se cambia solo a ese negocio
//
// Todo cuelga del negocio activo: en "Andres Camilo Delgado" vive lo personal,
// la universidad y los proyectos propios.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message, Spin } from 'antd';
import { AuthContext } from '../../AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { ALTO_ABAJO } from '../Certificados/mobile/piezas';
import InicioTareas from './InicioTareas';
import TableroVista from './TableroVista';

const TareasPage = () => {
  const { user, login } = useContext(AuthContext);
  const esMovil = useIsMobile();
  const [params, setParams] = useSearchParams();
  const [tableros, setTableros] = useState([]);
  const [archivados, setArchivados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cambiandoNegocio, setCambiandoNegocio] = useState(false);

  const tableroId = Number(params.get('tablero')) || null;
  const tarjetaId = Number(params.get('tarjeta')) || null;
  const negocio = Number(params.get('negocio')) || null;

  const cargarTableros = useCallback(async () => {
    try {
      const [activos, arch] = await Promise.all([api.getTableros(), api.getTableros(true)]);
      setTableros(activos);
      setArchivados(arch);
    } catch (e) {
      message.error(mensajeError(e, 'No se pudieron cargar los proyectos'));
    } finally {
      setCargando(false);
    }
  }, []);

  // El aviso del celular trae el negocio de la tarea: si no es el activo, se
  // cambia (misma ruta que el selector de negocios del header).
  useEffect(() => {
    if (!negocio || !user) return;
    const limpiar = () => setParams((p) => { const n = new URLSearchParams(p); n.delete('negocio'); return n; }, { replace: true });
    if (Number(user.bid) === negocio) { limpiar(); return; }
    const existe = (user.businesses || []).some((b) => Number(b.id) === negocio) || user.role === 'superadmin';
    if (!existe) { limpiar(); return; }
    setCambiandoNegocio(true);
    (async () => {
      try {
        const { switchBusiness } = await import('../../services/auth/authService');
        const r = await switchBusiness(negocio);
        if (r?.token) {
          login(r.token, r.user, r.refreshToken);
          const destino = new URLSearchParams(params);
          destino.delete('negocio');
          window.location.replace(`/inicio/tareas${destino.toString() ? `?${destino}` : ''}`);
          return;
        }
      } catch {
        message.error('No se pudo cambiar al negocio de esa tarea');
      }
      setCambiandoNegocio(false);
      limpiar();
    })();
    // Solo cuando llega un ?negocio nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio]);

  useEffect(() => { if (!negocio) cargarTableros(); }, [cargarTableros, negocio, user?.bid]);

  const cambiar = (cambios) => setParams((p) => {
    const n = new URLSearchParams(p);
    Object.entries(cambios).forEach(([k, v]) => (v == null ? n.delete(k) : n.set(k, String(v))));
    return n;
  });

  const abrirTablero = (id) => cambiar({ tablero: id, tarjeta: null });
  const volver = () => { cambiar({ tablero: null, tarjeta: null }); cargarTableros(); };
  const abrirTarjeta = (id) => cambiar({ tarjeta: id });
  const cerrarTarjeta = () => cambiar({ tarjeta: null });

  const fondo = (contenido) => (
    <div
      className={tableroId ? 'qc-tablero-fondo' : undefined}
      style={esMovil
        ? { margin: '-16px -16px -28px', padding: '14px 12px 0', paddingBottom: ALTO_ABAJO, minHeight: 'calc(100vh - 52px)', background: tableroId ? undefined : 'var(--qc-bg)' }
        : { margin: -24, padding: '20px 28px 32px', minHeight: 'calc(100vh - 52px)', background: tableroId ? undefined : 'var(--qc-bg)' }}
    >
      {contenido}
    </div>
  );

  if (cambiandoNegocio) {
    return fondo(<div style={{ padding: 80, textAlign: 'center', color: 'var(--qc-text-muted)' }}><Spin /><div style={{ marginTop: 12 }}>Abriendo el negocio de esa tarea…</div></div>);
  }

  return fondo(tableroId ? (
    <TableroVista
      key={tableroId}
      tableroId={tableroId}
      tableros={tableros}
      esMovil={esMovil}
      tarjetaAbierta={tarjetaId}
      abrirTarjeta={abrirTarjeta}
      cerrarTarjeta={cerrarTarjeta}
      onVolver={volver}
      onTablerosCambio={cargarTableros}
    />
  ) : (
    <InicioTareas
      tableros={tableros}
      archivados={archivados}
      cargandoTableros={cargando}
      esMovil={esMovil}
      nombreNegocio={user?.business_name}
      tarjetaAbierta={tarjetaId}
      abrirTarjeta={abrirTarjeta}
      cerrarTarjeta={cerrarTarjeta}
      abrirTablero={abrirTablero}
      onTablerosCambio={cargarTableros}
    />
  ));
};

export default TareasPage;
