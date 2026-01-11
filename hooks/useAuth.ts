
import { useState, useEffect, useCallback } from 'react';
import { hashPassword } from '../utils/crypto';
import { logInternRegistration } from '../services/otpService';

export type User = {
  name: string;
  email: string;
  sessionId?: string;
  mobile?: string;
  registeredAt?: string;
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

  useEffect(() => {
    const checkSession = () => {
      const currentUserStr = localStorage.getItem('currentUser');
      if (!currentUserStr) {
        return;
      }

      try {
        const currentUser = JSON.parse(currentUserStr);
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        
        const globalUser = allUsers.find((u: any) => u.email.toLowerCase() === currentUser.email.toLowerCase());
        
        if (currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
           setUser(currentUser);
           setView('chat');
           return;
        }

        if (globalUser && globalUser.sessionId !== currentUser.sessionId) {
          logout();
          alert("Session Expired: Account accessed from another device/session.");
        } else if (globalUser) {
          setUser(currentUser);
          setView('chat');
        }
      } catch (e) {
        console.error("Session check error", e);
      }
    };

    checkSession();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'currentUser') {
        checkSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [logout, ADMIN_EMAIL]);

  const finalizeLogin = useCallback((userData: any) => {
    const newSessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const lowerEmail = userData.email.toLowerCase();
    
    const userIndex = storedUsers.findIndex((u: any) => u.email.toLowerCase() === lowerEmail);

    const userToAuth = { 
        name: userData.name, 
        email: lowerEmail,
        sessionId: newSessionId 
    };

    if (userIndex !== -1) {
        storedUsers[userIndex].sessionId = newSessionId;
        localStorage.setItem('users', JSON.stringify(storedUsers));
    }

    localStorage.setItem('currentUser', JSON.stringify(userToAuth));
    setUser(userToAuth);
    setView('chat');
  }, []);

  const login = useCallback(async (credentials: AuthCredentials): Promise<LoginResult> => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
        const { email, password } = credentials;
        if (!password) return { success: false, error: "Password required." };
        const hashedPassword = await hashPassword(password);
        const lowerEmail = email.toLowerCase();
        
        if (lowerEmail === ADMIN_EMAIL.toLowerCase() && hashedPassword === ADMIN_HASH) {
            return { success: true, mfaRequired: false, tempUser: { name: 'Admin', email: ADMIN_EMAIL } };
        }

        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const targetUser = storedUsers.find(
            (u: any) => u.email.toLowerCase() === lowerEmail && u.password === hashedPassword
        );

        if (targetUser) {
            return { success: true, mfaRequired: false, tempUser: targetUser };
        } else {
            return { success: false, error: 'Invalid email or password.' };
        }
    } catch (e) {
        return { success: false, error: "Authentication failed." };
    } finally {
        setIsAuthLoading(false);
    }
  }, [ADMIN_HASH, ADMIN_EMAIL]);

  const checkEmailExists = useCallback((email: string): User | null => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }, []);

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

        return true; 
    } catch (e) {
        setAuthError("Validation failed.");
        return false;
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const commitSignup = useCallback(async (credentials: AuthCredentials) => {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const hashedPassword = await hashPassword(credentials.password || '');
        const timestamp = new Date().toISOString();
        
        const newUser = { 
            name: credentials.name, 
            email: credentials.email.toLowerCase(), 
            mobile: credentials.mobile, 
            password: hashedPassword,
            registeredAt: timestamp,
            sessionId: '' 
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        await logInternRegistration({
            email: newUser.email,
            mobile: newUser.mobile || '',
            userName: newUser.name || '',
            emailCode: '' 
        });

        return true;
    } catch (e) {
        return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<boolean> => {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
        
        if (userIndex === -1) return false;

        const hashedPassword = await hashPassword(newPassword);
        users[userIndex].password = hashedPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    } catch (e) {
        return false;
    }
  }, []);

  const getAllInterns = useCallback(() => {
    return JSON.parse(localStorage.getItem('users') || '[]') as User[];
  }, []);

  const deleteIntern = useCallback((email: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filtered = users.filter((u: any) => u.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem('users', JSON.stringify(filtered));
  }, []);

  return { 
    user, view, setView, login, finalizeLogin, signup, commitSignup, 
    logout, authError, isAuthLoading, getAllInterns, deleteIntern,
    checkEmailExists, resetPassword
  };
};

export default useAuth;
