import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RetrievePage() {
  const [evidenceId, setEvidenceId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [retrievedEvidence, setRetrievedEvidence] = useState(null);
  const [ethTxHash, setEthTxHash] = useState('');
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const API_BASE = 'https://forensictoolproject.onrender.com';

  // Protected route check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Auto-lookup Evidence ID from Tx Hash
  useEffect(() => {
    if (!txHash.trim()) {
      setEvidenceId('');
      setEthTxHash('');
      setRetrievedEvidence(null);
      return;
    }

    const normalized = txHash.trim().toLowerCase();
    const fullHash = normalized.startsWith('0x') ? normalized : `0x${normalized}`;

    if (!/^0x[0-9a-f]{64}$/i.test(fullHash)) {
      setStatus('Invalid transaction hash format (must be 66 chars: 0x + 64 hex)');
      setEvidenceId('');
      setEthTxHash('');
      return;
    }

    const lookupId = async () => {
      setStatus('Looking up Evidence ID from transaction hash...');
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_BASE}/retrieve-evidence`,
          { transaction_hash: fullHash },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.error) {
          setStatus(`Error: ${response.data.error}`);
          setEvidenceId('');
          setEthTxHash('');
        } else {
          setEvidenceId(response.data.evidence_id?.toString() || '');
          setEthTxHash(response.data.eth_tx_hash || '');
          setRetrievedEvidence(response.data);
          setStatus('Evidence found by transaction hash');
        }
      } catch (error) {
        setStatus(`Lookup failed: ${error.response?.data?.error || error.message}`);
        setEvidenceId('');
        setEthTxHash('');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(lookupId, 600);
    return () => clearTimeout(timer);
  }, [txHash]);

  // Auto-lookup Tx Hash from Evidence ID
  useEffect(() => {
    if (!evidenceId.trim() || isNaN(evidenceId)) {
      setTxHash('');
      setEthTxHash('');
      return;
    }

    const lookupHash = async () => {
      setStatus('Looking up transaction hash from Evidence ID...');
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_BASE}/get-tx-hash`,
          { evidence_id: parseInt(evidenceId) },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.error) {
          setStatus(`Error: ${response.data.error}`);
          setTxHash('');
          setEthTxHash('');
        } else {
          setTxHash(response.data.tx_hash || '');
          setEthTxHash(response.data.eth_tx_hash || '');
          setStatus('Transaction hash found');
        }
      } catch (error) {
        setStatus(`Lookup failed: ${error.response?.data?.error || error.message}`);
        setTxHash('');
        setEthTxHash('');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(lookupHash, 600);
    return () => clearTimeout(timer);
  }, [evidenceId]);

  const handleRetrieve = async (e) => {
    e.preventDefault();

    if (!evidenceId.trim() && !txHash.trim()) {
      setStatus('Please enter either Evidence ID or Transaction Hash');
      return;
    }

    setLoading(true);
    setRetrievedEvidence(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      let response;
      if (evidenceId.trim() && !isNaN(evidenceId)) {
        setStatus('Retrieving evidence by ID...');
        response = await axios.post(
          `${API_BASE}/get-evidence`,
          { evidence_id: parseInt(evidenceId) },
          { headers }
        );
      } else {
        const fullHash = txHash.trim().toLowerCase().startsWith('0x') ? txHash.trim() : `0x${txHash.trim()}`;
        setStatus('Retrieving evidence by transaction hash...');
        response = await axios.post(
          `${API_BASE}/retrieve-evidence`,
          { transaction_hash: fullHash },
          { headers }
        );
      }

      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
      } else {
        const data = response.data.data || response.data;
        setRetrievedEvidence(data);
        setStatus('Evidence retrieved successfully from blockchain');
      }
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const defamation = retrievedEvidence?.defamation;
  const isDefamatory = defamation?.is_defamatory;
  const confidence = defamation?.confidence || 0;

  return (
    <div className="min-h-screen bg-[var(--bg-color)] py-8 px-4 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] opacity-10 glow-orb"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-cyan-500 rounded-full blur-[150px] opacity-10 glow-orb" style={{ animationDelay: '-5s' }}></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="glass-card rounded-3xl p-8">
          <header className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">
              Evidence Log
            </h2>
            <p className="text-[var(--accent-cyan)] font-mono text-xs tracking-widest uppercase italic">Immutable Blockchain Retrieval</p>
          </header>

          <form onSubmit={handleRetrieve} className="space-y-6">
            <div className="group">
              <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">
                Evidence UID (Numeric)
              </label>
              <input
                type="text"
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all shadow-inner"
              />
            </div>

            <div className="relative group">
              <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">
                Or Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!evidenceId.trim() && !txHash.trim())}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0A192F] font-bold py-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 transform hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#0A192F] border-t-transparent rounded-full animate-spin"></div>
                  LOCATING BLOCKS...
                </span>
              ) : 'RETRIEVE SECURE EVIDENCE'}
            </button>
          </form>

          {status && (
            <div className="mt-8 p-4 bg-[#0A192F]/50 border border-gray-800 rounded-xl text-center">
              <p className="text-gray-400 text-sm font-mono uppercase">
                Status: <span className="text-cyan-400 font-bold ml-2">{status}</span>
              </p>
            </div>
          )}

          {retrievedEvidence && (
            <div className="mt-12 animate-slide-up">
              <div className="border-t border-gray-800 pt-10">
                {defamation && (
                  <div
                    className={`mb-10 p-8 rounded-3xl text-white font-bold text-center relative overflow-hidden shadow-2xl border-2 ${isDefamatory
                      ? 'bg-red-500/10 border-red-500/50 text-red-400'
                      : 'bg-green-500/10 border-green-500/50 text-green-400'
                      }`}
                  >
                    <div className="relative z-10">
                      <h4 className="text-sm uppercase tracking-[0.2em] mb-2 opacity-80">Blockchain Verified Audit</h4>
                      <p className="text-3xl font-black mb-2 uppercase">
                        {isDefamatory ? 'CRITICAL: RED-FLAG DETECTED' : 'SYSTEM: CLEAR / NEUTRAL'}
                      </p>
                      <p className="font-mono text-xs">MODEL CONFIDENCE: {(confidence * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#0A192F] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Subject Handle</label>
                    <p className="text-white font-bold text-lg">@{retrievedEvidence.author_username || 'N/A'}</p>
                  </div>
                  <div className="bg-[#0A192F] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Evidence UID</label>
                    <p className="text-white font-bold text-lg">#{retrievedEvidence.evidence_id || 'N/A'}</p>
                  </div>
                  <div className="bg-[#0A192F] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Assigned Investigator</label>
                    <p className="text-white font-bold text-lg">{retrievedEvidence.investigator || 'N/A'}</p>
                  </div>
                  <div className="bg-[#0A192F] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Timestamp logged</label>
                    <p className="text-white font-bold text-lg">{retrievedEvidence.created_at || retrievedEvidence.timestamp || 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-[#0A192F] p-8 rounded-3xl border border-gray-800 shadow-inner mb-8">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 block">Immutable Content Record</label>
                  <p className="text-gray-300 leading-relaxed italic text-lg">
                    "{retrievedEvidence.text || retrievedEvidence.content || 'No text content recorded.'}"
                  </p>
                </div>

                {ethTxHash && (
                  <div className="bg-[#0A192F] p-5 rounded-2xl border border-gray-800 shadow-inner mb-10">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 block">Ethereum Blockchain Receipt (Sepolia)</label>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${ethTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline break-all block font-mono text-xs"
                    >
                      {ethTxHash}
                    </a>
                  </div>
                )}

                {retrievedEvidence.media_urls?.length > 0 && (
                  <div className="mb-10">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-4 block">Secured Assets ({retrievedEvidence.media_urls.length})</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {retrievedEvidence.media_urls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-800 shadow-lg group">
                          <img
                            src={url}
                            alt={`Evidence media ${i + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => (e.target.closest('.group').style.display = 'none')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RetrievePage;
