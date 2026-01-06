import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const API_BASE = 'http://localhost:5000';

    useEffect(() => {
        const t = searchParams.get('token');
        if (!t) {
            setError('Invalid or missing reset token.');
        } else {
            setToken(t);
        }
    }, [searchParams]);

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!complexityRegex.test(password)) {
            setError('Password must meet complexity requirements.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Password reset successful! Redirecting to login...');
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.error || 'Reset failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isPasswordSecure = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
    const canSubmit = isPasswordSecure && password === confirmPassword && !loading && !success && token;

    return (
        <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4 font-sans relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] opacity-10 glow-orb"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500 rounded-full blur-[120px] opacity-10 glow-orb" style={{ animationDelay: '-5s' }}></div>

            <div className="glass-card rounded-3xl p-10 max-w-md w-full relative z-10 text-center">
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Secure Reset</h2>
                <p className="text-[var(--accent-cyan)] font-mono text-xs tracking-widest uppercase italic font-bold mb-8">ChainForensix</p>

                {success && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl mb-6 text-sm">
                        {success}
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-6 text-left">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600"
                                required
                                disabled={loading || !!success}
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
                        {password && (
                            <div className="mt-2 space-y-1">
                                <p className={`text-[10px] font-bold ${password.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>✓ MIN 8 CHARACTERS</p>
                                <p className={`text-[10px] font-bold ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>✓ UPPER & LOWER CASE</p>
                                <p className={`text-[10px] font-bold ${/\d/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>✓ INCLUDES NUMBER</p>
                                <p className={`text-[10px] font-bold ${/[@$!%*?&]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>✓ INCLUDES SYMBOL</p>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Confirm Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-4 py-3 bg-[var(--bg-color)] border ${confirmPassword ? (password === confirmPassword ? 'border-green-500' : 'border-red-500') : 'border-[var(--border-color)]'} rounded-xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600`}
                            required
                            disabled={loading || !!success}
                            placeholder="••••••••"
                        />
                        {confirmPassword && (
                            <p className={`text-[10px] font-bold mt-1 ${password === confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                                {password === confirmPassword ? '✓ PASSWORDS MATCH' : '✗ PASSWORDS MISMATCH'}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-center text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-[var(--accent-cyan)] text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/10 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                    >
                        {loading ? 'RESETTING...' : 'UPDATE PASSWORD'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
