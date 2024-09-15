import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Importar los componentes
import Root from "./components/root";
import ErrorPage from "./error-page";
import Home from "./components/home";
import Sigin from "./components/auth/register";
import Landing from "./components/auth/landing";
import Students from "./components/Students/student";
import Facturas from "./components/facturas/facturas";
import Programs from "./components/programas/programas";
import CamiloForm from "./components/PublicForms/formCamilo";
import AdrianaForm from "./components/PublicForms/formAdriana";

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
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "dashboard",
        element: <Home />,
      },
      {
        path: "students",
        element: <Students />,
      },
      {
        path: "programas",
        element: <Programs />,
      },
      {
        path: "students/facturas/:id",
        element: <Facturas />,
      }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
