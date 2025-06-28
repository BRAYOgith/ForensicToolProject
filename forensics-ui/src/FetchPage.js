import React, { useState } from 'react';
import axios from 'axios';

function FetchPage() {
  const [postId, setPostId] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);

  const handleFetchPost = async (e) => {
    e.preventDefault();
    if (!postId && !text.trim()) {
      setStatus('Error: Please enter a post ID or post text');
      return;
    }
    setStatus('Fetching...');
    try {
      const token = localStorage.getItem('token');
      let finalPostId = postId;
      if (!postId && text.trim()) {
        setStatus('Searching for post ID...');
        const searchResponse = await axios.post('http://localhost:5000/search-x-post', 
          { content: text.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Search response:', searchResponse.data); // Debug
        if (searchResponse.data.error) {
          setStatus(`Error: ${searchResponse.data.error}${searchResponse.data.error.includes('Service Unavailable') ? ' - Please try again later.' : ''}`);
          setResult(null);
          setText('');
          return;
        }
        finalPostId = searchResponse.data.id;
        setPostId(finalPostId);
      }
      const payload = { post_id: finalPostId, input_text: text.trim() || '' };
      const response = await axios.post('http://localhost:5000/fetch-x-post', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetch response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
        setResult(null);
        setText('');
      } else {
        if (!text.trim()) {
          setText(response.data.text);
        }
        const verified = text.trim() ? !response.data.text_mismatch : null;
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
      setStatus(`Error: ${error.response?.data?.error || error.message}${error.response?.data?.error?.includes('Service Unavailable') ? ' - Please try again later.' : ''}`);
      setResult(null);
      setText('');
    }
  };

  const handleStorePost = async () => {
    if (!result) {
      setStatus('Error: No post to store');
      return;
    }
    setStatus('Storing...');
    try {
      const token = localStorage.getItem('token');
      const evidence = {
        id: result.id,
        text: text.trim() || result.text,
        author_username: result.author_username,
        created_at: result.created_at,
        author_id: result.author_id,
        media_urls: result.media_urls || []
      };
      const response = await axios.post('http://localhost:5000/store-evidence', {
        evidence: JSON.stringify(evidence)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Store response:', response.data); // Debug
      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
      } else {
        setStatus(`Success: Stored with hash ${response.data.transactionHash}, Evidence ID: ${response.data.evidenceId}`);
        setResult({
          ...result,
          transactionHash: response.data.transactionHash,
          evidenceId: response.data.evidenceId
        });
      }
    } catch (error) {
      console.error('Store error:', error.response?.data || error.message); // Debug
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Fetch & Store Post</h2>
      <form onSubmit={handleFetchPost}>
        <input
          type="text"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          placeholder="Enter X post ID (e.g., from https://x.com/amerix)"
          className="w-full p-2 mb-4 border rounded"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter post text (optional, will be populated after fetch)"
          rows="6"
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Fetch and Verify Post
        </button>
      </form>
      {result && (
        <button
          onClick={handleStorePost}
          className="w-full mt-4 bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Store on Blockchain
        </button>
      )}
      <p className="mt-4 text-sm">Status: {status}</p>
      {result && (
        <div className="mt-6 p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center mb-2">
            <span className="font-bold">@{result.author_username}</span>
            <span className="ml-2 text-gray-500 text-sm">
              {new Date(result.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mb-2"><strong>Fetched Text:</strong> {result.text}</p>
          {result.input_text && (
            <p className="mb-2"><strong>User-Provided Text:</strong> {result.input_text}</p>
          )}
          {result.media_urls?.length > 0 && (
            <div className="mb-2">
              <strong>Media URLs:</strong>
              <ul className="list-disc pl-5">
                {result.media_urls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-gray-500">Post ID: {result.id}</p>
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
          {status.includes('Error') && (
            <p className="text-sm text-red-500 mt-2">
              {status.includes('Post not found') ? (
                <>
                  Try finding a recent public post at{' '}
                  <a href="https://x.com/amerix" target="_blank" rel="noopener noreferrer" className="underline">
                    x.com/amerix
                  </a>{' '}
                  or{' '}
                  <a href="https://x.com/citizentvkenya" target="_blank" rel="noopener noreferrer" className="underline">
                    x.com/citizentvkenya
                  </a>{' '}
                  and copy the post ID from the URL.
                </>
              ) : (
                'If the error persists, check the backend logs or ensure your wallet has sufficient Sepolia ETH.'
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default FetchPage;