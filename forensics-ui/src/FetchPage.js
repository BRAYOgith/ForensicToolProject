import React, { useState } from 'react';
import axios from 'axios';

function FetchPage() {
  const [postId, setPostId] = useState('');
  const [inputText, setInputText] = useState('');
  const [fetchedPost, setFetchedPost] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [storedResult, setStoredResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:5000'; // Change to production Render URL later

  const handleFetchPost = async (e) => {
    e.preventDefault();
    setStatus('');
    setFetchedPost(null);
    setSearchResults([]);
    setStoredResult(null);
    setLoading(true);

    if (!postId.trim() && !inputText.trim()) {
      setStatus('Error: Please enter a Post ID or text to search');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      let fetchedData;

      if (postId.trim()) {
        // Fetch by Post ID
        setStatus('Fetching post by ID...');
        const response = await axios.post(
          `${API_BASE}/fetch-x-post`,
          { post_id: postId.trim() },
          { headers }
        );
        fetchedData = response.data;
      } else {
        // Search by text
        setStatus('Searching X for matching posts...');
        const searchResponse = await axios.post(
          `${API_BASE}/search-x-posts`,
          { query: inputText.trim() },
          { headers }
        );

        const posts = searchResponse.data.posts || [];
        if (posts.length === 0) {
          setStatus('No posts found matching the text');
          setLoading(false);
          return;
        }

        if (posts.length > 1) {
          setSearchResults(posts);
          setStatus(`Found ${posts.length} matching posts. Click one to fetch full details.`);
          setLoading(false);
          return;
        }

        // Auto-fetch first (best) match
        const bestMatchId = posts[0].post_id;
        setStatus('Fetching full post details...');
        const fetchResponse = await axios.post(
          `${API_BASE}/fetch-x-post`,
          { post_id: bestMatchId },
          { headers }
        );
        fetchedData = fetchResponse.data;
      }

      if (fetchedData.error) {
        setStatus(`Error: ${fetchedData.error}`);
      } else {
        setFetchedPost(fetchedData);
        setStatus('Success: Post fetched and analyzed');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      const msg = error.response?.data?.error || error.message || 'Network error';
      setStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = async (selectedPostId) => {
    setPostId(selectedPostId);
    setSearchResults([]);
    setStatus('Fetching selected post...');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/fetch-x-post`,
        { post_id: selectedPostId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
      } else {
        setFetchedPost(response.data);
        setStatus('Success: Selected post fetched');
      }
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreEvidence = async () => {
    if (!fetchedPost) return;

    setStatus('Storing evidence to blockchain...');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const evidence = {
        evidence: {
          id: fetchedPost.id,
          content: fetchedPost.text,
          author_username: fetchedPost.author_username,
          created_at: fetchedPost.created_at,
          media_urls: fetchedPost.media_urls || [],
          defamation: fetchedPost.defamation  // Include AI result
        }
      };

      const response = await axios.post(`${API_BASE}/store-evidence`, evidence, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStoredResult({
        evidence_id: response.data.evidence_id,
        tx_hash: response.data.tx_hash,
        eth_tx_hash: response.data.eth_tx_hash
      });
      setStatus(`Success: Stored with Evidence ID: ${response.data.evidence_id}`);
    } catch (error) {
      console.error('Store error:', error);
      setStatus(`Error storing: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const defamation = fetchedPost?.defamation;
  const isDefamatory = defamation?.is_defamatory;
  const confidence = defamation?.confidence || 0;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-2xl rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Fetch & Analyze X Post
          </h2>

          <form onSubmit={handleFetchPost} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post ID (optional)
              </label>
              <input
                type="text"
                value={postId}
                onChange={(e) => setPostId(e.target.value)}
                placeholder="e.g., 1978725344212336951"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Search by Text Content
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter any text from the post to search X..."
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-70"
            >
              {loading ? 'Processing...' : 'Fetch & Analyze Post'}
            </button>
          </form>

          <p className="mt-6 text-center text-lg font-medium text-gray-700">
            Status: <span className="text-blue-600">{status}</span>
          </p>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Search Results (Click to Fetch)</h3>
              <div className="space-y-4">
                {searchResults.map((post) => (
                  <div
                    key={post.post_id}
                    onClick={() => handleSelectSearchResult(post.post_id)}
                    className="bg-gray-50 p-4 rounded-lg border cursor-pointer hover:bg-gray-100 transition"
                  >
                    <p className="font-medium">Post ID: {post.post_id}</p>
                    <p className="text-sm text-gray-600 mt-1">"{post.text}"</p>
                    <p className="text-xs text-gray-500 mt-2">by @{post.author_username} • {post.created_at}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fetched Post Display */}
          {fetchedPost && (
            <div className="mt-10 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border">
              {defamation && (
                <div
                  className={`mb-8 p-6 rounded-2xl text-white font-bold text-center text-2xl shadow-xl ${
                    isDefamatory ? 'bg-red-600' : 'bg-green-600'
                  }`}
                >
                  {isDefamatory
                    ? `⚠️ HIGH RISK: DEFAMATORY CONTENT DETECTED (${(confidence * 100).toFixed(1)}% confidence)`
                    : `✅ LOW RISK: No defamation detected (${(confidence * 100).toFixed(1)}% confidence)`}
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Fetched & Analyzed Post
              </h3>

              <div className="grid md:grid-cols-2 gap-6 text-lg">
                <p><strong>Post ID:</strong> {fetchedPost.id || 'N/A'}</p>
                <p><strong>Author:</strong> @{fetchedPost.author_username || 'N/A'}</p>
                <p><strong>Created:</strong> {fetchedPost.created_at || 'N/A'}</p>
              </div>

              <div className="mt-6">
                <p className="font-bold text-gray-800 mb-3">Content:</p>
                <div className="bg-white p-6 rounded-xl border shadow-inner text-gray-700 leading-relaxed">
                  {fetchedPost.text || 'N/A'}
                </div>
              </div>

              {fetchedPost.media_urls?.length > 0 && (
                <div className="mt-8">
                  <p className="font-bold text-gray-800 mb-4">Media ({fetchedPost.media_urls.length}):</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {fetchedPost.media_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Media ${i + 1}`}
                        className="w-full h-auto rounded-xl shadow-lg border hover:scale-105 transition-transform"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStoreEvidence}
                disabled={loading}
                className={`w-full mt-10 text-white font-bold py-4 rounded-xl text-xl transition-all ${
                  isDefamatory
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-300'
                    : 'bg-green-600 hover:bg-green-700 shadow-green-300'
                } disabled:opacity-70`}
              >
                {loading ? 'Storing...' : isDefamatory ? 'STORE HIGH-RISK EVIDENCE NOW' : 'Store Evidence to Blockchain'}
              </button>
            </div>
          )}

          {/* Stored Result */}
          {storedResult && (
            <div className="mt-10 p-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-200">
              <h3 className="text-2xl font-bold text-green-800 mb-6 text-center">
                Evidence Successfully Stored on Blockchain!
              </h3>
              <div className="space-y-4 text-lg">
                <p><strong>Evidence ID:</strong> {storedResult.evidence_id}</p>
                <p><strong>Contract Tx Hash:</strong> {storedResult.tx_hash}</p>
                <p><strong>Ethereum Tx Hash:</strong></p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${storedResult.eth_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all block"
                >
                  {storedResult.eth_tx_hash}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FetchPage;
