// ─── Firebase Auth only — LAZY initialized, zero network calls on page load ───────
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Dynamic backend URL — relative for dev and production
const BACKEND_URL = '';

// ─── Firebase config ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:    import.meta.env.VITE_FIREBASE_API_KEY     || 'dummy-api-key',
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: 'tanios-3cd37',
  appId:     '1:635893073596:web:1839eead55e75b7f3972b9',
};

// ─── LAZY init: Firebase only boots when user clicks Sign In ───────────────────────
// On a normal page load: ZERO Firebase network calls — no API key in network tab.
let _firebaseAuth = null;
const getFirebaseAuth = () => {
  if (!_firebaseAuth) {
    const app = initializeApp(firebaseConfig);
    _firebaseAuth = getAuth(app);
  }
  return _firebaseAuth;
};

// auth is null until loginWithGoogle() is called — AuthContext no longer needs it directly
export const auth = null;
export const db   = null; // Firestore fully removed

// ─── Auth Providers ─────────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = async () => {
  try {
    const authInst = getFirebaseAuth(); // 🔑 Firebase initializes HERE (user-initiated only)
    const result   = await signInWithPopup(authInst, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    if (error.code === 'auth/invalid-api-key' || error.code === 'auth/internal-error') {
      alert('Firebase is not configured yet! Using a mock login for demo.');
      return { displayName: 'Student Demo', email: 'student@demo.com', photoURL: '' };
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    if (_firebaseAuth) await signOut(_firebaseAuth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};

// ─── BACKEND DB HELPERS ────────────────────────────────────────────────────────

// ── Saved Documents ────────────────────────────────────────────────────────────
export const saveDocument = async (userId, type, title, content, docId = null) => {
  const resolvedDocId = docId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  // 1. Save to localStorage immediately (offline-first)
  try {
    const fbKey = `fallback_documents_${userId}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    const docObj = { id: resolvedDocId, userId, type, title, content, createdAt: timestamp };
    const idx = existing.findIndex(d => d.id === resolvedDocId);
    if (idx >= 0) existing[idx] = docObj; else existing.push(docObj);
    localStorage.setItem(fbKey, JSON.stringify(existing));
  } catch (err) {
    console.error('Local storage save failed', err);
  }

  // 2. Sync to backend MongoDB in background
  if (!userId || userId === 'guest') return resolvedDocId;
  fetch(`${BACKEND_URL}/api/db/documents/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, docId: resolvedDocId, type, title, content })
  }).catch(e => console.warn('⚠️ Backend doc sync failed:', e.message));

  return resolvedDocId;
};

export const getUserDocuments = async (userId) => {
  // Try backend first
  if (userId && userId !== 'guest') {
    try {
      const res = await Promise.race([
        fetch(`${BACKEND_URL}/api/db/documents?userId=${encodeURIComponent(userId)}`),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 5000))
      ]);
      if (res.ok) {
        const serverDocs = await res.json();
        // Normalize timestamps
        const normalized = serverDocs.map(d => ({
          ...d,
          id: d.docId || d._id,
          createdAt: { toDate: () => new Date(d.createdAt || Date.now()) }
        }));
        // Update localStorage cache
        try {
          const fbKey = `fallback_documents_${userId}`;
          const plain = normalized.map(d => ({
            id: d.id, userId: d.userId, type: d.type,
            title: d.title, content: d.content,
            createdAt: d.createdAt.toDate().getTime()
          }));
          localStorage.setItem(fbKey, JSON.stringify(plain));
        } catch {}
        return normalized;
      }
    } catch (e) {
      console.warn('⚠️ Backend doc fetch failed, using localStorage:', e.message);
    }
  }

  // Fallback: localStorage
  try {
    const fbKey = `fallback_documents_${userId}`;
    const docs = JSON.parse(localStorage.getItem(fbKey) || '[]');
    return docs.map(d => ({
      ...d,
      createdAt: { toDate: () => new Date(d.createdAt || Date.now()) }
    })).sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
  } catch {
    return [];
  }
};

