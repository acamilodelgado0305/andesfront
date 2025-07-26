import React, { useState } from 'react';
import { Button, Card, Radio, Space, Result, Steps, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- CONTENIDO DEL CURSO DETALLADO (sin cambios) ---
const courseContent = [
  {
    title: '1. Introducción',
    details: [
      'La manipulación segura de alimentos es esencial para prevenir enfermedades transmitidas por alimentos (ETA) y garantizar la calidad de los productos. Este curso te enseñará las prácticas básicas para manejar alimentos de forma higiénica y segura.'
    ]
  },
  {
    title: '2. Higiene Personal',
    details: [
      '<strong>Lávate las manos:</strong> Lava tus manos con agua y jabón durante al menos 20 segundos antes y después de manipular alimentos, especialmente carnes crudas, pescados o vegetales sin lavar.',
      '<strong>Usa indumentaria adecuada:</strong> Utiliza delantales limpios, gorros para cubrir el cabello y evita joyas o accesorios que puedan contaminar los alimentos.',
      '<strong>Evita trabajar si estás enfermo:</strong> No manipules alimentos si tienes síntomas como fiebre, diarrea o heridas abiertas.'
    ]
  },
  {
    title: '3. Almacenamiento Seguro',
    details: [
      '<strong>Control de temperatura:</strong> Mantén los alimentos refrigerados a 4°C o menos y los congelados a -18°C. Los alimentos calientes deben mantenerse a más de 60°C.',
      '<strong>Separación de alimentos:</strong> Almacena carnes crudas, pescados y vegetales en recipientes separados para evitar la contaminación cruzada.',
      '<strong>Primero en entrar, primero en salir (PEPS):</strong> Usa primero los alimentos con fechas de caducidad más cercanas.'
    ]
  },
  {
    title: '4. Preparación de Alimentos',
    details: [
      '<strong>Limpieza de superficies:</strong> Desinfecta mesas, cuchillos y tablas de cortar antes y después de usarlos. Usa tablas diferentes para carnes crudas y alimentos listos para consumir.',
      '<strong>Cocción adecuada:</strong> Asegúrate de que los alimentos alcancen las temperaturas internas seguras (ej: 74°C para aves, 71°C para carnes molidas).',
      '<strong>Evita la contaminación cruzada:</strong> No uses los mismos utensilios para alimentos crudos y cocidos sin lavarlos.'
    ]
  },
  {
    title: '5. Mantenimiento de la Cadena de Frío',
    details: [
      'Nunca dejes alimentos perecederos a temperatura ambiente por más de 2 horas (1 hora si la temperatura ambiente es superior a 32°C).',
      'Descongela los alimentos en el refrigerador, en agua fría o en el microondas, nunca a temperatura ambiente.'
    ]
  },
  {
    title: '6. Gestión de Residuos',
    details: [
      'Elimina los desperdicios de alimentos de manera regular y mantén los contenedores de basura limpios y cerrados para evitar plagas.',
      'Lava los utensilios y superficies que hayan estado en contacto con residuos.'
    ]
  }
];

// --- PREGUNTAS DEL CUESTIONARIO (ACTUALIZADO A 5 PREGUNTAS) ---
const quizQuestions = [
  {
    question: '¿Cuál es la regla más importante de la higiene personal?',
    options: ['Usar un delantal bonito', 'Lavarse las manos correctamente por 20 segundos', 'Probar la comida constantemente'],
    correctAnswer: 1
  },
  {
    question: 'Para evitar la contaminación cruzada, debes:',
    options: ['Lavar el pollo en el lavaplatos', 'Usar la misma tabla para cortar carne y vegetales', 'Usar utensilios y tablas separadas para alimentos crudos y cocidos'],
    correctAnswer: 2
  },
  {
    question: '¿Cuál es la temperatura segura para mantener los alimentos refrigerados?',
    options: ['10°C o menos', '4°C o menos', '0°C o menos'],
    correctAnswer: 1
  },
  {
    question: 'Según la guía, ¿cuál es la temperatura interna segura para cocinar aves?',
    options: ['60°C', '71°C', '74°C'],
    correctAnswer: 2
  },
  {
    question: 'El método PEPS (Primero en Entrar, Primero en Salir) se utiliza para:',
    options: ['Enfriar alimentos rápidamente', 'Gestionar el inventario y usar los alimentos más antiguos primero', 'Limpiar la cocina al final del día'],
    correctAnswer: 1
  }
];


// --- COMPONENTE PRINCIPAL CON ANT DESIGN Y TAILWIND ---

function Sales() {
  const [currentStep, setCurrentStep] = useState(0); // 0: Intro, 1: Curso, 2: Examen, 3: Resultados
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);

  // --- FUNCIÓN DE DESCARGA PDF CORREGIDA PARA MÚLTIPLES PÁGINAS ---
  const handleDownloadPDF = () => {
    const pdfContent = document.getElementById('pdf-content');
    message.loading({ content: 'Generando PDF...', key: 'pdf', duration: 0 });

    html2canvas(pdfContent, {
      scale: 2, // Mejora la resolución de la imagen
      useCORS: true
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const canvasAspectRatio = canvasWidth / canvasHeight;
      const pdfAspectRatio = pdfWidth / pdfHeight;

      let finalCanvasWidth, finalCanvasHeight;

      if (canvasAspectRatio > pdfAspectRatio) {
        finalCanvasWidth = pdfWidth;
        finalCanvasHeight = pdfWidth / canvasAspectRatio;
      } else {
        finalCanvasHeight = pdfHeight;
        finalCanvasWidth = pdfHeight * canvasAspectRatio;
      }

      const totalPDFPages = Math.ceil(canvasHeight / (canvasWidth * (pdfHeight / pdfWidth)));
      let position = 0;

      for (let i = 0; i < totalPDFPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, canvasHeight * pdfWidth / canvasWidth);
        position += pdfHeight;
      }

      pdf.save('guia-manipulacion-alimentos.pdf');
      message.success({ content: '¡PDF descargado!', key: 'pdf', duration: 3 });
    });
  };

  const handleAnswerChange = (questionIndex, event) => {
    setAnswers({
      ...answers,
      [questionIndex]: event.target.value
    });
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(answers).length !== quizQuestions.length) {
      message.error('Por favor, responde todas las preguntas.');
      return;
    }
    let finalScore = 0;
    quizQuestions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        finalScore++;
      }
    });
    setScore(finalScore);
    setCurrentStep(3);
  };
  
  const restartCourse = () => {
    setAnswers({});
    setScore(0);
    setCurrentStep(0);
  };

  // Función para renderizar el contenido del curso (sin cambios)
  const renderCourseContent = (isForPDF = false) => (
    <div className={isForPDF ? 'p-8' : ''}>
      <h1 className="text-3xl font-bold text-center mb-6">Curso Corto: Manipulación Segura de Alimentos</h1>
      <Space direction="vertical" size="large" className="w-full">
        {courseContent.map((item, index) => (
          <Card key={index} type={isForPDF ? 'inner' : 'default'} title={item.title} headStyle={!isForPDF ? { backgroundColor: '#f0faff', borderBottom: '1px solid #91d5ff' } : {}}>
            <ul className="space-y-2 list-disc pl-5 text-gray-700">
              {item.details.map((text, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: text }}></li>
              ))}
            </ul>
          </Card>
        ))}
         <Card type={isForPDF ? 'inner' : 'default'} title="7. Conclusión">
            <p className="text-gray-700">La manipulación segura de alimentos protege la salud de los consumidores y garantiza la calidad de los productos. Practica estas medidas en todo momento y mantente atento a las normas locales de seguridad alimentaria.</p>
        </Card>
      </Space>
    </div>
  );

  // Función principal para renderizar el paso actual
  const renderContent = () => {
    switch (currentStep) {
      case 0: // --- VISTA DE INTRODUCCIÓN ---
        return (
          <div className="text-center p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Curso Rápido de Manipulación de Alimentos 👨‍🍳</h1>
            <p className="text-lg text-gray-600 mb-6">Aprende los conceptos básicos en menos de 10 minutos. ¡Comencemos!</p>
            <Button type="primary" size="large" onClick={() => setCurrentStep(1)}>
              Iniciar Curso
            </Button>
          </div>
        );
      
      case 1: // --- VISTA DEL CURSO ---
        return (
          <div>
            {renderCourseContent()}
            <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
              <Button icon={<DownloadOutlined />} size="large" onClick={handleDownloadPDF}>
                Descargar Guía en PDF
              </Button>
              <Button type="primary" size="large" onClick={() => setCurrentStep(2)}>
                He leído todo, ¡ir al examen!
              </Button>
            </div>
          </div>
        );

      case 2: // --- VISTA DEL EXAMEN ---
        return (
           <div>
            <h2 className="text-2xl font-semibold text-center mb-6">Comprueba lo que Aprendiste</h2>
            <div className="space-y-6">
              {quizQuestions.map((q, qIndex) => (
                <Card key={qIndex} type="inner" title={`${qIndex + 1}. ${q.question}`}>
                   <Radio.Group onChange={(e) => handleAnswerChange(qIndex, e)} value={answers[qIndex]}>
                    <Space direction="vertical">
                      {q.options.map((option, oIndex) => (
                        <Radio key={oIndex} value={oIndex}>{option}</Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </Card>
              ))}
            </div>
             <div className="text-center mt-8">
                <Button type="primary" size="large" onClick={handleSubmitQuiz}>
                  Finalizar y Ver Resultado
                </Button>
            </div>
          </div>
        );

      case 3: // --- VISTA DE RESULTADOS (ACTUALIZADA) ---
        const isApproved = score >= 4; // Aprueba con 4 o más respuestas correctas

        return isApproved ? (
            <Result
              status="success"
              title="¡Felicidades, has APROBADO!"
              subTitle={`Tu puntaje: ${score} de ${quizQuestions.length}. Has completado el curso exitosamente.`}
              extra={[
                <Button key="restart" onClick={restartCourse}>Realizar de Nuevo</Button>
              ]}
            />
          ) : (
            <Result
              status="error"
              title="Lo sentimos, no has aprobado"
              subTitle={`Tu puntaje: ${score} de ${quizQuestions.length}. Necesitas al menos 4 respuestas correctas para aprobar.`}
              extra={[
                <Button type="primary" key="retry" onClick={restartCourse}>
                  Reintentar Curso
                </Button>
              ]}
            />
          );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8 flex items-center justify-center">
      {/* --- Div oculto que se usará para generar el PDF --- */}
      <div id="pdf-content" className="absolute -left-full w-[210mm] bg-white text-black">
        {renderCourseContent(true)}
      </div>

      <div className="w-full max-w-4xl">
        <Card className="shadow-2xl rounded-lg">
          <Steps
            current={currentStep}
            className="mb-8"
            items={[
              { title: 'Introducción' },
              { title: 'Contenido' },
              { title: 'Examen' },
              { title: 'Resultados' },
            ]}
          />
          <div className="p-2 md:p-4">
            {renderContent()}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Sales;