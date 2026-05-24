import React, { useEffect, useState, useRef } from 'react';
import { Bookmark, FileText, GraduationCap, Clock, BookOpen, AlertCircle, X, Copy, Check, Download } from 'lucide-react';
import { getUserDocuments } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function History() {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef(null);

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
    if (!contentRef.current || !selectedDoc) return;
    
    const canvas = await html2canvas(contentRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${selectedDoc.title.replace(/\s+/g, '_')}.pdf`);
  };

  if (!currentUser) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
        <h2>Please Sign In</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You must be logged in to view your saved materials.</p>
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
      {selectedDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
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
                <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
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
                <button className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={handleDownloadPDF}>
                  <Download size={16} />
                  Download PDF
                </button>
              </div>
            </div>

          </div>
        </div>
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
