// src/components/common/BottomSheet.jsx
// Hoja que sube desde abajo (bottom sheet), el patrón de las apps del celular:
// se alcanza con el pulgar y se cierra tocando fuera. Es un Drawer de antd
// (hereda el modo oscuro solo) con esquinas redondeadas, agarradera y espacio
// para la barra de gestos del iPhone.
//
// `lateral`: en computador la misma hoja se abre como panel a la derecha
// (una hoja a todo el ancho de la pantalla se vería fuera de lugar).
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
  lateral = false,
  width = 460,
}) => (
  <Drawer
    open={open}
    onClose={onClose}
    placement={lateral ? 'right' : 'bottom'}
    height={lateral ? undefined : height}
    width={lateral ? width : undefined}
    closable={false}
    autoFocus={autoFocus}
    destroyOnClose={destroyOnClose}
    zIndex={zIndex}
    footer={footer}
    afterOpenChange={afterOpenChange}
    title={
      <div>
        {/* Agarradera: señal visual de que la hoja se puede cerrar */}
        {!lateral && (
          <div
            aria-hidden
            style={{
              width: 38, height: 4, borderRadius: 2,
              background: 'var(--qc-border)', margin: '0 auto 10px',
            }}
          />
        )}
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
      wrapper: lateral
        ? { boxShadow: '-8px 0 30px rgba(0,0,0,0.14)' }
        : {
          maxHeight,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        },
      content: lateral ? {} : { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
      header: { padding: lateral ? '16px 22px 10px' : '8px 18px 10px', borderBottom: 'none' },
      body: {
        padding: lateral ? '4px 22px 22px' : '4px 18px calc(18px + env(safe-area-inset-bottom, 0px))',
        ...bodyStyle,
      },
      footer: { padding: lateral ? '12px 22px' : '10px 18px calc(10px + env(safe-area-inset-bottom, 0px))' },
    }}
  >
    {children}
  </Drawer>
);

export default BottomSheet;
