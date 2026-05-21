import React, { useState } from 'react';
import { FileText, Sparkles, Download, Copy, Check } from 'lucide-react';

export default function Notes() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock API call
    setTimeout(() => {
      setResult({
        title: "Structure of Atom - Key Points",
        content: `
### 1. Discovery of Subatomic Particles
* **Electron**: Discovered by J.J. Thomson (Cathode Ray Experiment).
* **Proton**: Discovered by E. Goldstein (Canal Rays).
* **Neutron**: Discovered by James Chadwick.

### 2. Thomson's Model of an Atom
* Proposed that an atom is a positively charged sphere with electrons embedded in it (Plum Pudding Model).
* It explains the electrical neutrality of the atom.

### 3. Rutherford's Model
* Based on Alpha particle scattering experiment.
* **Conclusion**: Most of the space in the atom is empty. The entire mass is concentrated in the center (Nucleus).

### 4. Bohr's Model
* Electrons revolve in discrete orbits.
* While revolving in these orbits, they do not radiate energy.
        `
      });
      setLoading(false);
    }, 1500);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <select className="input-field" required>
              <option value="">Select...</option>
              <option value="8">Class 8th</option>
              <option value="9">Class 9th</option>
              <option value="10">Class 10th</option>
              <option value="11">Class 11th</option>
              <option value="12">Class 12th</option>
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Subject</label>
            <select className="input-field" required>
              <option value="">Select...</option>
              <option value="science">Science / Physics / Chemistry</option>
              <option value="math">Mathematics</option>
              <option value="sst">Social Science</option>
              <option value="english">English</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Chapter Name or Topic</label>
            <input type="text" className="input-field" placeholder="e.g. Structure of Atom" required />
          </div>

          <div className="input-group">
            <label className="input-label">Note Type</label>
            <select className="input-field">
              <option value="short">Short Notes</option>
              <option value="keypoints">Key Points</option>
              <option value="formula">Formula Sheet</option>
              <option value="summary">Exam Summary</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Generating...' : <><Sparkles size={18} /> Generate Notes</>}
          </button>
        </form>

        {result && (
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{result.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={handleCopy} title="Copy">
                  {copied ? <Check size={18} color="green" /> : <Copy size={18} />}
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Download PDF">
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            <div style={{ lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: result.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
          </div>
        )}
      </div>
    </div>
  );
}
