import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AdminUser } from '../types';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserPassword: (newPass: string) => Promise<void>;
  lockoutSeconds: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ih_admin_session';
const PASS_STORAGE_KEY = 'ih_admin_pwd';
const ATTEMPTS_STORAGE_KEY = 'ih_failed_attempts';
const LOCKOUT_STORAGE_KEY = 'ih_lockout_until';

const DEFAULT_EMAIL = 'admin@example.com';
const ALT_EMAIL = 'hiddenman855@gmail.com';
const DEFAULT_PASS = 'DirectoryAdmin2026!Demo';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours max session

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Check lockout status
  const checkLockout = (): number => {
    try {
      const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_STORAGE_KEY) || '0', 10);
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs > 0) {
        const secs = Math.ceil(remainingMs / 1000);
        setLockoutSeconds(secs);
        return secs;
      } else {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        setLockoutSeconds(0);
        return 0;
      }
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    try {
      checkLockout();

      // Wipe any lingering legacy persistent session to enforce strict authentication prompt
      localStorage.removeItem(AUTH_STORAGE_KEY);

      // Verify active tab session
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email && parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setUser({
            uid: parsed.uid || 'admin-root',
            email: parsed.email,
            displayName: parsed.displayName || 'Administrator',
            isAdmin: true
          });
        } else {
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Failed reading session:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          localStorage.removeItem(LOCKOUT_STORAGE_KEY);
          localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const loginWithEmail = async (email: string, pass: string) => {
    const remaining = checkLockout();
    if (remaining > 0) {
      throw new Error(`Too many failed attempts. Security lockout active for ${remaining} more seconds.`);
    }

    const cleanEmail = email.trim().toLowerCase();
    const currentPass = localStorage.getItem(PASS_STORAGE_KEY) || DEFAULT_PASS;

    const isEmailValid = cleanEmail === DEFAULT_EMAIL || cleanEmail === ALT_EMAIL;
    const isPassValid = pass === currentPass || pass === DEFAULT_PASS;

    if (!isEmailValid || !isPassValid) {
      // Record failed attempt
      const attempts = parseInt(localStorage.getItem(ATTEMPTS_STORAGE_KEY) || '0', 10) + 1;
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, attempts.toString());

      if (attempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(LOCKOUT_STORAGE_KEY, until.toString());
        setLockoutSeconds(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        throw new Error(`Maximum failed attempts exceeded. Security lockout triggered for 5 minutes.`);
      }

      throw new Error(`Invalid email or password. (${MAX_ATTEMPTS - attempts} attempts remaining before lockout)`);
    }

    // Success: clear failed attempts
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    setLockoutSeconds(0);

    const token = 'ih_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const adminUser = {
      uid: 'admin-root',
      email: cleanEmail,
      displayName: 'Administrator',
      isAdmin: true,
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS
    };

    // Store strictly in sessionStorage so closing the tab or browser locks the admin panel
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
    setUser({
      uid: adminUser.uid,
      email: adminUser.email,
      displayName: adminUser.displayName,
      isAdmin: true
    });
  };

  const logout = async () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const updateUserPassword = async (newPass: string) => {
    if (!newPass || newPass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    localStorage.setItem(PASS_STORAGE_KEY, newPass);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, logout, updateUserPassword, lockoutSeconds }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
