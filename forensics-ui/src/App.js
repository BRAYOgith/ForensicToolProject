import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import FetchPage from './FetchPage';
import RetrievePage from './RetrievePage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <h1 className="text-3xl font-bold mb-6">ForensicTool</h1>
        <nav className="mb-6">
          <Link to="/" className="mx-4 text-blue-500 hover:underline">Fetch & Store</Link>
          <Link to="/retrieve" className="mx-4 text-blue-500 hover:underline">Retrieve Evidence</Link>
        </nav>
        <div className="w-full max-w-md">
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