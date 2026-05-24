import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Clock, Plus, Trash2, MessageSquare, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { generateAIContent, generateDoubtPrompt } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { saveChatSession, getUserChatSessions, deleteChatSession } from '../lib/firebase';

// ── Helpers ─────────────────────────────────────────────────────────────────
const genId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const WELCOME_MSG = {
  id: 'welcome',
  role: 'ai',
  text: "Hello! I am your personal AI teacher. Ask me any doubt — I'll explain it in depth with examples, steps, and analogies. You can ask in **English or Hindi**!"
};

// LocalStorage helpers for guests
const LS_KEY = 'guest_chat_sessions';
const loadGuestSessions = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};
const saveGuestSessions = (sessions) => {
  localStorage.setItem(LS_KEY, JSON.stringify(sessions));
};

// ── Component ────────────────────────────────────────────────────────────────
export default function Chat() {
  const { currentUser, incrementGuestUsage } = useAuth();
  const isGuest = currentUser?.isGuest;
  const userId = currentUser?.uid || currentUser?.email || 'guest';

  // Session list & active session
  const [sessions, setSessions] = useState([]);           // [{ id, title, messages }]
  const [activeId, setActiveId] = useState(null);

  // Current chat messages (mirrors the active session's messages)
  const [messages, setMessages] = useState([WELCOME_MSG]);

  // UI state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load sessions on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      let saved = [];
      if (isGuest) {
        saved = loadGuestSessions();
      } else {
        const fetched = await getUserChatSessions(userId);
        // Convert Firestore messages (plain array) — already serialisable
        saved = fetched.map(s => ({ ...s, messages: s.messages || [WELCOME_MSG] }));
      }
      setSessions(saved);

      // Automatically load the most recent session into the main window so it doesn't look empty on refresh!
      if (saved.length > 0) {
        setActiveId(saved[0].id);
        setMessages(saved[0].messages || [WELCOME_MSG]);
      }
    })();
    // On mobile default sidebar closed
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [userId]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMsg]);

  // ── Sync messages → sessions state ─────────────────────────────────────
  const syncSession = useCallback((sessionId, updatedMessages, title) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === sessionId);
      let next;
      if (exists) {
        next = prev.map(s => s.id === sessionId ? { ...s, messages: updatedMessages, title: title || s.title } : s);
      } else {
        next = [{ id: sessionId, title: title || 'New Chat', messages: updatedMessages }, ...prev];
      }
      // Persist
      if (isGuest) {
        saveGuestSessions(next);
      } else {
        saveChatSession(userId, sessionId, title || exists?.title || 'New Chat', updatedMessages);
      }
      return next;
    });
  }, [isGuest, userId]);

  // ── Start a new chat session ────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    const newId = genId();
    const newSession = { id: newId, title: 'New Chat', messages: [WELCOME_MSG] };
    setSessions(prev => {
      const next = [newSession, ...prev];
      if (isGuest) saveGuestSessions(next);
      return next;
    });
    setActiveId(newId);
    setMessages([WELCOME_MSG]);
    setInput('');
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isGuest]);

  // ── Switch to a session ──────────────────────────────────────────────────
  const switchSession = useCallback((session) => {
    setActiveId(session.id);
    setMessages(session.messages || [WELCOME_MSG]);
    setInput('');
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Delete a session ─────────────────────────────────────────────────────
  const removeSession = useCallback((e, sessionId) => {
    e.stopPropagation();
    setSessions(prev => {
      const next = prev.filter(s => s.id !== sessionId);
      if (isGuest) saveGuestSessions(next);
      else deleteChatSession(sessionId);
      return next;
    });
    if (activeId === sessionId) {
      setActiveId(null);
      setMessages([WELCOME_MSG]);
    }
  }, [activeId, isGuest]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Guest limit gate
    if (!incrementGuestUsage()) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);
    setStatusMsg('thinking');

    // Ensure we have an active session
    const sessionId = activeId || genId();
    if (!activeId) setActiveId(sessionId);

    const userMsg = { id: Date.now(), role: 'user', text: userText };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);

    // Derive title from first user question (max 45 chars)
    const currentSession = sessions.find(s => s.id === sessionId);
    const isFirstMsg = !currentSession || currentSession.title === 'New Chat';
    const title = isFirstMsg ? userText.slice(0, 45) + (userText.length > 45 ? '…' : '') : undefined;

    // Fire AI (pass recent history for memory!)
    const historyCtx = messages.filter(m => m.id !== 'welcome').slice(-6);
    const prompt = generateDoubtPrompt(userText, historyCtx);
    const result = await generateAIContent(prompt, (msg) => setStatusMsg(msg || ''));

    setIsLoading(false);
    setStatusMsg('');

    const aiMsg = {
      id: Date.now() + 1,
      role: 'ai',
      text: result.text || result.message || '⚠️ Something went wrong. Please try again.',
      isError: !result.text
    };

    const finalMessages = [...updatedWithUser, aiMsg];
    setMessages(finalMessages);
    syncSession(sessionId, finalMessages, title);

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, isLoading, activeId, messages, sessions, incrementGuestUsage, syncSession]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isThinking = statusMsg === 'thinking';
  const showStatus = isLoading && statusMsg;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="chat-layout-wrapper" style={{ position: 'relative' }}>

      {/* ── Mobile overlay when sidebar open ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'absolute', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)'
          }}
          className="chat-mobile-overlay"
        />
      )}

      {/* ── LEFT: History Sidebar ── */}
      <aside className={`chat-history-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="chat-history-sidebar-header">
          <button className="new-chat-btn" onClick={startNewChat} id="new-chat-btn">
            <Plus size={16} />
            New Chat Session
          </button>
        </div>

        <div className="chat-session-list">
          {sessions.length === 0 ? (
            <div style={{ padding: '1.25rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
              <MessageSquare size={24} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
              No chats yet.<br />Start a new session above!
            </div>
          ) : (
            sessions.map(sess => (
              <div
                key={sess.id}
                className={`chat-session-item ${activeId === sess.id ? 'active' : ''}`}
                onClick={() => switchSession(sess)}
                title={sess.title}
              >
                <MessageSquare size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span className="chat-session-title">{sess.title || 'New Chat'}</span>
                <button
                  className="chat-session-delete"
                  onClick={(e) => removeSession(e, sess.id)}
                  title="Delete session"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── RIGHT: Active Chat Panel ── */}
      <div className="chat-main">
        <div className="chat-container">

          {/* ── MESSAGES ── */}
          <div className="chat-messages">
            {/* Toggle sidebar button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <button
                onClick={() => setSidebarOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)', fontSize: '0.78rem',
                  padding: '0.3rem 0.65rem', cursor: 'pointer',
                  transition: 'all var(--transition)'
                }}
                title={sidebarOpen ? 'Hide history' : 'Show history'}
              >
                {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                {sidebarOpen ? 'Hide History' : 'Chat History'}
              </button>
            </div>

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

            {/* Live status bubble */}
            {showStatus && (
              <div className="message ai">
                <div className="avatar" style={{
                  background: isThinking ? 'var(--primary-light)' : 'rgba(245,158,11,0.15)',
                  color: isThinking ? 'var(--primary)' : '#f59e0b'
                }}>
                  {isThinking ? <Sparkles size={16} /> : <Clock size={16} />}
                </div>
                <div className="message-content" style={{
                  padding: '0.875rem 1.25rem', opacity: 0.9,
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: isThinking ? undefined : 'rgba(245,158,11,0.08)',
                  borderColor: isThinking ? undefined : 'rgba(245,158,11,0.2)'
                }}>
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

          {/* ── INPUT AREA ── */}
          <div className="chat-input-area">
            <form onSubmit={handleSend} className="chat-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                style={{ paddingLeft: '1.25rem', paddingRight: '3.25rem' }}
                placeholder={isLoading ? 'Please wait...' : 'Ask your doubt here...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                className="chat-submit"
                disabled={!input.trim() || isLoading}
                title={isLoading ? 'Processing...' : 'Send message'}
              >
                <Send size={15} />
              </button>
            </form>
            <p style={{
              textAlign: 'center', marginTop: '0.625rem',
              fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7
            }}>
              {isLoading
                ? (statusMsg && statusMsg !== 'thinking' ? '🔄 Auto-retrying — no action needed' : '🤖 Generating response...')
                : 'Press Enter to send • Supports English & Hindi'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { transform: scale(1); opacity: 0.4; }
          30% { transform: scale(1.4); opacity: 1; }
        }
        @media (max-width: 768px) {
          .chat-mobile-overlay { display: block !important; }
        }
      `}</style>
    </div>
  );
}
