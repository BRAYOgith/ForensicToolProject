import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import FetchPage from './FetchPage';
import RetrievePage from './RetrievePage';
import LoginPage from './LoginPage';
import ReportPage from './ReportPage';
import './index.css';

function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [message, setMessage] = useState('Activating your account...');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage('Invalid activation link — no token found');
      return;
    }

    const activateAccount = async () => {
      try {
        const response = await fetch(`http://localhost:5000/activate?token=${token}`);

        if (response.ok) {
          setMessage('Account activated successfully! Redirecting to login...');
          setIsSuccess(true);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          const text = await response.text();
          setMessage(text || 'Activation failed. Link may be invalid or expired.');
        }
      } catch (err) {
        setMessage('Network error. Could not connect to server.');
      }
    };

    activateAccount();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Account Activation</h2>
        <p className={`text-lg ${isSuccess ? 'text-green-600' : 'text-gray-700'}`}>
          {message}
        </p>
        {isSuccess && (
          <p className="mt-6 text-gray-600">
            You will be redirected to login in 3 seconds...
          </p>
        )}
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <nav className="bg-white shadow-md px-6 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-700 mb-4 sm:mb-0">ForensicTool</h1>
            <div className="flex flex-wrap justify-center gap-6">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                >
                  Login / Register
                </Link>
              ) : (
                <>
                  <Link
                    to="/"
                    className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                  >
                    Fetch & Store
                  </Link>
                  <Link
                    to="/retrieve"
                    className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                  >
                    Retrieve
                  </Link>
                  <Link
                    to="/report"
                    className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                  >
                    Report
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-800 font-medium text-lg"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl">
            <Routes>
              <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="/activate" element={<ActivatePage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <FetchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/retrieve"
                element={
                  <ProtectedRoute>
                    <RetrievePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <ReportPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
