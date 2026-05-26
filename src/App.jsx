import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen, MessageSquare, Clock, FileText,
  GraduationCap, LayoutDashboard, User, Sparkles,
  LogOut, Bookmark, Menu, X
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Chat from './pages/Chat';
import Notes from './pages/Notes';
import Revision from './pages/Revision';
import Timetable from './pages/Timetable';
import TestGenerator from './pages/TestGenerator';
import History from './pages/History';
import LoginPage from './pages/LoginPage';
import RAGUpload from './pages/RAGUpload';
import AdminDashboard from './pages/AdminDashboard';

const navItems = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/chat', icon: <MessageSquare size={18} />, label: 'AI Doubt Solver' },
  { to: '/notes', icon: <FileText size={18} />, label: 'AI Notes' },
  { to: '/revision', icon: <BookOpen size={18} />, label: 'Smart Revision' },
  { to: '/timetable', icon: <Clock size={18} />, label: 'Study Planner' },
  { to: '/test', icon: <GraduationCap size={18} />, label: 'Test Generator' },
  { to: '/notes/rag', icon: <BookOpen size={18} />, label: 'Textbook RAG 📚' },
  { to: '/history', icon: <Bookmark size={18} />, label: 'Saved Materials' },
];

// Secure Role-Based Private Route Guard Component
const AdminRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  // Real-world role security checks
  const isAdmin = currentUser && (
    currentUser.email === 'admin@tanios.ai' || 
    localStorage.getItem('tanios_user_role') === 'admin'
  );
  
  if (!isAdmin) {
    console.warn(`[UNAUTHORIZED] Access denied to admin routes for user: ${currentUser?.email || 'guest'}`);
    return (
      <div className="page-content" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', animation: 'fadeUp 0.3s' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛔</div>
        <h2 style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.75rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          You do not have administrative privileges to access this secure zone. Please log in with an authorized account or return to the dashboard.
        </p>
        <button onClick={() => window.location.href = '/'} className="btn btn-primary" style={{ margin: '0 auto' }}>
          Return to Dashboard
        </button>
      </div>
    );
  }
  return children;
};

// ── Inner app — handles primary navigation & layouts ──────────────────────────
function MainApp() {
  const { currentUser, setShowLoginModal, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';

  return (
    <div className="app-container">

      {/* Mobile Overlay — always in DOM, pointer-events controls interaction */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo">
          <div className="logo-icon"><Sparkles size={16} /></div>
          <span>TaniOS <span className="text-gradient">AI</span></span>
        </div>

        <nav className="nav-menu">
          <span className="nav-section-label">Study Tools</span>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          {currentUser && (currentUser.email === 'admin@tanios.ai' || localStorage.getItem('tanios_user_role') === 'admin') && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={{ borderLeft: '3px solid #ef4444', background: 'rgba(239, 68, 68, 0.03)', marginTop: '0.5rem' }}
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutDashboard size={18} color="#ef4444" />
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Admin Control ⚙️</span>
            </NavLink>
          )}
        </nav>

        {/* User Profile / Guest Sign In */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem', marginTop: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="profile" className="user-avatar" />
          ) : (
            <div className="avatar" style={{ width: '2rem', height: '2rem', flexShrink: 0 }}>
              <User size={14} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.displayName || 'Guest Student'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.email || (currentUser?.isGuest ? 'guest@tanios.ai' : 'student@tanios.ai')}
            </div>
          </div>
          {currentUser?.isGuest ? (
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(108, 99, 255, 0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              Sign In
            </button>
          ) : (
            <button className="icon-btn" onClick={logout} title="Logout" style={{ flexShrink: 0 }}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="welcome-text">
              {currentUser?.isGuest ? 'Welcome Guest' : `Welcome back, ${firstName}`} 👋
            </div>
          </div>

          {/* ── Mobile Logo (center) — hidden on desktop ── */}
          <div className="mobile-logo">
            <div className="mobile-logo-icon">
              <Sparkles size={12} color="white" />
            </div>
            <span className="mobile-logo-text">
              TaniOS <span className="text-gradient">AI</span>
            </span>
          </div>

          <div className="header-right">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="profile" className="user-avatar" title={currentUser.displayName} />
            ) : (
              <div className="avatar" style={{ width: '2rem', height: '2rem' }}>
                <User size={14} />
              </div>
            )}
            {currentUser?.isGuest ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowLoginModal(true)}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
              >
                Sign In
              </button>
            ) : (
              <button className="icon-btn" onClick={logout} title="Logout">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/rag" element={<RAGUpload />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/test" element={<TestGenerator />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
}

// ── Root app — includes dynamic login modal wrapper ──────────────────────────
function App() {
  const { showLoginModal, setShowLoginModal, showQuotaModal, setShowQuotaModal, login, loading, QUOTA } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading TaniOS AI...</div>
      </div>
    );
  }

  const modalBackdrop = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '1.5rem',
  };

  const modalCard = {
    maxWidth: '400px', width: '100%',
    background: 'rgba(22, 22, 26, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    padding: '2.5rem 2rem', borderRadius: '16px', textAlign: 'center',
  };

  const iconBox = {
    width: '4rem', height: '4rem',
    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(0, 242, 254, 0.15))',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1.5rem'
  };

  const primaryBtn = {
    width: '100%', padding: '0.875rem',
    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(108, 99, 255, 0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    marginBottom: '1.25rem', transition: 'all 0.2s'
  };

  const ghostBtn = {
    background: 'none', border: 'none', color: 'var(--text-secondary)',
    fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline'
  };

  return (
    <>
      <MainApp />

      {/* ── Guest upgrade modal ── */}
      {showLoginModal && (
        <div style={modalBackdrop}>
          <div className="card" style={modalCard}>
            <div style={iconBox}><Sparkles size={32} color="var(--primary)" /></div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Unlock Premium AI Features! 🚀
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.25rem' }}>
              Sign in with Google to get <strong style={{ color: '#fff' }}>{QUOTA.loggedIn} free AI requests/day</strong> — unlimited study plans, mock tests, notes, and your chat history saved forever!
            </p>
            <button onClick={login} style={primaryBtn}><Sparkles size={16} /> Continue with Google</button>
            <button onClick={() => setShowLoginModal(false)} style={ghostBtn}>Keep Browsing as Guest</button>
          </div>
        </div>
      )}

      {/* ── Daily quota exhausted modal (for logged-in users) ── */}
      {showQuotaModal && (
        <div style={modalBackdrop}>
          <div className="card" style={modalCard}>
            <div style={{ ...iconBox, background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(239,68,68,0.15))' }}>
              <span style={{ fontSize: '2rem' }}>⏰</span>
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Daily Limit Reached
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              You've used your <strong style={{ color: '#fff' }}>{QUOTA.loggedIn} free AI requests</strong> for today.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Your quota resets at <strong style={{ color: '#a78bfa' }}>midnight 🌙</strong> — come back tomorrow!
            </p>
            <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '0.875rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              💡 <strong style={{ color: '#fff' }}>Pro tip:</strong> Common questions are cached — asking the same topic won't use your quota!
            </div>
            <button onClick={() => setShowQuotaModal(false)} style={primaryBtn}>Got it, I'll come back tomorrow!</button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
