import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Download, Copy, Check, Loader2 } from 'lucide-react';
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

const markdownComponents = {
  table: ({ children }) => (<div className="md-table-wrapper"><table className="md-table">{children}</table></div>),
  thead: ({ children }) => <thead className="md-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="md-tr">{children}</tr>,
  th: ({ children }) => <th className="md-th">{children}</th>,
  td: ({ children }) => <td className="md-td">{children}</td>,
  code: ({ inline, children }) => inline
    ? <code className="md-inline-code">{children}</code>
    : <div className="md-code-block"><code>{children}</code></div>,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notes() {
  const { currentUser, incrementGuestUsage } = useAuth();
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [copied, setCopied]       = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError]         = useState(null);

  const [board, setBoard]     = useState('');
  const [grade, setGrade]     = useState('');
  const [stream, setStream]   = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [type, setType]       = useState('Short Notes');
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
    setResult({ title: docTitle, content: fixMathFormatting(response.text) });
    setLoading(false); setStatusMsg(''); // ✅ Stop loading BEFORE saving to DB

    // Fire-and-forget — never block UI on Firestore
    if (currentUser) {
      saveDocument(currentUser.uid || currentUser.email, 'note', docTitle, response.text)
        .catch(err => console.warn('Save failed (non-blocking):', err));
    }
  };

  const handleCopy = () => {
    if (result) { navigator.clipboard.writeText(result.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    
    // Split into multiple pages if content exceeds standard height
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
    <div className="page-content">

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

      <div className={`generator-layout ${result ? 'has-result' : ''}`}>
        <form onSubmit={handleGenerate} className="card">

          {/* Board */}
          <div className="input-group">
            <label className="input-label">Select Board</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
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
              <><Sparkles size={18} /> Generate Notes</>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="card" style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', margin: 0, lineHeight: 1.4 }}>{result.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={handleCopy} title="Copy Text">
                  {copied ? <Check size={18} color="green" /> : <Copy size={18} />}
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={handleDownloadPDF} title="Download PDF">
                  <Download size={18} />
                </button>
              </div>
            </div>
            <div ref={contentRef} style={{ lineHeight: '1.8', padding: '1rem', backgroundColor: 'var(--bg-secondary)' }} className="generated-content">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{result.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
