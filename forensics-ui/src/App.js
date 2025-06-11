import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import FetchPage from './FetchPage';
import RetrievePage from './RetrievePage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">ForensicTool</h1>
        <nav className="mb-6 bg-white shadow rounded-lg p-4">
          <Link to="/" className="mx-4 text-blue-600 hover:text-blue-800 hover:underline font-medium">
            Fetch & Store
          </Link>
          <Link to="/retrieve" className="mx-4 text-blue-600 hover:text-blue-800 hover:underline font-medium">
            Retrieve Evidence
          </Link>
        </nav>
        <div className="w-full max-w-lg">
          <Routes>
            <Route path="/" element={<FetchPage />} />
            <Route path="/retrieve" element={<RetrievePage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;