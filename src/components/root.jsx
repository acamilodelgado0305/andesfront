import React from 'react';
import { Outlet, Link } from "react-router-dom";
import {
  BsCart,
  BsBarChartFill,
  BsPersonCheckFill,
  BsBox,
  BsPersonXFill,
} from "react-icons/bs";
import { MdSchool } from "react-icons/md";

const Root = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-5">
          <h1 className="text-2xl font-bold text-gray-800">Administrador</h1>
        </div>
        <nav className="mt-5">
          <ul>
            <SidebarItem to="/inicio/dashboard" icon={<BsBarChartFill />} text="Dashboard" />
            <SidebarItem to="/inicio/students" icon={<BsPersonCheckFill />} text="Estudiantes" />
            <SidebarItem to="/inicio/facturas" icon={<BsBox />} text="Facturas" />
            <SidebarItem to="/inicio/programas" icon={<MdSchool />} text="Programas" />
          </ul>
        </nav>
      </aside>
      <main className="flex-1  overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

const SidebarItem = ({ to, icon, text }) => (
  <li className="mb-2">
    <Link to={to} className="flex items-center px-5 py-3 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-colors duration-150 ease-in-out">
      <span className="text-lg mr-4">{icon}</span>
      <span className="font-medium">{text}</span>
    </Link>
  </li>
);

export default Root;