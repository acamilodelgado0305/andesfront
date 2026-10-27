// src/components/tareas/TareasPage.jsx
// /inicio/tareas — el "Trello" propio de Rapictrl.
//
// La URL manda (así el botón atrás y los avisos del celular funcionan):
//   ?tablero=ID   proyecto abierto (si no, el inicio de Tareas)
//   ?tarjeta=ID   detalle de una tarjeta encima de la vista
//
// Las tareas son del USUARIO, no del negocio: se ven igual desde cualquier
// negocio en que esté la sesión, y nadie más del negocio las ve.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { AuthContext } from '../../AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { ALTO_ABAJO } from '../Certificados/mobile/piezas';
import InicioTareas from './InicioTareas';
import TableroVista from './TableroVista';

const TareasPage = () => {
  const { user } = useContext(AuthContext);
  const esMovil = useIsMobile();
  const [params, setParams] = useSearchParams();
  const [tableros, setTableros] = useState([]);
  const [archivados, setArchivados] = useState([]);
  const [cargando, setCargando] = useState(true);

  const tableroId = Number(params.get('tablero')) || null;
  const tarjetaId = Number(params.get('tarjeta')) || null;

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

  useEffect(() => { cargarTableros(); }, [cargarTableros]);

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
      nombreUsuario={user?.name}
      tarjetaAbierta={tarjetaId}
      abrirTarjeta={abrirTarjeta}
      cerrarTarjeta={cerrarTarjeta}
      abrirTablero={abrirTablero}
      onTablerosCambio={cargarTableros}
    />
  ));
};

export default TareasPage;
