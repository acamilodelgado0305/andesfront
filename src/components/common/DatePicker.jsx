// src/components/common/DatePicker.jsx
// Reemplazo del DatePicker de antd para toda la app. En computador ES el de
// antd (mismas props). En el celular el calendario flotante de antd queda
// diminuto y se sale de la pantalla, así que se abre una hoja desde abajo con
// atajos (Hoy, Ayer…) y un calendario de botones grandes para el pulgar.
//
// Se importa igual que el de antd: `import DatePicker from '.../common/DatePicker'`
// y `DatePicker.RangePicker`. Selectores de mes/año o con hora siguen con antd.
import React, { useEffect, useMemo, useState } from 'react';
import { DatePicker as AntDatePicker } from 'antd';
import { CalendarOutlined, CloseCircleFilled, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import BottomSheet from './BottomSheet';
import useIsMobile from '../../hooks/useIsMobile';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const formatoDe = (format) => {
  const f = Array.isArray(format) ? format[0] : format;
  return typeof f === 'string' ? f : 'DD/MM/YYYY';
};
const formatear = (d, format) => {
  if (!d) return '';
  const f = Array.isArray(format) ? format[0] : format;
  return typeof f === 'function' ? f(d) : d.format(formatoDe(format));
};
const aDayjs = (v) => (v && dayjs(v).isValid() ? dayjs(v) : null);

// Solo los selectores de día comunes pasan a la hoja; el resto se queda en antd.
const usaHoja = (props) => !props.showTime && (!props.picker || props.picker === 'date');

/* ───────────────────────── Calendario ───────────────────────── */

export const Calendario = ({ mes, onMes, seleccion, onDia, disabledDate }) => {
  const [eligiendoMes, setEligiendoMes] = useState(false);
  const hoy = dayjs();

  const celdas = useMemo(() => {
    const inicio = mes.startOf('month');
    const desfase = (inicio.day() + 6) % 7; // semana empieza el lunes
    const total = Math.ceil((desfase + inicio.daysInMonth()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => inicio.add(i - desfase, 'day'));
  }, [mes]);

  const [desde, hasta] = seleccion;
  const btnNav = {
    width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
    background: 'var(--qc-relleno)', color: 'var(--qc-text)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 10px' }}>
        <button type="button" aria-label="Mes anterior" style={btnNav} onClick={() => onMes(mes.subtract(1, eligiendoMes ? 'year' : 'month'))}>
          <LeftOutlined />
        </button>
        <button
          type="button"
          onClick={() => setEligiendoMes((v) => !v)}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', color: 'var(--qc-text)',
            fontSize: 17, fontWeight: 700, padding: '6px 10px', borderRadius: 12,
          }}
        >
          {eligiendoMes ? mes.year() : `${MESES[mes.month()].replace(/^./, (c) => c.toUpperCase())} ${mes.year()}`}
          <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--qc-text-muted)' }}>{eligiendoMes ? '▲' : '▼'}</span>
        </button>
        <button type="button" aria-label="Mes siguiente" style={btnNav} onClick={() => onMes(mes.add(1, eligiendoMes ? 'year' : 'month'))}>
          <RightOutlined />
        </button>
      </div>

      {eligiendoMes ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {MESES.map((m, i) => {
            const activo = i === mes.month();
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onMes(mes.month(i)); setEligiendoMes(false); }}
                style={{
                  height: 50, borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15,
                  fontWeight: activo ? 700 : 500, textTransform: 'capitalize',
                  background: activo ? 'var(--qc-text)' : 'var(--qc-relleno)',
                  color: activo ? 'var(--qc-bg)' : 'var(--qc-text)',
                }}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DIAS.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--qc-text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 4 }}>
            {celdas.map((d) => {
              const fuera = d.month() !== mes.month();
              const bloqueado = disabledDate ? !!disabledDate(d) : false;
              const esDesde = desde && d.isSame(desde, 'day');
              const esHasta = hasta && d.isSame(hasta, 'day');
              const elegido = esDesde || esHasta;
              const enMedio = desde && hasta && d.isAfter(desde, 'day') && d.isBefore(hasta, 'day');
              const esHoy = d.isSame(hoy, 'day');
              // Franja suave que une el rango (de la mitad del primer día a la del último)
              const franja = desde && hasta && !desde.isSame(hasta, 'day') && (enMedio || esDesde || esHasta);
              return (
                <div
                  key={d.format('YYYY-MM-DD')}
                  style={{
                    display: 'flex', justifyContent: 'center',
                    background: franja
                      ? (esDesde ? 'linear-gradient(90deg, transparent 50%, var(--qc-relleno-fuerte) 50%)'
                        : esHasta ? 'linear-gradient(90deg, var(--qc-relleno-fuerte) 50%, transparent 50%)'
                          : 'var(--qc-relleno-fuerte)')
                      : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => onDia(d)}
                    aria-label={d.format('DD/MM/YYYY')}
                    aria-pressed={!!elegido}
                    style={{
                      width: '100%', maxWidth: 44, aspectRatio: '1', borderRadius: '50%', padding: 0, cursor: bloqueado ? 'not-allowed' : 'pointer',
                      fontSize: 16, fontWeight: elegido || esHoy ? 700 : 500,
                      border: esHoy && !elegido ? '1.5px solid var(--qc-text)' : '1.5px solid transparent',
                      background: elegido ? 'var(--qc-text)' : 'transparent',
                      color: elegido ? 'var(--qc-bg)' : 'var(--qc-text)',
                      opacity: bloqueado ? 0.25 : fuera ? 0.35 : 1,
                      textDecoration: bloqueado ? 'line-through' : 'none',
                    }}
                  >
                    {d.date()}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const Atajo = ({ activo, onClick, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      flexShrink: 0, minHeight: 38, padding: '0 15px', borderRadius: 19, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, whiteSpace: 'nowrap',
      fontWeight: activo ? 700 : 500, opacity: disabled ? 0.4 : 1,
      background: activo ? 'var(--qc-text)' : 'var(--qc-relleno)',
      color: activo ? 'var(--qc-bg)' : 'var(--qc-text)',
    }}
  >
    {children}
  </button>
);

const filaAtajos = { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 6, scrollbarWidth: 'none' };

/* ───────────────────────── Campo que abre la hoja ───────────────────────── */

const Campo = ({ texto, placeholder, onAbrir, onLimpiar, disabled, size, style, className, variant, status, id, autoFocus, suffixIcon }) => {
  const alto = size === 'small' ? 30 : size === 'large' ? 44 : 40;
  const sinBorde = variant === 'borderless' || variant === 'filled';
  return (
    <div
      id={id}
      role="button"
      tabIndex={disabled ? -1 : 0}
      autoFocus={autoFocus}
      aria-disabled={disabled}
      className={className}
      onClick={() => !disabled && onAbrir()}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAbrir(); } }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0,
        height: alto, padding: '0 12px', borderRadius: 10, boxSizing: 'border-box',
        border: sinBorde ? '1px solid transparent' : `1px solid ${status === 'error' ? '#ff4d4f' : 'var(--qc-border)'}`,
        background: variant === 'filled' ? 'var(--qc-relleno)' : 'var(--qc-surface, #fff)',
        color: texto ? 'var(--qc-text)' : 'var(--qc-text-muted)',
        fontSize: size === 'small' ? 14 : 16, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, userSelect: 'none',
        ...style,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {texto || placeholder}
      </span>
      {texto && onLimpiar && !disabled ? (
        <CloseCircleFilled
          aria-label="Quitar fecha"
          onClick={(e) => { e.stopPropagation(); onLimpiar(); }}
          style={{ color: 'var(--qc-text-muted)', fontSize: 14, padding: 4 }}
        />
      ) : (suffixIcon !== undefined ? suffixIcon : <CalendarOutlined style={{ color: 'var(--qc-text-muted)' }} />)}
    </div>
  );
};

// Abierto controlado (`open` + `onOpenChange`) o por dentro, como en antd.
const useAbierto = ({ open, onOpenChange }) => {
  const [propio, setPropio] = useState(false);
  const abierto = open !== undefined ? open : propio;
  const cambiar = (v) => { if (open === undefined) setPropio(v); onOpenChange?.(v); };
  return [abierto, cambiar];
};

/* ───────────────────────── Fecha única ───────────────────────── */

const HojaFecha = (props) => {
  const { value, defaultValue, onChange, format, placeholder = 'Elegir fecha', allowClear = true, disabledDate, disabled, title } = props;
  const [interno, setInterno] = useState(aDayjs(defaultValue));
  const valor = value !== undefined ? aDayjs(value) : interno;
  const [abierto, setAbierto] = useAbierto(props);
  const [mes, setMes] = useState(() => (valor || dayjs()).startOf('month'));

  useEffect(() => { if (abierto) setMes((valor || dayjs()).startOf('month')); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = (d) => {
    if (value === undefined) setInterno(d);
    onChange?.(d, d ? formatear(d, format) : '');
    setAbierto(false);
  };

  const hoy = dayjs().startOf('day');
  const atajos = [
    { label: 'Hoy', d: hoy },
    { label: 'Ayer', d: hoy.subtract(1, 'day') },
    { label: 'Mañana', d: hoy.add(1, 'day') },
    { label: 'En 1 semana', d: hoy.add(7, 'day') },
    { label: 'En 1 mes', d: hoy.add(1, 'month') },
  ].filter((a) => !disabledDate?.(a.d));

  return (
    <>
      <Campo
        {...props}
        texto={valor ? formatear(valor, format) : ''}
        placeholder={placeholder}
        onAbrir={() => setAbierto(true)}
        onLimpiar={allowClear ? () => elegir(null) : null}
        disabled={disabled}
      />
      <BottomSheet
        open={abierto}
        onClose={() => setAbierto(false)}
        title={title || (typeof placeholder === 'string' && placeholder !== 'Elegir fecha' ? placeholder : 'Elegir fecha')}
        subtitle={valor ? `${DIAS_LARGOS[(valor.day() + 6) % 7]} ${valor.date()} de ${MESES[valor.month()]} de ${valor.year()}` : undefined}
        zIndex={1300}
      >
        <div style={filaAtajos}>
          {atajos.map((a) => (
            <Atajo key={a.label} activo={valor && valor.isSame(a.d, 'day')} onClick={() => elegir(a.d)}>{a.label}</Atajo>
          ))}
        </div>
        <Calendario mes={mes} onMes={setMes} seleccion={[valor, null]} onDia={elegir} disabledDate={disabledDate} />
        {allowClear && valor && (
          <button
            type="button"
            onClick={() => elegir(null)}
            style={{ width: '100%', marginTop: 12, height: 44, borderRadius: 14, border: 'none', background: 'none', color: 'var(--qc-text-muted)', fontSize: 15, cursor: 'pointer' }}
          >
            Quitar fecha
          </button>
        )}
      </BottomSheet>
    </>
  );
};

const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/* ───────────────────────── Rango de fechas ───────────────────────── */

const HojaRango = (props) => {
  const { value, defaultValue, onChange, format, placeholder, allowClear = true, disabledDate, disabled } = props;
  const [interno, setInterno] = useState(() => (defaultValue ? [aDayjs(defaultValue[0]), aDayjs(defaultValue[1])] : [null, null]));
  const valor = value !== undefined ? [aDayjs(value?.[0]), aDayjs(value?.[1])] : interno;
  const [abierto, setAbierto] = useAbierto(props);
  const [borrador, setBorrador] = useState([null, null]);
  const [mes, setMes] = useState(dayjs().startOf('month'));

  useEffect(() => {
    if (!abierto) return;
    setBorrador(valor);
    setMes((valor[1] || valor[0] || dayjs()).startOf('month'));
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicar = (r) => {
    const [a, b] = r;
    const final = a && b ? [a, b] : null;
    if (value === undefined) setInterno(final || [null, null]);
    onChange?.(final, final ? [formatear(a, format), formatear(b, format)] : ['', '']);
    setAbierto(false);
  };

  // Primer toque = desde; segundo = hasta (si toca antes del desde, empieza de nuevo).
  const tocarDia = (d) => {
    const [a, b] = borrador;
    if (!a || b || d.isBefore(a, 'day')) setBorrador([d, null]);
    else setBorrador([a, d]);
  };

  const hoy = dayjs().startOf('day');
  const atajos = [
    { label: 'Hoy', r: [hoy, hoy] },
    { label: 'Últimos 7 días', r: [hoy.subtract(6, 'day'), hoy] },
    { label: 'Este mes', r: [hoy.startOf('month'), hoy.endOf('month').startOf('day')] },
    { label: 'Mes pasado', r: [hoy.subtract(1, 'month').startOf('month'), hoy.subtract(1, 'month').endOf('month').startOf('day')] },
    { label: 'Este año', r: [hoy.startOf('year'), hoy.endOf('year').startOf('day')] },
  ];

  const [a, b] = borrador;
  const ph = Array.isArray(placeholder) ? placeholder : ['Desde', 'Hasta'];
  const texto = valor[0] && valor[1] ? `${formatear(valor[0], format)} – ${formatear(valor[1], format)}` : '';

  return (
    <>
      <Campo
        {...props}
        texto={texto}
        placeholder={`${ph[0]} – ${ph[1]}`}
        onAbrir={() => setAbierto(true)}
        onLimpiar={allowClear ? () => aplicar([null, null]) : null}
        disabled={disabled}
      />
      <BottomSheet
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Elegir fechas"
        subtitle={a ? (b ? `${formatear(a, 'DD/MM/YYYY')} – ${formatear(b, 'DD/MM/YYYY')}` : `Desde ${formatear(a, 'DD/MM/YYYY')} · toca el día final`) : 'Toca el día inicial y luego el final'}
        zIndex={1300}
        footer={(
          <button
            type="button"
            disabled={!a}
            onClick={() => aplicar([a, b || a])}
            style={{
              width: '100%', height: 50, borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 700,
              cursor: a ? 'pointer' : 'not-allowed', opacity: a ? 1 : 0.4,
              background: 'var(--qc-text)', color: 'var(--qc-bg)',
            }}
          >
            {b && !a.isSame(b, 'day') ? `Ver ${b.diff(a, 'day') + 1} días` : 'Listo'}
          </button>
        )}
      >
        <div style={filaAtajos}>
          {atajos.map((at) => (
            <Atajo
              key={at.label}
              activo={a && b && a.isSame(at.r[0], 'day') && b.isSame(at.r[1], 'day')}
              onClick={() => aplicar(at.r)}
            >
              {at.label}
            </Atajo>
          ))}
        </div>
        <Calendario mes={mes} onMes={setMes} seleccion={borrador} onDia={tocarDia} disabledDate={disabledDate} />
      </BottomSheet>
    </>
  );
};

/* ───────────────────────── Exportación ───────────────────────── */

const DatePicker = React.forwardRef((props, ref) => {
  const esMovil = useIsMobile();
  if (!esMovil || !usaHoja(props)) return <AntDatePicker ref={ref} {...props} />;
  return <HojaFecha {...props} />;
});
DatePicker.displayName = 'DatePicker';

const RangePicker = React.forwardRef((props, ref) => {
  const esMovil = useIsMobile();
  if (!esMovil || !usaHoja(props)) return <AntDatePicker.RangePicker ref={ref} {...props} />;
  return <HojaRango {...props} />;
});
RangePicker.displayName = 'RangePicker';

DatePicker.RangePicker = RangePicker;
DatePicker.MonthPicker = AntDatePicker.MonthPicker;
DatePicker.WeekPicker = AntDatePicker.WeekPicker;
DatePicker.YearPicker = AntDatePicker.YearPicker;

export default DatePicker;
