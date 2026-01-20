
import { useState, useEffect, useCallback, useRef } from 'react';
import { hashPassword } from '../utils/crypto';
import { logInternRegistration, syncSessionToCloud, fetchRemoteSessionId, fetchUserFromCloud } from '../services/otpService';

const STORAGE_VERSION = 'OSM_REL_2025_V4_LOCK';

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
  
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ADMIN_EMAIL = 'research1@omegaseikimobility.com';
  const ADMIN_HASH = '3970b54203666f884a4411130e9d6b2c2560e9063d83811801267b1860882736';

  const logout = useCallback((reason?: string) => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    localStorage.removeItem('currentUser');
    setUser(null);
    setView('auth');
    if (reason) alert(reason);
  }, []);

  const validateSessionCloud = useCallback(async (email: string, localId: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
    
    const remoteId = await fetchRemoteSessionId(email);
    // If someone else logged in, the remoteId will have changed.
    if (remoteId && remoteId !== localId && remoteId !== 'NOT_FOUND') {
      logout("⚠️ MULTI-DEVICE ALERT: Your account was just logged in on another device. You have been disconnected here.");
    }
  }, [logout, ADMIN_EMAIL]);

  useEffect(() => {
    const currentStoredVersion = localStorage.getItem('osm_app_version');
    if (currentStoredVersion !== STORAGE_VERSION) {
      localStorage.clear(); 
      localStorage.setItem('osm_app_version', STORAGE_VERSION);
      setUser(null);
      setView('intro');
    }
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const currentUserStr = localStorage.getItem('currentUser');
      if (!currentUserStr) return;

      try {
        const currentUser = JSON.parse(currentUserStr);
        setUser(currentUser);
        setView('chat');

        if (!checkIntervalRef.current) {
          // Check every 15 seconds for device conflicts
          checkIntervalRef.current = setInterval(() => {
            validateSessionCloud(currentUser.email, currentUser.sessionId);
          }, 15000);
        }
      } catch (e) {
        console.error("Session restore failed", e);
      }
    };

    checkSession();
    return () => { if (checkIntervalRef.current) clearInterval(checkIntervalRef.current); };
  }, [logout, validateSessionCloud]);

  const finalizeLogin = useCallback(async (userData: any) => {
    const newSessionId = "SID_" + Math.random().toString(36).substring(2, 9) + Date.now();
    const lowerEmail = userData.email.toLowerCase().trim();
    
    const userToAuth: User = { 
        name: userData.name || userData.userName, 
        email: lowerEmail,
        mobile: userData.mobile,
        sessionId: newSessionId 
    };

    // Push new ID to cloud immediately
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

        // Check Cloud Database First
        const cloudUser = await fetchUserFromCloud(lowerEmail);
        if (cloudUser && cloudUser.password === hashedPassword) {
            return { success: true, tempUser: cloudUser };
        } else {
            return { success: false, error: 'Incorrect email or password.' };
        }
    } catch (e) {
        return { success: false, error: "Cloud connection error. Try again." };
    } finally {
        setIsAuthLoading(false);
    }
  }, [ADMIN_HASH, ADMIN_EMAIL]);

  const checkEmailExists = useCallback((email: string) => {
    // Check locally for speed, cloud during actual auth
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
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
    } catch (e) { return false; } 
    finally { setIsAuthLoading(false); }
  }, []);

  const commitSignup = useCallback(async (credentials: AuthCredentials) => {
    try {
        const hashedPassword = await hashPassword(credentials.password || '');
        const newUser = { 
            userName: credentials.name, 
            email: credentials.email.toLowerCase().trim(), 
            mobile: credentials.mobile, 
            password: hashedPassword 
        };
        
        // Sync to cloud
        await logInternRegistration({
            email: newUser.email,
            mobile: newUser.mobile || '',
            userName: newUser.userName || '',
            password: hashedPassword,
            emailCode: 'NEW_ACCOUNT'
        });

        // Store locally as backup
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        localUsers.push(newUser);
        localStorage.setItem('users', JSON.stringify(localUsers));

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

  const getAllInterns = useCallback(() => JSON.parse(localStorage.getItem('users') || '[]') as User[], []);
  const deleteIntern = useCallback((email: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]').filter((u: any) => u.email !== email);
    localStorage.setItem('users', JSON.stringify(users));
  }, []);

  return { 
    user, view, setView, login, finalizeLogin, signup, commitSignup, 
    logout, authError, isAuthLoading, getAllInterns, deleteIntern,
    checkEmailExists, resetPassword
  };
};

export default useAuth;
