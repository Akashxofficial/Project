import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MathRenderer from '../components/MathRenderer';
import {
  ArrowLeft, Sparkles, Copy, Check, Download, Loader2,
  Zap, BookOpen, FileText, HelpCircle, BarChart2, Brain, Clock, Lightbulb, Bookmark
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { generateAIContent, generateOneClickPrompt, fixMathFormatting } from '../lib/ai';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../lib/firebase';
import { downloadAsPDF } from '../lib/pdfHelper';

// Markdown components identical to Notes/Chat pages
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
  text: ({ children }) => <MathRenderer text={children} />,
  code: ({ className, children, ...props }) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n');
    if (isInline) {
      if (typeof children === 'string' && children.includes('$')) {
        return <MathRenderer text={children} />;
      }
      return <code className="md-inline-code" {...props}>{children}</code>;
    }
    return (
      <div className="md-code-block">
        <code className={className} {...props}>{children}</code>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="md-blockquote">{children}</blockquote>
  ),
};

// Tool metadata
const TOOLS = [
  { label: 'Explain Easy',        icon: <Lightbulb size={18} />,  color: '#3b82f6', desc: 'Simplifies complex definitions with real-world analogies.' },
  { label: 'Generate Notes',      icon: <FileText size={18} />,   color: '#10b981', desc: 'Produces a board-focused comprehensive summary.' },
  { label: 'Board Questions',     icon: <BookOpen size={18} />,   color: '#f59e0b', desc: 'Fetches repeated past CBSE/RBSE board questions.' },
  { label: 'Important Questions', icon: <HelpCircle size={18} />, color: '#8b5cf6', desc: 'Extracts critical scoring questions with model answers.' },
  { label: 'Revision Sheet',      icon: <BarChart2 size={18} />,  color: '#f43f5e', desc: 'High-density summary with tables and equations.' },
  { label: 'Mind Map',            icon: <Brain size={18} />,      color: '#06b6d4', desc: 'Displays visual hierarchical text diagram.' },
  { label: '5-Minute Study',      icon: <Clock size={18} />,      color: '#ec4899', desc: 'Super fast bullet points and mnemonics.' },
];

const BOARDS = ['CBSE', 'RBSE', 'UP Board', 'Bihar Board', 'MP Board', 'ICSE', 'Other Board'];
const GRADES = ['8', '9', '10', '11', '12'];

