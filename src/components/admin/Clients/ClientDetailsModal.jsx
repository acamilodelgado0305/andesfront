// src/components/admin/Clients/modals/ClientDetailsModal.js

import React from 'react';
import { Modal, Spin, Alert, Descriptions, Card, Table, Typography, Tag, Button } from 'antd';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { NumericFormat } from 'react-number-format';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const CurrencyDisplay = ({ value }) => (
  <NumericFormat
    value={parseFloat(value)}
    displayType={'text'}
    thousandSeparator={'.'}
    decimalSeparator={','}
    prefix={'$ '}
    decimalScale={2}
    fixedDecimalScale
  />
);

function ClientDetailsModal({ visible, onCancel, clientData, loading, onAddSubscription, onAddCharge }) {
  const extraChargesColumns = [ /* ...código se mantiene igual... */ ];

  return (
    <Modal
      title={<Title level={4}>{clientData?.name || 'Cargando...'}</Title>}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => onAddSubscription(clientData.id)}>
          Nueva Suscripción
        </Button>,
        <Button key="close" onClick={onCancel}>
          Cerrar
        </Button>
      ]}
      width={800}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>
      ) : !clientData ? (
        <Alert message="No se pudo cargar la información del cliente." type="warning" />
      ) : (
        <>
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Email">{clientData.email}</Descriptions.Item>
            <Descriptions.Item label="Cliente desde">
              {formatDate(new Date(clientData.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5}>Historial de Suscripciones</Title>
          {clientData.subscriptions && clientData.subscriptions.length > 0 ? clientData.subscriptions.map(sub => (
            <Card
              key={sub.subscription_id}
              size="small"
              title={`Suscripción #${sub.subscription_id}`}
              extra={<Tag color={sub.status === 'active' ? 'green' : (sub.status === 'expired' ? 'red' : 'default')}>{sub.status}</Tag>}
              style={{ marginBottom: 16 }}
            >
              {/* Contenido de la tarjeta */}
              <Descriptions bordered size="small" column={2}>
                 {/* ...descripciones de la suscripción se mantienen igual... */}
              </Descriptions>

              {/* Botón para añadir cargo extra */}
              <Button 
                type="dashed" 
                size="small" 
                icon={<PlusOutlined />} 
                style={{ marginTop: 16 }}
                onClick={() => onAddCharge(sub.subscription_id)}
              >
                Añadir Cargo
              </Button>

              {sub.extra_charges && sub.extra_charges.length > 0 && (
                <>
                  <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Cargos Adicionales</Title>
                  <Table columns={extraChargesColumns} dataSource={sub.extra_charges} rowKey="id" size="small" pagination={false} />
                </>
              )}
            </Card>
          )) : <Text>Este cliente no tiene suscripciones registradas.</Text>}
        </>
      )}
    </Modal>
  );
}

export default ClientDetailsModal;