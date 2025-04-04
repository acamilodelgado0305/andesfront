import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { FaTrashAlt, FaWhatsapp, FaEdit } from 'react-icons/fa';
import StudentDetailModal from './StudentDetailModal';

const { Title } = Typography;

const StudentTable = ({
  onDelete,
  onEdit,
  students = [],
  loading = false,
  getCoordinatorStyle,
  fetchStudents
}) => {
  const [searchText, setSearchText] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Reemplazamos isDrawerOpen por isModalOpen
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (Array.isArray(students)) {
      const filtered = students.filter((student) =>
        Object.keys(searchText).every((key) =>
          student && student[key]
            ? student[key].toString().toLowerCase().includes(searchText[key] || '')
            : true
        )
      );
      setFilteredData(filtered);
    } else {
      setFilteredData([]);
    }
  }, [students, searchText]);

  const handleSearch = (value, dataIndex) => {
    setSearchText(prev => ({
      ...prev,
      [dataIndex]: value.toLowerCase(),
    }));
  };

  const openModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const columns = [
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          Documento
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'numero_documento')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      key: "documento",
      render: (_, record) => (
        <span>
          {record.tipo_documento} {record.numero_documento || 'No especificado'}
        </span>
      ),
    },
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          Coordinador
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'coordinador')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      dataIndex: "coordinador",
      key: "coordinador",
      render: (text) => (
        <span className={getCoordinatorStyle(text)}>{text}</span>
      ),
    },
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          Nombre Completo
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'nombre')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      key: "nombre_completo",
      render: (_, record) => (
        <span>{record.nombre}</span>
      ),
    },
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          Programa
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'programa_nombre')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      key: "programa_nombre",
      render: (_, record) => (
        <span>{record.programa_nombre}</span>
      ),
    },
    {
      title: "Estado",
      key: "estados",
      render: (_, record) => (
        <div className="space-y-1">
          <div>
            <span className={`px-2 py-1 rounded-full text-sm ${record.activo ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
              {record.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div>
            <span className={`px-2 py-1 rounded-full text-sm ${record.estado_matricula ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"}`}>
              {record.estado_matricula ? "Matrícula Paga" : "Matrícula Pendiente"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          Correo
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'email')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      key: "email",
      render: (_, record) => (
        <span>{record.email}</span>
      ),
    },
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          WhatsApp
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'telefono_llamadas')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      key: "telefono_whatsapp",
      render: (_, record) => (
        <span>{record.telefono_whatsapp}</span>
      ),
    },
    {
      title: (
        <div className="flex flex-col" style={{ margin: '-4px 0', gap: 1, lineHeight: 1 }}>
          Llamadas
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'telefono_llamadas')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      key: "telefono_llamadas",
      render: (_, record) => (
        <span>{record.telefono_llamadas}</span>
      ),
    },
    {
      title: "Fechas",
      key: "fechas",
      render: (_, record) => (
        <div className="space-y-1">
          <div>
            <span className="font-medium">Inscripción:</span>{' '}
            {record.fecha_inscripcion ? new Date(record.fecha_inscripcion).toLocaleDateString() : 'No especificado'}
          </div>
          {record.fecha_graduacion && (
            <div>
              <span className="font-medium">Graduación:</span>{' '}
              {new Date(record.fecha_graduacion).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Pagos",
      key: "facturas",
      render: (_, record) => (
        <Link
          to={`/inicio/students/facturas/${record.id}`}
          className="text-blue-500 hover:text-blue-700"
        >
          Ver Pagos
        </Link>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => (
        <div className="flex space-x-2">
          <Button
            icon={<FaTrashAlt />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(record.id);
            }}
            danger
          />
          <Button
            icon={<FaEdit />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(record);
            }}
            type="primary"
          />
          <Button
            icon={<FaWhatsapp />}
            type="default"
            onClick={(e) => {
              e.stopPropagation();
              let phoneNumber = record.telefono_whatsapp?.replace(/\D/g, "") ||
                record.telefono_llamadas?.replace(/\D/g, "");

              if (!phoneNumber) {
                message.error("No hay número de teléfono disponible");
                return;
              }

              if (!phoneNumber.startsWith("57")) {
                phoneNumber = `57${phoneNumber}`;
              }

              window.open(`https://wa.me/${phoneNumber}`, "_blank");
            }}
          >
            WhatsApp
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey={(record) => record.id || Math.random()}
        pagination={{ pageSize: 10 }}
        bordered
        loading={loading}
        onRow={(record) => ({
          onClick: () => openModal(record), // Cambiamos openDrawer por openModal
        })}
        rowClassName="clickable-row"
      />
      <style>
        {`
          .ant-table-cell {
            padding: 8px !important;
            font-size: 14px;
          }

          .compact-row {
            height: 24px !important;
          }

          .clickable-row {
            cursor: pointer;
          }
        `}
      </style>
      <StudentDetailModal
        student={selectedStudent}
        visible={isModalOpen}
        onClose={closeModal}
        getCoordinatorStyle={getCoordinatorStyle}
        fetchStudents={fetchStudents} // Pasa fetchStudents aquí
      />
    </>
  );
};

export default StudentTable;