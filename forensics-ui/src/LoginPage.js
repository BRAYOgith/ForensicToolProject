import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log('Login response:', data); // Debug
      if (response.ok && data.token && data.user_id) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.user_id);
        navigate('/', { replace: true });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err); // Debug
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      setError('Network error, please try again');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log('Register response:', data); // Debug
      if (response.ok && data.token && data.user_id) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.user_id);
        navigate('/', { replace: true });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Register error:', err); // Debug
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      setError('Network error, please try again');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">{isRegistering ? 'Register' : 'Login'}</h2>
      <form onSubmit={isRegistering ? handleRegister : handleLogin}>
        <div className="mb-4">
          <label className="block text-gray-700">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>
      <button
        onClick={() => setIsRegistering(!isRegistering)}
        className="mt-4 text-blue-600 hover:underline"
      >
        {isRegistering ? 'Switch to Login' : 'Switch to Register'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default LoginPage;