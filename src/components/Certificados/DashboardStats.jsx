import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined } from '@ant-design/icons';
import moment from 'moment';

const DashboardStats = ({ ingresos, egresos, dateRange, filters = {} }) => {
  const { payment, product } = filters; // <- nuevos filtros

  const stats = useMemo(() => {
    const start = dateRange[0];
    const end = dateRange[1];

    // helper para producto/servicio (solo ingresos)
    const getConcept = (item = {}) =>
      (item.producto || item.concepto || item.descripcion || '').trim();

    const filteredIngresos = ingresos.filter((i) => {
      const inDate = moment(i.createdAt).isBetween(start, end, 'day', '[]');
      if (!inDate) return false;

      if (payment && i.cuenta !== payment) return false;

      if (product) {
        const concept = getConcept(i);
        if (concept !== product) return false;
      }

      return true;
    });

    // para egresos aplicamos solo fecha / cuenta / día (no producto)
    const filteredEgresos = egresos.filter((e) => {
      const inDate = moment(e.fecha).isBetween(start, end, 'day', '[]');
      if (!inDate) return false;

      if (payment && e.cuenta !== payment) return false;

      return true;
    });

    const totalIngresos = filteredIngresos.reduce(
      (acc, curr) => acc + Number(curr.valor || 0),
      0
    );
    const totalEgresos = filteredEgresos.reduce(
      (acc, curr) => acc + Number(curr.valor || 0),
      0
    );
    const balance = totalIngresos - totalEgresos;

    const margen =
      totalIngresos > 0
        ? ((balance / totalIngresos) * 100).toFixed(1)
        : 0;

    return {
      totalIngresos,
      totalEgresos,
      balance,
      margen,
      countVentas: filteredIngresos.length,
    };
  }, [ingresos, egresos, dateRange, payment, product]);

  const currencyFormatter = (val) =>
    `$ ${new Intl.NumberFormat('es-CO').format(val)}`;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card bordered={false} className="shadow-sm rounded-lg bg-green-50">
          <Statistic
            title={<span className="text-green-700 font-semibold">Total Ingresos</span>}
            value={stats.totalIngresos}
            precision={0}
            valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
            prefix={<ArrowUpOutlined />}
            formatter={currencyFormatter}
          />
          <div className="mt-2 text-xs text-gray-500">
            {stats.countVentas} transacciones registradas
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card bordered={false} className="shadow-sm rounded-lg bg-red-50">
          <Statistic
            title={<span className="text-red-700 font-semibold">Total Egresos</span>}
            value={stats.totalEgresos}
            precision={0}
            valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
            prefix={<ArrowDownOutlined />}
            formatter={currencyFormatter}
          />
          <div className="mt-2 text-xs text-gray-500">Gastos del periodo</div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card bordered={false} className="shadow-sm rounded-lg bg-blue-50">
          <div className="flex justify-between">
            <Statistic
              title={<span className="text-blue-700 font-semibold">Balance Neto</span>}
              value={stats.balance}
              precision={0}
              valueStyle={{
                color: stats.balance >= 0 ? '#096dd9' : '#cf1322',
                fontWeight: 'bold',
              }}
              prefix={<WalletOutlined />}
              formatter={currencyFormatter}
            />
            <div className="text-right">
              <span className="block text-gray-500 text-xs">Margen</span>
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
