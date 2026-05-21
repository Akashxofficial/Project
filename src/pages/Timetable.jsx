import React, { useState } from 'react';
import { Clock, Calendar, CalendarPlus, Sparkles } from 'lucide-react';

export default function Timetable() {
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
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: '#8b5cf620' }}>
          <Clock size={24} color="#8b5cf6" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Study Planner & Timetable</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Generate a smart study plan based on your exams and daily routine.</p>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: generated ? '1fr 2fr' : '1fr', gap: '2rem' }}>
        <form onSubmit={handleGenerate} className="card">
          <div className="input-group">
            <label className="input-label">Upcoming Exam Date</label>
            <input type="date" className="input-field" required />
          </div>
          <div className="input-group">
            <label className="input-label">Subjects to Cover (comma separated)</label>
            <input type="text" className="input-field" placeholder="Math, Physics, Chemistry" required />
          </div>
          <div className="input-group">
            <label className="input-label">Daily Study Hours</label>
            <input type="number" className="input-field" placeholder="e.g. 4" min="1" max="16" required />
          </div>
          <div className="input-group">
            <label className="input-label">Preferred Study Time</label>
            <select className="input-field">
              <option value="morning">Morning Person</option>
              <option value="evening">Night Owl</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#8b5cf6' }} disabled={loading}>
            {loading ? 'Planning...' : <><CalendarPlus size={18} /> Generate Plan</>}
          </button>
        </form>

        {generated && (
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} /> Your 14-Day Study Plan
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Day 1 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '60px', fontWeight: 'bold', color: '#8b5cf6' }}>Day 1</div>
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Math: Algebra (2 Hours)</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Focus on linear equations and matrices. Do 20 practice questions.</div>
                  <div style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Physics: Mechanics (2 Hours)</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Review Newton's laws. Solve previous year questions.</div>
                </div>
              </div>
              
              {/* Day 2 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '60px', fontWeight: 'bold', color: '#8b5cf6' }}>Day 2</div>
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Chemistry: Organic (2 Hours)</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Memorize reaction mechanisms.</div>
                  <div style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Math: Calculus (2 Hours)</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Limits and derivatives practice.</div>
                </div>
              </div>

              {/* Day 3 */}
              <div style={{ display: 'flex', gap: '1rem', opacity: 0.7 }}>
                <div style={{ width: '60px', fontWeight: 'bold', color: '#8b5cf6' }}>Day 3</div>
                <div style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Remaining days unlocked in full version...</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
