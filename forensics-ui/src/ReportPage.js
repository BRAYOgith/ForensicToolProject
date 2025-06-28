import React, { useState, useEffect } from 'react';

function ReportPage() {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('user_id');
        const response = await fetch(`http://localhost:5000/report/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setReportData(data);
        } else {
          setError(data.error || 'Failed to fetch report');
        }
      } catch (err) {
        setError('Network error, please try again');
      }
    };
    fetchReport();
  }, []);

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/download-report/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${userId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download report');
    }
  };

  if (!reportData) return <div className="text-gray-600">Loading...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Forensic Report</h2>
      <h3 className="text-lg font-medium text-gray-700">User: {reportData.username}</h3>
      <h4 className="text-md font-medium text-gray-600 mt-4">Fetched Evidence</h4>
      <ul className="list-disc pl-5">
        {reportData.fetched.map((item) => (
          <li key={item.id} className="text-gray-600">
            Post ID: {item.post_id}, Content: {item.content}, Fetched: {item.timestamp}
          </li>
        ))}
      </ul>
      <h4 className="text-md font-medium text-gray-600 mt-4">Stored Evidence</h4>
      <ul className="list-disc pl-5">
        {reportData.stored.map((item) => (
          <li key={item.id} className="text-gray-600">
            Evidence ID: {item.evidence_id}, Tx Hash: {item.tx_hash}, Stored: {item.timestamp}
          </li>
        ))}
      </ul>
      <h4 className="text-md font-medium text-gray-600 mt-4">Summary</h4>
      <p className="text-gray-600">Total Fetched: {reportData.fetched.length}</p>
      <p className="text-gray-600">Total Stored: {reportData.stored.length}</p>
      <button
        onClick={downloadReport}
        className="mt-4 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        Download PDF Report
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default ReportPage;