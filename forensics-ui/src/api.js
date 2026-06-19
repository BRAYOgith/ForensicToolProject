import axios from 'axios';

// Centralized axios instance for all API calls.
// - withCredentials: sends the httpOnly auth cookie automatically
// - baseURL: avoids repeating the API origin in every component
const API_URL = process.env.REACT_APP_API_URL || 
    (window.location.hostname.includes('vercel.app') ? 'https://forensictoolproject.onrender.com' : 
     window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://forensictoolproject.onrender.com');

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
