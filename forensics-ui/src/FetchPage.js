import React, { useState } from 'react';
import axios from 'axios';

function FetchPage() {
  const [postId, setPostId] = useState('');
  const [fetchedPost, setFetchedPost] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [storedResult, setStoredResult] = useState(null);

  const handleFetchPost = async (e) => {
    e.preventDefault();
    if (!postId) {
      setStatus('Error: Please enter a post ID');
      return;
    }
    setStatus('Fetching post...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/fetch-x-post', 
        { post_id: postId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Fetch post response:', response.data);
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setFetchedPost(null);
      } else {
        setFetchedPost(response.data);
        setStatus('Success: Post fetched');
      }
    } catch (error) {
      console.error('Fetch post error:', error.response?.data || error.message);
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
      setFetchedPost(null);
    }
  };

  const handleStoreEvidence = async () => {
    if (!fetchedPost) {
      setStatus('Error: No post fetched to store');
      return;
    }
    setStatus('Storing evidence to blockchain...');
    try {
      const token = localStorage.getItem('token');
      const evidence = {
        evidence: {
          id: fetchedPost.id,
          content: fetchedPost.text,
          author_username: fetchedPost.author_username,
          created_at: fetchedPost.created_at,
          media_urls: fetchedPost.media_urls
        }
      };
      const response = await axios.post('http://localhost:5000/store-evidence', evidence, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Store evidence response:', response.data);
      setStoredResult({
        evidence_id: response.data.evidence_id,
        tx_hash: response.data.tx_hash,
        eth_tx_hash: response.data.eth_tx_hash
      });
      setStatus(`Success: Stored with Evidence ID: ${response.data.evidence_id}`);
    } catch (error) {
      console.error('Store evidence error:', error.response?.data || error.message);
      setStatus(`Error storing evidence: ${error.response?.data?.error || error.message}`);
      setStoredResult(null);
    }
  };

  const defamation = fetchedPost?.defamation;
  const isDefamatory = defamation?.is_defamatory;
  const confidence = defamation?.confidence || 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Fetch X Post</h2>
      <form onSubmit={handleFetchPost}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Post ID</label>
          <input
            type="text"
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            placeholder="Enter post ID (e.g., 1978725344212336951)"
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Fetch Post
        </button>
      </form>

      {fetchedPost && (
        <div className="mt-6 p-4 bg-white border rounded-lg shadow-sm">
          {defamation && (
            <div className={`mb-4 p-4 rounded-lg text-white font-bold text-center text-lg ${isDefamatory ? 'bg-red-600' : 'bg-green-600'}`}>
              {isDefamatory 
                ? `HIGH RISK – DEFAMATORY CONTENT DETECTED (${(confidence * 100).toFixed(1)}% confidence)` 
                : `LOW RISK – No defamation detected (${(confidence * 100).toFixed(1)}% confidence)`
              }
            </div>
          )}

          <h3 className="text-xl font-bold mb-2">Fetched Post</h3>
          <p className="mb-2"><strong>Post ID:</strong> {fetchedPost.id || 'N/A'}</p>
          <p className="mb-2"><strong>Content:</strong> {fetchedPost.text || 'N/A'}</p>
          <p className="mb-2"><strong>Author:</strong> {fetchedPost.author_username || 'N/A'}</p>
          <p className="mb-2"><strong>Created:</strong> {fetchedPost.created_at || 'N/A'}</p>
          
          {fetchedPost.media_urls?.length > 0 && (
            <div className="mb-2">
              <strong>Media:</strong>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {fetchedPost.media_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Media ${i}`}
                    className="max-w-full h-auto rounded"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleStoreEvidence}
            className={`w-full text-white p-3 rounded mt-4 font-bold transition-all ${
              isDefamatory 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isDefamatory ? 'STORE HIGH-RISK EVIDENCE NOW' : 'Store to Blockchain (Optional)'}
          </button>
        </div>
      )}

      {storedResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="font-bold text-green-600">Evidence Successfully Stored!</p>
          <p><strong>Evidence ID:</strong> {storedResult.evidence_id}</p>
          <p><strong>Contract Tx Hash:</strong> {storedResult.tx_hash}</p>
          <p><strong>Ethereum Tx Hash:</strong> 
            <a 
              href={`https://sepolia.etherscan.io/tx/${storedResult.eth_tx_hash}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:underline"
            >
              {storedResult.eth_tx_hash}
            </a>
          </p>
        </div>
      )}

      <p className="mt-4 text-sm">Status: {status}</p>
    </div>
  );
}

export default FetchPage;