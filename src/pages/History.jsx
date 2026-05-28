import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, FileText, GraduationCap, Clock, BookOpen, AlertCircle, X, Copy, Check, Download } from 'lucide-react';
import { getUserDocuments } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { jsPDF } from 'jspdf';

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

export default function History() {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      if (currentUser) {
        try {
          const docs = await getUserDocuments(currentUser.uid || currentUser.email);
          setDocuments(docs);
        } catch (err) {
          console.error("Fetch error:", err);
          setFetchError(err.message || "Failed to load saved materials.");
        }
      }
      setLoading(false);
    }
    fetchDocs();
  }, [currentUser]);

  const getIcon = (type) => {
    switch(type) {
      case 'note': return <FileText size={20} color="var(--primary)" />;
      case 'test': return <GraduationCap size={20} color="#f43f5e" />;
      case 'timetable': return <Clock size={20} color="#8b5cf6" />;
      case 'revision': return <BookOpen size={20} color="#10b981" />;
      default: return <FileText size={20} />;
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'note': return 'Short Notes';
      case 'test': return 'Mock Test';
      case 'timetable': return 'Study Timetable';
      case 'revision': return 'Revision Recap';
      default: return 'Study Material';
    }
  };

  const handleCopy = () => {
    if (selectedDoc) {
      navigator.clipboard.writeText(selectedDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedDoc || downloading) return;
    setDownloading(true);
    try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const marginL = 15;
    const marginR = 15;
    const marginT = 20;
    const marginB = 18;
    const maxW = pageW - marginL - marginR;
    let y = marginT;

    const newPage = () => { pdf.addPage(); y = marginT; };
    const checkPage = (h) => { if (y + h > pageH - marginB) newPage(); };

    // ── Clean inline markdown + math formulas ──────────────────────────────
    const cleanLine = (text) => {
      return text
        // LaTeX display math $$...$$ → strip
        .replace(/\$\$([^$]*)\$\$/g, (_, inner) => {
          const t = inner.trim();
          return t.length > 0 && t.length < 80 ? `[${t}]` : '[Formula]';
        })
        // LaTeX inline math $...$ → strip
        .replace(/\$([^$\n]{1,120})\$/g, (_, inner) => {
          const t = inner.trim();
          return t.length > 0 && t.length < 80 ? `[${t}]` : '[Formula]';
        })
        // Lone $ leftover
        .replace(/\$/g, '')
        // Bold
        .replace(/\*\*(.+?)\*\*/gs, '$1')
        // Italic
        .replace(/\*(.+?)\*/gs, '$1')
        // Inline code
        .replace(/`([^`]+)`/g, '$1')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '$1')
        // Links
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        // Trailing whitespace
        .trim();
    };

    const drawWrapped = (text, x, w, fontSize, style, color, lh) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', style);
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, w);
      lines.forEach(l => { checkPage(lh); pdf.text(l, x, y); y += lh; });
    };

    // ── Render a markdown table (array of row-arrays) ─────────────────────
    const renderTable = (rows) => {
      if (rows.length === 0) return;
      const cols = rows[0].length;
      if (cols === 0) return;

      const cellPad = 2.5;
      const rowH = 7;
      const fontSize = 8.5;
      const colW = maxW / cols;

      // Header row
      checkPage(rowH + 2);
      const startX = marginL;
      let cx = startX;

      // Header background
      pdf.setFillColor(79, 70, 229);
      pdf.rect(startX, y - rowH + 2, maxW, rowH, 'F');

      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);

      rows[0].forEach((cell, ci) => {
        const cellText = cleanLine(cell);
        const lines = pdf.splitTextToSize(cellText, colW - cellPad * 2);
        pdf.text(lines[0] || '', cx + cellPad, y, { maxWidth: colW - cellPad * 2 });
        cx += colW;
      });
      // Header border
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.2);
      for (let ci = 1; ci < cols; ci++) {
        pdf.line(startX + ci * colW, y - rowH + 2, startX + ci * colW, y + 2);
      }
      y += rowH - 3;

      // Data rows
      rows.slice(1).forEach((row, ri) => {
        // Calculate max lines in this row for height
        let maxLines = 1;
        row.forEach(cell => {
          const lines = pdf.splitTextToSize(cleanLine(cell), colW - cellPad * 2);
          if (lines.length > maxLines) maxLines = lines.length;
        });
        const thisRowH = Math.max(rowH, maxLines * 4.5 + cellPad * 2);
        checkPage(thisRowH);

        // Alternating background
        if (ri % 2 === 0) {
          pdf.setFillColor(248, 248, 252);
          pdf.rect(startX, y - 4, maxW, thisRowH, 'F');
        }

        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 50);

        cx = startX;
        row.forEach((cell, ci) => {
          const cellText = cleanLine(cell);
          const lines = pdf.splitTextToSize(cellText, colW - cellPad * 2);
          lines.forEach((l, li) => {
            pdf.text(l, cx + cellPad, y + li * 4.2);
          });
          cx += colW;
        });

        // Row bottom border
        pdf.setDrawColor(220, 220, 230);
        pdf.setLineWidth(0.2);
        pdf.line(startX, y + thisRowH - 4, startX + maxW, y + thisRowH - 4);

        // Col dividers
        for (let ci = 1; ci < cols; ci++) {
          pdf.line(startX + ci * colW, y - 4, startX + ci * colW, y + thisRowH - 4);
        }

        y += thisRowH - 2;
      });

      // Outer border
      pdf.setDrawColor(180, 180, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(startX, y - (rows.length) * rowH + 4, maxW, (rows.length) * rowH, 'S');

      y += 4;
    };

    // ── PDF branded header bar ────────────────────────────────────────────
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageW, 11, 'F');
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TaniOS AI \u2014 Study Material', marginL, 7.5);
    pdf.text(new Date().toLocaleDateString('en-IN'), pageW - marginR, 7.5, { align: 'right' });
    y = 19;

    // Title
    pdf.setFontSize(17);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 22, 28);
    const titleLines = pdf.splitTextToSize(selectedDoc.title, maxW);
    titleLines.forEach(l => { pdf.text(l, marginL, y); y += 8; });

    // Subtitle
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 130);
    pdf.text(
      `${getTypeLabel(selectedDoc.type)}  \u00b7  Saved on ${selectedDoc.createdAt?.toDate ? selectedDoc.createdAt.toDate().toLocaleDateString('en-IN') : 'N/A'}`,
      marginL, y
    );
    y += 4.5;

    // Divider
    pdf.setDrawColor(210, 210, 220);
    pdf.setLineWidth(0.35);
    pdf.line(marginL, y, pageW - marginR, y);
    y += 6;

    // ── Pre-process: group lines into blocks ──────────────────────────────
    const rawLines = (selectedDoc.content || '').split('\n');
    let i = 0;

    while (i < rawLines.length) {
      const raw = rawLines[i];
      const line = raw.trimEnd();

      // ── Code block ──────────────────────────────────────────────────────
      if (line.startsWith('```')) {
        const codeLines = [];
        i++;
        while (i < rawLines.length && !rawLines[i].startsWith('```')) {
          codeLines.push(rawLines[i]);
          i++;
        }
        i++; // skip closing ```
        if (codeLines.length > 0) {
          const blockH = codeLines.length * 4.2 + 6;
          checkPage(blockH);
          pdf.setFillColor(244, 244, 248);
          pdf.setDrawColor(200, 200, 215);
          pdf.setLineWidth(0.25);
          pdf.roundedRect(marginL, y - 1, maxW, blockH, 1.5, 1.5, 'FD');
          pdf.setFontSize(8);
          pdf.setFont('courier', 'normal');
          pdf.setTextColor(55, 55, 75);
          codeLines.forEach(cl => {
            checkPage(4.2);
            pdf.text(cl || ' ', marginL + 3, y + 3);
            y += 4.2;
          });
          y += 5;
        }
        continue;
      }

      // ── Markdown table ───────────────────────────────────────────────────
      // A table block = consecutive lines starting with |
      if (/^\|/.test(line)) {
        const tableRows = [];
        while (i < rawLines.length && /^\|/.test(rawLines[i].trimEnd())) {
          const rowLine = rawLines[i].trim();
          i++;
          // Skip separator rows like | :--- | --- | :---: |
          if (/^\|[\s:|-]+\|$/.test(rowLine)) continue;
          // Parse cells
          const cells = rowLine
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(c => c.trim());
          tableRows.push(cells);
        }
        if (tableRows.length > 0) renderTable(tableRows);
        continue;
      }

      // ── Blank line ───────────────────────────────────────────────────────
      if (line.trim() === '') { y += 2.5; i++; continue; }

      // ── Horizontal rule (only standalone ---, not table separators) ──────
      if (/^[-*_]{3,}$/.test(line.trim())) {
        checkPage(4);
        pdf.setDrawColor(200, 200, 210);
        pdf.setLineWidth(0.3);
        pdf.line(marginL, y, pageW - marginR, y);
        y += 5;
        i++; continue;
      }

      // ── H1 ───────────────────────────────────────────────────────────────
      if (/^# /.test(line)) {
        const text = cleanLine(line.replace(/^# /, ''));
        y += 2;
        checkPage(9);
        pdf.setFontSize(14.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(35, 35, 45);
        pdf.splitTextToSize(text, maxW).forEach(l => { checkPage(7); pdf.text(l, marginL, y); y += 7; });
        pdf.setDrawColor(79, 70, 229);
        pdf.setLineWidth(0.5);
        pdf.line(marginL, y, marginL + Math.min(45, pdf.getTextWidth(text) + 2), y);
        y += 4;
        i++; continue;
      }

      // ── H2 ───────────────────────────────────────────────────────────────
      if (/^## /.test(line)) {
        const text = cleanLine(line.replace(/^## /, ''));
        y += 2;
        checkPage(8);
        pdf.setFontSize(12.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(45, 45, 60);
        pdf.splitTextToSize(text, maxW).forEach(l => { checkPage(6.5); pdf.text(l, marginL, y); y += 6.5; });
        y += 1;
        i++; continue;
      }

      // ── H3 ───────────────────────────────────────────────────────────────
      if (/^### /.test(line)) {
        const text = cleanLine(line.replace(/^### /, ''));
        y += 1;
        checkPage(6);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 55, 70);
        pdf.splitTextToSize(text, maxW).forEach(l => { checkPage(6); pdf.text(l, marginL, y); y += 6; });
        i++; continue;
      }

      // ── H4/H5/H6 ─────────────────────────────────────────────────────────
      if (/^#{4,6} /.test(line)) {
        const text = cleanLine(line.replace(/^#{4,6} /, ''));
        drawWrapped(text, marginL, maxW, 10, 'bold', [65, 65, 80], 5.5);
        i++; continue;
      }

      // ── Bullet list ───────────────────────────────────────────────────────
      if (/^(\s*)([-*+]) /.test(line)) {
        const indentSpaces = line.match(/^(\s*)/)[1].length;
        const indent = Math.min(indentSpaces / 2, 3) * 4;
        const text = cleanLine(line.replace(/^\s*[-*+] /, ''));
        checkPage(5.5);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 45);
        pdf.setFillColor(79, 70, 229);
        pdf.circle(marginL + indent + 1.5, y - 1.5, 0.85, 'F');
        const wrapped = pdf.splitTextToSize(text, maxW - indent - 5);
        wrapped.forEach(l => { checkPage(5.5); pdf.text(l, marginL + indent + 5, y); y += 5.5; });
        i++; continue;
      }

      // ── Numbered list ─────────────────────────────────────────────────────
      if (/^\s*\d+\. /.test(line)) {
        const num = line.match(/^\s*(\d+)\./)[1];
        const text = cleanLine(line.replace(/^\s*\d+\. /, ''));
        checkPage(5.5);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(79, 70, 229);
        pdf.text(`${num}.`, marginL, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 45);
        pdf.splitTextToSize(text, maxW - 8).forEach(l => { checkPage(5.5); pdf.text(l, marginL + 8, y); y += 5.5; });
        i++; continue;
      }

      // ── Blockquote ────────────────────────────────────────────────────────
      if (/^> /.test(line)) {
        const text = cleanLine(line.replace(/^> /, ''));
        const wrapped = pdf.splitTextToSize(text, maxW - 7);
        const bh = wrapped.length * 5 + 4;
        checkPage(bh);
        pdf.setFillColor(242, 241, 255);
        pdf.rect(marginL, y - 3.5, maxW, bh, 'F');
        pdf.setFillColor(79, 70, 229);
        pdf.rect(marginL, y - 3.5, 2.5, bh, 'F');
        pdf.setFontSize(9.5);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(55, 55, 75);
        wrapped.forEach(l => { pdf.text(l, marginL + 5, y); y += 5; });
        y += 2;
        i++; continue;
      }

      // ── Normal paragraph ──────────────────────────────────────────────────
      const text = cleanLine(line);
      if (text) drawWrapped(text, marginL, maxW, 10, 'normal', [38, 38, 45], 5.5);
      i++;
    }

    // ── Footer on all pages ───────────────────────────────────────────────
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setDrawColor(210, 210, 220);
      pdf.setLineWidth(0.25);
      pdf.line(marginL, pageH - 11, pageW - marginR, pageH - 11);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 160);
      pdf.text('Generated by TaniOS AI \u00b7 tanios.ai', marginL, pageH - 7);
      pdf.text(`Page ${p} / ${totalPages}`, pageW - marginR, pageH - 7, { align: 'right' });
    }

    pdf.save(`${selectedDoc.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'TaniOS_Study_Material'}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setDownloading(false);
    }
  };



  if (currentUser?.isGuest) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65vh', textAlign: 'center' }}>
        <div style={{
          width: '5rem', height: '5rem',
          background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(0, 242, 254, 0.15))',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <Bookmark size={36} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
          Save &amp; Access Your Study Materials! 📚
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          Get instant access to your history of custom AI notes, test papers, and timetables. Sign in with Google to enable permanent saving!
        </p>
        <button 
          onClick={() => useAuth().setShowLoginModal(true)}
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1.75rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(108, 99, 255, 0.25)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            margin: '0 auto'
          }}
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: 'var(--primary-light)' }}>
          <Bookmark size={24} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Saved Materials</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Access your previously generated notes, timetables, and tests.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', padding: '2rem 0' }}>
          <div style={{ width: '20px', height: '20px', border: '2.5px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Loading your saved materials...
        </div>
      ) : fetchError ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', borderColor: 'rgba(239,68,68,0.3)' }}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Could not load saved materials</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{fetchError}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            This usually means Firestore Security Rules are blocking reads, or a database index is missing.<br />
            Check the browser console for a Firestore index creation link.
          </p>
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You haven't saved any materials yet. Try generating some notes or a test!</p>
        </div>
      ) : (
        <div className="grid-cards">
          {documents.map(doc => (
            <div key={doc.id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedDoc(doc)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  {getIcon(doc.type)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : 'Just now'}
                </div>
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{doc.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Type: {getTypeLabel(doc.type)}
              </p>
              <p style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600, marginTop: 'auto' }}>
                View Document &rarr;
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── DOCUMENT VIEWER MODAL ── */}
      {selectedDoc && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem' // high z-index
        }} onClick={() => setSelectedDoc(null)}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '1rem',
            width: '100%', maxWidth: '800px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-tertiary)'
            }}>
              <div>
                <span style={{
                  fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                  fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)',
                  padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-block',
                  marginBottom: '0.375rem'
                }}>
                  {getTypeLabel(selectedDoc.type)}
                </span>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{selectedDoc.title}</h2>
              </div>
              <button style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', padding: '0.25rem', borderRadius: '50%'
              }} onClick={() => setSelectedDoc(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              <div ref={contentRef} className="generated-content" style={{
                padding: '1.5rem', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', lineHeight: '1.8'
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{selectedDoc.content}</ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.5rem', borderTop: '1px solid var(--border)',
              background: 'var(--bg-tertiary)'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Saved: {selectedDoc.createdAt?.toDate ? selectedDoc.createdAt.toDate().toLocaleDateString() : 'Just now'}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={handleCopy}>
                  {copied ? <Check size={16} color="green" /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: downloading ? 0.7 : 1 }} 
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  {downloading ? (
                    <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  ) : (
                    <Download size={16} />
                  )}
                  {downloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Fade In Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  );
}
