import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Sparkles, User, Clock } from 'lucide-react';
import { generateAIContent, generateDoubtPrompt } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { incrementGuestUsage } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "Hello! I am your personal AI teacher. What doubt can I solve for you today? You can ask in English or Hindi!"
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(''); // Live status: "Thinking...", "Retrying in 28s..."
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusMsg]);

  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check Guest usage limit (max 2 academic queries)
    if (!incrementGuestUsage()) {
      return;
    }

    const userText = input.trim();
    setInput('');
    setIsLoading(true);
    setStatusMsg('thinking');

    // Add user message immediately
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);

    const prompt = generateDoubtPrompt(userText);

    // onStatus callback — updates the live status bubble
    const onStatus = (msg) => setStatusMsg(msg || '');

    const result = await generateAIContent(prompt, onStatus);

    setIsLoading(false);
    setStatusMsg('');

    if (result.text) {
      // Success
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: result.text
      }]);
    } else {
      // Error — show inline as AI message (not dismissible error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: result.message || "⚠️ Something went wrong. Please try again.",
        isError: true
      }]);
    }

    // Re-focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, isLoading]);

  // Allow Enter key to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine what to show in the typing indicator
  const isCountdown = statusMsg && statusMsg !== 'thinking' && statusMsg !== 'thinking';
  const isThinking = statusMsg === 'thinking';
  const showStatus = isLoading && statusMsg;

  return (
    <div className="chat-container">
      {/* ── MESSAGES ───────────────────────────────────────────── */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="avatar" style={msg.isError ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : {}}>
              {msg.role === 'ai' ? <Sparkles size={16} /> : <User size={16} />}
            </div>
            <div
              className="message-content generated-content"
              style={{
                margin: 0,
                padding: '1rem 1.25rem',
                width: '100%',
                overflowX: 'auto',
                ...(msg.isError ? {
                  background: 'rgba(239,68,68,0.08)',
                  borderColor: 'rgba(239,68,68,0.2)',
                  color: '#ef4444'
                } : {})
              }}
            >
              {msg.role === 'ai' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        {/* ── LIVE STATUS BUBBLE ──────────────────────────────── */}
        {showStatus && (
          <div className="message ai">
            <div className="avatar" style={{
              background: isThinking
                ? 'var(--primary-light)'
                : 'rgba(245,158,11,0.15)',
              color: isThinking ? 'var(--primary)' : '#f59e0b'
            }}>
              {isThinking ? <Sparkles size={16} /> : <Clock size={16} />}
            </div>
            <div className="message-content" style={{
              padding: '0.875rem 1.25rem',
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: isThinking ? undefined : 'rgba(245,158,11,0.08)',
              borderColor: isThinking ? undefined : 'rgba(245,158,11,0.2)'
            }}>
              {/* Animated dots */}
              <span style={{ display: 'flex', gap: '3px' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: isThinking ? 'var(--primary)' : '#f59e0b',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
              </span>
              <span style={{ fontSize: '0.9rem', color: isThinking ? 'var(--text-secondary)' : '#f59e0b' }}>
                {isThinking ? 'Thinking...' : statusMsg}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT AREA ─────────────────────────────────────────── */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          {/* Image (coming soon) */}
          <button
            type="button"
            style={{
              position: 'absolute', left: '0.5rem',
              width: '2.25rem', height: '2.25rem', padding: 0,
              borderRadius: '50%', border: 'none',
              cursor: 'not-allowed', opacity: 0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-tertiary)', color: 'var(--text-secondary)'
            }}
            title="Upload image — coming soon"
            disabled
          >
            <ImageIcon size={18} />
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            style={{ paddingLeft: '3.25rem', paddingRight: '3.25rem' }}
            placeholder={isLoading ? 'Please wait...' : 'Type your doubt here...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
          />

          {/* Send button */}
          <button
            type="submit"
            className="chat-submit"
            disabled={!input.trim() || isLoading}
            title={isLoading ? 'Processing...' : 'Send message'}
          >
            <Send size={15} />
          </button>
        </form>

        {/* Hint text */}
        <p style={{
          textAlign: 'center', marginTop: '0.625rem',
          fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7
        }}>
          {isLoading
            ? (statusMsg && statusMsg !== 'thinking' ? '🔄 Auto-retrying — no action needed' : '🤖 Generating response...')
            : 'Press Enter to send • Supports English & Hindi'}
        </p>
      </div>

      {/* Dot pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { transform: scale(1); opacity: 0.4; }
          30% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
