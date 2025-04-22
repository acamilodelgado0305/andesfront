import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Typography, Layout } from 'antd';
import { FileTextOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Content } = Layout;

function Calificaciones() {
  const navigate = useNavigate();

  const handleOptionSelect = (opcion) => {
    if (opcion === 'bachillerato') {
      navigate('/inicio/calificaciones/bachillerato');
    } else if (opcion === 'cursos_tecnicos') {
      navigate('/inicio/calificaciones/cursos-tecnicos');
    }
  };

  const dataSource = [
    {
      key: '1',
      programa: 'Validación de Bachillerato',
      descripcion: 'Registro de calificaciones para el programa de validación de bachillerato.',
      accion: 'bachillerato',
    },
    {
      key: '2',
      programa: 'Cursos Técnicos',
      descripcion: 'Registro de calificaciones para los cursos técnicos ofrecidos.',
      accion: 'cursos_tecnicos',
    },
  ];

  const columns = [
    {
      title: 'Programa',
      dataIndex: 'programa',
      key: 'programa',
      render: (text, record) => (
        <span className="flex items-center">
          {record.accion === 'bachillerato' ? <FileTextOutlined className="mr-2" /> : <BookOutlined className="mr-2" />}
          <Text strong>{text}</Text>
        </span>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: 'Acción',
      key: 'accion',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => handleOptionSelect(record.accion)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Registrar Calificaciones
        </Button>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        <div className="max-w-4xl mx-auto">
          <Title level={2} className="text-center mb-4 text-gray-800">
            Registrar Calificaciones
          </Title>
          <Text className="block text-center mb-6 text-gray-600">
            Seleccione el programa para registrar las calificaciones correspondientes.
          </Text>
          <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            bordered
            className="shadow-md rounded-lg"
            rowClassName="hover:bg-gray-100"
            style={{ background: '#fff' }}
          />
        </div>
      </Content>
    </Layout>
  );
}

export default Calificaciones;