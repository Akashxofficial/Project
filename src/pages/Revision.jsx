import React, { useState } from 'react';
import { BookOpen, Sparkles, Zap, Target } from 'lucide-react';

export default function Revision() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setGenerated(true);
      setLoading(false);
    }, 1500);
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

      <div className="grid-cards" style={{ gridTemplateColumns: generated ? '1fr 2fr' : '1fr', gap: '2rem' }}>
        <form onSubmit={handleGenerate} className="card">
          <div className="input-group">
            <label className="input-label">Subject</label>
            <input type="text" className="input-field" placeholder="e.g. History" required />
          </div>
          <div className="input-group">
            <label className="input-label">Chapter(s)</label>
            <input type="text" className="input-field" placeholder="e.g. Nationalism in India" required />
          </div>
          <div className="input-group">
            <label className="input-label">Time Available</label>
            <select className="input-field">
              <option value="10">10 Minutes (Quick Recap)</option>
              <option value="30">30 Minutes (Standard Revision)</option>
              <option value="60">1 Hour (Deep Dive)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#10b981' }} disabled={loading}>
            {loading ? 'Analyzing...' : <><Zap size={18} /> Start Revision</>}
          </button>
        </form>

        {generated && (
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} /> 10-Minute Recap: Nationalism in India
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)', borderLeft: '4px solid #10b981' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>1. First World War, Khilafat and Non-Cooperation</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>The war created a new economic and political situation. Gandhiji returned in 1915 and organized Satyagraha.</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)', borderLeft: '4px solid #10b981' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>2. Jallianwala Bagh Massacre (1919)</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>General Dyer fired upon a peaceful crowd in Amritsar, causing nationwide anger.</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)', borderLeft: '4px solid #10b981' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>3. Salt March and Civil Disobedience</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Gandhiji marched to Dandi (1930) to break the salt law, launching a mass movement against British laws.</p>
              </div>
              
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>Mark as Completed</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
