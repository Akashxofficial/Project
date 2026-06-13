import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Sparkles, Download, Copy, Check, Loader2, X, BookOpen, Save } from 'lucide-react';
import { generateAIContent, fixMathFormatting } from '../lib/ai';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { saveDocument } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import MathRenderer from '../components/MathRenderer';

const markdownComponents = {
  table: ({ children }) => (<div className="md-table-wrapper"><table className="md-table">{children}</table></div>),
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
    return <div className="md-code-block"><code className={className} {...props}>{children}</code></div>;
  },
  blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
};

// ─── Curriculum Data ──────────────────────────────────────────────────────────

const SUBJECTS = {
  CBSE: {
    '8th':  ['Mathematics', 'Science', 'Social Science (History)', 'Social Science (Geography)', 'Social Science (Civics)', 'English (Honeydew)', 'English (It So Happened)', 'Hindi (Vasant)', 'Hindi (Durva)', 'Sanskrit (Ruchira)'],
    '9th':  ['Mathematics', 'Science (Physics)', 'Science (Chemistry)', 'Science (Biology)', 'Social Science (History)', 'Social Science (Geography)', 'Social Science (Civics)', 'Social Science (Economics)', 'English (Beehive)', 'English (Moments)', 'Hindi (Kshitij)', 'Hindi (Sparsh)', 'Sanskrit (Shemushi)'],
    '10th': ['Mathematics (Standard)', 'Mathematics (Basic)', 'Science (Physics)', 'Science (Chemistry)', 'Science (Biology)', 'Social Science (History)', 'Social Science (Geography)', 'Social Science (Civics)', 'Social Science (Economics)', 'English (First Flight)', 'English (Footprints Without Feet)', 'Hindi (Kshitij II)', 'Hindi (Sparsh II)', 'Sanskrit (Shemushi II)'],
    '11th': {
      Science:  ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Physical Education', 'English (Hornbill)', 'Hindi'],
      Commerce: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'English (Hornbill)', 'Hindi', 'Physical Education'],
      Arts:     ['History', 'Political Science', 'Geography', 'Psychology', 'Sociology', 'Economics', 'English (Hornbill)', 'Hindi', 'Fine Arts'],
    },
    '12th': {
      Science:  ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Physical Education', 'English (Flamingo + Vistas)', 'Hindi'],
      Commerce: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'English (Flamingo + Vistas)', 'Hindi', 'Physical Education'],
      Arts:     ['History', 'Political Science', 'Geography', 'Psychology', 'Sociology', 'Economics', 'English (Flamingo + Vistas)', 'Hindi', 'Fine Arts'],
    },
  },
  RBSE: {
    '8th':  ['Ganit (Mathematics)', 'Vigyan (Science)', 'Samajik Vigyan (Social Science)', 'Hindi', 'English', 'Sanskrit', 'Naitik Shiksha'],
    '9th':  ['Ganit (Mathematics)', 'Bhautiki (Physics)', 'Rasayan (Chemistry)', 'Jeev Vigyan (Biology)', 'Itihas (History)', 'Bhugol (Geography)', 'Rajniti Vigyan (Civics)', 'Arthshastra (Economics)', 'Hindi', 'English', 'Sanskrit'],
    '10th': ['Ganit (Mathematics)', 'Bhautiki (Physics)', 'Rasayan (Chemistry)', 'Jeev Vigyan (Biology)', 'Itihas (History)', 'Bhugol (Geography)', 'Rajniti Vigyan (Civics)', 'Arthshastra (Economics)', 'Hindi', 'English', 'Sanskrit', 'Information Technology (IT)'],
    '11th': {
      Science:  ['Bhautiki (Physics)', 'Rasayan (Chemistry)', 'Jeev Vigyan (Biology)', 'Ganit (Mathematics)', 'Computer Science', 'English', 'Hindi'],
      Commerce: ['Lekha Shastra (Accountancy)', 'Vyavsay Adhyayan (Business Studies)', 'Arthshastra (Economics)', 'Ganit', 'English', 'Hindi'],
      Arts:     ['Itihas (History)', 'Rajniti Vigyan (Political Science)', 'Bhugol (Geography)', 'Manovigyan (Psychology)', 'Samajshastra (Sociology)', 'Arthshastra (Economics)', 'English', 'Hindi', 'Sanskrit'],
    },
    '12th': {
      Science:  ['Bhautiki (Physics)', 'Rasayan (Chemistry)', 'Jeev Vigyan (Biology)', 'Ganit (Mathematics)', 'Computer Science', 'English', 'Hindi'],
      Commerce: ['Lekha Shastra (Accountancy)', 'Vyavsay Adhyayan (Business Studies)', 'Arthshastra (Economics)', 'Ganit', 'English', 'Hindi'],
      Arts:     ['Itihas (History)', 'Rajniti Vigyan (Political Science)', 'Bhugol (Geography)', 'Manovigyan (Psychology)', 'Samajshastra (Sociology)', 'Arthshastra (Economics)', 'English', 'Hindi', 'Sanskrit'],
    },
  },
};

