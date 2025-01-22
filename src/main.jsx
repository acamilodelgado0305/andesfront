import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";

// Componentes
import Root from "./components/root";
import ErrorPage from "./error-page";
import Home from "./components/home";
import Landing from "./components/auth/landing";
import Students from "./components/Students/student";
import Facturas from "./components/facturas/facturas";
import Programs from "./components/programas/programas";
import Materias from "./components/materias/Materias";
import CamiloForm from "./components/PublicForms/formCamilo";
import StudentRegistrationForm from "./components/PublicForms/formAdriana";

// Contexto de autenticación
import { AuthProvider } from "./AuthContext";

// Crear una sola instancia de root
const rootElement = document.getElementById("root");
if (!rootElement._root) {
  rootElement._root = ReactDOM.createRoot(rootElement);
}

const App = () => (
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/register/c" element={<CamiloForm />} />
          <Route path="/Adrianabenitez" element={<StudentRegistrationForm />} />

          {/* Rutas principales */}
          <Route path="/inicio" element={<Root />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Home />} />
            <Route path="students" element={<Students />} />
            <Route path="programas" element={<Programs />} />
            <Route path="materias" element={<Materias />} />
            <Route path="students/facturas/:id" element={<Facturas />} />
          </Route>

          {/* Ruta de error */}
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

rootElement._root.render(<App />);
