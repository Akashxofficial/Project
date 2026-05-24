import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen, MessageSquare, Clock, FileText,
  GraduationCap, LayoutDashboard, User, Sparkles,
  LogOut, Bookmark, Menu, X
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { logout } from './lib/firebase';

import Home from './pages/Home';
import Chat from './pages/Chat';
import Notes from './pages/Notes';
import Revision from './pages/Revision';
import Timetable from './pages/Timetable';
import TestGenerator from './pages/TestGenerator';
import History from './pages/History';
import LoginPage from './pages/LoginPage';

const navItems = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/chat', icon: <MessageSquare size={18} />, label: 'AI Doubt Solver' },
  { to: '/notes', icon: <FileText size={18} />, label: 'AI Notes' },
  { to: '/revision', icon: <BookOpen size={18} />, label: 'Smart Revision' },
  { to: '/timetable', icon: <Clock size={18} />, label: 'Study Planner' },
  { to: '/test', icon: <GraduationCap size={18} />, label: 'Test Generator' },
  { to: '/history', icon: <Bookmark size={18} />, label: 'Saved Materials' },
];

function App() {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // ── If not logged in, show the login page ──────────────────────────────────
  if (!currentUser) {
    return <LoginPage />;
  }

  // ── Close sidebar on route change (mobile) ──────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ── Prevent body scroll when sidebar is open ────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const firstName = currentUser.displayName?.split(' ')[0] || 'Student';

  return (
    <div className="app-container">

      {/* ── Mobile Sidebar Overlay ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
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
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── User profile at bottom ── */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem', marginTop: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} alt="profile" className="user-avatar" />
          ) : (
            <div className="avatar" style={{ width: '2rem', height: '2rem', flexShrink: 0 }}>
              <User size={14} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.displayName || 'Student'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.email}
            </div>
          </div>
          <button className="icon-btn" onClick={logout} title="Logout" style={{ flexShrink: 0 }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="welcome-text">
              Welcome back, <strong>{firstName}</strong> 👋
            </div>
          </div>

          <div className="header-right">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="profile" className="user-avatar" title={currentUser.displayName} />
            ) : (
              <div className="avatar" style={{ width: '2rem', height: '2rem' }}>
                <User size={14} />
              </div>
            )}
            <button className="icon-btn" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/test" element={<TestGenerator />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
