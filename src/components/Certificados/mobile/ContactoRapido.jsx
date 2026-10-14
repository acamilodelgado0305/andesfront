import React, { useEffect, useState } from 'react';
import { Button, Input, Spin } from 'antd';
import { CloseCircleFilled, SearchOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';

import { getPersonas } from '../../../services/person/personaService';
import PersonaFormDrawer from '../../personas/PersonaFormDrawer';

const TIPO = { CLIENTE: 'Cliente', PROVEEDOR: 'Proveedor', COLABORADOR: 'Colaborador' };

/**
 * Cliente de un ingreso, en versión compacta para el registro rápido del
 * celular: buscar por nombre o documento, elegir, o crear uno nuevo ahí mismo
 * (con el mismo formulario de Contactos).
 */
const ContactoRapido = ({ value, onChange }) => {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [crearAbierto, setCrearAbierto] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setLista([]); return undefined; }
    let vigente = true;
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const data = await getPersonas({ q: q.trim() });
        if (vigente) setLista((Array.isArray(data) ? data : (data?.personas || [])).slice(0, 8));
      } catch { /* sin resultados */ } finally {
        if (vigente) setCargando(false);
      }
    }, 350);
    return () => { vigente = false; clearTimeout(t); };
  }, [q]);

  const elegir = (p) => { onChange?.(p); setQ(''); setLista([]); };

  if (value) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14,
        border: '1.5px solid var(--qc-text)', background: 'var(--qc-surface)',
      }}>
        <UserOutlined style={{ color: 'var(--qc-text)', fontSize: 16 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {`${value.nombre || ''} ${value.apellido || ''}`.trim() || 'Cliente'}
          </div>
          {(value.numero_documento || value.email) && (
            <div style={{ fontSize: 12, color: 'var(--qc-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[value.numero_documento && `${value.tipo_documento || 'Doc'} ${value.numero_documento}`, value.email].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Quitar cliente"
          onClick={() => onChange?.(null)}
          style={{ border: 'none', background: 'none', padding: 4, cursor: 'pointer', color: 'var(--qc-text-muted)', fontSize: 18 }}
        >
          <CloseCircleFilled />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          size="large"
          prefix={<SearchOutlined style={{ color: 'var(--qc-text-muted)' }} />}
          placeholder="Buscar por nombre o documento"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          allowClear
          style={{ fontSize: 16, borderRadius: 14 }}
        />
        <Button size="large" icon={<UserAddOutlined />} onClick={() => setCrearAbierto(true)} style={{ borderRadius: 14 }}>
          Crear
        </Button>
      </div>

      {cargando && <div style={{ textAlign: 'center', padding: 8 }}><Spin size="small" /></div>}

      {!cargando && lista.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {lista.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => elegir(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 14, cursor: 'pointer',
                border: 'none', background: 'var(--qc-surface)',
              }}
            >
              <UserOutlined style={{ color: 'var(--qc-text-muted)' }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--qc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {`${p.nombre || ''} ${p.apellido || ''}`.trim()}
                </span>
                {p.numero_documento && (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--qc-text-muted)' }}>
                    {p.tipo_documento}: {p.numero_documento}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, color: 'var(--qc-text-muted)' }}>{TIPO[p.tipo] || p.tipo}</span>
            </button>
          ))}
        </div>
      )}

      {!cargando && q.trim().length >= 2 && lista.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--qc-text-muted)', textAlign: 'center', padding: '10px 0 2px' }}>
          Sin resultados ·{' '}
          <a onClick={() => setCrearAbierto(true)} style={{ color: 'var(--qc-text)', fontWeight: 700, textDecoration: 'underline' }}>crear contacto</a>
        </div>
      )}

      <PersonaFormDrawer
        open={crearAbierto}
        onClose={() => setCrearAbierto(false)}
        onSuccess={(p) => { setCrearAbierto(false); elegir(p); }}
        defaultTipo="CLIENTE"
      />
    </div>
  );
};

export default ContactoRapido;
