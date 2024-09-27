import React, { useState, useEffect } from 'react';
import { getStudents  } from '../services/studentService';

const Home = () => {
  const [stats, setStats] = useState({
    studentCount: 0,
    monthlyStats: []
  });


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

    
    </main>
  );
};

export default Home;