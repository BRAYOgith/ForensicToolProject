import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://chainforensix-api.onrender.com';

// Simple markdown-like rendering for bot messages
function renderBotText(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        // Bold **text**
        let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (rendered.trim().startsWith('•') || rendered.trim().startsWith('-')) {
            return <p key={i} style={{ margin: '2px 0', paddingLeft: '8px' }} dangerouslySetInnerHTML={{ __html: rendered }} />;
        }
        if (rendered.trim() === '---') {
            return <hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }} />;
        }
        if (rendered.trim() === '') return <br key={i} />;
        return <p key={i} style={{ margin: '2px 0' }} dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
}

const QUICK_ACTIONS = [
    { label: 'How it works', message: 'How does it work?' },
    { label: 'Help with error', message: 'I have an error' },
    { label: 'Talk to expert', message: 'Talk to expert' },
    { label: 'Schedule call', message: 'Schedule appointment' },
];

function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId] = useState(() => 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    const [hasGreeted, setHasGreeted] = useState(false);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [showEscalateForm, setShowEscalateForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', topic: '', preferred_date: '', preferred_time: '', message: '' });
    const [escalateData, setEscalateData] = useState({ name: '', email: '', summary: '' });
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const location = useLocation();

    // Get current page context for error-aware help
    const getPageContext = useCallback(() => {
        const path = location.pathname;
        if (path.startsWith('/analyze')) return 'analyze';
        if (path.startsWith('/retrieve')) return 'retrieve';
        if (path.startsWith('/report')) return 'report';
        if (path.startsWith('/login')) return 'login';
        return '';
    }, [location.pathname]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Auto-greet on first open
    useEffect(() => {
        if (isOpen && !hasGreeted) {
            setHasGreeted(true);
            setMessages([{
                role: 'bot',
                text: "Hi there! I'm the ChainForensix assistant. I can help you navigate the platform, troubleshoot errors, or connect you with an expert.\n\nWhat can I help you with?",
                time: new Date(),
                type: 'info'
            }]);
        }
        if (isOpen) {
            setUnreadCount(0);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, hasGreeted]);

    // Proactive Error Detection listener
    useEffect(() => {
        const handleSystemError = (event) => {
            const { message, category } = event.detail;

            // Auto-open chatbot if it's a critical error or user is authenticated
            setIsOpen(true);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: `I noticed you encountered an error: **${category || 'General Issue'}**\n\n"${message}"\n\nWould you like me to help you troubleshoot this?`,
                time: new Date(),
                type: 'error_help'
            }]);

            // Focus the input so user can reply easily
            setTimeout(() => inputRef.current?.focus(), 500);
        };

        window.addEventListener('chainforensix_error', handleSystemError);
        return () => window.removeEventListener('chainforensix_error', handleSystemError);
    }, []);

    // Proactive Nudge after 20 seconds of inactivity
    useEffect(() => {
        if (hasGreeted) return;

        const nudgeTimer = setTimeout(() => {
            if (!isOpen && !hasGreeted) {
                setUnreadCount(prev => prev + 1);
                setMessages([{
                    role: 'bot',
                    text: "Hey! You've been browsing for a bit. I'm ChainForensix Assistant — how can I help you today?",
                    time: new Date(),
                    type: 'info'
                }]);
                setHasGreeted(true);
            }
        }, 20000); // 20 seconds

        return () => clearTimeout(nudgeTimer);
    }, [isOpen, hasGreeted]);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', text: text.trim(), time: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        setShowScheduleForm(false);
        setShowEscalateForm(false);

        try {
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/chatbot/message`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    message: text.trim(),
                    session_id: sessionId,
                    page_context: getPageContext()
                })
            });

            const data = await res.json();

            // Simulate typing delay for natural feel
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

            const botMsg = {
                role: 'bot',
                text: data.response,
                time: new Date(),
                type: data.type
            };
            setMessages(prev => [...prev, botMsg]);

            if (data.type === 'schedule') setShowScheduleForm(true);
            if (data.type === 'escalate') setShowEscalateForm(true);

            if (!isOpen) setUnreadCount(prev => prev + 1);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "I'm having trouble connecting to the server right now. Please try again in a moment, or email us at briannjoki619@gmail.com for direct support.",
                time: new Date(),
                type: 'error'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        setIsTyping(true);
        try {
            const res = await fetch(`${API_BASE}/chatbot/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...formData, session_id: sessionId })
            });
            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'bot',
                text: data.message || data.error || 'Something went wrong.',
                time: new Date(),
                type: res.ok ? 'schedule_confirmed' : 'error'
            }]);
            if (res.ok) {
                setShowScheduleForm(false);
                setFormData({ name: '', email: '', phone: '', topic: '', preferred_date: '', preferred_time: '', message: '' });
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'bot', text: 'Failed to schedule. Please try again.', time: new Date(), type: 'error'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleEscalateSubmit = async (e) => {
        e.preventDefault();
        if (!escalateData.email) return;

        setIsTyping(true);
        try {
            const conversationSummary = messages.map(m => `[${m.role}] ${m.text}`).join('\n').slice(0, 2000);
            const res = await fetch(`${API_BASE}/chatbot/escalate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...escalateData,
                    summary: escalateData.summary || conversationSummary,
                    session_id: sessionId
                })
            });
            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'bot',
                text: data.message || data.error || 'Something went wrong.',
                time: new Date(),
                type: res.ok ? 'escalated' : 'error'
            }]);
            if (res.ok) {
                setShowEscalateForm(false);
                setEscalateData({ name: '', email: '', summary: '' });
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'bot', text: 'Failed to escalate. Please email briannjoki619@gmail.com directly.', time: new Date(), type: 'error'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {/* Floating Chat Bubble */}
            <button
                id="chatbot-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className="chatbot-bubble"
                aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9999,
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: '#fff',
                    transform: isOpen ? 'scale(0.9) rotate(90deg)' : 'scale(1)',
                }}
            >
                {isOpen ? (
                    '\u2715'
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: '50%'
                    }}>
                        <img src="/logo.png" alt="ChainForensix Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}
                {unreadCount > 0 && !isOpen && (
                    <span style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        background: '#ef4444', color: '#fff', borderRadius: '50%',
                        width: '22px', height: '22px', fontSize: '11px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #0A192F'
                    }}>{unreadCount}</span>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="chatbot-panel"
                    style={{
                        position: 'fixed',
                        bottom: '96px',
                        right: '24px',
                        zIndex: 9998,
                        width: '400px',
                        maxWidth: 'calc(100vw - 48px)',
                        height: '560px',
                        maxHeight: 'calc(100vh - 140px)',
                        borderRadius: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'chatbotSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1)',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px', flexShrink: 0,
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.78.46 3.45 1.27 4.9L2 22l5.1-1.27A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                                <path d="M8 12h.01M12 12h.01M16 12h.01" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>ChainForensix Assistant</div>
                            <div style={{ color: '#06b6d4', fontSize: '11px', fontWeight: 500 }}>
                                <span style={{
                                    display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                                    backgroundColor: '#34d399', marginRight: '5px', verticalAlign: 'middle',
                                    animation: 'chatbotPulse 2s infinite'
                                }}></span>
                                Online
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8',
                                cursor: 'pointer', borderRadius: '8px', width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '16px', transition: 'all 0.2s',
                            }}
                            onMouseOver={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                            onMouseOut={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#94a3b8'; }}
                        >{'\u2715'}</button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        background: 'linear-gradient(180deg, #0A192F 0%, #0d1f3c 50%, #0A192F 100%)',
                    }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                animation: 'chatbotFadeIn 0.3s ease',
                            }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                                        : msg.type === 'error' ? 'rgba(239, 68, 68, 0.15)'
                                            : msg.type === 'schedule_confirmed' || msg.type === 'escalated' ? 'rgba(52, 211, 153, 0.12)'
                                                : 'rgba(255, 255, 255, 0.06)',
                                    color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                                    fontSize: '13px',
                                    lineHeight: '1.5',
                                    border: msg.role === 'user' ? 'none'
                                        : msg.type === 'error' ? '1px solid rgba(239, 68, 68, 0.2)'
                                            : msg.type === 'schedule_confirmed' || msg.type === 'escalated' ? '1px solid rgba(52, 211, 153, 0.2)'
                                                : '1px solid rgba(255, 255, 255, 0.06)',
                                    wordBreak: 'break-word',
                                }}>
                                    {msg.role === 'user' ? msg.text : renderBotText(msg.text)}
                                    <div style={{
                                        fontSize: '10px',
                                        color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#64748b',
                                        marginTop: '4px',
                                        textAlign: msg.role === 'user' ? 'right' : 'left'
                                    }}>
                                        {formatTime(msg.time)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '12px 18px', borderRadius: '16px 16px 16px 4px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    display: 'flex', gap: '5px', alignItems: 'center',
                                }}>
                                    <span className="chatbot-typing-dot" style={{ animationDelay: '0s' }}></span>
                                    <span className="chatbot-typing-dot" style={{ animationDelay: '0.15s' }}></span>
                                    <span className="chatbot-typing-dot" style={{ animationDelay: '0.3s' }}></span>
                                </div>
                            </div>
                        )}

                        {/* Schedule Form */}
                        {showScheduleForm && (
                            <div style={{
                                background: 'rgba(6, 182, 212, 0.06)',
                                border: '1px solid rgba(6, 182, 212, 0.2)',
                                borderRadius: '16px', padding: '16px',
                                animation: 'chatbotFadeIn 0.3s ease',
                            }}>
                                <form onSubmit={handleScheduleSubmit}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#06b6d4', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Schedule Expert Consultation
                                    </div>
                                    {[
                                        { key: 'name', label: 'Full Name', type: 'text', required: true },
                                        { key: 'email', label: 'Email', type: 'email', required: true },
                                        { key: 'phone', label: 'Phone (optional)', type: 'tel', required: false },
                                        { key: 'topic', label: 'Topic', type: 'text', required: false, placeholder: 'e.g., Evidence verification, Legal case' },
                                        { key: 'preferred_date', label: 'Preferred Date', type: 'date', required: false },
                                        { key: 'preferred_time', label: 'Preferred Time', type: 'time', required: false },
                                    ].map(f => (
                                        <div key={f.key} style={{ marginBottom: '8px' }}>
                                            <label style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                                                {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                            </label>
                                            <input
                                                type={f.type}
                                                value={formData[f.key]}
                                                onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                required={f.required}
                                                placeholder={f.placeholder || ''}
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: '8px',
                                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                                    color: '#e2e8f0', fontSize: '13px', outline: 'none',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <textarea
                                        value={formData.message}
                                        onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                        placeholder="Additional details (optional)"
                                        rows={2}
                                        style={{
                                            width: '100%', padding: '8px 10px', borderRadius: '8px',
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#e2e8f0', fontSize: '13px', resize: 'none', outline: 'none',
                                            marginBottom: '10px', boxSizing: 'border-box',
                                        }}
                                    />
                                    <button type="submit" disabled={isTyping} style={{
                                        width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}>
                                        {isTyping ? 'Scheduling...' : 'Confirm Appointment'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Escalation Form */}
                        {showEscalateForm && (
                            <div style={{
                                background: 'rgba(234, 179, 8, 0.06)',
                                border: '1px solid rgba(234, 179, 8, 0.2)',
                                borderRadius: '16px', padding: '16px',
                                animation: 'chatbotFadeIn 0.3s ease',
                            }}>
                                <form onSubmit={handleEscalateSubmit}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#eab308', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Connect with Expert
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                                        Your conversation will be recorded and shared with our expert. They'll reach out at the email you provide.
                                    </p>
                                    {[
                                        { key: 'name', label: 'Your Name', type: 'text', required: false },
                                        { key: 'email', label: 'Email', type: 'email', required: true },
                                    ].map(f => (
                                        <div key={f.key} style={{ marginBottom: '8px' }}>
                                            <label style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                                                {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                            </label>
                                            <input
                                                type={f.type}
                                                value={escalateData[f.key]}
                                                onChange={e => setEscalateData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                required={f.required}
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: '8px',
                                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                                    color: '#e2e8f0', fontSize: '13px', outline: 'none',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <textarea
                                        value={escalateData.summary}
                                        onChange={e => setEscalateData(prev => ({ ...prev, summary: e.target.value }))}
                                        placeholder="Brief summary of your issue (optional - we'll include conversation history)"
                                        rows={2}
                                        style={{
                                            width: '100%', padding: '8px 10px', borderRadius: '8px',
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#e2e8f0', fontSize: '13px', resize: 'none', outline: 'none',
                                            marginBottom: '10px', boxSizing: 'border-box',
                                        }}
                                    />
                                    <button type="submit" disabled={isTyping} style={{
                                        width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                                        background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                                        color: '#0A192F', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}>
                                        {isTyping ? 'Connecting...' : 'Request Expert Callback'}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    {messages.length <= 1 && (
                        <div style={{
                            padding: '8px 16px',
                            display: 'flex', flexWrap: 'wrap', gap: '6px',
                            background: 'rgba(10, 25, 47, 0.95)',
                            borderTop: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            {QUICK_ACTIONS.map((qa, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(qa.message)}
                                    style={{
                                        padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(6, 182, 212, 0.2)',
                                        background: 'rgba(6, 182, 212, 0.08)', color: '#06b6d4',
                                        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                                    }}
                                    onMouseOver={e => { e.target.style.background = 'rgba(6, 182, 212, 0.2)'; e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'; }}
                                    onMouseOut={e => { e.target.style.background = 'rgba(6, 182, 212, 0.08)'; e.target.style.borderColor = 'rgba(6, 182, 212, 0.2)'; }}
                                >
                                    {qa.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(10, 25, 47, 0.98)',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', gap: '8px', alignItems: 'flex-end',
                        flexShrink: 0,
                    }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            disabled={isTyping}
                            style={{
                                flex: 1, padding: '10px 14px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                color: '#e2e8f0', fontSize: '13px', outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || isTyping}
                            aria-label="Send message"
                            style={{
                                width: '40px', height: '40px', borderRadius: '12px', border: 'none',
                                background: input.trim() ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'rgba(255,255,255,0.05)',
                                color: input.trim() ? '#fff' : '#64748b',
                                cursor: input.trim() ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', flexShrink: 0,
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ChatbotWidget;
