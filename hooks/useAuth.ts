import { useState, useEffect, useCallback } from 'react';

export type User = {
  name: string;
  email: string;
};

export type AuthCredentials = {
  name?: string;
  email: string;
  password?: string;
};

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'intro' | 'auth' | 'chat'>('intro');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const item = localStorage.getItem('currentUser');
      if (item) {
        setUser(JSON.parse(item));
        setView('chat');
      } else {
        const savedView = localStorage.getItem('app-view');
        if (savedView && JSON.parse(savedView) === 'auth') {
            setView('auth');
        } else {
            setView('intro');
        }
      }
    } catch (error) {
      console.error("Failed to parse from localStorage:", error);
      setView('intro');
    }
  }, []);
  
  const saveView = (currentView: 'intro' | 'auth' | 'chat') => {
      try {
        localStorage.setItem('app-view', JSON.stringify(currentView));
      } catch (e) {
        console.error("Could not save view to localStorage", e);
      }
  };

  const login = useCallback(async (credentials: AuthCredentials) => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    // Simulate network delay
    await new Promise(res => setTimeout(res, 500));
    
    try {
        const { email, password } = credentials;
        const adminEmail = 'research1@omegaseikimobility.com';
        const adminPassword = 'Arvind@1223';
        
        if (email.toLowerCase() === adminEmail && password === adminPassword) {
            const adminUser = { name: 'Admin', email: adminEmail };
            localStorage.setItem('currentUser', JSON.stringify(adminUser));
            setUser(adminUser);
            setView('chat');
            saveView('chat');
            setIsAuthLoading(false);
            return;
        }

        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const foundUser = storedUsers.find(
            (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (foundUser) {
            const userToAuth = { name: foundUser.name, email: foundUser.email };
            localStorage.setItem('currentUser', JSON.stringify(userToAuth));
            setUser(userToAuth);
            setView('chat');
            saveView('chat');
        } else {
            setAuthError('Invalid email or password.');
        }
    } catch (e) {
        setAuthError("An unexpected error occurred. Please try again.");
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (credentials: AuthCredentials) => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    await new Promise(res => setTimeout(res, 500));
    
    try {
        const { name, email, password } = credentials;
        const adminEmail = 'research1@omegaseikimobility.com';

        if (email.toLowerCase() === adminEmail) {
            setAuthError('This email address is reserved. Please use a different one.');
            setIsAuthLoading(false);
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const existingUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
            setAuthError('An account with this email already exists.');
        } else {
            const newUser = { name, email, password };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            const userToAuth = { name: name!, email: email! };
            localStorage.setItem('currentUser', JSON.stringify(userToAuth));
            setUser(userToAuth);
            setView('chat');
            saveView('chat');
        }
    } catch (e) {
        setAuthError("An unexpected error occurred during signup.");
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('app-view');
    localStorage.removeItem('app-messages');
    setUser(null);
    setView('intro');
  }, []);

  return { user, view, setView, login, signup, logout, authError, isAuthLoading };
};

export default useAuth;