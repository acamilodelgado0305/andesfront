import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

function Calificaciones() {
  const navigate = useNavigate();

  const handleOptionSelect = (opcion) => {
    if (opcion === 'bachillerato') {
      navigate('/inicio/calificaciones/bachillerato');
    } else if (opcion === 'cursos_tecnicos') {
      navigate('/inicio/calificaciones/cursos-tecnicos');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen ">
      <Card
        className="w-full max-w-md shadow-lg"
        title={<Title level={2}>Registrar Calificaciones</Title>}
      >
        <Paragraph className="text-center mb-6">
          Seleccione una opción:
        </Paragraph>
        <div className="flex flex-col gap-4">
          <Button
            type="primary"
            size="large"
            className="w-full"
            onClick={() => handleOptionSelect('bachillerato')}
          >
            Validación de Bachillerato
          </Button>
          <Button
            type="primary"
            size="large"
            className="w-full"
            onClick={() => handleOptionSelect('cursos_tecnicos')}
          >
            Cursos Técnicos
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default Calificaciones;