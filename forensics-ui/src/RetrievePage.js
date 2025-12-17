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

  // LIVE BACKEND URL
  const API_BASE = 'https://forensictoolprojectfin.onrender.com';

  // Session Management: Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
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

    const normalized = txHash.trim().toLowerCase().startsWith('0x') ? txHash.trim() : `0x${txHash.trim()}`;
    if (!/^0x[0-9a-fA-F]{64}$/i.test(normalized)) {
      setStatus('Invalid transaction hash format (must be 66 characters: 0x + 64 hex)');
      setEvidenceId('');
      setEthTxHash('');
      return;
    }

    const lookupEvidenceId = async () => {
      setStatus('Looking up evidence ID from transaction hash...');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_BASE}/retrieve-evidence`,
          { transaction_hash: normalized },
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
          setStatus('Evidence ID found from transaction hash');
        }
      } catch (error) {
        const msg = error.response?.data?.error || error.message;
        setStatus(`Failed to lookup from tx hash: ${msg}`);
        setEvidenceId('');
        setEthTxHash('');
      }
    };

    const timer = setTimeout(lookupEvidenceId, 600);
    return () => clearTimeout(timer);
  }, [txHash]);

  // Auto-lookup Tx Hash from Evidence ID
  useEffect(() => {
    if (!evidenceId.trim() || isNaN(evidenceId)) {
      setTxHash('');
      setEthTxHash('');
      return;
    }

    const lookupTxHash = async () => {
      setStatus('Looking up transaction hash from evidence ID...');
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
        const msg = error.response?.data?.error || error.message;
        setStatus(`Failed to lookup tx hash: ${msg}`);
        setTxHash('');
        setEthTxHash('');
      }
    };

    const timer = setTimeout(lookupTxHash, 600);
    return () => clearTimeout(timer);
  }, [evidenceId]);

  const handleRetrieve = async (e) => {
    e.preventDefault();
    if (!evidenceId.trim() && !txHash.trim()) {
      setStatus('Please enter either an Evidence ID or Transaction Hash');
      return;
    }

    setLoading(true);
    setRetrievedEvidence(null);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      let response;
      if (evidenceId.trim() && !isNaN(evidenceId)) {
        setStatus('Retrieving evidence by ID...');
        response = await axios.post(
          `${API_BASE}/get-evidence`,
          { evidence_id: parseInt(evidenceId) },
          { headers }
        );
      } else {
        const normalized = txHash.trim().toLowerCase().startsWith('0x') ? txHash.trim() : `0x${txHash.trim()}`;
        setStatus('Retrieving evidence by transaction hash...');
        response = await axios.post(
          `${API_BASE}/retrieve-evidence`,
          { transaction_hash: normalized },
          { headers }
        );
      }

      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setRetrievedEvidence(null);
      } else {
        setRetrievedEvidence(response.data.data || response.data);
        setStatus('Evidence successfully retrieved from blockchain');
      }
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Network error';
      setStatus(`Retrieval failed: ${msg}`);
      setRetrievedEvidence(null);
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
        <div className="bg-white shadow-xl rounded-xl p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Retrieve Evidence from Blockchain
          </h2>

          <form onSubmit={handleRetrieve} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence ID (numeric)
              </label>
              <input
                type="text"
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="e.g., 0xabc123... (66 characters)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!evidenceId.trim() && !txHash.trim())}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Retrieving...' : 'Retrieve Evidence'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">Status: {status}</p>

          {retrievedEvidence && (
            <div className="mt-10 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg border">
              {defamation && (
                <div
                  className={`mb-6 p-5 rounded-xl text-white font-bold text-center text-2xl shadow-lg ${
                    isDefamatory ? 'bg-red-600' : 'bg-green-600'
                  }`}
                >
                  {isDefamatory
                    ? `⚠️ DEFAMATORY CONTENT DETECTED – ${(confidence * 100).toFixed(1)}% CONFIDENCE`
                    : `✅ NO DEFAMATION – ${(confidence * 100).toFixed(1)}% CONFIDENCE`}
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-800 mb-5 text-center">
                Retrieved Evidence
              </h3>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <p><strong>Evidence ID:</strong> {retrievedEvidence.evidence_id || retrievedEvidence.id || 'N/A'}</p>
                <p><strong>Post ID:</strong> {retrievedEvidence.id || 'N/A'}</p>
                <p><strong>Author:</strong> @{retrievedEvidence.author_username || 'N/A'}</p>
                <p><strong>Investigator:</strong> {retrievedEvidence.investigator || 'N/A'}</p>
                <p><strong>Timestamp:</strong> {retrievedEvidence.created_at || retrievedEvidence.timestamp || 'N/A'}</p>
              </div>

              <div className="mt-4">
                <p className="font-medium text-gray-800 mb-2"><strong>Content:</strong></p>
                <p className="bg-white p-4 rounded-lg border shadow-sm break-words">
                  {retrievedEvidence.text || retrievedEvidence.content || 'No content'}
                </p>
              </div>

              {ethTxHash && (
                <div className="mt-5 text-center">
                  <p className="font-medium text-gray-700">Ethereum Transaction:</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${ethTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline break-all text-sm"
                  >
                    {ethTxHash}
                  </a>
                </div>
              )}

              {retrievedEvidence.media_urls?.length > 0 && (
                <div className="mt-6">
                  <p className="font-medium text-gray-800 mb-3">Attached Media:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {retrievedEvidence.media_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Evidence media ${i + 1}`}
                        className="w-full h-auto rounded-xl shadow-md border"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
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
