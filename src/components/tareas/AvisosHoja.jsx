// src/components/tareas/AvisosHoja.jsx
// Notificaciones al celular: activar en este dispositivo, resumen del día y
// una explicación corta de cómo funcionan (la app no necesita estar abierta).
import React, { useEffect, useState } from 'react';
import { Button, Switch, Select, Spin, Alert, message } from 'antd';
import { BellOutlined, CheckCircleFilled, MobileOutlined } from '@ant-design/icons';
import BottomSheet from '../common/BottomSheet';
import * as api from '../../services/tareas/tareasService';
import { mensajeError } from '../../services/tareas/tareasService';
import { activarPush, desactivarPush, estadoPushDispositivo } from '../../services/pwa/push';
import { usePwaInstall } from '../../services/pwa/pwa';

const HORAS = Array.from({ length: 17 }, (_, i) => i + 5).map((h) => ({
  value: h,
  label: new Date(Date.UTC(2000, 0, 1, h)).toLocaleTimeString('es-CO', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }),
}));

const Paso = ({ n, children }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <span style={{
      width: 22, height: 22, borderRadius: 11, flexShrink: 0, fontSize: 12, fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--qc-relleno-fuerte)', color: 'var(--qc-text)',
    }}>
      {n}
    </span>
    <span style={{ fontSize: 13.5, color: 'var(--qc-text)', lineHeight: 1.45 }}>{children}</span>
  </div>
);