export default function StudyGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, subscription, incrementGuestUsage } = useAuth();

  const userId = currentUser?.uid || currentUser?.email || 'guest';
  const getUserKey = (key) => `${key}_${userId}`;

  // Read profile defaults from localStorage
  const getProfileDefaults = () => {
    try {
      const raw = localStorage.getItem(`tanios_profile_${userId}`) || localStorage.getItem('tanios_profile');
      if (raw) {
        const p = JSON.parse(raw);
        return { grade: p.grade || '10', board: p.board || 'CBSE' };
      }
    } catch {}
    return { grade: '10', board: 'CBSE' };
  };

  const defaults = getProfileDefaults();
  const initialTool = searchParams.get('tool') || 'Generate Notes';

  const [activeTool, setActiveTool]       = useState(initialTool);
  const [topic, setTopic]                 = useState('');
  const [grade, setGrade]                 = useState(defaults.grade);
  const [board, setBoard]                 = useState(defaults.board);
  const [loading, setLoading]             = useState(false);
  const [status, setStatus]               = useState('');
  const [result, setResult]               = useState('');
  const [error, setError]                 = useState('');
  const [copied, setCopied]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  const resultRef = useRef(null);
  const inputRef  = useRef(null);

  // Update activeTool when URL param changes
  useEffect(() => {
    const toolFromUrl = searchParams.get('tool');
    if (toolFromUrl) setActiveTool(toolFromUrl);
  }, [searchParams]);

  // Auto-focus input when tool changes
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeTool]);

  const activeMeta = TOOLS.find(t => t.label === activeTool) || TOOLS[1];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    // Study material quota gate (shared 1-trial pool with Notes & Revision)
    if (!incrementGuestUsage('study')) return;

    setLoading(true);
    setResult('');
    setError('');
    setStatus('thinking');

    const prompt = generateOneClickPrompt(activeTool, topic.trim(), grade, board);
    const response = await generateAIContent(prompt, (s) => setStatus(s || ''));

    setLoading(false);
    setStatus('');

    if (response?.error || !response?.text) {
      setError(response?.message || '⚠️ Something went wrong. Please try again.');
    } else {
      const fixed = fixMathFormatting(response.text);
      setResult(fixed);
      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const docTitle = `[${board} Cl.${grade}] ${topic} (${activeTool})`;
      // Map activeTool to allowed Firestore categories ('note', 'revision') to satisfy Security Rules
      const dbType = activeTool === 'Revision Sheet' || activeTool === '5-Minute Study' ? 'revision' : 'note';
      await saveDocument(userId, dbType, docTitle, result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Fail silently — not critical
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    const docTitle = `[${board} Cl.${grade}] ${topic} (${activeTool})`;
    await downloadAsPDF(docTitle, result, activeTool);
  };

  const switchTool = (label) => {
    setActiveTool(label);
    setResult('');
    setError('');
    navigate(`/study-generator?tool=${encodeURIComponent(label)}`, { replace: true });
  };

  return (
    <div className="page-content" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      <style>{`
        .sg-tool-pill {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          white-space: nowrap;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .sg-tool-pill:hover {
          transform: translateY(-2px);
          color: var(--text);
          background: var(--bg-secondary);
        }
        .sg-tool-pill.active {
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 18px rgba(0,0,0,0.25);
        }
        .sg-result-area {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.75rem;
          margin-top: 1.5rem;
          animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
          overflow-x: hidden;
        }
        .sg-form-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.75rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: var(--shadow-sm);
        }
        .sg-status-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          margin-top: 1rem;
          animation: fadeUp 0.2s ease;
        }
        .sg-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
          width: 100%;
        }
        .sg-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.875rem;
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          height: 38px;
        }
        .sg-back-btn:hover {
          background: var(--bg-secondary);
          color: var(--text);
          border-color: var(--border-focus);
          transform: translateX(-2px);
        }
        .sg-title-area {
          flex: 1;
          min-width: 0;
        }
        .sg-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .sg-title-text {
          font-size: clamp(1.1rem, 3vw, 1.5rem);
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
          color: var(--text);
          line-height: 1.2;
        }
        .sg-subtitle {
          margin: 0.2rem 0 0;
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        @media (max-width: 640px) {
          .sg-tool-pills-wrap { gap: 0.4rem !important; }
          .sg-tool-pill { font-size: 0.72rem; padding: 0.35rem 0.65rem; }
          .sg-form-row { flex-direction: column !important; }
          .sg-form-row > * { width: 100% !important; }
          .sg-header {
            gap: 0.75rem;
            align-items: flex-start;
          }
          .sg-back-btn {
            padding: 0;
            width: 36px;
            height: 36px;
            border-radius: 50%;
          }
          .sg-back-btn-text {
            display: none;
          }
          .sg-subtitle {
            font-size: 0.78rem;
          }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="sg-header">
        <button
          onClick={() => navigate(-1)}
          className="sg-back-btn"
        >
          <ArrowLeft size={15} />
          <span className="sg-back-btn-text">Back</span>
        </button>

        <div className="sg-title-area">
          <div className="sg-title-row">
            <Zap size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <h1 className="sg-title-text">
              One-Click Study Generator
            </h1>
          </div>
          <p className="sg-subtitle">
            Instant AI-powered study materials — no prompting needed.
          </p>
        </div>
      </div>

      {/* ── Tool Selector Pills ── */}
      <div
        className="sg-tool-pills-wrap"
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
          marginBottom: '1.5rem', padding: '0.25rem 0'
        }}
      >
        {TOOLS.map(tool => (
          <button
            key={tool.label}
            onClick={() => switchTool(tool.label)}
            className={`sg-tool-pill${activeTool === tool.label ? ' active' : ''}`}
            style={activeTool === tool.label ? {
              background: `linear-gradient(135deg, ${tool.color}cc, ${tool.color}88)`,
              borderColor: tool.color,
              boxShadow: `0 4px 18px ${tool.color}44`,
            } : {}}
          >
            {tool.icon}
            {tool.label}
          </button>
        ))}
      </div>

      {/* ── Active Tool Info + Form Card ── */}
      <div className="sg-form-card">
        {/* Tool description banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '1.5rem',
          padding: '0.875rem 1rem',
          background: `linear-gradient(135deg, ${activeMeta.color}18, ${activeMeta.color}08)`,
          border: `1.5px solid ${activeMeta.color}44`,
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{
            width: '2.25rem', height: '2.25rem', borderRadius: '50%',
            background: `${activeMeta.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: activeMeta.color,
          }}>
            {activeMeta.icon}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>
              {activeTool}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {activeMeta.desc}
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate}>
          {/* Topic input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: 700,
              color: 'var(--text-secondary)', textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: '0.4rem'
            }}>
              Topic or Chapter Name *
            </label>
            <input
              ref={inputRef}
              type="text"
              className="input-field"
              required
              placeholder="e.g. Life Processes, Trigonometry, Acids Bases, The French Revolution..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              style={{ fontSize: '0.95rem', width: '100%' }}
            />
          </div>

          {/* Board + Grade Row */}
          <div
            className="sg-form-row"
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
          >
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--text-secondary)', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: '0.4rem'
              }}>
                Board
              </label>
              <select
                className="input-field"
                value={board}
                onChange={e => setBoard(e.target.value)}
                style={{ width: '100%' }}
              >
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--text-secondary)', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: '0.4rem'
              }}>
                Class / Grade
              </label>
              <select
                className="input-field"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                style={{ width: '100%' }}
              >
                {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !topic.trim()}
              style={{
                flex: 1, minWidth: '180px',
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {status && status !== 'thinking'
                    ? status
                    : `Generating ${activeTool}...`}
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate {activeTool}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Status bar */}
        {loading && (
          <div className="sg-status-bar">
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: activeMeta.color,
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                }} />
              ))}
            </div>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {status === 'thinking'
                ? '🤖 AI is generating your material...'
                : status || '🤖 Generating...'}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.875rem 1rem',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-sm)',
            color: '#ef4444',
            fontSize: '0.88rem',
            animation: 'fadeUp 0.2s ease'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Result Area ── */}
      {result && (
        <div className="sg-result-area" ref={resultRef}>
          {/* Result header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1.25rem',
            paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: activeMeta.color, fontWeight: 800, fontSize: '0.95rem'
              }}>
                {activeMeta.icon}
                {activeTool} — {topic}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Class {grade} · {board} Board
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Download size={13} />
                Download PDF
              </button>
              <button
                onClick={handleSave}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {saved ? <Check size={13} color="var(--success)" /> : <Bookmark size={13} />}
                {saved ? 'Saved ✓' : 'Save to History'}
              </button>
            </div>
          </div>

          {/* Rendered Markdown result */}
          <div
            className="generated-content"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              boxShadow: 'none',
              fontSize: '0.92rem',
              lineHeight: 1.8,
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
              children={String(result || '')}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { transform: scale(1); opacity: 0.4; }
          30% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
