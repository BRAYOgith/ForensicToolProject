import React, { useState } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [postId, setPostId] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);
  const [evidenceId, setEvidenceId] = useState('');
  const [retrievedEvidence, setRetrievedEvidence] = useState(null);

  const handleFetchPost = async (e) => {
    e.preventDefault();
    if (!postId) {
      setStatus('Error: Please enter a post ID');
      return;
    }
    setStatus('Fetching...');
    try {
      const payload = { post_id: postId };
      if (text.trim()) {
        payload.text = text.trim();
      }
      const response = await axios.post('http://localhost:5000/fetch-x-post', payload);
      console.log('Fetch response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setResult(null);
        setText('');
      } else {
        setText(response.data.post.text);
        const verified = text.trim() ? text.trim() === response.data.post.text.trim() : null;
        setResult({ ...response.data, verified });
        setStatus(
          verified === null
            ? 'Success: Post fetched, text populated'
            : verified
            ? 'Success: Verified X post'
            : 'Warning: Text does not match post'
        );
      }
    } catch (error) {
      console.error('Fetch error:', error.response?.data || error.message); // Debug
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
      setResult(null);
      setText('');
    }
  };

  const handleStorePost = async () => {
    if (!result || !result.post) {
      setStatus('Error: No post to store');
      return;
    }
    setStatus('Storing...');
    try {
      const response = await axios.post('http://localhost:5000/store-evidence', {
        evidence: JSON.stringify(result.post)
      });
      console.log('Store response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
      } else {
        setStatus(`Success: Stored with hash ${response.data.transactionHash}`);
        setResult({
          ...result,
          transactionHash: response.data.transactionHash,
          evidenceId: response.data.evidenceId
        });
        if (response.data.evidenceId !== null && response.data.evidenceId !== undefined) {
          setEvidenceId(response.data.evidenceId.toString()); // Pre-fill retrieval input
        }
      }
    } catch (error) {
      console.error('Store error:', error.response?.data || error.message); // Debug
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleRetrieveEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceId || isNaN(evidenceId)) {
      setStatus('Error: Please enter a valid evidence ID');
      return;
    }
    setStatus('Retrieving...');
    try {
      const response = await axios.get(`http://localhost:5000/get-evidence?id=${evidenceId}`);
      console.log('Retrieve response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setRetrievedEvidence(null);
      } else {
        setStatus('Success: Evidence retrieved');
        setRetrievedEvidence(response.data);
      }
    } catch (error) {
      console.error('Retrieve error:', error.response?.data || error.message); // Debug
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
      setRetrievedEvidence(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">ForensicTool</h1>
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        {/* Fetch and Verify Section */}
        <form onSubmit={handleFetchPost}>
          <input
            type="text"
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            placeholder="Enter X post ID"
            className="w-full p-2 mb-4 border rounded"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter post text (optional, will be populated after fetch)"
            rows="4"
            className="w-full p-2 mb-4 border rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Fetch and Verify Post
          </button>
        </form>
        {result && result.post && (
          <button
            onClick={handleStorePost}
            className="w-full mt-4 bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            Store on Blockchain
          </button>
        )}

        {/* Retrieve Evidence Section */}
        <form onSubmit={handleRetrieveEvidence} className="mt-6">
          <input
            type="text"
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            placeholder="Enter evidence ID (e.g., 0)"
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

        {/* Display Fetched/Stored Post */}
        {result && result.post && (
          <div className="mt-6 p-4 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <span className="font-bold">@{result.post.author_username}</span>
              <span className="ml-2 text-gray-500 text-sm">
                {new Date(result.post.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mb-2">{result.post.text}</p>
            <p className="text-sm text-gray-500">Post ID: {result.post.id}</p>
            {result.verified !== undefined && (
              <p className={`text-sm ${result.verified ? 'text-green-500' : result.verified === null ? 'text-gray-500' : 'text-red-500'}`}>
                {result.verified
                  ? 'Verified: This is a valid X post'
                  : result.verified === null
                  ? 'Verification Skipped: Text populated automatically'
                  : 'Not Verified: Text does not match post'}
              </p>
            )}
            {result.transactionHash && (
              <p className="text-sm text-blue-500">Transaction Hash: {result.transactionHash}</p>
            )}
            {result.evidenceId !== undefined && result.evidenceId !== null && (
              <p className="text-sm text-blue-500">Evidence ID: {result.evidenceId}</p>
            )}
            {result.blockchain_error && (
              <p className="text-sm text-red-500">Blockchain Error: {result.blockchain_error}</p>
            )}
          </div>
        )}

        {/* Display Retrieved Evidence */}
        {retrievedEvidence && retrievedEvidence.data && (
          <div className="mt-6 p-4 bg-white border rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2">Retrieved Evidence</h2>
            <p className="mb-2"><strong>Evidence ID:</strong> {retrievedEvidence.id}</p>
            <p className="mb-2"><strong>Post ID:</strong> {retrievedEvidence.data[0]}</p>
            <p className="mb-2"><strong>Text:</strong> {retrievedEvidence.data[1]}</p>
            <p className="mb-2"><strong>Author:</strong> {retrievedEvidence.data[2]}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;