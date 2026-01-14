
import { useState, useEffect, useCallback, useRef } from 'react';
import { hashPassword } from '../utils/crypto';
import { logInternRegistration, syncSessionToCloud, fetchRemoteSessionId, fetchUserFromCloud } from '../services/otpService';

// Change this version string to force a global logout/reset for all users
const STORAGE_VERSION = 'OSM_REL_2025_CROSS_DEVICE_FIX_V3.1';

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
    // If the session ID in the Google Sheet is different from this browser, log out.
    if (remoteId && remoteId !== localId && remoteId !== 'NOT_FOUND') {
      logout("⚠️ MULTI-DEVICE ALERT: Your account was just used to log in elsewhere. This device has been logged out.");
    }
  }, [logout, ADMIN_EMAIL]);

  // Handle Deployment Reset
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
          checkIntervalRef.current = setInterval(() => {
            validateSessionCloud(currentUser.email, currentUser.sessionId);
          }, 45000); // Check every 45 seconds
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
        name: userData.name || userData.userName, 
        email: lowerEmail,
        mobile: userData.mobile,
        sessionId: newSessionId 
    };

    if (lowerEmail !== ADMIN_EMAIL.toLowerCase()) {
      await syncSessionToCloud(lowerEmail, newSessionId, userToAuth.name, userToAuth.mobile).catch(err => {
        console.warn("Cloud session sync deferred.");
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
        
        // 1. Admin Bypass
        if (lowerEmail === ADMIN_EMAIL.toLowerCase() && hashedPassword === ADMIN_HASH) {
            return { success: true, mfaRequired: false, tempUser: { name: 'Admin', email: ADMIN_EMAIL } };
        }

        // 2. Local Database Check
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        let targetUser = storedUsers.find(
            (u: any) => u.email.toLowerCase().trim() === lowerEmail && u.password === hashedPassword
        );

        // 3. CLOUD DATABASE CHECK (Fixes the "Another Browser" issue)
        if (!targetUser) {
            const cloudUser = await fetchUserFromCloud(lowerEmail);
            // Verify password hash against what's in the Google Sheet
            if (cloudUser && cloudUser.password === hashedPassword) {
                targetUser = {
                    name: cloudUser.userName || cloudUser.name,
                    email: cloudUser.email,
                    mobile: cloudUser.mobile,
                    password: cloudUser.password
                };
                // Sync to local for future offline use
                const updatedUsers = [...storedUsers, targetUser];
                localStorage.setItem('users', JSON.stringify(updatedUsers));
            }
        }

        if (targetUser) {
            return { success: true, mfaRequired: false, tempUser: targetUser };
        } else {
            return { success: false, error: 'Mail id not registered or incorrect password.' };
        }
    } catch (e) {
        return { success: false, error: "Auth sync failure. Check your connection." };
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
        const { email } = credentials;
        if (!email?.toLowerCase().trim().endsWith('@omegaseikimobility.com')) {
            setAuthError('Only @omegaseikimobility.com allowed.');
            return false;
        }
        
        // Prevent signup if already exists in Cloud
        const cloudCheck = await fetchUserFromCloud(email);
        if (cloudCheck) {
            setAuthError('Mail id already exists in our system.');
            return false;
        }

        return true; 
    } catch (e) {
        setAuthError("Registry verification error.");
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
        
        // Send to Script 1
        await logInternRegistration({
            email: newUser.email,
            mobile: newUser.mobile || '',
            userName: newUser.name || '',
            password: hashedPassword, // MUST save hash for cross-device login
            emailCode: 'SIGNUP'
        });
        return true;
    } catch (e) { return false; }
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<boolean> => {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        const hashedPassword = await hashPassword(newPassword);
        
        if (userIndex !== -1) {
            users[userIndex].password = hashedPassword;
            localStorage.setItem('users', JSON.stringify(users));
        }
        
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
    checkEmailExists, resetPassword
  };
};

export default useAuth;
