// src/components/Sidebar/MobileBottomNav.jsx
// Barra de navegación inferior para móvil.
//
// Por qué existe: en móvil el sidebar vive detrás de un botón de 36px arriba a
// la izquierda, así que al entrar el usuario solo veía el resumen del día y no
// encontraba las herramientas. Esta barra deja los accesos más usados siempre
// a la vista y al alcance del pulgar, en TODA la app (no solo en el inicio).
//
// Qué muestra: los primeros ítems del menú del usuario — que ya viene ordenado
// por sus preferencias (ver sidebarService) — más "Más", que abre el menú
// completo. Es decir: lo que el usuario puso primero es lo que queda en la barra.
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppstoreOutlined } from '@ant-design/icons';

// Cuántos accesos directos caben cómodos junto al botón "Más".
export const MOBILE_NAV_SLOTS = 4;
// Alto de la barra (sin el área segura del dispositivo). Lo usa el layout para
// reservar espacio y que la barra no tape el final del contenido.
export const MOBILE_NAV_HEIGHT = 58;

const MobileBottomNav = ({ sections = [], onMore, onNavigate, isDark = false }) => {
  const location = useLocation();

  const items = sections.flatMap(s => s.items || []).slice(0, MOBILE_NAV_SLOTS);
  if (items.length === 0) return null;

  const bg = isDark ? '#30302e' : '#ffffff';
  const border = isDark ? '#403e3a' : '#e9eaec';
  const idle = isDark ? '#a8a59e' : '#6b7280';
  const active = '#1d4ed8';

  const celda = (contenido, key, esActivo, extra = {}) => (
    <div
      key={key}
      style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, padding: '6px 2px',
        color: esActivo ? active : idle,
        ...extra,
      }}
    >
      {contenido}
    </div>
  );

  return (
    <nav
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 999,
        display: 'flex', alignItems: 'stretch',
        height: MOBILE_NAV_HEIGHT,
        backgroundColor: bg,
        borderTop: `1px solid ${border}`,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        // Deja libre la franja del gesto de inicio en iPhone / Android.
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxSizing: 'content-box',
      }}
    >
      {items.map((item) => {
        const esActivo = location.pathname === item.path;
        return (
          <Link
            key={item.key}
            to={item.path}
            // Cierra el cajón "Más" si estaba abierto: la barra queda por
            // encima de él y, si no, el menú tapaba la página recién abierta.
            onClick={onNavigate}
            style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
          >
            {celda(
              <>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: esActivo ? 700 : 500,
                  maxWidth: '100%', textAlign: 'center', lineHeight: 1.15,
                  // Dos líneas en vez de recortar: etiquetas como "Cuentas por
                  // Pagar" quedaban en "Cuentas p…" en una celda de ~75px.
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', wordBreak: 'break-word',
                }}>
                  {item.label}
                </span>
              </>,
              item.key,
              esActivo,
              { width: '100%' }
            )}
          </Link>
        );
      })}

      <button
        onClick={onMore}
        aria-label="Ver todo el menú"
        style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        {celda(
          <>
            <span style={{ fontSize: 18, lineHeight: 1 }}><AppstoreOutlined /></span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>Más</span>
          </>,
          'more',
          false,
          { width: '100%' }
        )}
      </button>
    </nav>
  );
};

export default MobileBottomNav;
