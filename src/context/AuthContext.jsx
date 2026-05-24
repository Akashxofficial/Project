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

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setCurrentUser(user);
        } else {
          // If no user is logged in, fall back to guest user instead of null
          setCurrentUser(GUEST_USER);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Mock guest user
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
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const incrementGuestUsage = () => {
    if (!currentUser || !currentUser.isGuest) return true;
    const count = parseInt(localStorage.getItem('guest_ai_calls') || '0', 10);
    if (count >= 2) {
      setShowLoginModal(true);
      return false;
    }
    localStorage.setItem('guest_ai_calls', (count + 1).toString());
    return true;
  };

  const value = {
    currentUser,
    setCurrentUser,
    showLoginModal,
    setShowLoginModal,
    login,
    incrementGuestUsage
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
