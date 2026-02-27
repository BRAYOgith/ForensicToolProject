import axios from 'axios';

// Centralized axios instance for all API calls.
// - withCredentials: sends the httpOnly auth cookie automatically
// - baseURL: avoids repeating the API origin in every component
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://forensictoolproject.onrender.com'),
    withCredentials: true,
});

export default api;
