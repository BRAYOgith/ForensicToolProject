import React, { useState } from 'react';
import api from './api';

function FetchPage() {
  const [postId, setPostId] = useState('');
  const [inputText, setInputText] = useState('');
  const [fetchedPost, setFetchedPost] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [storedResult, setStoredResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [visualText, setVisualText] = useState('');
  const [isVisualConfirmed, setIsVisualConfirmed] = useState(true);



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
      let fetchedData;

      if (postId.trim()) {
        // Fetch by Post ID
        setStatus('Fetching post by ID...');
        const response = await api.post(
          '/fetch-x-post',
          { post_id: postId.trim() }
        );
        fetchedData = response.data;
      } else {
        // Search by text
        setStatus('Searching X for matching posts...');
        const searchResponse = await api.post(
          '/search-x-posts',
          { query: inputText.trim() }
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
        const fetchResponse = await api.post(
          '/fetch-x-post',
          { post_id: bestMatchId }
        );
        fetchedData = fetchResponse.data;
      }

      if (fetchedData.error) {
        setStatus(`Error: ${fetchedData.error}`);
      } else {
        setFetchedPost(fetchedData);
        if (fetchedData.requires_confirmation) {
          setVisualText(fetchedData.visual_text);
          setIsVisualConfirmed(false);
          setStatus('Visual content detected. Please verify extracted text below.');
        } else {
          setIsVisualConfirmed(true);
          setStatus('Success: Post fetched and analyzed');
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      const msg = error.response?.data?.error || error.message || 'Network error';
      setStatus(`Error: ${msg}`);

      // Trigger proactive chatbot help
      window.dispatchEvent(new CustomEvent('chainforensix_error', {
        detail: {
          message: msg,
          category: error.response?.status === 429 ? 'Rate Limit Exceeded' : 'Fetch Error'
        }
      }));
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
      const response = await api.post(
        '/fetch-x-post',
        { post_id: selectedPostId }
      );

      if (response.data.error) {
        setStatus(`Error: ${response.data.error}`);
      } else {
        const fetchedData = response.data;
        setFetchedPost(fetchedData);
        if (fetchedData.requires_confirmation) {
          setVisualText(fetchedData.visual_text);
          setIsVisualConfirmed(false);
          setStatus('Visual content detected. Please verify extracted text below.');
        } else {
          setIsVisualConfirmed(true);
          setStatus('Success: Selected post fetched');
        }
      }
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndAnalyze = async () => {
    if (!fetchedPost) return;
    setAnalyzing(true);
    setStatus('Running combined forensic analysis...');

    try {
      // Pass both tweet text and visual text for detailed attribution
      const response = await api.post('/analyze-content', {
        tweet_text: fetchedPost.text,
        visual_text: visualText
      });

      // Update the post text with the confirmed visual text for final storage
      // Only append if visual content is not already present to avoid duplicates
      let finalFullText = fetchedPost.text;
      if (visualText && !finalFullText.includes('[Visual Content]:')) {
        finalFullText = `${fetchedPost.text}\n[Visual Content]: ${visualText}`;
      } else if (visualText && finalFullText.includes('[Visual Content]:')) {
        // Replace existing visual content if user updated it
        finalFullText = fetchedPost.text.split('\n[Visual Content]:')[0] + `\n[Visual Content]: ${visualText}`;
      }

      setFetchedPost({
        ...fetchedPost,
        text: finalFullText,
        defamation: response.data
      });
      setIsVisualConfirmed(true);
      setStatus('Success: Content verified and analyzed');
    } catch (error) {
      console.error('Analysis error:', error);
      const msg = error.response?.data?.error || error.message;
      setStatus(`Error analyzing: ${msg}`);

      window.dispatchEvent(new CustomEvent('chainforensix_error', {
        detail: { message: msg, category: 'AI Analysis Error' }
      }));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStoreEvidence = async () => {
    if (!fetchedPost) return;

    setStatus('Storing evidence to blockchain...');
    setLoading(true);

    try {
      const evidence = {
        evidence: {
          id: fetchedPost.id,
          content: fetchedPost.text,
          author_username: fetchedPost.author_username,
          created_at: fetchedPost.created_at,
          media_urls: fetchedPost.media_urls || [],
          engagement: fetchedPost.engagement, // Inclusion of engagement for storage
          defamation: fetchedPost.defamation  // Include AI result
        }
      };

      const response = await api.post('/store-evidence', evidence);

      setStoredResult({
        evidence_id: response.data.evidence_id,
        tx_hash: response.data.tx_hash,
        eth_tx_hash: response.data.eth_tx_hash
      });
      setStatus(`Success: Stored with Evidence ID: ${response.data.evidence_id}`);
    } catch (error) {
      console.error('Store error:', error);
      const msg = error.response?.data?.error || error.message;
      setStatus(`Error storing: ${msg}`);

      window.dispatchEvent(new CustomEvent('chainforensix_error', {
        detail: { message: msg, category: 'Blockchain Storage Error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const defamation = fetchedPost?.defamation;
  const isDefamatory = defamation?.is_defamatory;
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
              Forensic Analysis
            </h2>
            <p className="text-[var(--accent-cyan)] font-mono text-xs tracking-widest uppercase italic">X (Twitter) Scraper & AI Audit</p>
          </header>

          <form onSubmit={handleFetchPost} className="space-y-6">
            <div className="group">
              <label htmlFor="postId" className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">
                X Post ID
              </label>
              <input
                id="postId"
                type="text"
                value={postId}
                onChange={(e) => setPostId(e.target.value)}
                placeholder="e.g., 1978725344212336951"
                aria-label="X Post ID"
                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent text-[var(--text-primary)] placeholder-gray-600 transition-all shadow-inner"
              />
            </div>

            <div className="relative group">
              <label htmlFor="inputText" className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">
                Search by Content
              </label>
              <textarea
                id="inputText"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text from the post to search X..."
                rows="3"
                aria-label="Search content"
                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-gray-700 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-600 resize-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0A192F] font-bold py-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 transform hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2" role="status">
                  <div className="w-4 h-4 border-2 border-[#0A192F] border-t-transparent rounded-full animate-spin"></div>
                  SCROLLING X...
                </span>
              ) : 'INITIALIZE FORENSIC FETCH'}
            </button>
          </form>

          {status && (
            <div
              role="alert"
              aria-live="polite"
              className={`mt-8 p-4 bg-[var(--bg-color)]/50 border rounded-xl text-center ${status.toLowerCase().includes('error') ? 'border-red-500/50' : 'border-gray-800'}`}
            >
              <p className="text-gray-400 text-sm font-mono uppercase">
                Console Output: <span className={`${status.toLowerCase().includes('error') ? 'text-red-400' : 'text-cyan-400'} ml-2`}>{status}</span>
              </p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-10 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-cyan-400">●</span> Matching Targets Found
              </h3>
              <div className="space-y-4" role="list">
                {searchResults.map((post) => (
                  <div
                    key={post.post_id}
                    onClick={() => handleSelectSearchResult(post.post_id)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectSearchResult(post.post_id)}
                    role="button"
                    tabIndex="0"
                    aria-label={`Select post by ${post.author_username}`}
                    className="bg-[var(--bg-color)] p-4 rounded-2xl border border-gray-700 cursor-pointer hover:border-cyan-500/50 hover:bg-[#112240] transition-all group shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-cyan-400 text-xs font-mono">@{post.author_username}</span>
                      <span className="text-gray-500 text-[10px]">{post.created_at}</span>
                    </div>
                    <p className="text-gray-300 text-sm italic">"{post.text}"</p>
                    {post.engagement && (
                      <div className="mt-2 flex gap-4 text-[9px] text-gray-500 font-mono">
                        <span>L: {post.engagement.likes}</span>
                        <span>R: {post.engagement.retweets}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fetched Post Display */}
          {fetchedPost && (
            <div className="mt-12 animate-slide-up">
              <div className="border-t border-gray-800 pt-10">

                {/* Visual Verification Stage */}
                {!isVisualConfirmed && fetchedPost.requires_confirmation && (
                  <div className="mb-10 p-6 bg-cyan-950/20 border-2 border-cyan-500/30 rounded-3xl animate-pulse-slow">
                    <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      FORENSIC MEDIA SCAN: {
                        fetchedPost.visual_status === 'service_unavailable' ? 'SERVICE INITIALIZING' :
                          fetchedPost.visual_status === 'no_text_detected' ? 'NO TEXT FOUND' : 'ACTION REQUIRED'
                      }
                    </h4>
                    {fetchedPost.visual_status === 'service_unavailable' ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mb-4 text-xs text-blue-200">
                        The OCR service is still initializing (downloading models) or failed to start. You can manually enter text from the image here or proceed with tweet analysis.
                      </div>
                    ) : fetchedPost.visual_status === 'no_text_detected' ? (
                      <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl mb-4 text-xs text-orange-200">
                        The system scanned the attached media but found no readable text. Proceeding will analyze only the Tweet content.
                      </div>
                    ) : (
                      <p className="text-gray-400 text-[10px] mb-4 italic leading-tight">
                        AI identified text inside media attachments. Review the extraction below for forensic accuracy before proceeding.
                      </p>
                    )}
                    <textarea
                      value={visualText}
                      onChange={(e) => setVisualText(e.target.value)}
                      className="w-full px-5 py-4 bg-black/40 border border-cyan-500/20 rounded-2xl text-cyan-50 focus:ring-2 focus:ring-cyan-500 transition-all mb-4 min-h-[100px] text-sm"
                      placeholder={
                        fetchedPost.visual_status === 'service_unavailable' ? "Waiting for service... or enter manual transcript" :
                          fetchedPost.visual_status === 'no_text_detected' ? "Optional: Add manual notes or transcript..." : "OCR results..."
                      }
                    />
                    <button
                      onClick={handleConfirmAndAnalyze}
                      disabled={analyzing || loading}
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl transition-all shadow-lg"
                    >
                      {analyzing ? 'RUNNING AI MODEL...' : 'CONFIRM & ANALYZE CONTENT'}
                    </button>
                  </div>
                )}

                {isVisualConfirmed && defamation && (
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
                        <h4 className="text-sm uppercase tracking-[0.2em] mb-2 opacity-80">Final AI Forensic Verdict</h4>
                        <p className="text-3xl font-black mb-2">
                          {category === 'Hate Speech' ? 'LEGAL FLAG: HATE SPEECH (NCIC)' :
                            category === 'Defamatory' ? 'SYSTEM FLAG: DEFAMATORY CONTENT' :
                              'SYSTEM STATUS: NEUTRAL / CLEAR'}
                        </p>
                        <p className="font-mono text-xs mb-4">PRIMARY CONFIDENCE: {(confidence * 100).toFixed(2)}%</p>

                        {defamation.evidence_source && (
                          <div className="inline-block mb-4 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[10px] uppercase tracking-widest">
                            Primary Evidence Source: <span className="text-cyan-300 font-bold ml-1">{defamation.evidence_source}</span>
                          </div>
                        )}

                        <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl text-left border border-white/10">
                          <p className="text-sm leading-relaxed mb-0 font-medium italic opacity-90">
                            "{defamation.justification}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Score Breakdown */}
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
                          <p className="text-[9px] text-gray-600 mt-2 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                            {defamation.all_justifications[key]}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                      <p className="text-[10px] text-cyan-400/80 font-mono italic">
                        <span className="font-bold uppercase mr-2">Technical Engine Note:</span>
                        {defamation.technical_justification}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Subject Profile</label>
                    <p className="text-white font-bold text-lg">@{fetchedPost.author_username || 'N/A'}</p>
                  </div>
                  <div className="bg-[var(--bg-color)] p-5 rounded-2xl border border-gray-800 shadow-inner">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Timestamp</label>
                    <p className="text-white font-bold text-lg">{fetchedPost.created_at || 'N/A'}</p>
                  </div>
                </div>

                {fetchedPost.engagement && (
                  <div className="mb-8">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-4 block">Engagement Metrics (X Free Tier)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Retweets', value: fetchedPost.engagement.retweets },
                        { label: 'Replies', value: fetchedPost.engagement.replies },
                        { label: 'Likes', value: fetchedPost.engagement.likes },
                        { label: 'Views', value: fetchedPost.engagement.views }
                      ].map((stat, i) => (
                        <div key={i} className="bg-[var(--bg-color)] p-4 rounded-xl border border-gray-800 text-center shadow-inner">
                          <p className="text-[9px] text-gray-500 uppercase mb-1">{stat.label}</p>
                          <p className="text-white font-black text-lg">{stat.value?.toLocaleString() || '0'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[var(--bg-color)] p-8 rounded-3xl border border-gray-800 shadow-inner mb-10">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 block">Scraped Raw Content</label>
                  <p className="text-gray-300 leading-relaxed italic">
                    "{fetchedPost.text || 'No text content found.'}"
                  </p>
                </div>

                {fetchedPost.media_urls?.length > 0 && (
                  <div className="mb-10">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-4 block">Secured Media ({fetchedPost.media_urls.length})</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {fetchedPost.media_urls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-800 shadow-lg group">
                          <img
                            src={url}
                            alt={`Media ${i + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => (e.target.closest('.group').style.display = 'none')}
                          />
                          <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStoreEvidence}
                  disabled={loading}
                  className={`w-full py-5 rounded-2xl text-xl font-black transition-all shadow-2xl relative overflow-hidden group ${isDefamatory
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
                    } disabled:opacity-50`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : 'SECURE ON BLOCKCHAIN'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Stored Result */}
          {storedResult && (
            <div className="mt-12 p-8 bg-cyan-500/5 border-2 border-cyan-500/30 rounded-3xl shadow-cyan-900/20 animate-pulse-slow">
              <h3 className="text-2xl font-black text-cyan-400 mb-6 text-center uppercase tracking-tighter">
                Evidence Immutable & Secured
              </h3>
              <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                  <span className="text-gray-500 uppercase">Evidence UID</span>
                  <span className="text-white text-right">{storedResult.evidence_id}</span>
                </div>
                <div>
                  <span className="text-gray-500 uppercase block mb-1">Blockchain Hash</span>
                  <p className="text-gray-400 break-all bg-[var(--bg-color)] p-3 rounded-lg border border-gray-800 text-[10px]">{storedResult.tx_hash}</p>
                </div>
                <div>
                  <span className="text-gray-500 uppercase block mb-1">Ethereum Verification (Sepolia)</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${storedResult.eth_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline break-all block text-[10px]"
                  >
                    {storedResult.eth_tx_hash}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FetchPage;