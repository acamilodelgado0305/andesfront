import { useRouteError, Link } from "react-router-dom";

export default function ErrorPage() {
    // En un <Route path="*"> normal (sin data router) useRouteError() es undefined,
    // por eso accedemos de forma segura para no provocar otra pantalla en blanco.
    const error = useRouteError();
    if (error) console.error(error);

    const message = error?.statusText || error?.message || "Página no encontrada.";

    return (
        <div
            id="error-page"
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 24,
                textAlign: "center",
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                color: "#1f2937",
            }}
        >
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Ups…</h1>
            <p style={{ color: "#6b7280", margin: 0 }}>Lo sentimos, ocurrió un error inesperado.</p>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                <i>{message}</i>
            </p>
            <Link
                to="/"
                style={{
                    marginTop: 8,
                    padding: "10px 20px",
                    borderRadius: 10,
                    background: "#1d4ed8",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                }}
            >
                Volver al inicio
            </Link>
        </div>
    );
}
