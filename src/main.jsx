import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Importar BrowserRouter y Routes
import "./index.css";

// Importar los componentes
import Root from "./components/root";
import ErrorPage from "./error-page";
import Home from "./components/home";
import Landing from "./components/auth/landing";
import Students from "./components/Students/student";
import Facturas from "./components/facturas/facturas";
import Programs from "./components/programas/programas";
import Materias from "./components/materias/Materias";
import CamiloForm from "./components/PublicForms/formCamilo";
import AdrianaForm from "./components/PublicForms/formAdriana";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "./AuthContext"; // Asegúrate de tener bien el contexto de autenticación

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter> {/* Cambia aquí a BrowserRouter */}
      <AuthProvider> {/* Envolviendo con el contexto de autenticación */}
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register/c" element={<CamiloForm />} />
          <Route path="/register/ab" element={<AdrianaForm />} />
          <Route path="/inicio" element={<ProtectedRoute element={<Root />} />}>
            <Route index element={<ProtectedRoute element={<Home />} />} />
            <Route path="dashboard" element={<ProtectedRoute element={<Home />} />} />
            <Route path="students" element={<ProtectedRoute element={<Students />} />} />
            <Route path="programas" element={<ProtectedRoute element={<Programs />} />} />
            <Route path="students/facturas/:id" element={<ProtectedRoute element={<Facturas />} />} />
          </Route>
          <Route path="*" element={<ErrorPage />} /> {/* Ruta de error */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