export const deleteDocument = async (userId, docId) => {
  // Remove from localStorage
  try {
    const fbKey = `fallback_documents_${userId}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    localStorage.setItem(fbKey, JSON.stringify(existing.filter(d => d.id !== docId)));
  } catch {}

  // Remove from backend
  if (!userId || userId === 'guest') return;
  fetch(`${BACKEND_URL}/api/db/documents`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, docId })
  }).catch(e => console.warn('⚠️ Backend doc delete failed:', e.message));
};

// ── Chat Sessions ──────────────────────────────────────────────────────────────
const sanitizeMessages = (messages) => {
  if (!messages || !Array.isArray(messages)) return [];
  return messages.map(m => {
    const clean = {};
    Object.keys(m).forEach(k => {
      if (m[k] === undefined) return;
      if (k === 'image' && m.image) {
        const cleanImg = { ...m.image };
        delete cleanImg.data; delete cleanImg.url;
        clean.image = cleanImg;
      } else { clean[k] = m[k]; }
    });
    return clean;
  });
};

export const saveChatSession = async (userId, sessionId, title, messages) => {
  // 1. Save to localStorage immediately
  try {
    const fbKey = `fallback_chats_${userId}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    const sessionObj = { id: sessionId, userId, title, messages, updatedAt: Date.now() };
    const idx = existing.findIndex(s => s.id === sessionId);
    if (idx >= 0) existing[idx] = sessionObj; else existing.push(sessionObj);
    localStorage.setItem(fbKey, JSON.stringify(existing));
  } catch (err) {
    console.error('Local storage save failed', err);
  }

  // 2. Sync to backend MongoDB in background
  if (!userId || userId === 'guest') return;
  fetch(`${BACKEND_URL}/api/db/chats/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, sessionId, title, messages: sanitizeMessages(messages) })
  }).catch(e => console.warn('⚠️ Backend chat sync failed:', e.message));
};

export const getUserChatSessions = async (userId) => {
  if (!userId || userId === 'guest') {
    try {
      return JSON.parse(localStorage.getItem(`fallback_chats_guest`) || '[]');
    } catch { return []; }
  }

  // Try backend first
  try {
    const res = await Promise.race([
      fetch(`${BACKEND_URL}/api/db/chats?userId=${encodeURIComponent(userId)}`),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 5000))
    ]);
    if (res.ok) {
      const serverChats = await res.json();
      const normalized = serverChats.map(s => ({
        ...s,
        id: s.sessionId || s._id,
        updatedAt: new Date(s.updatedAt || Date.now()).getTime()
      }));

      // Merge with local-only sessions that haven't been synced yet
      try {
        const fbKey = `fallback_chats_${userId}`;
        const localSessions = JSON.parse(localStorage.getItem(fbKey) || '[]');
        const serverIds = new Set(normalized.map(s => s.id));
        for (const ls of localSessions) {
          if (!serverIds.has(ls.id)) {
            normalized.push(ls);
            // Background sync the local-only chat to backend
            fetch(`${BACKEND_URL}/api/db/chats/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, sessionId: ls.id, title: ls.title, messages: sanitizeMessages(ls.messages) })
            }).catch(() => {});
          }
        }
        // Update localStorage cache
        localStorage.setItem(fbKey, JSON.stringify(normalized.map(s => ({
          id: s.id, userId, title: s.title, messages: s.messages, updatedAt: s.updatedAt
        }))));
      } catch {}

      normalized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return normalized;
    }
  } catch (e) {
    console.warn('⚠️ Backend chat fetch failed, using localStorage:', e.message);
  }

  // Fallback: localStorage
  try {
    const sessions = JSON.parse(localStorage.getItem(`fallback_chats_${userId}`) || '[]');
    return sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch { return []; }
};

