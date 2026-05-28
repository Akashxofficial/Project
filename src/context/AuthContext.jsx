import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout, logActivity, syncUserToMongo } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

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
  freeTrial: 3,   // 3 free calls for unsubscribed logged-in students → push to subscribe
  pro: 20         // 20 calls/day for subscribed Pro members!
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
      if (persisted) {
        const parsed = JSON.parse(persisted);
        // Sanitize corrupted mock guest or demo email if student is actually logged in
        if ((parsed.email === 'guest@tanios.ai' || parsed.email === 'student@demo.com') && !parsed.isGuest) {
          parsed.email = ''; 
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [subscription, setSubscription] = useState(() => {
    try {
      const persisted = localStorage.getItem('tanios_subscription');
      return persisted ? JSON.parse(persisted) : { active: false, status: 'none' };
    } catch {
      return { active: false, status: 'none' };
    }
  });

  useEffect(() => {
    let unsubscribe = () => {};

    // Load initial user state from local storage as offline-first fallback
    let persistedUser = null;
    try {
      const persisted = localStorage.getItem('tanios_user');
      if (persisted) {
        persistedUser = JSON.parse(persisted);
        // Sanitize corrupted mock guest or demo email if student is actually logged in
        if ((persistedUser.email === 'guest@tanios.ai' || persistedUser.email === 'student@demo.com') && !persistedUser.isGuest) {
          persistedUser.email = '';
          localStorage.setItem('tanios_user', JSON.stringify(persistedUser));
        }
      }
    } catch (e) {
      console.warn(e);
    }

    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          const userObj = {
            displayName: user.displayName || "Student",
            email: user.email || user.providerData?.[0]?.email || "",
            photoURL: user.photoURL || "",
            uid: user.uid,
            isGuest: false
          };
          setCurrentUser(userObj);
          localStorage.setItem('tanios_user', JSON.stringify(userObj));
          syncUserToMongo(userObj.uid, userObj.email, userObj.displayName, userObj.photoURL).catch(console.warn);
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

  // ── Sync User Subscription Status in Real-Time ──────────────────────────────
  useEffect(() => {
    if (!currentUser || currentUser.isGuest) {
      setSubscription({ active: false, status: 'none' });
      try { localStorage.removeItem('tanios_subscription'); } catch {}
      return;
    }

    // Load local storage fallback first
    try {
      const persisted = localStorage.getItem('tanios_subscription');
      if (persisted) {
        setSubscription(JSON.parse(persisted));
      }
    } catch (err) {}

    // Firestore sync
    if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
      const userDocRef = doc(db, "users", currentUser.uid || currentUser.email);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const subObj = {
            active: data.subscriptionActive || false,
            status: data.subscriptionStatus || 'none',
            plan: data.subscriptionPlan || '',
            amount: data.subscriptionAmount || 0,
            utr: data.subscriptionUtr || '',
            activatedAt: data.subscriptionActivatedAt || null
          };
          setSubscription(subObj);
          localStorage.setItem('tanios_subscription', JSON.stringify(subObj));
        } else {
          // Document does not exist or was deleted. Securely wipe local status to prevent hijacking!
          const inactiveSub = { active: false, status: 'none' };
          setSubscription(inactiveSub);
          localStorage.removeItem('tanios_subscription');
        }
      }, (err) => {
        console.warn("⚠️ Firestore subscription listener bypassed:", err.message);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const login = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        const userObj = {
          displayName: user.displayName || "Student",
          email: user.email || user.providerData?.[0]?.email || "",
          photoURL: user.photoURL || "",
          uid: user.uid || user.email || "student_demo_id", // Support fallback uid for mock login
          isGuest: false
        };
        setCurrentUser(userObj);
        localStorage.setItem('tanios_user', JSON.stringify(userObj));
        setShowLoginModal(false);
        setShowQuotaModal(false);
        logActivity(userObj.uid, userObj.displayName || userObj.email || 'Student', 'login', 'User authenticated via modal').catch(console.warn);
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

    // ── WIPE ALL STUDY DATA ON LOGOUT ──────────────────────────────────────
    // Every key owned by TaniOS study system is cleared so the next
    // login/profile-setup starts with a completely blank slate.
    const taniosKeys = [
      'tanios_xp',
      'tanios_streak',
      'tanios_streak_day',
      'tanios_consistency',
      'tanios_badges',
      'tanios_weaknesses',
      'tanios_missions',
      'tanios_profile',
      'tanios_subscription',
    ];
    taniosKeys.forEach(key => localStorage.removeItem(key));
    setSubscription({ active: false, status: 'none' });
    // ────────────────────────────────────────────────────────────────────────

    setCurrentUser(GUEST_USER);
    localStorage.setItem('tanios_user', JSON.stringify(GUEST_USER));
  };

  // Returns true if allowed, false if blocked
  const incrementGuestUsage = () => {
    const userId = currentUser?.uid || currentUser?.email || 'guest';
    const isGuest = currentUser?.isGuest;
    const isPro = subscription?.active;

    // 1. Pro Member Daily Limit (20 requests per day)
    if (isPro) {
      const proUsed = getUsageCount(userId);
      if (proUsed >= QUOTA.pro) {
        setShowQuotaModal(true); // Show daily limit exhausted modal!
        return false;
      }
      incrementUsageCount(userId);
      return true;
    }

    // 2. Unsubscribed Guest / Free Trial (3 requests limit)
    const limit = isGuest ? QUOTA.guest : QUOTA.freeTrial;
    const used = getUsageCount(userId);

    if (used >= limit) {
      if (isGuest) {
        setShowLoginModal(true);   // push to sign up
      } else {
        // Automatically redirect to subscribe checkout page
        window.location.href = '/subscribe';
      }
      return false;
    }
    incrementUsageCount(userId);
    return true;
  };

  const getRemainingQuota = () => {
    const userId = currentUser?.uid || currentUser?.email || 'guest';
    const isGuest = currentUser?.isGuest;
    const isPro = subscription?.active;

    if (isPro) {
      const used = getUsageCount(userId);
      return Math.max(0, QUOTA.pro - used);
    }

    const limit = isGuest ? QUOTA.guest : QUOTA.freeTrial;
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
    subscription,
    setSubscription,
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
