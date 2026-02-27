import React, { useState, useEffect } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function RetrievePage() {
  const [evidenceId, setEvidenceId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [retrievedEvidence, setRetrievedEvidence] = useState(null);
  const [ethTxHash, setEthTxHash] = useState('');
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();


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
        const response = await api.post(
          '/retrieve-evidence',
          { transaction_hash: fullHash }
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
        const response = await api.post(
          '/get-tx-hash',
          { evidence_id: parseInt(evidenceId) }
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
      let response;
      if (evidenceId.trim() && !isNaN(evidenceId)) {
        setStatus('Retrieving evidence by ID...');
        response = await api.post(
          '/get-evidence',
          { evidence_id: parseInt(evidenceId) }
        );
      } else {
        const fullHash = txHash.trim().toLowerCase().startsWith('0x') ? txHash.trim() : `0x${txHash.trim()}`;
        setStatus('Retrieving evidence by transaction hash...');
        response = await api.post(
          '/retrieve-evidence',
          { transaction_hash: fullHash }
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
  const category = defamation?.category || 'Safe';
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
              <label htmlFor="evidenceId" className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">
                Evidence UID (Numeric)
              </label>
              <input
                id="evidenceId"
                type="text"
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                aria-label="Evidence ID"
                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all shadow-inner"
              />
            </div>

            <div className="relative group">
              <label htmlFor="txHash" className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">
                Or Transaction Hash
              </label>
              <input
                id="txHash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                aria-label="Transaction Hash"
                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!evidenceId.trim() && !txHash.trim())}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0A192F] font-bold py-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 transform hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2" role="status">
                  <div className="w-4 h-4 border-2 border-[#0A192F] border-t-transparent rounded-full animate-spin"></div>
                  LOCATING BLOCKS...
                </span>
              ) : 'RETRIEVE SECURE EVIDENCE'}
            </button>
          </form>

          {status && (
            <div
              role="alert"
              aria-live="polite"
              className={`mt-8 p-4 bg-[var(--bg-color)]/50 border rounded-xl text-center ${status.toLowerCase().includes('error') || status.toLowerCase().includes('failed') ? 'border-red-500/50' : 'border-gray-800'}`}
            >
              <p className="text-gray-400 text-sm font-mono uppercase">
                Status: <span className={`${status.toLowerCase().includes('error') || status.toLowerCase().includes('failed') ? 'text-red-400' : 'text-cyan-400'} font-bold ml-2`}>{status}</span>
              </p>
            </div>
          )}

          {retrievedEvidence && (
            <div className="mt-12 animate-slide-up">
              <div className="border-t border-gray-800 pt-10">
                {defamation && (
                  <div className="mb-10 space-y-4">
                    <div
                      className={`p-8 rounded-3xl text-white font-bold text-center relative overflow-hidden shadow-2xl border-2 ${category === 'Hate Speech'
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : category === 'Defamatory'
                          ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                          : 'bg-green-500/10 border-green-500/50 text-green-400'
                        }`}
                    >
                      <div className="relative z-10">
                        <h4 className="text-sm uppercase tracking-[0.2em] mb-2 opacity-80">Blockchain Verified Forensic Audit</h4>
                        <p className="text-3xl font-black mb-2 uppercase">
                          {category === 'Hate Speech' ? 'CRITICAL: HATE SPEECH' :
                            category === 'Defamatory' ? 'WARNING: DEFAMATORY' :
                              'SYSTEM: CLEAR / NEUTRAL'}
                        </p>
                        <p className="font-mono text-xs mb-4">MODEL CONFIDENCE: {(confidence * 100).toFixed(2)}%</p>

                        <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl text-left border border-white/10">
                          <p className="text-sm leading-relaxed mb-0 font-medium italic opacity-90">
                            "{defamation.justification}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Score Breakdown */}
                    {defamation.all_scores && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(defamation.all_scores).map(([key, score]) => (
                          <div key={key} className="bg-[var(--bg-color)] p-4 rounded-2xl border border-gray-800 shadow-inner group">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{key.replace('_', ' ')}</span>
                              <span className={`text-xs font-mono ${(score * 100) > 40 ? 'text-cyan-400' : 'text-gray-600'}`}>{(score * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${key === 'hate_speech' ? 'bg-red-500' : key === 'defamatory' ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${score * 100}%` }}
                              ></div>
                            </div>
                            {defamation.all_justifications && (
                              <p className="text-[9px] text-gray-600 mt-2 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                                {defamation.all_justifications[key]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {defamation.technical_justification && (
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                        <p className="text-[10px] text-cyan-400/80 font-mono italic">
                          <span className="font-bold uppercase mr-2">Technical Engine Note:</span>
                          {defamation.technical_justification}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Subject Handle</label>
                    <p className="text-white font-bold text-lg">@{retrievedEvidence.author_username || 'N/A'}</p>
                  </div>
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Evidence UID</label>
                    <p className="text-white font-bold text-lg">#{retrievedEvidence.evidence_id || 'N/A'}</p>
                  </div>
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Assigned Investigator</label>
                    <p className="text-white font-bold text-lg">{retrievedEvidence.investigator || 'N/A'}</p>
                  </div>
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Timestamp logged</label>
                    <p className="text-white font-bold text-lg">{retrievedEvidence.created_at || retrievedEvidence.timestamp || 'N/A'}</p>
                  </div>
                </div>

                {retrievedEvidence.engagement && (
                  <div className="mb-8">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-4 block">On-Chain Engagement Snapshot</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Retweets', value: retrievedEvidence.engagement.retweets },
                        { label: 'Replies', value: retrievedEvidence.engagement.replies },
                        { label: 'Likes', value: retrievedEvidence.engagement.likes },
                        { label: 'Views', value: retrievedEvidence.engagement.views }
                      ].map((stat, i) => (
                        <div key={i} className="bg-[var(--bg-color)] p-4 rounded-xl border border-gray-800 text-center shadow-inner">
                          <p className="text-[9px] text-gray-500 uppercase mb-1">{stat.label}</p>
                          <p className="text-white font-black text-lg">{stat.value?.toLocaleString() || '0'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {retrievedEvidence.verification && (
                  <div className={`p-6 mb-8 rounded-3xl border-2 transition-all duration-500 ${retrievedEvidence.verification.status === 'verified'
                    ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                    : retrievedEvidence.verification.status === 'tampered'
                      ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                      : 'bg-slate-800/50 border-gray-700 text-gray-400'
                    }`}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-4 h-4 rounded-full ${retrievedEvidence.verification.status === 'verified' ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                        retrievedEvidence.verification.status === 'tampered' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gray-500'
                        }`}></div>
                      <h4 className="text-base font-black uppercase tracking-[0.1em]">
                        {retrievedEvidence.verification.status === 'verified' ? 'Cryptographic Integrity Secured' :
                          retrievedEvidence.verification.status === 'tampered' ? 'TAMPER ALERT: HASH DISCREPANCY' :
                            'Integrity Check: Post Metadata Missing'}
                      </h4>
                    </div>

                    <div className="space-y-2 font-mono text-[9px] opacity-80 uppercase tracking-tighter">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>On-Chain Fingerprint (Master):</span>
                        <span className="truncate ml-4">{retrievedEvidence.verification.on_chain_hash || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>Calculated Hash (Recalculated):</span>
                        <span className={`truncate ml-4 ${retrievedEvidence.verification.status === 'tampered' ? 'text-red-400 font-bold' : ''}`}>
                          {retrievedEvidence.verification.calculated_hash || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="text-[8px] leading-tight mt-3 text-gray-500 normal-case italic">
                        The SHA-256 algorithm was re-executed locally on the retrieved content and metadata to ensure no alteration occurred since the primary anchor was created on Sepolia.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-[var(--bg-color)] p-8 rounded-3xl border border-gray-800 shadow-inner mb-8">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 block">Immutable Content Record</label>
                  <p className="text-gray-300 leading-relaxed italic text-lg">
                    "{retrievedEvidence.text || retrievedEvidence.content || 'No text content recorded.'}"
                  </p>
                </div>

                {ethTxHash && (
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner mb-10">
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