import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({ setIsAuthenticated }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  const navigate = useNavigate();

  const API_BASE = 'https://forensictoolproject.onrender.com';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.user_id);
        if (setIsAuthenticated) setIsAuthenticated(true);
        navigate('/', { replace: true });
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (isRegistering) {
      const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!complexityRegex.test(password)) {
        setError('Password must be at least 8 characters, include uppercase, lowercase, number, and symbol.');
        setLoading(false);
        return;
      }
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Registration successful! Please check your email (including spam) to activate your account.');
        setUsername('');
        setPassword('');
        setEmail('');
        setIsRegistering(false);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendActivation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!resendEmail.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/resend-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('New activation link sent! Check your inbox and spam folder.');
        setResendEmail('');
      } else {
        setError(data.error || 'Failed to resend activation link');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setForgotPasswordEmail('');
      } else {
        setError(data.error || 'Failed to send reset link');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordSecure = (p) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(p);
  };

  const isFormValid = () => {
    if (isRegistering) {
      return username.trim().length >= 3 &&
        isPasswordSecure(password) &&
        password === confirmPassword &&
        email.includes('@');
    }
    return username.trim() !== '' && password !== '';
  };

  const showActivationHelp = error.includes('not activated') || error.includes('activation');

  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] opacity-10 glow-orb"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500 rounded-full blur-[120px] opacity-10 glow-orb" style={{ animationDelay: '-5s' }}></div>

      <div className="glass-card rounded-3xl p-10 max-w-md w-full relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="ChainForensix Logo" className="w-16 h-16 mb-4 object-contain" />
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">
            {isRegistering ? 'Join the Force' : 'Welcome Back'}
          </h2>
          <p className="text-[var(--accent-cyan)] font-mono text-xs tracking-widest uppercase italic font-bold">ChainForensix</p>
        </div>

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl mb-6 text-center text-sm">
            {success}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Reset Password</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Enter your registered email to receive a secure reset link.</p>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600"
                required
                placeholder="you@example.com"
              />
            </div>
            {error && <div className="text-red-400 text-xs text-center">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent-cyan)] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all"
            >
              {loading ? 'Sending...' : 'SEND RESET LINK'}
            </button>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="w-full text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] text-sm font-bold uppercase tracking-widest mt-4"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600"
                required
                disabled={loading}
                placeholder="Enter username"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600"
                  required
                  disabled={loading}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] text-xs font-bold uppercase"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isRegistering && password && (
                <div className="mt-2 space-y-1">
                  <p className={`text-[10px] font-bold ${password.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>✓ MIN 8 CHARACTERS</p>
                  <p className={`text-[10px] font-bold ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>✓ UPPER & LOWER CASE</p>
                  <p className={`text-[10px] font-bold ${/\d/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>✓ INCLUDES NUMBER</p>
                  <p className={`text-[10px] font-bold ${/[@$!%*?&]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>✓ INCLUDES SYMBOL</p>
                </div>
              )}
            </div>

            {isRegistering && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-[var(--bg-color)] border ${confirmPassword ? (password === confirmPassword ? 'border-green-500' : 'border-red-500') : 'border-[var(--border-color)]'} rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600`}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                  {confirmPassword && (
                    <p className={`text-[10px] font-bold mt-1 ${password === confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                      {password === confirmPassword ? '✓ PASSWORDS MATCH' : '✗ PASSWORDS MISMATCH'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {!isRegistering && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-[var(--accent-cyan)] hover:underline font-bold uppercase tracking-widest"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full bg-[var(--accent-cyan)] text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/10 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? 'Processing...' : isRegistering ? 'INITIALIZE ACCOUNT' : 'SECURE LOGIN'}
            </button>
          </form>
        )}

        {/* Activation Help */}
        {showActivationHelp && (
          <div className="mt-8 bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-yellow-500 mb-3">
              Account Not Activated?
            </h3>
            <ul className="list-disc pl-6 text-gray-300 text-sm mb-4 space-y-2">
              <li>Check your <strong>inbox and spam folder</strong> for the activation email.</li>
              <li>Wait 2-5 minutes for the link to arrive.</li>
              <li>If not found, request a new link below.</li>
            </ul>

            <form onSubmit={handleResendActivation} className="space-y-4">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Your registered email"
                className="w-full px-4 py-3 bg-[#0A192F] border border-yellow-500/30 rounded-xl focus:ring-2 focus:ring-yellow-500 text-white placeholder-gray-600"
                required
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-500/30 font-bold py-3 rounded-xl transition-all"
              >
                {loading ? 'Sending...' : 'Resend Activation Link'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8 text-center border-t border-gray-800 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setSuccess('');
              setResendEmail('');
            }}
            className="text-gray-400 hover:text-cyan-400 font-medium transition-colors"
            disabled={loading}
          >
            {isRegistering
              ? 'Already a member? Secure Login'
              : "New Investigator? Join the Force"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
