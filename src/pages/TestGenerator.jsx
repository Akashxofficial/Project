import React, { useState } from 'react';
import { GraduationCap, Sparkles, HelpCircle, FileCheck } from 'lucide-react';

export default function TestGenerator() {
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState(null);

  const handleGenerate = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setTest({
        title: "Biology - Cells: The Unit of Life (Mock Test)",
        questions: [
          { q: "Which organelle is known as the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"] },
          { q: "Who discovered the cell?", options: ["Robert Hooke", "Antonie van Leeuwenhoek", "Matthias Schleiden", "Theodor Schwann"] },
          { q: "Which of the following is not found in an animal cell?", options: ["Cell membrane", "Cytoplasm", "Cell wall", "Mitochondria"] }
        ]
      });
      setLoading(false);
    }, 2000);
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

      <div className="grid-cards" style={{ gridTemplateColumns: test ? '1fr 2fr' : '1fr', gap: '2rem' }}>
        <form onSubmit={handleGenerate} className="card">
          <div className="input-group">
            <label className="input-label">Subject</label>
            <input type="text" className="input-field" placeholder="e.g. Biology" required />
          </div>
          <div className="input-group">
            <label className="input-label">Topic / Chapter</label>
            <input type="text" className="input-field" placeholder="e.g. Cell Structure" required />
          </div>
          <div className="input-group">
            <label className="input-label">Question Type</label>
            <select className="input-field">
              <option value="mcq">Multiple Choice Questions (MCQ)</option>
              <option value="short">Short Answer Type</option>
              <option value="long">Long Answer / Essay Type</option>
              <option value="mixed">Mixed Format (Board Style)</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Number of Questions</label>
            <input type="number" className="input-field" defaultValue="10" min="5" max="50" required />
          </div>
          <div className="input-group">
            <label className="input-label">Difficulty</label>
            <select className="input-field">
              <option value="easy">Easy (Direct)</option>
              <option value="medium">Medium (Analytical)</option>
              <option value="hard">Hard (Application based)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#f43f5e' }} disabled={loading}>
            {loading ? 'Creating Test...' : <><Sparkles size={18} /> Generate Test</>}
          </button>
        </form>

        {test && (
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#f43f5e' }}>{test.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span>Max Marks: 15</span> | <span>Time: 20 mins</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {test.questions.map((item, idx) => (
                <div key={idx}>
                  <div style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#f43f5e' }}>Q{idx + 1}.</span> {item.q}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '2rem' }}>
                    {item.options.map((opt, oIdx) => (
                      <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <input type="radio" name={`q${idx}`} style={{ accentColor: '#f43f5e' }} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              
              <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" style={{ backgroundColor: '#f43f5e' }}>
                  <FileCheck size={18} /> Submit Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