const AvisosHoja = ({ abierta, onCerrar, esMovil }) => {
  const [config, setConfig] = useState(null);
  const [estado, setEstado] = useState(null); // del dispositivo
  const [ocupado, setOcupado] = useState(false);
  const pwa = usePwaInstall();

  useEffect(() => {
    if (!abierta) return;
    let vivo = true;
    Promise.all([api.getAvisos().catch(() => null), estadoPushDispositivo().catch(() => 'no-soportado')])
      .then(([c, e]) => { if (vivo) { setConfig(c); setEstado(e); } });
    return () => { vivo = false; };
  }, [abierta]);

  const activar = async () => {
    setOcupado(true);
    try {
      const c = await activarPush(config?.clave_publica);
      setConfig(c);
      setEstado('activo');
      message.success('Listo: este dispositivo recibirá los avisos');
    } catch (e) {
      if (e.code === 'denied' || e.message === 'bloqueado') setEstado('bloqueado');
      else message.error(e.message === 'sin-permiso' ? 'No diste permiso para las notificaciones' : mensajeError(e, e.message || 'No se pudo activar'));
    } finally {
      setOcupado(false);
    }
  };

  const desactivar = async () => {
    setOcupado(true);
    try {
      const c = await desactivarPush();
      if (c) setConfig(c);
      setEstado('disponible');
    } catch (e) {
      message.error(mensajeError(e, 'No se pudo desactivar'));
    } finally {
      setOcupado(false);
    }
  };

  const cambiar = async (cambios) => {
    setConfig((c) => ({ ...c, ...cambios }));
    try { setConfig(await api.actualizarAvisos(cambios)); } catch (e) { message.error(mensajeError(e, 'No se pudo guardar')); }
  };

  const probar = async () => {
    try {
      await api.probarAvisos();
      message.success('Aviso de prueba enviado: debería llegar en unos segundos');
    } catch (e) { message.error(mensajeError(e, 'No se pudo enviar la prueba')); }
  };

  let bloque;
  if (!config || !estado) {
    bloque = <div style={{ padding: 30, textAlign: 'center' }}><Spin /></div>;
  } else if (!config.disponible) {
    bloque = <Alert type="warning" showIcon message="Falta configurar el servidor" description="Las llaves de notificaciones (VAPID) todavía no están en el servidor. Cuando se agreguen, este botón funciona." />;
  } else if (estado === 'instalar-ios') {
    bloque = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Alert type="info" showIcon icon={<MobileOutlined />} message="En iPhone, primero instala la app" description="Apple solo permite notificaciones a las apps agregadas a la pantalla de inicio (iOS 16.4 o más nuevo)." />
        <Paso n={1}>En Safari toca <strong>Compartir</strong> (el cuadrito con la flecha).</Paso>
        <Paso n={2}>Elige <strong>Agregar a inicio</strong> y confirma.</Paso>
        <Paso n={3}>Abre Rapictrl desde el ícono nuevo y vuelve aquí para activar los avisos.</Paso>
      </div>
    );
  } else if (estado === 'no-soportado') {
    bloque = <Alert type="warning" showIcon message="Este navegador no admite notificaciones" description="Usa Chrome en Android o en el computador, o la app instalada en el iPhone." />;
  } else if (estado === 'bloqueado') {
    bloque = (
      <Alert
        type="error"
        showIcon
        message="Las notificaciones están bloqueadas para Rapictrl"
        description="Ábrelas en los ajustes del navegador (el candado junto a la dirección → Notificaciones → Permitir) o, en el celular, en Ajustes → Notificaciones → Rapictrl. Luego vuelve a abrir esta hoja."
      />
    );
  } else if (estado === 'disponible') {
    bloque = (
      <Button type="primary" size="large" block icon={<BellOutlined />} loading={ocupado} onClick={activar}>
        Activar avisos en este dispositivo
      </Button>
    );
  } else {
    bloque = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(22,163,74,0.12)' }}>
          <CheckCircleFilled style={{ color: '#16a34a', fontSize: 20 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--qc-text)' }}>Avisos activos en este dispositivo</div>
            <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)' }}>
              {config.dispositivos} dispositivo{config.dispositivos === 1 ? '' : 's'} con avisos en tu cuenta
            </div>
          </div>
          <Button size="small" onClick={probar}>Probar</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={config.activo} onChange={(v) => cambiar({ activo: v })} />
          <span style={{ color: 'var(--qc-text)' }}>Avisos de tareas de este negocio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Switch checked={config.resumen_diario} disabled={!config.activo} onChange={(v) => cambiar({ resumen_diario: v })} />
          <span style={{ color: 'var(--qc-text)' }}>Resumen de mi día a las</span>
          <Select size="small" value={config.hora_resumen} disabled={!config.activo || !config.resumen_diario} onChange={(v) => cambiar({ hora_resumen: v })} options={HORAS} style={{ width: 110 }} />
        </div>
        <Button danger type="text" onClick={desactivar} loading={ocupado} style={{ alignSelf: 'flex-start', padding: 0 }}>
          Desactivar en este dispositivo
        </Button>
      </div>
    );
  }

  return (
    <BottomSheet open={abierta} onClose={onCerrar} title="Avisos al celular" subtitle="Recordatorios de tus tareas, aunque la app esté cerrada" lateral={!esMovil} width={460}>
      {bloque}

      <div style={{ marginTop: 22, padding: 14, borderRadius: 12, background: 'var(--qc-relleno)' }}>
        <div style={{ fontWeight: 700, color: 'var(--qc-text)', marginBottom: 8 }}>¿Cómo funcionan?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Paso n={1}>Das permiso una vez en cada dispositivo (celular, computador). El teléfono le da a Rapictrl una "dirección" privada para avisarte.</Paso>
          <Paso n={2}>A cada tarea con fecha le eliges cuándo avisarte: a la hora, 1 hora antes, 1 día antes…</Paso>
          <Paso n={3}>El servidor revisa cada 5 minutos y te manda el aviso. Llega como cualquier notificación, aunque la app esté cerrada; al tocarlo se abre la tarea.</Paso>
          <Paso n={4}>Cada mañana te llega el resumen: lo que vence hoy y lo que quedó vencido.</Paso>
        </div>
        {pwa.puedeInstalar && (
          <Button style={{ marginTop: 12 }} onClick={pwa.instalar} icon={<MobileOutlined />}>Instalar la app en este dispositivo</Button>
        )}
      </div>
    </BottomSheet>
  );
};

export default AvisosHoja;
