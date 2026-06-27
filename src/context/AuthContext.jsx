import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout, logActivity, syncUserToMongo, syncGuestDataToUser } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

const GUEST_USER = {
  displayName: "Guest Student",
  email: "guest@tanios.ai",
  photoURL: "",
  isGuest: true
};

// ── Per-Feature Trial Quota Config ──────────────────────────────────────────
// Free/Guest users get lifetime trials per feature (not daily).
// Pro users get 20 AI calls/day across all features.
const FEATURE_TRIALS = {
  doubt: 3,   // 3 lifetime doubt-solving (Chat) trials for free users
  mcq:   1,   // 1 lifetime MCQ/Test generator trial
  study: 1,   // 1 lifetime study-material trial (Notes + Revision + StudyGenerator shared)
};

const QUOTA = {
  pro: 20,    // 20 calls/day for Pro members
};

// ── Per-feature trial helpers (lifetime, not daily) ──────────────────────────
const getTrialKey  = (userId, feature) => `tanios_trial_${feature}_${userId}`;
const getTrialUsed = (userId, feature) => {
  try { return parseInt(localStorage.getItem(getTrialKey(userId, feature)) || '0', 10); }
  catch { return 0; }
};
const incrementTrial = (userId, feature) => {
  try {
    const key   = getTrialKey(userId, feature);
    const count = getTrialUsed(userId, feature) + 1;
    localStorage.setItem(key, count.toString());
    return count;
  } catch { return 0; }
};

// ── Pro daily-cap helpers ────────────────────────────────────────────────────
const getProDailyKey   = (userId) => `tanios_pro_daily_${userId}_${new Date().toDateString()}`;
const getProDailyUsed  = (userId) => {
  try { return parseInt(localStorage.getItem(getProDailyKey(userId)) || '0', 10); }
  catch { return 0; }
};
const incrementProDaily = (userId) => {
  try {
    const key   = getProDailyKey(userId);
    const count = getProDailyUsed(userId) + 1;
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
          
          // Sync guest offline-first data to the newly logged-in user profile
          syncGuestDataToUser(userObj).catch(console.error);

          // Sync user to MongoDB and send welcome email on first login
          syncUserToMongo(userObj.uid, userObj.email, userObj.displayName, userObj.photoURL)
            .then(async (mongoData) => {
              // Only send welcome email on very first login (loginCount === 1)
              if (mongoData?.user?.loginCount === 1) {
                const BACKEND_URL = '';
                fetch(`${BACKEND_URL}/api/notify/welcome`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    uid: userObj.uid,
                    email: userObj.email,
                    name: userObj.displayName,
                  }),
                }).catch(() => {}); // silent fail — never block UI
              }
            })
            .catch(console.warn);
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

    // MongoDB sync
    const BACKEND_URL = '';
    const fetchMongoSubscription = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/track/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            const studentData = data.user;
            if (studentData.subscriptionActive) {
              const subObj = {
                active: true,
                status: 'active',
                plan: studentData.subscriptionPlan || 'Pro AI Member',
                amount: studentData.subscriptionAmount || 199,
                utr: studentData.subscriptionUtr || '',
                activatedAt: studentData.subscriptionActivatedAt || null
              };
              setSubscription(subObj);
              localStorage.setItem('tanios_subscription', JSON.stringify(subObj));
            }
          }
        }
      } catch (err) {
        console.warn("⚠️ MongoDB subscription fetch failed:", err.message);
      }
    };
    fetchMongoSubscription();

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
          
          setSubscription(prev => {
            // Guard: If MongoDB/local storage has already activated the subscription,
            // do not let the Firestore listener overwrite it back to inactive (handles cases
            // where Firestore rules are not deployed and direct writes failed).
            if (prev.active && !subObj.active) {
              return prev;
            }
            localStorage.setItem('tanios_subscription', JSON.stringify(subObj));
            return subObj;
          });
        } else {
          setSubscription(prev => {
            if (prev.active) return prev; // keep active from Mongo/local
            localStorage.removeItem('tanios_subscription');
            return { active: false, status: 'none' };
          });
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
      'tanios_free_unlocked_subjects',
      'tanios_active_chapters',
      'tanios_selected_subtopics',
      'tanios_inline_subtopics',
      'tanios_mcq_attempts',
      'tanios_net_score',
      'tanios_rag_context',
      'tanios_rag_filename',
    ];
    const suffix = currentUser?.uid || currentUser?.email || 'guest';
    taniosKeys.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_${suffix}`);
    });
    setSubscription({ active: false, status: 'none' });
    // ────────────────────────────────────────────────────────────────────────

    setCurrentUser(GUEST_USER);
    localStorage.setItem('tanios_user', JSON.stringify(GUEST_USER));
  };

  // ── Feature-specific quota gate ─────────────────────────────────────────
  // feature: 'doubt' | 'mcq' | 'study'
  // Returns true if the action is allowed, false if blocked.
  const incrementGuestUsage = (feature = 'doubt') => {
    const userId  = currentUser?.uid || currentUser?.email || 'guest';
    const isGuest = currentUser?.isGuest;
    const isPro   = subscription?.active;

    // 1. Pro Member — daily cap across all features
    if (isPro) {
      const proUsed = getProDailyUsed(userId);
      if (proUsed >= QUOTA.pro) {
        setShowQuotaModal(true);
        return false;
      }
      incrementProDaily(userId);
      return true;
    }

    // 2. Free / Guest — per-feature lifetime trial
    const limit = FEATURE_TRIALS[feature] ?? 1;
    const used  = getTrialUsed(userId, feature);

    if (used >= limit) {
      if (isGuest) {
        setShowLoginModal(true);   // push to sign up first
      } else {
        window.location.href = '/subscribe'; // push to subscribe
      }
      return false;
    }
    incrementTrial(userId, feature);
    return true;
  };

  // Returns remaining trials for a given feature (or Pro daily remaining)
  const getRemainingQuota = (feature = 'doubt') => {
    const userId = currentUser?.uid || currentUser?.email || 'guest';
    const isPro  = subscription?.active;

    if (isPro) {
      return Math.max(0, QUOTA.pro - getProDailyUsed(userId));
    }

    const limit = FEATURE_TRIALS[feature] ?? 1;
    return Math.max(0, limit - getTrialUsed(userId, feature));
  };

  // Returns full trial info for display in Subscribe/Home pages
  const getFeatureTrialInfo = (feature) => {
    const userId = currentUser?.uid || currentUser?.email || 'guest';
    const isPro  = subscription?.active;
    if (isPro) return { used: 0, limit: QUOTA.pro, remaining: getRemainingQuota(feature), isPro: true };
    const limit  = FEATURE_TRIALS[feature] ?? 1;
    const used   = getTrialUsed(userId, feature);
    return { used, limit, remaining: Math.max(0, limit - used), isPro: false };
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
    getFeatureTrialInfo,
    QUOTA,
    FEATURE_TRIALS,
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
