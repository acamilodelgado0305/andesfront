import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import {
  Spin, Alert, Empty, Button, Drawer, Form, Input, InputNumber,
  notification, Tooltip, Modal, Tag, Select, Table, Space, Card,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, CloseOutlined, CheckCircleOutlined,
  UsergroupAddOutlined, PhoneOutlined, MailOutlined, BankOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

import {
  getLeads, getLeadStats, createLead, updateLead, deleteLead,
} from "../../services/crm/crmLeadService";
import { useNavigate } from "react-router-dom";
import { createPersona, getPersonas, getPersonaById } from "../../services/person/personaService";
import IngresoDrawer from "../Certificados/components/IngresoDrawer";
import { AuthContext } from "../../AuthContext";
import useCurrency, { useCurrencyInput } from "../../hooks/useCurrency";
import useIsMobile from "../../hooks/useIsMobile";

// ─── Estados del embudo ─────────────────────────────────────
const ESTADOS = [
  { value: 'NUEVO',      label: 'Nuevo',      color: '#2563eb', bg: '#eff6ff' },
  { value: 'CONTACTADO', label: 'Contactado', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'CALIFICADO', label: 'Calificado', color: '#0891b2', bg: '#ecfeff' },
  { value: 'PROPUESTA',  label: 'Propuesta',  color: '#d97706', bg: '#fffbeb' },
  { value: 'GANADO',     label: 'Ganado',     color: '#16a34a', bg: '#f0fdf4' },
  { value: 'PERDIDO',    label: 'Perdido',    color: '#dc2626', bg: '#fef2f2' },
];
const ESTADO_MAP = ESTADOS.reduce((a, e) => { a[e.value] = e; return a; }, {});

// ─── Orígenes ───────────────────────────────────────────────
const ORIGENES = [
  { value: 'WHATSAPP',  label: 'WhatsApp' },
  { value: 'FACEBOOK',  label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERIDO',  label: 'Referido' },
  { value: 'WEB',       label: 'Sitio web' },
  { value: 'LLAMADA',   label: 'Llamada' },
  { value: 'OTRO',      label: 'Otro' },
];
const ORIGEN_MAP = ORIGENES.reduce((a, o) => { a[o.value] = o; return a; }, {});

// ─── Tipos de documento (igual que en Contactos) ────────────
const TIPOS_DOC = ['CC', 'CE', 'TI', 'PAS', 'NIT', 'PPT'];

const EstadoTag = ({ estado }) => {
  const e = ESTADO_MAP[estado] || ESTADO_MAP.NUEVO;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: e.color, background: e.bg,
      padding: '2px 10px', borderRadius: 12, border: `1px solid ${e.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {e.label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
function CrmDashboard() {
  const fmt = useCurrency();
  const { addonAfter: currSuffix, formatter: currFormatter, parser: currParser } = useCurrencyInput();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [items, setItems]               = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [converting, setConverting]     = useState(false);
  const [ingresoOpen, setIngresoOpen]   = useState(false);
  const [ingresoPersona, setIngresoPersona] = useState(null);
  const [form] = Form.useForm();

  // ── Carga ──
  const fetchLeads = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [leads, st] = await Promise.all([getLeads(), getLeadStats()]);
      setItems(leads || []);
      setStats(st || null);
    } catch {
      setError('No se pudieron cargar los leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Filtros (cliente) ──
  const rows = useMemo(() => items.filter(it => {
    const matchE = filterEstado === 'todos' || it.estado === filterEstado;
    const q = searchTerm.toLowerCase();
    const matchQ = !q || it.nombre?.toLowerCase().includes(q)
      || it.empresa?.toLowerCase().includes(q)
      || it.email?.toLowerCase().includes(q)
      || it.telefono?.toLowerCase().includes(q);
    return matchE && matchQ;
  }), [items, filterEstado, searchTerm]);

  // ── Init drawer ──
  useEffect(() => {
    if (!isDrawerOpen) return;
    if (editingItem) {
      form.setFieldsValue({
        nombre:           editingItem.nombre,
        empresa:          editingItem.empresa || '',
        tipo_documento:   editingItem.tipo_documento || undefined,
        numero_documento: editingItem.numero_documento || '',
        email:            editingItem.email || '',
        telefono:         editingItem.telefono || '',
        origen:           editingItem.origen || 'OTRO',
        estado:           editingItem.estado || 'NUEVO',
        valor_estimado:   Number(editingItem.valor_estimado) || 0,
        notas:            editingItem.notas || '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ origen: 'WHATSAPP', estado: 'NUEVO', valor_estimado: 0 });
    }
  }, [isDrawerOpen, editingItem, form]);

  const handleOpenCreate  = () => { setEditingItem(null); setIsDrawerOpen(true); };
  const handleOpenEdit    = (item) => { setEditingItem(item); setIsDrawerOpen(true); };
  const handleCloseDrawer = () => { setIsDrawerOpen(false); setEditingItem(null); form.resetFields(); };

  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        nombre:           values.nombre,
        empresa:          values.empresa || '',
        tipo_documento:   values.tipo_documento || '',
        numero_documento: values.numero_documento || '',
        email:            values.email || '',
        telefono:         values.telefono || '',
        origen:           values.origen || 'OTRO',
        estado:           values.estado || 'NUEVO',
        valor_estimado:   values.valor_estimado || 0,
        notas:            values.notas || '',
      };
      // ¿Pasó a "Ganado" en este guardado?
      const becameGanado = values.estado === 'GANADO' && (!editingItem || editingItem.estado !== 'GANADO');
      let leadGuardado = editingItem ? { ...editingItem, ...payload } : null;

      if (editingItem) {
        await updateLead(editingItem.id, payload);
        notification.success({ message: 'Lead actualizado' });
      } else {
        const created = await createLead(payload);
        leadGuardado = { ...payload, ...(created?.data || {}) };
        notification.success({ message: 'Lead creado' });
      }
      handleCloseDrawer();
      fetchLeads();

      // Disparar conversión a cliente + venta si corresponde
      if (becameGanado && leadGuardado?.id) convertirYVender(leadGuardado);
    } catch (err) {
      notification.error({ message: 'Operación fallida', description: err.response?.data?.message || 'Error al guardar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Modal.confirm({
      title: `¿Eliminar el lead "${item.nombre}"?`,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteLead(item.id);
          notification.success({ message: 'Lead eliminado' });
          fetchLeads();
        } catch (error) {
          notification.error({ message: 'Error al eliminar', description: error.response?.data?.message || 'Hubo un problema.' });
        }
      },
    });
  };

  // Cambio rápido de estado desde la tabla
  const handleQuickEstado = async (item, estado) => {
    // Al pasar a "Ganado" → convertir el lead en cliente y abrir la venta
    if (estado === 'GANADO') return convertirYVender(item);
    try {
      await updateLead(item.id, { estado });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, estado } : i));
      fetchLeads();
    } catch {
      notification.error({ message: 'No se pudo cambiar el estado' });
    }
  };

  // ── Lead GANADO → Cliente + registrar venta ──────────────────
  // Crea (o reutiliza) la persona/cliente a partir del lead, enlaza
  // el lead y abre el IngresoDrawer con ese cliente preseleccionado.
  const convertirYVender = async (lead) => {
    if (converting) return;
    setConverting(true);
    try {
      let persona = null;

      // 1. Si el lead ya estaba enlazado a un cliente, reutilizarlo
      if (lead.persona_id) {
        try { persona = await getPersonaById(lead.persona_id); } catch { persona = null; }
      }

      // 2. Si no, crear el cliente con los datos del lead
      if (!persona?.id) {
        const partes = (lead.nombre || '').trim().split(/\s+/);
        const nombre = partes.shift() || lead.nombre || 'Cliente';
        const apellido = partes.join(' ');
        try {
          const res = await createPersona({
            nombre,
            apellido,
            tipo_documento:   lead.tipo_documento || 'CC',
            numero_documento: lead.numero_documento || undefined,
            celular:          lead.telefono || '',
            email:            lead.email || undefined,
            direccion:        '',
            tipo:             'CLIENTE',
          });
          persona = res?.data || res;
        } catch (err) {
          // Si ya existe un cliente con ese documento, reutilizarlo
          if (err.response?.status === 409 && lead.numero_documento) {
            const enc = await getPersonas({ q: lead.numero_documento });
            const arr = Array.isArray(enc) ? enc : (enc?.personas || []);
            persona = arr.find(p => String(p.numero_documento) === String(lead.numero_documento)) || arr[0] || null;
          }
          if (!persona?.id) throw err;
        }
      }

      if (!persona?.id) throw new Error('No se pudo crear u obtener el cliente.');

      // 3. Marcar el lead como ganado y enlazarlo al cliente
      await updateLead(lead.id, { estado: 'GANADO', persona_id: persona.id });
      setItems(prev => prev.map(i => i.id === lead.id ? { ...i, estado: 'GANADO', persona_id: persona.id } : i));

      // 4. Abrir la venta con el cliente preseleccionado
      setIngresoPersona(persona);
      setIngresoOpen(true);
      notification.success({
        message: 'Lead convertido en cliente',
        description: 'Registra la venta para completar el proceso.',
      });
    } catch (err) {
      notification.error({
        message: 'No se pudo convertir el lead',
        description: err.response?.data?.message || err.message || 'Inténtalo de nuevo.',
      });
    } finally {
      setConverting(false);
    }
  };

  // ── Columnas ──
  const columns = [
    {
      title: 'Lead', key: 'nombre',
      render: (_, r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.nombre}</span>
          {r.empresa && <div className="text-xs text-gray-400"><BankOutlined /> {r.empresa}</div>}
          {r.numero_documento && <div className="text-xs text-gray-400"><IdcardOutlined /> {r.tipo_documento ? `${r.tipo_documento} ` : ''}{r.numero_documento}</div>}
          <div className="flex flex-col gap-0.5 mt-0.5">
            {r.telefono && <span className="text-xs text-gray-400"><PhoneOutlined /> {r.telefono}</span>}
            {r.email && <span className="text-xs text-gray-400"><MailOutlined /> {r.email}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Origen', dataIndex: 'origen', key: 'origen', width: 120,
      render: v => <Tag className="text-[10px]">{ORIGEN_MAP[v]?.label || v}</Tag>,
    },
    {
      title: 'Valor estimado', dataIndex: 'valor_estimado', key: 'valor', width: 140, align: 'right',
      render: v => Number(v) > 0
        ? <span style={{ fontWeight: 700, color: '#155153' }}>{fmt(v)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      title: 'Estado', key: 'estado', width: 160,
      render: (_, r) => (
        <Select
          value={r.estado}
          size="small"
          variant="borderless"
          style={{ width: 140 }}
          disabled={converting}
          onClick={e => e.stopPropagation()}
          onChange={(val) => handleQuickEstado(r, val)}
          options={ESTADOS.map(e => ({ value: e.value, label: <EstadoTag estado={e.value} /> }))}
        />
      ),
      filters: ESTADOS.map(e => ({ text: e.label, value: e.value })),
      onFilter: (v, r) => r.estado === v,
    },
    {
      title: 'Acciones', key: 'acciones', width: 100, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />}
              onClick={e => { e.stopPropagation(); handleOpenEdit(r); }}
              style={{ color: '#155153', borderColor: '#15515333' }} />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button size="small" danger icon={<DeleteOutlined />}
              onClick={e => { e.stopPropagation(); handleDelete(r); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Mobile cards ──
  const MobileCardList = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>;
    if (!rows.length) return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin leads aún." style={{ margin: '32px 0' }}>
        <Button type="primary" onClick={handleOpenCreate} style={{ background: '#155153' }}>
          Crear el primero
        </Button>
      </Empty>
    );
    return (
      <div>
        {rows.map(r => (
          <div key={r.id} onClick={() => handleOpenEdit(r)} style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: 14, marginBottom: 10, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 15, display: 'block' }}>{r.nombre}</span>
                {r.empresa && <span style={{ fontSize: 11, color: '#9ca3af' }}><BankOutlined /> {r.empresa}</span>}
              </div>
              <EstadoTag estado={r.estado} />
            </div>
            {r.numero_documento && <div style={{ fontSize: 12, color: '#6b7280' }}><IdcardOutlined /> {r.tipo_documento ? `${r.tipo_documento} ` : ''}{r.numero_documento}</div>}
            {r.telefono && <div style={{ fontSize: 12, color: '#6b7280' }}><PhoneOutlined /> {r.telefono}</div>}
            {r.email && <div style={{ fontSize: 12, color: '#6b7280' }}><MailOutlined /> {r.email}</div>}
            <div style={{ height: 1, background: '#e5e7eb', margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tag className="text-[10px]">{ORIGEN_MAP[r.origen]?.label || r.origen}</Tag>
              {Number(r.valor_estimado) > 0 && (
                <span style={{ fontWeight: 700, color: '#155153', fontSize: 14 }}>{fmt(r.valor_estimado)}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Button size="small" block icon={<EditOutlined />}
                onClick={e => { e.stopPropagation(); handleOpenEdit(r); }}
                style={{ color: '#155153', borderColor: '#15515333' }}>Editar</Button>
              <Button size="small" danger icon={<DeleteOutlined />}
                onClick={e => { e.stopPropagation(); handleDelete(r); }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── RENDER ──
  return (
    <div className="p-3 md:p-6">

      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#155153]/10 flex items-center justify-center">
            <UsergroupAddOutlined className="text-[#155153] text-xl" />
          </div>
          <div>
            <p className="m-0 font-bold text-lg" style={{ color: '#155153' }}>CRM</p>
            <p className="m-0 text-xs text-gray-400">Gestión de leads y clientes potenciales</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={fetchLeads} loading={loading} shape="circle" />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}
            style={{ backgroundColor: '#155153', borderColor: '#155153' }}>
            Nuevo lead
          </Button>
        </div>
      </div>

      {/* STATS DEL EMBUDO */}
      {stats && (
        <Card styles={{ body: { padding: 12 } }} className="mb-4" style={{ border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="rounded-full px-3 py-0.5 text-xs font-medium">{stats.total} leads en total</Tag>
            <Tag color="green" className="rounded-full px-3 py-0.5 text-xs font-medium">
              Pipeline: {fmt(stats.valorPipeline || 0)}
            </Tag>
            <div className="flex-1" />
            {ESTADOS.map(e => (
              <button key={e.value} type="button"
                onClick={() => setFilterEstado(filterEstado === e.value ? 'todos' : e.value)}
                style={{
                  border: `1px solid ${filterEstado === e.value ? e.color : '#e5e7eb'}`,
                  background: filterEstado === e.value ? e.bg : '#fff',
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64,
                }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: e.color }}>
                  {stats.porEstado?.[e.value]?.total ?? 0}
                </span>
                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{e.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* FILTROS */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} gap-2 mb-4`}>
        <Input
          placeholder="Buscar nombre, empresa, email, teléfono..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          allowClear className={isMobile ? 'w-full' : 'w-full md:w-80'}
        />
        <Select
          value={filterEstado}
          onChange={setFilterEstado}
          className={isMobile ? 'w-full' : 'w-44'}
          options={[{ value: 'todos', label: 'Todos los estados' }, ...ESTADOS.map(e => ({ value: e.value, label: e.label }))]}
        />
      </div>

      {/* TABLA / CARDS */}
      {error ? <Alert message={error} type="error" showIcon /> : (
        isMobile ? <MobileCardList /> : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Spin spinning={loading}>
              <Table
                dataSource={rows}
                columns={columns}
                rowKey="id"
                size="middle"
                onRow={r => ({ onClick: () => handleOpenEdit(r), style: { cursor: 'pointer' } })}
                locale={{ emptyText: (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin leads aún.">
                    <Button type="primary" onClick={handleOpenCreate} style={{ background: '#155153' }}>
                      Crear el primero
                    </Button>
                  </Empty>
                )}}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} de ${t}` }}
                scroll={{ x: 760 }}
              />
            </Spin>
          </div>
        )
      )}

      {/* ═══════════════════════════════════════
          DRAWER — CREAR / EDITAR
      ═══════════════════════════════════════ */}
      <Drawer
        title={
          <div className="flex items-center gap-2" style={{ color: '#155153' }}>
            <UsergroupAddOutlined />
            <span>{editingItem ? 'Editar lead' : 'Nuevo lead'}</span>
          </div>
        }
        width={isMobile ? '100vw' : 480} onClose={handleCloseDrawer} open={isDrawerOpen} destroyOnClose
        closable={false}
        extra={<Button type="text" icon={<CloseOutlined />} onClick={handleCloseDrawer} />}
        rootStyle={isMobile ? { position: 'fixed', inset: 0 } : undefined}
        styles={{ wrapper: isMobile ? { height: '100%', width: '100%' } : {}, body: { overflowX: 'hidden' } }}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseDrawer}>Cancelar</Button>
            <Button onClick={() => form.submit()} type="primary" loading={isSubmitting}
              icon={<CheckCircleOutlined />}
              style={{ backgroundColor: '#155153', borderColor: '#155153' }}>
              {editingItem ? 'Guardar cambios' : 'Crear lead'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} requiredMark={false}>
          <Form.Item name="nombre"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Nombre del contacto *</span>}
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
            <Input size="large" placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Form.Item name="empresa"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Empresa</span>}>
            <Input size="large" prefix={<BankOutlined className="text-gray-400" />} placeholder="Ej: Comercial XYZ" />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Documento</span>}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="tipo_documento" noStyle>
                <Select size="large" style={{ width: 110 }} allowClear placeholder="Tipo"
                  options={TIPOS_DOC.map(t => ({ value: t, label: t }))} />
              </Form.Item>
              <Form.Item name="numero_documento" noStyle>
                <Input size="large" prefix={<IdcardOutlined className="text-gray-400" />} placeholder="Número de documento" />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="telefono"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Teléfono / WhatsApp</span>}>
            <Input size="large" prefix={<PhoneOutlined className="text-gray-400" />} placeholder="Ej: 300 123 4567" />
          </Form.Item>

          <Form.Item name="email"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Correo</span>}
            rules={[{ type: 'email', message: 'Correo inválido' }]}>
            <Input size="large" prefix={<MailOutlined className="text-gray-400" />} placeholder="cliente@correo.com" />
          </Form.Item>

          <Form.Item name="origen"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>¿De dónde viene?</span>}>
            <Select size="large" options={ORIGENES} placeholder="Origen del lead" />
          </Form.Item>

          <Form.Item name="estado"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Etapa del embudo</span>}>
            <Select size="large" options={ESTADOS.map(e => ({ value: e.value, label: e.label }))} />
          </Form.Item>

          <Form.Item name="valor_estimado"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Valor estimado del negocio</span>}>
            <InputNumber size="large" className="w-full" placeholder="0" min={0}
              addonAfter={currSuffix} formatter={currFormatter} parser={currParser} />
          </Form.Item>

          <Form.Item name="notas"
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Notas</span>}>
            <Input.TextArea rows={4} placeholder="Necesidades del cliente, próximos pasos, observaciones..." />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ═══════════════════════════════════════
          DRAWER — REGISTRAR VENTA (lead ganado → cliente)
      ═══════════════════════════════════════ */}
      <IngresoDrawer
        open={ingresoOpen}
        onClose={() => { setIngresoOpen(false); setIngresoPersona(null); }}
        onSuccess={() => { setIngresoOpen(false); setIngresoPersona(null); navigate('/inicio/certificados'); }}
        userName={user?.name}
        initialPersona={ingresoPersona}
      />
    </div>
  );
}

export default CrmDashboard;
