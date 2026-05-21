import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Download, Copy, Check } from 'lucide-react';
import { generateAIContent, generateNotesPrompt } from '../lib/ai';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';

export default function Notes() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Form states
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [type, setType] = useState('Short Notes');

  const contentRef = useRef(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const prompt = generateNotesPrompt(grade, subject, chapter, type);
    const generatedText = await generateAIContent(prompt);
    
    setResult({
      title: `${chapter} - ${type}`,
      content: generatedText
    });
    setLoading(false);
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
    
    const canvas = await html2canvas(contentRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${chapter.replace(/\\s+/g, '_')}_Notes.pdf`);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: 'var(--primary-light)' }}>
          <FileText size={24} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI Notes Generator</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Generate short notes, key points, and formula sheets instantly.</p>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: result ? '1fr 2fr' : '1fr', gap: '2rem' }}>
        <form onSubmit={handleGenerate} className="card">
          <div className="input-group">
            <label className="input-label">Select Class</label>
            <select className="input-field" required value={grade} onChange={e => setGrade(e.target.value)}>
              <option value="">Select...</option>
              <option value="8th">Class 8th</option>
              <option value="9th">Class 9th</option>
              <option value="10th">Class 10th</option>
              <option value="11th">Class 11th</option>
              <option value="12th">Class 12th</option>
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Subject</label>
            <select className="input-field" required value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">Select...</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Science">Science (General)</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Social Science">Social Science</option>
              <option value="English">English</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Chapter Name or Topic</label>
            <input type="text" className="input-field" placeholder="e.g. Structure of Atom" required value={chapter} onChange={e => setChapter(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Note Type</label>
            <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
              <option value="Short Notes">Short Notes</option>
              <option value="Key Points">Key Points</option>
              <option value="Formula Sheet">Formula Sheet</option>
              <option value="Exam Summary">Exam Summary</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading || !grade || !subject || !chapter}>
            {loading ? 'Generating...' : <><Sparkles size={18} /> Generate Notes</>}
          </button>
        </form>

        {result && (
          <div className="card" style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{result.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={handleCopy} title="Copy Text">
                  {copied ? <Check size={18} color="green" /> : <Copy size={18} />}
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={handleDownloadPDF} title="Download PDF">
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            <div ref={contentRef} style={{ lineHeight: '1.8', padding: '1rem', backgroundColor: 'var(--bg-secondary)' }} className="generated-content">
              <ReactMarkdown>{result.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
