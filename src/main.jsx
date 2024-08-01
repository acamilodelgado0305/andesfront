import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

//importar los componentes
import Root from "./components/root";
import ErrorPage from "./error-page";
import Home from "./components/home";
import Clients from "./components/Students/client";
import FormClients from "./components/formClients";
import FormProducts from "./components/formProducts";
import Products from "./components/product";
import Sales from "./components/ventas";
import NewSale from "./components/newSale";
import Sigin from "./components/register";
import Login from "./components/login";
import Homep from "./components/home2";
import Empleados from "./components/empleados";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage/>,
    children:[{
      index:true,element:<Home/>
    },
    {
      path: "/sigin",
      element: <Sigin/>,
    },
    {
      path: "/login",
      element: <Login/>
    },

    {
      path: "/dashboard",
      element: <Home />,
    },
    {
      path:"/home2",
      element:<Homep/>,

    },
      {
        path: "/clientes",
        element: <Clients />,
      },
      {
        path:"/clientes/nuevo",
        element: <FormClients/>
      },

      {
        path:"/clientes/editar/:_id",
        element: <FormClients/>
      },
      {
        path:"/productos",
        element: <Products/>
      },
      {
        path:"/productos/nuevo",
        element: <FormProducts/>
      },

      {
        path:"/productos/editar/:_id",
        element: <FormProducts/>
      },

      {
        path:"/ventas",
        element: <Sales/>
      },
      {
        path:"/ventas/nuevo",
        element: <NewSale/>
      },
      {
        path:"/empleados",
        element: <Empleados/>
      }
    ]
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);