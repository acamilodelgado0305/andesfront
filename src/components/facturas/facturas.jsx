import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getInvoicebyStudent, getStudentById } from "../../services/studentService";

const Facturas = () => {
  const { id } = useParams();
  const [facturas, setFacturas] = useState([]);
  const [student, setStudent] = useState(null);

  const fetchInvoicebyStudent = async (id) => {
    try {
      const data = await getInvoicebyStudent(id);
      console.log("Facturas recibidas:", data);
      setFacturas(data);
    } catch (err) {
      console.error("Error fetching facturas:", err);
    }
  };

  const fetchStudentById = async (id) => {
    try {
      const data = await getStudentById(id);
      console.log("Datos del estudiante:", data);
      setStudent(data);
    } catch (err) {
      console.error("Error fetching student:", err);
    }
  };

  useEffect(() => {
    fetchInvoicebyStudent(id);
    fetchStudentById(id);
  }, [id]);

  const meses = [
    "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre"
  ];

  const getCardColor = (facturas) => {
    if (facturas.length === 0) return "bg-gray-500";
    if (facturas.some(factura => !factura.estado)) return "bg-red-500";
    return "bg-green-500";
  };

  const renderFactura = (factura) => (
    <div key={factura.id} className="mb-4">
      <p>ID: {factura.id}</p>
      <p>Fecha: {factura.fecha}</p>
      <p>Monto: ${factura.monto}</p>
      <p>Descripción: {factura.descripcion}</p>
      <p>
        Estado: {factura.estado ? "Pagada" : "Pendiente"}
      </p>
    </div>
  );

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Facturas de {student ? student.nombre : 'Cargando...'}
        </h1>
        <p className="text-gray-600">Coordinador: {student ? student.coordinador : 'Cargando...'}</p>
      </div>

      <div className="flex justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Lista de Facturas</h2>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105">
          Crear Factura
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Tarjeta de Matrícula */}
        <div className={`${getCardColor(facturas.filter(factura => factura.tipo === "Matrícula" || factura.programa === 7))} shadow-lg rounded-lg p-6 text-white`}>
          <h2 className="text-2xl font-bold mb-4">Matrícula</h2>
          {facturas
            .filter((factura) => factura.tipo === "Matrícula" || factura.programa === 7)
            .map(renderFactura)}
          <div className="flex justify-center mt-4">
            {facturas.filter(factura => factura.tipo === "Matrícula" || factura.programa === 7).some(factura => !factura.estado) ? (
              <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300 ease-in-out">
                Pagar
              </button>
            ) : (
              <button className="bg-gray-500 text-white px-4 py-2 rounded-lg cursor-not-allowed">
                Pagado
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas de meses */}
        {meses.map((mes, index) => {
          const mesIndex = index + 1; // Ajuste para saltar Enero (0) y Diciembre (11)
          const mesFacturas = facturas.filter((factura) => {
            const facturaDate = new Date(factura.fecha);
            return facturaDate.getMonth() === mesIndex;
          });
          return (
            <div
              key={index}
              className={`${getCardColor(mesFacturas)} shadow-lg rounded-lg p-6 text-white`}
            >
              <h2 className="text-2xl font-bold mb-4">{mes}</h2>
              {mesFacturas.map(renderFactura)}
              {mesFacturas.length > 0 && (
                <div className="flex justify-center mt-4">
                  {mesFacturas.some(factura => !factura.estado) ? (
                    <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300 ease-in-out">
                      Pagar
                    </button>
                  ) : (
                    <button className="bg-gray-500 text-white px-4 py-2 rounded-lg cursor-not-allowed">
                      Pagado
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Facturas;
