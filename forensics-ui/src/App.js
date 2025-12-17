import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import FetchPage from './FetchPage';
import RetrievePage from './RetrievePage';
import LoginPage from './LoginPage';
import ReportPage from './ReportPage';
import './index.css';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">ForensicTool</h1>
        <nav className="mb-6 bg-white shadow rounded-lg p-4">
          {!isAuthenticated ? (
            <Link to="/login" className="mx-4 text-blue-600 hover:text-blue-800 hover:underline font-medium">
              Login
            </Link>
          ) : (
            <>
              <Link to="/" className="mx-4 text-blue-600 hover:text-blue-800 hover:underline font-medium">
                Fetch & Store
              </Link>
              <Link to="/retrieve" className="mx-4 text-blue-600 hover:text-blue-800 hover:underline font-medium">
                Retrieve Evidence
              </Link>
              <Link to="/report" className="mx-4 text-blue-600 hover:text-blue-800 hover:underline font-medium">
                Report
              </Link>
              <button
                onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user_id'); window.location.href = '/login'; }}
                className="mx-4 text-red-600 hover:text-red-800 hover:underline font-medium"
              >
                Logout
              </button>
            </>
          )}
        </nav>
        <div className="w-full max-w-lg">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={isAuthenticated ? <FetchPage /> : <Navigate to="/login" replace />} />
            <Route path="/retrieve" element={isAuthenticated ? <RetrievePage /> : <Navigate to="/login" replace />} />
            <Route path="/report" element={isAuthenticated ? <ReportPage /> : <Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;