const CLASSES = ['8th', '9th', '10th', '11th', '12th'];
const STREAMS = ['Science', 'Commerce', 'Arts'];
const SENIOR = ['11th', '12th'];

// ─── Full-Screen Notes Viewer Modal ──────────────────────────────────────────

function NotesViewer({ result, onClose, onDownloadPDF, onCopy, copied, saving, saveStatus, contentRef }) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.25s ease both',
      overflow: 'hidden'
    }}>
      {/* ── Viewer Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BookOpen size={18} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              AI Notes — Saved ✓
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.title}
            </div>
          </div>
        </div>

        {/* Save Status Toast */}
        {saveStatus && (
          <div style={{
            background: saveStatus.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${saveStatus.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: saveStatus.ok ? '#34d399' : '#f87171',
            padding: '0.4rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            {saveStatus.ok ? <Check size={14} /> : '⚠️'} {saveStatus.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={onCopy}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            title="Copy text"
          >
            {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onDownloadPDF}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            title="Download PDF"
          >
            <Download size={15} /> PDF
          </button>
          <button
            onClick={onClose}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0
            }}
            title="Close viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Notes Content ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem',
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        <div
          ref={contentRef}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '2rem 2.5rem',
            lineHeight: '1.85',
          }}
          className="generated-content notes-viewer-content"
        >
          <h1 style={{
            fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem',
            paddingBottom: '1rem', borderBottom: '1px solid var(--border)',
            color: 'var(--text)', lineHeight: 1.3
          }}>
            {result.title}
          </h1>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {result.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notes() {
  const { currentUser, incrementGuestUsage } = useAuth();
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [copied, setCopied]         = useState(false);
  const [statusMsg, setStatusMsg]   = useState('');
  const [error, setError]           = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { ok, msg }

  const [board, setBoard]         = useState('');
  const [grade, setGrade]         = useState('');
  const [stream, setStream]       = useState('');
  const [subject, setSubject]     = useState('');
  const [chapter, setChapter]     = useState('');
  const [type, setType]           = useState('Short Notes');
  const [noteLanguage, setNoteLanguage] = useState('English');

  const contentRef = useRef(null);

  const isSenior = SENIOR.includes(grade);

  // Derive subject list
  const subjectList = (() => {
    if (!board || !grade) return [];
    const gradeData = SUBJECTS[board]?.[grade];
    if (!gradeData) return [];
    if (Array.isArray(gradeData)) return gradeData;          // 8-10
    if (stream && gradeData[stream]) return gradeData[stream]; // 11-12
    return [];
  })();

  const handleBoardChange = (val) => { setBoard(val); setGrade(''); setStream(''); setSubject(''); setNoteLanguage('English'); };
  const handleGradeChange = (val) => { setGrade(val); setStream(''); setSubject(''); };
  const handleStreamChange = (val) => { setStream(val); setSubject(''); };

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!incrementGuestUsage()) {
      return;
    }

    setLoading(true); setError(null); setResult(null); setStatusMsg('thinking');
    setViewerOpen(false); setSaveStatus(null);

    const streamLabel = isSenior && stream ? ` (${stream} Stream)` : '';

    const languageInstruction = (board === 'RBSE' && noteLanguage === 'Hindi')
      ? `You MUST write and generate all note content in Hindi language (using Devanagari script). Write clear, standard Hindi suitable for Rajasthan Board (RBSE) exam papers, but feel free to include complex scientific or mathematical terms in English inside parentheses, e.g., "प्रकाश संश्लेषण (Photosynthesis)".`
      : `You MUST write and generate all note content in English language.`;

    const prompt = `You are an expert Indian school teacher for Class ${grade}${streamLabel} - ${board} Board.
Generate ${type} for subject: ${subject}, chapter/topic: "${chapter}".
Strictly follow ${board} syllabus for Class ${grade}.
${languageInstruction}
Format with Markdown — use headings, bullet points, bold key terms, tables where useful.
Keep it student-friendly, concise, and exam-focused for ${board} Class ${grade} pattern.
Ensure that any scientific, mathematical, or numerical equations are properly formatted in Markdown using single '$' delimiters for KaTeX, e.g., $E = mc^2$ or $\\frac{a}{b}$.`;

    const onStatus = (msg) => setStatusMsg(msg || '');
    const response = await generateAIContent(prompt, onStatus);

    if (response.error || !response.text) {
      setError(response.message || '⚠️ Something went wrong. Please try again.');
      setLoading(false); setStatusMsg('');
      return;
    }

    const streamTag = isSenior && stream ? ` [${stream}]` : '';
    const langTag = board === 'RBSE' ? ` [${noteLanguage}]` : '';
    const docTitle = `[${board} Cl.${grade}${streamTag}${langTag}] ${subject} — ${chapter} (${type})`;
    const fixedContent = fixMathFormatting(response.text);

    setResult({ title: docTitle, content: fixedContent });
    setLoading(false); setStatusMsg('');

    // Open the full-screen viewer automatically
    setViewerOpen(true);

    // Save to database — show confirmation
    setSaving(true);
    try {
      const userId = currentUser?.uid || currentUser?.email;
      if (userId) {
        await saveDocument(userId, 'note', docTitle, response.text);
        setSaveStatus({ ok: true, msg: '✓ Saved to your history' });
      } else {
        // Save to localStorage for guests
        try {
          const guestDocs = JSON.parse(localStorage.getItem('guest_notes') || '[]');
          guestDocs.unshift({ id: `note_${Date.now()}`, title: docTitle, content: response.text, createdAt: Date.now() });
          localStorage.setItem('guest_notes', JSON.stringify(guestDocs.slice(0, 20)));
          setSaveStatus({ ok: true, msg: '✓ Saved locally (login to sync)' });
        } catch (e) {
          setSaveStatus({ ok: false, msg: 'Could not save locally' });
        }
      }
    } catch (err) {
      setSaveStatus({ ok: false, msg: 'Save failed — try again' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: '#07090e' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${chapter.replace(/\s+/g, '_')}_Notes.pdf`);
  };

  const isFormReady = board && grade && subject && chapter && (!isSenior || stream);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-content" style={{ maxWidth: '640px', margin: '0 auto' }}>

      {/* Full-Screen Viewer Portal */}
      {viewerOpen && result && (
        <NotesViewer
          result={result}
          onClose={() => setViewerOpen(false)}
          onCopy={handleCopy}
          onDownloadPDF={handleDownloadPDF}
          copied={copied}
          saving={saving}
          saveStatus={saveStatus}
          contentRef={contentRef}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: 'var(--primary-light)' }}>
          <FileText size={24} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI Notes Generator</h1>
          <p style={{ color: 'var(--text-secondary)' }}>CBSE &amp; RBSE · Class 8–12 · Board-specific notes in seconds.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Last generated note - re-open button */}
      {result && !viewerOpen && (
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.2rem' }}>
              ✓ Notes Generated & Saved
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.title}
            </div>
          </div>
          <button
            onClick={() => setViewerOpen(true)}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
          >
            <BookOpen size={15} /> Open Notes Viewer
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleGenerate} className="card">

        {/* Board */}
        <div className="input-group">
          <label className="input-label">Select Board</label>
          <div className="notes-grid-2">
            {['CBSE', 'RBSE'].map(b => (
              <button key={b} type="button" onClick={() => handleBoardChange(b)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${board === b ? 'var(--primary)' : 'var(--border)'}`, background: board === b ? 'var(--primary-light)' : 'var(--bg-tertiary)', color: board === b ? 'var(--primary)' : 'var(--text)', fontWeight: board === b ? 700 : 500, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.18s ease' }}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Language Selector (RBSE only) */}
        {board === 'RBSE' && (
          <div className="input-group">
            <label className="input-label">Select Note Language</label>
            <div className="notes-grid-2">
              {['English', 'Hindi'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setNoteLanguage(lang)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${noteLanguage === lang ? 'var(--primary)' : 'var(--border)'}`,
                    background: noteLanguage === lang ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    color: noteLanguage === lang ? 'var(--primary)' : 'var(--text)',
                    fontWeight: noteLanguage === lang ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {lang === 'English' ? '🇬🇧 English' : '🇮🇳 Hindi (हिंदी)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Class */}
        <div className="input-group">
          <label className="input-label">Select Class</label>
          <div className="notes-grid-5">
            {CLASSES.map(cls => (
              <button key={cls} type="button" onClick={() => handleGradeChange(cls)} disabled={!board} style={{ padding: '0.625rem 0.25rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${grade === cls ? 'var(--primary)' : 'var(--border)'}`, background: grade === cls ? 'var(--primary-light)' : 'var(--bg-tertiary)', color: grade === cls ? 'var(--primary)' : 'var(--text)', fontWeight: grade === cls ? 700 : 500, cursor: board ? 'pointer' : 'not-allowed', opacity: board ? 1 : 0.4, fontSize: '0.8rem', transition: 'all 0.18s ease' }}>
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Stream (11th & 12th only) */}
        {isSenior && (
          <div className="input-group">
            <label className="input-label">Select Stream</label>
            <div className="notes-grid-3">
              {STREAMS.map(s => (
                <button key={s} type="button" onClick={() => handleStreamChange(s)} style={{ padding: '0.625rem 0.25rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${stream === s ? 'var(--primary)' : 'var(--border)'}`, background: stream === s ? 'var(--primary-light)' : 'var(--bg-tertiary)', color: stream === s ? 'var(--primary)' : 'var(--text)', fontWeight: stream === s ? 700 : 500, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.18s ease' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="input-group">
          <label className="input-label">
            Subject
            {board && grade && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                {board} · Class {grade}{isSenior && stream ? ` · ${stream}` : ''}
              </span>
            )}
          </label>
          <select className="input-field" required value={subject} disabled={!subjectList.length} onChange={e => setSubject(e.target.value)}>
            <option value="">{subjectList.length ? 'Select Subject...' : (isSenior && !stream ? 'Select Stream first' : 'Select Board & Class first')}</option>
            {subjectList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Chapter */}
        <div className="input-group">
          <label className="input-label">Chapter Name or Topic</label>
          <input type="text" className="input-field" placeholder={subject ? `Enter chapter from ${subject}` : 'e.g. Structure of Atom'} required value={chapter} onChange={e => setChapter(e.target.value)} disabled={!subject} />
        </div>

        {/* Note Type */}
        <div className="input-group">
          <label className="input-label">Note Type</label>
          <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
            <option value="Short Notes">📝 Short Notes</option>
            <option value="Key Points">🎯 Key Points (Bullet-wise)</option>
            <option value="Formula Sheet">🔢 Formula / Definition Sheet</option>
            <option value="Exam Summary">📋 Exam Summary (Most Important)</option>
            <option value="Mind Map Outline">🧠 Mind Map Outline</option>
            <option value="One-Page Revision">⚡ One-Page Revision</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading || !isFormReady}>
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              {statusMsg && statusMsg !== 'thinking' ? statusMsg : 'Generating Notes...'}
            </>
          ) : (
            <><Sparkles size={18} /> Generate Notes &amp; Open Viewer</>
          )}
        </button>
      </form>

      <style>{`
        .notes-viewer-content h1, .notes-viewer-content h2, .notes-viewer-content h3 {
          color: var(--primary) !important;
          margin-top: 1.5rem !important;
        }
        .notes-viewer-content p, .notes-viewer-content li {
          color: var(--text) !important;
          line-height: 1.85 !important;
        }
        .notes-viewer-content strong {
          color: var(--text) !important;
        }
      `}</style>
    </div>
  );
}
