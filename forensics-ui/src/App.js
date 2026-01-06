import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import FetchPage from './FetchPage';
import RetrievePage from './RetrievePage';
import LoginPage from './LoginPage';
import ReportPage from './ReportPage';
import LandingPage from './LandingPage';
import ResetPasswordPage from './ResetPasswordPage';
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
        const response = await fetch(`https://forensictoolproject.onrender.com/activate?token=${token}`);

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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isPwdMode, setIsPwdMode] = useState(localStorage.getItem('pwd') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accessibility', isPwdMode ? 'pwd' : 'none');
    localStorage.setItem('pwd', isPwdMode);
  }, [isPwdMode]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const togglePwd = () => setIsPwdMode(prev => !prev);

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
        <nav className="bg-[var(--bg-color)]/80 backdrop-blur-md border-b border-[var(--border-color)] px-6 py-4 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center">
            <Link to="/" className="flex items-center gap-3 text-3xl font-bold text-[var(--text-primary)] mb-4 sm:mb-0 group">
              <img src="/logo.png" alt="ChainForensix Logo" className="w-10 h-10 object-contain" />
              <span className="tracking-tight">ChainForensix</span>
            </Link>
            <div className="flex flex-wrap justify-center items-center gap-6">
              <div className="flex items-center gap-2 border-r border-[var(--border-color)] pr-6 mr-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:text-[var(--accent-cyan)] transition-all text-xs font-bold uppercase tracking-widest"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={togglePwd}
                  className={`p-2 rounded-lg bg-[var(--bg-secondary)] transition-all text-xs font-bold uppercase tracking-widest ${isPwdMode ? 'text-orange-500 border border-orange-500/30' : 'text-[var(--text-primary)] hover:text-[var(--accent-cyan)]'}`}
                  title="Toggle Accessibility Mode"
                >
                  PWD: {isPwdMode ? 'ON' : 'OFF'}
                </button>
              </div>

              {!isAuthenticated ? (
                <>
                  <Link
                    to="/"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] font-medium text-lg transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    to="/login"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] font-medium text-lg transition-colors border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 px-4 py-1 rounded-full"
                  >
                    Join Us
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/analyze"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] font-medium text-lg transition-colors"
                  >
                    Forensic Analysis
                  </Link>
                  <Link
                    to="/retrieve"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] font-medium text-lg transition-colors"
                  >
                    Evidence Log
                  </Link>
                  <Link
                    to="/report"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] font-medium text-lg transition-colors"
                  >
                    Court Reports
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-500 font-medium text-lg transition-colors"
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
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="/activate" element={<ActivatePage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/analyze"
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
