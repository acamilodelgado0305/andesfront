import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";

// Componentes
import Root from "./components/root";
import Login from "./components/auth/Login";
import ErrorPage from "./error-page";
import Home from "./components/home";
import Landing from "./components/auth/landing";
import Students from "./components/Students/student";
import Facturas from "./components/facturas/facturas";
import Programs from "./components/programas/programas";
import Materias from "./components/materias/Materias";
import CamiloForm from "./components/PublicForms/formCamilo";
import StudentRegistrationForm from "./components/PublicForms/formAdriana";
import StudentRegistrationForm1 from "./components/PublicForms/formCamilo";
import StudentRegistrationFormBlanca from "./components/PublicForms/formBlanca";
import StudentRegistrationFormMauricio from "./components/PublicForms/formMauricio";
import StudentRegistrationFormMarily from "./components/PublicForms/formMarily";
import StudentRegistrationFormJesus from "./components/PublicForms/formJesus";
import Certificados from "./components/Certificados/Certificados";

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
          <Route path="/login" element={<Login />} />
          <Route path="/Camilodelgado" element={<StudentRegistrationForm1 />} />
          <Route path="/Adrianabenitez" element={<StudentRegistrationForm />} />
          <Route path="/Blancasanchez" element={<StudentRegistrationFormBlanca />} />
          <Route path="/Mauriciopulido" element={<StudentRegistrationFormMauricio />} />
          <Route path="/Jesusbenitez" element={<StudentRegistrationFormJesus />} />
          <Route path="/incase" element={<StudentRegistrationFormMarily />} />
          {/* Rutas principales */}
          <Route path="/inicio" element={<Root />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Home />} />
            <Route path="students" element={<Students />} />
            <Route path="programas" element={<Programs />} />
            <Route path="materias" element={<Materias />} />
            <Route path="certificados" element={<Certificados />} />
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
