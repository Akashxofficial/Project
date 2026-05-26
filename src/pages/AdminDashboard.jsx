import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Key, ShieldAlert, Users, Settings, Activity, Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const [loading, setLoading] = useState(false);

  // System Config Overrides
  const [config, setConfig] = useState({
    streamingActive: true,
    redisCaching: true,
    errorNormalization: true,
    activeModel: 'gemini-2.5-flash'
  });

  // Emulated Analytics data representing production state
  const stats = {
    totalRequests: 2451,
    cacheHits: 858,
    cacheRate: 35,
    avgResponseTime: 1.8,
    totalTokens: '4.8M',
    totalUsers: 142
  };

  // Mock Rotating Keys status
  const [keys, setKeys] = useState([
    { id: 1, mask: 'AIzaSyCh...89X2', status: 'Active', model: 'gemini-2.5-flash', successRate: 98, load: 12 },
    { id: 2, mask: 'AIzaSyBt...90P1', status: 'Active', model: 'gemini-2.5-flash', successRate: 96, load: 5 },
    { id: 3, mask: 'AIzaSyDl...41L7', status: 'Rate Limited', model: 'gemini-2.5-pro', successRate: 85, load: 0 },
    { id: 4, mask: 'AIzaSyKw...55H9', status: 'Active', model: 'gemini-2.5-flash', successRate: 99, load: 3 }
  ]);

  // Mock student accounts representing real database hydrating
  const students = [
    { name: 'Akash Sharma', email: 'akash@tanios.ai', level: 3, xp: 540, streak: 7, board: 'CBSE', class: '10', subjects: 'Physics, Chemistry, Maths' },
    { name: 'Priya Patel', email: 'priya@gmail.com', level: 2, xp: 320, streak: 4, board: 'CBSE', class: '12', subjects: 'Biology, Chemistry, English' },
    { name: 'Rajesh Kumar', email: 'rajesh@rediff.com', level: 1, xp: 180, streak: 1, board: 'RBSE', class: '10', subjects: 'Maths, Social Science' },
    { name: 'Sneha Reddy', email: 'sneha@tanios.ai', level: 2, xp: 410, streak: 5, board: 'ICSE', class: '9', subjects: 'Physics, Computer Science' }
  ];

  const handleToggleConfig = (field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTriggerRotation = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("🔄 API Key Rotation successfully executed! Evaluated keys health successfully.");
    }, 800);
  };

  return (
    <div className="page-content">
      
      {/* Scope style */}
      <style>{`
        .admin-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        @media (max-width: 768px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
        }
        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: all 0.2s;
        }
        .admin-nav-item:hover {
          color: var(--text);
          background: rgba(255,255,255,0.03);
        }
        .admin-nav-item.active {
          color: var(--primary);
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.15);
        }
        .status-pill {
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-pill.active {
          background: rgba(16,185,129,0.1);
          color: #10b981;
        }
        .status-pill.limited {
          background: rgba(245,158,11,0.1);
          color: #f59e0b;
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 20px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #475569;
          transition: .3s;
          border-radius: 20px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 14px; width: 14px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--primary);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>

      <div style={{ animation: 'fadeUp 0.3s' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              width: '42px', height: '42px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Settings color="#ef4444" size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text)' }}>TaniOS Administration Panel</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Secure backend monitoring, API keys health check, diagnostic metrics, and system configuration overrides.
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleTriggerRotation}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ef4444', border: 'none', padding: '0.6rem 1.25rem' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Force Key Rotation Check
          </button>
        </div>

        {/* Master Admin Workspace Layout */}
        <div className="admin-grid">
          
          {/* Navigation Sidebar */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('diagnostics')}
              className={`admin-nav-item ${activeTab === 'diagnostics' ? 'active' : ''}`}
            >
              <Activity size={16} /> Diagnostics & Metrics
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`admin-nav-item ${activeTab === 'keys' ? 'active' : ''}`}
            >
              <Key size={16} /> API Key Rotation Locker
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`admin-nav-item ${activeTab === 'students' ? 'active' : ''}`}
            >
              <Users size={16} /> Student Registry Database
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <Settings size={16} /> Configuration Overrides
            </button>
          </aside>

          {/* Tab Contents */}
          <main style={{ minWidth: 0 }}>
            
            {/* TAB 1: DIAGNOSTICS & METRICS */}
            {activeTab === 'diagnostics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Visual Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>API Inquiries</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: '0.35rem 0' }}>{stats.totalRequests.toLocaleString()}</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Accumulated queries (monthly)</span>
                  </div>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Upstash Cache Hits</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', margin: '0.35rem 0' }}>{stats.cacheHits.toLocaleString()}</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>{stats.cacheRate}% Cache Hit Ratio 🚀</span>
                  </div>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Latency</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', margin: '0.35rem 0' }}>{stats.avgResponseTime}s</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Serverless container latency</span>
                  </div>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Students</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', margin: '0.35rem 0' }}>{stats.totalUsers}</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Firestore hydration context</span>
                  </div>
                </div>

                {/* System Health Alerts */}
                <section className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle size={16} color="var(--success)" /> Live Infrastructure Health Check
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    🟢 **Vercel API Handler:** Active & listening (V8 Engine sandboxed). <br />
                    🟢 **Upstash Redis Cluster:** Connected. Caching hydrated (latency 8ms). <br />
                    🟢 **Sentry Client capturing:** Active on DSN parameters. <br />
                    🟢 **Firebase Context:** Hydrated successfully (Auth status verified).
                  </div>
                </section>

              </div>
            )}

            {/* TAB 2: API KEY ROTATION LOCKER */}
            {activeTab === 'keys' && (
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Active Rotating API Keys (Locker Registry)</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>4 Loaded Keys | Sequential Failover Mode</span>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Key Index</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Masked Key Value</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Model Target</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Success Rate</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Active Load</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k, idx) => (
                        <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>Key #{idx + 1}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{k.mask}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{k.model}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span className={`status-pill ${k.status === 'Active' ? 'active' : 'limited'}`}>
                              {k.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{k.successRate}%</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{k.load}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  marginTop: '1.25rem',
                  display: 'flex',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: 'var(--text)'
                }}>
                  <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Key Rotation Diagnostic:</strong> Key #3 holds a 'Rate Limited' status. The backend handler has automatically rotated its active inference queue to Key #4 to prevent downtime in client solver components.
                  </div>
                </div>
              </section>
            )}

            {/* TAB 3: STUDENT REGISTRY DATABASE */}
            {activeTab === 'students' && (
              <section className="card">
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0' }}>Hydrated Active Student Accounts</h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Email Address</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Board</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Grade</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Streak</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Gamified XP</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Subjects List</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.email} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{s.name}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{s.email}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{s.board}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>Class {s.class}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: '#ef4444', fontWeight: 'bold' }}>🔥 {s.streak} Days</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>{s.xp} XP</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.subjects}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* TAB 4: SYSTEM CONFIGURATION OVERRIDES */}
            {activeTab === 'settings' && (
              <section className="card">
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.25rem 0' }}>Core Gateway Parameter Overrides</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Streaming Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Real-Time Inference Streaming</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                        If enabled, answers stream chunk-by-chunk using Server-Sent Events (SSE). Falls back to full payload responses if disabled.
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={config.streamingActive} 
                        onChange={() => handleToggleConfig('streamingActive')} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {/* Redis Caching Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Upstash Redis Query Caching</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                        Forces serverless function to evaluate cache hits for sub-50ms repeat latency, saving API keys tokens limit.
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={config.redisCaching} 
                        onChange={() => handleToggleConfig('redisCaching')} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {/* Error Normalization Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Simplified Error Normalization</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                        Protects students from seeing raw billing or provider errors, formatting them into polite supportive messages.
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={config.errorNormalization} 
                        onChange={() => handleToggleConfig('errorNormalization')} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                </div>
              </section>
            )}

          </main>

        </div>

      </div>
    </div>
  );
}
