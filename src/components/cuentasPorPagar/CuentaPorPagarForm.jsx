import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer, Form, Input, InputNumber, Button, DatePicker,
  Space, Typography, message, Tag, Avatar, Spin, Empty,
} from 'antd';
import {
  UserOutlined, CalendarOutlined, SearchOutlined,
  UserAddOutlined, CloseCircleOutlined, FileProtectOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Nombre completo del contacto (nombre + apellido). Para empresas apellido va vacío.
const nombreCompletoPersona = (p) => [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim();

import { createCuentaPorPagar, updateCuentaPorPagar } from '../../services/cuentaPorPagar/cuentaPorPagarService';
import { parseFechaDia, toFechaDiaPayload } from '../../utils/fechas';
import { getPersonas } from '../../services/person/personaService';
import PersonaFormDrawer from '../personas/PersonaFormDrawer';
import useCurrency, { useCurrencyInput } from '../../hooks/useCurrency';

const { Text } = Typography;
const { TextArea } = Input;

const ACCENT = '#1d4ed8'; // azul del tema → botones, iconos, selección (igual que Facturas)

const CuentaPorPagarForm = ({ open, onClose, onSaved, editingDoc }) => {
  const formatCurrency = useCurrency();
  const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser, precision: currPrecision, step: currStep } = useCurrencyInput();
  const [form] = Form.useForm();

  const [total, setTotal]   = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Cuotas ──────────────────────────────────────────────────────────────────
  // Toda cuenta se paga en N cuotas de un valor fijo; lo normal es 1.
  const numCuotas  = Form.useWatch('num_cuotas', form);
  const valorCuota = Form.useWatch('valor_cuota', form);
  const fechaEmision = Form.useWatch('fecha_emision', form);
  const cuotasNum  = Math.max(1, Math.trunc(Number(numCuotas) || 1));
  const totalCuotas = round2(cuotasNum * (Number(valorCuota) || 0));

  // El vencimiento cae N meses después de la emisión. Se recalcula al cambiar
  // cuotas o emisión; si el usuario lo ajusta a mano, ese valor se respeta hasta
  // que vuelva a tocar alguno de los dos.
  const cuotasPrev = useRef(null);
  useEffect(() => { if (!open) cuotasPrev.current = null; }, [open]);
  useEffect(() => {
    if (!open || !fechaEmision) return;
    const clave = `${cuotasNum}|${dayjs(fechaEmision).format('YYYY-MM-DD')}`;
    const primeraVez = cuotasPrev.current === null;
    if (!primeraVez && cuotasPrev.current === clave) return;
    cuotasPrev.current = clave;
    // Al abrir una cuenta existente se respeta el vencimiento que ya tiene.
    if (primeraVez && editingDoc) return;
    form.setFieldsValue({ fecha_vencimiento: dayjs(fechaEmision).add(cuotasNum, 'month') });
  }, [open, cuotasNum, fechaEmision, form, editingDoc]);

  // ── Contacto (proveedor) ──────────────────────────────────────────────────
  const [personaSearch, setPersonaSearch]         = useState('');
  const [personasResult, setPersonasResult]       = useState([]);
  const [loadingPersonas, setLoadingPersonas]     = useState(false);
  const [selectedPersona, setSelectedPersona]     = useState(null);
  const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);

  // ─── Apertura / cierre ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editingDoc) {
      setTotal(Number(editingDoc.total) || 0);
      if (editingDoc.persona_id) {
        setSelectedPersona({
          id: editingDoc.persona_id,
          nombre: editingDoc.persona_nombre || editingDoc.proveedor_nombre || '',
        });
      } else {
        setSelectedPersona(null);
      }
      form.setFieldsValue({
        titulo:              editingDoc.titulo || '',
        proveedor_nombre:    editingDoc.proveedor_nombre || '',
        total:               Number(editingDoc.total) || 0,
        notas:               editingDoc.notas || '',
        fecha_emision:       parseFechaDia(editingDoc.fecha_emision) || dayjs(),
        fecha_vencimiento:   parseFechaDia(editingDoc.fecha_vencimiento),
        num_cuotas:          editingDoc.num_cuotas || 1,
        valor_cuota:         editingDoc.valor_cuota != null
          ? Number(editingDoc.valor_cuota)
          : round2((Number(editingDoc.total) || 0) / Math.max(1, Number(editingDoc.num_cuotas) || 1)),
      });
    } else {
      form.resetFields();
      setTotal(0);
      setSelectedPersona(null);
      setPersonaSearch('');
      setPersonasResult([]);
    }
  }, [open, editingDoc]);

  // ─── Búsqueda de contactos con debounce ──────────────────────────────────
  useEffect(() => {
    if (personaSearch.length < 2) { setPersonasResult([]); return; }
    const t = setTimeout(async () => {
      setLoadingPersonas(true);
      try {
        const data = await getPersonas({ q: personaSearch });
        setPersonasResult(Array.isArray(data) ? data : (data?.personas || []));
      } catch { /* silencioso */ }
      finally { setLoadingPersonas(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [personaSearch]);

  // ─── Guardar ──────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        titulo:            values.titulo,
        persona_id:        selectedPersona?.id || null,
        proveedor_nombre:  nombreCompletoPersona(selectedPersona) || values.proveedor_nombre || null,
        notas:             values.notas || null,
        fecha_emision:     toFechaDiaPayload(values.fecha_emision),
        num_cuotas:        Math.max(1, Math.trunc(Number(values.num_cuotas) || 1)),
        valor_cuota:       Number(values.valor_cuota) || 0,
        fecha_vencimiento: toFechaDiaPayload(values.fecha_vencimiento),
      };
      if (editingDoc) {
        await updateCuentaPorPagar(editingDoc.id, payload);
        message.success('Cuenta por pagar actualizada');
      } else {
        await createCuentaPorPagar(payload);
        message.success('Cuenta por pagar creada');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Error al guardar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: '#fafafa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileProtectOutlined style={{ color: ACCENT, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                {editingDoc ? 'Editar' : 'Nueva'} cuenta por pagar
              </div>
              {editingDoc && (
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>{editingDoc.titulo}</div>
              )}
            </div>
          </div>
        }
        placement="right"
        width={Math.min(window.innerWidth, 560)}
        open={open}
        onClose={onClose}
        maskClosable={false}
        styles={{ body: { padding: '20px 24px', background: '#f9fafb' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total:{' '}
              <strong style={{ color: ACCENT, fontSize: 15 }}>{formatCurrency(totalCuotas || total)}</strong>
            </Text>
            <Space>
              <Button onClick={onClose}>Cancelar</Button>
              <Button
                type="primary" loading={saving} onClick={handleGuardar}
                style={{ background: ACCENT, borderColor: ACCENT }}
              >
                {editingDoc ? 'Guardar cambios' : 'Crear cuenta'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" size="middle">

          {/* ── DATOS ── */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <Form.Item
              label="Título"
              name="titulo"
              rules={[{ required: true, message: 'Ingresa un título' }]}
              style={{ marginBottom: 14 }}
            >
              <Input placeholder="Ej: Arriendo local, Préstamo Bancolombia..." />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, marginBottom: 12 }}>
              <Form.Item
                label="N° de cuotas"
                name="num_cuotas"
                initialValue={1}
                rules={[{ required: true, message: 'Cuotas' }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber style={{ width: '100%' }} size="large" min={1} max={600} precision={0} placeholder="1" />
              </Form.Item>
              <Form.Item
                label="Valor de cada cuota"
                name="valor_cuota"
                rules={[{ required: true, message: 'Ingresa el valor de la cuota' }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  style={{ width: '100%' }} size="large" min={0}
                  addonAfter={currSuffix}
                  formatter={currFormatter}
                  parser={currParser}
                  precision={currPrecision}
                  step={currStep}
                  placeholder="0"
                />
              </Form.Item>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: '10px 14px',
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {cuotasNum > 1 ? `${cuotasNum} cuotas de ${formatCurrency(Number(valorCuota) || 0)}` : 'Pago único'}
              </Text>
              <Text strong style={{ fontSize: 15, color: ACCENT }}>{formatCurrency(totalCuotas)}</Text>
            </div>
          </div>

          {/* ── FECHAS ── */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <CalendarOutlined style={{ color: ACCENT }} />
              <Text strong style={{ fontSize: 13 }}>Fechas</Text>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item label="Fecha emisión" name="fecha_emision" initialValue={dayjs()} style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item label="Fecha vencimiento" name="fecha_vencimiento" style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
              Se recalcula solo al cambiar las cuotas o la emisión ({cuotasNum} {cuotasNum === 1 ? 'mes' : 'meses'} después de la emisión). Puedes ajustarla a mano.
            </Text>
          </div>

          {/* ── CONTACTO / PROVEEDOR ── */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <UserOutlined style={{ color: ACCENT }} />
              <Text strong style={{ fontSize: 13 }}>Contacto / Proveedor</Text>
            </div>

            {selectedPersona ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#fafafa', border: `2px solid ${ACCENT}`,
                borderRadius: 10, padding: '10px 14px',
              }}>
                <Avatar style={{ background: ACCENT, flexShrink: 0 }} icon={<UserOutlined />} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedPersona.nombre} {selectedPersona.apellido || ''}</div>
                  {selectedPersona.numero_documento && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {selectedPersona.tipo_documento ? `${selectedPersona.tipo_documento}: ` : ''}{selectedPersona.numero_documento}
                    </div>
                  )}
                  {selectedPersona.email && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>{selectedPersona.email}</div>
                  )}
                </div>
                <Button
                  type="text" size="small"
                  icon={<CloseCircleOutlined style={{ color: '#94a3b8' }} />}
                  onClick={() => { setSelectedPersona(null); setPersonaSearch(''); }}
                />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Buscar por nombre o documento..."
                    value={personaSearch}
                    onChange={(e) => setPersonaSearch(e.target.value)}
                    allowClear
                  />
                  <Button
                    icon={<UserAddOutlined />}
                    onClick={() => setPersonaDrawerOpen(true)}
                    style={{ flexShrink: 0, color: ACCENT, borderColor: ACCENT }}
                  >
                    Crear
                  </Button>
                </div>

                {loadingPersonas && (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}><Spin size="small" /></div>
                )}

                {!loadingPersonas && personaSearch.length >= 2 && personasResult.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '6px 0' }}
                    description={
                      <span style={{ fontSize: 12 }}>
                        Sin resultados —{' '}
                        <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: ACCENT }}>crear contacto</a>
                      </span>
                    }
                  />
                )}

                {personasResult.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {personasResult.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedPersona(p); setPersonaSearch(''); setPersonasResult([]); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          border: '1.5px solid #e5e7eb', background: '#fff',
                          transition: 'border-color 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                      >
                        <Avatar size="small" style={{ background: ACCENT }} icon={<UserOutlined />} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre} {p.apellido || ''}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.tipo_documento}: {p.numero_documento}</div>
                        </div>
                        {p.tipo && (
                          <Tag color={p.tipo === 'PROVEEDOR' ? 'orange' : (p.tipo === 'CLIENTE' ? 'green' : 'blue')} style={{ fontSize: 11 }}>
                            {p.tipo}
                          </Tag>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {personaSearch.length === 0 && (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingTop: 2 }}>
                    Escribe para buscar · Si no está,{' '}
                    <a onClick={() => setPersonaDrawerOpen(true)} style={{ color: ACCENT }}>créalo aquí</a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── NOTAS ── */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
            <Form.Item label="Notas (opcional)" name="notas" style={{ marginBottom: 0 }}>
              <TextArea rows={3} placeholder="Detalles, número de factura del proveedor, condiciones..." />
            </Form.Item>
          </div>

        </Form>
      </Drawer>

      {/* ── Sub-drawer: crear contacto ── */}
      <PersonaFormDrawer
        open={personaDrawerOpen}
        onClose={() => setPersonaDrawerOpen(false)}
        onSuccess={(persona) => {
          setSelectedPersona(persona);
          setPersonaDrawerOpen(false);
        }}
        defaultTipo="PROVEEDOR"
      />
    </>
  );
};

export default CuentaPorPagarForm;
