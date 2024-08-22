import React, { useState, useEffect } from 'react';
import { getStudents } from '../services/studentService';

const Home = () => {
  const [studentCount, setStudentCount] = useState(0);

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudentCount(data.length); // Asume que `data` es un array de estudiantes
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <main className="flex flex-col items-center p-4">
      <div className="main-title">
        <h3 className="text-2xl font-semibold mb-4">DASHBOARD</h3>
      </div>
    
      <div className="card bg-white shadow-md rounded-lg p-6 w-full max-w-sm">
        <div className="card-inner flex justify-between items-center">
          <h3 className="text-xl font-bold">ESTUDIANTES</h3>
          <h1 className="text-3xl font-bold">{studentCount}</h1>
        </div>
      </div>
    </main>
  );
};

export default Home;
