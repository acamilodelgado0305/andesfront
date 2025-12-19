import React, { useState } from 'react';

function RegistroExpress() {
  // --- ESTADOS ---
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    tipoDocumento: '', // Obligatorio seleccionar
    numeroDeDocumento: '',
    customer_email: '', 
  });
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); 
  const [mensaje, setMensaje] = useState('');
  
  // Feedback visual de copiado
  const [copiadoNequi, setCopiadoNequi] = useState(false);
  const [copiadoBancolombia, setCopiadoBancolombia] = useState(false);

  // --- DATOS FIJOS ---
  const NEQUI_NUMERO = "3223267797"; 
  const BANCOLOMBIA_NUMERO = "816-589697-49";
  const VALOR = "$18.000 COP";
  // 👇 AQUÍ ESTÁ EL ENLACE DEL EXAMEN/CURSO
  const LINK_CURSO = "https://certitec.vercel.app/servicios/curso-manipulacion-de-alimentos.html";
  
  // --- HANDLERS ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const copiarPortapapeles = (texto, setEstado) => {
    navigator.clipboard.writeText(texto);
    setEstado(true);
    setTimeout(() => setEstado(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    if (!formData.tipoDocumento) {
        alert("⚠️ Selecciona el Tipo de Documento");
        setLoading(false);
        return;
    }

    const data = new FormData();
    data.append('usuarioId', '8'); 
    data.append('valor', '18000');
    data.append('cuenta', 'Mixto Web'); 
    data.append('tipo', 'Certificado Manipulación Alimentos');
    
    data.append('nombre', formData.nombre);
    data.append('apellido', formData.apellido);
    data.append('customer_email', formData.customer_email);
    
    // Concatenamos Tipo + Número para la DB
    const documentoFinal = `${formData.tipoDocumento} ${formData.numeroDeDocumento}`;
    data.append('numeroDeDocumento', documentoFinal); 
    
    if (archivo) {
      data.append('comprobante', archivo);
    } else {
      alert("⚠️ Adjunta la foto del pago.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://controla-570877385695.northamerica-northeast1.run.app/api/ingresos/publico', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setMensaje(result.message || 'Error al procesar.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMensaje('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // --- VISTA DE ÉXITO (TICKET VERDE) ---
  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={styles.iconCircle}>✅</div>
          <h2 style={styles.title}>¡Pago Recibido!</h2>
          <p style={styles.text}>Tus datos están en validación.</p>
          
          <div style={styles.infoBox}>
            <p style={{marginBottom: '5px'}}><strong>🕒 Entrega estimada:</strong> 10 - 20 minutos</p>
            <p><strong>📱 Medio:</strong> WhatsApp</p>
          </div>

          <hr style={styles.divider} />

          {/* 🎓 EL LINK EDUCATIVO (Destacado) */}
          <div style={styles.educationalBox}>
            <p style={styles.eduTitle}>🎓 ¿Quieres afianzar conocimientos?</p>
            <p style={styles.eduText}>Mientras esperas, puedes repasar el material o hacer el examen opcional:</p>
            
            <a href={LINK_CURSO} target="_blank" rel="noopener noreferrer" style={styles.eduButton}>
              📚 IR AL CURSO / EXAMEN
            </a>
          </div>

          <button onClick={() => window.location.reload()} style={styles.secondaryButton}>
            Solicitar Otro Certificado
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA FORMULARIO (TICKET DE PAGO LIMPIO) ---
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* HEADER AZUL LIMPIO */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Certificado Manipulación Alimentos</h1>
          <p style={styles.headerSubtitle}>Trámite Express • $18.000 COP</p>
        </div>

        <div style={styles.body}>
          
          {/* SECCIÓN PAGO */}
          <div style={styles.sectionHeader}>
            <span style={styles.stepNumber}>1</span> REALIZAR PAGO
          </div>
          
          <div style={styles.paymentGrid}>


              <div onClick={() => copiarPortapapeles(BANCOLOMBIA_NUMERO, setCopiadoBancolombia)} style={styles.paymentOption}>
              <div style={styles.bankName}>BANCOLOMBIA</div>
              <div style={styles.bankNumber}>{BANCOLOMBIA_NUMERO}</div>
              <div style={{...styles.copyStatus, color: copiadoBancolombia ? '#10b981' : '#2563eb'}}>
                {copiadoBancolombia ? 'Copiado' : 'Copiar'}
              </div>
            </div>
            {/* NEQUI */}
            <div onClick={() => copiarPortapapeles(NEQUI_NUMERO, setCopiadoNequi)} style={styles.paymentOption}>
              <div style={styles.bankName}>NEQUI / DAVI</div>
              <div style={styles.bankNumber}>{NEQUI_NUMERO}</div>
              <div style={{...styles.copyStatus, color: copiadoNequi ? '#10b981' : '#2563eb'}}>
                {copiadoNequi ? 'Copiado' : 'Copiar'}
              </div>
            </div>

            {/* BANCOLOMBIA */}
          
          </div>

          <hr style={styles.divider} />

          {/* SECCIÓN DATOS */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.sectionHeader}>
              <span style={styles.stepNumber}>2</span> DATOS DEL CERTIFICADO
            </div>

            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre</label>
                <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Apellido</label>
                <input type="text" name="apellido" required value={formData.apellido} onChange={handleChange} style={styles.input} />
              </div>
            </div>

            <div style={styles.row}>
                <div style={{flex: 1}}>
                    <label style={styles.label}>Tipo</label>
                    <select name="tipoDocumento" required value={formData.tipoDocumento} onChange={handleChange} style={styles.select}>
                      <option value="">...</option>
                      <option value="CC">CC</option>
                      <option value="PPT">PPT</option>
                      <option value="CE">CE</option>
                      <option value="TI">TI</option>
                      <option value="PAS">PAS</option>
                    </select>
                </div>
                <div style={{flex: 2}}>
                    <label style={styles.label}>Número Documento</label>
                    <input type="number" name="numeroDeDocumento" required placeholder="Sin puntos" value={formData.numeroDeDocumento} onChange={handleChange} style={styles.input} />
                </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>WhatsApp (Entrega)</label>
              <input type="number" name="customer_email" required placeholder="300..." value={formData.customer_email} onChange={handleChange} style={styles.input} />
            </div>

            <div style={styles.uploadBox}>
              <label style={styles.label}>Comprobante de Pago</label>
              <input type="file" accept="image/*" required onChange={handleFileChange} style={styles.fileInput} />
              {archivo && <p style={styles.fileName}>📎 {archivo.name}</p>}
            </div>

            {status === 'error' && <div style={styles.errorBox}>⚠️ {mensaje}</div>}

            <button type="submit" disabled={loading} style={loading ? styles.buttonDisabled : styles.button}>
              {loading ? 'Procesando...' : 'CONFIRMAR Y SOLICITAR'}
            </button>
          </form>
        </div>
      </div>
      
      {/* 🦶 FOOTER CON ENLACE OPCIONAL AL CURSO */}
      <div style={styles.footerContainer}>
        <p style={styles.footerText}>🔒 QuickControla - Pagos Seguros</p>
        <a href={LINK_CURSO} target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
          📖 Ver material de estudio y examen (Opcional)
        </a>
      </div>

    </div>
  );
}

// --- ESTILOS "CLEAN TICKET" ---
const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb', padding: '15px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', overflow: 'hidden' },
  
  // Header Azul Limpio
  header: { backgroundColor: '#1e3a8a', color: 'white', padding: '20px', textAlign: 'center' },
  headerTitle: { margin: 0, fontSize: '18px', fontWeight: '700' },
  headerSubtitle: { margin: '4px 0 0', color: '#bfdbfe', fontSize: '13px', fontWeight: '500' },
  
  body: { padding: '20px' },
  sectionHeader: { fontSize: '12px', fontWeight: '700', color: '#6b7280', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  stepNumber: { backgroundColor: '#1e3a8a', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' },
  
  // Grid de Pagos
  paymentGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  paymentOption: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', backgroundColor: '#f9fafb', transition: 'all 0.2s' },
  bankName: { fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  bankNumber: { fontSize: '13px', fontWeight: '700', color: '#1f2937', margin: '4px 0', fontFamily: 'monospace' },
  copyStatus: { fontSize: '10px', fontWeight: '600' },
  
  divider: { border: 'none', borderTop: '1px dashed #e5e7eb', margin: '0 0 20px 0' },
  
  // Formulario
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '10px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' },
  label: { fontSize: '12px', fontWeight: '600', color: '#374151' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', width: '100%', backgroundColor: 'white' },
  uploadBox: { backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', border: '1px dashed #9ca3af', textAlign: 'center' },
  fileInput: { width: '100%', fontSize: '12px' },
  fileName: { fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: '600' },
  button: { backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '5px', width: '100%' },
  buttonDisabled: { backgroundColor: '#9ca3af', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'not-allowed', marginTop: '5px', width: '100%' },
  errorBox: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px', borderRadius: '6px', fontSize: '12px', textAlign: 'center' },
  
  // Footer Link
  footerContainer: { marginTop: '20px', textAlign: 'center' },
  footerText: { color: '#9ca3af', fontSize: '11px', marginBottom: '5px' },
  footerLink: { color: '#4b5563', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' },

  // Success View
  successCard: { textAlign: 'center', padding: '30px 20px' },
  iconCircle: { fontSize: '40px', marginBottom: '10px' },
  title: { fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px' },
  text: { fontSize: '14px', color: '#4b5563', marginBottom: '20px' },
  infoBox: { backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', textAlign: 'left', marginBottom: '20px', fontSize: '13px', border: '1px solid #dbeafe', color: '#1e3a8a' },
  secondaryButton: { backgroundColor: 'white', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#374151', width: '100%' },
  
  // Educational Box (Success)
  educationalBox: { backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '20px', textAlign: 'center' },
  eduTitle: { fontSize: '13px', fontWeight: '700', color: '#065f46', marginBottom: '4px' },
  eduText: { fontSize: '12px', color: '#064e3b', marginBottom: '12px', lineHeight: '1.4' },
  eduButton: { display: 'block', width: '100%', backgroundColor: '#059669', color: 'white', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer' }
};

export default RegistroExpress;