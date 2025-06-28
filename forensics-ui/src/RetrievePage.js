import React, { useState } from 'react';
import axios from 'axios';

function RetrievePage() {
  const [evidenceId, setEvidenceId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [retrievedEvidence, setRetrievedEvidence] = useState(null);
  const [status, setStatus] = useState('Ready');

  const handleFetchEvidence = async (e) => {
    e.preventDefault();
    if (!txHash) {
      setStatus('Error: Please enter a transaction ID');
      return;
    }
    setStatus('Collecting...');
    try {
      const token = localStorage.getItem('token');
      const normalizedTxHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
      const response = await axios.post('http://localhost:5000/fetch-evidence', 
        { tx_hash: normalizedTxHash },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Fetch evidence response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setEvidenceId('');
      } else {
        setEvidenceId(response.data.evidence_id.toString());
        setStatus('Success: Evidence ID fetched');
      }
    } catch (error) {
      console.error('Fetch evidence error:', error.response?.data || error.message); // Debug
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
      setEvidenceId('');
    }
  };

  const handleRetrieveEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceId || isNaN(evidenceId)) {
      setStatus('Error: Please enter a valid evidence ID');
      return;
    }
    setStatus('Retrieving evidence...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/get-evidence', 
        { evidence_id: evidenceId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Retrieve response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setRetrievedEvidence(null);
      } else {
        setRetrievedEvidence(response.data);
        setStatus('Success: Evidence retrieved');
      }
    } catch (error) {
      console.error('Retrieve error:', error.response?.data || error.message); // Debug
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
      setRetrievedEvidence(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Retrieve Evidence</h2>
      <form onSubmit={handleRetrieveEvidence}>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Enter transaction ID (e.g., 0x... or without 0x)"
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="button"
          onClick={handleFetchEvidence}
          className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 mb-4"
        >
          Fetch Evidence ID
        </button>
        <input
          type="text"
          value={evidenceId}
          onChange={(e) => setEvidenceId(e.target.value)}
          placeholder="Enter evidence ID (e.g., 0, populated after fetch)"
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
        >
          Retrieve Evidence
        </button>
      </form>
      <p className="mt-4 text-sm">Status: {status}</p>
      {retrievedEvidence && retrievedEvidence.data && (
        <div className="mt-6 p-4 bg-white border rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-2">Retrieved Evidence</h3>
          <p className="mb-2"><strong>Evidence ID:</strong> {retrievedEvidence.id}</p>
          <p className="mb-2"><strong>Post ID:</strong> {retrievedEvidence.data.id || 'N/A'}</p>
          <p className="mb-2"><strong>Text:</strong> {retrievedEvidence.data.text || 'N/A'}</p>
          <p className="mb-2"><strong>Author:</strong> {retrievedEvidence.data.author_username || 'N/A'}</p>
          {retrievedEvidence.data.created_at && (
            <p className="mb-2"><strong>Created At:</strong> {new Date(retrievedEvidence.data.created_at).toLocaleString()}</p>
          )}
          {retrievedEvidence.data.media_urls?.length > 0 && (
            <div className="mb-2">
              <strong>Media URLs:</strong>
              <ul className="list-disc pl-5">
                {retrivedEvidence.data.media_urls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RetrievePage;