export const deleteChatSession = async (userId, sessionId) => {
  if (!userId || userId === 'guest') return;

  // Remove from localStorage
  try {
    const fbKey = `fallback_chats_${userId}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    localStorage.setItem(fbKey, JSON.stringify(existing.filter(s => s.id !== sessionId)));
  } catch {}

  // Soft-delete on backend
  fetch(`${BACKEND_URL}/api/db/chats/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, sessionId })
  }).catch(e => console.warn('⚠️ Backend chat delete failed:', e.message));
};

// ── MONGODB ACTIVITY LOGGING FOR ADMIN PANEL ──────────────────────────────────
export const logActivity = async (userId, userName, action, details) => {
  const timestamp = Date.now();
  const activityObj = {
    id: `act_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId || 'anonymous',
    userName: userName || 'Guest',
    action,
    details,
    createdAt: timestamp
  };

  // 1. Local fallback
  try {
    const fbKey = 'tanios_admin_activities';
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    existing.unshift(activityObj);
    if (existing.length > 1000) existing.length = 1000;
    localStorage.setItem(fbKey, JSON.stringify(existing));
  } catch (e) { console.warn('Local storage activity save failed:', e); }

  // 2. Sync to MongoDB
  try {
    await fetch(`${BACKEND_URL}/api/track/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activityObj.userId,
        userName: activityObj.userName,
        action: activityObj.action,
        details: activityObj.details
      })
    });
  } catch (e) { console.error('❌ Error logging activity to MongoDB:', e); }
};

export const syncUserToMongo = async (uid, email, displayName, photoURL) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/track/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, displayName, photoURL: photoURL || '' })
    });
    if (response.ok) return await response.json();
  } catch (e) { console.error('❌ Error syncing user to MongoDB:', e); }
  return null;
};

export const trackPaymentInMongo = async (userId, userEmail, amount, utr, status, method) => {
  try {
    await fetch(`${BACKEND_URL}/api/track/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail, amount, utr, status, method })
    });
  } catch (e) { console.error('❌ Error tracking payment to MongoDB:', e); }
};

export const trackSubscriptionInMongo = async (uid, subscriptionData) => {
  try {
    await fetch(`${BACKEND_URL}/api/track/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...subscriptionData })
    });
  } catch (e) { console.error('❌ Error updating subscription in MongoDB:', e); }
};

export const getActivities = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/activities?limit=100`);
    if (response.ok) return await response.json();
  } catch (e) { console.warn('⚠️ Failed to fetch activities from MongoDB:', e.message); }
  try {
    return JSON.parse(localStorage.getItem('tanios_admin_activities') || '[]');
  } catch { return []; }
};

export const getStudents = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/students?limit=500`);
    if (response.ok) return await response.json();
  } catch (e) { console.warn('⚠️ Failed to fetch students from MongoDB:', e.message); }
  return [];
};

