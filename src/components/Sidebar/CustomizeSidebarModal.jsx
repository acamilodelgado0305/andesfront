// src/components/Sidebar/CustomizeSidebarModal.jsx
// Editor del menú lateral: arrastra para ordenar, ojo para mostrar/ocultar.
//
// Las preferencias son del usuario Y del negocio activo (ver sidebarService):
// el mismo usuario puede tener un orden en su institución y otro en su tienda.
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Tooltip, Tag, message } from 'antd';
import {
  HolderOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { orderedItems } from '../../services/sidebar/sidebarService';

const CustomizeSidebarModal = ({
  open,
  onClose,
  sections,          // secciones por defecto (ya filtradas por plan/rol)
  prefs,             // { order, hidden } vigentes
  onSave,            // (prefs) => Promise
  onReset,           // () => Promise
  businessName,
  isDark = false,
}) => {
  // Lista de trabajo: los ítems en el orden actual, cada uno con `hidden`.
  const inicial = useMemo(() => orderedItems(sections, prefs), [sections, prefs]);
  const [items, setItems] = useState(inicial);
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  // Al abrir, siempre partir de lo que hay guardado (descarta ediciones a medias).
  useEffect(() => {
    if (open) {
      setItems(inicial);
      setDragIndex(null);
    }
  }, [open, inicial]);

  const visiblesCount = items.filter(i => !i.hidden).length;

  const mover = (desde, hasta) => {
    if (hasta < 0 || hasta >= items.length || desde === hasta) return;
    setItems((prev) => {
      const next = [...prev];
      const [movido] = next.splice(desde, 1);
      next.splice(hasta, 0, movido);
      return next;
    });
  };

  const toggleVisible = (index) => {
    setItems((prev) => {
      const item = prev[index];
      // No dejar el menú vacío: siempre debe quedar al menos un acceso.
      if (!item.hidden && prev.filter(i => !i.hidden).length === 1) {
        message.info('Debe quedar al menos una opción visible en el menú.');
        return prev;
      }
      const next = [...prev];
      next[index] = { ...item, hidden: !item.hidden };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        order: items.map(i => i.key),
        hidden: items.filter(i => i.hidden).map(i => i.key),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onReset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const rowBg = isDark ? '#3a3a38' : '#ffffff';
  const rowBorder = isDark ? '#4a4845' : '#e9eaec';
  const textStrong = isDark ? '#faf9f5' : '#111827';
  const textMuted = isDark ? '#a8a59e' : '#6b7280';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Personalizar menú"
      width={480}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={handleReset} disabled={saving}>
          Restaurar por defecto
        </Button>,
        <Button key="cancel" onClick={onClose} disabled={saving}>Cancelar</Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>Guardar</Button>,
      ]}
    >
      <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>
        Arrastra para cambiar el orden y usa el ojo para ocultar lo que no usas.
        Este menú aplica solo a <strong style={{ color: textStrong }}>{businessName || 'este negocio'}</strong>;
        en tus otros negocios puedes tener otro orden.
      </p>

      <div style={{ maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>
        {items.map((item, index) => (
          <div
            key={item.key}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            // Reordenamos al entrar en la fila (preview en vivo, sin librerías).
            onDragEnter={() => {
              if (dragIndex === null || dragIndex === index) return;
              mover(dragIndex, index);
              setDragIndex(index);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              marginBottom: 6,
              borderRadius: 8,
              border: `1px solid ${rowBorder}`,
              backgroundColor: rowBg,
              opacity: dragIndex === index ? 0.5 : item.hidden ? 0.55 : 1,
              cursor: 'grab',
              transition: 'opacity 0.15s',
            }}
          >
            <HolderOutlined style={{ color: textMuted, fontSize: 14, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: textMuted, flexShrink: 0 }}>{item.icon}</span>

            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                fontWeight: 500,
                color: textStrong,
                textDecoration: item.hidden ? 'line-through' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </span>

            {item.sectionLabel && (
              <Tag
                color={item.sectionColor === '#7c3aed' ? 'purple' : 'blue'}
                style={{ fontSize: 10, lineHeight: '16px', margin: 0, flexShrink: 0 }}
              >
                {item.sectionLabel.replace('Gestión ', '')}
              </Tag>
            )}

            {/* Flechas: alternativa al arrastre (táctil y teclado) */}
            <Button
              type="text" size="small" icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => mover(index, index - 1)}
              aria-label={`Subir ${item.label}`}
            />
            <Button
              type="text" size="small" icon={<ArrowDownOutlined />}
              disabled={index === items.length - 1}
              onClick={() => mover(index, index + 1)}
              aria-label={`Bajar ${item.label}`}
            />
            <Tooltip title={item.hidden ? 'Mostrar en el menú' : 'Ocultar del menú'}>
              <Button
                type="text" size="small"
                icon={item.hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => toggleVisible(index)}
                aria-label={`${item.hidden ? 'Mostrar' : 'Ocultar'} ${item.label}`}
              />
            </Tooltip>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: textMuted, margin: '10px 0 0' }}>
        {visiblesCount} de {items.length} opciones visibles. Ocultar una opción no
        quita el permiso: la sección sigue disponible por su dirección web.
      </p>
    </Modal>
  );
};

export default CustomizeSidebarModal;
