import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function ReportPage() {
  const [reportData, setReportData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('user_id');

        // Fetch report data
        const reportResponse = await axios.get(`http://localhost:5000/report/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReportData(reportResponse.data);

        // Fetch stats for charts
        const statsResponse = await axios.get(`http://localhost:5000/report-stats/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatsData(statsResponse.data);

        setStatus('Success: Report and stats loaded');
      } catch (err) {
        console.error('Error:', err.response?.data || err.message);
        setError('Network error, please try again');
        setStatus('Error: Failed to load data');
      }
    };
    fetchData();
  }, []);

  const downloadReport = async () => {
    setStatus('Downloading...');
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      const response = await axios.get(`http://localhost:5000/generate-report/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `forensic_report_${userId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setStatus('Success: Report downloaded');
    } catch (err) {
      console.error('Download error:', err.response?.data || err.message);
      setError('Failed to download report');
      setStatus('Error: Failed to download report');
    }
  };

  // Pie chart data for weekly fetches and retrievals
  const weeklyChartData = statsData
    ? {
        labels: ['Fetches', 'Retrievals'],
        datasets: [
          {
            data: [statsData.weekly.fetches, statsData.weekly.retrievals],
            backgroundColor: ['#1a73e8', '#34c759'],
            borderColor: ['#fff', '#fff'],
            borderWidth: 2,
          },
        ],
      }
    : null;

  // Pie chart data for yesterday vs today
  const dailyChartData = statsData
    ? {
        labels: ['Yesterday Fetches', 'Yesterday Retrievals', 'Today Fetches', 'Today Retrievals'],
        datasets: [
          {
            data: [
              statsData.daily.yesterday.fetches,
              statsData.daily.yesterday.retrievals,
              statsData.daily.today.fetches,
              statsData.daily.today.retrievals,
            ],
            backgroundColor: ['#1a73e8', '#34c759', '#4285f4', '#66bb6a'],
            borderColor: ['#fff', '#fff', '#fff', '#fff'],
            borderWidth: 2,
          },
        ],
      }
    : null;

  if (!reportData || !statsData) return <div className="text-gray-600 text-center">Loading...</div>;

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Forensic Report</h2>
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Investigator: {reportData.username}</h3>

        {/* Weekly Chart */}
        <h4 className="text-lg font-medium text-gray-600 mt-6 mb-3">Weekly Activity</h4>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
          {weeklyChartData && (
            <div className="flex justify-center">
              <div style={{ maxWidth: '300px' }}>
                <Pie
                  data={weeklyChartData}
                  options={{
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: { enabled: true },
                    },
                    maintainAspectRatio: false,
                  }}
                  height={200}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600 mt-2 text-center">
            Fetches: {statsData.weekly.fetches}, Retrievals: {statsData.weekly.retrievals}
          </p>
        </div>

        {/* Daily Comparison Chart */}
        <h4 className="text-lg font-medium text-gray-600 mt-6 mb-3">Yesterday vs Today</h4>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
          {dailyChartData && (
            <div className="flex justify-center">
              <div style={{ maxWidth: '300px' }}>
                <Pie
                  data={dailyChartData}
                  options={{
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: { enabled: true },
                    },
                    maintainAspectRatio: false,
                  }}
                  height={200}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600 mt-2 text-center">
            Yesterday: {statsData.daily.yesterday.fetches} fetches, {statsData.daily.yesterday.retrievals} retrievals<br />
            Today: {statsData.daily.today.fetches} fetches, {statsData.daily.today.retrievals} retrievals
          </p>
        </div>

        <h4 className="text-lg font-medium text-gray-600 mt-6 mb-3">Fetched Evidence</h4>
        {reportData.fetched.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {reportData.fetched.map((item) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600"><strong>Post ID:</strong> {item.post_id}</p>
                <p className="text-sm text-gray-600"><strong>Content:</strong> {item.content}</p>
                <p className="text-sm text-gray-600"><strong>Author:</strong> @{item.author_username}</p>
                <p className="text-sm text-gray-600"><strong>Posted At:</strong> {new Date(item.created_at).toLocaleString()}</p>
                <p className="text-sm text-gray-600"><strong>Fetched At:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                {item.verified !== undefined && (
                  <p className={`text-sm ${item.verified ? 'text-green-500' : item.verified === null ? 'text-gray-500' : 'text-red-500'}`}>
                    {item.verified
                      ? 'Verified: Content matches X post'
                      : item.verified === null
                      ? 'Verification Skipped'
                      : 'Not Verified: Content does not match post'}
                  </p>
                )}
                {item.media_urls?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-600">Media:</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {item.media_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Media ${i}`}
                          className="max-w-full h-auto rounded-md"
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No fetched evidence</p>
        )}

        <h4 className="text-lg font-medium text-gray-600 mt-6 mb-3">Stored Evidence</h4>
        {reportData.stored.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {reportData.stored.map((item) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600"><strong>Evidence ID:</strong> {item.evidence_id}</p>
                <p className="text-sm text-gray-600"><strong>Transaction Hash:</strong> {item.tx_hash}</p>
                <p className="text-sm text-gray-600"><strong>Stored At:</strong> {new Date(item.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No stored evidence</p>
        )}

        <h4 className="text-lg font-medium text-gray-600 mt-6 mb-3">Summary</h4>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Fetched: {reportData.fetched.length}</p>
          <p className="text-sm text-gray-600">Total Stored: {reportData.stored.length}</p>
        </div>

        <button
          onClick={downloadReport}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
        >
          Download PDF Report
        </button>
        <p className="mt-4 text-sm text-gray-600">Status: {status}</p>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default ReportPage;