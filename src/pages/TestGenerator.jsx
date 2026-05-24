import React, { useState, useRef } from 'react';
import { GraduationCap, Sparkles, FileCheck, Download } from 'lucide-react';
import { generateAIContent, generateTestPrompt } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveDocument } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function TestGenerator() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('Multiple Choice Questions (MCQ)');
  const [count, setCount] = useState('10');
  const [difficulty, setDifficulty] = useState('Medium (Analytical)');

  const contentRef = useRef(null);

  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    const prompt = generateTestPrompt(subject, topic, type, count, difficulty);
    const response = await generateAIContent(prompt);

    if (response.error || !response.text) {
      setError(response.message || '⚠️ Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    const docTitle = `${subject} - ${topic} (Mock Test)`;
    setResult({ title: docTitle, content: response.text });
    
    if (currentUser) {
      await saveDocument(currentUser.uid || currentUser.email, 'test', docTitle, response.text);
    }
    
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    const canvas = await html2canvas(contentRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Mock_Test_${topic.replace(/\\s+/g, '_')}.pdf`);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: '#f43f5e20' }}>
          <GraduationCap size={24} color="#f43f5e" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI Test Generator</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create MCQs, short questions, and board-style tests instantly.</p>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem', fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <div className={`generator-layout ${result ? 'has-result' : ''}`}>
        <form onSubmit={handleGenerate} className="card">
          <div className="input-group">
            <label className="input-label">Subject</label>
            <input type="text" className="input-field" placeholder="e.g. Biology" required value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Topic / Chapter</label>
            <input type="text" className="input-field" placeholder="e.g. Cell Structure" required value={topic} onChange={e => setTopic(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Question Type</label>
            <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
              <option value="Multiple Choice Questions (MCQ)">Multiple Choice Questions (MCQ)</option>
              <option value="Short Answer Type">Short Answer Type</option>
              <option value="Long Answer / Essay Type">Long Answer / Essay Type</option>
              <option value="Mixed Format (Board Style)">Mixed Format (Board Style)</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Number of Questions</label>
            <input type="number" className="input-field" min="5" max="50" required value={count} onChange={e => setCount(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Difficulty</label>
            <select className="input-field" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="Easy (Direct)">Easy (Direct)</option>
              <option value="Medium (Analytical)">Medium (Analytical)</option>
              <option value="Hard (Application based)">Hard (Application based)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#f43f5e' }} disabled={loading || !subject || !topic}>
            {loading ? 'Creating Test...' : <><Sparkles size={18} /> Generate Test</>}
          </button>
        </form>

        {result && (
          <div className="card" style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#f43f5e' }}>{result.title}</h2>
              <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={handleDownloadPDF} title="Download PDF">
                <Download size={18} />
              </button>
            </div>
            
            <div ref={contentRef} className="generated-content" style={{ marginTop: 0, backgroundColor: 'var(--bg-secondary)' }}>
              <ReactMarkdown>{result.content}</ReactMarkdown>
            </div>
            
            <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" style={{ backgroundColor: '#f43f5e' }}>
                <FileCheck size={18} /> Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
