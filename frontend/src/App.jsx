import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CitizenApp from './pages/CitizenApp';
import AdminDashboard from './pages/AdminDashboard';
import WorkerApp from './pages/WorkerApp';
import LiveJourneyApp from './pages/LiveJourneyApp';

function App() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="font-bold text-xl text-blue-600 flex items-center gap-2">
              <span className="text-2xl">🏗️</span>
              {t('app_name')}
            </Link>
            <nav className="flex items-center gap-6">
              <div className="flex gap-4">
                <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">{t('nav_citizen')}</Link>
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium">{t('nav_admin')}</Link>
                <Link to="/worker" className="text-gray-600 hover:text-blue-600 font-medium">{t('nav_worker')}</Link>
                <Link to="/live" className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Live
                </Link>
              </div>
              <select 
                onChange={changeLanguage} 
                defaultValue={i18n.language}
                className="bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ml">മലയാളം (Malayalam)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col relative">
          <Routes>
            <Route path="/" element={<CitizenApp />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/worker" element={<WorkerApp />} />
            <Route path="/live" element={<LiveJourneyApp />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
