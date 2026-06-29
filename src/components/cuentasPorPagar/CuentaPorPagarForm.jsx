import React, { useState, useEffect } from 'react';
import {
  Drawer, Form, Input, InputNumber, Button, DatePicker,
  Space, Typography, message, Tag, Avatar, Spin, Empty, Switch,
} from 'antd';
import {
  UserOutlined, CalendarOutlined, SearchOutlined,
  UserAddOutlined, CloseCircleOutlined, FileProtectOutlined,
  BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Vista previa del cronograma (interés sobre saldo, abono a capital fijo)
const calcularResumenPrestamo = (capital, tasaEa, numCuotas) => {
  const cap = Number(capital) || 0;
  const n   = Number(numCuotas) || 0;
  const ea  = Number(tasaEa) || 0;
  if (cap <= 0 || n <= 0) return { total: cap, interesTotal: 0, primera: 0, ultima: 0, tasaMensual: 0 };
  const tasaMensual = Math.pow(1 + ea / 100, 1 / 12) - 1;
  const capCuota = cap / n;
  let totalInteres = 0, primera = 0, ultima = 0;
  for (let i = 1; i <= n; i++) {
    const saldoIni = cap - capCuota * (i - 1);
    const interes  = round2(saldoIni * tasaMensual);
    const c        = i === n ? round2(saldoIni) : round2(capCuota);
    const valor    = round2(c + interes);
    totalInteres += interes;
    if (i === 1) primera = valor;
    if (i === n) ultima = valor;
  }
  return { total: round2(cap + totalInteres), interesTotal: round2(totalInteres), primera, ultima, tasaMensual };
};

import { createCuentaPorPagar, updateCuentaPorPagar } from '../../services/cuentaPorPagar/cuentaPorPagarService';
import { getPersonas } from '../../services/person/personaService';
import PersonaFormDrawer from '../personas/PersonaFormDrawer';
import useCurrency from '../../hooks/useCurrency';

const { Text } = Typography;
const { TextArea } = Input;

const ACCENT = '#ea580c'; // naranja → cuentas por pagar / proveedor

const CuentaPorPagarForm = ({ open, onClose, onSaved, editingDoc }) => {
  const formatCurrency = useCurrency();
  const [form] = Form.useForm();

  const [total, setTotal]   = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Préstamo ────────────────────────────────────────────────────────────────
  const [esPrestamo, setEsPrestamo] = useState(false);
  const [loanLocked, setLoanLocked] = useState(false); // bloqueado si ya tiene cuotas pagadas
  const capital   = Form.useWatch('capital', form);
  const tasaEa    = Form.useWatch('tasa_ea', form);
  const numCuotas = Form.useWatch('num_cuotas', form);
  const resumen   = calcularResumenPrestamo(capital, tasaEa, numCuotas);

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
      setEsPrestamo(!!editingDoc.es_prestamo);
      setLoanLocked(!!editingDoc.es_prestamo && Number(editingDoc.total_abonado || 0) > 0);
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
        fecha_emision:       editingDoc.fecha_emision     ? dayjs(editingDoc.fecha_emision)     : dayjs(),
        fecha_vencimiento:   editingDoc.fecha_vencimiento ? dayjs(editingDoc.fecha_vencimiento) : null,
        capital:             editingDoc.capital != null ? Number(editingDoc.capital) : null,
        tasa_ea:             editingDoc.tasa_ea != null ? Number(editingDoc.tasa_ea) : null,
        num_cuotas:          editingDoc.num_cuotas || null,
        fecha_primera_cuota: editingDoc.fecha_primera_cuota ? dayjs(editingDoc.fecha_primera_cuota) : null,
      });
    } else {
      form.resetFields();
      setTotal(0);
      setEsPrestamo(false);
      setLoanLocked(false);
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
        proveedor_nombre:  selectedPersona?.nombre || values.proveedor_nombre || null,
        notas:             values.notas || null,
        fecha_emision:     values.fecha_emision ? values.fecha_emision.format('YYYY-MM-DD') : null,
        es_prestamo:       esPrestamo,
      };
      if (esPrestamo) {
        payload.capital             = Number(values.capital) || 0;
        payload.tasa_ea             = values.tasa_ea != null ? Number(values.tasa_ea) : null;
        payload.num_cuotas          = Number(values.num_cuotas) || 0;
        payload.periodicidad        = 'MENSUAL';
        payload.fecha_primera_cuota = values.fecha_primera_cuota
          ? values.fecha_primera_cuota.format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD');
      } else {
        payload.total             = Number(values.total) || 0;
        payload.fecha_vencimiento = values.fecha_vencimiento ? values.fecha_vencimiento.format('YYYY-MM-DD') : null;
      }
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
              width: 34, height: 34, borderRadius: 8, background: '#fff7ed',
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
              <strong style={{ color: ACCENT, fontSize: 15 }}>{formatCurrency(esPrestamo ? resumen.total : total)}</strong>
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

            {/* Toggle préstamo */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: esPrestamo ? '#fff7ed' : '#f9fafb',
              border: `1px solid ${esPrestamo ? '#fed7aa' : '#e5e7eb'}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: esPrestamo ? 0 : 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BankOutlined style={{ color: ACCENT }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Es un préstamo bancario</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Con intereses y cuotas mensuales</div>
                </div>
              </div>
              <Switch
                checked={esPrestamo}
                disabled={loanLocked}
                onChange={setEsPrestamo}
                style={esPrestamo ? { background: ACCENT } : undefined}
              />
            </div>

            {!esPrestamo && (
              <Form.Item
                label="Monto total a pagar"
                name="total"
                rules={[{ required: true, message: 'Ingresa el total' }]}
                style={{ marginBottom: 0, marginTop: 14 }}
              >
                <InputNumber
                  style={{ width: '100%' }} size="large" min={0}
                  value={total}
                  onChange={(v) => setTotal(v || 0)}
                  formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            )}
          </div>

          {/* ── PRÉSTAMO ── */}
          {esPrestamo && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <BankOutlined style={{ color: ACCENT }} />
                <Text strong style={{ fontSize: 13 }}>Datos del préstamo</Text>
              </div>

              {loanLocked && (
                <div style={{
                  background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8,
                  padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#854d0e',
                }}>
                  Este préstamo ya tiene cuotas pagadas; sus parámetros no se pueden modificar.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Form.Item
                  label="Capital (monto prestado)"
                  name="capital"
                  rules={[{ required: true, message: 'Ingresa el capital' }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: '100%' }} min={0} disabled={loanLocked}
                    formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                    placeholder="0"
                  />
                </Form.Item>
                <Form.Item
                  label="Tasa de interés (% E.A.)"
                  name="tasa_ea"
                  rules={[{ required: true, message: 'Ingresa la tasa' }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    style={{ width: '100%' }} min={0} max={1000} step={0.1} disabled={loanLocked}
                    suffix="%" placeholder="Ej: 19.56"
                  />
                </Form.Item>
                <Form.Item
                  label="Número de cuotas"
                  name="num_cuotas"
                  rules={[{ required: true, message: 'Ingresa las cuotas' }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber style={{ width: '100%' }} min={1} max={600} disabled={loanLocked} placeholder="Ej: 12" />
                </Form.Item>
                <Form.Item
                  label="Fecha primera cuota"
                  name="fecha_primera_cuota"
                  initialValue={dayjs().add(1, 'month')}
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled={loanLocked} />
                </Form.Item>
              </div>

              {/* Vista previa */}
              {resumen.total > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <Text type="secondary">Tasa mensual equivalente</Text>
                    <Text>{(resumen.tasaMensual * 100).toFixed(3)}%</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <Text type="secondary">Interés total estimado</Text>
                    <Text>{formatCurrency(resumen.interesTotal)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <Text type="secondary">Primera cuota → última</Text>
                    <Text>{formatCurrency(resumen.primera)} → {formatCurrency(resumen.ultima)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                    <span>Total a pagar</span>
                    <span style={{ color: ACCENT }}>{formatCurrency(resumen.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

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
              {!esPrestamo && (
                <Form.Item label="Fecha vencimiento" name="fecha_vencimiento" style={{ marginBottom: 0 }}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              )}
            </div>
            {esPrestamo && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                El vencimiento se calcula automáticamente con la fecha de la última cuota.
              </Text>
            )}
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
                background: '#fff7ed', border: `2px solid ${ACCENT}`,
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
