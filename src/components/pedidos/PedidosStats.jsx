import React from 'react';
import { Card, Row, Col, Statistic, Spin, List, Typography, Tag, Divider } from 'antd';
import {
    ShoppingOutlined,
    DollarCircleOutlined,
    TagsOutlined,
    TrophyOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// Función para formatear dinero
const formatCurrency = (value) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const PedidosStats = ({ stats, loading }) => {
    if (loading) return <div className="p-8 text-center"><Spin /></div>;
    if (!stats) return null;

    return (
        <div className="mb-6">
            {/* 1. TARJETAS DE RESUMEN (KPIs) */}
            <Row gutter={[16, 16]} className="mb-4">
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="shadow-sm rounded-xl bg-blue-50 border-blue-100">
                        <Statistic
                            title={<span className="font-bold text-blue-900">Total en Pedidos</span>}
                            value={stats.general.total_ingresos} // Backend envía esto, pero en el front lo mostramos como "En Pedidos"
                            prefix={<DollarCircleOutlined />}
                            formatter={formatCurrency}
                            valueStyle={{ color: '#0050b3', fontWeight: 'bold' }}
                        />
                        <div className="text-xs text-blue-400 mt-1">Valor acumulado (Pendientes + Entregados)</div>
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card bordered={false} className="shadow-sm rounded-xl">
                        <Statistic
                            title="Cantidad Pedidos"
                            value={stats.general.total_pedidos}
                            prefix={<ShoppingOutlined className="text-[#155153]" />}
                        />
                    </Card>
                </Col>

                <Col >
                    <Card
                        title={<><InfoCircleOutlined className="text-blue-500 mr-2" />Estado Actual</>}
                        bordered={false}
                        className="shadow-sm rounded-xl h-full"
                    >
                        <div className="flex flex-col gap-4">
                            {stats.por_estado.map((estado) => (
                                <div key={estado.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Tag color={
                                            estado.name === 'PENDIENTE' ? 'orange' :
                                                estado.name === 'ENTREGADO' ? 'green' : 'red'
                                        }>
                                            {estado.name}
                                        </Tag>
                                    </div>
                                    <span className="font-bold text-lg text-gray-700">{estado.value}</span>
                                </div>
                            ))}
                            {stats.por_estado.length === 0 && <Text type="secondary" className="text-center">Sin datos</Text>}
                        </div>
                    </Card>
                </Col>

            </Row>

            {/* 2. LISTAS DE DETALLE (SIN GRÁFICOS) */}
            <Row gutter={[16, 16]}>

                {/* TOP PRODUCTOS (LISTA SIMPLE) */}
                <Col xs={24} md={14}>
                    <Card
                        title={<><TrophyOutlined className="text-yellow-500 mr-2" />Top Productos</>}
                        bordered={false}
                        className="shadow-sm rounded-xl h-full"
                        bodyStyle={{ padding: '10px 24px' }}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={stats.top_productos}
                            renderItem={(item, index) => (
                                <List.Item>
                                    <div className="flex justify-between w-full items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                                                ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}
                                            `}>
                                                {index + 1}
                                            </div>
                                            <Text strong className="text-gray-700">{item.name}</Text>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Text strong>{item.cantidad}</Text>
                                            <Text type="secondary" className="text-xs">unid.</Text>
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                {/* RESUMEN POR ESTADO (LISTA SIMPLE) */}

            </Row>
        </div>
    );
};

export default PedidosStats;