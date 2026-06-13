import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Clock, Plus, Trash2, MessageSquare, PanelLeftOpen, PanelLeftClose, Loader2, X, Image as ImageIcon, Camera } from 'lucide-react';
import { generateAIContent, generateAIContentStream, generateDoubtPrompt, fixMathFormatting } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext';
import { saveChatSession, getUserChatSessions, deleteChatSession, logActivity } from '../lib/firebase';

// Custom renderers for beautiful markdown tables
const markdownComponents = {
  table: ({ children }) => (
    <div className="md-table-wrapper">
      <table className="md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="md-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="md-tr">{children}</tr>,
  th: ({ children }) => <th className="md-th">{children}</th>,
  td: ({ children }) => <td className="md-td">{children}</td>,
  code: ({ inline, className, children }) => {
    if (inline) {
      return <code className="md-inline-code">{children}</code>;
    }
    return (
      <div className="md-code-block">
        <code>{children}</code>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="md-blockquote">{children}</blockquote>
  ),
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const genId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const WELCOME_MSG = {
  id: 'welcome',
  role: 'ai',
  text: "Hello! I am your personal AI teacher. Ask me any doubt — I'll explain it in depth with examples, steps, and analogies. You can ask in **English or Hindi**!"
};

const targetDoubts = [
  {
    icon: "🎯",
    title: "CBSE / RBSE Board Repeats",
    desc: "Fetch top 5 repeated board questions & perfect marking scheme answers.",
    prompt: "Give me the top 5 highly repeated Class 10 CBSE/RBSE board questions for my subjects with detailed marking-scheme style answers."
  },
  {
    icon: "⚡",
    title: "Tricky Concept Analogy",
    desc: "Explain complex science or economics topics with simple daily life analogies.",
    prompt: "Explain a highly complex topic from my syllabus using creative, easy real-life analogies and topper tricks so I can memorize it forever."
  },
  {
    icon: "📐",
    title: "Formula & Reaction Sheet",
    desc: "Generate high-density quick revision summaries in clean tables.",
    prompt: "Create a complete, high-density exam revision sheet of all critical formulas, key dates, and chemical reactions for my subjects in a neat table."
  },
  {
    icon: "🏆",
    title: "Topper 100/100 Paper Secrets",
    desc: "Get presentation keywords and diagrams to secure full marks.",
    prompt: "Give me the exact keywords, presentation tips, and diagram guidelines required to get full 100% marks in my board exam papers."
  }
];

// Load student's active target chapters from localStorage to highlight in the solver
const getStudentTargets = () => {
  try {
    const profileRaw = localStorage.getItem('tanios_profile');
    if (!profileRaw) return null;
    const profile = JSON.parse(profileRaw);
    const userId = profile?.uid || '';
    // Try user-specific keys first, then global
    const tryKeys = (base) => {
      const keys = [
        `${base}_${localStorage.getItem('tanios_uid') || ''}`,
        base
      ];
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
      return null;
    };
    
    // Find active chapters from any available key format
    let activeChaptersRaw = null;
    for (const key of Object.keys(localStorage)) {
      if (key.includes('tanios_active_chapters')) {
        activeChaptersRaw = localStorage.getItem(key);
        if (activeChaptersRaw) break;
      }
    }
    
    let profileRaw2 = null;
    for (const key of Object.keys(localStorage)) {
      if (key.includes('tanios_profile')) {
        profileRaw2 = localStorage.getItem(key);
        if (profileRaw2) break;
      }
    }
    
    if (!profileRaw2) return null;
    const prof = JSON.parse(profileRaw2);
    const activeChapters = activeChaptersRaw ? JSON.parse(activeChaptersRaw) : {};
    
    if (!prof.subjects || prof.subjects.length === 0) return null;
    
    return {
      board: prof.board || 'CBSE',
      grade: prof.grade || '10',
      subjects: prof.subjects,
      activeChapters
    };
  } catch {
    return null;
  }
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
  const { currentUser, incrementGuestUsage, getRemainingQuota, QUOTA, subscription } = useAuth();
  const isGuest = !currentUser || currentUser.isGuest || currentUser.email === 'guest@tanios.ai';
  const userId = currentUser?.uid || currentUser?.email || 'guest';
  
  const isPro = subscription?.active;
  const limit = isGuest ? QUOTA?.guest : (isPro ? QUOTA?.pro : QUOTA?.freeTrial);
  const remaining = getRemainingQuota?.() ?? limit;

  // Session list & active session
  const [sessions, setSessions] = useState([]);           // [{ id, title, messages }]
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Current chat messages (mirrors the active session's messages)
  const [messages, setMessages] = useState([WELCOME_MSG]);

  // UI state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Student target subjects/chapters for highlighted pads
  const [studentTargets] = useState(() => getStudentTargets());

  // Multimodal Image States
  const [selectedImage, setSelectedImage] = useState(null); // { data: string, mimeType: string, url: string, name: string }
  const [isCompacting, setIsCompacting] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Client-side Image Compression pipeline using HTML5 Canvas
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    setIsCompacting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG at 70% quality to stay well under local storage & firestore limits!
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64Data = dataUrl.split(',')[1];

        setSelectedImage({
          data: base64Data,
          mimeType: 'image/jpeg',
          url: dataUrl,
          name: file.name
        });
        setIsCompacting(false);

        // Clear file input value so selecting the same image triggers onchange again
        e.target.value = '';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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
      setSessionsLoaded(true);
    })();
    // On mobile default sidebar closed
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [userId, isGuest]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMsg]);

  // ── Sync messages → sessions state ─────────────────────────────────────
  const syncSession = useCallback((sessionId, updatedMessages, title) => {
    // Read directly from physical storage to bypass any React state timing delays
    const currentSessions = isGuest 
      ? loadGuestSessions() 
      : (() => {
          try {
            return JSON.parse(localStorage.getItem(`fallback_chats_${userId}`) || '[]');
          } catch { return []; }
        })();

    const exists = currentSessions.find(s => s.id === sessionId);
    let nextSessions;
    const finalTitle = title || (exists ? exists.title : 'New Chat');
    
    if (exists) {
      nextSessions = currentSessions.map(s => s.id === sessionId ? { ...s, messages: updatedMessages, title: finalTitle } : s);
    } else {
      nextSessions = [{ id: sessionId, title: finalTitle, messages: updatedMessages }, ...currentSessions];
    }
    
    setSessions(nextSessions);

    // Persist immediately
    if (isGuest) {
      saveGuestSessions(nextSessions);
    } else {
      saveChatSession(userId, sessionId, finalTitle, updatedMessages);
    }
  }, [isGuest, userId]);

  // ── Start a new chat session ────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    const newId = genId();
    const newSession = { id: newId, title: 'New Chat', messages: [WELCOME_MSG] };
    
    const currentSessions = isGuest 
      ? loadGuestSessions() 
      : (() => {
          try {
            return JSON.parse(localStorage.getItem(`fallback_chats_${userId}`) || '[]');
          } catch { return []; }
        })();

    const nextSessions = [newSession, ...currentSessions];
    setSessions(nextSessions);
    
    if (isGuest) {
      saveGuestSessions(nextSessions);
    } else {
      saveChatSession(userId, newId, 'New Chat', [WELCOME_MSG]);
    }
    
    setActiveId(newId);
    localStorage.setItem('tanios_active_chat_id', newId);
    setMessages([WELCOME_MSG]);
    setInput('');
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
    
    logActivity(
      userId,
      currentUser?.displayName || currentUser?.email || 'Student',
      'chat_session',
      'Started a new AI chat session'
    ).catch(e => console.warn("Activity logging failed", e));
  }, [isGuest, userId, currentUser]);

  // ── Switch to a session ──────────────────────────────────────────────────
  const switchSession = useCallback((session) => {
    setActiveId(session.id);
    localStorage.setItem('tanios_active_chat_id', session.id);
    setMessages(session.messages || [WELCOME_MSG]);
    setInput('');
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Delete a session ─────────────────────────────────────────────────────
  const removeSession = useCallback((e, sessionId) => {
    e.stopPropagation();
    
    const currentSessions = isGuest 
      ? loadGuestSessions() 
      : (() => {
          try {
            return JSON.parse(localStorage.getItem(`fallback_chats_${userId}`) || '[]');
          } catch { return []; }
        })();

    const nextSessions = currentSessions.filter(s => s.id !== sessionId);
    setSessions(nextSessions);
    
    if (isGuest) {
      saveGuestSessions(nextSessions);
    } else {
      deleteChatSession(sessionId);
      try {
        const fbKey = `fallback_chats_${userId}`;
        localStorage.setItem(fbKey, JSON.stringify(nextSessions));
      } catch (err) {
        console.warn("Cleanup fallback storage failed:", err);
      }
    }
    
    if (activeId === sessionId) {
      setActiveId(null);
      localStorage.removeItem('tanios_active_chat_id');
      setMessages([WELCOME_MSG]);
    }
  }, [activeId, isGuest, userId]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e, customText) => {
    e?.preventDefault();
    const textToSend = (customText || input).trim();
    if (!textToSend && !selectedImage) return;
    if (isLoading || isCompacting) return;

    // Guest limit gate
    if (!incrementGuestUsage()) return;

    const imageToSend = selectedImage;
    setSelectedImage(null);
    setInput('');
    setIsLoading(true);
    setStatusMsg('thinking');

    // Ensure we have an active session
    const sessionId = activeId || genId();
    if (!activeId) {
      setActiveId(sessionId);
      localStorage.setItem('tanios_active_chat_id', sessionId);
    }

    const finalUserText = textToSend || "Please analyze the uploaded image and solve/explain my doubt.";
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: finalUserText,
      image: imageToSend || undefined
    };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);

    // Derive title from first user question (max 45 chars)
    const currentSession = sessions.find(s => s.id === sessionId);
    const isFirstMsg = !currentSession || currentSession.title === 'New Chat';
    const title = isFirstMsg ? finalUserText.slice(0, 45) + (finalUserText.length > 45 ? '…' : '') : undefined;

    // Fire AI Stream (pass recent history for memory!)
    const historyCtx = messages.filter(m => m.id !== 'welcome').slice(-6);
    const prompt = generateDoubtPrompt(finalUserText, historyCtx);

    // Retrieve active textbook RAG reference context
    const ragContext = localStorage.getItem('tanios_rag_context');
    const ragFilename = localStorage.getItem('tanios_rag_filename') || 'Textbook';
    
    let promptWithContext = prompt;
    if (ragContext) {
      console.log(`[RAG] Injecting textbook context from: ${ragFilename}`);
      promptWithContext = `[LOCAL SYLLABUS REFERENCE: The following is parsed content from the student's active textbook "${ragFilename}":\n${ragContext.substring(0, 10000)}]\n\nBased ONLY on the reference textbook context provided above, solve the student's doubt. If the context is unrelated, solve using standard board-exam principles.\n\nStudent Doubt: ${finalUserText}\n\nChat History & Instructions:\n${prompt}`;
    }

    const aiMsgId = Date.now() + 1;
    const aiMsgPlaceholder = {
      id: aiMsgId,
      role: 'ai',
      text: '',
      isStreaming: true
    };
    
    // Mount user message and the empty AI placeholder to kick off the stream render
    const updatedWithUserAndAi = [...updatedWithUser, aiMsgPlaceholder];
    setMessages(updatedWithUserAndAi);

    let streamedText = "";
    
    const result = await generateAIContentStream(
      promptWithContext,
      (textChunk) => {
        streamedText = textChunk;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: textChunk } : m));
      },
      (msg) => setStatusMsg(msg || ''),
      imageToSend
    );

    setIsLoading(false);
    setStatusMsg('');

    const finalAiText = streamedText || result.text || result.message || '⚠️ Something went wrong. Please try again.';
    const finalAiMsg = {
      id: aiMsgId,
      role: 'ai',
      text: finalAiText,
      isError: !streamedText && !result.text
    };

    const finalMessages = [...updatedWithUser, finalAiMsg];
    setMessages(finalMessages);
    syncSession(sessionId, finalMessages, title);

    // Reward +10 XP for solving doubts! (write to user-specific key)
    try {
      const xpKey = `tanios_xp_${userId}`;
      const currentXP = parseInt(localStorage.getItem(xpKey) || '0', 10);
      localStorage.setItem(xpKey, (currentXP + 10).toString());
      window.dispatchEvent(new Event('tanios_xp_update'));
    } catch (e) {
      console.warn(e);
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, isLoading, isCompacting, selectedImage, activeId, messages, sessions, incrementGuestUsage, syncSession]);

  // ── Prefilled URL query prompt support ───────────────────────────────────
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const promptParam = queryParams.get('prompt');
    if (promptParam && sessionsLoaded && !isLoading) {
      // Clear URL parameter so it doesn't repeat on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Auto-trigger send!
      setTimeout(() => {
        handleSend(null, promptParam);
      }, 300);
    }
  }, [sessionsLoaded, isLoading, handleSend]);

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

        {/* ── Quota counter ── */}
        <div style={{
          padding: '0.75rem',
          borderTop: '1px solid var(--border)',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span>Daily AI Requests</span>
            <span style={{ color: remaining === 0 ? '#f87171' : remaining <= 3 ? '#fb923c' : '#a78bfa', fontWeight: 700 }}>
              {remaining}/{limit}
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${limit > 0 ? (remaining / limit) * 100 : 0}%`,
              background: remaining === 0 ? '#f87171' : remaining <= 3 ? 'linear-gradient(90deg,#fb923c,#f87171)' : 'linear-gradient(90deg,var(--primary),var(--accent))',
              borderRadius: '99px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          {remaining === 0 && (
            <div style={{ color: '#f87171', marginTop: '0.35rem', fontSize: '0.68rem' }}>Resets at midnight 🌙</div>
          )}
        </div>
      </aside>

      {/* ── RIGHT: Active Chat Panel ── */}
      <div className="chat-main">
        <div className="chat-container">

          {/* ── MESSAGES ── */}
          <div className="chat-messages">
            {/* Toggle sidebar button */}
            <div className="chat-top-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
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

            {messages.filter(msg => (msg.text && msg.text.trim() !== '') || msg.image).map(msg => {
              const isWelcome = msg.id === 'welcome';
              return (
                <React.Fragment key={msg.id}>
                  <div className={`message ${msg.role}`}>
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
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={markdownComponents}
                        >{msg.text}</ReactMarkdown>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {msg.image && (
                            <div style={{ maxWidth: '300px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.25rem' }}>
                              <img src={msg.image.url} alt="Uploaded doubt" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                          )}
                          {msg.text && <span>{msg.text}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {isWelcome && messages.length === 1 && (
                    <div className="target-doubts-section" style={{
                      margin: '1.5rem 0.5rem 1.5rem 3.5rem',
                      animation: 'fadeUp 0.4s ease both'
                    }}>

                      {/* ── STUDENT'S ACTIVE TARGET PADS (highlighted) ── */}
                      {studentTargets && studentTargets.subjects && studentTargets.subjects.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <span style={{ fontSize: '1rem' }}>🎯</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b' }}>
                              Your Active Study Targets — {studentTargets.board} Class {studentTargets.grade}
                            </span>
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '0.6rem'
                          }}>
                            {studentTargets.subjects.map((subj, idx) => {
                              const chapter = studentTargets.activeChapters[subj] || '';
                              const chClean = chapter.replace(/^Chapter \d+:\s*/, '') || 'Chapter 1';
                              const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#a855f7','#ef4444','#8b5cf6'];
                              const col = colors[idx % colors.length];
                              const subjectIcons = {
                                'Physics': '⚛️', 'Chemistry': '🧪', 'Mathematics': '📐', 'Biology': '🧬',
                                'Social Science': '🌍', 'English': '📝', 'Hindi': '✍️', 'Computer Science': '💻',
                                'Accountancy': '📂', 'Business Studies': '💼', 'Economics': '📊',
                                'Informatics Practices': '🖥️', 'Science': '🔬'
                              };
                              const icon = subjectIcons[subj] || '📚';
                              const askPrompt = `Solve my doubt about "${chClean}" from ${subj} (${studentTargets.board} Class ${studentTargets.grade}). Give me the key concepts, definitions, important formulas, and a quick board-focused summary of this topic with solved examples.`;
                              return (
                                <div
                                  key={subj}
                                  onClick={() => {
                                    setInput(askPrompt);
                                    setTimeout(() => inputRef.current?.focus(), 50);
                                  }}
                                  className="target-doubt-card target-subject-pad"
                                  style={{
                                    borderColor: `${col}44`,
                                    background: `linear-gradient(135deg, ${col}0f 0%, rgba(255,255,255,0.01) 100%)`,
                                    boxShadow: `0 0 0 1px ${col}33, 0 4px 16px ${col}18`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {/* Glow accent bar */}
                                  <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                                    background: `linear-gradient(90deg, ${col}, transparent)`
                                  }} />
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>{subj}</span>
                                    <span style={{
                                      marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700,
                                      background: `${col}22`, color: col, padding: '0.1rem 0.4rem',
                                      borderRadius: '4px', border: `1px solid ${col}33`
                                    }}>ACTIVE</span>
                                  </div>
                                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.4 }}>
                                    📖 {chClean}
                                  </p>
                                  <p style={{ margin: '0.35rem 0 0 0', color: col, fontSize: '0.7rem', fontWeight: 700 }}>
                                    Ask AI about this chapter →
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── GENERIC CBSE/RBSE TARGET PADS ── */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        color: 'var(--primary)'
                      }}>
                        <Sparkles size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Target CBSE / RBSE Doubts Solvers
                        </span>
                      </div>
                      <div className="target-doubts-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '0.75rem'
                      }}>
                        {targetDoubts.map(doubt => (
                          <div
                            key={doubt.title}
                            onClick={() => {
                              setInput(doubt.prompt);
                              setTimeout(() => inputRef.current?.focus(), 50);
                            }}
                            className="target-doubt-card"
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              marginBottom: '0.35rem'
                            }}>
                              <span style={{ fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {doubt.icon}
                              </span>
                              <h4 style={{ margin: 0, color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>
                                {doubt.title}
                              </h4>
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                              {doubt.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Live status bubble */}
            {showStatus && (
              <div className="message ai">
                <div className="avatar" style={{
                  background: isThinking ? 'var(--primary-light)' : 'rgba(245,158,11,0.15)',
                  color: isThinking ? 'var(--primary)' : '#f59e0b'
                }}>
                  {isThinking ? <Sparkles size={16} style={{ animation: 'spin 2s linear infinite' }} /> : <Clock size={16} />}
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

            {/* 📱 Floating Chat History toggle for mobile — always visible near input */}
            <button
              className="chat-history-fab"
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? 'Hide history' : 'Chat History'}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            {/* Hidden file input for gallery attachment */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            {/* Hidden camera input */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {/* Selected Image Floating Preview */}
            {selectedImage && (
              <div className="chat-image-preview-container" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                width: 'fit-content',
                animation: 'slideUp 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={selectedImage.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedImage.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ready to solve</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="chat-input-wrapper">
              {/* Image/Camera upload trigger button inside input */}
              <div style={{ position: 'absolute', left: '0.4rem', display: 'flex', gap: '2px', zIndex: 2 }}>
                {/* Gallery button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isCompacting}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'none',
                    color: selectedImage ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  className="chat-attach-btn"
                  title="Upload image from gallery"
                >
                  {isCompacting ? (
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <ImageIcon size={15} />
                  )}
                </button>
                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isLoading || isCompacting}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  className="chat-attach-btn"
                  title="Capture from camera"
                >
                  <Camera size={15} />
                </button>
              </div>

              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                style={{ paddingLeft: '4.5rem', paddingRight: '3.25rem' }}
                placeholder={isLoading ? 'Please wait...' : 'Ask your doubt here or upload image...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || isCompacting}
                autoFocus
              />
              <button
                type="submit"
                className="chat-submit"
                disabled={(!input.trim() && !selectedImage) || isLoading || isCompacting}
                title={isLoading ? 'Processing...' : 'Send message'}
              >
                {isLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
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

        /* Floating history FAB — hidden on desktop, shown on mobile */
        .chat-history-fab {
          display: none;
          position: absolute;
          top: -48px;
          left: 0.75rem;
          z-index: 100;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }
        .chat-history-fab:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        /* Desktop: top toggle visible, FAB hidden */
        .chat-top-toggle { display: flex; }

        .target-doubt-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem 1.15rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .target-doubt-card:hover {
          background: rgba(108, 99, 255, 0.07) !important;
          border-color: rgba(108, 99, 255, 0.3) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(108, 99, 255, 0.12);
        }
        .target-doubt-card:hover h4 {
          color: var(--primary) !important;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          /* Mobile: hide the top toggle, show the FAB */
          .chat-top-toggle { display: none !important; }
          .chat-history-fab { display: flex; }
          .chat-mobile-overlay { display: block !important; }
          .target-doubts-section {
            margin: 1.25rem 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