// ── Guest → User data sync (uses backend API) ──────────────────────────────────
export const syncGuestDataToUser = async (user) => {
  if (!user || user.isGuest) return;
  const newUserId = user.uid;

  // 1. Sync guest documents from all potential guest keys
  try {
    const docKeys = ['fallback_documents_guest', 'fallback_documents_guest@tanios.ai'];
    let guestDocs = [];
    docKeys.forEach(k => {
      try {
        const val = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) guestDocs = guestDocs.concat(val);
      } catch {}
    });

    if (guestDocs.length > 0) {
      const userDocsKey = `fallback_documents_${newUserId}`;
      const userDocs = JSON.parse(localStorage.getItem(userDocsKey) || '[]');
      
      for (const docObj of guestDocs) {
        const resolvedId = docObj.id || docObj.docId;
        const updated = { ...docObj, id: resolvedId, userId: newUserId };
        // Sync to backend
        fetch(`${BACKEND_URL}/api/db/documents/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: newUserId, docId: resolvedId, type: updated.type, title: updated.title, content: updated.content })
        }).catch(() => {});
        if (!userDocs.find(d => (d.id || d.docId) === resolvedId)) userDocs.push(updated);
      }
      localStorage.setItem(userDocsKey, JSON.stringify(userDocs));
      docKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (err) { console.error('Failed to sync guest documents:', err); }

  // 2. Sync guest chats from all potential guest keys
  try {
    const chatKeys = ['guest_chat_sessions', 'fallback_chats_guest', 'fallback_chats_guest@tanios.ai'];
    let guestChats = [];
    chatKeys.forEach(k => {
      try {
        const val = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val)) guestChats = guestChats.concat(val);
      } catch {}
    });

    if (guestChats.length > 0) {
      const userChatsKey = `fallback_chats_${newUserId}`;
      const userChats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
      
      for (const chatObj of guestChats) {
        const resolvedId = chatObj.id || chatObj.sessionId;
        const updated = { ...chatObj, id: resolvedId, userId: newUserId };
        // Sync to backend
        fetch(`${BACKEND_URL}/api/db/chats/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: newUserId, sessionId: resolvedId, title: updated.title, messages: sanitizeMessages(updated.messages) })
        }).catch(() => {});
        if (!userChats.find(c => (c.id || c.sessionId) === resolvedId)) userChats.push(updated);
      }
      localStorage.setItem(userChatsKey, JSON.stringify(userChats));
      chatKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (err) { console.error('Failed to sync guest chats:', err); }
};

// ── User Profile Sync (Gamification + Progress via backend) ───────────────────
const PROFILE_KEYS = [
  'tanios_xp', 'tanios_streak', 'tanios_streak_day',
  'tanios_consistency', 'tanios_net_score', 'tanios_badges',
  'tanios_profile', 'tanios_missions', 'tanios_active_chapters',
  'tanios_chapter_progress', 'tanios_completed_topics',
  'tanios_selected_subtopics', 'tanios_inline_subtopics', 'tanios_mcq_attempts',
  'tanios_weaknesses', 'tanios_streak_force_reset_v1', 'tanios_ai_usage',
];

export const saveUserProfile = async (userId, data) => {
  if (!userId || userId === 'guest') return;
  fetch(`${BACKEND_URL}/api/db/profile/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, data })
  }).catch(e => console.warn('[saveUserProfile] Backend write failed:', e.message));
};

export const loadAndMergeUserProfile = async (userId) => {
  if (!userId || userId === 'guest') return {};
  try {
    const res = await Promise.race([
      fetch(`${BACKEND_URL}/api/db/profile?userId=${encodeURIComponent(userId)}`),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
    ]);
    if (!res.ok) return {};
    const cloudData = await res.json();
    if (!cloudData || typeof cloudData !== 'object') return {};
    // Write each key back into localStorage so StudyContext/Home picks it up
    PROFILE_KEYS.forEach(baseKey => {
      const localKey = `${baseKey}_${userId}`;
      if (cloudData[baseKey] !== undefined && cloudData[baseKey] !== null) {
        const val = typeof cloudData[baseKey] === 'object'
          ? JSON.stringify(cloudData[baseKey])
          : cloudData[baseKey].toString();
        try { localStorage.setItem(localKey, val); } catch {}
      }
    });
    console.log('[loadAndMergeUserProfile] Cloud data merged into localStorage for', userId);
    return cloudData;
  } catch (e) {
    console.warn('[loadAndMergeUserProfile] Failed (using local data):', e.message);
    return {};
  }
};

export const buildProfileSnapshot = (userId) => {
  const snapshot = {};
  PROFILE_KEYS.forEach(baseKey => {
    const raw = localStorage.getItem(`${baseKey}_${userId}`);
    if (raw === null) return;
    try { snapshot[baseKey] = JSON.parse(raw); } catch { snapshot[baseKey] = raw; }
  });
  return snapshot;
};
