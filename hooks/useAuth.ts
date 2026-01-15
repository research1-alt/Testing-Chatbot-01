
import { useState, useEffect, useCallback, useRef } from 'react';
import { hashPassword } from '../utils/crypto';
import { logInternRegistration, syncSessionToCloud, fetchRemoteSessionId, fetchUserFromCloud } from '../services/otpService';

const STORAGE_VERSION = 'OSM_REL_2025_SINGLE_SESSION_V5';

export type User = {
  name: string;
  email: string;
  sessionId: string;
  mobile?: string;
  registeredAt?: string;
  password?: string; 
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
  const [isSessionRevoked, setIsSessionRevoked] = useState(false);
  
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ADMIN_EMAIL = 'research1@omegaseikimobility.com';
  const ADMIN_HASH = '3970b54203666f884a4411130e9d6b2c2560e9063d83811801267b1860882736';

  const logout = useCallback((reason?: string) => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    localStorage.removeItem('currentUser');
    setUser(null);
    setIsSessionRevoked(false);
    setView('auth');
    if (reason) alert(reason);
  }, []);

  const validateSessionCloud = useCallback(async (email: string, localId: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
    
    try {
      const remoteId = await fetchRemoteSessionId(email);
      if (remoteId && remoteId !== localId && remoteId !== 'NOT_FOUND') {
        console.warn("[Auth] Multi-device detected. Remote:", remoteId, "Local:", localId);
        setIsSessionRevoked(true);
        // Delay logout slightly so user sees the message
        setTimeout(() => logout("This account is active on another device."), 3000);
        return false;
      }
      return true;
    } catch (e) {
      return true; // Fail open on network issues to avoid locking users out
    }
  }, [logout, ADMIN_EMAIL]);

  // Version management
  useEffect(() => {
    const currentStoredVersion = localStorage.getItem('osm_app_version');
    if (currentStoredVersion !== STORAGE_VERSION) {
      localStorage.clear(); 
      localStorage.setItem('osm_app_version', STORAGE_VERSION);
      setUser(null);
      setView('intro');
    }
  }, []);

  // Background check
  useEffect(() => {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return;

    const currentUser = JSON.parse(currentUserStr);
    setUser(currentUser);
    setView('chat');

    validateSessionCloud(currentUser.email, currentUser.sessionId);

    checkIntervalRef.current = setInterval(() => {
      validateSessionCloud(currentUser.email, currentUser.sessionId);
    }, 15000); // 15s checks

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        validateSessionCloud(currentUser.email, currentUser.sessionId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [validateSessionCloud]);

  const finalizeLogin = useCallback(async (userData: any) => {
    const newSessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const lowerEmail = userData.email.toLowerCase().trim();
    
    const userToAuth: User = { 
        name: userData.name || userData.userName, 
        email: lowerEmail,
        mobile: userData.mobile,
        sessionId: newSessionId 
    };

    if (lowerEmail !== ADMIN_EMAIL.toLowerCase()) {
      await syncSessionToCloud(lowerEmail, newSessionId, userToAuth.name, userToAuth.mobile);
    }

    localStorage.setItem('currentUser', JSON.stringify(userToAuth));
    setUser(userToAuth);
    setView('chat');
  }, [ADMIN_EMAIL]);

  const login = useCallback(async (credentials: AuthCredentials): Promise<LoginResult> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
        const { email, password } = credentials;
        const hashedPassword = await hashPassword(password || '');
        const lowerEmail = email.toLowerCase().trim();
        
        if (lowerEmail === ADMIN_EMAIL.toLowerCase() && hashedPassword === ADMIN_HASH) {
            return { success: true, tempUser: { name: 'Admin', email: ADMIN_EMAIL } };
        }

        const cloudUser = await fetchUserFromCloud(lowerEmail);
        if (cloudUser && cloudUser.password === hashedPassword) {
            return { success: true, tempUser: { ...cloudUser, name: cloudUser.userName || cloudUser.name } };
        }
        return { success: false, error: 'Incorrect credentials.' };
    } catch (e) {
        return { success: false, error: "Cloud sync failure." };
    } finally {
        setIsAuthLoading(false);
    }
  }, [ADMIN_HASH, ADMIN_EMAIL]);

  const checkEmailExists = useCallback((email: string): User | null => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim()) || null;
  }, []);

  const signup = useCallback(async (credentials: AuthCredentials) => {
    setIsAuthLoading(true);
    try {
        const cloudCheck = await fetchUserFromCloud(credentials.email);
        if (cloudCheck) {
            setAuthError('Email already registered.');
            return false;
        }
        return true; 
    } catch (e) { return false; } finally { setIsAuthLoading(false); }
  }, []);

  const commitSignup = useCallback(async (credentials: AuthCredentials) => {
    try {
        const hashedPassword = await hashPassword(credentials.password || '');
        await logInternRegistration({
            email: credentials.email.toLowerCase().trim(),
            mobile: credentials.mobile || '',
            userName: credentials.name || '',
            password: hashedPassword,
            emailCode: 'SIGNUP'
        });
        return true;
    } catch (e) { return false; }
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<boolean> => {
    try {
        const hashedPassword = await hashPassword(newPassword);
        await logInternRegistration({
            email: email.toLowerCase().trim(),
            mobile: 'RECOVERY',
            userName: 'RECOVERY',
            password: hashedPassword,
            emailCode: 'RESET'
        });
        return true;
    } catch (e) { return false; }
  }, []);

  const getAllInterns = useCallback(() => {
    return JSON.parse(localStorage.getItem('users') || '[]') as User[];
  }, []);

  const deleteIntern = useCallback((email: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filtered = users.filter((u: any) => u.email.toLowerCase().trim() !== email.toLowerCase().trim());
    localStorage.setItem('users', JSON.stringify(filtered));
  }, []);

  return { 
    user, view, setView, login, finalizeLogin, signup, commitSignup, 
    logout, authError, isAuthLoading, getAllInterns, deleteIntern,
    checkEmailExists, resetPassword, validateSessionCloud, isSessionRevoked
  };
};

export default useAuth;
