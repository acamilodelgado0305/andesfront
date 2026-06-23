import React from "react";

// Captura cualquier error de renderizado en el árbol de React para que la
// aplicación nunca quede en pantalla blanca silenciosa. Muestra un mensaje
// claro con la opción de recargar.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary capturó un error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            color: "#1f2937",
            background: "#f9fafb",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            ⚠️
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              No se pudo cargar la página
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "8px 0 0", maxWidth: 360 }}>
              Ocurrió un problema al cargar el contenido. Revisa tu conexión a
              internet e inténtalo de nuevo.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
