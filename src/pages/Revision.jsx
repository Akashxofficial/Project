import React, { useState } from 'react';
import { BookOpen, Zap, Target } from 'lucide-react';
import { generateAIContent, generateRevisionPrompt } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import { saveDocument } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function Revision() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Form states
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [time, setTime] = useState('10');

  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setStatusMsg('thinking');
    
    const prompt = generateRevisionPrompt(subject, chapter, time);
    const onStatus = (msg) => setStatusMsg(msg || '');
    const response = await generateAIContent(prompt, onStatus);

    if (response.error || !response.text) {
      setError(response.message || '⚠️ Something went wrong. Please try again.');
      setLoading(false);
      setStatusMsg('');
      return;
    }

    const docTitle = `${time}-Minute Recap: ${chapter}`;
    setResult({ title: docTitle, content: response.text });
    
    if (currentUser) {
      await saveDocument(currentUser.uid || currentUser.email, 'revision', docTitle, response.text);
    }
    
    setLoading(false);
    setStatusMsg('');
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: '#10b98120' }}>
          <BookOpen size={24} color="#10b981" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Smart Revision</h1>
          <p style={{ color: 'var(--text-secondary)' }}>One-shot summaries and last-minute exam prep.</p>
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
            <input type="text" className="input-field" placeholder="e.g. History" required value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Chapter(s)</label>
            <input type="text" className="input-field" placeholder="e.g. Nationalism in India" required value={chapter} onChange={e => setChapter(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Time Available</label>
            <select className="input-field" value={time} onChange={e => setTime(e.target.value)}>
              <option value="10">10 Minutes (Quick Recap)</option>
              <option value="30">30 Minutes (Standard Revision)</option>
              <option value="60">1 Hour (Deep Dive)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#10b981' }} disabled={loading || !subject || !chapter}>
            {loading ? (statusMsg && statusMsg !== 'thinking' ? statusMsg : 'Analyzing...') : <><Zap size={18} /> Start Revision</>}
          </button>
        </form>

        {result && (
          <div className="card" style={{ flex: 1, overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} /> {result.title}
            </h2>
            
            <div className="generated-content" style={{ marginTop: '1rem', backgroundColor: 'var(--bg)' }}>
              <ReactMarkdown>{result.content}</ReactMarkdown>
            </div>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }} onClick={() => setResult(null)}>Done Revising</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
