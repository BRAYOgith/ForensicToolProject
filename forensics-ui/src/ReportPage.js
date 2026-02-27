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
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://forensictoolproject.onrender.com';

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


  const totalFetched = reportData?.fetched.length || 0;
  const defamatoryCount = reportData?.fetched.filter(item => {
    return false;
  }).length || 0;
  const defamationRate = totalFetched > 0 ? (defamatoryCount / totalFetched) * 100 : 0;

  // Weekly Pie Chart
  const weeklyChartData = statsData
    ? {
      labels: ['Fetches', 'Retrievals'],
      datasets: [
        {
          data: [statsData.weekly.fetches, statsData.weekly.retrievals],
          backgroundColor: ['#06b6d4', '#3b82f6'],
          borderColor: '#0A192F',
          borderWidth: 2,
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
          backgroundColor: '#06b6d4',
        },
        {
          label: 'Retrievals',
          data: [statsData.daily.yesterday.retrievals, statsData.daily.today.retrievals],
          backgroundColor: '#3b82f6',
        },
      ],
    }
    : null;

  // Defamation Rate Pie
  const defamationPieData = {
    labels: ['Safe', 'Red-Flag'],
    datasets: [
      {
        data: [totalFetched - defamatoryCount, defamatoryCount],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: '#0A192F',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', font: { size: 12, family: 'Inter' } }
      },
      tooltip: {
        backgroundColor: '#112240',
        titleColor: '#06b6d4',
        bodyColor: '#fff',
        borderColor: '#1e293b',
        borderWidth: 1,
      }
    },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-xl text-cyan-400 font-mono animate-pulse uppercase tracking-widest">Compiling Forensic Dossier...</div>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4 transition-colors duration-300">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-10 rounded-3xl max-w-lg text-center shadow-2xl glass-card">
          <p className="font-bold text-xl mb-4 uppercase tracking-widest">Access Protocol Restricted</p>
          <p className="opacity-80 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all"
          >
            RETRY ACCESS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] py-8 px-4 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600 rounded-full blur-[200px] opacity-10 glow-orb"></div>
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-cyan-500 rounded-full blur-[200px] opacity-10 glow-orb" style={{ animationDelay: '-5s' }}></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Hero */}
        <div className="glass-card rounded-3xl p-10 mb-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 flex flex-col items-end">
            <span className="text-[var(--accent-cyan)] text-[10px] font-mono tracking-widest uppercase">Verified System Status</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-1"></div>
          </div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-4 tracking-tighter uppercase italic">
            Vault Summary
          </h1>
          <div className="flex flex-wrap gap-4 text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest">
            <span className="bg-[var(--bg-color)] px-4 py-2 rounded-full border border-[var(--border-color)]">Investigator: <span className="text-[var(--text-primary)]">{reportData?.username || 'Unknown'}</span></span>
            <span className="bg-[var(--bg-color)] px-4 py-2 rounded-full border border-[var(--border-color)]">Last Pulse: <span className="text-[var(--text-primary)]">{new Date().toLocaleDateString()}</span></span>
          </div>
        </div>

        {/* Major Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-8 rounded-3xl hover:border-[var(--accent-cyan)]/30 transition-all group">
            <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 group-hover:text-[var(--accent-cyan)] transition-colors">Total Scanned</h3>
            <p className="text-4xl font-black text-[var(--text-primary)]">{totalFetched}</p>
          </div>
          <div className="bg-[#112240]/40 border border-gray-800 p-8 rounded-3xl shadow-xl hover:border-green-400/30 transition-all group">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 group-hover:text-green-400 transition-colors">On-Chain Secured</h3>
            <p className="text-5xl font-black text-white">{reportData?.stored.length || 0}</p>
          </div>
          <div className="bg-[#112240]/40 border border-gray-800 p-8 rounded-3xl shadow-xl hover:border-red-400/30 transition-all group">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 group-hover:text-red-400 transition-colors">Critical Risk Rate</h3>
            <p className="text-5xl font-black text-white">{defamationRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-8 border-l-4 border-cyan-400 pl-4">Network Activity <span className="text-gray-500 font-mono text-xs">(7-Day)</span></h3>
            <div className="h-[300px]">
              {weeklyChartData && <Pie data={weeklyChartData} options={chartOptions} />}
            </div>
          </div>

          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-8 border-l-4 border-blue-500 pl-4">Daily Comparison <span className="text-gray-500 font-mono text-xs">(Fetches/Log)</span></h3>
            <div className="h-[300px]">
              {dailyBarData && <Bar data={dailyBarData} options={chartOptions} />}
            </div>
          </div>

          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-8 border-l-4 border-red-500 pl-4">Harm Assessment <span className="text-gray-500 font-mono text-xs">(AI Sentiment)</span></h3>
            <div className="h-[300px]">
              <Pie data={defamationPieData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-4">Export Forensic Dossier</h3>
            <p className="text-gray-400 mb-8 max-w-xs text-sm">Download a comprehensive, court-ready PDF containing all evidence and blockchain verification receipts.</p>
            <button
              onClick={downloadReport}
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0A192F] font-black py-5 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 transform hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? 'GENERIC PDF...' : 'GENERATE COURT-READY PDF'}
            </button>
          </div>
        </div>

        {/* Stored Evidence Section */}
        <section className="mt-24">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-3xl font-black text-white">The Evidence Log</h2>
            <div className="flex-1 h-[2px] bg-gray-800"></div>
            <span className="text-cyan-400 font-mono text-xs uppercase bg-[#112240] px-4 py-1 rounded-full border border-gray-800">On-Chain Secured</span>
          </div>

          {reportData?.stored.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {reportData.stored.map((item) => (
                <div key={item.id} className="bg-[#112240]/40 border border-gray-800 rounded-2xl p-6 hover:bg-[#112240]/60 transition-all border-b-cyan-500/50">
                  <p className="text-cyan-400 font-mono text-[10px] mb-2 uppercase">UID: {item.evidence_id}</p>
                  <div className="mb-4">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block">Block Hash</label>
                    <p className="text-gray-400 font-mono text-[10px] truncate">{item.tx_hash}</p>
                  </div>
                  {item.eth_tx_hash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${item.eth_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-cyan-400 text-xs flex items-center gap-2 transition-colors font-bold"
                    >
                      VERIFY ON ETHERSCAN ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)]/20 border border-[var(--border-color)] border-dashed rounded-3xl p-20 text-center">
              <p className="text-[var(--text-secondary)] font-mono italic">Secure Vault is currently empty.</p>
            </div>
          )}
        </section>

        <footer className="mt-20 pt-10 border-t border-[var(--border-color)] text-center">
          <p className="text-[var(--text-secondary)] text-[10px] uppercase font-mono tracking-widest">
            System Status: <span className="text-[var(--accent-cyan)] ml-2">{status}</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default ReportPage;
