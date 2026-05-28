import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, MessageSquare, Clock, FileText, GraduationCap, ArrowRight,
  Flame, Star, Trophy, Award, Target, CheckCircle2, ChevronRight, 
  AlertCircle, RefreshCw, Plus, Trash2, Sparkles, Zap, Play, Copy, Check, Calendar,
  Loader2, X
} from 'lucide-react';
import { generateAIContent, generateExamRoadmapPrompt, generateOneClickPrompt, fixMathFormatting } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext';
import { saveDocument, logActivity } from '../lib/firebase';

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
  { name: 'Computer Science', icon: '💻', color: '#06b6d4' },
  { name: 'Accountancy', icon: '📂', color: '#f43f5e' },
  { name: 'Business Studies', icon: '💼', color: '#a855f7' },
  { name: 'Economics', icon: '📊', color: '#f59e0b' },
  { name: 'Informatics Practices', icon: '🖥️', color: '#06b6d4' }
];



export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';
  const isGuest = currentUser?.isGuest;

  // ── 1. DOPAMINE GAMIFICATION STATE (Persisted in localStorage) ──
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [consistency, setConsistency] = useState(0);
  const [badges, setBadges] = useState([]);
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

  // Interactive Daily Mission Modal states
  const [activeMission, setActiveMission] = useState(null);
  const [missionAnswer, setMissionAnswer] = useState(null);
  const [missionSubmitted, setMissionSubmitted] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});

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
      {
        type: 'concept',
        labelFn: (s) => `Doubt Practice: Solve a ${s} concept`,
        xp: 20,
        promptFn: (s, g) => `Explain a key concept from ${s} simply for ${board} Class ${g} board exam context`,
      },
      {
        type: 'revision',
        labelFn: (s) => `15-Min Revision: ${s} quick recap`,
        xp: 25,
        topicFn: (s) => s,
      },
      {
        type: 'quiz',
        labelFn: (s) => `Quick Quiz: ${s} MCQ Test (5 Qs)`,
        xp: 30,
        linkFn: (s) => `/test?subject=${encodeURIComponent(s)}&topic=${encodeURIComponent(s)}&count=5`,
      },
    ];

    // Rotate subjects each day using today's date so missions change daily
    const today = new Date().getDate();
    const shuffled = [...subjects].sort(
      (a, b) => ((a.charCodeAt(0) + today) % 7) - ((b.charCodeAt(0) + today) % 7)
    );
    const picked = shuffled.slice(0, Math.min(3, subjects.length));

    const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const generated = picked.map((subj, idx) => {
      const tmpl = missionTemplates[idx % missionTemplates.length];
      const mission = {
        id: `m_${idx + 1}`,
        type: tmpl.type,
        label: tmpl.labelFn(subj),
        xp: tmpl.xp,
        done: false,
        dateKey,
      };
      if (tmpl.promptFn) mission.prompt = tmpl.promptFn(subj, grade);
      if (tmpl.topicFn) mission.topic = tmpl.topicFn(subj);
      if (tmpl.linkFn) mission.link = tmpl.linkFn(subj);
      return mission;
    });

    // Daily check-in is always auto-done
    generated.push({
      id: 'm_checkin',
      type: 'login',
      label: 'Daily consistency check-in',
      xp: 15,
      done: true,
      dateKey,
    });

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

  // ── LOAD STATE ON MOUNT & ON USER CHANGE ──
  // Runs whenever the logged-in user changes (login / logout / switch account).
  // After logout, AuthContext wipes all tanios_* keys, so this re-run finds
  // nothing in storage and resets everything to a clean blank slate.
  useEffect(() => {
    const userId = currentUser?.uid || currentUser?.email || null;

    try {
      const storedXp          = localStorage.getItem('tanios_xp');
      const storedStreak      = localStorage.getItem('tanios_streak');
      const storedConsistency = localStorage.getItem('tanios_consistency');
      const storedBadges      = localStorage.getItem('tanios_badges');
      const storedWeaknesses  = localStorage.getItem('tanios_weaknesses');
      const storedMissions    = localStorage.getItem('tanios_missions');
      const storedProfile     = localStorage.getItem('tanios_profile');

      // ── Numeric counters ── default to 0 for fresh sessions
      setXp(storedXp ? parseInt(storedXp, 10) : 0);
      setStreak(storedStreak ? parseInt(storedStreak, 10) : 0);
      setConsistency(storedConsistency ? parseInt(storedConsistency, 10) : 0);

      // ── Badges ── empty for fresh sessions
      setBadges(storedBadges ? JSON.parse(storedBadges) : []);

      // ── Weaknesses ──
      setWeaknesses(storedWeaknesses ? JSON.parse(storedWeaknesses) : []);

      // ── Profile & Missions ──
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setProfileBoard(profile.board);
        setProfileClass(profile.grade);
        setProfileSubjects(profile.subjects);
        setProfileSetupDone(true);
        setSetupBoard(profile.board);
        setSetupClass(profile.grade);

        // Restore subject chip selections for the edit form
        const standardList = [
          'Physics', 'Chemistry', 'Mathematics', 'Biology',
          'Social Science', 'English', 'Hindi', 'Computer Science',
          'Economics', 'Accountancy', 'Business Studies', 'Informatics Practices',
        ];
        setSelectedSubjects(
          profile.subjects.filter(s =>
            standardList.some(std => std.toLowerCase() === s.trim().toLowerCase())
          )
        );
        setSetupSubjects(
          profile.subjects
            .filter(s => !standardList.some(std => std.toLowerCase() === s.trim().toLowerCase()))
            .join(', ')
        );

        // ── DAILY MISSION RESET LOGIC ──
        const todayKey = new Date().toISOString().slice(0, 10);
        let missionsToUse;

        if (storedMissions) {
          const parsed = JSON.parse(storedMissions);
          const missionDate = parsed[0]?.dateKey;
          if (missionDate === todayKey) {
            // Same day — restore done/not-done state as-is
            missionsToUse = parsed;
          } else {
            // New day — fresh missions, streak/XP are preserved separately
            missionsToUse = generateMissionsFromProfile(profile.board, profile.grade, profile.subjects);
            localStorage.setItem('tanios_missions', JSON.stringify(missionsToUse));
          }
        } else {
          // No stored missions yet (fresh profile or wiped) — generate now
          missionsToUse = generateMissionsFromProfile(profile.board, profile.grade, profile.subjects);
          localStorage.setItem('tanios_missions', JSON.stringify(missionsToUse));
        }

        setMissions(missionsToUse);

        // Sync exam / one-click grade with profile
        setExamBoard(
          profile.board === 'CBSE' ? 'CBSE (Central Board)'
          : profile.board === 'RBSE' ? 'RBSE (Rajasthan Board)'
          : profile.board
        );
        setExamGrade(`Class ${profile.grade}`);
        setOneClickGrade(profile.grade);
      } else {
        // No profile found → new user or just logged out → show setup form
        setProfileSetupDone(false);
        setProfileBoard('');
        setProfileClass('');
        setProfileSubjects([]);
        setSelectedSubjects([]);
        setSetupSubjects('');
        setMissions([]);
      }

    } catch (e) {
      console.warn('Could not load local storage states:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, currentUser?.email]);


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
      const currentXP = parseInt(localStorage.getItem('tanios_xp') || '0', 10);
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

  // Complete mission — marks done, awards XP, handles streak
  const toggleMission = (id) => {
    // Find the mission being completed
    const target = missions.find(m => m.id === id);
    if (!target || target.done) return; // already done or not found

    // Count non-login missions that are NOT yet done (before this click)
    const pendingNonLogin = missions.filter(m => m.type !== 'login' && !m.done);
    const isLastMission = pendingNonLogin.length === 1 && pendingNonLogin[0].id === id;

    const updated = missions.map(m =>
      m.id === id ? { ...m, done: true } : m
    );
    setMissions(updated);
    saveState('tanios_missions', updated);

    // Award XP for this mission
    awardXp(target.xp, 'Completed Target Task');

    // Update consistency score
    const newCons = Math.min(100, consistency + 2);
    setConsistency(newCons);
    saveState('tanios_consistency', newCons);

    // ── STREAK LOGIC: increment streak only when ALL non-login missions are done ──
    if (isLastMission) {
      const todayKey = new Date().toISOString().slice(0, 10);
      const lastStreakDay = localStorage.getItem('tanios_streak_day') || '';

      if (lastStreakDay !== todayKey) {
        // First time completing all missions today → increment streak
        const newStreak = streak + 1;
        setStreak(newStreak);
        saveState('tanios_streak', newStreak);
        localStorage.setItem('tanios_streak_day', todayKey);
        // Extra XP bonus for completing all daily missions
        setTimeout(() => awardXp(10, '🔥 All Daily Missions Complete!'), 600);
      }
    }
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
      const formattedText = fixMathFormatting(response.text);
      setExamResult(formattedText);
      awardXp(30, 'Unlocked Board Revision Roadmap');
      if (currentUser) {
        saveDocument(
          currentUser.uid || currentUser.email,
          'revision',
          `Board Roadmap: ${examSubject} (${examBoard} Class ${examGrade.replace('Class ', '')})`,
          formattedText
        ).catch(err => console.warn('Save roadmap failed (non-blocking):', err));
      }
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

        /* 📱 MOBILE RESPONSIVENESS & SCROLLABILITY PATCH ── */
        @media (max-width: 768px) {
          .gamified-header-card {
            padding: 1.25rem 1rem !important;
            overflow: hidden !important;
          }
          .gamified-header-title {
            font-size: 1.35rem !important;
          }
          .gamified-header-subtitle {
            font-size: 0.85rem !important;
            max-width: 100% !important;
          }
          .countdown-box {
            min-width: 0 !important;
            width: 100% !important;
            flex-shrink: 1 !important;
          }
          .profile-setup-grid {
            grid-template-columns: 1fr !important;
          }
          .exam-form-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .oneclick-form-row {
            flex-direction: column !important;
          }
          .oneclick-form-row > div {
            width: 100% !important;
            min-width: 0 !important;
          }
          .mission-header-row {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          /* Home grid collapses to 1 column */
          .home-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          /* Countdown box full width on mobile */
          .home-grid > div:first-child > div,
          [style*="minWidth: '180px'"],
          [style*="min-width: 180px"] {
            min-width: 0 !important;
            width: 100% !important;
          }
          .mission-item {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-start !important;
            gap: 0.5rem !important;
            padding: 0.75rem !important;
          }
          .mission-item > button {
            align-self: flex-start;
            flex-shrink: 0;
          }
          .mission-item > div:nth-child(2) {
            flex: 1;
            min-width: 0;
          }
          .mission-item > div:last-child {
            flex-shrink: 0;
          }
          /* Quick action grid tighter */
          .quick-action-grid {
            grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)) !important;
            gap: 0.5rem !important;
          }
          /* One-click form: stack on mobile */
          .quick-action-grid + div form > div:first-child {
            flex-direction: column !important;
          }
          /* Cards must not overflow */
          .card {
            overflow: hidden !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }
          /* Exam form: single column */
          form[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          /* Limit all flex containers */
          .home-grid section,
          .home-grid > div {
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          /* Profile setup grid: 1 col */
          div[style*="grid-template-columns: '1fr 1fr'"],
          div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
          /* Flex rows that contain minWidth items */
          div[style*="justify-content: space-between"] {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          /* Countdown box */
          div[style*="minWidth: '180px'"] {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }

        @media (max-width: 480px) {
          .quick-action-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.4rem !important;
          }
          .quick-action-btn {
            padding: 0.65rem 0.2rem !important;
          }
          .quick-action-btn div:first-child {
            font-size: 1.2rem !important;
            margin-bottom: 0.15rem !important;
          }
          .quick-action-btn div:last-child {
            font-size: 0.65rem !important;
          }
          .weakness-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.6rem !important;
          }
          .weakness-row > div:last-child {
            width: 100%;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 0.5rem;
          }
          .gamified-header-card .btn {
            flex: 1 1 auto !important;
            text-align: center !important;
            justify-content: center !important;
          }
          .gamified-header-title {
            font-size: 1.2rem !important;
          }
          /* Force profile grid to 1 col */
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }

        /* ── INTERACTIVE DAILY TARGET MODAL FULLSCREEN & RESPONSIVE STYLES ── */
        .daily-mission-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 10, 12, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 0;
          opacity: 1;
          transform: none;
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          overflow-y: auto;
        }
        .daily-mission-card {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          border-radius: 0;
          background: #0c0c0e;
          border: none;
          box-shadow: none;
          padding: 2rem 1.25rem;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          box-sizing: border-box;
        }
        @media (min-width: 769px) {
          .daily-mission-overlay {
            padding: 2rem;
            background: rgba(10, 10, 12, 0.85);
          }
          .daily-mission-card {
            width: 90%;
            height: auto;
            max-width: 850px;
            max-height: 85vh;
            border-radius: 20px;
            background: rgba(20, 20, 25, 0.95);
            border: 1px solid rgba(108, 99, 255, 0.2);
            box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
            padding: 2.5rem 2rem;
            margin: auto;
            box-sizing: border-box;
          }
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gamified-header-title">
              {isGuest ? 'Unlock TaniOS AI Study System' : `Welcome back, ${firstName}`}! 👋
            </div>
            <p className="gamified-header-subtitle">
              TaniOS studies <strong>with</strong> you, not just answers questions. Track your weaknesses, crush daily targets, and score board topper grades!
            </p>
            
            {/* Dynamic context alert box — syncs with student's profile subjects */}
            {(() => {
              // Pick a subject from the student's profile to make the message relevant
              const today = new Date();
              const subjectPool = profileSubjects.length > 0 ? profileSubjects : ['your subjects'];
              const pickedSubject = subjectPool[today.getDate() % subjectPool.length];
              const completedToday = missions.filter(m => m.type !== 'login' && m.done).length;
              const totalNonLogin = missions.filter(m => m.type !== 'login').length;

              let alertMsg;
              let alertColor = 'var(--accent)';
              if (!profileSetupDone) {
                alertMsg = <>💡 <strong>Getting Started:</strong> Set up your study profile below to unlock <strong>personalized daily missions</strong> and start earning XP!</>;
              } else if (totalNonLogin > 0 && completedToday === totalNonLogin) {
                alertMsg = <>🎉 <strong>All Done!</strong> You crushed every mission today! Come back tomorrow for fresh {pickedSubject} challenges.</>;
                alertColor = 'var(--success)';
              } else {
                alertMsg = <>💡 <strong>Companion Update:</strong> You have <strong>{totalNonLogin - completedToday} {pickedSubject} task{totalNonLogin - completedToday !== 1 ? 's' : ''}</strong> pending today. Complete them to build your streak!</>;
              }
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${alertColor}`,
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  <AlertCircle size={16} color={alertColor} style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text)' }}>{alertMsg}</span>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => {
                const element = document.getElementById('mission-center');
                element?.scrollIntoView({ behavior: 'smooth' });
              }} className="btn btn-primary">
                <Target size={16} /> Complete Daily Mission
              </button>
              <Link to="/chat" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', border: 'none', color: 'white', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
                <MessageSquare size={16} /> AI Doubt Solver
              </Link>
              <Link to="/notes" className="btn btn-secondary">
                <FileText size={16} /> Generate AI Notes
              </Link>
            </div>
          </div>

          {/* Exam Countdown banner — real-time sync with Indian board exam dates */}
          {(() => {
            if (!profileSetupDone) return null;
            // ── REAL INDIAN BOARD EXAM DATE DATABASE ──
            // These are approximate official start dates. Updated yearly.
            const EXAM_DATES = {
              CBSE: {
                '10': { month: 1, day: 15, label: 'CBSE Class 10 Board Exam' },   // ~Feb 15
                '12': { month: 1, day: 15, label: 'CBSE Class 12 Board Exam' },   // ~Feb 15
                '8':  { month: 2, day: 1,  label: 'Class 8 Annual Exam' },         // ~March 1
                '9':  { month: 2, day: 1,  label: 'Class 9 Annual Exam' },         // ~March 1
                '11': { month: 2, day: 1,  label: 'Class 11 Annual Exam' },        // ~March 1
              },
              RBSE: {
                '10': { month: 2, day: 5,  label: 'RBSE Class 10 Board Exam' },   // ~March 5
                '12': { month: 2, day: 5,  label: 'RBSE Class 12 Board Exam' },   // ~March 5
                '8':  { month: 2, day: 10, label: 'Class 8 Annual Exam' },         // ~March 10
                '9':  { month: 2, day: 10, label: 'Class 9 Annual Exam' },         // ~March 10
                '11': { month: 2, day: 10, label: 'Class 11 Annual Exam' },        // ~March 10
              },
            };

            const board = profileBoard || 'CBSE';
            // Extract just the number from profileClass (could be "10", "10th", "Class 10" etc)
            const classNum = (profileClass || '10').toString().replace(/\D/g, '') || '10';
            const examInfo = EXAM_DATES[board]?.[classNum] || EXAM_DATES['CBSE']['10'];

            const now = new Date();
            // Build the target exam date — Indian academic year ends in Feb-March
            // If we're past April, the next exam is in the following calendar year
            let examYear = now.getFullYear();
            const examDate = new Date(examYear, examInfo.month, examInfo.day);
            // If the exam date has already passed this year, target next year
            if (examDate <= now) {
              examYear += 1;
              examDate.setFullYear(examYear);
            }

            const diffMs = examDate - now;
            const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            // Color based on urgency
            let countdownColor = 'var(--accent)';
            if (diffDays <= 7) countdownColor = '#ef4444';        // red — exam week!
            else if (diffDays <= 30) countdownColor = '#f59e0b';  // amber — 1 month
            else if (diffDays <= 90) countdownColor = 'var(--accent)'; // normal

            return (
              <div className="countdown-box" style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                minWidth: '150px',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  {board} Target {examYear}
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: countdownColor, margin: '0.25rem 0' }}>
                  {diffDays} Day{diffDays !== 1 ? 's' : ''}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3, display: 'block' }}>
                  {examInfo.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '0.25rem', display: 'block' }}>
                  {examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            );
          })()}
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
                  <div className="profile-setup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <div className="mission-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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
                        style={{ background: 'none', border: 'none', color: mission.done ? 'var(--success)' : 'var(--text-secondary)', cursor: mission.done ? 'default' : 'pointer', flexShrink: 0 }}
                      >
                        <CheckCircle2 size={20} style={mission.done ? {} : { opacity: 0.4 }} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          textDecoration: mission.done ? 'line-through' : 'none',
                          color: mission.done ? 'var(--text-secondary)' : 'var(--text)',
                          wordBreak: 'break-word',
                        }}>
                          {mission.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          +{mission.xp} XP
                        </span>
                        {!mission.done && mission.type !== 'login' && (
                          <button 
                            onClick={() => {
                              setMissionAnswer(null);
                              setMissionSubmitted(false);
                              setQuizStep(0);
                              setQuizAnswers({});
                              setActiveMission(mission);
                              logActivity(
                                currentUser?.uid || 'guest',
                                currentUser?.displayName || currentUser?.email || 'Student',
                                'study_session',
                                `Started study mission: ${mission.label}`
                              ).catch(err => console.error("Activity logging failed", err));
                            }}
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                          >
                            Start <Play size={10} />
                          </button>
                        )}
                        {mission.done && mission.type !== 'login' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>✓ Done</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* B. ONE-CLICK OUTPUTS HUB (FAST SHORTCUT COMPANION GENERATOR) */}
          <section className="card" id="oneclick-section">
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
                  <div className="oneclick-form-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
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
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100%' }}
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

            {/* C. Consistency Score with real-time 7-Day Matrix */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Consistency Score</span>
                <strong style={{ color: 'var(--success)', fontSize: '0.88rem' }}>{consistency}%</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                {(() => {
                  // Build last 7 days ending with today, using real dates
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const today = new Date();
                  const days = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    days.push({
                      label: dayNames[d.getDay()],
                      date: d.getDate(),
                      isToday: i === 0,
                      // A day is "active" if it falls within the current streak window
                      // streak=3 means today + 2 previous days were active
                      isActive: streak > 0 && i < streak,
                    });
                  }
                  return days.map((day, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <div style={{
                        width: day.isToday ? '20px' : '16px',
                        height: day.isToday ? '20px' : '16px',
                        borderRadius: '50%',
                        background: day.isActive
                          ? 'var(--success)'
                          : day.isToday
                            ? 'rgba(99, 102, 241, 0.3)'
                            : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '8px', color: '#fff', fontWeight: 900,
                        border: day.isToday ? '2px solid var(--primary)' : 'none',
                        transition: 'all 0.2s ease',
                      }}>
                        {day.isActive ? '✓' : ''}
                      </div>
                      <span style={{
                        fontSize: '0.6rem',
                        color: day.isToday ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: day.isToday ? 700 : 400,
                      }}>
                        {day.label}
                      </span>
                      <span style={{
                        fontSize: '0.55rem',
                        color: day.isToday ? 'var(--text)' : 'var(--text-secondary)',
                        fontWeight: day.isToday ? 600 : 400,
                        opacity: 0.7,
                      }}>
                        {day.date}
                      </span>
                    </div>
                  ));
                })()}
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

      {/* C. EXAM MODE ROADMAP ENGINE (BOARD COUNTDOWN SYSTEM) */}
      <section className="card" style={{ borderLeft: '4px solid var(--accent)', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <GraduationCap color="var(--accent)" size={20} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Active Board Exam Mode</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Got an upcoming board exam? Lock in your targets. The AI will instantly engineer a revision roadmap, daily high-yield topics, and repeated board questions.
        </p>

        <form onSubmit={handleGenerateRoadmap} className="exam-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label className="input-label" style={{ fontSize: '0.7rem' }}>Select Board</label>
            <select className="input-field" value={examBoard} onChange={e => setExamBoard(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
              <option value="CBSE (Central Board)">CBSE (Central Board)</option>
              <option value="RBSE (Rajasthan Board)">RBSE (Rajasthan Board)</option>
              <option value="UP Board">UP Board (Hindi/Eng Medium)</option>
              <option value="Bihar Board">Bihar Board (BSEB)</option>
            </select>
          </div>
          <div>
            <label className="input-label" style={{ fontSize: '0.7rem' }}>Class</label>
            <select className="input-field" value={examGrade} onChange={e => setExamGrade(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
              <option value="Class 10">Class 10</option>
              <option value="Class 12">Class 12</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 8">Class 8</option>
            </select>
          </div>
          <div>
            <label className="input-label" style={{ fontSize: '0.7rem' }}>Focus Subject</label>
            <select className="input-field" value={examSubject} onChange={e => setExamSubject(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
              <option value="Science">Science / Physics / Chem</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Social Science">Social Science</option>
              <option value="English">English Core</option>
            </select>
          </div>
          <div>
            <label className="input-label" style={{ fontSize: '0.7rem' }}>Days Remaining</label>
            <select className="input-field" value={examDays} onChange={e => setExamDays(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
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

      {/* ── Glassmorphic AI Loader Overlay (Specifically for Board Roadmap Mode) ── */}
      {examLoading && createPortal(
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
        </div>,
        document.body
      )}

      {/* ── INTERACTIVE DAILY STUDY MISSIONS MODAL ── */}
      {activeMission && createPortal(
        <div className="daily-mission-overlay">
          <div className="daily-mission-card">
            {/* Background Glow Orb */}
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '120px', height: '120px',
              background: 'radial-gradient(circle, rgba(108, 99, 255, 0.25) 0%, rgba(108,99,255,0) 70%)',
              borderRadius: '50%', pointerEvents: 'none'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.2rem' }}>
                  ⚡ ACTIVE DAILY MISSION
                </span>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                  {activeMission.type === 'concept' && "Doubt Practice: Solve Math Concept"}
                  {activeMission.type === 'revision' && "15-Min Revision: Physics Quick Recap"}
                  {activeMission.type === 'quiz' && "Quick Quiz: Chemistry MCQ Test"}
                </h4>
              </div>
              <button 
                onClick={() => setActiveMission(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div style={{ marginBottom: '1.75rem' }}>
              
              {/* 1. CONCEPT (Mathematics) */}
              {activeMission.type === 'concept' && (
                <div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    💡 <strong style={{ color: '#fff' }}>AP Concept Practice:</strong> Solve this high-yield Class 10 Board exam problem to earn your XP!
                  </p>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                      Q: In an Arithmetic Progression (AP), if the common difference (<span style={{ fontFamily: 'math', fontStyle: 'italic' }}>d</span>) is −4, and the seventh term (<span style={{ fontFamily: 'math', fontStyle: 'italic' }}>a₇</span>) is 4, find the first term (<span style={{ fontFamily: 'math', fontStyle: 'italic' }}>a</span>).
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { key: 'A', value: '20', desc: 'First term a = 20' },
                      { key: 'B', value: '24', desc: 'First term a = 24' },
                      { key: 'C', value: '28', desc: 'First term a = 28 (Correct)' },
                      { key: 'D', value: '32', desc: 'First term a = 32' }
                    ].map(opt => {
                      const isSelected = missionAnswer === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => !missionSubmitted && setMissionAnswer(opt.key)}
                          disabled={missionSubmitted}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            width: '100%', padding: '0.85rem 1rem',
                            background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px', color: '#fff', textAlign: 'left',
                            cursor: missionSubmitted ? 'default' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)'
                          }}>
                            {opt.key}
                          </div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {missionSubmitted && (
                    <div style={{
                      marginTop: '1.25rem', padding: '1rem',
                      background: missionAnswer === 'C' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: missionAnswer === 'C' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)'
                    }}>
                      {missionAnswer === 'C' ? (
                        <>
                          🎉 <strong style={{ color: '#10b981' }}>Correct Answer!</strong> Good job! Formula: <span style={{ fontFamily: 'monospace' }}>a₇ = a + 6d</span>. Substituting the values: <span style={{ fontFamily: 'monospace' }}>4 = a + 6(−4) ⟹ 4 = a − 24 ⟹ a = 28</span>.
                        </>
                      ) : (
                        <>
                          ❌ <strong style={{ color: '#f87171' }}>Incorrect Option.</strong> Hint: Use the formula <span style={{ fontFamily: 'monospace' }}>a_n = a + (n−1)d</span>. Try calculating <span style={{ fontFamily: 'monospace' }}>a₇ = a + 6d ⟹ 4 = a − 24</span>. Select option <strong>C (28)</strong> to solve!
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. REVISION (Physics) */}
              {activeMission.type === 'revision' && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    📚 Read this high-density Physics card and solve the retention question:
                  </p>

                  {/* Bullet sheet */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.05), rgba(108, 99, 255, 0.08))',
                    border: '1px solid rgba(167, 139, 250, 0.15)',
                    borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem',
                    fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6
                  }}>
                    <strong style={{ color: '#fff', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                      ⚡ Refraction & Lens Power Summary
                    </strong>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                      <li style={{ marginBottom: '0.35rem' }}><strong style={{ color: '#a78bfa' }}>Refractive Index (n):</strong> Ratio of light speeds: <span style={{ fontFamily: 'monospace' }}>n = c/v</span>.</li>
                      <li style={{ marginBottom: '0.35rem' }}><strong style={{ color: '#a78bfa' }}>Snell\'s Law:</strong> Ratio of sines is constant: <span style={{ fontFamily: 'monospace' }}>sin i / sin r = constant = n₂/n₁</span>.</li>
                      <li style={{ marginBottom: '0.35rem' }}><strong style={{ color: '#a78bfa' }}>Power of Lens (P):</strong> Reciprocal of focal length: <span style={{ fontFamily: 'monospace' }}>P = 1/f</span> (f must be in meters). SI Unit is Dioptre (D).</li>
                      <li><strong style={{ color: '#a78bfa' }}>Lens Sign Conventions:</strong> Convex lenses have positive focal length (+f), Concave lenses have negative (-f).</li>
                    </ul>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    Q: If a doctor prescribes a lens of power +2.0 D, what is its focal length and lens type?
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {[
                      { key: 'A', value: 'f = -0.5 m, Concave' },
                      { key: 'B', value: 'f = +0.5 m, Convex (Correct)' },
                      { key: 'C', value: 'f = +2.0 m, Convex' },
                      { key: 'D', value: 'f = -2.0 m, Concave' }
                    ].map(opt => {
                      const isSelected = missionAnswer === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => !missionSubmitted && setMissionAnswer(opt.key)}
                          disabled={missionSubmitted}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            width: '100%', padding: '0.75rem 1rem',
                            background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px', color: '#fff', textAlign: 'left',
                            cursor: missionSubmitted ? 'default' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)'
                          }}>
                            {opt.key}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{opt.value}</span>
                        </button>
                      );
                    })}
                  </div>

                  {missionSubmitted && (
                    <div style={{
                      marginTop: '1.25rem', padding: '1rem',
                      background: missionAnswer === 'B' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: missionAnswer === 'B' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)'
                    }}>
                      {missionAnswer === 'B' ? (
                        <>
                          🎉 <strong style={{ color: '#10b981' }}>Correct Answer!</strong> Power is positive +2.0 D, so the lens is Convex. Focal length: <span style={{ fontFamily: 'monospace' }}>f = 1/P = 1/2.0 = 0.5 m = +0.5 m</span>.
                        </>
                      ) : (
                        <>
                          ❌ <strong style={{ color: '#f87171' }}>Wrong Answer.</strong> Remember: Power <span style={{ fontFamily: 'monospace' }}>P = 1/f ⟹ f = 1/P = 1/+2.0 = 0.5 m</span>. Positive power means a Convex lens. Select option <strong>B</strong> to proceed!
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. QUIZ (Chemistry 5 Qs) */}
              {activeMission.type === 'quiz' && (() => {
                const quizQuestions = [
                  {
                    q: "Which of the following is a decomposition reaction?",
                    opts: [
                      { key: 'A', text: "2H₂ + O₂ ⟶ 2H₂O (Combination)" },
                      { key: 'B', text: "CaCO₃ ⟶ CaO + CO₂ (Decomposition)" },
                      { key: 'C', text: "Zn + CuSO₄ ⟶ ZnSO₄ + Cu (Displacement)" }
                    ],
                    correct: 'B'
                  },
                  {
                    q: "The pH value of an acidic solution is:",
                    opts: [
                      { key: 'A', text: "Less than 7 (Acidic)" },
                      { key: 'B', text: "Equal to 7 (Neutral)" },
                      { key: 'C', text: "Greater than 7 (Basic)" }
                    ],
                    correct: 'A'
                  },
                  {
                    q: "Which of the following metals is stored under kerosene oil to prevent accidental fires?",
                    opts: [
                      { key: 'A', text: "Gold" },
                      { key: 'B', text: "Sodium" },
                      { key: 'C', text: "Copper" }
                    ],
                    correct: 'B'
                  },
                  {
                    q: "The functional group present in ethanol (CH₃CH₂OH) is:",
                    opts: [
                      { key: 'A', text: "Aldehyde (-CHO)" },
                      { key: 'B', text: "Alcohol (-OH)" },
                      { key: 'C', text: "Carboxylic Acid (-COOH)" }
                    ],
                    correct: 'B'
                  },
                  {
                    q: "Bronze is a metallic alloy primarily composed of:",
                    opts: [
                      { key: 'A', text: "Copper and Zinc (Brass)" },
                      { key: 'B', text: "Copper and Tin (Bronze)" },
                      { key: 'C', text: "Lead and Tin (Solder)" }
                    ],
                    correct: 'B'
                  }
                ];

                if (quizStep < 5) {
                  const currentQ = quizQuestions[quizStep];
                  const selectedOpt = quizAnswers[quizStep];
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          Question {quizStep + 1} of 5
                        </span>
                        <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${((quizStep + 1) / 5) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                        </div>
                      </div>

                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                        {currentQ.q}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {currentQ.opts.map(opt => {
                          const isSelected = selectedOpt === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [quizStep]: opt.key }))}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                width: '100%', padding: '0.85rem 1rem',
                                background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '10px', color: '#fff', textAlign: 'left',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.72rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)'
                              }}>
                                {opt.key}
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                          onClick={() => selectedOpt && setQuizStep(s => s + 1)}
                          disabled={!selectedOpt}
                          className="btn btn-primary"
                          style={{
                            padding: '0.6rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
                            cursor: selectedOpt ? 'pointer' : 'not-allowed', opacity: selectedOpt ? 1 : 0.5
                          }}
                        >
                          {quizStep === 4 ? "Review Answers" : "Next Question ➔"}
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  // Final summary results
                  let correctCount = 0;
                  quizQuestions.forEach((q, idx) => {
                    if (quizAnswers[idx] === q.correct) correctCount++;
                  });

                  return (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '2.5rem' }}>🏆</span>
                      <h4 style={{ color: '#10b981', margin: '0.5rem 0', fontWeight: 800, fontSize: '1.25rem' }}>
                        Chemistry Quiz Completed!
                      </h4>
                      <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        You scored <strong style={{ color: '#fff' }}>{correctCount} / 5 Correct</strong> ({correctCount * 20}% Score)
                      </p>

                      {/* Brief details checklist */}
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px', padding: '1rem',
                        textAlign: 'left', marginBottom: '1.5rem',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem'
                      }}>
                        {quizQuestions.map((q, i) => {
                          const userAns = quizAnswers[i];
                          const isCorrect = userAns === q.correct;
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Q{i+1}: Decomposition, Acids, Sodium, Ethanol, Bronze</span>
                              <span style={{ color: isCorrect ? '#10b981' : '#f87171', fontWeight: 800 }}>
                                {isCorrect ? "✓ Correct" : `✗ Wrong (Ans: ${q.correct})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Ready to submit and unlock <strong style={{ color: '#a78bfa' }}>+30 XP</strong>?
                      </p>
                    </div>
                  );
                }
              })()}

            </div>

            {/* Modal Bottom Actions */}
            {activeMission.type !== 'quiz' && (
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                {!missionSubmitted ? (
                  <button
                    onClick={() => missionAnswer && setMissionSubmitted(true)}
                    disabled={!missionAnswer}
                    className="btn btn-primary"
                    style={{
                      flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                      cursor: missionAnswer ? 'pointer' : 'not-allowed', opacity: missionAnswer ? 1 : 0.5
                    }}
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (activeMission.type === 'concept' && missionAnswer !== 'C') {
                        // User got math wrong, hint was displayed, let them try again
                        setMissionSubmitted(false);
                        setMissionAnswer(null);
                        return;
                      }
                      if (activeMission.type === 'revision' && missionAnswer !== 'B') {
                        // User got physics wrong, hint was displayed, let them try again
                        setMissionSubmitted(false);
                        setMissionAnswer(null);
                        return;
                      }
                      // Correct selection: Mark completed on dashboard!
                      toggleMission(activeMission.id);
                      setActiveMission(null);
                    }}
                    className="btn btn-primary"
                    style={{
                      flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                      background: (activeMission.type === 'concept' && missionAnswer === 'C') || (activeMission.type === 'revision' && missionAnswer === 'B')
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, var(--primary), var(--accent))'
                    }}
                  >
                    {(activeMission.type === 'concept' && missionAnswer === 'C') || (activeMission.type === 'revision' && missionAnswer === 'B')
                      ? "Submit & Complete Mission"
                      : "Try Correct Option ➔"}
                  </button>
                )}
                <button
                  onClick={() => setActiveMission(null)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px', padding: '0.6rem 1rem',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {activeMission.type === 'quiz' && quizStep === 5 && (
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                <button
                  onClick={() => {
                    toggleMission(activeMission.id);
                    setActiveMission(null);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800 }}
                >
                  Submit & Complete Mission
                </button>
                <button
                  onClick={() => setActiveMission(null)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px', padding: '0.6rem 1rem',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
