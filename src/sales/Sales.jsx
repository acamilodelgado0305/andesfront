import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, message, Card, Divider, Modal, Select } from 'antd';
import axios from 'axios';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';

const { Option } = Select;

const paymentMethods = [
  { label: 'Link de PSE (Cualquier banco)', value: 'PSE', link: 'https://linkdepagospse.rappipay.co/U7pafq' },
  { label: 'Nequi (3223267797)', value: 'Nequi' },
  { label: 'Daviplata (3223267797)', value: 'Daviplata' },
  { label: 'Ahorros Bancolombia (816-589697-49)', value: 'Bancolombia' },
];

const Sales = () => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({ certificate: null, card: null });
  const [formData, setFormData] = useState(null);
  const [saleId, setSaleId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const generateCertificatePDF = async (data, isPreview = true) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();
    const fontSize = 16;

    page.drawText('CERTIFICADO DE MANIPULACIÓN DE ALIMENTOS', {
      x: 50,
      y: height - 50,
      size: 20,
      color: rgb(0, 0.53, 0.71),
    });

    page.drawText(`Nombre: ${data.nombre} ${data.apellido}`, { x: 50, y: height - 100, size: fontSize });
    page.drawText(`Documento: ${data.numeroDeDocumento}`, { x: 50, y: height - 120, size: fontSize });
    page.drawText(`Tipo: Buenas Prácticas de Manipulación (BPM)`, { x: 50, y: height - 140, size: fontSize });
    page.drawText(`Fecha de Expedición: 17 de julio de 2025`, { x: 50, y: height - 160, size: fontSize });
    page.drawText(`Fecha de Vencimiento: 17 de julio de 2026`, { x: 50, y: height - 180, size: fontSize });
    page.drawText(`Avalado por: Seccional de Salud de Antioquia (CSO-2018)`, { x: 50, y: height - 200, size: fontSize });
    page.drawText(`Certificador: William Alzate - NIT 712.121.85-2`, { x: 50, y: height - 220, size: fontSize });
    page.drawText(`Cumple con: Decreto 3075 de 1997, Resolución 2674 de 2013`, { x: 50, y: height - 240, size: fontSize });
    page.drawText(`Alimentos Inocuos - NIT 712.121.85-2`, { x: 50, y: height - 260, size: fontSize });

    if (isPreview) {
      page.drawText('PENDIENTE DE PAGO', {
        x: width / 4,
        y: height / 2,
        size: 50,
        color: rgb(1, 0, 0),
        opacity: 0.5,
        rotate: { type: 'degrees', angle: 45 },
      });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  };

  const generateCardPDF = async (data, isPreview = true) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([200, 300]);
    const { width, height } = page.getSize();
    const fontSize = 12;

    page.drawText('CARNÉ DE MANIPULACIÓN DE ALIMENTOS', {
      x: 20,
      y: height - 30,
      size: 14,
      color: rgb(0, 0.53, 0.71),
    });

    page.drawText(`Nombre: ${data.nombre} ${data.apellido}`, { x: 20, y: height - 60, size: fontSize });
    page.drawText(`Documento: ${data.numeroDeDocumento}`, { x: 20, y: height - 80, size: fontSize });
    page.drawText(`Vence: 17 de julio de 2026`, { x: 20, y: height - 100, size: fontSize });
    page.drawText(`Alimentos Inocuos`, { x: 20, y: height - 120, size: fontSize });

    if (isPreview) {
      page.drawText('PENDIENTE DE PAGO', {
        x: width / 4,
        y: height / 2,
        size: 30,
        color: rgb(1, 0, 0),
        opacity: 0.5,
        rotate: { type: 'degrees', angle: 45 },
      });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setFormData(data);

    try {
      // Generar PDFs para vista previa
      const certificateBytes = await generateCertificatePDF(data);
      const cardBytes = await generateCardPDF(data);
      const certificateBlob = new Blob([certificateBytes], { type: 'application/pdf' });
      const cardBlob = new Blob([cardBytes], { type: 'application/pdf' });
      setPreviewUrls({
        certificate: URL.createObjectURL(certificateBlob),
        card: URL.createObjectURL(cardBlob),
      });
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error al generar la vista previa:', error);
      message.error('Error al generar los documentos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const proceedToPayment = async () => {
    if (!formData || !selectedPaymentMethod) {
      message.warning('Por favor, selecciona un método de pago.');
      return;
    }
    setLoading(true);

    try {
      // Crear registro temporal
      const tempSaleData = {
        ...formData,
        tipo: ['Manipulación de alimentos'],
        valor: 20000,
        vendedor: 'Web',
        cuenta: selectedPaymentMethod,
        paymentStatus: 'pending',
      };
      const response = await axios.post('https://backendcoalianza.vercel.app/api/v1/clients/temp', tempSaleData);
      setSaleId(response.data._id);
      message.success('¡Vista previa lista! Completa el pago para validar tu certificado.');

      // Redirigir según el método de pago
      if (selectedPaymentMethod === 'PSE') {
        window.location.href = 'https://linkdepagospse.rappipay.co/U7pafq';
      } else {
        const whatsappMessage = encodeURIComponent(
          `Hola, he realizado el pago de 20,000 COP por el Certificado de Manipulación de Alimentos. Mi número de documento es ${formData.numeroDeDocumento}. Por favor, confirma la recepción del comprobante.`
        );
        window.location.href = `https://wa.me/+573107941580?text=${whatsappMessage}`;
      }
    } catch (error) {
      console.error('Error al iniciar el proceso de pago:', error);
      message.error('Error al procesar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!saleId) {
      message.warning('Primero debes completar el pago.');
      return;
    }
    try {
      const response = await axios.get(`https://backendcoalianza.vercel.app/api/v1/clients/${saleId}`);
      if (response.data.paymentStatus === 'completed') {
        // Registrar la venta oficialmente
        const saleData = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          numeroDeDocumento: formData.numeroDeDocumento,
          tipo: ['Manipulación de alimentos'],
          valor: 20000,
          vendedor: 'Web',
          cuenta: selectedPaymentMethod,
          paymentStatus: 'completed',
        };
        await axios.post('https://backendcoalianza.vercel.app/api/v1/clients', saleData);

        // Descargar PDFs sin marca de agua
        const certificateBytes = await generateCertificatePDF(formData, false);
        const cardBytes = await generateCardPDF(formData, false);
        saveAs(new Blob([certificateBytes], { type: 'application/pdf' }), 'Certificado_Manipulacion_Alimentos.pdf');
        saveAs(new Blob([cardBytes], { type: 'application/pdf' }), 'Carne_Manipulacion_Alimentos.pdf');
        message.success('¡Pago confirmado! Tu certificado está validado en SixNyx y los documentos han sido descargados.');
        setPreviewVisible(false);
      } else {
        message.warning('El pago aún no ha sido confirmado. Verifica con el administrador o intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al verificar el pago:', error);
      message.error('Error al verificar el estado del pago.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 via-blue-400 to-white flex flex-col items-center justify-center p-6">
      {/* Encabezado */}
      <div className="text-center mb-8 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-md">
          ¡Certificado de Manipulación de Alimentos por Solo $20,000!
        </h1>
        <p className="text-lg md:text-xl text-gray-100 mb-6 drop-shadow-sm">
          Obtén tu certificación oficial en 24 horas y verifica tu certificado en línea con nuestro sistema seguro <strong>SixNyx</strong>.
        </p>
        <div className="bg-orange-200 p-4 rounded-lg inline-block shadow-md">
          <p className="text-orange-900 font-semibold">
            ¡Oferta limitada! Completa tu compra hoy y asegura tu certificación.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card className="w-full max-w-md shadow-xl border border-blue-300 bg-white/90" bordered={false}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Nombre *</label>
            <input
              type="text"
              {...register('nombre', { required: 'El nombre es obligatorio' })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600 hover:border-blue-600 transition-colors"
              placeholder="Ingresa tu nombre"
            />
            {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Apellido *</label>
            <input
              type="text"
              {...register('apellido', { required: 'El apellido es obligatorio' })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600 hover:border-blue-600 transition-colors"
              placeholder="Ingresa tu apellido"
            />
            {errors.apellido && <p className="text чувство-red-500 text-sm mt-1">{errors.apellido.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Número de Documento *</label>
            <input
              type="text"
              {...register('numeroDeDocumento', {
                required: 'El número de documento es obligatorio',
                pattern: {
                  value: /^[0-9]+$/,
                  message: 'Solo se permiten números',
                },
              })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-600 hover:border-blue-600 transition-colors"
              placeholder="Ingresa tu número de documento"
            />
            {errors.numeroDeDocumento && (
              <p className="text-red-500 text-sm mt-1">{errors.numeroDeDocumento.message}</p>
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-blue-900">
              Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(20000)}
            </p>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 border-0 h-12 text-lg"
          >
            Ver Certificados
          </Button>
        </form>
      </Card>

      {/* Modal para vista previa */}
      <Modal
        title="Vista Previa de Documentos"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            Cancelar
          </Button>,
          <Button
            key="pay"
            type="primary"
            onClick={proceedToPayment}
            loading={loading}
            className="bg-orange-500 hover:bg-orange-600 border-0"
            disabled={!selectedPaymentMethod}
          >
            {selectedPaymentMethod === 'PSE' ? 'Pagar con PSE' : 'Continuar y Enviar Comprobante'}
          </Button>,
          <Button key="check" type="primary" onClick={checkPaymentStatus}>
            Verificar Pago y Descargar
          </Button>,
        ]}
      >
        <p className="text-gray-700 mb-4">
          Los documentos están bloqueados hasta que se confirme el pago. Para validar tu certificado en el sistema <strong>SixNyx</strong> y descargar los documentos, selecciona un método de pago y completa la transacción. El pago debe ser verificado.
        </p>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Método de Pago *</label>
          <Select
            placeholder="Selecciona un método de pago"
            onChange={(value) => setSelectedPaymentMethod(value)}
            className="w-full"
          >
            {paymentMethods.map((method) => (
              <Option key={method.value} value={method.value}>
                {method.label}
              </Option>
            ))}
          </Select>
          {selectedPaymentMethod && selectedPaymentMethod !== 'PSE' && (
            <p className="text-orange-600 text-sm mt-2">
              Deberás enviar el comprobante de pago al WhatsApp +57 310 7941580.
            </p>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Certificado</h3>
            <div style={{ position: 'relative' }}>
              <iframe
                src={previewUrls.certificate}
                width="100%"
                height="300px"
                style={{ filter: 'blur(5px)' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '24px',
                  color: 'red',
                  fontWeight: 'bold',
                }}
              >
                PENDIENTE DE PAGO
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Carné</h3>
            <div style={{ position: 'relative' }}>
              <iframe
                src={previewUrls.card}
                width="100%"
                height="200px"
                style={{ filter: 'blur(5px)' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '24px',
                  color: 'red',
                  fontWeight: 'bold',
                }}
              >
                PENDIENTE DE PAGO
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Sección de confianza */}
      <Divider className="my-8" />
      <div className="text-center max-w-2xl">
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">Certificación Oficial y Segura</h2>
        <p className="text-gray-700 text-lg mb-4">
          Nuestros certificados cumplen con el <strong>Decreto 3075 de 1997</strong> y la <strong>Resolución 2674 de 2013</strong>, actualizados para 2025, y están avalados por la <strong>Seccional de Salud de Antioquia (CSO-2018)</strong>.
        </p>
        <p className="text-gray-700 text-lg mb-4">
          Verifica tu certificado en línea con nuestro sistema <strong>SixNyx</strong>:
        </p>
        <a
          href="https://consulta-cliente-sixnyx.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Verificar Certificado
        </a>
        <div className="flex justify-center gap-4 mt-6">
          <img
            src="https://via.placeholder.com/100?text=Sello+Calidad"
            alt="Sello de Calidad"
            className="w-24 h-24 object-cover rounded-lg"
          />
          <img
            src="https://via.placeholder.com/100?text=Certificado"
            alt="Certificado"
            className="w-24 h-24 object-cover rounded-lg"
          />
        </div>
        <p className="text-gray-600 text-sm mt-4">
          <strong>Alimentos Inocuos - NIT 712.121.85-2</strong> | Sistema seguro de validación © 2025
        </p>
      </div>
    </div>
  );
};

export default Sales;