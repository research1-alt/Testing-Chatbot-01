
import { useState, useEffect, useCallback } from 'react';
import { hashPassword } from '../utils/crypto';

export type User = {
  name: string;
  email: string;
  sessionId?: string;
};

export type AuthCredentials = {
  name?: string;
  email: string;
  mobile?: string;
  password?: string;
};

export type LoginResult = {
  success: boolean;
  mfaRequired?: boolean;
  error?: string;
  tempUser?: any;
};

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'intro' | 'auth' | 'chat'>('intro');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const ADMIN_HASH = '3970b54203666f884a4411130e9d6b2c2560e9063d83811801267b1860882736';
  const ADMIN_EMAIL = 'research1@omegaseikimobility.com';

  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setView('auth');
  }, []);

  // Sync session across tabs and detect "Kicks old one out"
  useEffect(() => {
    const checkSession = () => {
      const currentUserStr = localStorage.getItem('currentUser');
      if (!currentUserStr) {
        if (user) logout();
        return;
      }

      const currentUser = JSON.parse(currentUserStr);
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      
      const globalUser = allUsers.find((u: any) => u.email.toLowerCase() === currentUser.email.toLowerCase());
      
      if (currentUser.email === ADMIN_EMAIL) {
         setUser(currentUser);
         setView('chat');
         return;
      }

      if (globalUser && globalUser.sessionId !== currentUser.sessionId) {
        // "New login kicks old one out"
        logout();
        alert("Session Expired: You have been logged out because your account was accessed from another device/session.");
      } else {
        setUser(currentUser);
        setView('chat');
      }
    };

    checkSession();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'users' || e.key === 'currentUser') {
        checkSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user, logout, ADMIN_EMAIL]);

  const login = useCallback(async (credentials: AuthCredentials): Promise<LoginResult> => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
        const { email, password } = credentials;
        if (!password) return { success: false, error: "Password required." };
        const hashedPassword = await hashPassword(password);
        
        if (email.toLowerCase() === ADMIN_EMAIL && hashedPassword === ADMIN_HASH) {
            return { success: true, mfaRequired: true, tempUser: { name: 'Admin', email: ADMIN_EMAIL } };
        }

        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const targetUser = storedUsers.find(
            (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === hashedPassword
        );

        if (targetUser) {
            return { success: true, mfaRequired: true, tempUser: targetUser };
        } else {
            return { success: false, error: 'Invalid mail id or password.' };
        }
    } catch (e) {
        return { success: false, error: "Authentication failed." };
    } finally {
        setIsAuthLoading(false);
    }
  }, [ADMIN_HASH, ADMIN_EMAIL]);

  const finalizeLogin = useCallback((userData: any) => {
    const newSessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = storedUsers.findIndex((u: any) => u.email.toLowerCase() === userData.email.toLowerCase());

    if (userIndex !== -1 || userData.email === ADMIN_EMAIL) {
        if (userIndex !== -1) {
            storedUsers[userIndex].sessionId = newSessionId;
            localStorage.setItem('users', JSON.stringify(storedUsers));
        }

        const userToAuth = { 
            name: userData.name, 
            email: userData.email,
            sessionId: newSessionId 
        };
        localStorage.setItem('currentUser', JSON.stringify(userToAuth));
        setUser(userToAuth);
        setView('chat');
    }
  }, [ADMIN_EMAIL]);

  const signup = useCallback(async (credentials: AuthCredentials) => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
        const { name, email, mobile, password } = credentials;
        if (!password || !name || !email || !mobile) throw new Error("Missing info");

        if (!email.toLowerCase().endsWith('@omegaseikimobility.com')) {
            setAuthError('Error: Only @omegaseikimobility.com emails allowed.');
            return false;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
            setAuthError('Mail ID already exists.');
            return false;
        }

        const hashedPassword = await hashPassword(password);
        const newUser = { 
            name, 
            email, 
            mobile, 
            password: hashedPassword,
            sessionId: '' 
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Log to simulated spreadsheet
        fetch('/api/log-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, mobile, name, timestamp: new Date().toISOString() })
        }).catch(() => {});

        return true;
    } catch (e) {
        setAuthError("Signup failed.");
        return false;
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  return { user, view, setView, login, finalizeLogin, signup, logout, authError, isAuthLoading };
};

export default useAuth;
