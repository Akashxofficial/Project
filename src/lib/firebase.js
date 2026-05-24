import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';

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
export const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();

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
export const saveDocument = async (userId, type, title, content) => {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') {
    console.warn("Mock DB Save: ", { type, title });
    return true;
  }
  
  try {
    const docRef = await addDoc(collection(db, "saved_materials"), {
      userId,
      type, // 'note', 'revision', 'timetable', 'test'
      title,
      content,
      createdAt: serverTimestamp()
    });
    console.log("✅ Document saved:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("❌ Error saving document to Firestore:", e.code, e.message);
    return null;
  }
};

export const getUserDocuments = async (userId) => {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') {
    // Return mock data for UI testing
    return [
      { id: '1', type: 'note', title: 'Structure of Atom - Short Notes', content: '# Sample Notes\nThis is mock content.', createdAt: { toDate: () => new Date() } },
      { id: '2', type: 'test', title: 'Biology - Cell Structure (Mock Test)', content: '# Sample Test\nQ1. What is a cell?', createdAt: { toDate: () => new Date() } }
    ];
  }

  try {
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
  } catch (e) {
    console.warn("⚠️ Ordered query failed (index may be missing), trying without orderBy:", e.message);
    // Fallback: query without orderBy — works without composite index
    try {
      const q2 = query(
        collection(db, "saved_materials"),
        where("userId", "==", userId)
      );
      const querySnapshot2 = await getDocs(q2);
      const docs = [];
      querySnapshot2.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side by createdAt descending
      docs.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || new Date(0);
        const tb = b.createdAt?.toDate?.() || new Date(0);
        return tb - ta;
      });
      return docs;
    } catch (e2) {
      console.error("❌ Error getting documents:", e2.code, e2.message);
      return [];
    }
  }
};

// ── Chat Session Helpers ────────────────────────────────────────────────────

export const saveChatSession = async (userId, sessionId, title, messages) => {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') return;
  try {
    await setDoc(doc(db, "chat_sessions", sessionId), {
      userId,
      title,
      messages,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("❌ Error saving chat session:", e.message);
  }
};

export const getUserChatSessions = async (userId) => {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') return [];
  try {
    const q = query(collection(db, "chat_sessions"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const sessions = [];
    snap.forEach(d => sessions.push({ id: d.id, ...d.data() }));
    // Sort client-side — no composite index needed
    sessions.sort((a, b) => {
      const ta = a.updatedAt?.toDate?.() || new Date(0);
      const tb = b.updatedAt?.toDate?.() || new Date(0);
      return tb - ta;
    });
    return sessions;
  } catch (e) {
    console.error("❌ Error fetching chat sessions:", e.message);
    return [];
  }
};

export const deleteChatSession = async (sessionId) => {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') return;
  try {
    await deleteDoc(doc(db, "chat_sessions", sessionId));
  } catch (e) {
    console.error("❌ Error deleting chat session:", e.message);
  }
};
