import { useState, useEffect } from 'react';
import { getStudents } from '../services/studentService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, AreaChart, Area, CartesianGrid, Legend } from 'recharts';

const Home = () => {
  const [stats, setStats] = useState({
    studentCount: 0,
    monthlyStats: [],
    paymentStats: [],
    courseStats: [],
    newStudentsStats: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6361'];

  const fetchData = async () => {
    try {
      const students = await getStudents();

      // Datos simulados para el gráfico de estudiantes mensuales
      const monthlyData = [
        { month: 'Ene', value: 120 },
        { month: 'Feb', value: 150 },
        { month: 'Mar', value: 180 },
        { month: 'Abr', value: 220 },
        { month: 'May', value: 250 },
        { month: 'Jun', value: 280 },
      ];

      // Datos simulados para el gráfico de pagos
      const paymentData = [
        { month: 'Ene', value: 2000 },
        { month: 'Feb', value: 3000 },
        { month: 'Mar', value: 5000 },
        { month: 'Abr', value: 4000 },
        { month: 'May', value: 6000 },
        { month: 'Jun', value: 7000 },
      ];

      // Datos simulados para el gráfico de materias cursadas
      const courseData = [
        { month: 'Ene', value: 15 },
        { month: 'Feb', value: 18 },
        { month: 'Mar', value: 20 },
        { month: 'Abr', value: 25 },
        { month: 'May', value: 30 },
        { month: 'Jun', value: 35 },
      ];

      // Datos simulados para el gráfico de nuevos estudiantes
      const newStudentsData = [
        { month: 'Ene', value: 10 },
        { month: 'Feb', value: 15 },
        { month: 'Mar', value: 20 },
        { month: 'Abr', value: 25 },
        { month: 'May', value: 30 },
        { month: 'Jun', value: 35 },
      ];

      setStats({
        studentCount: students.length,
        monthlyStats: monthlyData,
        paymentStats: paymentData,
        courseStats: courseData,
        newStudentsStats: newStudentsData
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const StatCard = ({ title, value, icon }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        <span className="text-blue-500">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );

  return (
    <main className="p-4 md:p-10 mx-auto max-full bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Actualizar datos
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Estudiantes totales"
          value={stats.studentCount}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>}
        />

        <StatCard
          title="Crecimiento mensual"
          value={`${((stats.studentCount / 120 - 1) * 100).toFixed(1)}%`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de estudiantes por mes - Circular */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Crecimiento de estudiantes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.monthlyStats}
                dataKey="value"
                nameKey="month"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label
              >
                {stats.monthlyStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de pagos - Barras */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Pagos recibidos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.paymentStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de materias cursadas - Líneas */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Materias cursadas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.courseStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de nuevos estudiantes - Área */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Nuevos estudiantes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.newStudentsStats}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFBB28" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FFBB28" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#FFBB28" fillOpacity={1} fill="url(#colorArea)" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
};

export default Home;
