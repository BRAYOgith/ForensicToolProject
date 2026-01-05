import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register all needed components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
);

function ReportPage() {
  const [reportData, setReportData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading report...');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5000'; // Change to production Render URL later

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [reportResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE}/report/${userId}`, { headers }),
          axios.get(`${API_BASE}/report-stats/${userId}`, { headers }),
        ]);

        setReportData(reportResponse.data);
        setStatsData(statsResponse.data);
        setStatus('Report loaded successfully');
      } catch (err) {
        console.error('Report fetch error:', err);

        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user_id');
          navigate('/login');
          return;
        }

        setError('Failed to load report. Please try again.');
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
      setError('You must be logged in');
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
      a.download = `Forensic_Report_${reportData?.username || 'User'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('PDF report downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to generate PDF');
      setStatus('Download failed');
    }
  };

  // Calculate defamation statistics
  const totalFetched = reportData?.fetched.length || 0;
  const defamatoryCount = reportData?.fetched.filter(item => {
    // In future, this can come from stored defamation result
    // For now, simulate based on your existing logic
    return false; // Replace with actual AI result when available
  }).length || 0;
  const defamationRate = totalFetched > 0 ? (defamatoryCount / totalFetched) * 100 : 0;

  // Weekly Pie Chart
  const weeklyChartData = statsData
    ? {
        labels: ['Fetches This Week', 'Retrievals This Week'],
        datasets: [
          {
            data: [statsData.weekly.fetches, statsData.weekly.retrievals],
            backgroundColor: ['#1e40af', '#16a34a'],
            borderColor: ['#ffffff', '#ffffff'],
            borderWidth: 3,
          },
        ],
      }
    : null;

  // Daily Bar Chart
  const dailyBarData = statsData
    ? {
        labels: ['Yesterday', 'Today'],
        datasets: [
          {
            label: 'Fetches',
            data: [statsData.daily.yesterday.fetches, statsData.daily.today.fetches],
            backgroundColor: '#3b82f6',
          },
          {
            label: 'Retrievals',
            data: [statsData.daily.yesterday.retrievals, statsData.daily.today.retrievals],
            backgroundColor: '#10b981',
          },
        ],
      }
    : null;

  // Defamation Rate Pie
  const defamationPieData = {
    labels: ['Non-Defamatory', 'Defamatory'],
    datasets: [
      {
        data: [totalFetched - defamatoryCount, defamatoryCount],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 3,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl text-gray-700">Loading your forensic report...</div>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-300 text-red-700 px-8 py-6 rounded-xl max-w-lg text-center">
          <p className="font-bold text-xl">Error Loading Report</p>
          <p className="mt-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-2xl p-8 mb-10 text-center">
          <h1 className="text-4xl font-bold mb-2">Forensic Investigation Report</h1>
          <p className="text-xl opacity-90">Investigator: {reportData?.username || 'Unknown'}</p>
          <p className="mt-4 text-lg">
            Total Evidence Fetched: <strong>{totalFetched}</strong> | 
            Stored on Blockchain: <strong>{reportData?.stored.length || 0}</strong>
          </p>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Total Fetched Posts</h3>
            <p className="text-4xl font-bold text-blue-600 mt-4">{totalFetched}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Evidence Stored</h3>
            <p className="text-4xl font-bold text-green-600 mt-4">{reportData?.stored.length || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-600">Defamation Rate</h3>
            <p className="text-4xl font-bold text-red-600 mt-4">{defamationRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* Weekly Activity Pie */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Weekly Activity</h3>
            {weeklyChartData && (
              <div className="flex justify-center">
                <div style={{ maxWidth: '380px', height: '380px' }}>
                  <Pie
                    data={weeklyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 14 } } },
                        tooltip: { enabled: true },
                      },
                    }}
                  />
                </div>
              </div>
            )}
            <div className="text-center mt-6 space-y-2">
              <p className="text-lg"><strong>Fetches:</strong> {statsData?.weekly.fetches || 0}</p>
              <p className="text-lg"><strong>Retrievals:</strong> {statsData?.weekly.retrievals || 0}</p>
            </div>
          </div>

          {/* Daily Comparison Bar */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Yesterday vs Today</h3>
            {dailyBarData && (
              <div className="flex justify-center">
                <div style={{ maxWidth: '420px', height: '380px' }}>
                  <Bar
                    data={dailyBarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: false },
                      },
                      scales: {
                        y: { beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Defamation Rate Pie */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Defamation Analysis</h3>
            <div className="flex justify-center">
              <div style={{ maxWidth: '380px', height: '380px' }}>
                <Pie
                  data={defamationPieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { font: { size: 14 } } },
                      tooltip: { enabled: true },
                    },
                  }}
                />
              </div>
            </div>
            <p className="text-center mt-6 text-lg font-medium">
              {defamatoryCount} out of {totalFetched} posts flagged
            </p>
          </div>

          {/* Activity Trend Placeholder (Future: real data) */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">7-Day Activity Trend</h3>
            <div className="text-center text-gray-500 py-20">
              <p className="text-lg">Coming soon: Daily trend line chart</p>
              <p className="text-sm mt-4">Will show fetches/retrievals over time</p>
            </div>
          </div>
        </div>

        {/* Fetched Evidence List */}
        <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Fetched Evidence ({totalFetched})
        </h3>
        {totalFetched > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {reportData.fetched.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg border p-6 hover:shadow-2xl transition">
                <p className="text-sm text-gray-600"><strong>Post ID:</strong> {item.post_id}</p>
                <p className="mt-3 text-gray-800 break-words"><strong>Content:</strong> {item.content}</p>
                <p className="mt-2 text-sm text-gray-600"><strong>Author:</strong> @{item.author_username}</p>
                <p className="text-sm text-gray-600"><strong>Posted:</strong> {new Date(item.created_at).toLocaleString()}</p>
                <p className="text-sm text-gray-600"><strong>Fetched:</strong> {new Date(item.timestamp).toLocaleString()}</p>

                {item.verified !== undefined && (
                  <p className={`mt-4 font-bold text-lg ${item.verified ? 'text-green-600' : item.verified === null ? 'text-gray-500' : 'text-red-600'}`}>
                    {item.verified ? '✓ Verified Match' : item.verified === null ? '– Skipped' : '✗ Mismatch Detected'}
                  </p>
                )}

                {item.media_urls?.length > 0 && (
                  <div className="mt-6">
                    <p className="font-bold text-gray-700 mb-3">Media ({item.media_urls.length}):</p>
                    <div className="grid grid-cols-2 gap-4">
                      {item.media_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="w-full h-auto rounded-lg shadow border hover:scale-105 transition"
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
          <p className="text-center text-gray-500 text-xl py-12">No evidence fetched yet</p>
        )}

        {/* Stored Evidence */}
        <h3 className="text-3xl font-bold text-gray-800 mt-16 mb-8 text-center">
          Stored on Blockchain ({reportData?.stored.length || 0})
        </h3>
        {reportData?.stored.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {reportData.stored.map((item) => (
              <div key={item.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border p-6">
                <p className="font-bold">Evidence ID: {item.evidence_id}</p>
                <p className="text-sm text-gray-600 mt-2 break-all">Tx Hash: {item.tx_hash}</p>
                <p className="text-sm text-gray-600 mt-2">Stored: {new Date(item.timestamp).toLocaleString()}</p>
                {item.eth_tx_hash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${item.eth_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-indigo-600 hover:underline font-medium"
                  >
                    View on Etherscan →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-xl py-12">No evidence stored on blockchain yet</p>
        )}

        {/* Download Button */}
        <div className="text-center mt-16">
          <button
            onClick={downloadReport}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-xl py-5 px-12 rounded-2xl hover:from-blue-700 hover:to-indigo-800 transition shadow-2xl disabled:opacity-70"
          >
            {loading ? 'Generating PDF...' : 'Download Complete PDF Report'}
          </button>
        </div>

        <p className="text-center mt-8 text-lg text-gray-600">Status: {status}</p>
      </div>
    </div>
  );
}

export default ReportPage;
