import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Dynamic backend URL — localhost for dev, same-origin for production (Vercel/Railway)
const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

// Your web app's Firebase configuration
// Replace these with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, 'default');

// Auth Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    // For demo purposes, we will return a mock user if Firebase is not properly configured yet
    if (error.code === 'auth/invalid-api-key' || error.code === 'auth/internal-error') {
      alert("Firebase is not configured yet! Using a mock login for demo.");
      return { displayName: "Student Demo", email: "student@demo.com", photoURL: "" };
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

// Firestore Database Helpers
export const saveDocument = async (userId, type, title, content, docId = null) => {
  const resolvedDocId = docId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  // Always save to localStorage immediately for instant UI reliability (offline-first fallback)
  try {
    const fbKey = `fallback_documents_${userId}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    const docIndex = existing.findIndex(d => d.id === resolvedDocId);
    const docObj = { id: resolvedDocId, userId, type, title, content, createdAt: timestamp };
    if (docIndex >= 0) existing[docIndex] = docObj;
    else existing.push(docObj);
    localStorage.setItem(fbKey, JSON.stringify(existing));
    console.log("💾 Document saved locally:", resolvedDocId);
  } catch (err) {
    console.error("Local storage save failed", err);
  }

  // Then attempt Firestore sync in background
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') {
    return resolvedDocId;
  }

  try {
    await setDoc(doc(db, "saved_materials", resolvedDocId), {
      userId,
      type, // 'note', 'revision', 'timetable', 'test'
      title,
      content,
      createdAt: serverTimestamp()
    }, { merge: true });
    console.log("✅ Document saved to Firestore:", resolvedDocId);
    return resolvedDocId;
  } catch (e) {
    console.error("❌ Error saving document to Firestore:", e.code, e.message);
    return resolvedDocId;
  }
};

export const getUserDocuments = async (userId) => {
  const documents = [];

  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
    try {
      const fetchPromise = (async () => {
        // Try with orderBy first (requires Firestore composite index)
        const q = query(
          collection(db, "saved_materials"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        return docs;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 1500)
      );

      // Race Firestore query against a 1.5s timeout
      const fetched = await Promise.race([fetchPromise, timeoutPromise]);
      fetched.forEach(d => documents.push(d));
    } catch (e) {
      console.warn("⚠️ Ordered query failed or timed out, trying without orderBy:", e.message);
      // Fallback: query without orderBy — works without composite index
      try {
        const fetchPromise2 = (async () => {
          const q2 = query(
            collection(db, "saved_materials"),
            where("userId", "==", userId)
          );
          const querySnapshot2 = await getDocs(q2);
          const docs = [];
          querySnapshot2.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
          });
          return docs;
        })();
        const timeoutPromise2 = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 1500)
        );
        const fetched2 = await Promise.race([fetchPromise2, timeoutPromise2]);
        fetched2.forEach(d => {
          if (!documents.find(existing => existing.id === d.id)) {
            documents.push(d);
          }
        });
      } catch (e2) {
        console.error("❌ Error getting documents from Firestore:", e2.code, e2.message);
      }
    }
  }

  // Merge with Robust Fallback (Local Storage)
  try {
    const fbKey = `fallback_documents_${userId}`;
    const fallbackDocs = JSON.parse(localStorage.getItem(fbKey) || '[]');
    fallbackDocs.forEach(fd => {
      if (!documents.find(d => d.id === fd.id)) {
        // Recreate the toDate function so that `.toDate()` doesn't crash on client side!
        const docWithTimestamp = {
          ...fd,
          createdAt: {
            toDate: () => new Date(fd.createdAt || Date.now())
          }
        };
        documents.push(docWithTimestamp);
      }
    });
  } catch (err) {
    console.error("Local storage fallback retrieve failed:", err);
  }

  // Map toDate on any document fetched from Firestore that doesn't have it
  documents.forEach(doc => {
    if (doc.createdAt && typeof doc.createdAt.toDate !== 'function') {
      const originalCreatedAt = doc.createdAt;
      const seconds = originalCreatedAt.seconds || originalCreatedAt._seconds;
      const dateVal = seconds ? new Date(seconds * 1000) : new Date(originalCreatedAt);
      doc.createdAt = {
        toDate: () => dateVal
      };
    } else if (!doc.createdAt) {
      doc.createdAt = {
        toDate: () => new Date()
      };
    }
  });

  // Sort client-side by createdAt descending
  documents.sort((a, b) => {
    const ta = a.createdAt?.toDate?.() || new Date(0);
    const tb = b.createdAt?.toDate?.() || new Date(0);
    return tb - ta;
  });

  return documents;
};

// ── Chat Session Helpers ────────────────────────────────────────────────────

export const saveChatSession = async (userId, sessionId, title, messages) => {
  // Always save to localStorage immediately for instant UI reliability (offline-first fallback)
  try {
    const fbKey = `fallback_chats_${userId}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    const sessionIndex = existing.findIndex(s => s.id === sessionId);
    const sessionObj = { id: sessionId, userId, title, messages, updatedAt: Date.now() };
    if (sessionIndex >= 0) existing[sessionIndex] = sessionObj;
    else existing.push(sessionObj);
    localStorage.setItem(fbKey, JSON.stringify(existing));
  } catch (err) {
    console.error("Local storage save failed", err);
  }

  // Then attempt Firestore sync in background
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') return;
  try {
    await setDoc(doc(db, "chat_sessions", sessionId), {
      userId,
      title,
      messages,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("⚠️ Firestore sync skipped (expected if rules deny):", e.message);
  }
};

export const getUserChatSessions = async (userId) => {
  const sessions = [];

  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
    try {
      const fetchPromise = (async () => {
        const q = query(collection(db, "chat_sessions"), where("userId", "==", userId));
        const snap = await getDocs(q);
        const results = [];
        snap.forEach(d => results.push({ id: d.id, ...d.data() }));
        return results;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 100)
      );

      // Race Firestore query against a 1.5s timeout
      const fetched = await Promise.race([fetchPromise, timeoutPromise]);
      fetched.forEach(s => sessions.push(s));
    } catch (e) {
      console.warn("⚠️ Firestore fetch failed or timed out, relying on local fallback:", e.message);
    }
  }

  // Merge with Robust Fallback
  try {
    const fbKey = `fallback_chats_${userId}`;
    const fallbackSessions = JSON.parse(localStorage.getItem(fbKey) || '[]');
    fallbackSessions.forEach(fs => {
      if (!sessions.find(s => s.id === fs.id)) {
        sessions.push(fs);
      }
    });
  } catch (err) {
    console.error("Local storage fallback retrieve failed:", err);
  }

  // Sort client-side — no composite index needed
  sessions.sort((a, b) => {
    const ta = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
    const tb = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
    return tb - ta;
  });
  return sessions;
};

export const deleteChatSession = async (sessionId) => {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') return;
  try {
    await deleteDoc(doc(db, "chat_sessions", sessionId));
  } catch (e) {
    console.error("❌ Error deleting chat session:", e.message);
  }
};

// ── MONGODB ACTIVITY LOGGING FOR ADMIN PANEL ──
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

  // 1. Always save to local fallback for robust offline support
  try {
    const fbKey = 'tanios_admin_activities';
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    existing.unshift(activityObj); // Add to top
    // Keep max 1000 activities in local storage to prevent bloating
    if (existing.length > 1000) existing.length = 1000;
    localStorage.setItem(fbKey, JSON.stringify(existing));
  } catch (e) {
    console.warn("Local storage activity save failed:", e);
  }

  // 2. Sync to MongoDB Backend
  try {
    const response = await fetch(`${BACKEND_URL}/api/track/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activityObj.userId,
        userName: activityObj.userName,
        action: activityObj.action,
        details: activityObj.details
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (e) {
    console.error("❌ Error logging activity to MongoDB:", e);
  }
};

export const syncUserToMongo = async (uid, email, displayName, photoURL) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/track/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, displayName, photoURL: photoURL || '' })
    });
    if (response.ok) {
      return await response.json(); // { success: true, user: { loginCount, ... } }
    }
  } catch (e) {
    console.error("❌ Error syncing user to MongoDB:", e);
  }
  return null;
};

export const trackPaymentInMongo = async (userId, userEmail, amount, utr, status, method) => {
  try {
    await fetch(`${BACKEND_URL}/api/track/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail, amount, utr, status, method })
    });
  } catch (e) {
    console.error("❌ Error tracking payment to MongoDB:", e);
  }
};

// Update subscription status in MongoDB
export const trackSubscriptionInMongo = async (uid, subscriptionData) => {
  try {
    await fetch(`${BACKEND_URL}/api/track/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...subscriptionData })
    });
  } catch (e) {
    console.error('❌ Error updating subscription in MongoDB:', e);
  }
};

export const getActivities = async () => {
  // Try fetching from MongoDB API first
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/activities?limit=100`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (e) {
    console.warn("⚠️ Failed to fetch activities from MongoDB. Falling back to local storage.", e.message);
  }

  // Fallback to local storage if API is unreachable
  try {
    const fbKey = 'tanios_admin_activities';
    const existing = JSON.parse(localStorage.getItem(fbKey) || '[]');
    return existing;
  } catch (e) {
    console.error("❌ Failed to fetch from local storage:", e);
    return [];
  }
};

// Fetch all students from MongoDB for Admin Panel
export const getStudents = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/students?limit=500`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('⚠️ Failed to fetch students from MongoDB:', e.message);
  }
  return [];
};
