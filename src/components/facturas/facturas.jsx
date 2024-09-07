import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getInvoicebyStudent,
  getStudentById,
  payInvoice,
  getTotalPaymentInvoicebyStudent,
} from "../../services/studentService";
import { Table, Input, Button, Dropdown, Menu, Modal, message } from "antd";

const Facturas = () => {
  const { id } = useParams();
  const [facturas, setFacturas] = useState([]);
  const [student, setStudent] = useState(null);
  const [totalPagado, setTotalPagado] = useState(0);

  const fetchPaymentInvoicebyStudent = async (id) => {
    try {
      const result = await getTotalPaymentInvoicebyStudent(id);
      const totalPagado = parseFloat(result.total_pagado || 0); // Extrae el valor y conviértelo a número
      setTotalPagado(totalPagado);
      console.log(totalPagado);
    } catch (err) {
      console.error("Error fetching total pagado:", err);
    }
  };
  

  const fetchInvoicebyStudent = async (id) => {
    try {
      const data = await getInvoicebyStudent(id);
      const currentYear = new Date().getFullYear();

      // Separar facturas del año actual y años anteriores
      const facturasAñoActual = [];
      const facturasAñosAnteriores = [];

      data.forEach((factura) => {
        const facturaYear = new Date(factura.fecha).getFullYear();
        if (facturaYear === currentYear) {
          facturasAñoActual.push(factura);
        } else {
          facturasAñosAnteriores.push(factura);
        }
      });

      // Ordenar facturas por fecha
      const sortFacturas = (a, b) => new Date(a.fecha) - new Date(b.fecha);

      facturasAñoActual.sort(sortFacturas);
      facturasAñosAnteriores.sort(sortFacturas);

      // Combinar facturas del año actual y años anteriores
      const facturasOrdenadas = [
        ...facturasAñoActual,
        ...facturasAñosAnteriores,
      ];

      setFacturas(facturasOrdenadas);
    } catch (err) {
      console.error("Error fetching facturas:", err);
    }
  };

  const fetchStudentById = async (id) => {
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (err) {
      console.error("Error fetching student:", err);
    }
  };

  const calcularTotalPagado = (facturas) => {
    const total = facturas
      .filter((factura) => factura.estado)
      .reduce((acc, factura) => acc + factura.monto, 0);
    setTotalPagado(total);
  };

  useEffect(() => {
    fetchInvoicebyStudent(id);
    fetchStudentById(id);
    fetchPaymentInvoicebyStudent(id);
  }, [id]);

  const formatDateToMonth = (fecha) => {
    const meses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const date = new Date(fecha);
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatCurrency = (value) => {
    return value.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
  };

  const handlePayment = async (facturaId) => {
    Modal.confirm({
      title: "¿Desea realizar el pago?",
      content: "Esta acción no se puede deshacer",
      okText: "Sí, pagar",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await payInvoice(facturaId);

          setFacturas((prevFacturas) =>
            prevFacturas.map((factura) =>
              factura.id === facturaId ? { ...factura, estado: true } : factura
            )
          );

          calcularTotalPagado(
            facturas.map((factura) =>
              factura.id === facturaId ? { ...factura, estado: true } : factura
            )
          );

          message.success("La factura ha sido pagada");
        } catch (error) {
          message.error("Hubo un problema al procesar el pago");
        }
      },
    });
  };

  return (
    <div className="mx-auto mt-8 p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Facturas de {student ? student.nombre : "Cargando..."}
        </h1>
        <p className="text-gray-600">
          Coordinador: {student ? student.coordinador : "Cargando..."}
        </p>
      </div>

      {student && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Información de Matrícula
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Matrícula</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatCurrency(student.matricula)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <div className="flex justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Lista de Facturas Mensuales
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.map((factura) => (
              <tr key={factura.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDateToMonth(factura.fecha)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatCurrency(factura.monto)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {factura.descripcion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {factura.estado ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Pagada
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Pendiente
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {factura.estado ? (
                    <button className="bg-gray-500 text-white px-4 py-2 rounded-lg cursor-not-allowed">
                      Pagado
                    </button>
                  ) : (
                    <button
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300 ease-in-out"
                      onClick={() => handlePayment(factura.id)}
                    >
                      Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Total pagado: {formatCurrency(parseFloat(totalPagado) || 0)}
        </h2>
      </div>
    </div>
  );
};
export default Facturas;
