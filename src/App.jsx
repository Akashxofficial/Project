import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  MessageSquare,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  User,
  Sparkles,
  LogOut,
  Bookmark,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { loginWithGoogle, logout } from './lib/firebase';

import Home from './pages/Home';
import Chat from './pages/Chat';
import Notes from './pages/Notes';
import Revision from './pages/Revision';
import Timetable from './pages/Timetable';
import TestGenerator from './pages/TestGenerator';
import History from './pages/History';

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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';

  return (
    <div className="app-container">

      {/* ── Sidebar Overlay (mobile) ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">
            <Sparkles size={16} />
          </div>
          <span>TaniOS <span className="text-gradient">AI</span></span>
        </div>

        {/* Nav */}
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

        {/* User Profile at bottom */}
        {currentUser && (
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="profile" className="user-avatar" />
            ) : (
              <div className="avatar" style={{ width: '2rem', height: '2rem' }}>
                <User size={14} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.displayName || 'Student'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.email}
              </div>
            </div>
            <button className="icon-btn" onClick={logout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* ── Header ── */}
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
            {currentUser ? (
              <>
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="profile" className="user-avatar" />
                ) : (
                  <div className="avatar" style={{ width: '2rem', height: '2rem' }}>
                    <User size={14} />
                  </div>
                )}
              </>
            ) : (
              <button className="btn btn-primary" onClick={loginWithGoogle}>
                <User size={16} />
                Sign In with Google
              </button>
            )}
          </div>
        </header>

        {/* ── Page Routes ── */}
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
