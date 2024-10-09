import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Importar los componentes
import Root from "./components/root";
import ErrorPage from "./error-page";
import Home from "./components/home";
import Landing from "./components/auth/landing";
import Students from "./components/Students/student";
import Facturas from "./components/facturas/facturas";
import Programs from "./components/programas/programas";
import CamiloForm from "./components/PublicForms/formCamilo";
import AdrianaForm from "./components/PublicForms/formAdriana";
import ProtectedRoute from "./ProtectedRoute";
//import { AuthProvider } from "./AuthContext";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Landing />,
      },
    ],
  },
  {
    path: "/register/c",
    element: <CamiloForm />,
  },
  {
    path: "/register/ab",
    element: <AdrianaForm />,
  },
  {
    path: "/inicio",
    element: <ProtectedRoute element={<Root />} />, // Proteger la ruta principal
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <ProtectedRoute element={<Home />} />, // Proteger la ruta de inicio
      },
      {
        path: "dashboard",
        element: <ProtectedRoute element={<Home />} />, // Proteger la ruta del dashboard
      },
      {
        path: "students",
        element: <ProtectedRoute element={<Students />} />, // Proteger la ruta de estudiantes
      },
      {
        path: "programas",
        element: <ProtectedRoute element={<Programs />} />, // Proteger la ruta de programas
      },
      {
        path: "students/facturas/:id",
        element: <ProtectedRoute element={<Facturas />} />, // Proteger la ruta de facturas
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
