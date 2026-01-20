
import { useState, useEffect, useCallback, useRef } from 'react';
import { hashPassword } from '../utils/crypto';
import { logInternRegistration, syncSessionToCloud, fetchRemoteSessionId, fetchUserFromCloud } from '../services/otpService';

const STORAGE_VERSION = 'OSM_REL_2025_V5_STRICT';

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
  const isCheckingRef = useRef(false);
  
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
    // Admins are exempt from multi-device locking for management purposes
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    try {
        const remoteId = await fetchRemoteSessionId(email);
        // If someone else logged in, the remoteId in the cloud will be different from our localId
        if (remoteId && remoteId !== localId && remoteId !== 'NOT_FOUND') {
          logout("⚠️ SECURITY ALERT: Your account was logged in on another device. This session has been terminated.");
        }
    } catch (e) {
        console.warn("Session check failed, skipping heartbeat.");
    } finally {
        isCheckingRef.current = false;
    }
  }, [logout, ADMIN_EMAIL]);

  // Handle versioning to clear old local storage bugs
  useEffect(() => {
    const currentStoredVersion = localStorage.getItem('osm_app_version');
    if (currentStoredVersion !== STORAGE_VERSION) {
      localStorage.clear(); 
      localStorage.setItem('osm_app_version', STORAGE_VERSION);
      setUser(null);
      setView('intro');
    }
  }, []);

  // Main session lifecycle
  useEffect(() => {
    const initializeAuth = async () => {
      const currentUserStr = localStorage.getItem('currentUser');
      if (!currentUserStr) return;

      try {
        const currentUser = JSON.parse(currentUserStr);
        setUser(currentUser);
        setView('chat');

        // Initial immediate check
        await validateSessionCloud(currentUser.email, currentUser.sessionId);

        if (!checkIntervalRef.current) {
          // Check every 10 seconds for device conflicts
          checkIntervalRef.current = setInterval(() => {
            validateSessionCloud(currentUser.email, currentUser.sessionId);
          }, 10000);
        }
      } catch (e) {
        console.error("Auth restore error", e);
      }
    };

    initializeAuth();

    // Re-check when the user switches tabs back to the app
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && user) {
            validateSessionCloud(user.email, user.sessionId);
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => { 
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logout, validateSessionCloud, user]);

  const finalizeLogin = useCallback(async (userData: any) => {
    // Create a truly unique ID for this specific login instance
    const newSessionId = "SID_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
    const lowerEmail = userData.email.toLowerCase().trim();
    
    const userToAuth: User = { 
        name: userData.name || userData.userName, 
        email: lowerEmail,
        mobile: userData.mobile,
        sessionId: newSessionId 
    };

    // Inform cloud that THIS session is now the only active one
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
        
        // Admin override
        if (lowerEmail === ADMIN_EMAIL.toLowerCase() && hashedPassword === ADMIN_HASH) {
            return { success: true, tempUser: { name: 'Admin', email: ADMIN_EMAIL } };
        }

        // Validate credentials against Cloud DB
        const cloudUser = await fetchUserFromCloud(lowerEmail);
        if (cloudUser && cloudUser.password === hashedPassword) {
            return { success: true, tempUser: cloudUser };
        } else {
            return { success: false, error: 'Identity check failed. Invalid email or password.' };
        }
    } catch (e) {
        return { success: false, error: "Network fault. Please ensure your internet is active." };
    } finally {
        setIsAuthLoading(false);
    }
  }, [ADMIN_HASH, ADMIN_EMAIL]);

  const checkEmailExists = useCallback((email: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }, []);

  const signup = useCallback(async (credentials: AuthCredentials) => {
    setIsAuthLoading(true);
    try {
        const cloudCheck = await fetchUserFromCloud(credentials.email);
        if (cloudCheck) {
            setAuthError('Identity already exists in registry.');
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
        
        await logInternRegistration({
            email: newUser.email,
            mobile: newUser.mobile || '',
            userName: newUser.userName || '',
            password: hashedPassword,
            emailCode: 'REG'
        });

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
