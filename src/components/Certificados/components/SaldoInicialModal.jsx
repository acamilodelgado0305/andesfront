import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, DatePicker, Input, Alert, message, Spin, Switch, Tabs, Badge } from 'antd';
import { BankOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { useCurrencyInput } from '../../../hooks/useCurrency';
import { useTheme } from '../../../ThemeContext';
import { TARJETAS } from '../DashboardStats';
import { getFinanzasConfig, updateFinanzasConfig } from '../../../services/controlapos/posService';

/**
 * Configuración del panel financiero. Dos cosas:
 *
 * 1. Punto de partida del saldo acumulado. El negocio casi siempre tenía plata
 *    antes de empezar a registrar movimientos aquí; sin este dato el acumulado
 *    arrancaría en cero el día que se instaló el sistema. La fecha de corte
 *    evita el doble conteo: los movimientos anteriores a ella se ignoran porque
 *    ya están representados en el saldo inicial. Vacía = todo el histórico.
 *
 * 2. Qué tarjetas mostrar. Hay negocios que no quieren tener los saldos a la
 *    vista (pantalla compartida con clientes, personal que no debe verlos).
 *    La preferencia es del negocio, no del usuario.
 *
 * Van en PESTAÑAS, no una debajo de la otra: apiladas el modal medía 1012px y
 * en un portátil de 720px el botón Guardar quedaba fuera de pantalla, así que
 * la sección de tarjetas era inalcanzable.
 */
const SaldoInicialModal = ({ open, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Se maneja fuera del Form porque son switches sueltos, no campos con nombre
  const [ocultas, setOcultas] = useState([]);
  const { isDark } = useTheme();

  const {
    addonAfter: currSuffix,
    formatter: currFormatter,
    parser: currParser,
    precision: currPrecision,
    step: currStep,
  } = useCurrencyInput();

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const cfg = await getFinanzasConfig();
        if (cancelado) return;
        form.setFieldsValue({
          saldo_inicial: Number(cfg?.saldo_inicial || 0),
          fecha_corte:   cfg?.fecha_corte ? dayjs(cfg.fecha_corte) : null,
          notas:         cfg?.notas || '',
        });
        setOcultas(Array.isArray(cfg?.tarjetas_ocultas) ? cfg.tarjetas_ocultas : []);
      } catch (e) {
        console.error('Error cargando la configuración financiera', e);
        message.error('No se pudo cargar la configuración.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [open, form]);

  const toggleTarjeta = (key, visible) => {
    setOcultas((prev) => (visible ? prev.filter((k) => k !== key) : [...new Set([...prev, key])]));
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await updateFinanzasConfig({
        saldo_inicial:    Number(values.saldo_inicial || 0),
        fecha_corte:      values.fecha_corte ? values.fecha_corte.format('YYYY-MM-DD') : null,
        notas:            values.notas || null,
        tarjetas_ocultas: ocultas,
      });
      message.success('Configuración guardada.');
      onSaved?.();
      onClose?.();
    } catch (e) {
      if (e?.errorFields) {
        // El campo inválido vive en la primera pestaña: se muestra sola
        setTab('saldo');
        return;
      }
      console.error('Error guardando la configuración financiera', e);
      message.error(e?.response?.data?.message || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const [tab, setTab] = useState('saldo');
  const mutedColor = isDark ? '#a8a59e' : '#6b7280';

  const paneSaldo = (
    <>
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Desde aquí arranca el acumulado"
        description="Registra cuánta plata tenía el negocio antes de empezar a usar QControla. A partir de ese punto, el saldo de cada mes arrastra lo que sobró del mes anterior."
      />

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="saldo_inicial"
          label="Saldo inicial"
          rules={[{ required: true, message: 'Ingresa el saldo inicial (puede ser 0)' }]}
        >
          <InputNumber
            size="large"
            style={{ width: '100%' }}
            placeholder="0"
            addonAfter={currSuffix}
            formatter={currFormatter}
            parser={currParser}
            precision={currPrecision}
            step={currStep}
          />
        </Form.Item>

        <Form.Item
          name="fecha_corte"
          label="Fecha de corte"
          extra="Los movimientos anteriores a esta fecha no se suman: ya están dentro del saldo inicial. Déjala vacía para acumular todo el histórico."
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Sin corte (todo el histórico)" />
        </Form.Item>

        <Form.Item name="notas" label="Notas (opcional)" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} maxLength={300} placeholder="Ej: saldo de caja + Nequi al 31/12/2025" />
        </Form.Item>
      </Form>
    </>
  );

  const paneTarjetas = (
    <>
      <p style={{ fontSize: 12, color: mutedColor, marginTop: 0, marginBottom: 10 }}>
        Apaga las que no quieras ver en el panel de Movimientos. Aplica para todo el negocio.
      </p>

      {TARJETAS.map(({ key, label, desc }) => (
        <div
          key={key}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '9px 0',
            borderBottom: `1px solid ${isDark ? '#403e3a' : '#f1f5f9'}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 11, color: isDark ? '#a8a59e' : '#9ca3af' }}>{desc}</div>
          </div>
          <Switch
            size="small"
            checked={!ocultas.includes(key)}
            onChange={(visible) => toggleTarjeta(key, visible)}
          />
        </div>
      ))}

      {ocultas.length === TARJETAS.length && (
        <Alert
          type="warning"
          showIcon
          className="mt-3"
          message="Apagaste todas: el panel no mostrará ninguna tarjeta."
        />
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText="Guardar"
      cancelText="Cancelar"
      width={520}
      title={<span><BankOutlined style={{ color: isDark ? '#5eead4' : '#155153', marginRight: 8 }} />Panel financiero</span>}
      destroyOnClose
      // Red de seguridad en pantallas bajas: el cuerpo hace scroll y el botón
      // Guardar siempre queda visible.
      styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Spin /></div>
      ) : (
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'saldo',
              label: <span><BankOutlined /> Saldo inicial</span>,
              children: paneSaldo,
            },
            {
              key: 'tarjetas',
              label: (
                <span>
                  <EyeOutlined /> Tarjetas visibles{' '}
                  {ocultas.length > 0 && (
                    <Badge count={ocultas.length} size="small" style={{ backgroundColor: '#94a3b8' }} />
                  )}
                </span>
              ),
              children: paneTarjetas,
            },
          ]}
        />
      )}
    </Modal>
  );
};

export default SaldoInicialModal;
