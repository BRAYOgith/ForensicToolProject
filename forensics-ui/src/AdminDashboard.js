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

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://forensictoolproject.onrender.com';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityActions, setActivityActions] = useState([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activityFilters, setActivityFilters] = useState({
    user_id: '',
    action_type: 'all',
    start_date: '',
    end_date: '',
  });

  const [reportFilters, setReportFilters] = useState({
    user_id: 'all',
    category: 'all',
    action_type: 'all',
    start_date: '',
    end_date: '',
    query_text: '',
    search_mode: 'basic'
  });
  const [reportStats, setReportStats] = useState(null);
  const [reportEvidence, setReportEvidence] = useState([]);
  const [hasPreviewedReport, setHasPreviewedReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [querySuggestions, setQuerySuggestions] = useState([]);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);

  const weeklyChartRef = useRef(null);
  const dailyChartRef = useRef(null);
  const harmChartRef = useRef(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token || localStorage.getItem('is_admin') !== '1') {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [token, navigate]);

  useEffect(() => {
    if (!token || localStorage.getItem('is_admin') !== '1') return;

    if ((activeTab === 'users' || activeTab === 'reports' || activeTab === 'activities') && users.length === 0) {
      fetchUsers();
    }

    if (activeTab === 'activities') {
      fetchActivities();
    }
  }, [activeTab, token, users.length]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const getAuthHeaders = () => ({ Authorization: `Bearer ${token}` });

  const buildParams = (filters) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === 'all') return;
      params.append(key, value);
    });

    return params.toString();
  };

  const getQuerySuggestions = (query) => {
    const suggestions = [];
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('hate') || lowerQuery.includes('speech')) {
      suggestions.push('category: "Hate Speech"');
    }
    if (lowerQuery.includes('defam') || lowerQuery.includes('libel')) {
      suggestions.push('category: "Defamatory"');
    }
    if (lowerQuery.includes('safe') || lowerQuery.includes('clean')) {
      suggestions.push('category: "Safe"');
    }
    if (lowerQuery.includes('today')) {
      suggestions.push('date: today');
    }
    if (lowerQuery.includes('week')) {
      suggestions.push('date: "last 7 days"');
    }
    if (lowerQuery.includes('month')) {
      suggestions.push('date: "last 30 days"');
    }
    if (lowerQuery.includes('stored') || lowerQuery.includes('blockchain')) {
      suggestions.push('action: stored');
    }
    if (lowerQuery.includes('scan') || lowerQuery.includes('fetch')) {
      suggestions.push('action: fetched');
    }
    
    return suggestions;
  };

  const parseQuery = (queryText) => {
    const filters = { ...reportFilters };
    
    // Reset filters first
    filters.category = 'all';
    filters.action_type = 'all';
    filters.start_date = '';
    filters.end_date = '';
    
    // Parse natural language and structured queries
    const lowerQuery = queryText.toLowerCase();
    
    // Category filters
    if (lowerQuery.includes('hate speech') || lowerQuery.includes('hate')) {
      filters.category = 'Hate Speech';
    } else if (lowerQuery.includes('defamatory') || lowerQuery.includes('defam')) {
      filters.category = 'Defamatory';
    } else if (lowerQuery.includes('safe') || lowerQuery.includes('clean')) {
      filters.category = 'Safe';
    }
    
    // Action filters
    if (lowerQuery.includes('stored') || lowerQuery.includes('blockchain')) {
      filters.action_type = 'stored';
    } else if (lowerQuery.includes('scan') || lowerQuery.includes('fetch')) {
      filters.action_type = 'fetched';
    }
    
    // Date filters
    const today = new Date();
    if (lowerQuery.includes('today')) {
      const todayStr = today.toISOString().split('T')[0];
      filters.start_date = todayStr;
      filters.end_date = todayStr;
    } else if (lowerQuery.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      filters.start_date = yesterdayStr;
      filters.end_date = yesterdayStr;
    } else if (lowerQuery.includes('last 7 days') || lowerQuery.includes('week')) {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filters.start_date = weekAgo.toISOString().split('T')[0];
      filters.end_date = today.toISOString().split('T')[0];
    } else if (lowerQuery.includes('last 30 days') || lowerQuery.includes('month')) {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      filters.start_date = monthAgo.toISOString().split('T')[0];
      filters.end_date = today.toISOString().split('T')[0];
    }
    
    // Parse structured queries like: category:"Hate Speech" AND date:last_7_days
    const categoryMatch = queryText.match(/category:\s*"([^"]+)"/i);
    if (categoryMatch) {
      filters.category = categoryMatch[1];
    }
    
    const actionMatch = queryText.match(/action:\s*(\w+)/i);
    if (actionMatch) {
      filters.action_type = actionMatch[1];
    }
    
    const dateMatch = queryText.match(/date:\s*"([^"]+)"/i);
    if (dateMatch) {
      const dateValue = dateMatch[1].toLowerCase();
      if (dateValue === 'today') {
        const todayStr = today.toISOString().split('T')[0];
        filters.start_date = todayStr;
        filters.end_date = todayStr;
      } else if (dateValue === 'last 7 days') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filters.start_date = weekAgo.toISOString().split('T')[0];
        filters.end_date = today.toISOString().split('T')[0];
      }
    }
    
    return filters;
  };

  const handleQueryChange = (value) => {
    setReportFilters(prev => ({ ...prev, query_text: value }));
    setQuerySuggestions(getQuerySuggestions(value));
  };

  const applyQuery = () => {
    if (reportFilters.query_text.trim()) {
      const parsedFilters = parseQuery(reportFilters.query_text);
      setReportFilters(parsedFilters);
      
      // Add to query history
      if (!queryHistory.includes(reportFilters.query_text)) {
        setQueryHistory(prev => [reportFilters.query_text, ...prev].slice(0, 5));
      }
      
      previewAdminReport();
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    clearMessages();

    try {
      const headers = getAuthHeaders();

      const [statsRes, aiRes, pendingRes, regRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, { headers }),
        axios.get(`${API_BASE}/admin/ai-stats`, { headers }),
        axios.get(`${API_BASE}/admin/users/pending`, { headers }),
        axios.get(`${API_BASE}/admin/registration-status`),
      ]);

      setStats(statsRes.data);
      setAiStats(aiRes.data);
      setPendingUsers(pendingRes.data.users || []);
      setRegistrationEnabled(regRes.data.enabled);

      if (activeTab === 'users' || activeTab === 'reports' || activeTab === 'activities') {
        fetchUsers();
      }
      if (activeTab === 'activities') {
        fetchActivities();
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUserLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders(),
      });
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setUserLoading(false);
    }
  };

  const validateDates = (start, end) => {
    if (start && end && new Date(start) > new Date(end)) {
      return 'Start date cannot be after end date';
    }
    return null;
  };

  const fetchActivities = async () => {
    const dateError = validateDates(activityFilters.start_date, activityFilters.end_date);
    if (dateError) {
      setError(dateError);
      return;
    }

    setActivityLoading(true);
    clearMessages();

    try {
      const params = buildParams(activityFilters);
      const res = await axios.get(
        `${API_BASE}/admin/activities${params ? `?${params}` : ''}`,
        {
          headers: getAuthHeaders(),
        }
      );
      setActivities(res.data.activities || []);
      setActivityActions(res.data.available_actions || []);
      
      if ((res.data.activities || []).length === 0) {
        setSuccess('Search completed: No matching activity logs found.');
      } else {
        setSuccess(`Successfully retrieved ${res.data.activities.length} activity records.`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch activities';
      setError(errorMsg);
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUsersIfNeeded = async () => {
    if (users.length === 0) {
      await fetchUsers();
    }
  };

  const handleApprove = async (id) => {
    clearMessages();
    try {
      await axios.put(
        `${API_BASE}/admin/user/${id}/approve`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      setSuccess('User approved successfully');
      fetchDashboardData();
    } catch (err) {
      setError('Approval failed');
    }
  };

  const handleSuspend = async (id) => {
    clearMessages();
    try {
      await axios.put(
        `${API_BASE}/admin/user/${id}/suspend`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      setSuccess('User suspended');
      fetchUsers();
      if (activeTab === 'reports' && hasPreviewedReport) {
        previewAdminReport();
      }
    } catch (err) {
      setError('Suspension failed');
    }
  };

  const handleActivate = async (id) => {
    clearMessages();
    try {
      await axios.put(
        `${API_BASE}/admin/user/${id}/activate`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      setSuccess('User reactivated');
      fetchUsers();
      if (activeTab === 'reports' && hasPreviewedReport) {
        previewAdminReport();
      }
    } catch (err) {
      setError('Activation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This will delete all user data permanently.')) return;

    clearMessages();
    try {
      await axios.delete(`${API_BASE}/admin/user/${id}`, {
        headers: getAuthHeaders(),
      });
      setSuccess('User deleted');
      fetchDashboardData();
      if (activeTab === 'reports') {
        setHasPreviewedReport(false);
        setReportEvidence([]);
        setReportStats(null);
      }
    } catch (err) {
      setError('Deletion failed');
    }
  };

  const handleReportFilterChange = (key, value) => {
    setReportFilters((prev) => ({ ...prev, [key]: value }));
    setHasPreviewedReport(false);
  };

  const previewAdminReport = async () => {
    const dateError = validateDates(reportFilters.start_date, reportFilters.end_date);
    if (dateError) {
      setError(dateError);
      return;
    }

    clearMessages();
    setReportLoading(true);
    setHasPreviewedReport(false);

    try {
      await fetchUsersIfNeeded();

      const headers = getAuthHeaders();
      const params = buildParams(reportFilters);

      const [statsRes, evidenceRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/report-stats${params ? `?${params}` : ''}`, { headers }),
        axios.get(`${API_BASE}/admin/report/evidence${params ? `?${params}` : ''}`, { headers }),
      ]);

      setReportStats(statsRes.data);
      setReportEvidence(evidenceRes.data.evidence || []);
      setHasPreviewedReport(true);
      setSuccess('Admin report preview updated');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to preview admin report';
      setError(errorMsg);
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  const generateAdminPDF = async () => {
    if (!hasPreviewedReport || !reportStats) {
      setError('Please preview the report data first');
      return;
    }

    clearMessages();
    setIsGenerating(true);

    try {
      const headers = getAuthHeaders();
      const weeklyImage = weeklyChartRef.current?.toBase64Image() || '';
      const dailyImage = dailyChartRef.current?.toBase64Image() || '';
      const harmImage = harmChartRef.current?.toBase64Image() || '';

      const response = await axios.post(
        `${API_BASE}/admin/generate-report`,
        {
          user_id: reportFilters.user_id === 'all' ? 'all' : parseInt(reportFilters.user_id, 10),
          filters: reportFilters,
          stats: {
            totalFetched: reportEvidence.length,
            safeCount: reportStats.categories?.Safe || 0,
            defamatoryCount: reportStats.categories?.Defamatory || 0,
            hateSpeechCount: reportStats.categories?.['Hate Speech'] || 0,
            storedCount: reportStats.totals?.secured || 0,
          },
          charts: {
            weekly: weeklyImage.split(',')[1] || '',
            daily: dailyImage.split(',')[1] || '',
            harm: harmImage.split(',')[1] || '',
          },
        },
        {
          headers,
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Admin_System_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Admin report generated and downloaded');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.error || 'Failed to generate admin PDF');
        } catch (e) {
          setError('Failed to generate admin PDF: Server error');
        }
      } else {
        setError(err.response?.data?.error || 'Failed to generate admin PDF');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadActivityPDF = async () => {
    const dateError = validateDates(activityFilters.start_date, activityFilters.end_date);
    if (dateError) {
      setError(dateError);
      return;
    }

    clearMessages();
    setActivityLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE}/admin/generate-activity-report`,
        {
          user_id: activityFilters.user_id || null,
          start_date: activityFilters.start_date || null,
          end_date: activityFilters.end_date || null,
          limit: 500,
        },
        {
          headers: getAuthHeaders(),
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Activity_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Activity audit report downloaded');
    } catch (err) {
      console.error('Activity PDF Error:', err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.error || 'Failed to download activity audit');
        } catch (e) {
          setError('Failed to download activity audit: Server error');
        }
      } else {
        setError('Failed to download activity audit');
      }
    } finally {
      setActivityLoading(false);
    }
  };

  const toggleRegistration = async () => {
    clearMessages();

    try {
      const newState = !registrationEnabled;
      await axios.put(
        `${API_BASE}/admin/toggle-registration`,
        { enabled: newState },
        {
          headers: getAuthHeaders(),
        }
      );
      setRegistrationEnabled(newState);
      setSuccess(`Registration ${newState ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError('Failed to toggle registration');
    }
  };

  const totalScans = reportStats?.totals?.scanned || 0;
  const totalStored = reportStats?.totals?.secured || 0;
  const flaggedCount =
    (reportStats?.categories?.Defamatory || 0) + (reportStats?.categories?.['Hate Speech'] || 0);
  const safeCount = reportStats?.categories?.Safe || 0;
  const harmfulRate = totalScans > 0 ? (flaggedCount / totalScans) * 100 : 0;

  const weeklyChartData = reportStats?.trend
    ? {
        labels: reportStats.trend.map((d) => d.date),
        datasets: [
          {
            label: 'Scans',
            data: reportStats.trend.map((d) => d.scanned ?? d.fetches ?? 0),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Stored',
            data: reportStats.trend.map((d) => d.secured ?? d.retrievals ?? 0),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      }
    : null;

  const dailyBarData = reportStats?.daily
    ? {
        labels: ['Yesterday', 'Today'],
        datasets: [
          {
            label: 'Scans',
            data: [
              reportStats.daily.yesterday?.scanned || 0,
              reportStats.daily.today?.scanned || 0,
            ],
            backgroundColor: '#06b6d4',
          },
          {
            label: 'Stored',
            data: [
              reportStats.daily.yesterday?.secured || 0,
              reportStats.daily.today?.secured || 0,
            ],
            backgroundColor: '#8b5cf6',
          },
          {
            label: 'Threats',
            data: [
              reportStats.daily.yesterday?.threats || 0,
              reportStats.daily.today?.threats || 0,
            ],
            backgroundColor: '#ef4444',
          },
        ],
      }
    : null;

  const harmPieData = {
    labels: ['Safe', 'Defamatory', 'Hate Speech'],
    datasets: [
      {
        data: [safeCount, reportStats?.categories?.Defamatory || 0, reportStats?.categories?.['Hate Speech'] || 0],
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
        labels: { color: '#94a3b8', font: { size: 12, family: 'Inter' } },
      },
      tooltip: {
        backgroundColor: '#112240',
        titleColor: '#06b6d4',
        bodyColor: '#fff',
        borderColor: '#1e293b',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' }, beginAtZero: true },
    },
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="text-xl text-cyan-400 font-mono animate-pulse uppercase tracking-[0.2em]">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] py-12 px-6 font-sans text-[var(--text-primary)] relative overflow-hidden transition-colors duration-300">
      <div className="glow-orb w-[500px] h-[500px] bg-cyan-500/10 -top-48 -left-48"></div>
      <div className="glow-orb w-[500px] h-[500px] bg-purple-500/10 -bottom-48 -right-48"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-2 text-[var(--text-primary)]">
              Admin <span className="text-[var(--accent-cyan)]">Dashboard</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-base font-bold uppercase tracking-widest">
              Management Center
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-secondary)]/60 p-2 rounded-2xl border border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === 'overview'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('users');
                fetchUsers();
              }}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === 'users'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => {
                setActiveTab('activities');
                fetchActivities();
              }}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === 'activities'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Activity Trace
            </button>
            <button
              onClick={() => {
                setActiveTab('reports');
                fetchUsersIfNeeded();
              }}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === 'reports'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Reports
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl mb-8 text-center text-xs font-bold uppercase tracking-widest animate-shake">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl mb-8 text-center text-xs font-bold uppercase tracking-widest">
            {success}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="reveal-fade-in space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: 'Total Users',
                  value: stats?.total_users,
                  color: 'cyan',
                  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                },
                {
                  label: 'Pending Approvals',
                  value: stats?.pending_users,
                  color: 'amber',
                  icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                },
                {
                  label: 'Total Scans',
                  value: stats?.total_scans,
                  color: 'emerald',
                  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                },
                {
                  label: 'Saved Records',
                  value: stats?.total_stored,
                  color: 'purple',
                  icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="glass-card p-6 rounded-3xl border-l-4 border-l-cyan-500 hover:translate-y-[-4px] transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[var(--accent-cyan)] font-black text-sm uppercase tracking-widest">
                      {s.label}
                    </p>
                    <svg
                      className={`w-6 h-6 text-${s.color}-400 opacity-80`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                    </svg>
                  </div>
                  <h2 className="text-5xl font-black text-[var(--text-primary)]">{s.value || 0}</h2>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card rounded-3xl p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase text-[var(--text-primary)]">
                  Pending <span className="text-amber-400">Approvals</span>
                </h3>

                {pendingUsers.length > 0 ? (
                  <div className="space-y-4">
                    {pendingUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all"
                      >
                        <div className="mb-4 sm:mb-0">
                          <p className="font-black text-xl text-[var(--text-primary)]">{u.username}</p>
                          <p className="text-sm text-[var(--text-secondary)] font-bold">{u.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(u.id)}
                            className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-[#0A192F] transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-2xl">
                    <p className="text-[var(--text-secondary)] font-black text-xl uppercase tracking-widest">
                      No pending approval requests
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="glass-card rounded-3xl p-8">
                  <h3 className="text-2xl font-black mb-8 uppercase text-cyan-400">AI Safety Overview</h3>
                  <div className="space-y-6">
                    {[
                      { label: 'Safe Content', count: aiStats?.Safe, total: stats?.total_scans, color: 'emerald' },
                      {
                        label: 'Defamatory Content',
                        count: aiStats?.Defamatory,
                        total: stats?.total_scans,
                        color: 'amber',
                      },
                      {
                        label: 'Hate Speech',
                        count: aiStats?.['Hate Speech'],
                        total: stats?.total_scans,
                        color: 'red',
                      },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm font-black uppercase mb-2 tracking-widest">
                          <span className="text-[var(--text-primary)]">{item.label}</span>
                          <span
                            className={`${
                              item.color === 'emerald'
                                ? 'text-emerald-400'
                                : item.color === 'amber'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            } font-black`}
                          >
                            {item.count || 0}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${item.color}-500 transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                            style={{
                              width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-[#112240] to-[#0A192F]">
                  <h3 className="text-xl font-bold mb-6 uppercase">System Settings</h3>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                    <div>
                      <p className="font-black text-xl uppercase tracking-tight text-[var(--text-primary)]">
                        User Sign-ups
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[200px] font-bold">
                        Allow new user registrations.
                      </p>
                    </div>
                    <button
                      onClick={toggleRegistration}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none ${
                        registrationEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-300 ${
                          registrationEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="reveal-fade-in glass-card rounded-3xl overflow-hidden border border-white/5">
            <div className="p-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/40 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-2xl font-black uppercase text-[var(--text-primary)]">User Management</h3>
              <div className="text-xs uppercase tracking-widest font-black text-[var(--text-secondary)]">
                {userLoading ? 'Refreshing users...' : `${users.length} investigators loaded`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em] bg-[var(--bg-secondary)]/40">
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">User</th>
                    <th className="px-8 py-6">Email</th>
                    <th className="px-8 py-4">Joined</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${
                            u.account_status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : u.account_status === 'suspended'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {u.account_status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-lg text-white">{u.username}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-[var(--accent-cyan)] font-black">{u.email}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-[var(--text-primary)] font-black">
                          {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {u.account_status === 'suspended' ? (
                            <button
                              onClick={() => handleActivate(u.id)}
                              className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                              title="Reactivate"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M5 13l4 4L19 7"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(u.id)}
                              className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                              title="Suspend"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            title="Delete User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!userLoading && users.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-8 py-16 text-center text-[var(--text-secondary)] font-bold">
                        No investigators found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="reveal-fade-in space-y-8">
            <div className="glass-card rounded-3xl p-8 flex flex-wrap gap-6 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-black uppercase text-[var(--text-secondary)] block mb-2 tracking-widest">
                  Investigator
                </label>
                <select
                  value={activityFilters.user_id}
                  onChange={(e) => setActivityFilters({ ...activityFilters, user_id: e.target.value })}
                  className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] transition-all"
                >
                  <option value="">All Investigators</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-black uppercase text-[var(--text-secondary)] block mb-2 tracking-widest">
                  Filter Action Category
                </label>
                <select
                  value={activityFilters.action_type}
                  onChange={(e) => setActivityFilters({ ...activityFilters, action_type: e.target.value })}
                  className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] transition-all"
                >
                  <option value="all">All Actions</option>
                  {activityActions.map((action) => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[250px]">
                <label className="text-xs font-black uppercase text-[var(--text-secondary)] block mb-2 tracking-widest">
                  Temporal Window
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={activityFilters.start_date}
                    onChange={(e) => setActivityFilters({ ...activityFilters, start_date: e.target.value })}
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] transition-all"
                  />
                  <input
                    type="date"
                    value={activityFilters.end_date}
                    onChange={(e) => setActivityFilters({ ...activityFilters, end_date: e.target.value })}
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={fetchActivities}
                  disabled={activityLoading}
                  className="bg-[var(--accent-cyan)] text-[#0A192F] font-black py-3 px-8 rounded-xl uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-[var(--accent-cyan)]/20 transition-all disabled:opacity-50"
                >
                  {activityLoading ? 'Querying...' : 'Search Logs'}
                </button>
                <button
                  onClick={downloadActivityPDF}
                  disabled={activityLoading || activities.length === 0}
                  className="bg-purple-600 text-white font-black py-3 px-8 rounded-xl uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
                  title="Download Audit Trail as PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-5 flex items-center justify-between text-xs uppercase tracking-widest font-black text-[var(--text-secondary)]">
              <span>{activityLoading ? 'Refreshing activity feed...' : `${activities.length} activity records visible`}</span>
              <span>{activityActions.length} known action types</span>
            </div>

            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((a) => (
                  <div
                    key={a.id}
                    className="glass-card p-6 rounded-2xl border border-white/5 flex items-start gap-6 group hover:border-cyan-500/30 transition-all"
                  >
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-[var(--accent-cyan)] group-hover:bg-[var(--accent-cyan)]/10 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {a.action === 'login_success' && (
                          <path
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        {a.action === 'search_x_posts' && (
                          <path
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        {['store_evidence_success', 'retrieve_evidence_by_id', 'retrieve_evidence_by_hash'].includes(
                          a.action
                        ) && (
                          <path
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        {![
                          'login_success',
                          'search_x_posts',
                          'store_evidence_success',
                          'retrieve_evidence_by_id',
                          'retrieve_evidence_by_hash',
                        ].includes(a.action) && (
                          <path
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                        <span className="text-base font-black text-[var(--accent-cyan)] uppercase tracking-widest">
                          {a.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)] font-black italic">
                          {new Date(a.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xl font-black text-[var(--text-primary)] mb-1">
                        <span className="text-[var(--accent-cyan)] font-black">Investigator:</span> @{a.username}
                      </p>
                      <p className="text-lg text-[var(--text-secondary)] font-bold">{a.details}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-40 text-center glass-card rounded-3xl">
                  <p className="text-gray-500 italic">
                    {activityLoading ? 'Loading activity data...' : 'No logs found matching your criteria.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="reveal-fade-in space-y-12">
            <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-[#112240] to-[#0A192F]">
              <h3 className="text-2xl font-black uppercase mb-8 flex items-center gap-4 text-[var(--text-primary)]">
                Admin <span className="text-[var(--accent-cyan)]">Reports</span>
              </h3>

              <div className="space-y-6">
                {/* Query Builder Section */}
                <div className="bg-[#0A192F]/50 rounded-2xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-black text-cyan-400 uppercase tracking-widest">Smart Query Builder</h4>
                    <button
                      onClick={() => setShowQueryBuilder(!showQueryBuilder)}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-bold uppercase tracking-widest transition-colors"
                    >
                      {showQueryBuilder ? 'Hide' : 'Show'} Advanced
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={reportFilters.query_text}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && applyQuery()}
                      placeholder="Try: 'hate speech from last 7 days' or 'category: &quot;Hate Speech&quot; AND date: today'"
                      className="w-full bg-[#112240] border border-gray-600 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all pr-12"
                    />
                    <button
                      onClick={applyQuery}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 text-[#0A192F] p-2 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Query Suggestions */}
                  {querySuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {querySuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQueryChange(suggestion)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1 rounded-lg transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Query History */}
                  {queryHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Recent Queries</p>
                      <div className="flex flex-wrap gap-2">
                        {queryHistory.map((query, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQueryChange(query)}
                            className="bg-[#1e293b] hover:bg-[#334155] text-gray-300 text-xs px-3 py-1 rounded-lg transition-colors"
                          >
                            {query}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Advanced Filters */}
                {showQueryBuilder && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#0A192F]/30 rounded-2xl p-6 border border-gray-700">
                    <div>
                      <label className="text-xs font-black uppercase text-[var(--accent-cyan)] block mb-2 tracking-widest">
                        Investigator
                      </label>
                      <select
                        value={reportFilters.user_id}
                        onChange={(e) => handleReportFilterChange('user_id', e.target.value)}
                        className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      >
                        <option value="all">All Investigators</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-[var(--accent-cyan)] block mb-2 tracking-widest">
                        Category
                      </label>
                      <select
                        value={reportFilters.category}
                        onChange={(e) => handleReportFilterChange('category', e.target.value)}
                        className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      >
                        <option value="all">All Categories</option>
                        <option value="Safe">Safe</option>
                        <option value="Defamatory">Defamatory</option>
                        <option value="Hate Speech">Hate Speech</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-[var(--accent-cyan)] block mb-2 tracking-widest">
                        Action Type
                      </label>
                      <select
                        value={reportFilters.action_type}
                        onChange={(e) => handleReportFilterChange('action_type', e.target.value)}
                        className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      >
                        <option value="all">All Activity</option>
                        <option value="fetched">Scanned Only</option>
                        <option value="stored">Blockchain Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-[var(--accent-cyan)] block mb-2 tracking-widest">
                        From
                      </label>
                      <input
                        type="date"
                        value={reportFilters.start_date}
                        onChange={(e) => handleReportFilterChange('start_date', e.target.value)}
                        className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-[var(--accent-cyan)] block mb-2 tracking-widest">
                        To
                      </label>
                      <input
                        type="date"
                        value={reportFilters.end_date}
                        onChange={(e) => handleReportFilterChange('end_date', e.target.value)}
                        className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={previewAdminReport}
                  disabled={reportLoading}
                  className="bg-cyan-500 text-[#0A192F] font-black py-4 px-10 rounded-2xl uppercase tracking-widest text-sm hover:scale-[1.02] transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-70"
                >
                  {reportLoading ? 'Processing...' : 'Preview Report'}
                </button>

                {hasPreviewedReport && (
                  <button
                    onClick={generateAdminPDF}
                    disabled={isGenerating}
                    className="bg-purple-600 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest text-sm hover:scale-[1.02] transition-all shadow-xl shadow-purple-500/20 disabled:opacity-70"
                  >
                    {isGenerating ? 'Generating PDF...' : 'Download Verified PDF'}
                  </button>
                )}
              </div>
            </div>

            {hasPreviewedReport && reportStats && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className="glass-card p-8 rounded-3xl border-l-4 border-cyan-400">
                    <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">
                      Total Scans
                    </p>
                    <h2 className="text-4xl font-black text-white">{totalScans}</h2>
                  </div>
                  <div className="glass-card p-8 rounded-3xl border-l-4 border-purple-500">
                    <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">
                      Stored Records
                    </p>
                    <h2 className="text-4xl font-black text-white">{totalStored}</h2>
                  </div>
                  <div className="glass-card p-8 rounded-3xl border-l-4 border-red-500">
                    <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">
                      Flagged Content
                    </p>
                    <h2 className="text-4xl font-black text-white">{flaggedCount}</h2>
                  </div>
                  <div className="glass-card p-8 rounded-3xl border-l-4 border-emerald-500">
                    <p className="text-[var(--text-secondary)] uppercase text-[10px] font-mono tracking-widest mb-2">
                      Harmful Rate
                    </p>
                    <h2 className="text-4xl font-black text-white">{harmfulRate.toFixed(1)}%</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="glass-card p-8 rounded-3xl">
                    <h4 className="text-lg font-black uppercase text-cyan-400 mb-6 tracking-widest">
                      Weekly Trend
                    </h4>
                    <div className="h-[320px]">
                      {weeklyChartData && (
                        <Line ref={weeklyChartRef} data={weeklyChartData} options={chartOptions} />
                      )}
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-3xl">
                    <h4 className="text-lg font-black uppercase text-purple-400 mb-6 tracking-widest">
                      Daily Comparison
                    </h4>
                    <div className="h-[320px]">
                      {dailyBarData && <Bar ref={dailyChartRef} data={dailyBarData} options={chartOptions} />}
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-3xl">
                    <h4 className="text-lg font-black uppercase text-red-400 mb-6 tracking-widest">
                      Content Breakdown
                    </h4>
                    <div className="h-[320px]">
                      <Pie ref={harmChartRef} data={harmPieData} options={chartOptions} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className="glass-card p-6 rounded-3xl border border-white/5">
                    <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-black mb-2">
                      Last 30 Days
                    </p>
                    <p className="text-3xl font-black text-white">{reportStats.monthly?.scanned || 0}</p>
                    <p className="text-sm text-cyan-400 font-bold mt-1">
                      {reportStats.monthly?.secured || 0} secured
                    </p>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5">
                    <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-black mb-2">
                      Last 7 Days
                    </p>
                    <p className="text-3xl font-black text-white">{reportStats.weekly?.scanned || 0}</p>
                    <p className="text-sm text-cyan-400 font-bold mt-1">
                      {reportStats.weekly?.threats || 0} flagged
                    </p>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5">
                    <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-black mb-2">
                      Yesterday
                    </p>
                    <p className="text-3xl font-black text-white">{reportStats.daily?.yesterday?.scanned || 0}</p>
                    <p className="text-sm text-cyan-400 font-bold mt-1">
                      {reportStats.daily?.yesterday?.secured || 0} secured
                    </p>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5">
                    <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-black mb-2">
                      Today
                    </p>
                    <p className="text-3xl font-black text-white">{reportStats.daily?.today?.scanned || 0}</p>
                    <p className="text-sm text-cyan-400 font-bold mt-1">
                      {reportStats.daily?.today?.secured || 0} secured
                    </p>
                  </div>
                </div>

                <div className="glass-card rounded-3xl overflow-hidden">
                  <div className="p-8 border-b border-white/5 bg-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h4 className="text-xl font-black uppercase text-white tracking-widest">Evidence Preview</h4>
                    <p className="text-sm text-[var(--text-secondary)] font-bold">
                      Showing {reportEvidence.length} matching records
                    </p>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#0A192F] z-10">
                        <tr className="text-xs font-black uppercase text-gray-400 border-b border-white/5">
                          <th className="px-8 py-4">Status</th>
                          <th className="px-8 py-4">Investigator</th>
                          <th className="px-8 py-4">Author</th>
                          <th className="px-8 py-4">Content Snippet</th>
                          <th className="px-8 py-4">Recorded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {reportEvidence.map((ev, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-4 text-xs">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`px-2 py-1 rounded-md font-bold uppercase inline-flex w-fit ${
                                    ev.category === 'Safe'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : ev.category === 'Hate Speech'
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-amber-500/10 text-amber-400'
                                  }`}
                                >
                                  {ev.category}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-md font-bold uppercase inline-flex w-fit ${
                                    ev.verified === 1
                                      ? 'bg-cyan-500/10 text-cyan-400'
                                      : 'bg-slate-500/10 text-slate-300'
                                  }`}
                                >
                                  {ev.verified === 1 ? 'Stored' : 'Scanned'}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-4 font-bold text-sm text-cyan-400">@{ev.username}</td>
                            <td className="px-8 py-4 font-bold text-sm text-white">@{ev.author_username}</td>
                            <td className="px-8 py-4 text-sm text-gray-300 italic max-w-md truncate">
                              "{ev.content}"
                            </td>
                            <td className="px-8 py-4 text-xs text-gray-500 font-mono">
                              {new Date(ev.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {reportEvidence.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-8 py-16 text-center text-gray-500 italic">
                              No evidence matched the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-20 pt-10 border-t border-[var(--border-color)] text-center">
          <p className="text-sm uppercase font-black tracking-[0.5em] text-[var(--accent-cyan)]/40">
            ChainForensix Administration // Connection <span className="text-emerald-400">Encrypted</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
