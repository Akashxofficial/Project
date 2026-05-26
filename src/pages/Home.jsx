import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, MessageSquare, Clock, FileText, GraduationCap, ArrowRight,
  Flame, Star, Trophy, Award, Target, CheckCircle2, ChevronRight, 
  AlertCircle, RefreshCw, Plus, Trash2, Sparkles, Zap, Play, Copy, Check, Calendar,
  Loader2
} from 'lucide-react';
import { generateAIContent, generateExamRoadmapPrompt, generateOneClickPrompt, fixMathFormatting } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext';

// Custom renderers for beautiful markdown tables
const markdownComponents = {
  table: ({ children }) => (
    <div className="md-table-wrapper">
      <table className="md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="md-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="md-tr">{children}</tr>,
  th: ({ children }) => <th className="md-th">{children}</th>,
  td: ({ children }) => <td className="md-td">{children}</td>,
  code: ({ inline, className, children }) => {
    if (inline) {
      return <code className="md-inline-code">{children}</code>;
    }
    return (
      <div className="md-code-block">
        <code>{children}</code>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="md-blockquote">{children}</blockquote>
  ),
};

const standardSubjects = [
  { name: 'Physics', icon: '⚛️', color: '#6366f1' },
  { name: 'Chemistry', icon: '🧪', color: '#10b981' },
  { name: 'Mathematics', icon: '📐', color: '#3b82f6' },
  { name: 'Biology', icon: '🧬', color: '#ec4899' },
  { name: 'Social Science', icon: '🌍', color: '#f59e0b' },
  { name: 'English', icon: '📝', color: '#a855f7' },
  { name: 'Hindi', icon: '✍️', color: '#ef4444' },
  { name: 'Computer Science', icon: '💻', color: '#06b6d4' }
];



export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';
  const isGuest = currentUser?.isGuest;

  // ── 1. DOPAMINE GAMIFICATION STATE (Persisted in localStorage) ──
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(3);
  const [level, setLevel] = useState(1);
  const [consistency, setConsistency] = useState(85);
  const [badges, setBadges] = useState(['doubt_destroyer']);
  const [xpAwardedMsg, setXpAwardedMsg] = useState('');

  // ── 1.5. STUDENT PROFILE STATE ──
  const [profileBoard, setProfileBoard] = useState('');
  const [profileClass, setProfileClass] = useState('');
  const [profileSubjects, setProfileSubjects] = useState([]);
  const [profileSetupDone, setProfileSetupDone] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Temp state for profile setup form
  const [setupBoard, setSetupBoard] = useState('CBSE');
  const [setupClass, setSetupClass] = useState('10');
  const [setupSubjects, setSetupSubjects] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // ── 2. STUDY MISSIONS STATE (starts EMPTY — generated from profile) ──
  const [missions, setMissions] = useState([]);

  // ── 3. WEAKNESSES STATE (starts EMPTY — student adds their own) ──
  const [weaknesses, setWeaknesses] = useState([]);
  const [newWeakSubject, setNewWeakSubject] = useState('');
  const [newWeakChapter, setNewWeakChapter] = useState('');
  const [showAddWeakness, setShowAddWeakness] = useState(false);

  // ── 4. ONE-CLICK OUTPUT PANEL STATE ──
  const [activeOneClickTool, setActiveOneClickTool] = useState(null);
  const [oneClickTopic, setOneClickTopic] = useState('');
  const [oneClickGrade, setOneClickGrade] = useState('10');
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [oneClickStatus, setOneClickStatus] = useState('');
  const [oneClickResult, setOneClickResult] = useState('');
  const [oneClickCopied, setOneClickCopied] = useState(false);

  // ── 5. EXAM MODE ROADMAP STATE ──
  const [examBoard, setExamBoard] = useState('CBSE (Central Board)');
  const [examGrade, setExamGrade] = useState('Class 10');
  const [examSubject, setExamSubject] = useState('Science');
  const [examDays, setExamDays] = useState('15');
  const [examLoading, setExamLoading] = useState(false);
  const [examStatus, setExamStatus] = useState('');
  const [examResult, setExamResult] = useState('');
  const [roadmapCopied, setRoadmapCopied] = useState(false);

  // ── MISSION GENERATOR (generates from student's actual subjects) ──
  const generateMissionsFromProfile = (board, grade, subjects) => {
    if (!subjects || subjects.length === 0) return [];

    const missionTemplates = [
      { type: 'concept', labelFn: (s) => `Doubt Practice: Solve a ${s} concept`, xp: 20, promptFn: (s, g) => `Explain a key concept from ${s} simply for ${board} Class ${g} board exam context` },
      { type: 'revision', labelFn: (s) => `15-Min Revision: ${s} quick recap`, xp: 25, topicFn: (s) => s },
      { type: 'quiz', labelFn: (s) => `Quick Quiz: ${s} MCQ Test (5 Qs)`, xp: 30, linkFn: (s) => `/test?subject=${encodeURIComponent(s)}&topic=${encodeURIComponent(s)}&count=5` },
    ];

    const generated = [];
    // Pick up to 3 subjects for missions (rotate daily by date)
    const today = new Date().getDate();
    const shuffled = [...subjects].sort((a, b) => ((a.charCodeAt(0) + today) % 7) - ((b.charCodeAt(0) + today) % 7));
    const picked = shuffled.slice(0, 3);

    picked.forEach((subj, idx) => {
      const tmpl = missionTemplates[idx % missionTemplates.length];
      const mission = {
        id: `m_${idx + 1}`,
        type: tmpl.type,
        label: tmpl.labelFn(subj),
        xp: tmpl.xp,
        done: false,
      };
      if (tmpl.promptFn) mission.prompt = tmpl.promptFn(subj, grade);
      if (tmpl.topicFn) mission.topic = tmpl.topicFn(subj);
      if (tmpl.linkFn) mission.link = tmpl.linkFn(subj);
      generated.push(mission);
    });

    // Always add daily check-in
    generated.push({ id: 'm_checkin', type: 'login', label: 'Daily consistency check-in', xp: 15, done: true });

    return generated;
  };

  // ── SAVE PROFILE ──
  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    // Combine clicked quick subjects and custom entered subjects
    const quickSubjectsList = [...selectedSubjects];
    const customList = setupSubjects.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !quickSubjectsList.some(q => q.toLowerCase() === s.toLowerCase()));
    
    const subjectsArray = [...quickSubjectsList, ...customList];
    
    if (subjectsArray.length === 0) {
      alert("Please select or enter at least one subject to customize your missions.");
      return;
    }

    setProfileBoard(setupBoard);
    setProfileClass(setupClass);
    setProfileSubjects(subjectsArray);
    setProfileSetupDone(true);
    setShowProfileSetup(false);

    // Persist profile
    const profile = { board: setupBoard, grade: setupClass, subjects: subjectsArray };
    localStorage.setItem('tanios_profile', JSON.stringify(profile));

    // Generate missions
    const newMissions = generateMissionsFromProfile(setupBoard, setupClass, subjectsArray);
    setMissions(newMissions);
    saveState('tanios_missions', newMissions);

    // Also update exam mode defaults
    setExamBoard(setupBoard === 'CBSE' ? 'CBSE (Central Board)' : setupBoard === 'RBSE' ? 'RBSE (Rajasthan Board)' : setupBoard);
    setExamGrade(`Class ${setupClass}`);
    setOneClickGrade(setupClass);

    awardXp(10, 'Profile Setup Complete');
  };

  // Sync to local storage
  const saveState = (key, value) => {
    try {
      localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
    } catch (e) {
      console.warn(e);
    }
  };

  // ── LOAD STATE ON MOUNT ──
  useEffect(() => {
    try {
      const storedXp = localStorage.getItem('tanios_xp');
      const storedStreak = localStorage.getItem('tanios_streak');
      const storedConsistency = localStorage.getItem('tanios_consistency');
      const storedBadges = localStorage.getItem('tanios_badges');
      const storedWeaknesses = localStorage.getItem('tanios_weaknesses');
      const storedMissions = localStorage.getItem('tanios_missions');
      const storedProfile = localStorage.getItem('tanios_profile');

      if (storedXp) setXp(parseInt(storedXp, 10));
      else localStorage.setItem('tanios_xp', '120');

      if (storedStreak) setStreak(parseInt(storedStreak, 10));
      else localStorage.setItem('tanios_streak', '3');

      if (storedConsistency) setConsistency(parseInt(storedConsistency, 10));
      else localStorage.setItem('tanios_consistency', '85');

      if (storedBadges) setBadges(JSON.parse(storedBadges));
      else localStorage.setItem('tanios_badges', JSON.stringify(['doubt_destroyer']));

      if (storedWeaknesses) setWeaknesses(JSON.parse(storedWeaknesses));

      // Load profile
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setProfileBoard(profile.board);
        setProfileClass(profile.grade);
        setProfileSubjects(profile.subjects);
        setProfileSetupDone(true);
        setSetupBoard(profile.board);
        setSetupClass(profile.grade);
        
        // Split profile subjects into standard ones and custom ones
        const standardList = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Social Science', 'English', 'Hindi', 'Computer Science'];
        const matchedStandard = profile.subjects.filter(s => standardList.some(std => std.toLowerCase() === s.trim().toLowerCase()));
        setSelectedSubjects(matchedStandard);
        
        const customSubjs = profile.subjects.filter(s => !standardList.some(std => std.toLowerCase() === s.trim().toLowerCase()));
        setSetupSubjects(customSubjs.join(', '));

        // If missions are stored, use them; otherwise regenerate from profile
        if (storedMissions) {
          setMissions(JSON.parse(storedMissions));
        } else {
          const newMissions = generateMissionsFromProfile(profile.board, profile.grade, profile.subjects);
          setMissions(newMissions);
          localStorage.setItem('tanios_missions', JSON.stringify(newMissions));
        }
      } else {
        setProfileSetupDone(false);
        setMissions([]);
        localStorage.removeItem('tanios_missions'); // clean up orphan missions
      }

    } catch (e) {
      console.warn("Could not load local storage states:", e);
    }
  }, []);

  // Update level whenever XP changes
  useEffect(() => {
    // Level calculation: Level 1 (0-199 XP), Level 2 (200-499 XP), Level 3 (500+ XP)
    let newLevel = 1;
    if (xp >= 500) newLevel = 3;
    else if (xp >= 200) newLevel = 2;
    setLevel(newLevel);

    // Auto-award badges based on milestones
    let updatedBadges = [...badges];
    if (xp >= 300 && !updatedBadges.includes('board_topper')) {
      updatedBadges.push('board_topper');
      triggerBadgeAward('board_topper', updatedBadges);
    }
    if (streak >= 5 && !updatedBadges.includes('consistency_king')) {
      updatedBadges.push('consistency_king');
      triggerBadgeAward('consistency_king', updatedBadges);
    }
  }, [xp, streak]);

  // Listen to doubt solved event from Chat page to dynamically update XP!
  useEffect(() => {
    const handleXpUpdate = () => {
      const currentXP = parseInt(localStorage.getItem('tanios_xp') || '120', 10);
      setXp(currentXP);
    };
    window.addEventListener('tanios_xp_update', handleXpUpdate);
    return () => window.removeEventListener('tanios_xp_update', handleXpUpdate);
  }, []);

  // Award XP function with animation trigger
  const awardXp = (amount, reason) => {
    const newXp = xp + amount;
    setXp(newXp);
    saveState('tanios_xp', newXp);

    setXpAwardedMsg(`+${amount} XP Earned! (${reason}) ✨`);
    setTimeout(() => setXpAwardedMsg(''), 4000);
  };

  const triggerBadgeAward = (badgeId, nextBadges) => {
    setBadges(nextBadges);
    saveState('tanios_badges', nextBadges);
    const badgeNames = {
      board_topper: 'Board Topper 🥇',
      consistency_king: 'Consistency King 👑'
    };
    setXpAwardedMsg(`🏆 UNLOCKED BADGE: ${badgeNames[badgeId] || badgeId}!`);
    setTimeout(() => setXpAwardedMsg(''), 5000);
  };

  // Complete mission
  const toggleMission = (id) => {
    const updated = missions.map(m => {
      if (m.id === id && !m.done) {
        awardXp(m.xp, 'Completed Target Task');
        // Update consistency score a bit
        const newCons = Math.min(100, consistency + 2);
        setConsistency(newCons);
        saveState('tanios_consistency', newCons);
        
        // Possibly increment streak
        if (missions.filter(x => !x.done).length === 2) { // meaning this is the last unfinished mission (excluding login)
          const newStreak = streak + 1;
          setStreak(newStreak);
          saveState('tanios_streak', newStreak);
        }
        return { ...m, done: true };
      }
      return m;
    });
    setMissions(updated);
    saveState('tanios_missions', updated);
  };

  // Add a custom weakness
  const addWeakness = (e) => {
    e.preventDefault();
    if (!newWeakSubject || !newWeakChapter) return;
    const newW = {
      id: `w_${Date.now()}`,
      subject: newWeakSubject,
      chapter: newWeakChapter,
      score: 35 // starts weak
    };
    const updated = [...weaknesses, newW];
    setWeaknesses(updated);
    saveState('tanios_weaknesses', updated);
    setNewWeakSubject('');
    setNewWeakChapter('');
    setShowAddWeakness(false);
    awardXp(10, 'Tracked a Learning Gap');
  };

  // Delete a weakness (healed or mistake)
  const removeWeakness = (id) => {
    const updated = weaknesses.filter(w => w.id !== id);
    setWeaknesses(updated);
    saveState('tanios_weaknesses', updated);
  };

  // Trigger healing by generating a simple explanation right on the page
  const healWeakness = async (w) => {
    setActiveOneClickTool('Explain Easy');
    setOneClickTopic(`${w.subject}: ${w.chapter}`);
    setOneClickGrade('10');
    setOneClickResult('');
    // Automatically trigger generation for extreme speed!
    setTimeout(() => {
      const genBtn = document.getElementById('quick-gen-btn');
      genBtn?.click();
    }, 100);
  };

  // ── TRIGGER ONE-CLICK GENERATION ──
  const handleOneClickGenerate = async (e) => {
    e.preventDefault();
    if (!oneClickTopic.trim()) return;

    setOneClickLoading(true);
    setOneClickResult('');
    setOneClickStatus('thinking');

    const prompt = generateOneClickPrompt(activeOneClickTool, oneClickTopic, oneClickGrade);
    const response = await generateAIContent(prompt, (status) => setOneClickStatus(status || ''));

    setOneClickLoading(false);
    setOneClickStatus('');

    if (response.error || !response.text) {
      setOneClickResult(`⚠️ Generation failed: ${response.message || 'Please try again.'}`);
    } else {
      setOneClickResult(fixMathFormatting(response.text));
      // Award XP
      awardXp(15, `Generated AI ${activeOneClickTool}`);
    }
  };

  const handleCopyOneClick = () => {
    navigator.clipboard.writeText(oneClickResult);
    setOneClickCopied(true);
    setTimeout(() => setOneClickCopied(false), 2000);
  };

  // ── TRIGGER EXAM ROADMAP GENERATION ──
  const handleGenerateRoadmap = async (e) => {
    e.preventDefault();
    setExamLoading(true);
    setExamResult('');
    setExamStatus('thinking');

    const prompt = generateExamRoadmapPrompt(examBoard, examGrade, examSubject, examDays);
    const response = await generateAIContent(prompt, (status) => setExamStatus(status || ''));

    setExamLoading(false);
    setExamStatus('');

    if (response.error || !response.text) {
      setExamResult(`⚠️ Roadmap creation failed: ${response.message || 'Please check your connection.'}`);
    } else {
      setExamResult(fixMathFormatting(response.text));
      awardXp(30, 'Unlocked Board Revision Roadmap');
    }
  };

  const handleCopyRoadmap = () => {
    navigator.clipboard.writeText(examResult);
    setRoadmapCopied(true);
    setTimeout(() => setRoadmapCopied(false), 2000);
  };

  // Level thresholds and titles
  const levelData = {
    1: { name: 'Aspirant 🌟', next: 200, icon: '⚡' },
    2: { name: 'Scholar 📚', next: 500, icon: '🎓' },
    3: { name: 'Board Topper 👑', next: 1000, icon: '🏆' }
  };

  const currentLevelInfo = levelData[level] || levelData[1];
  const progressPercent = Math.min(100, (xp / currentLevelInfo.next) * 100);

  // Badge list descriptions
  const badgeMeta = {
    doubt_destroyer: { label: 'Doubt Destroyer ⚔️', desc: 'Solved your first AI doubt!' },
    board_topper: { label: 'Board Scholar 🥇', desc: 'Reached 300+ Study XP!' },
    consistency_king: { label: 'Streak Warrior 🔥', desc: 'Maintained a 5+ day streak!' }
  };

  // Quick Action configuration
  const quickActions = [
    { label: 'Explain Easy', desc: 'Simplifies complex definitions with analogies.', icon: '💡', color: '#3b82f6' },
    { label: 'Generate Notes', desc: 'Produces a board-focused comprehensive summary.', icon: '📑', color: '#10b981' },
    { label: 'Board Questions', desc: 'Fetches repeated past CBSE/RBSE questions.', icon: '🎓', color: '#f59e0b' },
    { label: 'Important Questions', desc: 'Extracts critical scoring questions.', icon: '❓', color: '#8b5cf6' },
    { label: 'Revision Sheet', desc: 'High-density summary with tables and equations.', icon: '📝', color: '#f43f5e' },
    { label: 'Mind Map', desc: 'Displays visual hierarchical text diagram.', icon: '🧠', color: '#06b6d4' },
    { label: '5-Minute Study', desc: 'Super fast bullet points and mnemonics.', icon: '⏱️', color: '#ec4899' },
  ];

  return (
    <div className="page-content">
      {/* Scope specific styling for premium look & interactions */}
      <style>{`
        .home-grid {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 1024px) {
          .home-grid {
            grid-template-columns: 1fr;
          }
        }
        .gamified-header-card {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: var(--radius);
          padding: 2rem;
          position: relative;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .gamified-header-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .gamified-header-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          max-width: 700px;
          margin-bottom: 1.25rem;
        }
        .xp-alert {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 9999;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.9rem;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideInRight 0.3s cubic-bezier(.4,0,.2,1) both;
        }
        .pulse-streak {
          animation: float 3s ease-in-out infinite;
        }
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .badge-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.5rem;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          opacity: 0.9;
          transition: all 0.2s;
        }
        .badge-item:hover {
          transform: scale(1.05);
          border-color: var(--primary);
        }
        .badge-item.locked {
          opacity: 0.4;
          filter: grayscale(1);
        }
        .mission-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 0.75rem;
          transition: all 0.2s;
        }
        .mission-item:hover {
          border-color: var(--primary);
        }
        .mission-item.completed {
          background: rgba(16, 185, 129, 0.04);
          border-color: rgba(16, 185, 129, 0.2);
          opacity: 0.85;
        }
        .quick-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .quick-action-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          padding: 1rem 0.5rem;
          border-radius: var(--radius-sm);
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-action-btn:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }
        .exam-banner {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.08));
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .weakness-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 0.5rem;
        }
        .weakness-badge {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>

      {/* Floating XP Alert for premium micro-feedback */}
      {xpAwardedMsg && (
        <div className="xp-alert">
          {xpAwardedMsg}
        </div>
      )}

      {/* ── ALIVE GREETINGS & HERO SECTION ── */}
      <div className="gamified-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="gamified-header-title">
              {isGuest ? 'Unlock TaniOS AI Study System' : `Welcome back, ${firstName}`}! 👋
            </div>
            <p className="gamified-header-subtitle">
              TaniOS studies <strong>with</strong> you, not just answers questions. Track your weaknesses, crush daily targets, and score board topper grades!
            </p>
            
            {/* Dynamic context alert box representing alive dashboard */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.06)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--accent)',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={16} color="var(--accent)" />
              <span style={{ color: 'var(--text)' }}>
                💡 <strong>Companion Update:</strong> You missed Biology study yesterday. We have a <strong>15-minute quick revision</strong> queued for you below. Let's conquer it!
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => {
                const element = document.getElementById('mission-center');
                element?.scrollIntoView({ behavior: 'smooth' });
              }} className="btn btn-primary">
                <Target size={16} /> Complete Daily Mission
              </button>
              <Link to="/notes" className="btn btn-secondary">
                <FileText size={16} /> Generate AI Notes
              </Link>
            </div>
          </div>

          {/* Exam Countdown banner specifically for Board Target */}
          <div style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            minWidth: '180px'
          }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.05em', color: 'var(--text-secondary)' }}>
              Board Target 2026
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent)', margin: '0.25rem 0' }}>
              15 Days
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Countdown to Class 10 Mock Exam
            </span>
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN MAIN COMMAND WORKSPACE ── */}
      <div className="home-grid">
        
        {/* LEFT COLUMN: ACTIVE TOOLS & ROADMAPS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* A. MISSION CONTROL WIDGET */}
          <section className="card" id="mission-center" style={{ borderLeft: '4px solid var(--primary)' }}>
            {!profileSetupDone ? (
              <div style={{ padding: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Target color="var(--primary)" size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text)' }}>Set Up Your Study Profile</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      Lock in your board & subjects to unlock personalized study missions and target tasks.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                        Select Board
                      </label>
                      <select 
                        className="input-field" 
                        value={setupBoard} 
                        onChange={e => setSetupBoard(e.target.value)} 
                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.88rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', width: '100%' }}
                      >
                        <option value="CBSE">CBSE (Central Board)</option>
                        <option value="RBSE">RBSE (Rajasthan Board)</option>
                        <option value="ICSE">ICSE Board</option>
                        <option value="UP Board">UP Board</option>
                        <option value="Bihar Board">Bihar Board</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                        Class Grade
                      </label>
                      <select 
                        className="input-field" 
                        value={setupClass} 
                        onChange={e => setSetupClass(e.target.value)} 
                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.88rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', width: '100%' }}
                      >
                        <option value="8">Class 8</option>
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                        <option value="11">Class 11</option>
                        <option value="12">Class 12</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.5rem' }}>
                      Select Your Subjects
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {standardSubjects.map(sub => {
                        const isSelected = selectedSubjects.includes(sub.name);
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSubjects(selectedSubjects.filter(s => s !== sub.name));
                              } else {
                                setSelectedSubjects([...selectedSubjects, sub.name]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.45rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                              border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                              color: isSelected ? 'var(--text)' : 'var(--text-secondary)',
                            }}
                          >
                            <span>{sub.icon}</span>
                            <span>{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <label className="input-label" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        Other Subjects (comma separated, e.g. Sanskrit, Computer, Physical Education)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Sanskrit, Physical Education"
                        value={setupSubjects}
                        onChange={e => setSetupSubjects(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      border: 'none',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Sparkles size={16} /> Generate Customized Study Dashboard & Claim +10 XP
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target color="var(--primary)" size={20} />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Complete Today’s Study Mission</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => setProfileSetupDone(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Edit Profile ⚙️
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {missions.filter(m => m.done).length} / {missions.length} Complete
                    </span>
                  </div>
                </div>

                <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{
                    height: '100%',
                    width: `${missions.length > 0 ? (missions.filter(m => m.done).length / missions.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, var(--primary), var(--success))',
                    borderRadius: '99px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                <div>
                  {missions.map(mission => (
                    <div key={mission.id} className={`mission-item ${mission.done ? 'completed' : ''}`}>
                      <button 
                        onClick={() => toggleMission(mission.id)}
                        disabled={mission.done}
                        style={{ background: 'none', border: 'none', color: mission.done ? 'var(--success)' : 'var(--text-secondary)', cursor: mission.done ? 'default' : 'pointer' }}
                      >
                        <CheckCircle2 size={20} style={mission.done ? {} : { opacity: 0.4 }} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          textDecoration: mission.done ? 'line-through' : 'none',
                          color: mission.done ? 'var(--text-secondary)' : 'var(--text)'
                        }}>
                          {mission.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                          +{mission.xp} XP
                        </span>
                        {!mission.done && (
                          <button 
                            onClick={() => {
                              if (mission.type === 'concept') {
                                navigate(`/chat?prompt=${encodeURIComponent(mission.prompt)}`);
                              } else if (mission.type === 'revision') {
                                setActiveOneClickTool('Revision Sheet');
                                setOneClickTopic(mission.topic);
                                setOneClickGrade('10');
                                setOneClickResult('');
                              } else if (mission.type === 'quiz') {
                                navigate(mission.link);
                              }
                            }}
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            Start <Play size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* B. ONE-CLICK OUTPUTS HUB (FAST SHORTCUT COMPANION GENERATOR) */}
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap color="#f59e0b" size={20} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>One-Click Study Generators</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              No prompting required. Get instant, board-focused outputs customized for Indian syllabus in seconds.
            </p>

            <div className="quick-action-grid">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => {
                    setActiveOneClickTool(action.label);
                    setOneClickResult('');
                    setOneClickTopic('');
                  }}
                  className="quick-action-btn"
                  style={activeOneClickTool === action.label ? { borderColor: 'var(--primary)', background: 'var(--primary-light)' } : {}}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{action.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                </button>
              ))}
            </div>

            {/* Display active tool generation window */}
            {activeOneClickTool && (
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '10px',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                animation: 'fadeUp 0.3s cubic-bezier(.4,0,.2,1) both'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>
                    ⚡ Companion Tool: {activeOneClickTool}
                  </h3>
                  <button 
                    onClick={() => setActiveOneClickTool(null)}
                    style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}
                  >
                    Close [X]
                  </button>
                </div>

                <form onSubmit={handleOneClickGenerate}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label className="input-label" style={{ fontSize: '0.7rem' }}>Topic or Chapter Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        required 
                        placeholder="e.g. Life Processes, Trigonometry, Acids Bases"
                        value={oneClickTopic}
                        onChange={e => setOneClickTopic(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label className="input-label" style={{ fontSize: '0.7rem' }}>Class Grade</label>
                      <select 
                        className="input-field"
                        value={oneClickGrade}
                        onChange={e => setOneClickGrade(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        <option value="8">Class 8</option>
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                        <option value="11">Class 11</option>
                        <option value="12">Class 12</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      id="quick-gen-btn"
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      disabled={oneClickLoading || !oneClickTopic}
                    >
                      {oneClickLoading ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          {oneClickStatus && oneClickStatus !== 'thinking' ? oneClickStatus : `Generating ${activeOneClickTool}...`}
                        </>
                      ) : (
                        `Instant Generate ${activeOneClickTool}`
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => navigate(`/chat?prompt=${encodeURIComponent(`Give me a detailed board summary of "${oneClickTopic}" focused on Class ${oneClickGrade} including definitions, board patterns, and solved questions.`)}`)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                    >
                      Open in Tutor Chat 💬
                    </button>
                  </div>
                </form>

                {/* Show Generated One-Click Material */}
                {oneClickResult && (
                  <div style={{
                    marginTop: '1.25rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Generated Success</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleCopyOneClick} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {oneClickCopied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                          {oneClickCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="generated-content" style={{ fontSize: '0.88rem', lineHeight: 1.7, background: 'transparent', border: 'none', padding: 0, margin: 0, boxShadow: 'none' }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownComponents}
                      >{oneClickResult}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* C. EXAM MODE ROADMAP ENGINE (BOARD COUNTDOWN SYSTEM) */}
          <section className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <GraduationCap color="var(--accent)" size={20} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Active Board Exam Mode</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Got an upcoming board exam? Lock in your targets. The AI will instantly engineer a revision roadmap, daily high-yield topics, and repeated board questions.
            </p>

            <form onSubmit={handleGenerateRoadmap} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Select Board</label>
                <select className="input-field" value={examBoard} onChange={e => setExamBoard(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                  <option value="CBSE (Central Board)">CBSE (Central Board)</option>
                  <option value="RBSE (Rajasthan Board)">RBSE (Rajasthan Board)</option>
                  <option value="UP Board">UP Board (Hindi/Eng Medium)</option>
                  <option value="Bihar Board">Bihar Board (BSEB)</option>
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Class</label>
                <select className="input-field" value={examGrade} onChange={e => setExamGrade(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 12">Class 12</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 8">Class 8</option>
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Focus Subject</label>
                <select className="input-field" value={examSubject} onChange={e => setExamSubject(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                  <option value="Science">Science / Physics / Chem</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Social Science">Social Science</option>
                  <option value="English">English Core</option>
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Days Remaining</label>
                <select className="input-field" value={examDays} onChange={e => setExamDays(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                  <option value="15">15 Days (Sprint)</option>
                  <option value="30">30 Days (Standard)</option>
                  <option value="45">45 Days (Full Revision)</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.65rem', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={examLoading}
                >
                  {examLoading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {examStatus && examStatus !== 'thinking' ? examStatus : 'Engineering Board Roadmap...'}
                    </>
                  ) : (
                    <><Sparkles size={16} /> Generate Day-by-Day Exam Roadmap</>
                  )}
                </button>
              </div>
            </form>

            {/* Display generated roadmap */}
            {examResult && (
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '10px',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                marginTop: '1rem',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>🎯 Customized Board Study Roadmap ({examBoard})</strong>
                  <button onClick={handleCopyRoadmap} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {roadmapCopied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    {roadmapCopied ? 'Copied Roadmap' : 'Copy Roadmap'}
                  </button>
                </div>
                <div className="generated-content" style={{ fontSize: '0.88rem', lineHeight: 1.7, background: 'transparent', border: 'none', padding: 0, margin: 0, boxShadow: 'none' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >{examResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: STATE STATS, WEAKNESS CLINIC & BADGES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 1. DOPAMINE GAMIFICATION DASHBOARD */}
          <section className="card" style={{ background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Trophy color="var(--accent)" size={20} />
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Dopamine & consistency</h2>
            </div>

            {/* A. Streak with Fire icon animation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
              <div className="pulse-streak" style={{
                width: '3rem', height: '3rem',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Flame size={24} color="#ef4444" fill="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>
                  {streak} Day Streak!
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Complete daily tasks to stay consistent.
                </span>
              </div>
            </div>

            {/* B. XP Progress Bar */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text)' }}>Level {level}: {currentLevelInfo.name}</span>
                <span style={{ color: 'var(--primary)' }}>{xp} / {currentLevelInfo.next} XP</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                  borderRadius: '99px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                Earn XP by completing checklist tasks and solving doubts!
              </span>
            </div>

            {/* C. Consistency Score with 7-Day Matrix */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Consistency Score</span>
                <strong style={{ color: 'var(--success)', fontSize: '0.88rem' }}>{consistency}%</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <div style={{
                      width: '16px', height: '16px',
                      borderRadius: '50%',
                      background: i < 5 ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px', color: '#fff', fontWeight: 900
                    }}>
                      {i < 5 ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* D. Badges locker */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>Unlocked Achievements</span>
              <div className="badge-grid">
                {Object.keys(badgeMeta).map(badgeId => {
                  const hasBadge = badges.includes(badgeId);
                  return (
                    <div 
                      key={badgeId} 
                      className={`badge-item ${hasBadge ? '' : 'locked'}`}
                      title={badgeMeta[badgeId].desc}
                    >
                      <div>{badgeMeta[badgeId].label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 2. WEAKNESS CLINIC & HEALING REGISTRY */}
          <section className="card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🩹</span>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Weak Subjects Clinic</h2>
              </div>
              <button 
                onClick={() => setShowAddWeakness(!showAddWeakness)}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                +
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Track chapters with low scores. Let TaniOS AI study with you to heal learning gaps instantly.
            </p>

            {/* Quick add weakness form */}
            {showAddWeakness && (
              <form onSubmit={addWeakness} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Subject (e.g. Physics)" 
                    className="input-field" 
                    required 
                    value={newWeakSubject}
                    onChange={e => setNewWeakSubject(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Chapter / Topic" 
                    className="input-field" 
                    required 
                    value={newWeakChapter}
                    onChange={e => setNewWeakChapter(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#ef4444', border: 'none' }}>
                    Track
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddWeakness(false)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div>
              {weaknesses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  🎉 No weak chapters recorded! You are doing amazing.
                </div>
              ) : (
                weaknesses.map(w => (
                  <div key={w.id} className="weakness-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{w.chapter}</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{w.subject}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="weakness-badge">{w.score}% score</span>
                      <button 
                        onClick={() => healWeakness(w)}
                        title="Heal this topic now" 
                        style={{ padding: '0.25rem 0.5rem', background: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}
                      >
                        Heal 🩹
                      </button>
                      <button 
                        onClick={() => removeWeakness(w.id)}
                        style={{ color: 'var(--text-secondary)', opacity: 0.4 }}
                        title="Remove tracking"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </div>

      {/* ── Glassmorphic AI Loader Overlay (Specifically for Board Roadmap Mode) ── */}
      {examLoading && (
        <div className="global-ai-loader-overlay">
          <div className="global-ai-loader-card">
            <div className="global-ai-loader-glow-orb"></div>
            <div className="global-ai-loader-icon-wrapper">
              <Sparkles className="global-ai-loader-icon" size={32} />
            </div>
            <h3>TaniOS AI is crafting...</h3>
            <p>Please wait a moment while the AI compiles high-yield study materials for you.</p>
            <div className="global-ai-loader-bar">
              <div className="global-ai-loader-bar-fill"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
