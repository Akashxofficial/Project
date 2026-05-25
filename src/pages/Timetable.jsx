import React, { useState } from 'react';
import { Clock, Calendar, CalendarPlus, Loader2 } from 'lucide-react';
import { generateAIContent, generateTimetablePrompt } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { saveDocument } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function Timetable() {
  const { currentUser, incrementGuestUsage } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const [date, setDate] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hours, setHours] = useState('');
  const [preference, setPreference] = useState('morning');

  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!incrementGuestUsage()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStatusMsg('thinking');
    
    const prompt = generateTimetablePrompt(date, subjects, hours, preference);
    const onStatus = (msg) => setStatusMsg(msg || '');
    const response = await generateAIContent(prompt, onStatus);

    if (response.error || !response.text) {
      setError(response.message || '⚠️ Something went wrong. Please try again.');
      setLoading(false);
      setStatusMsg('');
      return;
    }

    setResult(response.text);
    setLoading(false);
    setStatusMsg('');
    
    if (currentUser) {
      saveDocument(currentUser.uid || currentUser.email, 'timetable', `Study Plan for ${date}`, response.text)
        .catch(err => console.warn('Save failed (non-blocking):', err));
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: '#8b5cf620' }}>
          <Clock size={24} color="#8b5cf6" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Study Planner & Timetable</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Generate a smart study plan based on your exams and daily routine.</p>
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
            <label className="input-label">Upcoming Exam Date</label>
            <input type="date" className="input-field" required value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Subjects to Cover (comma separated)</label>
            <input type="text" className="input-field" placeholder="Math, Physics, Chemistry" required value={subjects} onChange={e => setSubjects(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Daily Study Hours</label>
            <input type="number" className="input-field" placeholder="e.g. 4" min="1" max="16" required value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Preferred Study Time</label>
            <select className="input-field" value={preference} onChange={e => setPreference(e.target.value)}>
              <option value="morning">Morning Person</option>
              <option value="evening">Night Owl</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading || !date || !subjects || !hours}>
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {statusMsg && statusMsg !== 'thinking' ? statusMsg : 'Planning...'}
              </>
            ) : (
              <><CalendarPlus size={18} /> Generate Plan</>
            )}
          </button>
        </form>

        {result && (
          <div className="card" style={{ flex: 1, overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} /> Your Custom Study Plan
            </h2>
            
            <div className="generated-content" style={{ marginTop: 0, backgroundColor: 'var(--bg)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
