import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const navigate = useNavigate();

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://chainforensix-api.onrender.com';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
        email.includes('@') &&
        acceptedTerms &&
        acceptedPrivacy;
    }
    return username.trim() !== '' && password !== '';
  };

  const showActivationHelp = error.includes('not activated') || error.includes('activation');

  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex flex-col md:flex-row font-sans overflow-hidden transition-colors duration-300">

      {/* Visual Pane (Left side on Desktop) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-[#0A192F] items-center justify-center p-12">
        {/* Background Graphic */}
        <div
          className="absolute inset-0 z-0 opacity-40 bg-cover bg-center mix-blend-luminosity"
          style={{ backgroundImage: 'url("/login-bg.png")' }}
        ></div>
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#0A192F] via-[#0A192F]/80 to-transparent"></div>

        {/* Content */}
        <div className="relative z-20 max-w-lg text-white reveal-fade-in">
          <div className="mb-8 inline-block px-4 py-2 bg-accent/20 border border-accent/30 rounded-full">
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Enterprise Grade Intelligence</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight font-heading">
            Securing the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-cyan-400">Digital Frontline.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed font-light">
            The global standard for X post forensics and blockchain evidence anchoring. Trusted by legal professionals and elite OSINT investigators.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
            <div>
              <p className="text-3xl font-bold text-white mb-1">99.9%</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Metadata Recall</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">10k+</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Anchored Evidence</p>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="absolute bottom-10 left-12 z-20 flex items-center gap-4 text-white/40">
          <p className="text-[10px] tracking-[.3em] uppercase font-bold">Powered by Ethereum Blockchain & AI Analyzers</p>
        </div>
      </div>

      {/* Form Pane (Right side on Desktop) */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-8 md:p-16 bg-[var(--bg-color)] relative z-30">
        <div className="w-full max-w-md">
          {/* Form Header */}
          <div className="mb-12 flex flex-col items-center md:items-start pt-12">

            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {isForgotPassword ? 'Reset Password' : isRegistering ? 'Register' : 'Login'}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">
              {isForgotPassword
                ? 'Enter your email to receive a secure reset link.'
                : isRegistering
                  ? 'Create an account to start your forensic investigation.'
                  : 'Welcome back. Please login to your account.'}
            </p>
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-xl mb-8 text-center text-sm font-medium">
              {success}
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all"
                  required
                  placeholder="name@example.com"
                />
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs py-3 rounded-lg text-center uppercase tracking-widest">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white font-black py-4 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-cyan-500/20 uppercase tracking-[0.2em] text-xs"
              >
                {loading ? 'Transmitting...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-gray-500 hover:text-accent text-xs font-bold uppercase tracking-widest mt-4 transition-colors"
              >
                ← Return to Login
              </button>
            </form>
          ) : (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all font-sans"
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
                    className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all font-sans"
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-accent text-xs font-black uppercase"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {isRegistering && password && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className={`p-2 rounded border ${password.length >= 8 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-100 border-gray-200 text-gray-400'} text-[9px] font-bold text-center`}>LENGTH 8+</div>
                    <div className={`p-2 rounded border ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-100 border-gray-200 text-gray-400'} text-[9px] font-bold text-center`}>CASE MIX</div>
                    <div className={`p-2 rounded border ${/\d/.test(password) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-100 border-gray-200 text-gray-400'} text-[9px] font-bold text-center`}>NUMERIC</div>
                    <div className={`p-2 rounded border ${/[@$!%*?&]/.test(password) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-100 border-gray-200 text-gray-400'} text-[9px] font-bold text-center`}>SYMBOL</div>
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
                      className={`w-full px-4 py-4 bg-[var(--bg-secondary)] border ${confirmPassword ? (password === confirmPassword ? 'border-emerald-500/50' : 'border-red-500/50') : 'border-[var(--border-color)]'} rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all font-sans`}
                      required
                      disabled={loading}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all font-sans"
                      placeholder="name@example.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center h-5">
                        <input
                          id="terms"
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent accent-accent cursor-pointer"
                          required
                        />
                      </div>
                      <label htmlFor="terms" className="text-xs text-gray-500 font-medium leading-normal cursor-pointer hover:text-accent transition-colors">
                        I agree to the <Link to="/terms" className="text-accent hover:underline font-bold">Terms and Conditions</Link>
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center h-5">
                        <input
                          id="privacy"
                          type="checkbox"
                          checked={acceptedPrivacy}
                          onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent accent-accent cursor-pointer"
                          required
                        />
                      </div>
                      <label htmlFor="privacy" className="text-xs text-gray-500 font-medium leading-normal cursor-pointer hover:text-accent transition-colors">
                        I acknowledge the <Link to="/privacy" className="text-accent hover:underline font-bold">Privacy Policy</Link>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {!isRegistering && (
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" id="remember" />
                    <label htmlFor="remember" className="text-xs text-gray-500 font-medium cursor-pointer">Stay logged in</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-accent hover:underline font-black uppercase tracking-widest"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl text-center text-xs font-bold uppercase tracking-widest">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="w-full bg-accent text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.25em] text-xs mt-4"
              >
                {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
              </button>

              {/* Social Login Section */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-color)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--bg-color)] px-4 text-gray-500 font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => alert('Google authentication coming soon')}
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    />
                  </svg>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('GitHub authentication coming soon')}
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="text-xs font-bold text-[var(--text-primary)]">GitHub</span>
                </button>
              </div>
            </form>
          )}

          {showActivationHelp && (
            <div className="mt-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-amber-500 mb-2 uppercase tracking-tight">Account Not Activated?</h3>
              <p className="text-xs text-gray-500 mb-4 font-medium">Please check your email to activate your account. If missing, request a new link below.</p>

              <form onSubmit={handleResendActivation} className="space-y-4">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Registered email"
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-amber-500/20 rounded-xl focus:ring-2 focus:ring-amber-500 text-[var(--text-primary)] placeholder-gray-600 text-xs"
                  required
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-black py-3 rounded-xl transition-all uppercase tracking-widest text-[9px]"
                >
                  {loading ? 'Requesting...' : 'Resend Activation Link'}
                </button>
              </form>
            </div>
          )}

          <div className="mt-12 text-center border-t border-gray-100 pt-8">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setSuccess('');
                setResendEmail('');
              }}
              className="text-gray-400 hover:text-accent font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
              disabled={loading}
            >
              <span>{isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}</span>
              <span className="text-accent">→</span>
            </button>
          </div>
        </div>
      </div>
    </div >
  );
}

export default LoginPage;
