
import { useState, useEffect, useCallback, useRef } from 'react';
import { hashPassword } from '../utils/crypto';
import { logInternRegistration, syncSessionToCloud, fetchRemoteSessionId } from '../services/otpService';

// Force Reset Key: Increment this string to force logout/re-signup for all users across all devices
const STORAGE_VERSION = 'OSM_REL_2025_FORCED_RESET_V1';

export type User = {
  name: string;
  email: string;
  sessionId: string;
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
  
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ADMIN_HASH = '3970b54203666f884a4411130e9d6b2c2560e9063d83811801267b1860882736';
  const ADMIN_EMAIL = 'research1@omegaseikimobility.com';

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
    if (remoteId && remoteId !== localId && remoteId !== 'NOT_FOUND') {
      logout("⚠️ MULTI-DEVICE ALERT: Your account was just used to log in elsewhere. This device has been logged out.");
    }
  }, [logout, ADMIN_EMAIL]);

  // Handle Forced Reset Logic: Wipes local data if app version has changed
  useEffect(() => {
    const currentStoredVersion = localStorage.getItem('osm_app_version');
    if (currentStoredVersion !== STORAGE_VERSION) {
      console.log("[SYSTEM] New deployment detected. Wiping local data for security reset.");
      localStorage.clear(); // Wipes BOTH current session AND the users database
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
          checkIntervalRef.current = setInterval(() => {
            validateSessionCloud(currentUser.email, currentUser.sessionId);
          }, 45000); // 45 second check
        }
      } catch (e) {
        console.error("Session restore failed", e);
      }
    };

    checkSession();
    
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [logout, ADMIN_EMAIL, validateSessionCloud]);

  const finalizeLogin = useCallback(async (userData: any) => {
    const newSessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const lowerEmail = userData.email.toLowerCase().trim();
    
    const userToAuth: User = { 
        name: userData.name, 
        email: lowerEmail,
        mobile: userData.mobile,
        sessionId: newSessionId 
    };

    // LOG LOGIN ACTIVITY IMMEDIATELY to Script 2 (Activity Sheet)
    if (lowerEmail !== ADMIN_EMAIL.toLowerCase()) {
      await syncSessionToCloud(lowerEmail, newSessionId, userData.name, userData.mobile).catch(err => {
        console.warn("Cloud sync deferred, proceeding with local session.");
      });
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
        if (!password) return { success: false, error: "Password required." };
        const hashedPassword = await hashPassword(password);
        const lowerEmail = email.toLowerCase().trim();
        
        if (lowerEmail === ADMIN_EMAIL.toLowerCase() && hashedPassword === ADMIN_HASH) {
            return { success: true, mfaRequired: false, tempUser: { name: 'Admin', email: ADMIN_EMAIL } };
        }

        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const targetUser = storedUsers.find(
            (u: any) => u.email.toLowerCase().trim() === lowerEmail && u.password === hashedPassword
        );

        if (targetUser) {
            return { success: true, mfaRequired: false, tempUser: targetUser };
        } else {
            return { success: false, error: 'Incorrect email or password.' };
        }
    } catch (e) {
        return { success: false, error: "Auth process failed." };
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
    setAuthError(null);
    try {
        const { name, email, mobile, password } = credentials;
        if (!password || !name || !email || !mobile) throw new Error("Info missing");
        if (!email.toLowerCase().trim().endsWith('@omegaseikimobility.com')) {
            setAuthError('Only @omegaseikimobility.com allowed.');
            return false;
        }
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim())) {
            setAuthError('Email already registered.');
            return false;
        }
        return true; 
    } catch (e) {
        setAuthError("Validation error.");
        return false;
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const commitSignup = useCallback(async (credentials: AuthCredentials) => {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const hashedPassword = await hashPassword(credentials.password || '');
        const newUser = { 
            name: credentials.name, 
            email: credentials.email.toLowerCase().trim(), 
            mobile: credentials.mobile, 
            password: hashedPassword,
            registeredAt: new Date().toISOString(),
            sessionId: '' 
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // LOG TO SCRIPT 1 (Registrations Sheet)
        await logInternRegistration({
            email: newUser.email,
            mobile: newUser.mobile || '',
            userName: newUser.name || '',
            emailCode: 'SIGNUP'
        });
        return true;
    } catch (e) { return false; }
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<boolean> => {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        if (userIndex === -1) return false;
        users[userIndex].password = await hashPassword(newPassword);
        localStorage.setItem('users', JSON.stringify(users));
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
    checkEmailExists, resetPassword
  };
};

export default useAuth;
