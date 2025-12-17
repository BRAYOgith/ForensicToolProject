import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function ReportPage() {
  const [reportData, setReportData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading report...');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // LIVE BACKEND URL
  const API_BASE = 'https://forensictoolprojectfin.onrender.com';

  // Session Management: Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch report data and stats in parallel
        const [reportResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE}/report/${userId}`, { headers }),
          axios.get(`${API_BASE}/report-stats/${userId}`, { headers }),
        ]);

        setReportData(reportResponse.data);
        setStatsData(statsResponse.data);
        setStatus('Report loaded successfully');
      } catch (err) {
        console.error('Report fetch error:', err.response?.data || err.message);

        if (err.response?.status === 401) {
          // Token invalid/expired → force logout
          localStorage.removeItem('token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('username');
          navigate('/login', { replace: true });
          return;
        }

        setError('Failed to load report data. Please try again.');
        setStatus('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const downloadReport = async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      setError('You must be logged in to download reports');
      return;
    }

    setStatus('Generating PDF report...');
    try {
      const response = await axios.get(`${API_BASE}/generate-report/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Forensic_Report_User_${userId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('PDF report downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to generate PDF. Please try again.');
      setStatus('Download failed');
    }
  };

  // Pie chart data
  const weeklyChartData = statsData
    ? {
        labels: ['Fetches This Week', 'Retrievals This Week'],
        datasets: [
          {
            data: [statsData.weekly.fetches, statsData.weekly.retrievals],
            backgroundColor: ['#1a73e8', '#34c759'],
            borderColor: ['#ffffff', '#ffffff'],
            borderWidth: 2,
          },
        ],
      }
    : null;

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
            backgroundColor: ['#4285f4', '#66bb6a', '#1a73e8', '#34c759'],
            borderColor: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
            borderWidth: 2,
          },
        ],
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-700">Loading your forensic report...</div>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md text-center">
          <p className="font-semibold">Error</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-blue-600 text-white py-6 px-8">
          <h2 className="text-3xl font-bold text-center">Forensic Investigation Report</h2>
          <p className="text-center mt-2 opacity-90">Investigator: {reportData?.username || 'Unknown'}</p>
        </div>

        <div className="p-8">
          {/* Charts Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Weekly Activity */}
            <div className="bg-gray-50 rounded-xl p-6 shadow-sm border">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Weekly Activity</h3>
              {weeklyChartData && (
                <div className="flex justify-center">
                  <div style={{ maxWidth: '320px', height: '320px' }}>
                    <Pie data={weeklyChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>
              )}
              <p className="text-center text-gray-600 mt-4">
                <strong>{statsData.weekly.fetches}</strong> fetches • <strong>{statsData.weekly.retrievals}</strong> retrievals
              </p>
            </div>

            {/* Daily Comparison */}
            <div className="bg-gray-50 rounded-xl p-6 shadow-sm border">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Yesterday vs Today</h3>
              {dailyChartData && (
                <div className="flex justify-center">
                  <div style={{ maxWidth: '320px', height: '320px' }}>
                    <Pie data={dailyChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } } }} />
                  </div>
                </div>
              )}
              <div className="text-center text-sm text-gray-600 mt-4 space-y-1">
                <p>Yesterday: {statsData.daily.yesterday.fetches} fetches, {statsData.daily.yesterday.retrievals} retrievals</p>
                <p>Today: {statsData.daily.today.fetches} fetches, {statsData.daily.today.retrievals} retrievals</p>
              </div>
            </div>
          </div>

          {/* Fetched Evidence */}
          <h3 className="text-2xl font-bold text-gray-800 mb-5">Fetched Evidence ({reportData.fetched.length})</h3>
          {reportData.fetched.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {reportData.fetched.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-6 shadow border">
                  <p className="text-sm text-gray-600"><strong>Post ID:</strong> {item.post_id}</p>
                  <p className="text-sm text-gray-800 mt-2 break-words"><strong>Content:</strong> {item.content}</p>
                  <p className="text-sm text-gray-600 mt-1"><strong>Author:</strong> @{item.author_username}</p>
                  <p className="text-sm text-gray-600"><strong>Posted:</strong> {new Date(item.created_at).toLocaleString()}</p>
                  <p className="text-sm text-gray-600"><strong>Fetched:</strong> {new Date(item.timestamp).toLocaleString()}</p>

                  {item.verified !== undefined && (
                    <p className={`mt-3 font-semibold ${item.verified ? 'text-green-600' : item.verified === null ? 'text-gray-500' : 'text-red-600'}`}>
                      {item.verified ? '✓ Verified Match' : item.verified === null ? '– Verification Skipped' : '✗ Content Mismatch'}
                    </p>
                  )}

                  {item.media_urls?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-gray-700 mb-2">Media:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {item.media_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Evidence media ${i + 1}`}
                            className="w-full h-auto rounded-lg shadow-sm border"
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
            <p className="text-gray-500 italic text-center py-8">No evidence fetched yet</p>
          )}

          {/* Stored Evidence */}
          <h3 className="text-2xl font-bold text-gray-800 mt-12 mb-5">Stored Evidence on Blockchain ({reportData.stored.length})</h3>
          {reportData.stored.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reportData.stored.map((item) => (
                <div key={item.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow border">
                  <p className="text-sm font-medium text-gray-800">Evidence ID: {item.evidence_id}</p>
                  <p className="text-xs text-gray-600 mt-1 break-all">Tx Hash: {item.tx_hash}</p>
                  <p className="text-sm text-gray-600 mt-2">Stored: {new Date(item.timestamp).toLocaleString()}</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${item.eth_tx_hash || item.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-xs hover:underline mt-2 inline-block"
                  >
                    View on Etherscan →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-8">No evidence stored on blockchain yet</p>
          )}

          {/* Summary & Download */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Report Summary</h3>
            <p className="text-xl">Total Fetched Posts: <strong>{reportData.fetched.length}</strong></p>
            <p className="text-xl mt-2">Total Stored on Blockchain: <strong>{reportData.stored.length}</strong></p>

            <button
              onClick={downloadReport}
              disabled={status.includes('Generating') || status.includes('downloaded')}
              className="mt-8 bg-white text-blue-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition text-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status.includes('Generating') ? 'Generating PDF...' : 'Download Full PDF Report'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">Status: {status}</p>
        </div>
      </div>
    </div>
  );
}

export default ReportPage;
