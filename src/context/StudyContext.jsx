import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { saveUserProfile, loadAndMergeUserProfile, buildProfileSnapshot } from '../lib/firebase';

const StudyContext = createContext(null);

// ── Date helpers ─────────────────────────────────────────────────────────────
export const getLocalDateKey = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
export const getYesterdayDateKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// ── Provider ─────────────────────────────────────────────────────────────────
export function StudyProvider({ children }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || currentUser?.email || 'guest';
  const getUserKey = useCallback((base) => base + '_' + userId, [userId]);

  const [xp, setXpRaw] = useState(0);
  const [streak, setStreakRaw] = useState(0);
  const [consistency, setConsistencyRaw] = useState(0);
  const [badges, setBadgesRaw] = useState([]);
  const [netScore, setNetScoreRaw] = useState(0);
  const [xpAwardedMsg, setXpAwardedMsg] = useState('');
  const msgTimer = useRef(null);

  // Debounced Firestore save — fires 2.5s after last state change to batch writes
  const cloudSaveTimer = useRef(null);
  const scheduleSaveToCloud = useCallback((uid) => {
    if (!uid || uid === 'guest') return;
    clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(() => {
      const snapshot = buildProfileSnapshot(uid);
      saveUserProfile(uid, snapshot);
    }, 2500);
  }, []);

  // Load all gamification values from localStorage into React state
  const loadFromStorage = useCallback(() => {
    try {
      // One-time migration/reset to clear old test values for fresh starting state
      const resetKey = getUserKey('tanios_streak_force_reset_v1');
      if (!localStorage.getItem(resetKey)) {
        localStorage.setItem(getUserKey('tanios_streak'), '0');
        localStorage.setItem(getUserKey('tanios_streak_day'), '');
        localStorage.setItem(getUserKey('tanios_consistency'), '0');
        localStorage.setItem(getUserKey('tanios_net_score'), '0');
        localStorage.setItem(resetKey, 'true');
      }

      const storedXp          = localStorage.getItem(getUserKey('tanios_xp'));
      const storedStreak      = localStorage.getItem(getUserKey('tanios_streak'));
      const storedStreakDay   = localStorage.getItem(getUserKey('tanios_streak_day')) || '';
      const storedConsistency = localStorage.getItem(getUserKey('tanios_consistency'));
      const storedBadges      = localStorage.getItem(getUserKey('tanios_badges'));
      const storedNetScore    = localStorage.getItem(getUserKey('tanios_net_score'));

      setXpRaw(storedXp ? parseInt(storedXp, 10) : 0);

      const todayKey     = getLocalDateKey();
      const yesterdayKey = getYesterdayDateKey();
      let activeStreak = storedStreak ? parseInt(storedStreak, 10) : 0;
      if (!storedStreakDay || (storedStreakDay !== todayKey && storedStreakDay !== yesterdayKey)) {
        activeStreak = 0;
        localStorage.setItem(getUserKey('tanios_streak'), '0');
      }
      setStreakRaw(activeStreak);
      setConsistencyRaw(storedConsistency ? parseInt(storedConsistency, 10) : 0);
      setBadgesRaw(storedBadges ? JSON.parse(storedBadges) : []);
      setNetScoreRaw(storedNetScore ? parseInt(storedNetScore, 10) : 0);
    } catch (e) {
      console.warn('[StudyContext] loadFromStorage error:', e);
    }
  }, [getUserKey]);

  // ── On userId change (login/logout): fetch from Firestore → merge localStorage → load ──
  useEffect(() => {
    if (!userId || userId === 'guest') {
      loadFromStorage();
      return;
    }
    // Fetch cloud data first, then load into React state
    loadAndMergeUserProfile(userId).then(() => {
      loadFromStorage();
    });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab sync via browser storage event
  useEffect(() => {
    const handle = (e) => {
      if (!e.key) return;
      if (e.key === getUserKey('tanios_xp') && e.newValue !== null) setXpRaw(parseInt(e.newValue, 10) || 0);
      else if (e.key === getUserKey('tanios_streak') && e.newValue !== null) setStreakRaw(parseInt(e.newValue, 10) || 0);
      else if (e.key === getUserKey('tanios_consistency') && e.newValue !== null) setConsistencyRaw(parseInt(e.newValue, 10) || 0);
      else if (e.key === getUserKey('tanios_badges') && e.newValue !== null) {
        try { setBadgesRaw(JSON.parse(e.newValue)); } catch {}
      } else if (e.key === getUserKey('tanios_net_score') && e.newValue !== null) setNetScoreRaw(parseInt(e.newValue, 10) || 0);
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, [getUserKey]);

  // Same-tab: legacy tanios_xp_update event (Chat.jsx dispatches this)
  useEffect(() => {
    const handle = () => {
      const fresh = parseInt(localStorage.getItem(getUserKey('tanios_xp')) || '0', 10);
      setXpRaw(fresh);
    };
    window.addEventListener('tanios_xp_update', handle);
    return () => window.removeEventListener('tanios_xp_update', handle);
  }, [getUserKey]);

  // Same-tab: custom tanios_state_update event from our own setters
  useEffect(() => {
    const handle = (e) => {
      const { key, value } = e.detail || {};
      if (!key) return;
      if (key === getUserKey('tanios_xp')) setXpRaw(value);
      else if (key === getUserKey('tanios_streak')) setStreakRaw(value);
      else if (key === getUserKey('tanios_consistency')) setConsistencyRaw(value);
      else if (key === getUserKey('tanios_badges')) setBadgesRaw(value);
      else if (key === getUserKey('tanios_net_score')) setNetScoreRaw(value);
    };
    window.addEventListener('tanios_state_update', handle);
    return () => window.removeEventListener('tanios_state_update', handle);
  }, [getUserKey]);

  // Dispatch to notify other components in the same tab
  const dispatch = useCallback((storageKey, value) => {
    window.dispatchEvent(new CustomEvent('tanios_state_update', {
      detail: { key: getUserKey(storageKey), value, userId }
    }));
  }, [getUserKey, userId]);

  const showMsg = useCallback((msg, duration = 4000) => {
    clearTimeout(msgTimer.current);
    setXpAwardedMsg(msg);
    msgTimer.current = setTimeout(() => setXpAwardedMsg(''), duration);
  }, []);

  // awardXp — the single public function for all XP grants across the app
  const awardXp = useCallback((amount, reason) => {
    if (amount <= 0) { showMsg(reason + ' 💡'); return; }
    setXpRaw(prev => {
      const fresh = parseInt(localStorage.getItem(getUserKey('tanios_xp')) || '0', 10);
      const base  = Math.max(prev, fresh);
      const next  = base + amount;
      setTimeout(() => {
        try { localStorage.setItem(getUserKey('tanios_xp'), next.toString()); } catch {}
        dispatch('tanios_xp', next);
        scheduleSaveToCloud(userId);
      }, 0);
      return next;
    });
    showMsg('+' + amount + ' XP Earned! (' + reason + ') ✨');
  }, [getUserKey, dispatch, showMsg, scheduleSaveToCloud, userId]);

  const setStreak = useCallback((valOrFn) => {
    setStreakRaw(prev => {
      const v = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      setTimeout(() => {
        try { localStorage.setItem(getUserKey('tanios_streak'), v.toString()); } catch {}
        dispatch('tanios_streak', v);
        scheduleSaveToCloud(userId);
      }, 0);
      return v;
    });
  }, [getUserKey, dispatch, scheduleSaveToCloud, userId]);

  const setConsistency = useCallback((valOrFn) => {
    setConsistencyRaw(prev => {
      const v = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      setTimeout(() => {
        try { localStorage.setItem(getUserKey('tanios_consistency'), v.toString()); } catch {}
        dispatch('tanios_consistency', v);
        scheduleSaveToCloud(userId);
      }, 0);
      return v;
    });
  }, [getUserKey, dispatch, scheduleSaveToCloud, userId]);

  const setBadges = useCallback((val) => {
    setBadgesRaw(val);
    try { localStorage.setItem(getUserKey('tanios_badges'), JSON.stringify(val)); } catch {}
    dispatch('tanios_badges', val);
    scheduleSaveToCloud(userId);
  }, [getUserKey, dispatch, scheduleSaveToCloud, userId]);

  const setNetScore = useCallback((valOrFn) => {
    setNetScoreRaw(prev => {
      const v = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      setTimeout(() => {
        try { localStorage.setItem(getUserKey('tanios_net_score'), v.toString()); } catch {}
        dispatch('tanios_net_score', v);
        scheduleSaveToCloud(userId);
      }, 0);
      return v;
    });
  }, [getUserKey, dispatch, scheduleSaveToCloud, userId]);

  const resetStudyState = useCallback(() => {
    setXpRaw(0); setStreakRaw(0); setConsistencyRaw(0); setBadgesRaw([]); setNetScoreRaw(0); setXpAwardedMsg('');
  }, []);

  // Expose scheduleSaveToCloud so Home.jsx can trigger cloud save after profile/mission updates
  const triggerCloudSave = useCallback(() => {
    scheduleSaveToCloud(userId);
  }, [scheduleSaveToCloud, userId]);

  // Level derived from XP (Level 1: 0-199 XP, Level 2: 200-499 XP, Level 3: 500+ XP)
  let level = 1;
  if (xp >= 500) level = 3;
  else if (xp >= 200) level = 2;

  const value = {
    xp, streak, consistency, badges, netScore, xpAwardedMsg, level,
    userId, getUserKey,
    awardXp, setStreak, setConsistency, setBadges, setNetScore,
    setXpAwardedMsg: showMsg,
    resetStudyState, loadFromStorage,
    triggerCloudSave,
  };

  return React.createElement(StudyContext.Provider, { value }, children);
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy() must be inside <StudyProvider>');
  return ctx;
}
