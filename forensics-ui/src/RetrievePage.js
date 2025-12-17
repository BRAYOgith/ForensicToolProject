import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RetrievePage() {
  const [evidenceId, setEvidenceId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [retrievedEvidence, setRetrievedEvidence] = useState(null);
  const [ethTxHash, setEthTxHash] = useState('');
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    if (!txHash) {
      setEvidenceId('');
      setEthTxHash('');
      return;
    }
    const normalizedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedTxHash)) {
      setStatus('Error: Invalid transaction hash format');
      setEvidenceId('');
      setEthTxHash('');
      return;
    }
    const fetchEvidenceId = async () => {
      setStatus('Fetching evidence ID...');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/retrieve-evidence', 
          { transaction_hash: normalizedTxHash },
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
          setStatus('Success: Evidence ID fetched');
        }
      } catch (error) {
        console.error('Fetch evidence ID error:', error.response?.data || error.message);
        setStatus(`Error: ${error.response?.data?.error || error.message}`);
        setEvidenceId('');
        setEthTxHash('');
      }
    };
    const timer = setTimeout(fetchEvidenceId, 500);
    return () => clearTimeout(timer);
  }, [txHash]);

  useEffect(() => {
    if (!evidenceId || isNaN(evidenceId)) {
      setTxHash('');
      setEthTxHash('');
      return;
    }
    const fetchTxHash = async () => {
      setStatus('Fetching transaction hash...');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/get-tx-hash', 
          { evidence_id: evidenceId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.error) {
          setStatus(`Error: ${response.data.error}`);
          setTxHash('');
          setEthTxHash('');
        } else {
          setTxHash(response.data.tx_hash);
          setEthTxHash(response.data.eth_tx_hash || '');
          setStatus('Success: Transaction hash fetched');
        }
      } catch (error) {
        console.error('Fetch tx hash error:', error.response?.data || error.message);
        setStatus(`Error: ${error.response?.data?.error || error.message}`);
        setTxHash('');
        setEthTxHash('');
      }
    };
    const timer = setTimeout(fetchTxHash, 500);
    return () => clearTimeout(timer);
  }, [evidenceId]);

  const handleRetrieve = async (e) => {
    e.preventDefault();
    if (!evidenceId && !txHash) {
      setStatus('Error: Please enter an evidence ID or transaction hash');
      return;
    }
    if (evidenceId && !isNaN(evidenceId)) {
      setStatus('Retrieving evidence by ID...');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/get-evidence', 
          { evidence_id: evidenceId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.error) {
          setStatus(`Error: ${response.data.error}`);
          setRetrievedEvidence(null);
        } else {
          setRetrievedEvidence(response.data.data);
          setStatus('Success: Evidence retrieved by ID');
        }
      } catch (error) {
        console.error('Retrieve by ID error:', error.response?.data || error.message);
        setStatus(`Error: ${error.response?.data?.error || error.message}`);
        setRetrievedEvidence(null);
      }
    } else if (txHash) {
      const normalizedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
      if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedTxHash)) {
        setStatus('Error: Invalid transaction hash format');
        setRetrievedEvidence(null);
        return;
      }
      setStatus('Retrieving evidence by transaction hash...');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/retrieve-evidence', 
          { transaction_hash: normalizedTxHash },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.error) {
          setStatus(`Error: ${response.data.error}`);
          setRetrievedEvidence(null);
        } else {
          setRetrievedEvidence(response.data);
          setEvidenceId(response.data.evidence_id?.toString() || '');
          setStatus('Success: Evidence retrieved by transaction hash');
        }
      } catch (error) {
        console.error('Retrieve by tx hash error:', error.response?.data || error.message);
        setStatus(`Error: ${error.response?.data?.error || error.message}`);
        setRetrievedEvidence(null);
      }
    }
  };

  const defamation = retrievedEvidence?.defamation;
  const isDefamatory = defamation?.is_defamatory;
  const confidence = defamation?.confidence || 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Retrieve Evidence</h2>
      <form onSubmit={handleRetrieve}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Evidence ID</label>
          <input
            type="text"
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            placeholder="Enter evidence ID (e.g., 0)"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Contract Transaction Hash</label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter transaction hash (e.g., 0x...)"
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
        >
          Retrieve Evidence
        </button>
      </form>

      <p className="mt-4 text-sm">Status: {status}</p>

      {retrievedEvidence && (
        <div className="mt-6 p-4 bg-white border rounded-lg shadow-sm">
          {defamation && (
            <div className={`mb-5 p-5 rounded-lg text-white font-bold text-center text-xl shadow-lg ${isDefamatory ? 'bg-red-600' : 'bg-green-600'}`}>
              {isDefamatory 
                ? `DEFAMATORY CONTENT DETECTED – ${(confidence * 100).toFixed(1)}% CONFIDENCE` 
                : `NO DEFAMATION – ${(confidence * 100).toFixed(1)}% CONFIDENCE`
              }
            </div>
          )}

          <h3 className="text-xl font-bold mb-3">Retrieved Evidence</h3>
          <p className="mb-2"><strong>Evidence ID:</strong> {retrievedEvidence.evidence_id || retrievedEvidence.id || 'N/A'}</p>
          <p className="mb-2"><strong>Post ID:</strong> {retrievedEvidence.id || 'N/A'}</p>
          <p className="mb-2"><strong>Content:</strong> {retrievedEvidence.text || retrievedEvidence.content || 'N/A'}</p>
          <p className="mb-2"><strong>Author:</strong> {retrievedEvidence.author_username || 'N/A'}</p>
          <p className="mb-2"><strong>Investigator:</strong> {retrievedEvidence.investigator || 'N/A'}</p>
          <p className="mb-2"><strong>Timestamp:</strong> {retrievedEvidence.created_at || retrievedEvidence.timestamp || 'N/A'}</p>
          
          {ethTxHash && (
            <p className="mb-2">
              <strong>Ethereum Tx Hash:</strong>{' '}
              <a 
                href={`https://sepolia.etherscan.io/tx/${ethTxHash}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:underline"
              >
                {ethTxHash}
              </a>
            </p>
          )}

          {retrievedEvidence.media_urls?.length > 0 && (
            <div className="mb-2">
              <strong>Media:</strong>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {retrievedEvidence.media_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Media ${i}`}
                    className="max-w-full h-auto rounded shadow"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RetrievePage;