import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined } from '@ant-design/icons';
import useCurrency from '../../hooks/useCurrency';
import { useTheme } from '../../ThemeContext';

const DashboardStats = ({ ingresos, egresos }) => {
  const fmt = useCurrency();
  const { isDark } = useTheme();

  // Tonos semánticos por tema. En oscuro: fondo con tinte translúcido y texto
  // claro/brillante (legible); en claro: pasteles suaves y texto oscuro.
  const tones = {
    green: {
      bg: isDark ? 'rgba(34,197,94,0.13)' : '#f0fdf4',
      title: isDark ? '#86efac' : '#15803d',
      value: isDark ? '#4ade80' : '#3f8600',
    },
    red: {
      bg: isDark ? 'rgba(239,68,68,0.13)' : '#fef2f2',
      title: isDark ? '#fca5a5' : '#b91c1c',
      value: isDark ? '#f87171' : '#cf1322',
    },
    blue: {
      bg: isDark ? 'rgba(59,130,246,0.14)' : '#eff6ff',
      title: isDark ? '#93c5fd' : '#1d4ed8',
      value: isDark ? '#60a5fa' : '#096dd9',
    },
  };
  const mutedCls = isDark ? 'mt-2 text-xs text-gray-400' : 'mt-2 text-xs text-gray-500';

  const stats = useMemo(() => {
    const totalIngresos = (ingresos || []).reduce(
      (acc, curr) => acc + Number(curr.valor || 0), 0
    );
    const totalEgresos = (egresos || []).reduce(
      (acc, curr) => acc + Number(curr.valor || 0), 0
    );
    const balance = totalIngresos - totalEgresos;
    const margen  = totalIngresos > 0
      ? ((balance / totalIngresos) * 100).toFixed(1)
      : 0;

    return { totalIngresos, totalEgresos, balance, margen, countVentas: (ingresos || []).length };
  }, [ingresos, egresos]);

  const currencyFormatter = (val) => fmt(val);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.green.bg }}>
          <Statistic
            title={<span style={{ color: tones.green.title, fontWeight: 600 }}>Total Ingresos</span>}
            value={stats.totalIngresos}
            precision={0}
            valueStyle={{ color: tones.green.value, fontWeight: 'bold' }}
            prefix={<ArrowUpOutlined />}
            formatter={currencyFormatter}
          />
          <div className={mutedCls}>
            {stats.countVentas} transacciones registradas
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.red.bg }}>
          <Statistic
            title={<span style={{ color: tones.red.title, fontWeight: 600 }}>Total Gastos</span>}
            value={stats.totalEgresos}
            precision={0}
            valueStyle={{ color: tones.red.value, fontWeight: 'bold' }}
            prefix={<ArrowDownOutlined />}
            formatter={currencyFormatter}
          />
          <div className={mutedCls}>Gastos del periodo</div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card bordered={false} className="shadow-sm rounded-lg" style={{ background: tones.blue.bg }}>
          <div className="flex justify-between">
            <Statistic
              title={<span style={{ color: tones.blue.title, fontWeight: 600 }}>Balance Neto</span>}
              value={stats.balance}
              precision={0}
              valueStyle={{
                color: stats.balance >= 0 ? tones.blue.value : tones.red.value,
                fontWeight: 'bold',
              }}
              prefix={<WalletOutlined />}
              formatter={currencyFormatter}
            />
            <div className="text-right">
              <span className="block text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Margen</span>
              <span
                className={`font-bold ${
                  stats.margen > 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {stats.margen}%
              </span>
            </div>
          </div>
          <Progress
            percent={Math.max(0, Math.min(100, Number(stats.margen)))}
            size="small"
            showInfo={false}
            strokeColor={stats.balance >= 0 ? '#1890ff' : '#ff4d4f'}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardStats;
