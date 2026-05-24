import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, loginWithGoogle } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

const GUEST_USER = {
  displayName: "Guest Student",
  email: "guest@tanios.ai",
  photoURL: "",
  isGuest: true
};

// ── Daily quota config ──────────────────────────────────────────────────────
const QUOTA = {
  guest: 3,       // 3 free calls/day for guests → push them to sign up
  loggedIn: 20,   // 20 calls/day for free logged-in users → very generous
};

const getQuotaKey = (userId) => `quota_${userId}_${new Date().toDateString()}`;

const getUsageCount = (userId) => {
  try {
    return parseInt(localStorage.getItem(getQuotaKey(userId)) || '0', 10);
  } catch { return 0; }
};

const incrementUsageCount = (userId) => {
  try {
    const key = getQuotaKey(userId);
    const count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, count.toString());
    return count;
  } catch { return 0; }
};

// ── Component ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user || GUEST_USER);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      setCurrentUser(GUEST_USER);
      setLoading(false);
    }
  }, []);

  const login = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        setCurrentUser(user);
        setShowLoginModal(false);
        setShowQuotaModal(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Returns true if allowed, false if blocked
  const incrementGuestUsage = () => {
    const userId = currentUser?.uid || currentUser?.email || 'guest';
    const isGuest = currentUser?.isGuest;
    const limit = isGuest ? QUOTA.guest : QUOTA.loggedIn;
    const used = getUsageCount(userId);

    if (used >= limit) {
      // Show different modal depending on guest vs logged-in
      if (isGuest) {
        setShowLoginModal(true);   // push to sign up
      } else {
        setShowQuotaModal(true);   // show daily limit message
      }
      return false;
    }
    incrementUsageCount(userId);
    return true;
  };

  const getRemainingQuota = () => {
    const userId = currentUser?.uid || currentUser?.email || 'guest';
    const isGuest = currentUser?.isGuest;
    const limit = isGuest ? QUOTA.guest : QUOTA.loggedIn;
    const used = getUsageCount(userId);
    return Math.max(0, limit - used);
  };

  const value = {
    currentUser,
    setCurrentUser,
    loading,
    showLoginModal,
    setShowLoginModal,
    showQuotaModal,
    setShowQuotaModal,
    login,
    incrementGuestUsage,
    getRemainingQuota,
    QUOTA,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
