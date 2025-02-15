import React, { useState, useEffect } from 'react';
import { Table, Input, Drawer, Button, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { FaTrashAlt, FaWhatsapp, FaEdit } from 'react-icons/fa';

const { Title } = Typography;

const StudentTable = ({ onDelete,
  onEdit, // Add this prop
  students = [],
  loading = false,
  getProgramName,
  getCoordinatorStyle
}) => {
  const [searchText, setSearchText] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const openDrawer = (student) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
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
          Programa
          <Input
            placeholder="Buscar"
            onChange={(e) => handleSearch(e.target.value, 'programa_id')}
            style={{ marginTop: 2, padding: 4, height: 28, fontSize: 12 }}
          />
        </div>
      ),
      dataIndex: "programa_id",
      key: "programa_id",
      render: (programId) => getProgramName(programId),
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
      key: "nombre_completo",
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
              onEdit?.(record); // Changed this line to call onEdit with the record
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
  const StudentDetailDrawer = ({ student, onDelete, closeDrawer }) => {
    return (
      <div className="p-6 w-full max-w-lg bg-white shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Detalles del Estudiante</h2>
        <div className="space-y-4">
          {[
            { label: "Documento", value: `${student.tipo_documento} ${student.numero_documento || 'No especificado'}` },
            { label: "Lugar de Expedición", value: student.lugar_expedicion || 'No especificado' },
            { label: "Nombre", value: student.nombre || '-' },
            { label: "Apellido", value: student.apellido || '-' },
            { label: "Coordinador", value: student.coordinador || '-' },
            { label: "Programa", value: getProgramName(student.programa_id) || '-' },
            { label: "Email", value: student.email || 'No especificado' },
            { label: "Llamadas", value: student.telefono_llamadas || 'No especificado' },
            { label: "WhatsApp", value: student.telefono_whatsapp || 'No especificado' },
            { label: "Fecha de Nacimiento", value: student.fecha_nacimiento ? new Date(student.fecha_nacimiento).toLocaleDateString() : 'No especificado' },
            { label: "Inscripción", value: student.fecha_inscripcion ? new Date(student.fecha_inscripcion).toLocaleDateString() : 'No especificado' },
            student.fecha_graduacion && { label: "Graduación", value: new Date(student.fecha_graduacion).toLocaleDateString() },
            { label: "Matrícula", value: student.matricula ? `$${student.matricula}` : 'No especificado' },
            { label: "EPS", value: student.eps || 'No definido' },
            { label: "RH", value: student.rh || 'No definido' },
            { label: "SIMAT", value: student.simat || 'No especificado' },
            { label: "Modalidad de Estudio", value: student.modalidad_estudio || 'No especificado' },
            { label: "Nombre Acudiente", value: student.nombre_acudiente || 'No definido' },
            { label: "Tipo Documento Acudiente", value: student.tipo_documento_acudiente || 'No definido' },
            { label: "Teléfono Acudiente", value: student.telefono_acudiente || 'No definido' },
            { label: "Dirección Acudiente", value: student.direccion_acudiente || 'No definido' },
          ]
            .filter(Boolean)
            .map((item, index) => (
              <div key={index} className="flex justify-between border-b pb-2">
                <p className="font-medium text-gray-600">{item.label}:</p>
                <p className="text-gray-800">{item.value}</p>
              </div>
            ))}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${student.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {student.activo ? "Activo" : "Inactivo"}
            </span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${student.estado_matricula ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {student.estado_matricula ? "Matrícula Paga" : "Matrícula Pendiente"}
            </span>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="primary" danger onClick={() => onDelete?.(student.id)}>
            Eliminar
          </Button>
          <Button onClick={closeDrawer}>Cerrar</Button>
        </div>
      </div>
    );
  };
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
          onClick: () => openDrawer(record),
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
      <Drawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        placement="right"
        width={420}
      >
        {selectedStudent && <StudentDetailDrawer student={selectedStudent} />}
      </Drawer>
    </>
  );
};

export default StudentTable;