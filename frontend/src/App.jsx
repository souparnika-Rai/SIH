import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CitizenApp from './pages/CitizenApp';
import AdminDashboard from './pages/AdminDashboard';
import WorkerApp from './pages/WorkerApp';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="font-bold text-xl text-blue-600 flex items-center gap-2">
              <span className="text-2xl">🏗️</span>
              InfraWatch
            </Link>
            <nav className="flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Citizen</Link>
              <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium">Admin</Link>
              <Link to="/worker" className="text-gray-600 hover:text-blue-600 font-medium">Worker</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col relative">
          <Routes>
            <Route path="/" element={<CitizenApp />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/worker" element={<WorkerApp />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
