import React, { useState, useEffect, useRef } from 'react';
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
  
  // Filter states
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    category: 'all',
    action_type: 'all'
  });
  const [isFiltering, setIsFiltering] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [filterError, setFilterError] = useState('');

  // Chart References for PDF capture
  const weeklyChartRef = useRef(null);
  const dailyChartRef = useRef(null);
  const harmChartRef = useRef(null);

  const navigate = useNavigate();
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://forensictoolproject.onrender.com';

  const fetchReportData = async (filterParams = {}) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      navigate('/login');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filterParams.start_date) queryParams.append('start_date', filterParams.start_date);
      if (filterParams.end_date) queryParams.append('end_date', filterParams.end_date);
      if (filterParams.category && filterParams.category !== 'all') queryParams.append('category', filterParams.category);
      if (filterParams.action_type && filterParams.action_type !== 'all') queryParams.append('action_type', filterParams.action_type);
      
      const queryString = queryParams.toString();
      const reportUrl = queryString ? `${API_BASE}/report/${userId}?${queryString}` : `${API_BASE}/report/${userId}`;
      
      const [reportResponse, statsResponse] = await Promise.all([
        axios.get(reportUrl, { headers }),
        axios.get(queryString ? `${API_BASE}/report-stats/${userId}?${queryString}` : `${API_BASE}/report-stats/${userId}`, { headers }),
      ]);

      setReportData(reportResponse.data);
      setStatsData(statsResponse.data);
      setStatus('Report loaded successfully');
    } catch (err) {
      console.error('Report fetch error:', err);
      setError('Failed to load report. Please try again.');
      setStatus('Error loading data');
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      navigate('/login');
      return;
    }

    fetchReportData({});
  }, [navigate]);

  const validateDates = (start, end) => {
    if (start && end && new Date(start) > new Date(end)) {
      return 'Start date cannot be after end date';
    }
    return null;
  };

  const applyFilters = () => {
    const dateErr = validateDates(filters.start_date, filters.end_date);
    if (dateErr) {
      setFilterError(dateErr);
      return;
    }

    setFilterError('');
    setLoading(true);
    setIsFiltering(true);
    setHasPreviewed(true);
    setStatus('Updating results...');
    setShowFilterModal(false);
    fetchReportData(filters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      start_date: '',
      end_date: '',
      category: 'all',
      action_type: 'all'
    };
    setFilters(emptyFilters);
    setLoading(true);
    setStatus('Clearing filters...');
    fetchReportData(emptyFilters);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openFilterModal = () => {
    setShowFilterModal(true);
  };

  const downloadFullReport = async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      setError('You must be logged in');
      return;
    }

    setStatus('Generating full PDF report (all data)...');
    setShowFilterModal(false);
    
    try {
      // Capture chart images as base64
      const weeklyImage = weeklyChartRef.current?.toBase64Image() || '';
      const dailyImage = dailyChartRef.current?.toBase64Image() || '';
      const harmImage = harmChartRef.current?.toBase64Image() || '';
      
      // Get all data without filters
      const headers = { Authorization: `Bearer ${token}` };
      const fullResponse = await axios.get(
        `${API_BASE}/report/${userId}`,
        { headers }
      );
      
      const fullData = fullResponse.data;
      const totalFetched = fullData.fetched?.length || 0;
      const safeCount = fullData.fetched?.filter(item => item.category === 'Safe').length || 0;
      const defamatoryCount = fullData.fetched?.filter(item => item.category === 'Defamatory').length || 0;
      const hateSpeechCount = fullData.fetched?.filter(item => item.category === 'Hate Speech').length || 0;

      const response = await axios.post(`${API_BASE}/generate-report/${userId}`, {
        charts: {
          weekly: weeklyImage.split(',')[1] || '',
          daily: dailyImage.split(',')[1] || '',
          harm: harmImage.split(',')[1] || ''
        },
        filters: { start_date: '', end_date: '', category: 'all', action_type: 'all' },
        stats: {
          totalFetched,
          safeCount,
          defamatoryCount,
          hateSpeechCount,
          storedCount: fullData.stored?.length || 0
        }
      }, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
    // Simplified language: generated file name
      a.download = `Activity_Report_${reportData?.username || 'User'}_Full_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('Report downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.error || 'Failed to generate PDF');
        } catch (e) {
          setError('Failed to generate PDF: Server error');
        }
      } else {
        setError('Failed to generate PDF');
      }
      setStatus('Download failed');
    }
  };

  const generateFilteredReport = async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      setError('You must be logged in');
      return;
    }

    if (!hasPreviewed) {
      setFilterError('Please click "Apply & Preview" to see the updated results first.');
      return;
    }

    setFilterError('');
    setStatus('Generating PDF report...');
    
    try {
      // Capture chart images as base64
      const weeklyImage = weeklyChartRef.current?.toBase64Image() || '';
      const dailyImage = dailyChartRef.current?.toBase64Image() || '';
      const harmImage = harmChartRef.current?.toBase64Image() || '';
      
      const stats = {
        totalFetched: reportData.fetched?.length || 0,
        safeCount: reportData.fetched?.filter(item => item.category === 'Safe').length || 0,
        defamatoryCount: reportData.fetched?.filter(item => item.category === 'Defamatory').length || 0,
        hateSpeechCount: reportData.fetched?.filter(item => item.category === 'Hate Speech').length || 0,
        storedCount: reportData.stored?.length || 0
      };

      const response = await axios.post(`${API_BASE}/generate-report/${userId}`, {
        charts: {
          weekly: weeklyImage.split(',')[1] || '',
          daily: dailyImage.split(',')[1] || '',
          harm: harmImage.split(',')[1] || ''
        },
        filters,
        stats
      }, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Activity_Report_${reportData?.username || 'User'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('Report downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to generate PDF');
      setStatus('Download failed');
    }
  };


  const totalFetched = reportData?.fetched.length || 0;
  const safeCount = reportData?.fetched.filter(item => item.category === 'Safe').length || 0;
  const defamatoryCount = reportData?.fetched.filter(item => item.category === 'Defamatory').length || 0;
  const hateSpeechCount = reportData?.fetched.filter(item => item.category === 'Hate Speech').length || 0;
  
  const riskRate = totalFetched > 0 ? ((defamatoryCount + hateSpeechCount) / totalFetched) * 100 : 0;

  // Weekly Trend Chart (Line)
  const weeklyChartData = statsData?.trend
    ? {
      labels: statsData.trend.map(d => d.date),
      datasets: [
        {
          label: 'Fetches',
          data: statsData.trend.map(d => d.fetches),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Retrievals',
          data: statsData.trend.map(d => d.retrievals),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
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

  // AI Forensic Classification Pie
  const defamationPieData = {
    labels: ['Safe', 'Defamatory', 'Hate Speech'],
    datasets: [
      {
        data: [safeCount, defamatoryCount, hateSpeechCount],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
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
            Activity Summary
          </h1>
          <div className="flex flex-wrap gap-4 text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest">
            <span className="bg-[#112240] px-4 py-2 rounded-full border border-gray-800">User: <span className="text-cyan-400">{reportData?.username || 'Guest'}</span></span>
            <span className="bg-[#112240] px-4 py-2 rounded-full border border-gray-800">Generated: <span className="text-cyan-400">{new Date().toLocaleDateString()}</span></span>
          </div>
        </div>

        {/* Major Counters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="glass-card p-8 rounded-3xl border-l-4 border-cyan-400 group hover:bg-[#112240]/50 transition-all">
                  <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">Total Scans</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-white">{totalFetched}</h2>
                  </div>
                </div>
                <div className="glass-card p-8 rounded-3xl border-l-4 border-red-500 group hover:bg-[#112240]/50 transition-all">
                  <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">Risk Level</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-white">{riskRate.toFixed(1)}%</h2>
                  </div>
                </div>
                <div className="glass-card p-8 rounded-3xl border-l-4 border-gray-600 group hover:bg-[#112240]/50 transition-all">
                  <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">Verified Records</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-white">{reportData?.stored.length || 0}</h2>
                  </div>
                </div>
              </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-8 border-l-4 border-cyan-400 pl-4">Activity Trend <span className="text-gray-500 font-mono text-xs">(Last 7 Days)</span></h3>
            <div className="h-[300px]">
              {weeklyChartData && <Line ref={weeklyChartRef} data={weeklyChartData} options={chartOptions} />}
            </div>
          </div>

          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-8 border-l-4 border-blue-500 pl-4">Daily Results</h3>
            <div className="h-[300px]">
              {dailyBarData && <Bar ref={dailyChartRef} data={dailyBarData} options={chartOptions} />}
            </div>
          </div>

          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-8 border-l-4 border-red-500 pl-4">Content Categories</h3>
            <div className="h-[300px]">
              <Pie ref={harmChartRef} data={defamationPieData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-[#112240]/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-4">Download Report</h3>
            <p className="text-gray-400 mb-8 max-w-xs text-sm">Update your view using filters and then download your customized PDF report.</p>
            <div className="flex flex-col w-full gap-4">
              <button
                onClick={openFilterModal}
                className="w-full bg-[#1e293b] hover:bg-[#334155] text-white font-bold py-4 rounded-xl transition-all border border-gray-700"
              >
                Change Filters
              </button>
              <button
                onClick={generateFilteredReport}
                disabled={loading}
                className={`w-full font-black py-5 rounded-2xl transition-all shadow-lg transform hover:scale-[1.02] ${hasPreviewed ? 'bg-cyan-500 text-[#0A192F] shadow-cyan-500/20' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
              >
                {loading ? 'Processing...' : hasPreviewed ? 'Download PDF Report' : 'Apply Filters First'}
              </button>
              {filterError && <p className="text-red-400 text-xs mt-2">{filterError}</p>}
            </div>
          </div>
        </div>

        {/* Stored Evidence Section */}
        <section className="mt-24">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-3xl font-black text-white">Activity Log</h2>
            <div className="flex-1 h-[2px] bg-gray-800"></div>
            <span className="text-cyan-400 font-mono text-xs uppercase bg-[#112240] px-4 py-1 rounded-full border border-gray-800">History</span>
          </div>

          {reportData?.stored.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reportData.stored.map((item) => (
                <div key={item.id} className="bg-[#112240]/40 border border-gray-800 rounded-2xl p-6 hover:bg-[#112240]/60 transition-all border-b-cyan-500/50 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-widest">Entry ID: {item.evidence_id}</p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                        item.category === 'Safe' ? 'text-green-400 border-green-500/30' : 
                        item.category === 'Hate Speech' ? 'text-red-400 border-red-500/30' :
                        'text-amber-400 border-amber-500/30'
                      }`}>
                        {item.category} ({(item.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Content Snippet</label>
                      <p className="text-gray-300 text-xs italic leading-relaxed line-clamp-3">
                        "{item.content}"
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2 font-mono">-- @{item.author_username}</p>
                    </div>

                    <div className="mb-4">
                      <label className="text-[10px] text-gray-500 font-bold uppercase block">Block Hash</label>
                      <p className="text-gray-500 font-mono text-[9px] truncate">{item.tx_hash}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800/50 mt-auto">
                    {item.eth_tx_hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${item.eth_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-cyan-400 text-[10px] flex items-center gap-2 transition-colors font-bold uppercase tracking-widest"
                      >
                        VERIFY ON ETHERSCAN &rarr;
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)]/20 border border-[var(--border-color)] border-dashed rounded-3xl p-20 text-center">
              <p className="text-[var(--text-secondary)] font-mono italic">No activity history found.</p>
            </div>
          )}
        </section>

        <footer className="mt-20 pt-10 border-t border-[var(--border-color)] text-center">
          <p className="text-[var(--text-secondary)] text-[10px] uppercase font-mono tracking-widest">
            System Status: <span className="text-[var(--accent-cyan)] ml-2">{status}</span>
          </p>
        </footer>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#112240] border border-gray-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-white">Filter Report Data</h2>
              </div>
              
              <p className="text-gray-400 mb-6">Select what you want to see in your report:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-300 font-bold uppercase block mb-2">From</label>
                  <input 
                    type="date" 
                    value={filters.start_date}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                    className="w-full bg-[#0A192F] border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 font-bold uppercase block mb-2">To</label>
                  <input 
                    type="date" 
                    value={filters.end_date}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                    className="w-full bg-[#0A192F] border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 font-bold uppercase block mb-2">Content Type</label>
                  <select 
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full bg-[#0A192F] border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Classifications</option>
                    <option value="Safe">Safe</option>
                    <option value="Defamatory">Defamatory</option>
                    <option value="Hate Speech">Hate Speech</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 font-bold uppercase block mb-2">Action Type</label>
                  <select 
                    value={filters.action_type}
                    onChange={(e) => handleFilterChange('action_type', e.target.value)}
                    className="w-full bg-[#0A192F] border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Actions</option>
                    <option value="fetched">Scanned Only</option>
                    <option value="stored">Stored/Blockchain Only</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0A192F]/50 rounded-xl p-4 mb-6">
                <p className="text-cyan-400 text-sm font-bold mb-2">Quick Options:</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setFilters({...filters, start_date: today, end_date: today, category: 'all', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => {
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      const today = new Date().toISOString().split('T')[0];
                      setFilters({...filters, start_date: weekAgo, end_date: today, category: 'all', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Last 7 Days
                  </button>
                  <button 
                    onClick={() => {
                      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      const today = new Date().toISOString().split('T')[0];
                      setFilters({...filters, start_date: monthAgo, end_date: today, category: 'all', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Last 30 Days
                  </button>
                  <button 
                    onClick={() => {
                      setFilters({start_date: '', end_date: '', category: 'Safe', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-green-900/50 hover:bg-green-800/50 text-green-400 text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Safe Only
                  </button>
                  <button 
                    onClick={() => {
                      setFilters({start_date: '', end_date: '', category: 'Defamatory', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-amber-900/50 hover:bg-amber-800/50 text-amber-400 text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Defamatory Only
                  </button>
                  <button 
                    onClick={() => {
                      setFilters({start_date: '', end_date: '', category: 'Hate Speech', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-red-900/50 hover:bg-red-800/50 text-red-400 text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Hate Speech Only
                  </button>
                  <button 
                    onClick={() => {
                      setFilters({start_date: '', end_date: '', category: 'all', action_type: 'stored'});
                      setFilterError('');
                    }}
                    className="bg-purple-900/50 hover:bg-purple-800/50 text-purple-400 text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Blockchain Only
                  </button>
                  <button 
                    onClick={() => {
                      setFilters({start_date: '', end_date: '', category: 'all', action_type: 'all'});
                      setFilterError('');
                    }}
                    className="bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-400 text-xs py-2 px-3 rounded-lg transition-colors"
                  >
                    Full Report (All)
                  </button>
                </div>
              </div>

              {filterError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
                  {filterError}
                </div>
              )}
              
              <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={applyFilters}
                  disabled={loading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0A192F] font-bold py-4 rounded-xl transition-all shadow-lg"
                >
                  {loading ? 'Refreshing...' : 'Apply & Preview Data'}
                </button>
                <button 
                  onClick={() => {
                    setShowFilterModal(false);
                    setFilterError('');
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportPage;
