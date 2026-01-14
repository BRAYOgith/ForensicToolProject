import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import FetchPage from './FetchPage';
import RetrievePage from './RetrievePage';
import LoginPage from './LoginPage';
import ReportPage from './ReportPage';
import LandingPage from './LandingPage';
import ResetPasswordPage from './ResetPasswordPage';
import MethodologyPage from './MethodologyPage';
import DocumentationPage from './DocumentationPage';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';
import Footer from './Footer';
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
        const response = await fetch(`https://forensic-tool-project.vercel.app/activate?token={token}`);

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

function MainLayout() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Theme State
  // We don't store "theme" in local storage anymore for mode; mode is determined by route.
  // We only store "accessibility" (pwd).
  const [isPwdMode, setIsPwdMode] = useState(localStorage.getItem('pwd') === 'true');

  useEffect(() => {
    // Determine Theme Mode based on Route
    const path = location.pathname;
    const isTechRoute = ['/login', '/analyze', '/retrieve', '/report', '/activate', '/reset-password'].some(r => path.startsWith(r));
    const mode = isTechRoute ? 'tech' : 'consultancy';

    document.body.setAttribute('data-theme-mode', mode);
  }, [location]);

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

  const togglePwd = () => setIsPwdMode(prev => !prev);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      <nav className="bg-[var(--bg-color)]/80 backdrop-blur-md border-b border-[var(--border-color)] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <Link to="/" className="flex items-center gap-3 text-2xl font-bold text-[var(--text-primary)] mb-4 sm:mb-0 group">
            <img src="/logo.png" alt="ChainForensix Logo" className="w-10 h-10 object-contain" />
            <span className="tracking-tight font-heading">ChainForensix</span>
          </Link>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex items-center gap-2 border-r border-[var(--border-color)] pr-6 mr-2">
              <button
                onClick={togglePwd}
                className={`p-2 rounded-lg bg-[var(--bg-secondary)] transition-all text-xs font-bold uppercase tracking-widest ${isPwdMode ? 'text-orange-500 border border-orange-500/30' : 'text-[var(--text-primary)] hover:text-accent'}`}
                title="Toggle Accessibility Mode"
              >
                PWD: {isPwdMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {!isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/methodology"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors"
                >
                  Methodology
                </Link>
                <Link
                  to="/docs"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors"
                >
                  Docs
                </Link>
                <Link
                  to="/login"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors border border-[var(--border-color)] hover:border-[var(--accent-primary)] px-5 py-2 rounded-md hover:bg-[var(--bg-secondary)]"
                >
                  Client Portal
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/analyze"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors"
                >
                  Analysis
                </Link>
                <Link
                  to="/retrieve"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors"
                >
                  Evidence
                </Link>
                <Link
                  to="/report"
                  className="text-[var(--text-secondary)] hover:text-accent font-medium text-base transition-colors"
                >
                  Reports
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-600 font-medium text-base transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/activate" element={<ActivatePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <div className="flex items-center justify-center p-6 w-full h-full flex-1">
                  <div className="w-full max-w-4xl">
                    <FetchPage />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/retrieve"
            element={
              <ProtectedRoute>
                <div className="flex items-center justify-center p-6 w-full h-full flex-1">
                  <div className="w-full max-w-4xl">
                    <RetrievePage />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <div className="flex items-center justify-center p-6 w-full h-full flex-1">
                  <div className="w-full max-w-4xl">
                    <ReportPage />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;
