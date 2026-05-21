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
  Sparkles
} from 'lucide-react';

// Import Pages
import Home from './pages/Home';
import Chat from './pages/Chat';
import Notes from './pages/Notes';
import Revision from './pages/Revision';
import Timetable from './pages/Timetable';
import TestGenerator from './pages/TestGenerator';

function App() {
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
            Welcome back, Student 👋
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn" style={{ padding: '0.5rem' }}>
              <Bell size={20} />
            </button>
            <div className="avatar" style={{ width: '36px', height: '36px', cursor: 'pointer' }}>
              <User size={20} />
            </div>
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
