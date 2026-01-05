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
  const API_BASE = 'http://localhost:5000'; // Change to production Render URL later

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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-2xl rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
            Retrieve Evidence from Blockchain
          </h2>

          <form onSubmit={handleRetrieve} className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Evidence ID (numeric)
              </label>
              <input
                type="text"
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-5 py-4 text-lg border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition"
              />
            </div>

            <div className="relative">
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Or Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="e.g., 0xabc123... (66 characters)"
                className="w-full px-5 py-4 text-lg border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!evidenceId.trim() && !txHash.trim())}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold text-xl py-5 rounded-2xl hover:from-purple-700 hover:to-indigo-800 transition shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Retrieving from Blockchain...' : 'Retrieve Evidence'}
            </button>
          </form>

          <p className="mt-8 text-center text-xl font-medium text-gray-700">
            Status: <span className="text-purple-700 font-bold">{status}</span>
          </p>

          {retrievedEvidence && (
            <div className="mt-12 p-10 bg-gradient-to-br from-purple-50 to-indigo-100 rounded-3xl shadow-2xl border-2 border-purple-200">
              {defamation && (
                <div
                  className={`mb-10 p-8 rounded-3xl text-white font-extrabold text-center text-3xl shadow-2xl tracking-wide ${
                    isDefamatory ? 'bg-red-600' : 'bg-green-600'
                  }`}
                >
                  {isDefamatory
                    ? `⚠️ DEFAMATORY CONTENT DETECTED – ${(confidence * 100).toFixed(1)}% CONFIDENCE`
                    : `✅ NO DEFAMATION FOUND – ${(confidence * 100).toFixed(1)}% CONFIDENCE`}
                </div>
              )}

              <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">
                Immutable Evidence from Blockchain
              </h3>

              <div className="grid md:grid-cols-2 gap-8 text-xl mb-8">
                <div>
                  <p><strong>Evidence ID:</strong> {retrievedEvidence.evidence_id || retrievedEvidence.id || 'N/A'}</p>
                  <p><strong>Post ID:</strong> {retrievedEvidence.id || 'N/A'}</p>
                  <p><strong>Author:</strong> @{retrievedEvidence.author_username || 'N/A'}</p>
                  <p><strong>Investigator:</strong> {retrievedEvidence.investigator || 'N/A'}</p>
                  <p><strong>Timestamp:</strong> {retrievedEvidence.created_at || retrievedEvidence.timestamp || 'N/A'}</p>
                </div>
                <div>
                  {ethTxHash && (
                    <div>
                      <p className="font-bold mb-2">Ethereum Transaction:</p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${ethTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 hover:underline break-all block text-lg"
                      >
                        {ethTxHash}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <p className="font-bold text-2xl text-gray-800 mb-4">Original Content:</p>
                <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-inner text-gray-800 text-lg leading-relaxed">
                  {retrievedEvidence.text || retrievedEvidence.content || 'No content recorded'}
                </div>
              </div>

              {retrievedEvidence.media_urls?.length > 0 && (
                <div className="mt-12">
                  <p className="font-bold text-2xl text-gray-800 mb-6">
                    Attached Media ({retrievedEvidence.media_urls.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    {retrievedEvidence.media_urls.map((url, i) => (
                      <div key={i} className="group">
                        <img
                          src={url}
                          alt={`Evidence media ${i + 1}`}
                          className="w-full h-auto rounded-2xl shadow-xl border-2 border-gray-200 group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300"
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RetrievePage;
