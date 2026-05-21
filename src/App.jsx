import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  BookOpen, 
  MessageSquare, 
  Clock, 
  FileText, 
  GraduationCap, 
  LayoutDashboard,
  Bell,
  User,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { loginWithGoogle, logout } from './lib/firebase';

// Import Pages
import Home from './pages/Home';
import Chat from './pages/Chat';
import Notes from './pages/Notes';
import Revision from './pages/Revision';
import Timetable from './pages/Timetable';
import TestGenerator from './pages/TestGenerator';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo">
          <Sparkles className="text-gradient" size={28} />
          <span>TaniOS <span className="text-gradient">AI</span></span>
        </div>
        
        <nav className="nav-menu">
          <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/chat" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <MessageSquare size={20} />
            <span>AI Doubt Solver</span>
          </NavLink>
          <NavLink to="/notes" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={20} />
            <span>AI Notes</span>
          </NavLink>
          <NavLink to="/revision" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <BookOpen size={20} />
            <span>Smart Revision</span>
          </NavLink>
          <NavLink to="/timetable" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Clock size={20} />
            <span>Study Planner</span>
          </NavLink>
          <NavLink to="/test" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <GraduationCap size={20} />
            <span>Test Generator</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            Welcome back, {currentUser ? currentUser.displayName.split(' ')[0] : 'Student'} 👋
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {currentUser ? (
              <>
                <button className="btn" style={{ padding: '0.5rem' }} title="Notifications">
                  <Bell size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="profile" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                  ) : (
                    <div className="avatar" style={{ width: '36px', height: '36px', cursor: 'pointer' }}>
                      <User size={20} />
                    </div>
                  )}
                  <button className="btn" style={{ padding: '0.5rem', color: 'var(--text-secondary)' }} onClick={logout} title="Logout">
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <button className="btn btn-primary" onClick={loginWithGoogle}>
                Sign In
              </button>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/test" element={<TestGenerator />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
