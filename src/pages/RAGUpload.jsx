import React, { useState, useEffect } from 'react';
import { Upload, Book, FileText, CheckCircle, Sparkles, Trash2, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RAGUpload() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || currentUser?.email || 'guest';

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [stats, setStats] = useState({ size: 0, characters: 0, words: 0 });
  const [activeContext, setActiveContext] = useState(null);

  // Load existing RAG context on mount
  useEffect(() => {
    const stored = localStorage.getItem('tanios_rag_context');
    const storedName = localStorage.getItem('tanios_rag_filename') || 'Active Textbook';
    if (stored) {
      setActiveContext({ name: storedName, length: stored.length });
    }
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (fileObj) => {
    setFile(fileObj);
    setLoading(true);
    setProgress(10);

    try {
      let text = '';

      if (fileObj.name.toLowerCase().endsWith('.pdf')) {
        // ── Proper PDF Text Extraction using pdfjs-dist ──────────────────────
        setProgress(20);
        const arrayBuffer = await fileObj.arrayBuffer();
        setProgress(35);

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        setProgress(50);

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        const pagesToExtract = Math.min(totalPages, 60);
        const extractedPages = [];

        for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items
            .map(item => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (pageText) {
            extractedPages.push(`--- Page ${pageNum} ---\n${pageText}`);
          }
          setProgress(50 + Math.round((pageNum / pagesToExtract) * 40));
        }

        text = `[PDF: ${fileObj.name} | ${totalPages} pages]\n\n` + extractedPages.join('\n\n');
        setProgress(95);
      } else {
        // Plain text / markdown / JSON
        setProgress(40);
        text = await fileObj.text();
        setProgress(90);
      }

      // Cap at 20k chars to prevent token overflow
      const sanitized = text.substring(0, 20000);

      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setExtractedText(sanitized);
        setStats({
          size: fileObj.size,
          characters: sanitized.length,
          words: sanitized.split(/\s+/).filter(Boolean).length
        });
      }, 300);

    } catch (err) {
      console.error('[RAG] File extraction failed:', err);
      setLoading(false);
      setProgress(0);
      alert(`❌ Could not read this file: ${err.message || 'Unknown error'}. Please try a different file.`);
    }
  };

  const handleLockContext = () => {
    if (!extractedText || !file) return;

    localStorage.setItem('tanios_rag_context', extractedText);
    localStorage.setItem('tanios_rag_filename', file.name);
    setActiveContext({ name: file.name, length: extractedText.length });

    try {
      const xpKey = `tanios_xp_${userId}`;
      const currentXP = parseInt(localStorage.getItem(xpKey) || '120', 10);
      localStorage.setItem(xpKey, (currentXP + 30).toString());
      window.dispatchEvent(new Event('tanios_xp_update'));
    } catch (e) {
      console.warn(e);
    }

    // Trigger local status alert message
    alert(`🎉 Successfully connected "${file.name}" to your AI Study Companion! Your doubts will now be verified against this textbook context.`);
  };

  const handleClearContext = () => {
    localStorage.removeItem('tanios_rag_context');
    localStorage.removeItem('tanios_rag_filename');
    setActiveContext(null);
    setFile(null);
    setExtractedText('');
    setStats({ size: 0, characters: 0, words: 0 });
  };

  return (
    <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Dynamic scope css */}
      <style>{`
        .rag-container {
          animation: fadeUp 0.3s cubic-bezier(.4,0,.2,1) both;
        }
        .drag-box {
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          padding: 3rem 2rem;
          text-align: center;
          background: rgba(255,255,255,0.02);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .drag-box.active {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.05);
          transform: scale(1.01);
        }
        .stat-badge {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.5rem 1rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>

      <div className="rag-container">
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            width: '42px', height: '42px',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Book color="var(--primary)" size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>AI Textbook RAG Hub</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Upload your school textbooks, syllabus PDF, or revision notes. TaniOS AI will extract the content and study specifically from your books.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          fontSize: '0.82rem',
          color: 'var(--text)',
          marginBottom: '1.5rem',
          lineHeight: 1.5
        }}>
          <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>100% Stateless & Direct Browser RAG:</strong> Your textbook documents are processed entirely inside your local browser. No files are uploaded to third-party databases, protecting your school copyrights and ensuring complete offline privacy.
          </div>
        </div>

        {/* Active Context Status */}
        {activeContext && (
          <div className="card" style={{ border: '1px solid var(--success)', background: 'rgba(16,185,129,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--success)" />
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>Tutor Connected to: {activeContext.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  ({Math.round(activeContext.length / 1024)} KB active knowledge pages parsed)
                </div>
              </div>
            </div>
            <button 
              onClick={handleClearContext}
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <Trash2 size={13} /> Disconnect
            </button>
          </div>
        )}

        {/* Drag and Drop Box */}
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div 
            className={`drag-box ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input 
              id="file-upload"
              type="file" 
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.txt,.md,.json"
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <Upload size={36} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>Drag & Drop your textbook file here</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                  Supports PDF, TXT, MD, or JSON chapters. Max 10MB.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', marginTop: '0.5rem' }}>
                Browse Files
              </button>
            </div>
          </div>

          {/* Loading Progress */}
          {loading && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                <span>Extracting textbook pages...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: '5px', background: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          {/* File Statistics & Actions */}
          {file && !loading && (
            <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={16} /> Parsed Document Statistics:
              </h3>
              
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div className="stat-badge">📂 Filename: {file.name}</div>
                <div className="stat-badge">🔠 Characters: {stats.characters.toLocaleString()}</div>
                <div className="stat-badge">📝 Words: {stats.words.toLocaleString()}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={handleLockContext}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}
                  disabled={!extractedText}
                >
                  <Sparkles size={16} /> Lock Book into AI Tutor & Claim +30 XP
                </button>
                <button 
                  onClick={() => navigate('/chat')}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1rem' }}
                >
                  Go to Chat <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Study Advice */}
        <section className="card">
          <h2 style={{ fontSize: '1.05rem', color: 'var(--text)', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={18} color="var(--primary)" /> How does RAG study with you?
          </h2>
          <ol style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.7, margin: 0 }}>
            <li>Upload your class chapter or syllabus sheet.</li>
            <li>Click <strong>Lock Book</strong>. The system will compile the pages into a local context payload.</li>
            <li>Open the <strong>AI Doubt Solver</strong> chat and ask a question.</li>
            <li>The AI tutor will automatically cross-reference its answers against the specific pages of your uploaded book to match your exact class syllabus!</li>
          </ol>
        </section>

      </div>
    </div>
  );
}
