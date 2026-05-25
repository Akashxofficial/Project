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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const persisted = localStorage.getItem('tanios_user');
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    // Load initial user state from local storage as offline-first fallback
    let persistedUser = null;
    try {
      const persisted = localStorage.getItem('tanios_user');
      if (persisted) persistedUser = JSON.parse(persisted);
    } catch (e) {
      console.warn(e);
    }

    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          const userObj = {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            uid: user.uid,
            isGuest: false
          };
          setCurrentUser(userObj);
          localStorage.setItem('tanios_user', JSON.stringify(userObj));
        } else {
          // If we had a mock logged-in user, keep it persistent across refresh
          if (persistedUser && !persistedUser.isGuest) {
            setCurrentUser(persistedUser);
          } else {
            setCurrentUser(GUEST_USER);
            localStorage.setItem('tanios_user', JSON.stringify(GUEST_USER));
          }
        }
        setLoading(false);
      });
    } else {
      if (persistedUser) {
        setCurrentUser(persistedUser);
      } else {
        setCurrentUser(GUEST_USER);
        localStorage.setItem('tanios_user', JSON.stringify(GUEST_USER));
      }
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        const userObj = {
          displayName: user.displayName || "Student",
          email: user.email || "student@demo.com",
          photoURL: user.photoURL || "",
          uid: user.uid || user.email || "student_demo_id", // Support fallback uid for mock login
          isGuest: false
        };
        setCurrentUser(userObj);
        localStorage.setItem('tanios_user', JSON.stringify(userObj));
        setShowLoginModal(false);
        setShowQuotaModal(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Signout failed:", error);
    }
    setCurrentUser(GUEST_USER);
    localStorage.setItem('tanios_user', JSON.stringify(GUEST_USER));
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
    logout: handleLogout,
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
