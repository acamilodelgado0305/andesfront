// src/components/common/BottomSheet.jsx
// Hoja que sube desde abajo (bottom sheet), el patrón de las apps del celular:
// se alcanza con el pulgar y se cierra tocando fuera. Es un Drawer de antd
// (hereda el modo oscuro solo) con esquinas redondeadas, agarradera y espacio
// para la barra de gestos del iPhone.
import React from 'react';
import { Drawer } from 'antd';

const BottomSheet = ({
  open,
  onClose,
  title,
  subtitle,
  extra,
  footer,
  children,
  height = 'auto',
  maxHeight = '88vh',
  zIndex,
  destroyOnClose = true,
  bodyStyle,
  afterOpenChange,
  // false en hojas con un campo que se enfoca al abrir: si el Drawer se roba el
  // foco, en el iPhone se cierra el teclado que ya venía abierto.
  autoFocus = true,
}) => (
  <Drawer
    open={open}
    onClose={onClose}
    placement="bottom"
    height={height}
    closable={false}
    autoFocus={autoFocus}
    destroyOnClose={destroyOnClose}
    zIndex={zIndex}
    footer={footer}
    afterOpenChange={afterOpenChange}
    title={
      <div>
        {/* Agarradera: señal visual de que la hoja se puede cerrar */}
        <div
          aria-hidden
          style={{
            width: 38, height: 4, borderRadius: 2,
            background: 'var(--qc-border)', margin: '0 auto 10px',
          }}
        />
        {(title || extra) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              {title && (
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--qc-text)', lineHeight: 1.25 }}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--qc-text-muted)', marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
            {extra}
          </div>
        )}
      </div>
    }
    styles={{
      wrapper: {
        maxHeight,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
      },
      content: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
      header: { padding: '8px 18px 10px', borderBottom: 'none' },
      body: {
        padding: '4px 18px calc(18px + env(safe-area-inset-bottom, 0px))',
        ...bodyStyle,
      },
      footer: { padding: '10px 18px calc(10px + env(safe-area-inset-bottom, 0px))' },
    }}
  >
    {children}
  </Drawer>
);

export default BottomSheet;
